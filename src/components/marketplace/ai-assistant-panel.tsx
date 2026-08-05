import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X, Send, Info, CheckCheck, Mic, MicOff } from 'lucide-react'
import { postAiChat, type AiChatHistoryItem } from '../../lib/api'
import { formatNumber } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'

const refineTags = [
  'Under ₹400 /meter',
  'Pastel colors',
  'GSM below 150',
  "For men's shirts",
  'Pre-washed linen',
]

type AiAssistantPanelProps = {
  onClose?: () => void
  initialSummary?: string
}

type Msg = {
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
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function AiAssistantPanel({ onClose, initialSummary }: AiAssistantPanelProps) {
  const { getAccessToken } = useAuth()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        initialSummary?.trim() ||
        'Ask me to refine this search — budget, GSM, color, or end use. I only recommend fabrics from the Fabrica catalog.',
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    if (!initialSummary?.trim()) return
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.id === 'welcome') {
        return [{ id: 'welcome', role: 'assistant', content: initialSummary.trim() }]
      }
      return prev
    })
  }, [initialSummary])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const sendMessage = async (raw: string) => {
    const text = raw.trim()
    if (!text || sending) return

    setMessages((prev) => [...prev, { id: uid(), role: 'user', content: text }])
    setInput('')
    setSending(true)

    try {
      const history: AiChatHistoryItem[] = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }))
      const token = await getAccessToken()
      const result = await postAiChat({ message: text, history }, token)
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: result.reply,
          products: (result.products || []).slice(0, 3).map((p) => ({
            _id: p._id,
            name: p.name,
            category: p.category,
            price: p.price,
            coverImage: p.coverImage,
            unit: p.unit,
          })),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'I could not complete that request. Please try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const toggleVoice = () => {
    const w = window as Window & {
      SpeechRecognition?: new () => {
        continuous: boolean
        interimResults: boolean
        lang: string
        start: () => void
        stop: () => void
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
        onerror: (() => void) | null
        onend: (() => void) | null
      }
      webkitSpeechRecognition?: new () => {
        continuous: boolean
        interimResults: boolean
        lang: string
        start: () => void
        stop: () => void
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
        onerror: (() => void) | null
        onend: (() => void) | null
      }
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return

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
      if (transcript.trim()) void sendMessage(transcript.trim())
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-black" />
            <h2 className="text-sm font-semibold text-black">Fabrica AI Assistant</h2>
          </div>
          <p className="text-xs text-gray-500">Your smart fabric sourcing partner</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Close AI assistant"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-main p-4 space-y-4"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? 'flex flex-col items-end' : ''}>
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
                    className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white p-2 hover:border-gray-300"
                  >
                    <div className="w-10 h-10 rounded-md bg-[#f5f3ef] overflow-hidden shrink-0">
                      {product.coverImage ? (
                        <img src={product.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-black truncate">{product.name}</p>
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
            {msg.role === 'user' && (
              <div className="flex items-center gap-1 mt-1 mr-1">
                <CheckCheck size={12} className="text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="bg-[#f5f3ef] rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[70%]">
            <p className="text-sm text-gray-500">Sourcing from catalog…</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-gray-600 mb-2.5">Refine your search</p>
          <div className="flex flex-wrap gap-2">
            {refineTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => void sendMessage(tag)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0">
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
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              listening
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
            aria-label={listening ? 'Stop listening' : 'Voice input'}
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
            AI results are suggestions from published catalog products. Please verify details with
            suppliers.
          </p>
        </div>
      </div>
    </div>
  )
}
