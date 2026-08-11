import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  ImagePlus,
  Info,
  Lightbulb,
  Pipette,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { ProductStepper } from '../components/seller/ProductStepper'
import {
  ImageColorPicker,
  captureSamplePoint,
  sampleColorAtPoint,
} from '../components/seller/ImageColorPicker'
import { FieldError } from '../components/ui/FieldError'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { SuccessModal } from '../components/ui/SuccessModal'
import { ThemedSelect } from '../components/ui/ThemedSelect'
import { useAuth } from '../context/AuthContext'
import {
  createSellerProduct,
  fetchSellerProduct,
  saveSellerProductDraft,
  updateSellerProduct,
  uploadProductImages,
} from '../lib/api'
import { formatNumber, sanitizeNumberInput, toNumberOrNaN } from '../lib/format'
import {
  MAX_COLORS,
  MAX_IMAGES_PER_COLOR,
  MAX_PRODUCT_NAME,
  MAX_SHORT_DESCRIPTION,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  apiProductToForm,
  createEmptyProductDraft,
  createEmptyVariant,
  formToApiPayload,
  hasDraftContent,
  isServerProductId,
  type ProductFormDraft,
  type ProductVariantDraft,
} from '../lib/productDrafts'

type FieldErrors = Partial<Record<string, string>>

function unitSuffix(unit: string) {
  if (unit === 'yard') return 'yd'
  if (unit === 'kg') return 'kg'
  return 'm'
}

