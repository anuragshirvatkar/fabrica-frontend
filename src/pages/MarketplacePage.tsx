import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, MessageSquareText, PackageOpen, SlidersHorizontal, X } from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { ThemedSelect } from '../components/ui/ThemedSelect'
import {
  emptyMarketplaceFilters,
  FilterSidebar,
  type MarketplaceFilterState,
} from '../components/marketplace/filter-sidebar'
import { ProductCard } from '../components/marketplace/product-card'
import { ProductListCard } from '../components/marketplace/product-list-card'
import { AiAssistantPanel } from '../components/marketplace/ai-assistant-panel'
import { AiInlineFilters } from '../components/marketplace/ai-inline-filters'
import {
  fetchMarketplaceFacets,
  fetchMarketplaceProducts,
  postAiSearch,
  type AiNlFilters,
  type MarketplaceFacets,
} from '../lib/api'
import { toFabricProduct } from '../lib/marketplaceAdapter'
import type { FabricProduct } from '../data/marketplace-products'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { ConnectionErrorState } from '../components/ui/ConnectionErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../context/AuthContext'
import { getFriendlyErrorMessage, isConnectionError } from '../lib/errors'

const DEFAULT_AI_QUERY = 'breathable linen fabric for summer shirts'

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'moq-asc', label: 'MOQ: Low to High' },
  { value: 'name-asc', label: 'Name: A to Z' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

function parseSort(value: string | null): SortValue {
  if (SORT_OPTIONS.some((option) => option.value === value)) {
    return value as SortValue
  }
  return 'relevance'
}

function sortProducts(products: FabricProduct[], sort: SortValue) {
  if (sort === 'relevance') return products

  const next = [...products]
  next.sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price
    if (sort === 'price-desc') return b.price - a.price
    if (sort === 'moq-asc') return a.moq - b.moq
    if (sort === 'name-asc') return a.name.localeCompare(b.name)
    return 0
  })
  return next
}

function filtersFromParams(params: URLSearchParams): MarketplaceFilterState {
  return {
    categories: params.get('category')
      ? params.get('category')!.split(',').filter(Boolean)
      : params.get('categories')?.split(',').filter(Boolean) || [],
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    gsm: params.get('gsm')?.split(',').filter(Boolean) || [],
    moqRanges: params.get('moqRanges')?.split(',').filter(Boolean) || [],
  }
}

function writeFiltersToParams(
  base: URLSearchParams,
  filters: MarketplaceFilterState,
  extras?: { q?: string; ai?: boolean; view?: 'grid' | 'list'; sort?: SortValue },
) {
  const next = new URLSearchParams()
  const q = extras?.q ?? base.get('q') ?? ''
  if (q) next.set('q', q)
  if (extras?.ai || base.get('ai') === 'true') next.set('ai', 'true')

  const view = extras?.view ?? (base.get('view') === 'list' ? 'list' : 'grid')
  if (view === 'list') next.set('view', 'list')

  const sort = extras?.sort ?? parseSort(base.get('sort'))
  if (sort !== 'relevance') next.set('sort', sort)

  if (filters.categories.length) next.set('category', filters.categories.join(','))
  if (filters.minPrice) next.set('minPrice', filters.minPrice)
  if (filters.maxPrice) next.set('maxPrice', filters.maxPrice)
  if (filters.gsm.length) next.set('gsm', filters.gsm.join(','))
  if (filters.moqRanges.length) next.set('moqRanges', filters.moqRanges.join(','))
  return next
}

function hasActiveFilters(filters: MarketplaceFilterState) {
  return Boolean(
    filters.categories.length ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.gsm.length ||
      filters.moqRanges.length,
  )
}

