import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Heart,
  Maximize2,
  Layers,
  Shirt,
  ShoppingCart,
  Wind,
  Shield,
  Droplets,
  Scissors,
  Leaf,
  Check,
  Info,
  Pencil,
  Trash2,
  Loader2,
  MessageCircle,
  ArrowLeftRight,
  Tag,
  Grid3x3,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { SignInContinueModal } from '../components/auth/SignInContinueModal'
import { ReviewModal } from '../components/reviews/ReviewModal'
import { StarRating } from '../components/reviews/StarRating'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { QuantityStepper } from '../components/ui/QuantityStepper'
import { useAuth } from '../context/AuthContext'
import {
  addCartItem,
  addFavorite,
  createReview,
  deleteReview,
  fetchCart,
  fetchMarketplaceProduct,
  fetchProductReviews,
  fetchSimilarProducts,
  removeFavorite,
  updateReview,
  type ApiReview,
  type ReviewSummary,
} from '../lib/api'
import type { MarketplaceApiProduct } from '../lib/marketplaceAdapter'
import { toFabricProduct } from '../lib/marketplaceAdapter'
import { ProductCard } from '../components/marketplace/product-card'
import { ProductQaPanel } from '../components/marketplace/product-qa-panel'
import { ProductComparePanel } from '../components/marketplace/product-compare-panel'
import { formatNumber } from '../lib/format'

const tabs = ['Overview', 'Q&A', 'Reviews', 'Find Similar', 'Compare'] as const

/** Static overview copy — pick a variation per product so pages don't look identical. */
const OVERVIEW_VARIATIONS: Array<{
  features: Array<{ lines: [string, string]; icon: LucideIcon }>
  whyChoose: string[]
}> = [
  {
    features: [
      { lines: ['Soft hand-feel', 'and breathable'], icon: Wind },
      { lines: ['Production', 'ready'], icon: Shirt },
      { lines: ['Consistent', 'quality'], icon: Shield },
      { lines: ['Durable', 'weave'], icon: Grid3x3 },
    ],
    whyChoose: [
      'Color variants with real product images',
      'Clear MOQ and stock availability',
      'Secure checkout and order tracking',
      'Consistent quality across batches',
    ],
  },
  {
    features: [
      { lines: ['Breathable', 'finish'], icon: Wind },
      { lines: ['Easy to', 'cut'], icon: Scissors },
      { lines: ['Colorfast', 'dyes'], icon: Droplets },
      { lines: ['Buyer', 'trusted'], icon: Shield },
    ],
    whyChoose: [
      'Ideal for apparel and light garments',
      'Published specs you can source against',
      'Reliable seller fulfillment on Fabrica',
      'Suitable for sampling and bulk orders',
    ],
  },
  {
    features: [
      { lines: ['Natural', 'comfort'], icon: Leaf },
      { lines: ['Clean', 'drape'], icon: Shirt },
      { lines: ['Batch', 'consistency'], icon: Layers },
      { lines: ['Premium', 'finish'], icon: Grid3x3 },
    ],
    whyChoose: [
      'Sourced for professional garment makers',
      'Transparent pricing and unit measures',
      'Multiple colorways when available',
      'Built for repeat wholesale purchases',
    ],
  },
]

const pickOverviewVariation = (productId?: string) => {
  const text = String(productId || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash + text.charCodeAt(i) * (i + 1)) % OVERVIEW_VARIATIONS.length
  }
  return OVERVIEW_VARIATIONS[hash] || OVERVIEW_VARIATIONS[0]
}

