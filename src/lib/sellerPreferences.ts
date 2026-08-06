export { INDIAN_STATES } from './indianStates'

export const SELLER_FABRIC_TYPES = ['Cotton', 'Linen', 'Silk', 'Denim', 'Synthetic'] as const

export const SELLER_PRODUCT_CATEGORIES = [
  'Apparel fabrics',
  'Home textiles',
  'Uniforms / workwear',
  'Fashion / premium',
  'Industrial textiles',
  'Export orders',
] as const

export const OPERATING_HOURS = [
  'Mon–Fri, 9 AM – 6 PM',
  'Mon–Sat, 10 AM – 7 PM',
  'All week, 9 AM – 8 PM',
  'By appointment',
  'Other',
] as const

export const SELLER_MOQ_RANGES = [
  'Under 50 m',
  '50 – 100 m',
  '100 – 500 m',
  '500 – 2,000 m',
  '2,000 m+',
] as const

export type SellerAddress = {
  line1: string
  city: string
  state: string
  pincode: string
  country?: string
}

export type SellerSetupInput = {
  companyName: string
  phone: string
  gst: string
  description?: string
  address: SellerAddress
  operatingHours: string
  operatingHoursOther?: string
  productCategories: string[]
  fabricTypes: string[]
  moqRange: string
}

export type SellerProfileData = SellerSetupInput & {
  _id: string
  userId: string
  verified: boolean
  createdAt?: string
  updatedAt?: string
}

export const emptySellerForm = (): SellerSetupInput => ({
  companyName: '',
  phone: '',
  gst: '',
  description: '',
  address: {
    line1: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  },
  operatingHours: '',
  operatingHoursOther: '',
  productCategories: [],
  fabricTypes: [],
  moqRange: '',
})

export function sellerProfileToForm(seller: {
  companyName?: string
  phone?: string
  gst?: string
  description?: string
  address?: Partial<SellerAddress>
  operatingHours?: string
  operatingHoursOther?: string
  productCategories?: string[]
  fabricTypes?: string[]
  moqRange?: string
}): SellerSetupInput {
  return {
    companyName: seller.companyName || '',
    phone: seller.phone || '',
    gst: seller.gst || '',
    description: seller.description || '',
    address: {
      line1: seller.address?.line1 || '',
      city: seller.address?.city || '',
      state: seller.address?.state || '',
      pincode: seller.address?.pincode || '',
      country: seller.address?.country || 'India',
    },
    operatingHours: seller.operatingHours || '',
    operatingHoursOther: seller.operatingHoursOther || '',
    productCategories: seller.productCategories || [],
    fabricTypes: seller.fabricTypes || [],
    moqRange: seller.moqRange || '',
  }
}

/** Matches backend isSellerProfileComplete — used to force onboarding for legacy sellers. */
export function isSellerProfileComplete(
  seller:
    | {
        companyName?: string
        phone?: string
        gst?: string
        address?: Partial<SellerAddress> | null
        operatingHours?: string
        operatingHoursOther?: string
        productCategories?: string[]
        fabricTypes?: string[]
        moqRange?: string
      }
    | null
    | undefined,
): boolean {
  if (!seller) return false
  const address = seller.address || {}
  const hoursOk =
    Boolean(seller.operatingHours) &&
    (seller.operatingHours !== 'Other' || Boolean(String(seller.operatingHoursOther || '').trim()))
  return Boolean(
    seller.companyName &&
      seller.phone &&
      seller.gst &&
      String(address.line1 || '').trim() &&
      String(address.city || '').trim() &&
      String(address.state || '').trim() &&
      String(address.pincode || '').trim() &&
      hoursOk &&
      Array.isArray(seller.productCategories) &&
      seller.productCategories.length > 0 &&
      Array.isArray(seller.fabricTypes) &&
      seller.fabricTypes.length > 0 &&
      seller.moqRange,
  )
}
