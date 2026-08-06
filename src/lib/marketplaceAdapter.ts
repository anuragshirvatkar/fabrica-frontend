import type { FabricProduct } from '../data/marketplace-products'

export type MarketplaceApiProduct = {
  _id: string
  name: string
  description: string
  category: string
  price: number | null
  gsm: number | null
  width: number | null
  moq: number | null
  availableQuantity: number | null
  unit: string
  coverImage: string
  colors: string[]
  variants?: Array<{
    _id?: string
    colorHex: string
    images: string[]
  }>
  seller?: {
    _id: string
    companyName: string
    verified: boolean
    description?: string
  } | null
  forYou?: boolean
  forYouReason?: string
}

/** Maps API products into the existing FabricProduct card shape (design unchanged). */
export function toFabricProduct(product: MarketplaceApiProduct): FabricProduct {
  const variants = product.variants || []
  const colors = product.colors?.length
    ? product.colors
    : variants.map((v) => v.colorHex).filter(Boolean)
  const extraColors = colors.length > 3 ? colors.length - 3 : undefined

  return {
    id: product._id,
    name: product.name,
    image: product.coverImage || product.variants.find((v) => v.images[0])?.images[0] || '',
    gsm: product.gsm != null ? `${product.gsm} GSM` : '—',
    width: product.width != null ? `${product.width}"` : '—',
    composition: product.category || 'Fabric',
    price: Number(product.price) || 0,
    colors: colors.slice(0, 3),
    colorNames: colors.map((hex) => hex),
    extraColors,
    supplier: product.seller?.companyName || 'Fabrica Seller',
    rating: 4.8,
    orders: 0,
    location: 'India',
    moq: Number(product.moq) || 1,
    inStock: (product.availableQuantity ?? 0) > 0,
    category: product.category || 'Fabric',
    description: product.description || '',
    reviews: 0,
    weave: product.unit || 'meter',
    defaultColor: colors[0] || '#D4C4B0',
    deliveryDays: '5-7 days',
    badge: product.seller?.verified ? 'Verified Seller' : undefined,
    forYou: Boolean(product.forYou),
    forYouReason: product.forYouReason || '',
    onTimeDelivery: 96,
    features: ['Soft Hand-feel', 'Production Ready', 'Consistent Quality', 'Durable Weave'],
    whyChoose: [
      'Published by verified Fabrica sellers',
      'Color variants with real product images',
      'Clear MOQ and stock availability',
      'Secure checkout and order tracking',
    ],
  }
}
