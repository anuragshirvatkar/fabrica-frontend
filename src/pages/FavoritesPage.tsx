import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Heart, Trash2 } from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { EmptyState } from '../components/ui/EmptyState'
import { ListRecordCard } from '../components/ui/ListRecordCard'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { fetchFavorites, removeFavorite } from '../lib/api'
import { formatNumber } from '../lib/format'
import type { MarketplaceApiProduct } from '../lib/marketplaceAdapter'

export function FavoritesPage() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<MarketplaceApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        navigate('/login')
        return
      }
      const result = await fetchFavorites(token)
      setProducts(result.favorites.products || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-[#f9f9f9]">
      <div className="min-h-[calc(100dvh+14rem)] flex flex-col">
      <Navbar variant="solid" showActions fixed={false} />
      <Container wide className="flex-1 py-8 md:py-10 pb-16 md:pb-20">
        <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-3" />
        <div className="w-full mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-black mb-1">Favorites</h1>
          <p className="text-sm text-gray-500">
            {loading
              ? 'Loading favorites…'
              : products.length === 0
                ? 'Fabrics you saved for later.'
                : `${products.length} saved item${products.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {loading ? (
          <PageLoader label="Loading favorites" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            description="Tap the heart on a product to save it here."
            actionLabel="Browse Marketplace"
            onAction={() => navigate('/marketplace')}
          />
        ) : (
          <div className="w-full flex flex-col gap-3">
            {products.map((product) => (
              <ListRecordCard
                key={product._id}
                to={`/marketplace/${product._id}`}
                image={product.coverImage}
                imageAlt={product.name}
                imageFallback={<Heart size={22} />}
                aside={
                  <>
                    <div className="sm:text-right">
                      <p className="font-semibold text-black text-lg md:text-xl leading-none">
                        ₹{formatNumber(product.price)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">per {product.unit || 'meter'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setDeleteId(product._id)
                        }}
                        className="w-9 h-9 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200"
                        aria-label="Remove from favorites"
                      >
                        <Trash2 size={15} />
                      </button>
                      <Link
                        to={`/marketplace/${product._id}`}
                        className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-black text-white text-xs font-medium hover:bg-gray-800"
                      >
                        View
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </>
                }
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">
                  {product.category || 'Fabric'}
                </p>
                <h3 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-black leading-snug line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1.5">
                  {product.gsm != null ? `${product.gsm} GSM` : '—'}
                  {product.width != null ? ` · ${product.width}" width` : ''}
                  {product.moq != null ? ` · MOQ ${formatNumber(product.moq)}m` : ''}
                </p>
                {product.colors?.length ? (
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {product.colors.slice(0, 5).map((color) => (
                      <span
                        key={color}
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                ) : null}
              </ListRecordCard>
            ))}
          </div>
        )}
      </Container>
      </div>
      <Footer />

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => !deleting && setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return
          setDeleting(true)
          try {
            const token = await getAccessToken()
            if (!token) return
            await removeFavorite(token, deleteId)
            setDeleteId(null)
            await load()
          } finally {
            setDeleting(false)
          }
        }}
        title="Remove from favorites?"
        message="This product will be removed from your saved list."
        confirmLabel="Remove"
        loading={deleting}
        irreversible
      />
    </div>
  )
}
