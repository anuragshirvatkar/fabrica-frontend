import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Check, Loader2, Scale, X } from 'lucide-react'
import {
  fetchSimilarProducts,
  postAiCompare,
} from '../../lib/api'
import type { MarketplaceApiProduct } from '../../lib/marketplaceAdapter'
import { useAuth } from '../../context/AuthContext'
import { getFriendlyErrorMessage } from '../../lib/errors'
import { formatNumber } from '../../lib/format'

type ProductComparePanelProps = {
  product: MarketplaceApiProduct
  onClose?: () => void
}

type CompareResult = {
  productA: MarketplaceApiProduct
  productB: MarketplaceApiProduct
  summary: string
  dimensions: Array<{ label: string; productA: string; productB: string }>
  verdict: string
}

export function ProductComparePanel({ product, onClose }: ProductComparePanelProps) {
  const { getAccessToken } = useAuth()
  const [candidates, setCandidates] = useState<MarketplaceApiProduct[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CompareResult | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingCandidates(true)
      try {
        const response = await fetchSimilarProducts(product._id, 10)
        if (!cancelled) setCandidates(response.products || [])
      } catch (err) {
        if (!cancelled) {
          setCandidates([])
          setError(getFriendlyErrorMessage(err, 'Could not load fabrics to compare.'))
        }
      } finally {
        if (!cancelled) setLoadingCandidates(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [product._id])

  const runCompare = async (otherId: string) => {
    setSelectedId(otherId)
    setComparing(true)
    setError('')
    setResult(null)
    try {
      const token = await getAccessToken()
      const response = await postAiCompare(product._id, otherId, token)
      setResult({
        productA: response.productA,
        productB: response.productB,
        summary: response.summary,
        dimensions: response.dimensions || [],
        verdict: response.verdict,
      })
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Comparison failed.'))
    } finally {
      setComparing(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#f5f3ef] flex items-center justify-center flex-shrink-0">
            <Scale size={18} className="text-gray-700" />
          </span>
          <div>
            <h2 className="text-lg font-serif font-semibold text-black">Compare fabrics</h2>
            <p className="text-sm text-gray-500 mt-1">
              Pick another catalog fabric to compare with{' '}
              <span className="text-gray-800 font-medium">{product.name}</span>.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close compare"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!result && (
        <>
          <div className="mb-4 rounded-lg border border-gray-100 bg-[#f9f9f9] p-3 flex items-center gap-3">
            <img
              src={product.coverImage || ''}
              alt=""
              className="w-12 h-12 rounded-lg object-cover bg-gray-200"
            />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Fabric A</p>
              <p className="text-sm font-medium text-black truncate">{product.name}</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-black mb-2.5">Choose Fabric B</p>
          {loadingCandidates ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 size={16} className="animate-spin" />
              Loading similar fabrics…
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No similar published fabrics found. Browse the marketplace and open another product to
              compare.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
              {candidates.map((item) => {
                const active = selectedId === item._id
                return (
                  <button
                    key={item._id}
                    type="button"
                    disabled={comparing}
                    onClick={() => void runCompare(item._id)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-black bg-[#f5f3ef]'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    } disabled:opacity-60`}
                  >
                    <img
                      src={item.coverImage || ''}
                      alt=""
                      className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-black truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.category || 'Fabric'}
                        {item.price != null ? ` · ₹${formatNumber(item.price)}` : ''}
                      </p>
                    </div>
                    <ArrowLeftRight size={14} className="text-gray-400 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {comparing && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 size={16} className="animate-spin" />
          Comparing catalog specs…
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && !comparing && (
        <div className="space-y-3">
          {result.dimensions.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f5f3ef]">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 w-[7.5rem] align-bottom border-b border-[#e8e4de]">
                      Spec
                    </th>
                    {[result.productA, result.productB].map((item, index) => (
                      <th
                        key={item._id}
                        className="px-3 py-2.5 text-left align-bottom border-b border-[#e8e4de] min-w-[10rem]"
                      >
                        <Link
                          to={`/marketplace/${item._id}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <img
                            src={item.coverImage || ''}
                            alt=""
                            className="w-9 h-9 rounded-md object-cover bg-gray-200 flex-shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block text-[10px] font-medium text-gray-500">
                              Fabric {index === 0 ? 'A' : 'B'}
                            </span>
                            <span className="block text-xs font-semibold text-black leading-snug line-clamp-2 group-hover:underline">
                              {item.name}
                            </span>
                          </span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.dimensions.map((row, index) => (
                    <tr
                      key={row.label}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap border-t border-gray-100 align-top">
                        {row.label}
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-t border-gray-100 align-top leading-snug">
                        {row.productA}
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-t border-gray-100 align-top leading-snug">
                        {row.productB}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.summary && (
            <p className="text-sm text-gray-600 leading-relaxed rounded-lg bg-[#f9f9f9] border border-gray-100 px-3 py-2.5">
              {result.summary}
            </p>
          )}

          {result.verdict && (
            <div className="rounded-xl bg-[#f5f3ef] px-3.5 py-3 flex items-start gap-2.5">
              <Check size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-0.5">Verdict</p>
                <p className="text-sm text-gray-800 leading-relaxed">{result.verdict}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setResult(null)
              setSelectedId(null)
              setError('')
            }}
            className="btn-pill-black px-4 py-2.5 text-sm rounded-lg inline-flex items-center gap-2"
          >
            <ArrowLeftRight size={14} />
            Compare another
          </button>
        </div>
      )}
    </div>
  )
}