export function AddProductPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { productId: routeProductId } = useParams()
  const draftId = searchParams.get('draft')
  const productId = routeProductId || draftId
  const { getAccessToken } = useAuth()

  const [form, setForm] = useState<ProductFormDraft>(() => createEmptyProductDraft())
  const [errors, setErrors] = useState<FieldErrors>({})
  const [successOpen, setSuccessOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingVariantId, setUploadingVariantId] = useState<string | null>(null)
  const [pickingVariantId, setPickingVariantId] = useState<string | null>(null)
  const [hoverHex, setHoverHex] = useState<string | null>(null)
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null)
  const skipAutoSaveRef = useRef(false)
  const skipNextLoadRef = useRef(false)
  const saveSeqRef = useRef(0)
  const lastSavedSnapshotRef = useRef('')
  const formRef = useRef(form)
  formRef.current = form

  const getDraftSnapshot = useCallback((draft: ProductFormDraft) => {
    return JSON.stringify(formToApiPayload({ ...draft, status: 'draft' }, 'draft'))
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // Autosave just created the draft and updated the URL — keep local form state.
      if (
        skipNextLoadRef.current ||
        (productId && isServerProductId(formRef.current.id) && formRef.current.id === productId)
      ) {
        skipNextLoadRef.current = false
        setReady(true)
        return
      }

      setReady(false)
      setLoadError('')

      if (!productId) {
        const empty = createEmptyProductDraft()
        setForm(empty)
        lastSavedSnapshotRef.current = ''
        setReady(true)
        return
      }

      try {
        const token = await getAccessToken()
        if (!token) throw new Error('Please sign in again.')
        const result = await fetchSellerProduct(token, productId)
        if (cancelled) return
        const mapped = apiProductToForm(result.product)
        // Edit route should always start on Basic Info, not the Review step.
        const nextForm = routeProductId ? { ...mapped, step: 1 as const } : mapped
        setForm(nextForm)
        lastSavedSnapshotRef.current =
          nextForm.status === 'draft' ? getDraftSnapshot(nextForm) : ''
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load product.')
        setForm(createEmptyProductDraft())
        lastSavedSnapshotRef.current = ''
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [productId, routeProductId, getAccessToken, getDraftSnapshot])

  const persistDraft = useCallback(
    async (draft: ProductFormDraft, options?: { force?: boolean }) => {
      if (!hasDraftContent(draft) || skipAutoSaveRef.current) return
      if (draft.status === 'published') return

      const snapshot = getDraftSnapshot(draft)
      if (!options?.force && snapshot === lastSavedSnapshotRef.current) return

      const seq = ++saveSeqRef.current
      try {
        const token = await getAccessToken()
        if (!token || seq !== saveSeqRef.current) return

        const payload = formToApiPayload({ ...draft, status: 'draft' }, 'draft')
        const result = isServerProductId(draft.id)
          ? await saveSellerProductDraft(token, payload, draft.id)
          : await saveSellerProductDraft(token, payload)

        if (seq !== saveSeqRef.current) return

        lastSavedSnapshotRef.current = snapshot

        const becameServerId = !isServerProductId(draft.id) && Boolean(result.product._id)
        if (becameServerId) {
          setForm((prev) => {
            if (isServerProductId(prev.id)) return prev
            return {
              ...prev,
              id: result.product._id,
              status: 'draft',
            }
          })
          // Avoid remounting the form when the draft query param is attached.
          skipNextLoadRef.current = true
          navigate(`/seller/products/new?draft=${result.product._id}`, { replace: true })
        }
      } catch {
        // Autosave is best-effort; keep editing even if draft sync fails.
      }
    },
    [getAccessToken, getDraftSnapshot, navigate],
  )

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      void persistDraft(form)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [form, persistDraft, ready])

  useEffect(() => {
    return () => {
      void persistDraft(formRef.current, { force: true })
    }
  }, [persistDraft])

  const updateForm = (patch: Partial<ProductFormDraft>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const clearFieldError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const setFieldValue = (
    key: 'price' | 'moq' | 'availableQuantity' | 'gsm' | 'width' | 'unit' | 'category',
    value: string,
    isValid: boolean,
  ) => {
    updateForm({ [key]: value })
    if (isValid) clearFieldError(key)
  }

  const validateStep1 = () => {
    const next: FieldErrors = {}
    const name = form.name.trim()
    const description = form.shortDescription.trim()

    if (!name) next.name = 'Product name is required.'
    else if (name.length > MAX_PRODUCT_NAME) {
      next.name = `Product name cannot exceed ${MAX_PRODUCT_NAME} characters.`
    }

    if (!form.category) next.category = 'Please select a category.'

    if (!description) next.shortDescription = 'Short description is required.'
    else if (description.length > MAX_SHORT_DESCRIPTION) {
      next.shortDescription = `Short description cannot exceed ${MAX_SHORT_DESCRIPTION} characters.`
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const validateStep2 = () => {
    const next: FieldErrors = {}
    const price = toNumberOrNaN(form.price)
    const moq = toNumberOrNaN(form.moq)
    const qty = toNumberOrNaN(form.availableQuantity)
    const gsm = toNumberOrNaN(form.gsm)
    const width = toNumberOrNaN(form.width)

    if (!form.price || Number.isNaN(price) || price <= 0) {
      next.price = 'Enter a valid price greater than 0.'
    }
    if (!form.moq || Number.isNaN(moq) || moq < 1) {
      next.moq = 'MOQ must be at least 1.'
    }
    if (!form.availableQuantity || Number.isNaN(qty) || qty < 0) {
      next.availableQuantity = 'Enter a valid available quantity.'
    }
    if (!form.gsm || Number.isNaN(gsm) || gsm <= 0) {
      next.gsm = 'Enter a valid GSM value.'
    }
    if (!form.width || Number.isNaN(width) || width <= 0) {
      next.width = 'Enter fabric width in inches.'
    }
    if (!form.unit) next.unit = 'Please select a unit.'

    if (!form.variants.length) {
      next.variants = 'Add at least one color variant.'
    } else if (form.variants.length > MAX_COLORS) {
      next.variants = `You can add up to ${MAX_COLORS} colors only.`
    }

    form.variants.forEach((variant, index) => {
      if (!variant.colorHex) {
        next[`variant_color_${index}`] = 'Please pick a color.'
      }
      if (!variant.images.length) {
        next[`variant_images_${index}`] = 'Upload at least one image for this color.'
      } else if (variant.images.length > MAX_IMAGES_PER_COLOR) {
        next[`variant_images_${index}`] = `Maximum ${MAX_IMAGES_PER_COLOR} images allowed per color.`
      }
    })

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goNext = () => {
    if (form.step === 1 && !validateStep1()) return
    if (form.step === 2 && !validateStep2()) return
    updateForm({ step: Math.min(3, form.step + 1) as 1 | 2 | 3 })
    setErrors({})
  }

  const goBack = () => {
    if (form.step === 1) {
      void persistDraft(form).finally(() => navigate('/seller/products'))
      return
    }
    updateForm({ step: (form.step - 1) as 1 | 2 | 3 })
    setErrors({})
  }

  const saveDraftManual = async () => {
    if (!hasDraftContent(form)) {
      navigate('/seller/drafts')
      return
    }

    setSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')

      skipAutoSaveRef.current = true
      const payload = formToApiPayload({ ...form, status: 'draft' }, 'draft')
      await (isServerProductId(form.id)
        ? saveSellerProductDraft(token, payload, form.id)
        : saveSellerProductDraft(token, payload))
      lastSavedSnapshotRef.current = getDraftSnapshot(form)
      navigate('/seller/drafts')
    } catch (err) {
      skipAutoSaveRef.current = false
      setErrors((prev) => ({
        ...prev,
        form: err instanceof Error ? err.message : 'Failed to save draft.',
      }))
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    const step1Ok = validateStep1()
    if (!step1Ok) {
      updateForm({ step: 1 })
      return
    }

    const step2Ok = validateStep2()
    if (!step2Ok) {
      updateForm({ step: 2 })
      return
    }

    setPublishing(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')

      skipAutoSaveRef.current = true
      const payload = formToApiPayload({ ...form, step: 3 }, 'published')
      const result = isServerProductId(form.id)
        ? await updateSellerProduct(token, form.id, payload)
        : await createSellerProduct(token, payload)

      setForm(apiProductToForm(result.product))
      setSuccessOpen(true)
    } catch (err) {
      skipAutoSaveRef.current = false
      setErrors((prev) => ({
        ...prev,
        form: err instanceof Error ? err.message : 'Failed to publish product.',
      }))
    } finally {
      setPublishing(false)
    }
  }

  const addVariant = () => {
    if (form.variants.length >= MAX_COLORS) {
      setErrors((prev) => ({
        ...prev,
        variants: `You can add up to ${MAX_COLORS} colors only.`,
      }))
      return
    }
    updateForm({ variants: [...form.variants, createEmptyVariant()] })
    clearFieldError('variants')
  }

  const updateVariant = (id: string, patch: Partial<ProductVariantDraft>) => {
    const index = form.variants.findIndex((variant) => variant.id === id)
    const nextVariants = form.variants.map((variant) =>
      variant.id === id ? { ...variant, ...patch } : variant,
    )
    updateForm({ variants: nextVariants })

    if (index < 0) return
    const updated = nextVariants[index]
    if (patch.colorHex && updated.colorHex) clearFieldError(`variant_color_${index}`)
    if (patch.images) {
      if (updated.images.length > 0 && updated.images.length <= MAX_IMAGES_PER_COLOR) {
        clearFieldError(`variant_images_${index}`)
      }
    }
  }

  const removeVariant = (id: string) => {
    if (form.variants.length === 1) {
      setErrors((prev) => ({ ...prev, variants: 'At least one color variant is required.' }))
      return
    }
    updateForm({ variants: form.variants.filter((variant) => variant.id !== id) })
    clearFieldError('variants')
  }

  const onUploadImages = async (variantId: string, files: FileList | null) => {
    if (!files?.length) return
    const variant = form.variants.find((item) => item.id === variantId)
    if (!variant) return
    const index = form.variants.findIndex((item) => item.id === variantId)

    const remaining = MAX_IMAGES_PER_COLOR - variant.images.length
    if (remaining <= 0) {
      setErrors((prev) => ({
        ...prev,
        [`variant_images_${index}`]: `Maximum ${MAX_IMAGES_PER_COLOR} images allowed per color.`,
      }))
      return
    }

    const selected = Array.from(files).slice(0, remaining)
    setUploadingVariantId(variantId)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await uploadProductImages(token, selected)
      const urls = result.images.map((image) => image.url)
      updateVariant(variantId, { images: [...variant.images, ...urls] })
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [`variant_images_${index}`]:
          err instanceof Error ? err.message : 'Failed to upload images.',
      }))
    } finally {
      setUploadingVariantId(null)
    }
  }

  const previewImage = useMemo(() => {
    for (const variant of form.variants) {
      if (variant.images[0]) return variant.images[0]
    }
    return null
  }, [form.variants])

  const [activePreview, setActivePreview] = useState<string | null>(null)
  useEffect(() => {
    setActivePreview(previewImage)
  }, [previewImage])

  const allImages = form.variants.flatMap((variant) => variant.images).slice(0, 8)

  if (!ready) {
    return (
      <SellerShell>
        <main className="w-full min-w-0">
          <PageLoader label="Loading product form" />
        </main>
      </SellerShell>
    )
  }

  if (loadError) {
    return (
      <SellerShell>
        <main className="w-full min-w-0 space-y-4">
          <PageBackLink to="/seller/products" label="Back to products" />
          <p className="text-sm text-red-600">{loadError}</p>
        </main>
      </SellerShell>
    )
  }

  return (
    <SellerShell>
      <main className="w-full min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <Link
              to="/seller/products"
              onClick={() => {
                void persistDraft(form)
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black transition-colors mb-3"
            >
              <ArrowLeft size={16} />
              Back to products
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-black tracking-tight mb-1">
              {form.step === 1
                ? 'Add New Product'
                : form.name.trim() || 'Untitled product'}
            </h1>
            <p className="text-sm text-gray-500">
              {form.step === 1 && "Let's start with the basic information about your product."}
              {form.step === 2 && 'Enter pricing, stock details and color variants with images.'}
              {form.step === 3 && 'Review all details before publishing your product.'}
            </p>
          </div>
          <ProductStepper currentStep={form.step} />
        </div>

        {form.step === 1 && (
          <section
            key="step-1"
            className="rounded-2xl border border-gray-200 bg-white p-5 md:p-7 step-panel-enter"
          >
            <h2 className="font-serif text-xl font-semibold text-black mb-1">Basic Information</h2>
            <p className="text-sm text-gray-500 mb-6">Add the basic details of your product.</p>

            <div className="space-y-5 w-full">
              <div>
                <label htmlFor="productName" className="block text-xs font-semibold text-black mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="productName"
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      const value = e.target.value
                      updateForm({ name: value })
                      if (value.length > MAX_PRODUCT_NAME) {
                        setErrors((prev) => ({
                          ...prev,
                          name: `Product name cannot exceed ${MAX_PRODUCT_NAME} characters.`,
                        }))
                      } else if (value.trim()) {
                        clearFieldError('name')
                      }
                    }}
                    placeholder="Enter product name"
                    className={`w-full px-3.5 py-2.5 pr-16 text-sm border rounded-lg bg-white focus:outline-none ${
                      errors.name ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
                    }`}
                  />
                  <span className="absolute right-3 bottom-2.5 text-[11px] text-gray-400">
                    {form.name.length} / {MAX_PRODUCT_NAME}
                  </span>
                </div>
                <FieldError message={errors.name} />
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-black mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <ThemedSelect
                  id="category"
                  value={form.category}
                  placeholder="Select category"
                  error={Boolean(errors.category)}
                  options={PRODUCT_CATEGORIES.map((category) => ({
                    value: category,
                    label: category,
                  }))}
                  onChange={(value) => setFieldValue('category', value, Boolean(value))}
                />
                <FieldError message={errors.category} />
              </div>

              <div>
                <label
                  htmlFor="shortDescription"
                  className="block text-xs font-semibold text-black mb-1.5"
                >
                  Short Description <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1.5">Write a short summary about your fabric</p>
                <div className="relative">
                  <textarea
                    id="shortDescription"
                    rows={4}
                    value={form.shortDescription}
                    onChange={(e) => {
                      const value = e.target.value
                      updateForm({ shortDescription: value })
                      if (value.length > MAX_SHORT_DESCRIPTION) {
                        setErrors((prev) => ({
                          ...prev,
                          shortDescription: `Short description cannot exceed ${MAX_SHORT_DESCRIPTION} characters.`,
                        }))
                      } else if (value.trim()) {
                        clearFieldError('shortDescription')
                      }
                    }}
                    placeholder="Enter short description"
                    className={`w-full px-3.5 py-2.5 pb-7 text-sm border rounded-lg bg-white focus:outline-none resize-none ${
                      errors.shortDescription
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-gray-200 focus:border-gray-400'
                    }`}
                  />
                  <span className="absolute right-3 bottom-2.5 text-[11px] text-gray-400">
                    {form.shortDescription.length} / {MAX_SHORT_DESCRIPTION}
                  </span>
                </div>
                <FieldError message={errors.shortDescription} />
              </div>

              <div className="rounded-xl bg-[#f5f3ef] border border-[#ece8e3] px-4 py-3 flex items-start gap-2.5">
                <Info size={16} className="text-gray-600 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600">
                  Next Step: You will add pricing, stock details and color variants with images in
                  the next step.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  void persistDraft(form).finally(() => navigate('/seller/products'))
                }}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={goNext}
                className="btn-pill-black px-5 py-2.5 text-sm rounded-lg"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {form.step === 2 && (
          <div key="step-2" className="space-y-5 step-panel-enter">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-7">
              <h2 className="font-serif text-xl font-semibold text-black mb-1">Product Details</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter pricing and stock information for your product.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">
                    Price (per {unitSuffix(form.unit)}) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumber(form.price)}
                      onChange={(e) => {
                        const value = sanitizeNumberInput(e.target.value, { allowDecimal: true })
                        const num = toNumberOrNaN(value)
                        setFieldValue(
                          'price',
                          value,
                          Boolean(value) && !Number.isNaN(num) && num > 0,
                        )
                      }}
                      placeholder="Enter price"
                      className={`w-full pl-8 pr-3.5 py-2.5 text-sm border rounded-lg focus:outline-none ${
                        errors.price
                          ? 'border-red-400'
                          : 'border-gray-200 focus:border-gray-400'
                      }`}
                    />
                  </div>
                  <FieldError message={errors.price} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">
                    Minimum Order Quantity (MOQ) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumber(form.moq)}
                      onChange={(e) => {
                        const value = sanitizeNumberInput(e.target.value)
                        const num = toNumberOrNaN(value)
                        setFieldValue(
                          'moq',
                          value,
                          Boolean(value) && !Number.isNaN(num) && num >= 1,
                        )
                      }}
                      placeholder="Enter MOQ"
                      className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg focus:outline-none ${
                        errors.moq ? 'border-red-400' : 'border-gray-200 focus:border-gray-400'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {unitSuffix(form.unit)}
                    </span>
                  </div>
                  <FieldError message={errors.moq} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">
                    Available Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumber(form.availableQuantity)}
                      onChange={(e) => {
                        const value = sanitizeNumberInput(e.target.value)
                        const num = toNumberOrNaN(value)
                        setFieldValue(
                          'availableQuantity',
                          value,
                          Boolean(value) && !Number.isNaN(num) && num >= 0,
                        )
                      }}
                      placeholder="Enter quantity"
                      className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg focus:outline-none ${
                        errors.availableQuantity
                          ? 'border-red-400'
                          : 'border-gray-200 focus:border-gray-400'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {unitSuffix(form.unit)}
                    </span>
                  </div>
                  <FieldError message={errors.availableQuantity} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">
                    GSM <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumber(form.gsm)}
                      onChange={(e) => {
                        const value = sanitizeNumberInput(e.target.value)
                        const num = toNumberOrNaN(value)
                        setFieldValue(
                          'gsm',
                          value,
                          Boolean(value) && !Number.isNaN(num) && num > 0,
                        )
                      }}
                      placeholder="Enter GSM"
                      className={`w-full px-3.5 py-2.5 pr-14 text-sm border rounded-lg focus:outline-none ${
                        errors.gsm ? 'border-red-400' : 'border-gray-200 focus:border-gray-400'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      GSM
                    </span>
                  </div>
                  <FieldError message={errors.gsm} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">
                    Width (inches) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumber(form.width)}
                      onChange={(e) => {
                        const value = sanitizeNumberInput(e.target.value)
                        const num = toNumberOrNaN(value)
                        setFieldValue(
                          'width',
                          value,
                          Boolean(value) && !Number.isNaN(num) && num > 0,
                        )
                      }}
                      placeholder="e.g. 58"
                      className={`w-full px-3.5 py-2.5 pr-14 text-sm border rounded-lg focus:outline-none ${
                        errors.width ? 'border-red-400' : 'border-gray-200 focus:border-gray-400'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      in
                    </span>
                  </div>
                  <FieldError message={errors.width} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <ThemedSelect
                    value={form.unit}
                    error={Boolean(errors.unit)}
                    options={PRODUCT_UNITS.map((unit) => ({
                      value: unit.value,
                      label: unit.label,
                    }))}
                    onChange={(value) => setFieldValue('unit', value, Boolean(value))}
                  />
                  <FieldError message={errors.unit} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-7">
              <h2 className="font-serif text-xl font-semibold text-black mb-1">
                Product Variants (Colors with Images)
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Add colors and upload images for each color. Buyers will see images based on the
                selected color. Max {MAX_COLORS} colors, {MAX_IMAGES_PER_COLOR} images each.
              </p>

              <FieldError message={errors.variants} />

              <div className="space-y-4 mt-3">
                {form.variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="rounded-xl border border-gray-200 bg-[#fafafa] p-4 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-sm font-semibold text-black">Color {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200"
                        aria-label="Delete color"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Images for this color <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap items-start gap-3">
                        <label
                          className={`w-28 h-28 rounded-xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-1 transition-colors ${
                            pickingVariantId === variant.id
                              ? 'opacity-40 pointer-events-none'
                              : 'cursor-pointer hover:bg-[#f5f3ef]'
                          }`}
                        >
                          <ImagePlus size={18} className="text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {uploadingVariantId === variant.id ? 'Uploading...' : 'Upload'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={
                              pickingVariantId === variant.id ||
                              uploadingVariantId === variant.id
                            }
                            onChange={(e) => {
                              void onUploadImages(variant.id, e.target.files)
                              e.target.value = ''
                            }}
                          />
                        </label>

                        {variant.images.map((image, imageIndex) => {
                          const isPicking = pickingVariantId === variant.id
                          return (
                            <div
                              key={`${variant.id}_${imageIndex}`}
                              className={`relative w-28 h-28 rounded-xl overflow-hidden border bg-white ${
                                isPicking
                                  ? 'border-black ring-2 ring-black/10 z-30'
                                  : 'border-gray-200'
                              }`}
                            >
                              <img
                                src={image}
                                alt=""
                                draggable={false}
                                className="w-full h-full object-cover pointer-events-none select-none"
                              />
                              {!isPicking && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    updateVariant(variant.id, {
                                      images: variant.images.filter((_, i) => i !== imageIndex),
                                    })
                                  }}
                                  className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center"
                                >
                                  <X size={12} />
                                </button>
                              )}
                              {isPicking && (
                                <button
                                  type="button"
                                  aria-label="Pick color from this image"
                                  className="absolute inset-0 z-40 cursor-crosshair bg-transparent"
                                  onMouseLeave={() => {
                                    setHoverHex(null)
                                    setPickerPos(null)
                                  }}
                                  onMouseMove={(event) => {
                                    setPickerPos({ x: event.clientX, y: event.clientY })
                                    const point = captureSamplePoint(event)
                                    if (!point) return
                                    void (async () => {
                                      const token = await getAccessToken()
                                      const hex = await sampleColorAtPoint(image, point, token)
                                      if (hex) setHoverHex(hex)
                                    })()
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    const point = captureSamplePoint(event)
                                    if (!point) return
                                    void (async () => {
                                      const token = await getAccessToken()
                                      const hex = await sampleColorAtPoint(image, point, token)
                                      if (!hex) return
                                      updateVariant(variant.id, { colorHex: hex })
                                      setPickingVariantId(null)
                                      setHoverHex(null)
                                      setPickerPos(null)
                                    })()
                                  }}
                                />
                              )}
                            </div>
                          )
                        })}

                        <p className="text-xs text-gray-400 self-center">
                          Add up to {MAX_IMAGES_PER_COLOR} images
                        </p>
                      </div>
                      <FieldError message={errors[`variant_images_${index}`]} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Color <span className="text-red-500">*</span>
                      </label>
                      <ImageColorPicker
                        colorHex={variant.colorHex}
                        picking={pickingVariantId === variant.id}
                        hoverHex={pickingVariantId === variant.id ? hoverHex : null}
                        disabled={!variant.images.length}
                        onTogglePick={() => {
                          if (pickingVariantId === variant.id) {
                            setPickingVariantId(null)
                            setHoverHex(null)
                            setPickerPos(null)
                          } else {
                            setPickingVariantId(variant.id)
                            setHoverHex(null)
                            setPickerPos(null)
                          }
                        }}
                      />
                      <FieldError message={errors[`variant_color_${index}`]} />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addVariant}
                disabled={form.variants.length >= MAX_COLORS}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border border-gray-200 bg-white hover:bg-[#f5f3ef] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Add Another Color
              </button>

              <div className="rounded-xl bg-[#f5f3ef] border border-[#ece8e3] px-4 py-3 flex items-start gap-2.5 mt-5">
                <Lightbulb size={16} className="text-gray-600 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600">
                  Add all available colors of this fabric. You can add more variants later.
                </p>
              </div>
            </section>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef]"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={saving || publishing}
                  onClick={() => {
                    void saveDraftManual()
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef] disabled:opacity-50"
                >
                  <FileText size={15} />
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="btn-pill-black px-5 py-2.5 text-sm rounded-lg"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {form.step === 3 && (
          <div key="step-3" className="space-y-5 step-panel-enter">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-7">
              <h2 className="font-serif text-xl font-semibold text-black mb-1">Review Product</h2>
              <p className="text-sm text-gray-500 mb-6">
                Please review all the details below. You can go back and edit if needed.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-8 lg:gap-10">
                <div>
                  <p className="text-sm font-semibold text-black mb-3">Product Preview</p>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#f5f3ef] border border-gray-100 mb-3">
                    {activePreview ? (
                      <img src={activePreview} alt={form.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Upload size={28} />
                      </div>
                    )}
                  </div>
                  {allImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((image) => (
                        <button
                          key={image.slice(0, 40)}
                          type="button"
                          onClick={() => setActivePreview(image)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border shrink-0 ${
                            activePreview === image ? 'border-black' : 'border-gray-200'
                          }`}
                        >
                          <img src={image} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-black mb-4">Product Information</p>

                  <div className="space-y-0">
                    <ReviewRow label="Product Name" value={form.name} />
                    <ReviewRow label="Category" value={form.category} />
                    <ReviewRow label="Short Description" value={form.shortDescription} />
                  </div>

                  <div className="border-t border-gray-200 my-4" />

                  <div className="space-y-0">
                    <ReviewRow
                      label="Price (per meter)"
                      value={`₹${formatNumber(form.price)} / ${unitSuffix(form.unit)}`}
                    />
                    <ReviewRow
                      label="Minimum Order Quantity (MOQ)"
                      value={`${formatNumber(form.moq)} ${unitSuffix(form.unit)}`}
                    />
                    <ReviewRow
                      label="Available Quantity"
                      value={`${formatNumber(form.availableQuantity)} ${unitSuffix(form.unit)}`}
                    />
                    <ReviewRow label="GSM" value={`${formatNumber(form.gsm)} GSM`} />
                    <ReviewRow label="Width" value={`${formatNumber(form.width)} in`} />
                    <ReviewRow
                      label="Unit"
                      value={
                        PRODUCT_UNITS.find((unit) => unit.value === form.unit)?.label || form.unit
                      }
                    />
                  </div>

                  <div className="border-t border-gray-200 my-5" />

                  <div>
                    <p className="text-sm font-semibold text-black mb-3">Variants (Colors)</p>
                    <div className="space-y-2">
                      {form.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center gap-3 rounded-xl bg-[#f5f3ef] px-3.5 py-3"
                        >
                          <span
                            className={`w-7 h-7 rounded-full border shrink-0 ${
                              variant.colorHex
                                ? 'border-gray-200'
                                : 'border-dashed border-gray-300 bg-white'
                            }`}
                            style={
                              variant.colorHex
                                ? { backgroundColor: variant.colorHex }
                                : undefined
                            }
                          />
                          <span className="text-sm font-medium text-black uppercase tracking-wide">
                            {variant.colorHex || 'No color'}
                          </span>
                          <span className="ml-auto text-xs text-gray-500 shrink-0">
                            {variant.images.length} image
                            {variant.images.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef]"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={saving || publishing}
                  onClick={() => {
                    void saveDraftManual()
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef] disabled:opacity-50"
                >
                  <FileText size={15} />
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  disabled={saving || publishing}
                  onClick={() => {
                    void publish()
                  }}
                  className="btn-pill-black px-5 py-2.5 text-sm rounded-lg disabled:opacity-50"
                >
                  <Upload size={15} />
                  {publishing
                    ? 'Publishing...'
                    : form.status === 'published'
                      ? 'Update Product'
                      : 'Publish Product'}
                </button>
              </div>
            </div>
            {errors.form && <FieldError message={errors.form} />}
          </div>
        )}
      </main>

      <SuccessModal
        open={successOpen}
        onClose={() => {
          setSuccessOpen(false)
          navigate('/seller/products')
        }}
        title="Product Published!"
        message={
          'Your product has been published successfully.\nIt is now live and available for buyers to see.'
        }
        secondaryLabel="View Product"
        onSecondary={() => {
          setSuccessOpen(false)
          navigate('/seller/products')
        }}
        primaryLabel="Add Another Product"
        onPrimary={() => {
          setSuccessOpen(false)
          skipAutoSaveRef.current = false
          setForm(createEmptyProductDraft())
          navigate('/seller/products/new', { replace: true })
        }}
      />

      {pickingVariantId && pickerPos && (
        <div
          className="fixed z-[50] flex items-center gap-1.5"
          style={{
            left: pickerPos.x,
            top: pickerPos.y,
            // Keep preview away from the click point so it never blocks the image.
            transform: 'translate(18px, 18px)',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <span className="pointer-events-none w-9 h-9 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center">
            <Pipette size={16} className="text-black" />
          </span>
          {hoverHex && (
            <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 shadow-md px-2 py-1">
              <span
                className="w-3.5 h-3.5 rounded-full border border-gray-200"
                style={{ backgroundColor: hoverHex }}
              />
              <span className="text-[11px] font-medium text-black uppercase">{hoverHex}</span>
            </span>
          )}
        </div>
      )}
    </SellerShell>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(140px,42%)_1fr] gap-x-6 gap-y-1 py-2.5 items-start">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-black leading-relaxed whitespace-pre-wrap break-words">
        {value || '—'}
      </p>
    </div>
  )
}
