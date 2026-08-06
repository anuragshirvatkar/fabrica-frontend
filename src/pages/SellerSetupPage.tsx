import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchSellerProfile, setupSellerProfile } from '../lib/api'
import {
  OPERATING_HOURS,
  SELLER_FABRIC_TYPES,
  SELLER_MOQ_RANGES,
  SELLER_PRODUCT_CATEGORIES,
  emptySellerForm,
  sellerProfileToForm,
  type SellerSetupInput,
} from '../lib/sellerPreferences'
import { StateSelect } from '../components/ui/StateSelect'

const TOTAL_STEPS = 3
const MAX_DESCRIPTION_LENGTH = 300

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function ChoiceChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
        selected
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  )
}

export function SellerSetupPage() {
  const navigate = useNavigate()
  const { user, logout, getAccessToken, markSellerSetupCompleted } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<SellerSetupInput>(emptySellerForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [prefillLoading, setPrefillLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) return
        const result = await fetchSellerProfile(token)
        if (cancelled) return
        setForm(sellerProfileToForm(result.seller))
      } catch {
        // New sellers have no profile yet — start blank.
      } finally {
        if (!cancelled) setPrefillLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken])

  const stepsAway = TOTAL_STEPS - step + 1

  const canContinueStep1 = useMemo(
    () => Boolean(form.companyName.trim() && form.phone.trim() && form.gst.trim()),
    [form.companyName, form.phone, form.gst],
  )

  const canContinueStep2 = useMemo(() => {
    const { line1, city, state, pincode } = form.address
    if (!line1.trim() || !city.trim() || !state || !pincode.trim()) return false
    if (!form.operatingHours) return false
    if (form.operatingHours === 'Other' && !form.operatingHoursOther?.trim()) return false
    return true
  }, [form.address, form.operatingHours, form.operatingHoursOther])

  const canSubmit = useMemo(
    () =>
      Boolean(
        canContinueStep1 &&
          canContinueStep2 &&
          form.productCategories.length &&
          form.fabricTypes.length &&
          form.moqRange,
      ),
    [
      canContinueStep1,
      canContinueStep2,
      form.productCategories.length,
      form.fabricTypes.length,
      form.moqRange,
    ],
  )

  const prompt =
    step === 1
      ? 'Tell me about your business — company details so buyers know who they are dealing with.'
      : step === 2
        ? 'Where do you operate from, and when can buyers reach you?'
        : 'Almost there. What do you sell, which fabrics, and what’s your usual MOQ?'

  const handleNext = () => {
    setError('')
    if (step === 1 && !canContinueStep1) {
      setError('Company name, phone, and GST are required.')
      return
    }
    if (step === 2 && !canContinueStep2) {
      setError(
        'Add your full address and operating hours. If you chose Other for hours, describe them.',
      )
      return
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  const handleSubmit = async () => {
    setError('')
    if (!canSubmit) {
      setError('Select at least one category, one fabric type, and your MOQ range to finish.')
      return
    }

    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')

      await setupSellerProfile(token, {
        ...form,
        companyName: form.companyName.trim(),
        phone: form.phone.trim(),
        gst: form.gst.trim(),
        description: form.description?.trim() || '',
        address: {
          ...form.address,
          line1: form.address.line1.trim(),
          city: form.address.city.trim(),
          pincode: form.address.pincode.trim(),
          country: form.address.country || 'India',
        },
        operatingHoursOther:
          form.operatingHours === 'Other' ? form.operatingHoursOther?.trim() || '' : '',
      })
      markSellerSetupCompleted()
      navigate('/seller/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save seller profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="flex justify-end px-6 md:px-10 py-4 md:py-5">
        <button
          type="button"
          onClick={async () => {
            await logout()
            navigate('/')
          }}
          className="inline-flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-white/80 transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-[#ece8e3] flex items-center justify-center text-sm font-semibold text-gray-700">
            {(user?.email?.[0] || 'S').toUpperCase()}
          </span>
          <span className="text-sm font-medium text-black">Seller</span>
          <ChevronDown size={16} className="text-gray-500" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 md:px-6 pb-10">
        <div className="w-full max-w-2xl mb-6 md:mb-7 text-left">
          <h1 className="text-2xl md:text-[2rem] font-serif font-semibold text-black tracking-tight mb-2">
            Let&apos;s set up your store
          </h1>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              {stepsAway === 1
                ? 'Last step — then your seller dashboard unlocks.'
                : `${stepsAway} steps away from listing fabrics and reaching buyers.`}
            </p>
            <span
              className="text-xs text-gray-400 flex-shrink-0 tabular-nums"
              aria-label={`Step ${step} of ${TOTAL_STEPS}`}
            >
              {step}/{TOTAL_STEPS}
            </span>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-4">
          <div className="rounded-2xl bg-[#ece8e3]/70 border border-[#e2ddd6] px-5 py-4">
            <p className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 mb-1.5">
              Fabrica
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">{prompt}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 overflow-visible">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            {prefillLoading ? (
              <p className="text-sm text-gray-500 py-8 text-center">Loading your details…</p>
            ) : step === 1 ? (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-xs font-semibold text-black mb-1.5"
                  >
                    Business / Company name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter your company name"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="gst" className="block text-xs font-semibold text-black mb-1.5">
                      GST number
                    </label>
                    <input
                      id="gst"
                      type="text"
                      value={form.gst}
                      onChange={(e) => setForm((prev) => ({ ...prev, gst: e.target.value }))}
                      placeholder="Enter your GST number"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-black mb-1.5">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-xs font-semibold text-black mb-1.5"
                  >
                    Business description{' '}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="description"
                      rows={3}
                      value={form.description || ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value.slice(0, MAX_DESCRIPTION_LENGTH),
                        }))
                      }
                      placeholder="Tell buyers about your products and business..."
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400 resize-none"
                    />
                    <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-400">
                      {(form.description || '').length} / {MAX_DESCRIPTION_LENGTH}
                    </span>
                  </div>
                </div>
              </div>
            ) : step === 2 ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Business address</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={form.address.line1}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          address: { ...prev.address, line1: e.target.value },
                        }))
                      }
                      placeholder="Street address / landmark"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={form.address.city}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            address: { ...prev.address, city: e.target.value },
                          }))
                        }
                        placeholder="City"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                      />
                      <input
                        type="text"
                        value={form.address.pincode}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            address: { ...prev.address, pincode: e.target.value },
                          }))
                        }
                        placeholder="PIN code"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="seller-setup-state"
                        className="block text-xs font-semibold text-black mb-1.5"
                      >
                        State
                      </label>
                      <StateSelect
                        id="seller-setup-state"
                        value={form.address.state}
                        onChange={(state) =>
                          setForm((prev) => ({
                            ...prev,
                            address: { ...prev.address, state },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Operating hours</p>
                  <div className="flex flex-wrap gap-2">
                    {OPERATING_HOURS.map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={form.operatingHours === item}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            operatingHours: item,
                            operatingHoursOther:
                              item === 'Other' ? prev.operatingHoursOther : '',
                          }))
                        }
                      />
                    ))}
                  </div>
                  {form.operatingHours === 'Other' && (
                    <input
                      type="text"
                      value={form.operatingHoursOther || ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, operatingHoursOther: e.target.value }))
                      }
                      placeholder="Describe your operating hours"
                      className="mt-3 w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Product categories</p>
                  <div className="flex flex-wrap gap-2">
                    {SELLER_PRODUCT_CATEGORIES.map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={form.productCategories.includes(item)}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            productCategories: toggleValue(prev.productCategories, item),
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Fabric types you supply</p>
                  <div className="flex flex-wrap gap-2">
                    {SELLER_FABRIC_TYPES.map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={form.fabricTypes.includes(item)}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            fabricTypes: toggleValue(prev.fabricTypes, item),
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Typical MOQ</p>
                  <div className="flex flex-wrap gap-2">
                    {SELLER_MOQ_RANGES.map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={form.moqRange === item}
                        onClick={() => setForm((prev) => ({ ...prev, moqRange: item }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!prefillLoading && (
              <div className="flex items-center justify-between gap-3 pt-8">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setStep((s) => s - 1)
                    }}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                ) : (
                  <span />
                )}

                {step < TOTAL_STEPS ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-pill-black px-5 py-2.5 text-sm rounded-lg inline-flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSubmit}
                    className="btn-pill-black px-5 py-2.5 text-sm rounded-lg disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {loading ? 'Saving...' : 'Save & open dashboard'}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-gray-400 mt-8 text-center">
          <Shield size={14} className="flex-shrink-0" />
          Used to verify your business and match you with buyers. You can edit this anytime in
          Profile.
        </p>
      </main>
    </div>
  )
}
