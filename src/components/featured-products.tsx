import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Container } from './container'
import { ProductCard } from './marketplace/product-card'
import { fetchMarketplaceProducts } from '../lib/api'
import { toFabricProduct } from '../lib/marketplaceAdapter'
import type { FabricProduct } from '../data/marketplace-products'

/** Pick featured mix: 1 linen, 2 cotton, 1 silk. */
function pickFeatured(products: FabricProduct[]) {
  const byCategory = (name: string) =>
    products.filter((p) => p.category.toLowerCase() === name.toLowerCase())

  const selected: FabricProduct[] = []
  const pushUnique = (item?: FabricProduct) => {
    if (!item) return
    if (selected.some((s) => s.id === item.id)) return
    selected.push(item)
  }

  const linen = byCategory('Linen')
  const cotton = byCategory('Cotton')
  const silk = byCategory('Silk')

  pushUnique(linen[0])
  pushUnique(cotton[0])
  pushUnique(cotton[1])
  pushUnique(silk[0])

  if (selected.length < 4) {
    for (const item of products) {
      if (selected.length >= 4) break
      pushUnique(item)
    }
  }

  return selected.slice(0, 4)
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<FabricProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [linen, cotton, silk] = await Promise.all([
          fetchMarketplaceProducts({ category: 'Linen' }),
          fetchMarketplaceProducts({ category: 'Cotton' }),
          fetchMarketplaceProducts({ category: 'Silk' }),
        ])
        if (cancelled) return
        const combined = [
          ...linen.products.map(toFabricProduct),
          ...cotton.products.map(toFabricProduct),
          ...silk.products.map(toFabricProduct),
        ]
        setProducts(pickFeatured(combined))
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="w-full pt-6 md:pt-8 pb-12 md:pb-16 bg-[var(--color-canvas)]">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-serif font-semibold text-black leading-tight">
              Featured Products
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-md">
              A curated mix from the live catalog.
            </p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-black transition-colors"
          >
            Browse marketplace
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-100 bg-white aspect-[3/4] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} variant="featured" />
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