const unitSuffix = (unit: string) => {
  if (unit === 'yard') return 'yd'
  if (unit === 'kg') return 'kg'
  return 'm'
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, getAccessToken, buyerSetupCompleted, sellerSetupCompleted, loading: authLoading } = useAuth()

  const [product, setProduct] = useState<MarketplaceApiProduct | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(0)
  const [colorImagesLoading, setColorImagesLoading] = useState(false)
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false)
  const [gstInfoOpen, setGstInfoOpen] = useState(false)
  const gstInfoRef = useRef<HTMLDivElement>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Overview')
  const [actionError, setActionError] = useState('')
  const [adding, setAdding] = useState(false)
  const [cartKeys, setCartKeys] = useState<string[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    averageRating: 0,
    count: 0,
  })
  const [myReview, setMyReview] = useState<ApiReview | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [deleteReviewOpen, setDeleteReviewOpen] = useState(false)
  const [deletingReview, setDeletingReview] = useState(false)
  const [similar, setSimilar] = useState<MarketplaceApiProduct[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  useEffect(() => {
    if (!id) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const token = await getAccessToken()
        const result = await fetchMarketplaceProduct(id, token)
        if (cancelled) return
        setProduct(result.product)
        setFavorited(result.favorited)
        setSelectedVariant(0)
        setQuantity(Number(result.product.moq) || 1)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id, getAccessToken])

  useEffect(() => {
    let cancelled = false
    const loadCart = async () => {
      if (!user || user.role !== 'BUYER') {
        setCartKeys([])
        return
      }
      try {
        const token = await getAccessToken()
        if (!token) {
          setCartKeys([])
          return
        }
        const result = await fetchCart(token)
        if (cancelled) return
        const keys = (result.cart.items || []).map((item) => {
          const productId = String(item.productId ?? (item.product as { _id?: string } | undefined)?._id ?? '')
          const variantId = String(item.variantId ?? '')
          return `${productId}:${variantId}`
        })
        setCartKeys(keys)
      } catch {
        if (!cancelled) setCartKeys([])
      }
    }
    void loadCart()
    return () => {
      cancelled = true
    }
  }, [user, getAccessToken, id])

  const variant = product?.variants?.[selectedVariant] || product?.variants?.[0]
  const thumbnails = useMemo(() => {
    if (!variant?.images?.length) return product?.coverImage ? [product.coverImage] : []
    return variant.images
  }, [variant, product])

  const inCart = useMemo(() => {
    if (!product) return false
    const key = `${product._id}:${variant?._id || ''}`
    return cartKeys.includes(key)
  }, [product, variant, cartKeys])

  useEffect(() => {
    setActiveImage(0)
  }, [selectedVariant])

  useEffect(() => {
    if (!colorImagesLoading) return
    let cancelled = false
    const urls = thumbnails.filter(Boolean)
    if (!urls.length) {
      setColorImagesLoading(false)
      return
    }

    void Promise.all(
      urls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new window.Image()
            img.onload = () => resolve()
            img.onerror = () => resolve()
            img.src = src
          }),
      ),
    ).then(() => {
      if (!cancelled) setColorImagesLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [colorImagesLoading, thumbnails])

  useEffect(() => {
    if (!gstInfoOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!gstInfoRef.current?.contains(event.target as Node)) {
        setGstInfoOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGstInfoOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [gstInfoOpen])

  useEffect(() => {
    if (!imageLightboxOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImageLightboxOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [imageLightboxOpen])

  const handleSelectVariant = (index: number) => {
    if (index === selectedVariant) return
    setColorImagesLoading(true)
    setSelectedVariant(index)
  }

  const loadReviews = async () => {
    if (!id) return
    setReviewsLoading(true)
    try {
      const token = await getAccessToken()
      const result = await fetchProductReviews(id, token || undefined)
      setReviews(result.reviews)
      setReviewSummary(result.summary)
      setMyReview(result.myReview)
    } catch {
      setReviews([])
      setReviewSummary({ averageRating: 0, count: 0 })
      setMyReview(null)
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    if (!id || activeTab !== 'Reviews') return
    void loadReviews()
  }, [id, activeTab, user?._id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const loadSimilar = async () => {
      setSimilarLoading(true)
      try {
        const result = await fetchSimilarProducts(id, 8)
        if (!cancelled) setSimilar(result.products || [])
      } catch {
        if (!cancelled) setSimilar([])
      } finally {
        if (!cancelled) setSimilarLoading(false)
      }
    }
    void loadSimilar()
    return () => {
      cancelled = true
    }
  }, [id])

  if (!authLoading && user?.role === 'SELLER' && !sellerSetupCompleted) {
    return <Navigate to="/seller/setup" replace />
  }

  if (!authLoading && user?.role === 'BUYER' && !buyerSetupCompleted) {
    return <Navigate to="/buyer/setup" replace />
  }

  if (notFound) return <Navigate to="/marketplace" replace />

  if (loading || !product) {
    return (
      <div className="flex-1 flex flex-col bg-[#f9f9f9]">
        <Navbar variant="solid" minimal fixed={false} spacedLogo showActions />
        <Container className="py-16">
          <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-3" />
          <PageLoader label="Loading product" />
        </Container>
      </div>
    )
  }

  const moq = Number(product.moq) || 1
  const price = Number(product.price) || 0
  const stock = product.availableQuantity ?? 0
  const inStock = stock > 0
  const total = price * quantity
  const unit = product.unit || 'meter'
  const overviewCopy = pickOverviewVariation(product._id)
  const features = overviewCopy.features
  const whyChoose = overviewCopy.whyChoose

  const requireAuth = () => {
    if (!user) {
      setAuthOpen(true)
      return false
    }
    return true
  }

  const handleFavorite = async () => {
    if (!requireAuth()) return
    setActionError('')
    try {
      const token = await getAccessToken()
      if (!token) return setAuthOpen(true)
      if (favorited) {
        await removeFavorite(token, product._id)
        setFavorited(false)
      } else {
        await addFavorite(token, product._id)
        setFavorited(true)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update favorites')
    }
  }

  const handleAddToCart = async () => {
    if (inCart) {
      navigate('/cart')
      return
    }
    if (!requireAuth()) return
    if (product.variants?.length && !variant?._id) {
      setActionError('Please select a color before adding to cart.')
      return
    }
    if (quantity < moq) {
      setActionError(`Minimum order quantity is ${moq} ${unitSuffix(unit)}.`)
      return
    }
    if (product.availableQuantity != null && quantity > product.availableQuantity) {
      setActionError(
        product.availableQuantity <= 0
          ? 'This product is out of stock.'
          : `Only ${product.availableQuantity} ${unitSuffix(unit)} available.`,
      )
      return
    }
    setAdding(true)
    setActionError('')
    try {
      const token = await getAccessToken()
      if (!token) {
        setAuthOpen(true)
        return
      }
      await addCartItem(token, {
        productId: product._id,
        variantId: variant?._id,
        quantity,
      })
      setCartKeys((prev) => {
        const key = `${product._id}:${variant?._id || ''}`
        return prev.includes(key) ? prev : [...prev, key]
      })
      navigate('/cart')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f9f9f9]">
      <div className="min-h-[calc(100dvh+14rem)] flex flex-col">
      <Navbar variant="solid" minimal fixed={false} spacedLogo showActions />

      <Container className="flex-1 pt-4 pb-36 md:pb-52">
        <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1.1fr_1fr_280px] gap-6 xl:gap-8 items-start">
          <div className="flex flex-col sm:flex-row gap-3 lg:col-start-1 lg:row-start-1 xl:col-start-1 xl:row-start-1">
            <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
              {thumbnails.map((src, i) => (
                <button
                  key={`${src}_${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImage === i ? 'border-black' : 'border-gray-200'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="relative flex-1 aspect-square max-h-[420px] rounded-xl overflow-hidden bg-gray-100">
              {thumbnails[activeImage] ? (
                <img
                  src={thumbnails[activeImage]}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-opacity duration-200 ${
                    colorImagesLoading ? 'opacity-40' : 'opacity-100'
                  }`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No image
                </div>
              )}
              {colorImagesLoading && (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/55 backdrop-blur-[1px]"
                  role="status"
                  aria-live="polite"
                  aria-label="Loading color images"
                >
                  <Loader2 size={28} className="animate-spin text-gray-700" />
                  <span className="text-xs font-medium text-gray-600">Loading images…</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (thumbnails[activeImage]) setImageLightboxOpen(true)
                }}
                disabled={!thumbnails[activeImage]}
                className="absolute top-3 right-3 z-20 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm border border-gray-100 disabled:opacity-50"
                aria-label="Expand image"
              >
                <Maximize2 size={16} className="text-gray-700" />
              </button>
            </div>

            {thumbnails.length > 1 && (
              <div className="sm:hidden flex gap-2 overflow-x-auto pb-1">
                {thumbnails.map((src, i) => (
                  <button
                    key={`m_${src}_${i}`}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImage === i ? 'border-black' : 'border-gray-200'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2 xl:col-start-2 xl:row-start-1">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-2xl md:text-[28px] font-serif font-semibold text-black leading-tight">
                {product.name}
              </h1>
              <button
                type="button"
                onClick={() => {
                  void handleFavorite()
                }}
                className="w-10 h-10 inline-flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 mt-0.5"
                aria-label="Wishlist"
              >
                <Heart
                  size={20}
                  className={favorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}
                />
              </button>
            </div>

            {product.description ? (
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{product.description}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('Q&A')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-gray-200 bg-white text-gray-800 hover:border-gray-400"
              >
                <MessageCircle size={14} className="text-gray-600 shrink-0" />
                Ask about this fabric
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Compare')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-gray-200 bg-white text-gray-800 hover:border-gray-400"
              >
                <ArrowLeftRight size={14} className="text-gray-600 shrink-0" />
                Compare with another
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 text-sm text-gray-800 mb-3">
              {(
                [
                  product.gsm != null
                    ? { icon: Layers, label: `${product.gsm} GSM` }
                    : null,
                  { icon: Shirt, label: product.category || 'Fabric' },
                  {
                    icon: Tag,
                    label: unit.charAt(0).toUpperCase() + unit.slice(1),
                  },
                ] as Array<{ icon: LucideIcon; label: string } | null>
              )
                .filter((item): item is { icon: LucideIcon; label: string } => Boolean(item))
                .map((item, index) => {
                  const Icon = item.icon
                  return (
                    <span key={item.label} className="inline-flex items-center gap-2">
                      {index > 0 && (
                        <span className="text-gray-300 mr-1" aria-hidden="true">
                          ·
                        </span>
                      )}
                      <span className="w-7 h-7 rounded-full bg-[#ece8e3] inline-flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-[#5c4a3d]" />
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </span>
                  )
                })}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-800 mb-5">
              <span className="w-7 h-7 rounded-full bg-[#ece8e3] inline-flex items-center justify-center shrink-0">
                <Grid3x3 size={14} className="text-[#5c4a3d]" />
              </span>
              <span className="font-medium">
                {formatNumber(stock) || 0} {unitSuffix(unit)} available
              </span>
            </div>

            <div className="border-t border-gray-200 pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                {(product.variants || []).map((entry, i) => (
                  <button
                    key={entry._id || entry.colorHex || i}
                    type="button"
                    onClick={() => handleSelectVariant(i)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedVariant === i
                        ? 'border-black ring-1 ring-black ring-offset-2'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: entry.colorHex || '#ddd' }}
                    aria-label={entry.colorHex || `Color ${i + 1}`}
                    title={entry.colorHex || `Color ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 xl:col-start-3 xl:row-span-1 lg:sticky lg:top-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-2xl md:text-[1.75rem] font-semibold text-black leading-none">
                ₹{formatNumber(price)}
                <span className="text-sm font-normal text-gray-500"> / {unit}</span>
              </p>
              <div className="relative flex items-center gap-1.5 mt-2 mb-5" ref={gstInfoRef}>
                <span className="text-xs text-gray-500">Inclusive of GST</span>
                <button
                  type="button"
                  onClick={() => setGstInfoOpen((open) => !open)}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-[#f5f3ef] transition-colors"
                  aria-label="GST information"
                  aria-expanded={gstInfoOpen}
                >
                  <Info size={13} />
                </button>
                {gstInfoOpen && (
                  <div
                    role="tooltip"
                    className="absolute left-0 top-full mt-2 z-30 w-[min(18rem,calc(100vw-2.5rem))] rounded-xl border border-gray-200 bg-white p-3.5 shadow-xl"
                  >
                    <p className="text-xs font-semibold text-black mb-1">Inclusive of GST</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      The price shown already includes Goods and Services Tax (GST). No extra tax
                      will be added on this item at checkout.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                  <span
                    className={`font-medium ${inStock ? 'text-emerald-700' : 'text-amber-700'}`}
                  >
                    {inStock ? 'In stock' : 'Out of stock'}
                  </span>
                </div>
                <p className="text-gray-500">
                  MOQ{' '}
                  <span className="font-medium text-black">
                    {formatNumber(moq)} {unitSuffix(unit)}
                  </span>
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="product-qty" className="text-sm text-gray-600 block mb-2">
                  Quantity ({unitSuffix(unit)})
                </label>
                <QuantityStepper
                  id="product-qty"
                  value={quantity}
                  min={moq}
                  max={product.availableQuantity}
                  disabled={!inStock && !inCart}
                  onChange={setQuantity}
                />
              </div>

              <div className="flex justify-between items-baseline mb-5">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-xl font-semibold text-black">₹{formatNumber(total)}</span>
              </div>

              {actionError && <p className="text-xs text-red-600 mb-3">{actionError}</p>}

              <button
                type="button"
                disabled={(!inStock && !inCart) || adding}
                onClick={() => {
                  void handleAddToCart()
                }}
                className="btn-pill-black w-full py-3 text-sm mb-3 disabled:opacity-50"
              >
                <ShoppingCart size={17} />
                {inCart ? 'Go to Cart' : adding ? 'Adding...' : 'Add to Cart'}
              </button>

              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                Secure payments · Easy returns · Purchase protection
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-8">
          <div className="flex border-b border-gray-200 mb-6 overflow-x-auto scrollbar-none -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px shrink-0 ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8 xl:gap-12">
              <div>
                <h2 className="text-lg font-serif font-semibold text-black mb-6">
                  Product Overview
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 max-w-xl border border-gray-200 sm:border-0 rounded-xl sm:rounded-none overflow-hidden sm:overflow-visible">
                  {features.map((feature, index) => {
                    const Icon = feature.icon
                    const key = feature.lines.join(' ')
                    return (
                      <div
                        key={key}
                        className={`flex flex-col items-center justify-center text-center px-3 sm:px-5 py-4 sm:py-2 ${
                          index % 2 === 1 ? 'border-l border-gray-200 sm:border-l-0' : ''
                        } ${index >= 2 ? 'border-t border-gray-200 sm:border-t-0' : ''} ${
                          index > 0 ? 'sm:border-l sm:border-gray-200' : ''
                        }`}
                      >
                        <Icon size={22} strokeWidth={1.5} className="text-black mb-2.5" />
                        <span className="text-xs text-gray-700 leading-snug">
                          {feature.lines[0]}
                          <br />
                          {feature.lines[1]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-[#f5f3ef] rounded-xl p-5 h-fit">
                <h2 className="text-lg font-serif font-semibold text-black mb-4">
                  Why Choose This Fabric?
                </h2>
                <ul className="space-y-3">
                  {whyChoose.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'Q&A' && (
            <ProductQaPanel productId={product._id} productName={product.name} />
          )}

          {activeTab === 'Reviews' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-black mb-1">
                    Customer Reviews
                  </h2>
                  {reviewSummary.count > 0 ? (
                    <div className="flex items-center gap-2">
                      <StarRating value={Math.round(reviewSummary.averageRating)} readOnly size={16} />
                      <span className="text-sm text-gray-600">
                        {reviewSummary.averageRating.toFixed(1)} · {reviewSummary.count}{' '}
                        {reviewSummary.count === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No reviews yet.</p>
                  )}
                </div>

                {user?.role === 'BUYER' && myReview && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewError('')
                        setReviewModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-[#f5f3ef]"
                    >
                      <Pencil size={13} />
                      Edit your review
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteReviewOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-red-100 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {user?.role === 'BUYER' && myReview && (
                <div className="rounded-xl border border-gray-200 bg-[#fafafa] p-4 mb-5">
                  <p className="text-xs font-medium text-gray-500 mb-2">Your review</p>
                  <StarRating value={myReview.rating} readOnly size={14} />
                  {myReview.review ? (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{myReview.review}</p>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2 italic">No message</p>
                  )}
                </div>
              )}

              {reviewsLoading ? (
                <p className="text-sm text-gray-500">Loading reviews…</p>
              ) : reviews.filter((item) => !item.isMine).length === 0 ? null : (
                <div className="space-y-4">
                  {reviews
                    .filter((item) => !item.isMine)
                    .map((item) => (
                      <div
                        key={item._id}
                        className="rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <p className="text-sm font-medium text-black">{item.buyerName}</p>
                          <StarRating value={item.rating} readOnly size={14} />
                        </div>
                        {item.review ? (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.review}</p>
                        ) : null}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Find Similar' && (
            <div>
              <h2 className="text-lg font-serif font-semibold text-black mb-1">
                Find Similar
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Same category, close price and GSM from the live catalog.
              </p>
              {similarLoading ? (
                <p className="text-sm text-gray-500">Finding similar fabrics…</p>
              ) : similar.length === 0 ? (
                <p className="text-sm text-gray-500">No similar published fabrics found yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {similar.map((item) => (
                    <ProductCard key={item._id} product={toFabricProduct(item)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Compare' && (
            <ProductComparePanel
              product={product}
              onClose={() => setActiveTab('Overview')}
            />
          )}
        </div>
      </Container>

      <div className="lg:hidden sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-base font-semibold text-black truncate">₹{formatNumber(total)}</p>
          </div>
          <button
            type="button"
            disabled={(!inStock && !inCart) || adding}
            onClick={() => {
              void handleAddToCart()
            }}
            className="btn-pill-black px-5 py-3 text-sm rounded-lg disabled:opacity-50 shrink-0 inline-flex items-center gap-2"
          >
            <ShoppingCart size={16} />
            {inCart ? 'Go to Cart' : adding ? 'Adding…' : 'Add to Cart'}
          </button>
        </div>
      </div>
      </div>

      <Footer />
      <SignInContinueModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <ReviewModal
        open={reviewModalOpen}
        onClose={() => !reviewSaving && setReviewModalOpen(false)}
        productName={product.name}
        initial={myReview}
        saving={reviewSaving}
        error={reviewError}
        onSubmit={async ({ rating, review }) => {
          setReviewSaving(true)
          setReviewError('')
          try {
            const token = await getAccessToken()
            if (!token) {
              setAuthOpen(true)
              return
            }
            if (myReview) {
              await updateReview(token, myReview._id, { rating, review })
            } else if (product) {
              await createReview(token, { productId: product._id, rating, review })
            }
            setReviewModalOpen(false)
            await loadReviews()
          } catch (err) {
            setReviewError(err instanceof Error ? err.message : 'Failed to save review')
          } finally {
            setReviewSaving(false)
          }
        }}
      />

      <ConfirmModal
        open={deleteReviewOpen}
        onClose={() => !deletingReview && setDeleteReviewOpen(false)}
        onConfirm={async () => {
          if (!myReview) return
          setDeletingReview(true)
          try {
            const token = await getAccessToken()
            if (!token) return
            await deleteReview(token, myReview._id)
            setDeleteReviewOpen(false)
            await loadReviews()
          } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete review')
            setDeleteReviewOpen(false)
          } finally {
            setDeletingReview(false)
          }
        }}
        title="Delete this review?"
        message="Your rating and message will be removed. You can write a new review later from a completed order."
        confirmLabel="Delete review"
        loading={deletingReview}
        irreversible
      />

      {imageLightboxOpen && thumbnails[activeImage] && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8">
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
            onClick={() => setImageLightboxOpen(false)}
          />
          <button
            type="button"
            onClick={() => setImageLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={thumbnails[activeImage]}
            alt={product.name}
            className="relative z-[1] max-w-full max-h-[min(88dvh,900px)] w-auto h-auto object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
