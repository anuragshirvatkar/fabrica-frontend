import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Mic, MicOff, Pencil, RotateCcw, Send, SkipForward } from 'lucide-react'
import {
  postAiOnboardingTurn,
  startAiOnboarding,
  transcribeAudio,
  type AiOnboardingField,
  type AiOnboardingResponse,
} from '../../lib/api'
import { StateSelect } from '../ui/StateSelect'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  /** Set on user answers so we can edit / retake that step. */
  fieldKey?: string
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function normalizeSpoken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function editDistance(a: string, b: string) {
  const rows = a.length + 1
  const cols = b.length + 1
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i += 1) dp[i][0] = i
  for (let j = 0; j < cols; j += 1) dp[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[a.length][b.length]
}

function fuzzyMatchOption(spoken: string, options: string[]) {
  const n = normalizeSpoken(spoken)
  if (!n) return null

  for (const option of options) {
    const o = normalizeSpoken(option)
    if (!o) continue
    if (n === o || n.includes(o) || o.includes(n)) return option
  }

  let best: { option: string; distance: number } | null = null
  for (const option of options) {
    const o = normalizeSpoken(option)
    if (o.length < 4) continue
    const distance = editDistance(n, o)
    const allowed = o.length >= 8 ? 3 : 2
    if (distance <= allowed && (!best || distance < best.distance)) {
      best = { option, distance }
    }
  }
  return best?.option || null
}

/** Whisper often invents filler when the mic captures silence. */
function sanitizeTranscript(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const compact = normalizeSpoken(trimmed)
  const hallucinations = [
    'thanksforwatching',
    'thankyouforwatching',
    'thanksforwatchingplease',
    'thankyouforwatchingplease',
    'pleasesubscribe',
    'subscribetomychannel',
    'likethisvideo',
    'thankyou',
    'thanks',
    'you',
    'bye',
    'goodbye',
    'the',
    'a',
    '...',
    '.',
  ]
  if (hallucinations.includes(compact)) return ''
  if (/^(thanks?|thank you)( for watching)?[.!]?$/i.test(trimmed)) return ''
  return trimmed
}

