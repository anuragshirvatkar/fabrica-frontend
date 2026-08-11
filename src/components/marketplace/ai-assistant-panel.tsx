import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, X, Send, Info, CheckCheck, Mic, MicOff, Eraser } from 'lucide-react'
import { postAiChat, type AiChatHistoryItem, addCartItem, fetchMarketplaceProduct, fetchMarketplaceProducts } from '../../lib/api'
import { formatNumber } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useWhisperMic } from '../../hooks/useWhisperMic'
import {
  cancelSpeech,
  collectRecentChatProducts,
  detectAuthRefusal,
  detectCartAction,
  detectOpenProductAction,
  detectVoiceNavigation,
  expandFabricSearchQueries,
  pathForNavigateTo,
  pickBestProduct,
  speakFabrica,
} from '../../lib/speech'

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

function defaultWelcome(initialSummary?: string) {
  return (
    initialSummary?.trim() ||
    'Ask me to refine this search — budget, GSM, color, or end use. I only recommend fabrics from the Fabrica catalog.'
  )
}

function toHistoryItem(message: Msg): AiChatHistoryItem {
  if (message.role === 'assistant' && message.products?.length) {
    const catalog = message.products
      .map((p) => `${p._id}|${p.name}|${p.category || ''}`)
      .join('; ')
    return {
      role: message.role,
      content: `${message.content}\n[catalog:${catalog}]`,
    }
  }
  return { role: message.role, content: message.content }
}

