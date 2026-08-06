import { useState } from 'react'
import { MessageCircleQuestion, Send, Sparkles } from 'lucide-react'
import { postProductQa } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { getFriendlyErrorMessage } from '../../lib/errors'

const SUGGESTED = [
  'Is this suitable for summer shirts?',
  'What is the GSM and fabric weight like?',
  'What is the minimum order quantity?',
  'Which colors are available?',
]

type ProductQaPanelProps = {
  productId: string
  productName: string
}

type QaTurn = {
  question: string
  answer: string
}

export function ProductQaPanel({ productId, productName }: ProductQaPanelProps) {
  const { getAccessToken } = useAuth()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [turns, setTurns] = useState<QaTurn[]>([])

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setError('')
    setLoading(true)
    setQuestion('')
    try {
      const token = await getAccessToken()
      const result = await postProductQa(productId, q, token)
      setTurns((prev) => [...prev, { question: q, answer: result.answer }])
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not answer that question.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-[#f5f3ef] flex items-center justify-center flex-shrink-0">
          <MessageCircleQuestion size={18} className="text-gray-700" />
        </span>
        <div>
          <h2 className="text-lg font-serif font-semibold text-black">Ask about this fabric</h2>
          <p className="text-sm text-gray-500 mt-1">
            Get answers from catalog specs for {productName}. No guessing beyond listed details.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED.map((item) => (
          <button
            key={item}
            type="button"
            disabled={loading}
            onClick={() => void ask(item)}
            className="px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white text-gray-700 hover:border-gray-400 disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 mb-5"
        onSubmit={(event) => {
          event.preventDefault()
          void ask(question)
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this fabric…"
          className="flex-1 min-w-0 px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="btn-pill-black px-4 py-2.5 text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {loading ? 'Asking…' : 'Ask'}
          {!loading && <Send size={14} />}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {turns.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
          <Sparkles size={18} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">Ask anything about specs, use cases, MOQ, or colors.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {turns.map((turn) => (
            <div key={`${turn.question}-${turn.answer.slice(0, 24)}`} className="space-y-2">
              <div className="rounded-2xl rounded-br-md bg-black text-white px-4 py-2.5 text-sm ml-8">
                {turn.question}
              </div>
              <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 text-sm text-gray-800 leading-relaxed mr-8">
                {turn.answer}
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-sm text-gray-500 px-1">Checking catalog details…</p>
          )}
        </div>
      )}
    </div>
  )
}
