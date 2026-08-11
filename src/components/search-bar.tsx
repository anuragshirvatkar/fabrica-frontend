import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container } from './container'
import { Search, X } from 'lucide-react'
import {
  fetchMarketplaceSuggest,
  type MarketplaceSuggestProduct,
} from '../lib/api'
import { formatNumber } from '../lib/format'

const popularSearches = ['Cotton for shirts', 'Linen under ₹300', 'Denim for jackets']

export function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<MarketplaceSuggestProduct[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)

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

  const goSearch = (value?: string) => {
    const q = (value ?? query).trim()
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
  }

  return (
    <Container>
      <div className="w-full max-w-3xl mx-auto min-w-0" ref={rootRef}>
        <div className="relative min-w-0">
          <div className="bg-white rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.15)] p-1">
            <div className="flex items-center gap-1 min-w-0">
              <div className="flex-1 relative flex items-center min-w-0">
                <Search className="absolute left-3.5 sm:left-4 text-gray-400 pointer-events-none" size={17} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (e.target.value.trim().length >= 2) setOpen(true)
                  }}
                  onFocus={() => {
                    if (query.trim().length >= 2 || products.length) setOpen(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goSearch()
                  }}
                  placeholder="Search fabrics..."
                  className={`w-full min-w-0 pl-10 sm:pl-11 py-2.5 sm:py-3 bg-transparent rounded-full focus:outline-none text-sm text-gray-800 placeholder:text-gray-400 ${
                    query.length > 0 ? 'pr-10' : 'pr-2'
                  }`}
                />
                {query.length > 0 && (
                  <button
                    type="button"
                    onClick={clearQuery}
                    className="absolute right-2 w-8 h-8 inline-flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => goSearch()}
                className="btn-pill-black shrink-0 h-10 w-10 sm:h-auto sm:w-auto sm:px-5 sm:py-3 text-sm rounded-full"
                aria-label="Search"
              >
                <Search size={15} className="sm:hidden" />
                <span className="hidden sm:inline-flex items-center gap-2">
                  <Search size={14} />
                  Search
                </span>
              </button>
            </div>
          </div>

          {open && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50 max-h-[min(24rem,50dvh)] overflow-y-auto">
              <button
                type="button"
                onClick={() => goSearch(query)}
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
                <div className="py-1">
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

        <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 justify-start sm:justify-center pr-14 sm:pr-0">
          <span className="text-[11px] sm:text-xs text-white/80 shrink-0">Popular:</span>
          {popularSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => goSearch(term)}
              className="text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/15 text-white border border-white/25 backdrop-blur-sm hover:bg-white/25 transition-colors whitespace-nowrap"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </Container>
  )
}
