import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAudio } from '../lib/api'

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

type UseWhisperMicOptions = {
  getToken: () => Promise<string | null>
  onTranscript: (text: string) => void
  onError?: (message: string) => void
  listenSeconds?: number
  context?: 'marketplace' | 'onboarding' | 'search'
  hint?: string | (() => string)
}

/**
 * Record mic audio for a fixed window, then transcribe via backend Whisper.
 * Replaces flaky browser SpeechRecognition (Chrome network errors).
 */
const IDLE_LEVELS = Array.from({ length: 28 }, () => 0.08)

export function useWhisperMic({
  getToken,
  onTranscript,
  onError,
  listenSeconds = 10,
  context = 'marketplace',
  hint,
}: UseWhisperMicOptions) {
  const [listening, setListening] = useState(false)
  const [listenLeft, setListenLeft] = useState(listenSeconds)
  const [transcribing, setTranscribing] = useState(false)
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const wantListenRef = useRef(false)
  const listenDeadlineRef = useRef(0)
  const listenTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRafRef = useRef<number | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)
  const getTokenRef = useRef(getToken)
  const contextRef = useRef(context)
  const hintRef = useRef(hint)

  onTranscriptRef.current = onTranscript
  onErrorRef.current = onError
  getTokenRef.current = getToken
  contextRef.current = context
  hintRef.current = hint

  const clearTimers = useCallback(() => {
    if (listenTickRef.current) {
      clearInterval(listenTickRef.current)
      listenTickRef.current = null
    }
  }, [])

  const stopAnalyser = useCallback(() => {
    if (analyserRafRef.current != null) {
      cancelAnimationFrame(analyserRafRef.current)
      analyserRafRef.current = null
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setLevels(IDLE_LEVELS)
  }, [])

  const startAnalyser = useCallback(
    (stream: MediaStream) => {
      stopAnalyser()
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtx()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        analyser.smoothingTimeConstant = 0.72
        source.connect(analyser)
        audioContextRef.current = ctx
        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          analyser.getByteFrequencyData(data)
          const bars = IDLE_LEVELS.length
          const next: number[] = []
          for (let i = 0; i < bars; i += 1) {
            const idx = Math.floor((i / bars) * data.length)
            const value = (data[idx] || 0) / 255
            next.push(Math.max(0.08, Math.min(1, value * 1.35)))
          }
          setLevels(next)
          analyserRafRef.current = requestAnimationFrame(tick)
        }
        analyserRafRef.current = requestAnimationFrame(tick)
      } catch {
        setLevels(IDLE_LEVELS)
      }
    },
    [stopAnalyser],
  )

  const stopMediaStream = useCallback(() => {
    stopAnalyser()
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [stopAnalyser])

  const processRecording = useCallback(async (blob: Blob) => {
    if (!blob.size) {
      onErrorRef.current?.('I didn’t catch that. Tap the mic and speak again.')
      return
    }

    const token = await getTokenRef.current()
    if (!token) {
      onErrorRef.current?.('Please sign in to use voice input.')
      return
    }

    setTranscribing(true)
    try {
      const hintValue =
        typeof hintRef.current === 'function' ? hintRef.current() : hintRef.current || ''
      const result = await transcribeAudio(token, blob, {
        context: contextRef.current,
        hint: hintValue,
      })
      const cleaned = String(result.text || '').trim()
      const raw = String(result.raw || '').trim()
      // Prefer Whisper raw if cleanup swapped jeans↔denim.
      let text = cleaned || raw
      if (
        raw &&
        cleaned &&
        ((/\bjeans\b/i.test(raw) && /\bdenim\b/i.test(cleaned) && !/\bjeans\b/i.test(cleaned)) ||
          (/\bdenim\b/i.test(raw) && /\bjeans\b/i.test(cleaned) && !/\bdenim\b/i.test(cleaned)))
      ) {
        text = raw
      }
      if (!text) {
        onErrorRef.current?.('I didn’t catch that. Tap the mic and speak again.')
        return
      }
      onTranscriptRef.current(text)
    } catch (err) {
      onErrorRef.current?.(
        err instanceof Error ? err.message : 'Voice transcription failed. Please type instead.',
      )
    } finally {
      setTranscribing(false)
    }
  }, [])

  const stopListening = useCallback(
    (options?: { process?: boolean }) => {
      const shouldProcess = options?.process !== false
      const wasListening = wantListenRef.current || Boolean(mediaRecorderRef.current)
      wantListenRef.current = false
      clearTimers()
      setListening(false)
      setListenLeft(listenSeconds)

      const recorder = mediaRecorderRef.current
      if (!wasListening) {
        stopMediaStream()
        mediaRecorderRef.current = null
        return
      }

      if (!recorder || recorder.state === 'inactive') {
        stopMediaStream()
        mediaRecorderRef.current = null
        if (shouldProcess) {
          void processRecording(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
        }
        return
      }

      try {
        if (!shouldProcess) {
          recorder.onstop = null
          recorder.stop()
          stopMediaStream()
          mediaRecorderRef.current = null
          return
        }
        recorder.stop()
      } catch {
        stopMediaStream()
        mediaRecorderRef.current = null
        if (shouldProcess) {
          void processRecording(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
        }
      }
    },
    [clearTimers, listenSeconds, processRecording, stopMediaStream],
  )

  const startListening = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current?.('Voice recording isn’t supported in this browser. Please type instead.')
      return
    }

    if (wantListenRef.current || mediaRecorderRef.current) {
      stopListening()
      return
    }

    audioChunksRef.current = []

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onErrorRef.current?.(
        'Microphone permission is blocked. Allow mic access, then try again.',
      )
      return
    }

    mediaStreamRef.current = stream
    startAnalyser(stream)
    const mimeType = pickRecorderMimeType()
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)

    recorder.ondataavailable = (event) => {
      if (event.data?.size) audioChunksRef.current.push(event.data)
    }

    recorder.onstop = () => {
      const blobType = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(audioChunksRef.current, { type: blobType })
      stopMediaStream()
      mediaRecorderRef.current = null
      void processRecording(blob)
    }

    mediaRecorderRef.current = recorder
    wantListenRef.current = true
    listenDeadlineRef.current = Date.now() + listenSeconds * 1000
    setListenLeft(listenSeconds)
    clearTimers()
    listenTickRef.current = setInterval(() => {
      const leftMs = listenDeadlineRef.current - Date.now()
      setListenLeft(Math.max(0, Math.ceil(leftMs / 1000)))
      if (leftMs <= 0) stopListening()
    }, 200)

    try {
      recorder.start(250)
      setListening(true)
    } catch {
      stopMediaStream()
      mediaRecorderRef.current = null
      wantListenRef.current = false
      clearTimers()
      onErrorRef.current?.('Could not start the microphone. Try again.')
    }
  }, [
    clearTimers,
    listenSeconds,
    processRecording,
    startAnalyser,
    stopListening,
    stopMediaStream,
  ])

  const toggle = useCallback(() => {
    if (wantListenRef.current || mediaRecorderRef.current) {
      stopListening()
      return
    }
    void startListening()
  }, [startListening, stopListening])

  useEffect(() => {
    return () => {
      wantListenRef.current = false
      clearTimers()
      try {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = null
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
        }
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [clearTimers])

  return {
    listening,
    listenLeft,
    transcribing,
    levels,
    toggle,
    startListening,
    stopListening,
  }
}
