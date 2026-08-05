import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { FabricProduct } from '../../data/marketplace-products'
import { Heart, Plus } from 'lucide-react'
import { SignInContinueModal } from '../auth/SignInContinueModal'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../lib/api'

type ProductCardProps = {
  product: FabricProduct
  initialFavorited?: boolean
}

export function ProductCard({ product, initialFavorited = false }: ProductCardProps) {
  const { user, getAccessToken } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [favorited, setFavorited] = useState(initialFavorited)
  const [saving, setSaving] = useState(false)

  const toggleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      setAuthOpen(true)
      return
    }

    setSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setAuthOpen(true)
        return
      }
      if (favorited) {
        await removeFavorite(token, product.id)
        setFavorited(false)
      } else {
        await addFavorite(token, product.id)
        setFavorited(true)
      }
    } catch (error) {
      console.error('[favorite]', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Link to={`/marketplace/${product.id}`} className="block">
        <article className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group h-full">
          <div className="relative aspect-[5/4] overflow-hidden bg-gray-100">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
            <button
              type="button"
              disabled={saving}
              className="absolute top-2 right-2 z-20 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              aria-label={favorited ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={toggleFavorite}
            >
              <Heart
                size={14}
                className={favorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}
              />
            </button>
          </div>

          <div className="p-3">
            <h3 className="font-semibold text-black text-[13px] mb-1 leading-snug line-clamp-2">
              {product.name}
            </h3>
            <p className="text-[11px] text-gray-500 mb-2 line-clamp-1">
              {product.gsm} &bull; {product.width}
            </p>

            <p className="text-base font-semibold text-black mb-2">
              ₹{product.price}{' '}
              <span className="text-[11px] font-normal text-gray-500">/ meter</span>
            </p>

            <div className="flex items-center gap-1 mb-2.5">
              {product.colors.slice(0, 3).map((color) => (
                <span
                  key={color}
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: color }}
                />
              ))}
              {product.extraColors && (
                <span className="text-[10px] text-gray-500">+{product.extraColors}</span>
              )}
            </div>

            <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">
              MOQ {product.moq}m &bull;{' '}
              <span className={product.inStock ? 'text-emerald-600' : 'text-amber-600'}>
                {product.inStock ? 'In Stock' : 'Made to Order'}
              </span>
            </p>

            <div className="flex justify-end">
              <span
                className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center group-hover:bg-black/85 transition-colors"
                aria-hidden="true"
              >
                <Plus size={14} />
              </span>
            </div>
          </div>
        </article>
      </Link>

      <SignInContinueModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
