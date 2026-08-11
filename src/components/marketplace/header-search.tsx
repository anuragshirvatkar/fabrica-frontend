import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Search, X } from 'lucide-react'
import {
  fetchMarketplaceSuggest,
  type MarketplaceSuggestProduct,
} from '../../lib/api'
import { formatNumber } from '../../lib/format'
import { VoiceSearchOverlay } from './VoiceSearchOverlay'

type HeaderSearchProps = {
  className?: string
  initialQuery?: string
}

export function HeaderSearch({
  className = '',
  initialQuery = '',
}: HeaderSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<MarketplaceSuggestProduct[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await fetchMarketplaceSuggest(trimmed)
          setProducts(result.products)
          setOpen(true)
        } catch {
          setProducts([])
        } finally {
          setLoading(false)
        }
      })()
    }, 350)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query])

  const goToSearch = (value: string) => {
    const q = value.trim()
    setOpen(false)
    navigate(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace')
  }

  const goToProduct = (id: string) => {
    setOpen(false)
    navigate(`/marketplace/${id}`)
  }

  const clearQuery = () => {
    setQuery('')
    setProducts([])
    setOpen(false)
    if (initialQuery) navigate('/marketplace')
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <div className="flex items-center w-full h-11 rounded-full border border-gray-200 bg-[#f5f3ef] overflow-hidden focus-within:border-gray-400 focus-within:bg-white transition-colors">
        <div className="pl-3 sm:pl-3.5 pr-2 text-gray-400 shrink-0">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (query.trim().length >= 2 || products.length) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') goToSearch(query)
          }}
          placeholder="Search fabrics..."
          className="flex-1 min-w-0 h-full bg-transparent focus:outline-none text-sm text-gray-800 placeholder:text-gray-400"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={clearQuery}
            className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200/80 hover:text-black transition-colors"
            aria-label="Clear search"
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setVoiceOpen(true)
          }}
          className="shrink-0 w-9 h-9 mr-1 inline-flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-200/80 hover:text-black transition-colors"
          aria-label="Voice search"
          title="Voice search"
        >
          <Mic size={15} />
        </button>
      </div>

      {voiceOpen ? (
        <VoiceSearchOverlay
          open
          onClose={() => setVoiceOpen(false)}
          initialQuery={query}
        />
      ) : null}

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50 max-h-[min(24rem,70dvh)] overflow-y-auto">
          <button
            type="button"
            onClick={() => goToSearch(query)}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left hover:bg-[#f5f3ef] border-b border-gray-100"
          >
            <Search size={15} className="text-gray-500 shrink-0" />
            <span className="text-sm text-gray-800">
              Search for <span className="font-semibold">&lsquo;{query.trim()}&rsquo;</span>
            </span>
          </button>

          {loading ? (
            <p className="px-3.5 py-3 text-xs text-gray-500">Searching...</p>
          ) : products.length === 0 ? (
            <p className="px-3.5 py-3 text-xs text-gray-500">No direct products found.</p>
          ) : (
            <div className="py-1 max-h-72 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => goToProduct(product._id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[#f5f3ef]"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f5f3ef] overflow-hidden shrink-0">
                    {product.coverImage ? (
                      <img
                        src={product.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-black truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {product.category || 'Fabric'}
                      {product.price != null
                        ? ` · ₹${formatNumber(product.price)} / ${product.unit || 'meter'}`
                        : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
