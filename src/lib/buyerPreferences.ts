export const BUSINESS_TYPES = [
  'Manufacturer',
  'Wholesaler',
  'Retailer',
  'Designer / Studio',
  'Brand / Label',
  'Trading House',
  'Other',
] as const

export const INDUSTRIES = [
  'Apparel',
  'Home Textiles',
  'Fashion',
  'Uniforms',
  'Soft Furnishings',
  'Industrial',
  'Other',
] as const

export const INTEREST_OPTIONS = [
  'Everyday wear',
  'Premium / luxury',
  'Workwear / uniforms',
  'Home & interiors',
  'Seasonal collections',
  'Private label',
  'Export orders',
] as const

export const FABRIC_PREFERENCES = ['Cotton', 'Linen', 'Silk', 'Denim', 'Synthetic'] as const

export const ORDER_QUANTITY_RANGES = [
  'Under 100 m',
  '100 – 500 m',
  '500 – 2,000 m',
  '2,000 m+',
] as const

export const BUDGET_RANGES = [
  'Under ₹50,000',
  '₹50,000 – ₹2 Lakh',
  '₹2 Lakh – ₹10 Lakh',
  '₹10 Lakh+',
] as const

export type BuyerSetupInput = {
  businessType: string
  businessTypeOther?: string
  industry: string
  industryOther?: string
  interests: string[]
  preferredFabrics: string[]
  typicalOrderQuantity: string
  budgetRange: string
}

export type BuyerProfile = BuyerSetupInput & {
  _id: string
  userId: string
  createdAt?: string
  updatedAt?: string
}

export const emptyBuyerForm = (): BuyerSetupInput => ({
  businessType: '',
  businessTypeOther: '',
  industry: '',
  industryOther: '',
  interests: [],
  preferredFabrics: [],
  typicalOrderQuantity: '',
  budgetRange: '',
})
