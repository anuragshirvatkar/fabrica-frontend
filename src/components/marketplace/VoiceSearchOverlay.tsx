import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Search, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWhisperMic } from '../../hooks/useWhisperMic'
import {
  cancelSpeech,
  detectAuthRefusal,
  detectVoiceNavigation,
  speakFabrica,
} from '../../lib/speech'

type VoiceSearchOverlayProps = {
  open: boolean
  onClose: () => void
  initialQuery?: string
}

export function VoiceSearchOverlay({
  open,
  onClose,
  initialQuery = '',
}: VoiceSearchOverlayProps) {
  const navigate = useNavigate()
  const { getAccessToken, user } = useAuth()
  const [query, setQuery] = useState(initialQuery)
  const [error, setError] = useState('')
  const [autoStarted, setAutoStarted] = useState(false)
  const queryRef = useRef(query)
  const onCloseRef = useRef(onClose)

  queryRef.current = query
  onCloseRef.current = onClose

  const { listening, listenLeft, transcribing, levels, toggle, startListening, stopListening } =
    useWhisperMic({
      getToken: getAccessToken,
      listenSeconds: 8,
      context: 'search',
      hint: 'Fabric marketplace keyword search (strip show/find/search for)',
      onTranscript: (text) => {
        const q = text.trim()
        setQuery(q)
        setError('')

        const authRefusal = detectAuthRefusal(q)
        if (authRefusal) {
          setError(authRefusal)
          speakFabrica(authRefusal)
          return
        }

        const nav = detectVoiceNavigation(q)
        if (nav) {
          speakFabrica(nav.reply)
          window.setTimeout(() => {
            stopListening({ process: false })
            onCloseRef.current()
            navigate(nav.path)
          }, 450)
          return
        }

        speakFabrica(q ? `Searching Fabrica for ${q}` : 'I did not catch a search. Try again.')
        if (!q) return
        window.setTimeout(() => {
          stopListening({ process: false })
          onCloseRef.current()
          navigate(`/marketplace?q=${encodeURIComponent(q)}`)
        }, 450)
      },
      onError: (message) => setError(message),
    })

  const goSearch = (value?: string) => {
    const q = (value ?? queryRef.current).trim()
    cancelSpeech()
    stopListening({ process: false })
    onClose()
    navigate(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace')
  }

  useEffect(() => {
    if (!open) {
      stopListening({ process: false })
      setAutoStarted(false)
      setError('')
      return
    }
    setQuery(initialQuery)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, initialQuery, stopListening])

  useEffect(() => {
    if (!open || autoStarted) return
    setAutoStarted(true)
    if (!user) {
      setError('Sign in to use voice search, or type below.')
      return
    }
    const t = window.setTimeout(() => {
      void startListening()
    }, 250)
    return () => window.clearTimeout(t)
  }, [open, autoStarted, user, startListening])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopListening({ process: false })
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, stopListening])

  if (!open) return null

  const status = !user
    ? 'Sign in for voice, or type a fabric search'
    : listening
      ? 'Listening…'
      : transcribing
        ? 'Got it — converting speech…'
        : query.trim()
          ? 'Edit and search, or tap the mic again'
          : 'Tap the mic and say a fabric, color, or use'

  return (
    <div className="fixed inset-0 z-[100] bg-[#111111]/95 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <p className="text-sm font-medium tracking-wide text-white/80">Fabrica voice search</p>
        <button
          type="button"
          onClick={() => {
            stopListening({ process: false })
            onClose()
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 inline-flex items-center justify-center"
          aria-label="Close voice search"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
        <p className="text-center text-white/70 text-sm mb-8 max-w-md">{status}</p>

        <div className="h-16 sm:h-20 flex items-end justify-center gap-[3px] sm:gap-1 mb-10 w-full max-w-lg px-2">
          {levels.map((level, i) => (
            <span
              key={i}
              className="w-1 sm:w-1.5 rounded-full bg-white/90 origin-bottom transition-[height] duration-75"
              style={{
                height: `${Math.round(10 + level * (listening ? 68 : 14))}px`,
                opacity: listening ? 0.55 + level * 0.45 : 0.28,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setError('')
            if (!user) {
              setError('Sign in to use voice search, or type below.')
              return
            }
            toggle()
          }}
          disabled={transcribing}
          className={`w-20 h-20 rounded-full inline-flex items-center justify-center transition-all disabled:opacity-50 ${
            listening
              ? 'bg-red-500 shadow-[0_0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
              : 'bg-white text-black hover:scale-[1.03]'
          }`}
          aria-label={listening ? 'Stop listening' : 'Start voice search'}
        >
          {listening ? (
            <MicOff size={28} className="text-white" />
          ) : (
            <Mic size={28} className={transcribing ? 'opacity-50' : ''} />
          )}
        </button>

        {listening ? (
          <p className="mt-4 text-xs text-white/55">{listenLeft}s left · tap mic to stop</p>
        ) : null}

        {error ? <p className="mt-5 text-sm text-red-300 text-center max-w-sm">{error}</p> : null}

        <div className="mt-10 w-full max-w-xl">
          <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2.5 focus-within:bg-white/15">
            <Search size={16} className="text-white/50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goSearch()
              }}
              placeholder="Or type your fabric search…"
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              disabled={listening || transcribing}
            />
            <button
              type="button"
              onClick={() => goSearch()}
              disabled={listening || transcribing || !query.trim()}
              className="shrink-0 rounded-full bg-white text-black text-xs font-semibold px-3.5 py-1.5 disabled:opacity-40"
            >
              Search
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-white/40">
            Try “linen under 300”, “cotton for shirts”, or “black denim”
          </p>
        </div>
      </div>
    </div>
  )
}
