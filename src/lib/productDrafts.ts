export const MAX_PRODUCT_NAME = 100
export const MAX_SHORT_DESCRIPTION = 500
export const MAX_COLORS = 10
export const MAX_IMAGES_PER_COLOR = 5

export const PRODUCT_CATEGORIES = ['Cotton', 'Linen', 'Silk', 'Denim', 'Synthetic'] as const
export const PRODUCT_UNITS = [
  { value: 'meter', label: 'Meter (m)' },
  { value: 'yard', label: 'Yard (yd)' },
  { value: 'kg', label: 'Kilogram (kg)' },
] as const

export type ProductVariantDraft = {
  id: string
  colorHex: string
  images: string[]
}

export type ProductFormDraft = {
  id: string
  status: 'draft' | 'published'
  createdAt?: string
  updatedAt: string
  step: 1 | 2 | 3
  name: string
  category: string
  shortDescription: string
  price: string
  moq: string
  availableQuantity: string
  gsm: string
  width: string
  unit: string
  variants: ProductVariantDraft[]
}

export type ApiProductVariant = {
  _id?: string
  colorHex: string
  images: string[]
}

export type ApiProduct = {
  _id: string
  sellerId: string
  categoryId?: string | null
  category: string
  name: string
  description: string
  price: number | null
  gsm: number | null
  width: number | null
  moq: number | null
  availableQuantity: number | null
  unit: string
  variants: ApiProductVariant[]
  status: 'draft' | 'published'
  step: 1 | 2 | 3
  createdAt?: string
  updatedAt?: string
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export function isServerProductId(id?: string | null) {
  return Boolean(id && /^[a-f\d]{24}$/i.test(id))
}

export function createEmptyVariant(): ProductVariantDraft {
  return {
    id: createId(),
    colorHex: '',
    images: [],
  }
}

export function createEmptyProductDraft(partial?: Partial<ProductFormDraft>): ProductFormDraft {
  return {
    id: createId(),
    status: 'draft',
    updatedAt: new Date().toISOString(),
    step: 1,
    name: '',
    category: '',
    shortDescription: '',
    price: '',
    moq: '',
    availableQuantity: '',
    gsm: '',
    width: '',
    unit: 'meter',
    variants: [createEmptyVariant()],
    ...partial,
  }
}

export function hasDraftContent(draft: ProductFormDraft) {
  return Boolean(
    draft.name.trim() ||
      draft.category ||
      draft.shortDescription.trim() ||
      draft.price ||
      draft.moq ||
      draft.availableQuantity ||
      draft.gsm ||
      draft.width ||
      draft.variants.some((variant) => variant.images.length > 0 || variant.colorHex),
  )
}

export function apiProductToForm(product: ApiProduct): ProductFormDraft {
  const variants =
    product.variants?.length > 0
      ? product.variants.map((variant) => ({
          id: variant._id || createId(),
          colorHex: variant.colorHex || '',
          images: variant.images || [],
        }))
      : [createEmptyVariant()]

  return {
    id: product._id,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt || new Date().toISOString(),
    step: (product.step as 1 | 2 | 3) || 1,
    name: product.name || '',
    category: product.category || '',
    shortDescription: product.description || '',
    price: product.price != null ? String(product.price) : '',
    moq: product.moq != null ? String(product.moq) : '',
    availableQuantity:
      product.availableQuantity != null ? String(product.availableQuantity) : '',
    gsm: product.gsm != null ? String(product.gsm) : '',
    width: product.width != null ? String(product.width) : '',
    unit: product.unit || 'meter',
    variants,
  }
}

export function formToApiPayload(form: ProductFormDraft, status: 'draft' | 'published') {
  return {
    status,
    step: form.step,
    name: form.name,
    category: form.category,
    description: form.shortDescription,
    price: form.price,
    moq: form.moq,
    availableQuantity: form.availableQuantity,
    gsm: form.gsm,
    width: form.width,
    unit: form.unit,
    variants: form.variants.map((variant) => ({
      ...(isServerProductId(variant.id) ? { _id: variant.id } : {}),
      colorHex: variant.colorHex,
      images: variant.images,
    })),
  }
}
