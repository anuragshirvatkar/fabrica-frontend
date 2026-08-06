import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CheckCheck,
  Info,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { postAiChat, type AiChatHistoryItem } from '../../lib/api'
import { formatNumber } from '../../lib/format'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: Array<{
    _id: string
    name: string
    category?: string
    price?: number | null
    coverImage?: string
    unit?: string
  }>
  time: string
}

const SUGGESTIONS = [
  'I need cotton for shirts',
  'Show me premium linen',
  'Black denim under ₹300',
  'Recommend fabric for uniforms',
]

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function AiAssistant() {
  const { user, getAccessToken } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello — I am Fabrica’s textile sourcing assistant. Tell me the fabric, use case, color, or budget you need, and I will pull matches from the live catalog only.',
      time: nowLabel(),
    },
  ])

  const listRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const productIdFromPath = location.pathname.match(/^\/marketplace\/([^/]+)/)?.[1] || null

  const hideForSeller =
    user?.role === 'SELLER' ||
    location.pathname.startsWith('/seller') ||
    location.pathname.startsWith('/buyer/setup')
  const onLandingHero = location.pathname === '/'

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, sending])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  if (hideForSeller) return null

  const speak = (text: string) => {
    if (!speakReplies || !text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1
    utter.pitch = 1
    window.speechSynthesis.speak(utter)
  }

  const sendMessage = async (raw: string) => {
    const text = raw.trim()
    if (!text || sending) return

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      time: nowLabel(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const history: AiChatHistoryItem[] = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }))

      const token = await getAccessToken()
      const result = await postAiChat(
        {
          message: text,
          history,
          productId: productIdFromPath,
        },
        token,
      )

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: result.reply,
        products: (result.products || []).slice(0, 4).map((p) => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          price: p.price,
          coverImage: p.coverImage,
          unit: p.unit,
        })),
        time: nowLabel(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      speak(result.reply)
    } catch (err) {
      const fallback =
        err instanceof Error
          ? err.message
          : 'I could not reach the sourcing assistant right now. Please try again.'
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: fallback,
          time: nowLabel(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const toggleVoice = () => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: 'Voice input is not supported in this browser. Please type your request.',
          time: nowLabel(),
        },
      ])
      return
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      if (transcript.trim()) {
        setInput(transcript.trim())
        void sendMessage(transcript.trim())
      }
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-[70] right-3 sm:right-4 md:right-7 inline-flex items-center gap-2 rounded-full bg-[#faf8f5] text-black border border-black/10 shadow-[0_8px_28px_rgba(0,0,0,0.22)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.28)] hover:bg-white transition-all pl-1.5 pr-3 sm:pl-2 sm:pr-4 h-11 sm:h-12 ring-1 ring-white/80 ${
          onLandingHero
            ? 'bottom-[9.75rem] sm:bottom-6 md:bottom-8'
            : 'bottom-5 sm:bottom-6 md:bottom-8'
        } ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'}`}
        aria-label="Open Fabrica AI assistant"
      >
        <span className="w-8 h-8 rounded-full bg-black text-white inline-flex items-center justify-center shrink-0">
          <Sparkles size={15} />
        </span>
        <span className="text-xs sm:text-sm font-semibold tracking-wide">Ask Fabrica</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <button
            type="button"
            aria-label="Close assistant"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-100 animate-in slide-in-from-right">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100 shrink-0 bg-[#faf8f5]">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles size={16} className="text-black" />
                  <h2 className="text-sm font-semibold text-black">Fabrica AI</h2>
                </div>
                <p className="text-xs text-gray-500">Textile sourcing expert · live catalog only</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSpeakReplies((v) => !v)
                    window.speechSynthesis?.cancel()
                  }}
                  className="p-1.5 rounded-full hover:bg-white/80 text-gray-500"
                  aria-label={speakReplies ? 'Mute spoken replies' : 'Enable spoken replies'}
                  title={speakReplies ? 'Mute replies' : 'Speak replies'}
                >
                  {speakReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/80 text-gray-500"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-main p-4 space-y-4 bg-white"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === 'user' ? 'flex flex-col items-end' : ''}
                >
                  <div
                    className={`rounded-xl px-3.5 py-2.5 max-w-[90%] ${
                      msg.role === 'user'
                        ? 'bg-[#e8dfd4] rounded-tr-sm'
                        : 'bg-[#f5f3ef] rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>

                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 space-y-2 max-w-[95%]">
                      {msg.products.map((product) => (
                        <Link
                          key={product._id}
                          to={`/marketplace/${product._id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white p-2 hover:border-gray-300 transition-colors"
                        >
                          <div className="w-11 h-11 rounded-md bg-[#f5f3ef] overflow-hidden shrink-0">
                            {product.coverImage ? (
                              <img
                                src={product.coverImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-black truncate">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {product.category || 'Fabric'}
                              {product.price != null
                                ? ` · ₹${formatNumber(product.price)} / ${product.unit || 'm'}`
                                : ''}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      msg.role === 'user' ? 'mr-1' : 'ml-1'
                    }`}
                  >
                    <p className="text-[10px] text-gray-400">{msg.time}</p>
                    {msg.role === 'user' ? (
                      <CheckCheck size={12} className="text-gray-400" />
                    ) : null}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="bg-[#f5f3ef] rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[70%]">
                  <p className="text-sm text-gray-500">Sourcing from catalog…</p>
                </div>
              )}

              {messages.length <= 1 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Try asking</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => void sendMessage(tag)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-[#f5f3ef] transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
              <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-full pl-4 pr-1.5 py-1.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void sendMessage(input)
                  }}
                  placeholder="Ask about fabrics, uses, comparisons..."
                  className="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 placeholder:text-gray-400 min-w-0"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    listening
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                  aria-label={listening ? 'Stop listening' : 'Voice input'}
                  title={listening ? 'Stop listening' : 'Voice input'}
                >
                  {listening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={sending || !input.trim()}
                  className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-black/85 transition-colors shrink-0 disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send size={14} />
                </button>
              </div>
              <div className="flex items-start gap-1.5 mt-3">
                <Info size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Answers use published Fabrica products only. Always confirm specs with the seller.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
