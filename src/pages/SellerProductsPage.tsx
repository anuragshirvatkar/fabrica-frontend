import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { deleteSellerProduct, fetchSellerProducts } from '../lib/api'
import { formatNumber } from '../lib/format'
import { apiProductToForm, type ProductFormDraft } from '../lib/productDrafts'

function productDateKey(product: ProductFormDraft) {
  const raw = product.createdAt || product.updatedAt
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function SellerProductsPage() {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [products, setProducts] = useState<ProductFormDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await fetchSellerProducts(token, 'published')
      setProducts(result.products.map(apiProductToForm))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [getAccessToken])

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((product) => {
      const key = productDateKey(product)
      if (dateFrom && key && key < dateFrom) return false
      if (dateTo && key && key > dateTo) return false
      if ((dateFrom || dateTo) && !key) return false
      if (!q) return true

      return (
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.shortDescription.toLowerCase().includes(q) ||
        product.gsm.toLowerCase().includes(q) ||
        product.unit.toLowerCase().includes(q)
      )
    })
  }, [products, query, dateFrom, dateTo])

  const hasFilters = Boolean(query.trim() || dateFrom || dateTo)

  const clearFilters = () => {
    setQuery('')
    setDateFrom('')
    setDateTo('')
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')
      await deleteSellerProduct(token, deleteId)
      setDeleteId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SellerShell>
      <main className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-[34px] font-semibold text-black mb-1">
              Products
            </h1>
            <p className="text-sm text-gray-500">
              Manage your fabric listings and publish new products.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/seller/products/new')}
            className="btn-pill-black px-5 py-2.5 text-sm rounded-lg self-start sm:self-auto"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="flex-1 flex items-center h-11 rounded-full border border-gray-200 bg-[#f5f3ef] overflow-hidden focus-within:border-gray-400 focus-within:bg-white transition-colors">
            <div className="pl-3.5 pr-2 text-gray-400 shrink-0">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, category, GSM…"
              className="flex-1 min-w-0 h-full bg-transparent focus:outline-none text-sm text-gray-800 placeholder:text-gray-400"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="shrink-0 w-9 h-9 mr-1 inline-flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200/80 hover:text-black transition-colors"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 h-11 px-3.5 rounded-full border border-gray-200 bg-[#f5f3ef] focus-within:border-gray-400 focus-within:bg-white transition-colors">
              <Calendar size={15} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 shrink-0">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-w-0 bg-transparent focus:outline-none text-sm text-gray-800"
              />
            </label>
            <label className="flex items-center gap-2 h-11 px-3.5 rounded-full border border-gray-200 bg-[#f5f3ef] focus-within:border-gray-400 focus-within:bg-white transition-colors">
              <Calendar size={15} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 shrink-0">To</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-w-0 bg-transparent focus:outline-none text-sm text-gray-800"
              />
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-[#f5f3ef] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {loading ? (
          <PageLoader label="Loading products" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Start by adding your first fabric listing. You can save drafts and publish when ready."
            actionLabel="Add Product"
            onAction={() => navigate('/seller/products/new')}
          />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching products"
            description="Try a different search or date range."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredProducts.map((product) => {
              const cover =
                product.variants.find((variant) => variant.images.length > 0)?.images[0] || null
              const colors = product.variants.map((v) => v.colorHex).filter(Boolean)
              const inStock = Number(product.availableQuantity) > 0
              const unit = product.unit || 'meter'

              return (
                <article
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group h-full flex flex-col"
                >
                  <div className="relative aspect-[5/4] overflow-hidden bg-gray-100">
                    {cover ? (
                      <img
                        src={cover}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package size={28} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/seller/products/${product.id}/edit`)}
                        className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm text-gray-700"
                        aria-label="Edit product"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(product.id)}
                        className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm text-gray-600 hover:text-red-600"
                        aria-label="Delete product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-semibold text-black text-[13px] mb-1 leading-snug line-clamp-2">
                      {product.name || 'Untitled product'}
                    </h3>
                    <p className="text-[11px] text-gray-500 mb-2 line-clamp-1">
                      {product.gsm ? `${product.gsm} GSM` : '—'}
                      {product.width ? ` · ${product.width} in` : ''}
                      {product.category ? ` · ${product.category}` : ''}
                    </p>

                    <p className="text-base font-semibold text-black mb-2">
                      {product.price ? `₹${formatNumber(product.price)}` : '—'}{' '}
                      <span className="text-[11px] font-normal text-gray-500">/ {unit}</span>
                    </p>

                    <div className="flex items-center gap-1 mb-2.5">
                      {colors.slice(0, 3).map((color) => (
                        <span
                          key={color}
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      {colors.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{colors.length - 3}</span>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-500 mb-2 line-clamp-1 mt-auto">
                      MOQ {product.moq || '—'} {product.moq ? unit : ''} &bull;{' '}
                      <span className={inStock ? 'text-emerald-600' : 'text-amber-600'}>
                        {inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        
      </main>

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => {
          if (!deleting) setDeleteId(null)
        }}
        onConfirm={() => {
          void confirmDelete()
        }}
        title="Delete product?"
        message="This will permanently remove the product and its images from your store."
        confirmLabel="Delete Product"
        loading={deleting}
        irreversible
      />
    </SellerShell>
  )
}