export function AiAssistantPanel({ onClose, initialSummary }: AiAssistantPanelProps) {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: defaultWelcome(initialSummary),
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const sendMessageRef = useRef<(raw: string) => Promise<void>>(async () => {})

  const pushAssistantNote = (content: string) => {
    setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content }])
    speakFabrica(content)
  }

  const { listening, listenLeft, transcribing, toggle: toggleVoice, stopListening } =
    useWhisperMic({
      getToken: getAccessToken,
      listenSeconds: 10,
      onTranscript: (text) => {
        setInput(text)
        void sendMessageRef.current(text)
      },
      onError: pushAssistantNote,
    })

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
  }, [messages, sending, listening, transcribing])

  useEffect(() => {
    return () => {
      stopListening({ process: false })
      cancelSpeech()
    }
  }, [stopListening])

  const sendMessage = async (raw: string) => {
    const text = raw.trim()
    if (!text || sending) return

    setMessages((prev) => [...prev, { id: uid(), role: 'user', content: text }])
    setInput('')
    setSending(true)

    const authRefusal = detectAuthRefusal(text)
    if (authRefusal) {
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: authRefusal }])
      speakFabrica(authRefusal)
      setSending(false)
      return
    }

    const localNav = detectVoiceNavigation(text)
    if (localNav) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: localNav.reply },
      ])
      speakFabrica(localNav.reply)
      setSending(false)
      window.setTimeout(() => {
        onClose?.()
        navigate(localNav.path)
      }, 700)
      return
    }

    const cartAction = detectCartAction(text)
    if (cartAction) {
      try {
        const token = await getAccessToken()
        if (!token) {
          const reply = 'Please sign in as a buyer to add items to your cart.'
          setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply }])
          speakFabrica(reply)
          return
        }
        const fromChat = collectRecentChatProducts(messages)
        let best = pickBestProduct(fromChat, cartAction.query)
        if (!best?._id) {
          const queries = expandFabricSearchQueries(cartAction.query)
          for (const q of queries.length ? queries : [cartAction.query]) {
            const listed = await fetchMarketplaceProducts(q ? { q } : undefined, token)
            best = pickBestProduct(
              [...fromChat, ...(listed.products || [])],
              cartAction.query || q,
            )
            if (best?._id) break
          }
        }
        if (!best?._id) {
          const reply =
            'I couldn’t find that fabric in the catalog. Try the exact product name, or open it from marketplace.'
          setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply }])
          speakFabrica(reply)
          return
        }
        const detail = await fetchMarketplaceProduct(best._id, token)
        const product = detail.product
        const moq = Number(product.moq) || 1
        await addCartItem(token, {
          productId: product._id,
          variantId: product.variants?.[0]?._id
            ? String(product.variants[0]._id)
            : undefined,
          quantity: moq,
        })
        const reply = `Added ${product.name} to your cart${
          moq > 1 ? ` (${moq} ${product.unit || 'meters'} MOQ)` : ''
        }.`
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: reply,
            products: [
              {
                _id: product._id,
                name: product.name,
                category: product.category,
                price: product.price,
                coverImage: product.coverImage,
                unit: product.unit,
              },
            ],
          },
        ])
        speakFabrica(reply)
        window.dispatchEvent(new CustomEvent('fabrica:cart-refresh'))
      } catch (err) {
        const reply =
          err instanceof Error
            ? err.message
            : 'I couldn’t add that to your cart. Please try from the product page.'
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply }])
        speakFabrica(reply)
      } finally {
        setSending(false)
      }
      return
    }

    const openProduct = detectOpenProductAction(text)
    if (openProduct) {
      try {
        const token = await getAccessToken()
        const fromChat = collectRecentChatProducts(messages)
        let best = pickBestProduct(fromChat, openProduct.query)
        if (!best?._id) {
          const queries = expandFabricSearchQueries(openProduct.query)
          for (const q of queries.length ? queries : [openProduct.query]) {
            const listed = await fetchMarketplaceProducts(q ? { q } : undefined, token)
            best = pickBestProduct(
              [...fromChat, ...(listed.products || [])],
              openProduct.query || q,
            )
            if (best?._id) break
          }
        }
        if (!best?._id) {
          const reply =
            'I couldn’t find that product. Try the exact name, or browse the marketplace.'
          setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply }])
          speakFabrica(reply)
          return
        }
        const reply = `Opening ${best.name}.`
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: reply,
            products: [
              {
                _id: best._id,
                name: best.name,
                category: best.category,
                price: best.price,
                coverImage: best.coverImage,
                unit: best.unit,
              },
            ],
          },
        ])
        speakFabrica(reply)
        window.setTimeout(() => {
          onClose?.()
          navigate(`/marketplace/${best._id}`)
        }, 500)
      } catch (err) {
        const reply =
          err instanceof Error ? err.message : 'I couldn’t open that product right now.'
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply }])
        speakFabrica(reply)
      } finally {
        setSending(false)
      }
      return
    }

    try {
      const history: AiChatHistoryItem[] = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map(toHistoryItem)
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
      speakFabrica(result.reply)
      if (result.intent === 'cart_add' || result.cartUpdated) {
        window.dispatchEvent(new CustomEvent('fabrica:cart-refresh'))
      }
      if (result.openProductId) {
        window.setTimeout(() => {
          onClose?.()
          navigate(`/marketplace/${result.openProductId}`)
        }, 700)
      }
      const navPath = pathForNavigateTo(result.navigateTo)
      if (navPath) {
        window.setTimeout(() => {
          onClose?.()
          navigate(navPath)
        }, 700)
      }
    } catch (err) {
      const fallback =
        err instanceof Error
          ? err.message
          : 'I could not complete that request. Please try again.'
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: fallback,
        },
      ])
      speakFabrica(fallback)
    } finally {
      setSending(false)
    }
  }
  sendMessageRef.current = sendMessage

  const clearChat = () => {
    cancelSpeech()
    stopListening({ process: false })
    setInput('')
    setSending(false)
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: defaultWelcome(initialSummary),
      },
    ])
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-black" />
            <h2 className="font-serif text-base font-semibold text-black">Fabrica AI Assistant</h2>
          </div>
          <p className="text-xs text-gray-500">Your smart fabric sourcing partner</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearChat}
            disabled={messages.length <= 1 && !input.trim()}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Eraser size={16} />
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              aria-label="Close AI assistant"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
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
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
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
        {listening || transcribing ? (
          <p className="text-[11px] font-medium text-red-600 mb-2 px-1">
            {listening
              ? `Recording… ${listenLeft}s left · tap mic to stop`
              : 'Transcribing your voice…'}
          </p>
        ) : null}
        <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-full pl-4 pr-1.5 py-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendMessage(input)
            }}
            placeholder={
              listening
                ? 'Speak now…'
                : transcribing
                  ? 'Transcribing…'
                  : 'Ask about fabrics, uses, comparisons...'
            }
            className="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 placeholder:text-gray-400 min-w-0"
            disabled={sending || listening || transcribing}
          />
          <button
            type="button"
            onClick={toggleVoice}
            disabled={sending || transcribing}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 ${
              listening
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
            aria-label={listening ? 'Stop recording' : 'Voice input'}
            title={listening ? 'Stop recording' : 'Voice input (10s)'}
          >
            {listening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            type="button"
            onClick={() => void sendMessage(input)}
            disabled={sending || listening || transcribing || !input.trim()}
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
