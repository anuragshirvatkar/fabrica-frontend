import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Heart } from 'lucide-react'
import type { FabricProduct } from '../../data/marketplace-products'
import { SignInContinueModal } from '../auth/SignInContinueModal'
import { ListRecordCard } from '../ui/ListRecordCard'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../lib/api'
import { formatNumber } from '../../lib/format'

export function ProductListCard({
  product,
  initialFavorited = false,
}: {
  product: FabricProduct
  initialFavorited?: boolean
}) {
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
        aside={
          <>
            <div className="sm:text-right">
              <p className="font-semibold text-black text-lg md:text-xl leading-none">
                ₹{formatNumber(product.price)}
              </p>
              <p className="text-xs text-gray-500 mt-1">per {product.weave || 'meter'}</p>
              <p className="text-xs text-gray-500 mt-1">
                {product.inStock ? 'In stock' : 'Made to order'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={toggleFavorite}
                className="w-9 h-9 rounded-md border border-gray-200 flex items-center justify-center hover:bg-[#f5f3ef] shrink-0"
                aria-label={favorited ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  size={15}
                  className={favorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}
                />
              </button>
              <Link
                to={`/marketplace/${product.id}`}
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
          {product.category}
        </p>
        <h3 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-black leading-snug line-clamp-2">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1.5">
          {product.gsm} · {product.width} width · MOQ {formatNumber(product.moq)}m
        </p>
        <div className="flex items-center gap-1.5 mt-2.5">
          {product.colors.slice(0, 5).map((color) => (
            <span
              key={color}
              className="w-4 h-4 rounded-full border border-gray-200"
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