function ChoiceChip({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-sm border transition-colors disabled:opacity-50 ${
        selected
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  )
}

type AiOnboardingFlowProps = {
  role: 'BUYER' | 'SELLER'
  token: string | null
  onComplete: (answers: Record<string, unknown>) => Promise<void>
  headerSlot?: React.ReactNode
}

export function AiOnboardingFlow({ role, token, onComplete, headerSlot }: AiOnboardingFlowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [field, setField] = useState<AiOnboardingField | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 1 })
  const [input, setInput] = useState('')
  const [multiDraft, setMultiDraft] = useState<string[]>([])
  const [addressDraft, setAddressDraft] = useState({
    line1: '',
    city: '',
    state: '',
    pincode: '',
  })
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [listenLeft, setListenLeft] = useState(5)
  const [error, setError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const wantListenRef = useRef(false)
  const listenDeadlineRef = useRef(0)
  const listenTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fieldRef = useRef<AiOnboardingField | null>(null)
  const voiceAutoSubmittedRef = useRef(false)
  const voiceSessionDoneRef = useRef(false)
  const pendingSubmitMatchRef = useRef(true)
  const runTurnRef = useRef<
    | ((payload: {
        message?: string
        selectedOptions?: string | string[] | null
        addressPatch?: typeof addressDraft | null
        skipOptional?: boolean
        userVisible?: string
      }) => Promise<void>)
    | null
  >(null)
  const startedRef = useRef(false)
  const busyRef = useRef(false)
  const toggleVoiceRef = useRef<() => void>(() => {})
  const listenSecondsRef = useRef(5)

  const voiceSecondsForField = (current: AiOnboardingField | null) => {
    if (!current) return 5
    // Longer answers need more time to speak.
    if (current.mode === 'address' || current.key === 'description') return 10
    return 5
  }

  const voiceDebug = (label: string, data?: unknown) => {
    console.log('[voice]', label, data ?? '')
  }

  useEffect(() => {
    fieldRef.current = field
    const seconds = voiceSecondsForField(field)
    listenSecondsRef.current = seconds
    if (!listening) setListenLeft(seconds)
  }, [field, listening])

  const clearVoiceTimers = () => {
    if (listenTickRef.current) {
      clearInterval(listenTickRef.current)
      listenTickRef.current = null
    }
  }

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const finalizeVoiceAnswer = (spokenRaw: string, submitMatch: boolean) => {
    if (voiceSessionDoneRef.current) return
    voiceSessionDoneRef.current = true

    const spoken = spokenRaw.trim()
    voiceDebug('finalize', { submitMatch, spoken: spoken || '(empty)' })

    setListening(false)
    setListenLeft(listenSecondsRef.current)

    if (!submitMatch || !spoken || voiceAutoSubmittedRef.current) {
      if (submitMatch && !spoken) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: 'I didn’t catch that. Tap the mic and speak again, or type/tap an option.',
          },
        ])
      }
      return
    }

    // Voice answer is accepted immediately — no need to hit send.
    // Typing + mic stay available on the next step (or retry if this fails).
    voiceAutoSubmittedRef.current = true
    const currentField = fieldRef.current

    if (currentField?.mode === 'single') {
      const matched = fuzzyMatchOption(spoken, currentField.options || [])
      voiceDebug('fuzzyMatch', { spoken, matched })
      const value = matched || spoken
      setInput(value)
      void runTurnRef.current?.(
        matched
          ? { selectedOptions: matched, userVisible: matched }
          : { message: spoken, userVisible: spoken },
      )
      return
    }

    if (currentField?.mode === 'multi') {
      const parts = spoken.split(/,| and | & /i).map((part) => part.trim()).filter(Boolean)
      const matched = parts
        .map((part) => fuzzyMatchOption(part, currentField.options || []))
        .filter((item): item is string => Boolean(item))
      const unique = [...new Set(matched)]
      if (unique.length) {
        setMultiDraft(unique)
        setInput(unique.join(', '))
        void runTurnRef.current?.({
          selectedOptions: unique,
          userVisible: unique.join(', '),
        })
        return
      }
    }

    setInput(spoken)
    void runTurnRef.current?.({
      message: spoken,
      userVisible: spoken,
    })
  }

  const processRecording = async (blob: Blob, submitMatch: boolean) => {
    voiceDebug('processRecording', { size: blob.size, type: blob.type, submitMatch })
    if (!token) {
      finalizeVoiceAnswer('', false)
      return
    }
    if (!blob.size) {
      finalizeVoiceAnswer('', submitMatch)
      return
    }

    busyRef.current = true
    setBusy(true)
    let text = ''
    try {
      const result = await transcribeAudio(token, blob, {
        context: 'onboarding',
        hint: fieldRef.current?.label || fieldRef.current?.key || '',
      })
      const raw = (result.raw || result.text || '').trim()
      text = sanitizeTranscript((result.text || '').trim())
      voiceDebug('whisper text', {
        raw: raw || '(empty)',
        cleaned: result.text || '(empty)',
        sanitized: text || '(empty)',
        changed: result.changed,
      })
    } catch (err) {
      voiceDebug('transcribe failed', err)
      setError(err instanceof Error ? err.message : 'Could not transcribe audio.')
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: 'Voice transcription failed. Please type or tap an option.',
        },
      ])
      busyRef.current = false
      setBusy(false)
      finalizeVoiceAnswer('', false)
      return
    }

    // Clear busy before auto-submit — runTurn uses busyRef and would no-op otherwise.
    busyRef.current = false
    setBusy(false)
    finalizeVoiceAnswer(text, submitMatch)
  }

  const stopListening = (options?: { submitMatch?: boolean }) => {
    const submitMatch = options?.submitMatch !== false
    pendingSubmitMatchRef.current = submitMatch
    wantListenRef.current = false
    clearVoiceTimers()
    setListening(false)

    const recorder = mediaRecorderRef.current
    voiceDebug('stopListening', {
      submitMatch,
      recorderState: recorder?.state || 'none',
    })

    if (!recorder || recorder.state === 'inactive') {
      stopMediaStream()
      mediaRecorderRef.current = null
      void processRecording(new Blob(audioChunksRef.current, { type: 'audio/webm' }), submitMatch)
      return
    }

    try {
      recorder.stop()
    } catch (err) {
      voiceDebug('recorder.stop threw', err)
      stopMediaStream()
      mediaRecorderRef.current = null
      void processRecording(new Blob(audioChunksRef.current, { type: 'audio/webm' }), submitMatch)
    }
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, field, busy])

  useEffect(() => {
    if (!token || startedRef.current) return
    startedRef.current = true
    void (async () => {
      setBusy(true)
      setError('')
      try {
        const result = await startAiOnboarding(token, role)
        applyServerState(result, true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start AI onboarding.')
      } finally {
        setBusy(false)
      }
    })()
  }, [token, role])

  useEffect(() => {
    return () => {
      wantListenRef.current = false
      clearVoiceTimers()
      try {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      } catch {
        // ignore
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const applyServerState = (result: AiOnboardingResponse, replace = false) => {
    setAnswers(result.answers || {})
    setField(result.field)
    setProgress(result.progress || { done: 0, total: 1 })
    setMultiDraft(
      result.field?.mode === 'multi' && Array.isArray(result.answers?.[result.field.key])
        ? (result.answers[result.field.key] as string[])
        : [],
    )
    if (result.field?.mode === 'address') {
      const address = (result.answers?.address || {}) as {
        line1?: string
        city?: string
        state?: string
        pincode?: string
      }
      setAddressDraft({
        line1: address.line1 || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
      })
    }
    if (result.assistantMessage) {
      setMessages((prev) => {
        const next = replace ? [] : prev
        return [
          ...next,
          { id: uid(), role: 'assistant', content: result.assistantMessage },
        ]
      })
    }
  }

  const pushUser = (content: string, fieldKey?: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'user',
        content,
        fieldKey: fieldKey || fieldRef.current?.key,
      },
    ])
  }

  const historyPayload = (extraUser?: string) => {
    const base = messages.map((item) => ({
      role: item.role,
      content: item.content,
    }))
    if (extraUser) base.push({ role: 'user', content: extraUser })
    return base
  }

  const finishIfNeeded = async (result: AiOnboardingResponse) => {
    if (!result.complete) return
    setFinishing(true)
    try {
      await onComplete(result.answers || {})
    } catch (err) {
      setFinishing(false)
      setError(err instanceof Error ? err.message : 'Failed to save setup.')
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: 'I couldn’t save that just now. Please try again.',
        },
      ])
    }
  }

  const editAnswer = async (messageId: string, options?: { retake?: boolean }) => {
    if (!token || busyRef.current || finishing) return
    const idx = messages.findIndex((item) => item.id === messageId)
    if (idx < 0) return
    const target = messages[idx]
    if (target.role !== 'user' || !target.fieldKey) return

    const keysToClear = messages
      .slice(idx)
      .filter((item) => item.role === 'user' && item.fieldKey)
      .map((item) => item.fieldKey as string)

    const newAnswers: Record<string, unknown> = { ...answers }
    for (const key of keysToClear) {
      delete newAnswers[key]
      delete newAnswers[`${key}Other`]
    }
    if (keysToClear.includes('address')) {
      newAnswers.address = { country: 'India' }
    }

    const keptMessages = messages.slice(0, idx)
    setMessages(keptMessages)
    setAnswers(newAnswers)
    setMultiDraft([])
    setInput(target.content === 'Skip' ? '' : target.content)
    setError('')

    busyRef.current = true
    setBusy(true)
    try {
      const result = await postAiOnboardingTurn(token, {
        role,
        message: '',
        answers: newAnswers,
        history: keptMessages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      })
      setAnswers(result.answers || newAnswers)
      setField(result.field)
      setProgress(result.progress || { done: 0, total: 1 })
      if (result.field?.mode === 'multi' && Array.isArray(result.answers?.[result.field.key])) {
        setMultiDraft(result.answers[result.field.key] as string[])
      }
      // Keep the previous assistant prompt; only add one if the thread is empty.
      setMessages((prev) => {
        if (prev.some((item) => item.role === 'assistant')) return prev
        if (!result.assistantMessage) return prev
        return [
          ...prev,
          { id: uid(), role: 'assistant', content: result.assistantMessage },
        ]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reopen that step.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }

    if (options?.retake) {
      window.setTimeout(() => {
        if (!wantListenRef.current) toggleVoiceRef.current()
      }, 200)
    }
  }

  const runTurn = async (payload: {
    message?: string
    selectedOptions?: string | string[] | null
    addressPatch?: typeof addressDraft | null
    skipOptional?: boolean
    userVisible?: string
  }) => {
    if (!token || busyRef.current || finishing) return
    busyRef.current = true
    setBusy(true)
    setError('')
    if (payload.userVisible) pushUser(payload.userVisible)

    try {
      const result = await postAiOnboardingTurn(token, {
        role,
        message: payload.message || '',
        answers,
        history: historyPayload(payload.userVisible),
        selectedOptions: payload.selectedOptions ?? null,
        addressPatch: payload.addressPatch || null,
        skipOptional: Boolean(payload.skipOptional),
      })
      applyServerState(result)
      setInput('')
      await finishIfNeeded(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  runTurnRef.current = runTurn

  const sendText = async () => {
    const text = input.trim()
    if (!text) return
    await runTurn({ message: text, userVisible: text })
  }

  const onSingleChip = async (option: string) => {
    await runTurn({
      selectedOptions: option,
      userVisible: option,
    })
  }

  const toggleMulti = (option: string) => {
    setMultiDraft((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option],
    )
  }

  const confirmMulti = async () => {
    if (!multiDraft.length) {
      setError('Pick at least one option, or type your answer.')
      return
    }
    await runTurn({
      selectedOptions: multiDraft,
      userVisible: multiDraft.join(', '),
    })
  }

  const confirmAddress = async () => {
    await runTurn({
      addressPatch: addressDraft,
      userVisible: `${addressDraft.line1}, ${addressDraft.city}, ${addressDraft.state}, ${addressDraft.pincode}`,
    })
  }

  const toggleVoice = () => {
    void (async () => {
      if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: 'Voice recording isn’t supported in this browser. Please type or use the options.',
          },
        ])
        return
      }

      if (wantListenRef.current || mediaRecorderRef.current) {
        stopListening({ submitMatch: true })
        return
      }

      voiceDebug('mic toggled on', {
        field: fieldRef.current?.key,
        mode: fieldRef.current?.mode,
      })

      voiceAutoSubmittedRef.current = false
      voiceSessionDoneRef.current = false
      pendingSubmitMatchRef.current = true
      audioChunksRef.current = []

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        voiceDebug('getUserMedia failed', err)
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content:
              'Microphone permission is blocked. Allow mic access in the browser address bar, then try again.',
          },
        ])
        return
      }

      mediaStreamRef.current = stream
      const mimeType = pickRecorderMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data)
          voiceDebug('chunk', { size: event.data.size, type: event.data.type })
        }
      }

      recorder.onstop = () => {
        const blobType = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: blobType })
        voiceDebug('recorder.onstop', { size: blob.size, type: blobType })
        stopMediaStream()
        mediaRecorderRef.current = null
        void processRecording(blob, pendingSubmitMatchRef.current)
      }

      mediaRecorderRef.current = recorder
      wantListenRef.current = true
      const seconds = voiceSecondsForField(fieldRef.current)
      listenSecondsRef.current = seconds
      listenDeadlineRef.current = Date.now() + seconds * 1000
      setListenLeft(seconds)
      clearVoiceTimers()
      listenTickRef.current = setInterval(() => {
        const leftMs = listenDeadlineRef.current - Date.now()
        const left = Math.max(0, Math.ceil(leftMs / 1000))
        setListenLeft(left)
        if (leftMs <= 0) stopListening({ submitMatch: true })
      }, 200)

      try {
        recorder.start(250)
        setListening(true)
        voiceDebug('recorder.start', { mimeType: recorder.mimeType || mimeType || 'default' })
      } catch (err) {
        voiceDebug('recorder.start failed', err)
        stopMediaStream()
        mediaRecorderRef.current = null
        wantListenRef.current = false
        clearVoiceTimers()
        setError('Could not start the microphone. Try again.')
      }
    })()
  }
  toggleVoiceRef.current = toggleVoice

  const percent = Math.round((progress.done / Math.max(progress.total, 1)) * 100)

  return (
    <div className="flex flex-col min-h-0 w-full max-w-3xl mx-auto">
      {headerSlot}

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>
            Step {Math.min(progress.done + (field ? 1 : 0), progress.total)} of {progress.total}
          </span>
          <span>{percent}%</span>
        </div>
        <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-black transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div
        ref={listRef}
        className="max-h-[min(52vh,480px)] overflow-y-auto rounded-xl border border-gray-200 bg-white px-3 py-3 space-y-3"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[90%] ${message.role === 'user' ? 'items-end' : ''}`}>
              <div
                className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                  message.role === 'user'
                    ? 'bg-black text-white rounded-br-md'
                    : 'bg-[#f5f3ef] text-gray-800 rounded-bl-md'
                }`}
              >
                {message.role === 'assistant' ? (
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
                    Fabrica AI
                  </p>
                ) : null}
                {message.content}
              </div>
              {message.role === 'user' && message.fieldKey && !finishing ? (
                <div className="mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void editAnswer(message.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-black disabled:opacity-40"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void editAnswer(message.id, { retake: true })}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-black disabled:opacity-40"
                  >
                    <RotateCcw size={11} />
                    Retake
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex justify-start">
            <div className="bg-[#f5f3ef] text-gray-500 text-sm rounded-2xl rounded-bl-md px-3 py-2">
              Thinking…
            </div>
          </div>
        ) : null}
      </div>

      {field ? (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3.5 space-y-3">
          <p className="text-xs font-semibold text-black capitalize">{field.label}</p>

          {field.mode === 'single' || field.mode === 'multi' ? (
            <div className="flex flex-wrap gap-2">
              {field.options.map((option) => (
                <ChoiceChip
                  key={option}
                  label={option}
                  selected={
                    field.mode === 'multi'
                      ? multiDraft.includes(option)
                      : answers[field.key] === option
                  }
                  disabled={busy || finishing}
                  onClick={() => {
                    if (field.mode === 'multi') toggleMulti(option)
                    else void onSingleChip(option)
                  }}
                />
              ))}
            </div>
          ) : null}

          {field.mode === 'multi' ? (
            <button
              type="button"
              disabled={busy || finishing || !multiDraft.length}
              onClick={() => void confirmMulti()}
              className="btn-pill-black px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Continue with selection
            </button>
          ) : null}

          {field.mode === 'address' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={addressDraft.line1}
                onChange={(e) => setAddressDraft((prev) => ({ ...prev, line1: e.target.value }))}
                placeholder="Street address / landmark"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={addressDraft.city}
                  onChange={(e) => setAddressDraft((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
                />
                <StateSelect
                  value={addressDraft.state}
                  onChange={(value) => setAddressDraft((prev) => ({ ...prev, state: value }))}
                />
              </div>
              <input
                type="text"
                value={addressDraft.pincode}
                onChange={(e) =>
                  setAddressDraft((prev) => ({
                    ...prev,
                    pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
                placeholder="PIN code"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
              />
              <button
                type="button"
                disabled={busy || finishing}
                onClick={() => void confirmAddress()}
                className="btn-pill-black px-4 py-2.5 text-sm disabled:opacity-50"
              >
                Save address
              </button>
            </div>
          ) : null}

          {listening ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
              </span>
              <div className="flex items-end gap-0.5 h-4" aria-hidden>
                {[4, 10, 6, 12, 5, 9].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full bg-red-500 animate-pulse"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${i * 90}ms`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-red-700">
                Recording… {listenLeft}s left · tap mic to stop · we’ll transcribe after
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  listening
                    ? 'Speak now…'
                    : field.mode === 'address'
                      ? 'Or speak/type the full address…'
                      : 'Type to edit, or use the mic…'
                }
                className={`w-full h-11 px-3.5 pr-12 text-sm rounded-xl bg-white focus:outline-none border ${
                  listening
                    ? 'border-red-400 ring-2 ring-red-100 focus:border-red-500'
                    : 'border-gray-200 focus:border-gray-400'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void sendText()
                  }
                }}
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  listening
                    ? 'bg-red-600 text-white ring-2 ring-red-200 animate-pulse'
                    : 'bg-[#f5f3ef] text-gray-700 hover:bg-[#ece8e3]'
                }`}
                aria-label={listening ? 'Stop recording' : 'Retake with voice'}
                aria-pressed={listening}
                title={listening ? 'Mic on — tap to stop' : 'Answer with voice / retake'}
              >
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
            <button
              type="button"
              disabled={busy || finishing || !input.trim()}
              onClick={() => void sendText()}
              className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Send typed answer"
              title="Send typed answer"
            >
              <Send size={16} />
            </button>
          </div>

          {field.optional ? (
            <button
              type="button"
              disabled={busy || finishing}
              onClick={() =>
                void runTurn({
                  skipOptional: true,
                  userVisible: 'Skip',
                })
              }
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black"
            >
              <SkipForward size={14} />
              Skip this question
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
      {finishing ? (
        <p className="text-sm text-gray-500 mt-3 inline-flex items-center gap-2">
          Saving your profile
          <ChevronDown className="animate-bounce" size={14} />
        </p>
      ) : null}
    </div>
  )
}
