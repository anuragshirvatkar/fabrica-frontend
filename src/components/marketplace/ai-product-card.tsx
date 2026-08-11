import { Link } from 'react-router-dom'
import type { FabricProduct } from '../../data/marketplace-products'
import { Heart, ShoppingBag } from 'lucide-react'

type AiProductCardProps = {
  product: FabricProduct
}

export function AiProductCard({ product }: AiProductCardProps) {
  return (
    <article className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
        <button
          type="button"
          className="absolute top-2.5 right-2.5 z-20 p-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
          aria-label="Add to wishlist"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          <Heart size={20} strokeWidth={1.75} className="fill-transparent text-white" />
        </button>
        <span className="absolute bottom-2.5 left-2.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-gray-800 backdrop-blur-sm">
          {product.category}
        </span>
      </div>

      <div className="p-3.5">
        <h3 className="font-semibold text-black text-sm mb-1 leading-snug">{product.name}</h3>
        <p className="text-xs text-gray-500 mb-2.5">
          {product.composition} &bull; {product.gsm} &bull; {product.width} Width
        </p>
        <p className="text-base font-semibold text-black mb-3">
          ₹{product.price}
          <span className="text-xs font-normal text-gray-500"> /meter</span>
        </p>

        <div className="flex items-center gap-2">
          <Link
            to={`/marketplace/${product.id}`}
            className="flex-1 text-center text-sm font-medium py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            View Details
          </Link>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Add to cart"
          >
            <ShoppingBag size={16} className="text-gray-700" />
          </button>
        </div>
      </div>
    </article>
  )
}
