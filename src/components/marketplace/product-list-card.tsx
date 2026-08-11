import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Heart } from 'lucide-react'
import type { FabricProduct } from '../../data/marketplace-products'
import { SignInContinueModal } from '../auth/SignInContinueModal'
import { ListRecordCard } from '../ui/ListRecordCard'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../lib/api'
import { ForYouBadge } from './for-you-badge'
import { formatNumber } from '../../lib/format'

export function ProductListCard({
  product,
  initialFavorited = false,
  showMatchedTag = false,
}: {
  product: FabricProduct
  initialFavorited?: boolean
  showMatchedTag?: boolean
}) {
  const { user, getAccessToken } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [favorited, setFavorited] = useState(initialFavorited)
  const [saving, setSaving] = useState(false)
  const matchedTag = showMatchedTag && user?.role === 'BUYER' && product.forYou

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
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ListRecordCard
        to={`/marketplace/${product.id}`}
        image={product.image}
        imageAlt={product.name}
        imageBadge={
          <>
            {matchedTag ? (
              <ForYouBadge
                reason={product.forYouReason}
                className="absolute top-1.5 left-1.5 z-10 hidden sm:inline-flex scale-90 origin-top-left"
              />
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={toggleFavorite}
              className="absolute top-1.5 right-1.5 z-20 p-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
              aria-label={favorited ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                size={16}
                strokeWidth={1.75}
                className={
                  favorited ? 'fill-white text-white' : 'fill-transparent text-white'
                }
              />
            </button>
          </>
        }
        aside={
          <>
            <div className="min-w-0 sm:text-right">
              <p className="font-semibold text-black text-base sm:text-lg md:text-xl leading-none">
                ₹{formatNumber(product.price)}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                per {product.weave || 'meter'}
                <span className="sm:hidden">
                  {' '}
                  · {product.inStock ? 'In stock' : 'Made to order'}
                </span>
              </p>
              <p className="hidden sm:block text-xs text-gray-500 mt-1">
                {product.inStock ? 'In stock' : 'Made to order'}
              </p>
            </div>
            <Link
              to={`/marketplace/${product.id}`}
              className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-md bg-black text-white text-xs font-medium hover:bg-gray-800 shrink-0"
            >
              View
              <ArrowRight size={13} />
            </Link>
          </>
        }
      >
        <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
          <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-gray-400">
            {product.category}
          </p>
          {matchedTag ? (
            <span className="sm:hidden text-[9px] font-semibold tracking-wide text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded-full">
              For you
            </span>
          ) : null}
        </div>
        <h3 className="font-serif text-sm sm:text-lg md:text-xl font-semibold text-black leading-snug line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {product.gsm} · {product.width} width · MOQ {formatNumber(product.moq)}m
        </p>
        <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2.5">
          {product.colors.slice(0, 5).map((color) => (
            <span
              key={color}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-gray-200"
              style={{ backgroundColor: color }}
            />
          ))}
          {product.extraColors ? (
            <span className="text-[11px] text-gray-400 ml-0.5">+{product.extraColors}</span>
          ) : null}
        </div>
      </ListRecordCard>
      <SignInContinueModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
