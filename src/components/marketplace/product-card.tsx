import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { FabricProduct } from '../../data/marketplace-products'
import { Heart } from 'lucide-react'
import { SignInContinueModal } from '../auth/SignInContinueModal'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../lib/api'
import { ForYouBadge } from './for-you-badge'

type ProductCardProps = {
  product: FabricProduct
  initialFavorited?: boolean
  /** Marketplace-only personalization badge for logged-in buyers */
  showMatchedTag?: boolean
  /**
   * `featured` — landing hierarchy: image → name → price → one key line.
   * `default` — marketplace card with a bit more purchasing detail.
   */
  variant?: 'default' | 'featured'
}

export function ProductCard({
  product,
  initialFavorited = false,
  showMatchedTag = false,
  variant = 'default',
}: ProductCardProps) {
  const { user, getAccessToken } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [favorited, setFavorited] = useState(initialFavorited)
  const [saving, setSaving] = useState(false)
  const matchedTag = showMatchedTag && user?.role === 'BUYER' && product.forYou
  const isFeatured = variant === 'featured'

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
    } catch {
      // Keep previous favorite state if the request fails.
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Link to={`/marketplace/${product.id}`} className="block h-full">
        <article className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group h-full flex flex-col">
          <div className="relative aspect-[5/4] overflow-hidden bg-gray-100">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {matchedTag && (
              <ForYouBadge reason={product.forYouReason} className="absolute top-2 left-2 z-20" />
            )}
            <button
              type="button"
              disabled={saving}
              className="absolute top-2.5 right-2.5 z-20 p-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
              aria-label={favorited ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={toggleFavorite}
            >
              <Heart
                size={20}
                strokeWidth={1.75}
                className={
                  favorited ? 'fill-white text-white' : 'fill-transparent text-white'
                }
              />
            </button>
          </div>

          <div className={`flex flex-col flex-1 ${isFeatured ? 'p-3.5 md:p-4' : 'p-3'}`}>
            <h3
              className={`font-serif font-semibold text-black leading-snug line-clamp-2 ${
                isFeatured ? 'text-[15px] md:text-base' : 'text-sm'
              }`}
            >
              {product.name}
            </h3>

            <p className={`font-semibold text-black ${isFeatured ? 'mt-2 text-base' : 'mt-1.5 text-base'}`}>
              ₹{product.price}{' '}
              <span className="text-[11px] font-normal text-gray-500">/ meter</span>
            </p>

            <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-500 line-clamp-1">
                {isFeatured ? (
                  <>
                    MOQ {product.moq}m
                    <span className="mx-1.5 text-gray-300">·</span>
                    <span className={product.inStock ? 'text-emerald-600' : 'text-amber-600'}>
                      {product.inStock ? 'In stock' : 'Made to order'}
                    </span>
                  </>
                ) : (
                  <>
                    {product.gsm}
                    <span className="mx-1.5 text-gray-300">·</span>
                    MOQ {product.moq}m
                    <span className="mx-1.5 text-gray-300">·</span>
                    <span className={product.inStock ? 'text-emerald-600' : 'text-amber-600'}>
                      {product.inStock ? 'In stock' : 'Made to order'}
                    </span>
                  </>
                )}
              </p>

              {!isFeatured && product.colors.length > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  {product.colors.slice(0, 3).map((color) => (
                    <span
                      key={color}
                      className="w-3.5 h-3.5 rounded-full border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </Link>

      <SignInContinueModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