function parseGsmValue(gsm: string) {
  const match = String(gsm || '').match(/(\d+(\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function matchesGsmBucket(gsm: number, bucket: string) {
  if (bucket === '0-150' || bucket === 'upto150') return gsm <= 150
  if (bucket === '150-250') return gsm > 150 && gsm <= 250
  if (bucket === '250-350') return gsm > 250 && gsm <= 350
  if (bucket === '350+' || bucket === '350-plus') return gsm > 350
  return false
}

function matchesMoqBucket(moq: number, bucket: string) {
  if (bucket === '1-50') return moq >= 1 && moq <= 50
  if (bucket === '51-100') return moq >= 51 && moq <= 100
  if (bucket === '101-250') return moq >= 101 && moq <= 250
  if (bucket === '251+') return moq >= 251
  return false
}

/** Apply sidebar filters on top of AI-ranked search results. */
function applySidebarFilters(products: FabricProduct[], filters: MarketplaceFilterState) {
  if (!hasActiveFilters(filters)) return products

  return products.filter((product) => {
    if (
      filters.categories.length &&
      !filters.categories.some(
        (category) => category.toLowerCase() === product.category.toLowerCase(),
      )
    ) {
      return false
    }

    if (filters.minPrice && product.price < Number(filters.minPrice)) return false
    if (filters.maxPrice && product.price > Number(filters.maxPrice)) return false

    if (filters.gsm.length) {
      const gsm = parseGsmValue(product.gsm)
      if (gsm == null || !filters.gsm.some((bucket) => matchesGsmBucket(gsm, bucket))) {
        return false
      }
    }

    if (
      filters.moqRanges.length &&
      !filters.moqRanges.some((bucket) => matchesMoqBucket(product.moq, bucket))
    ) {
      return false
    }

    return true
  })
}

export function MarketplacePage() {
  const { getAccessToken, user, buyerSetupCompleted, sellerSetupCompleted, loading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKey = searchParams.toString()
  const aiMode = searchParams.get('ai') === 'true'
  const query = searchParams.get('q') ?? (aiMode ? DEFAULT_AI_QUERY : '')
  const viewMode = searchParams.get('view') === 'list' ? 'list' : 'grid'
  const sortMode = parseSort(searchParams.get('sort'))
  const filters = useMemo(
    () => filtersFromParams(new URLSearchParams(searchKey)),
    [searchKey],
  )
  const buyerKey = user?.role === 'BUYER' ? user._id : 'guest'

  const [products, setProducts] = useState<FabricProduct[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiFilters, setAiFilters] = useState<AiNlFilters | null>(null)
  const [facets, setFacets] = useState<MarketplaceFacets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectionError, setConnectionError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const activeFilterCount =
    filters.categories.length +
    filters.gsm.length +
    filters.moqRanges.length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0)

  useEffect(() => {
    if (!filtersOpen && !aiPanelOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [filtersOpen, aiPanelOpen])

  useEffect(() => {
    let cancelled = false
    void fetchMarketplaceFacets({
      q: query.trim() || undefined,
      categories: filters.categories,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      gsm: filters.gsm,
      moqRanges: filters.moqRanges,
    })
      .then((result) => {
        if (!cancelled) setFacets(result.facets)
      })
      .catch(() => {
        if (!cancelled) setFacets(null)
      })
    return () => {
      cancelled = true
    }
  }, [query, filters])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      setConnectionError(false)
      try {
        const token = (await getAccessToken()) || null

        if (aiMode) {
          const result = await postAiSearch(query || DEFAULT_AI_QUERY, token)
          if (cancelled) return
          setProducts(result.products.map(toFabricProduct))
          setAiSummary(result.summary || '')
          setAiFilters(result.filters || null)
          return
        }

        // Search-bar queries use the AI ranking layer silently (normal marketplace UI).
        if (query.trim()) {
          try {
            const result = await postAiSearch(query.trim(), token, { silent: true })
            if (cancelled) return
            const ranked = applySidebarFilters(
              result.products.map(toFabricProduct),
              filters,
            )
            setProducts(ranked)
            setAiSummary('')
            setAiFilters(null)
            return
          } catch (aiErr) {
            // Fall through to classic marketplace search if AI is unavailable,
            // but keep true connection failures visible.
            if (isConnectionError(aiErr)) throw aiErr
          }
        }

        const result = await fetchMarketplaceProducts(
          {
            q: query || undefined,
            categories: filters.categories,
            minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
            maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
            gsm: filters.gsm,
            moqRanges: filters.moqRanges,
          },
          token,
        )
        if (cancelled) return
        setProducts(result.products.map(toFabricProduct))
        setAiSummary('')
        setAiFilters(null)
      } catch (err) {
        if (cancelled) return
        setConnectionError(isConnectionError(err))
        setError(getFriendlyErrorMessage(err, 'Failed to load products'))
        setProducts([])
        setAiSummary('')
        setAiFilters(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [searchKey, query, filters, aiMode, buyerKey, getAccessToken, reloadToken])

  const retryLoad = () => setReloadToken((value) => value + 1)

  const errorView = connectionError ? (
    <ConnectionErrorState onRetry={retryLoad} />
  ) : (
    <EmptyState
      title="Couldn't load fabrics"
      description={error || 'Something went wrong while loading the marketplace.'}
      actionLabel="Try again"
      onAction={retryLoad}
    />
  )

  const displayProducts = useMemo(
    () => sortProducts(products, sortMode),
    [products, sortMode],
  )

  const updateFilters = useCallback(
    (nextFilters: MarketplaceFilterState) => {
      setSearchParams(writeFiltersToParams(searchParams, nextFilters), { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const clearFilters = useCallback(() => {
    setSearchParams(writeFiltersToParams(searchParams, emptyMarketplaceFilters()), {
      replace: true,
    })
  }, [searchParams, setSearchParams])

  const setView = (view: 'grid' | 'list') => {
    setSearchParams(writeFiltersToParams(searchParams, filters, { view }), { replace: true })
  }

  const setSort = (sort: SortValue) => {
    setSearchParams(writeFiltersToParams(searchParams, filters, { sort }), { replace: true })
  }

  const exitAiMode = () => {
    const next = writeFiltersToParams(searchParams, filters)
    next.delete('ai')
    setSearchParams(next, { replace: true })
  }

  if (!authLoading && user?.role === 'SELLER' && !sellerSetupCompleted) {
    return <Navigate to="/seller/setup" replace />
  }

  if (!authLoading && user?.role === 'BUYER' && !buyerSetupCompleted) {
    return <Navigate to="/buyer/setup" replace />
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white">
      <Navbar variant="solid" showActions showSearch searchQuery={query} />

      {aiMode ? (
        <div className="flex flex-1 min-h-0 pt-[7.25rem] md:pt-[72px]">
          <main className="flex-1 min-h-0 flex flex-col min-w-0 bg-[#f9f9f9]">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-main">
              <div className="min-h-[calc(100%+18rem)] flex flex-col">
                <Container className="flex-1 py-5 md:py-6 pb-36 md:pb-52">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                    <div className="min-w-0">
                      <h1 className="text-2xl md:text-3xl font-serif font-semibold text-black mb-1">
                        AI Search Results
                      </h1>
                      <p className="text-sm text-gray-500 truncate">
                        Showing results for &lsquo;{query || DEFAULT_AI_QUERY}&rsquo;
                      </p>
                      {aiSummary ? (
                        <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
                          {aiSummary}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => setAiPanelOpen(true)}
                        className="lg:hidden inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-black"
                      >
                        <MessageSquareText size={15} />
                        Ask AI
                      </button>
                      <button
                        type="button"
                        onClick={exitAiMode}
                        className="text-sm font-medium text-gray-600 hover:text-black"
                      >
                        Exit AI
                      </button>
                    </div>
                  </div>

                  <AiInlineFilters filters={aiFilters} />

                  {loading ? (
                    <PageLoader label="Finding matching fabrics" />
                  ) : error ? (
                    errorView
                  ) : displayProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                      <PackageOpen size={28} className="text-gray-500 mb-4" />
                      <h2 className="font-serif text-2xl font-semibold text-black mb-2">
                        No matching fabrics
                      </h2>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Nothing in the published catalog matched that request. Try a broader query.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                      {displayProducts.map((product) => (
                        <ProductCard key={product.id} product={product} showMatchedTag />
                      ))}
                    </div>
                  )}
                </Container>
                <Footer />
              </div>
            </div>
          </main>
          <aside className="hidden lg:flex w-80 xl:w-96 flex-shrink-0 min-h-0 self-stretch">
            <AiAssistantPanel onClose={exitAiMode} initialSummary={aiSummary} />
          </aside>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 pt-[7.25rem] md:pt-[72px]">
          <aside className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 self-stretch flex-col border-r border-gray-100 bg-white min-h-0">
            <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-filter p-5 xl:p-6">
              <FilterSidebar
                facets={facets}
                value={filters}
                onChange={updateFilters}
                onClear={clearFilters}
              />
            </div>
          </aside>

          <main className="flex-1 min-h-0 flex flex-col min-w-0 bg-[#f9f9f9]">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-main">
              <div className="min-h-[calc(100%+18rem)] flex flex-col">
                <div className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 py-5 md:py-6 pb-36 md:pb-52">
                  <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                    <PageBackLink to="/" label="Back to home" className="mb-0" />
                    <div className="flex flex-wrap items-center justify-end gap-1.5 w-full sm:w-auto ml-auto">
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(true)}
                        className="lg:hidden inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-black"
                      >
                        <SlidersHorizontal size={15} />
                        Filters
                        {activeFilterCount > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-black text-white text-[11px] font-semibold inline-flex items-center justify-center">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                      <div className="w-auto min-w-0">
                        <ThemedSelect
                          id="marketplace-sort"
                          value={sortMode}
                          options={[...SORT_OPTIONS]}
                          onChange={(value) => setSort(parseSort(value))}
                          placeholder="Relevance"
                          size="sm"
                          fitContent
                        />
                      </div>
                      <div
                        className="inline-flex items-center h-8 rounded-md border border-gray-200 bg-white p-0.5"
                        role="group"
                        aria-label="View mode"
                      >
                        <button
                          type="button"
                          onClick={() => setView('grid')}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                            viewMode === 'grid'
                              ? 'bg-black text-white'
                              : 'text-gray-500 hover:text-black'
                          }`}
                          aria-label="Grid view"
                          aria-pressed={viewMode === 'grid'}
                          title="Grid view"
                        >
                          <LayoutGrid size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setView('list')}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                            viewMode === 'list'
                              ? 'bg-black text-white'
                              : 'text-gray-500 hover:text-black'
                          }`}
                          aria-label="List view"
                          aria-pressed={viewMode === 'list'}
                          title="List view"
                        >
                          <List size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <PageLoader label="Loading products" />
                  ) : error ? (
                    errorView
                  ) : displayProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 md:py-20 px-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#f5f3ef] border border-gray-100 flex items-center justify-center mb-5">
                        <PackageOpen size={28} className="text-gray-500" />
                      </div>
                      <h2 className="font-serif text-2xl font-semibold text-black mb-2">
                        No fabrics found
                      </h2>
                      <p className="text-sm text-gray-500 max-w-sm mb-6">
                        {hasActiveFilters(filters) || query
                          ? 'Nothing matches your current filters or search. Try adjusting them to see more results.'
                          : 'There are no published fabrics in the marketplace yet. Check back soon.'}
                      </p>
                      {(hasActiveFilters(filters) || query) && (
                        <button
                          type="button"
                          onClick={() => {
                            clearFilters()
                            setSearchParams(new URLSearchParams(), { replace: true })
                          }}
                          className="btn-pill-black px-5 py-2.5 text-sm inline-flex items-center gap-2"
                        >
                          <SlidersHorizontal size={15} />
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : viewMode === 'list' ? (
                    <div className="w-full flex flex-col gap-3">
                      {displayProducts.map((product) => (
                        <ProductListCard key={product.id} product={product} showMatchedTag />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                      {displayProducts.map((product) => (
                        <ProductCard key={product.id} product={product} showMatchedTag />
                      ))}
                    </div>
                  )}
                </div>
                <Footer />
              </div>
            </div>
          </main>
        </div>
      )}

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/40"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(20rem,100vw)] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-black">Filters</p>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterSidebar
                facets={facets}
                value={filters}
                showTitle={false}
                onChange={(next) => {
                  updateFilters(next)
                }}
                onClear={() => {
                  clearFilters()
                }}
              />
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="btn-pill-black w-full py-3 text-sm rounded-lg"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}

      {aiPanelOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close AI assistant"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAiPanelOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col">
            <AiAssistantPanel
              onClose={() => setAiPanelOpen(false)}
              initialSummary={aiSummary}
            />
          </div>
        </div>
      )}
    </div>
  )
}
