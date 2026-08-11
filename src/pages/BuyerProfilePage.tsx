import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { ProfileAccountCard } from '../components/auth/ProfileAccountCard'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { fetchBuyerProfile, updateBuyerProfile } from '../lib/api'
import {
  BUDGET_RANGES,
  BUSINESS_TYPES,
  FABRIC_PREFERENCES,
  INDUSTRIES,
  INTEREST_OPTIONS,
  ORDER_QUANTITY_RANGES,
  emptyBuyerForm,
  type BuyerSetupInput,
} from '../lib/buyerPreferences'
import { getFriendlyErrorMessage } from '../lib/errors'

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
      className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs sm:text-sm border transition-colors ${
        selected
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  )
}

function PreferenceSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-black">{title}</h2>
        {hint ? <p className="text-xs text-gray-500 mt-0.5">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function DiscreteRangeSlider({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly string[]
  value: string
  onChange: (next: string) => void
  ariaLabel: string
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option === value),
  )
  const activeIndex = value ? index : 0
  const pct = options.length > 1 ? (activeIndex / (options.length - 1)) * 100 : 0

  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-black mb-3 sm:mb-4">{value || options[0]}</p>
      <div className="relative h-5 flex items-center mb-2">
        <div className="absolute inset-x-0 h-1 rounded-full bg-gray-200" />
        <div className="absolute h-1 rounded-full bg-black" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={activeIndex}
          aria-label={ariaLabel}
          onChange={(e) => onChange(options[Number(e.target.value)] || options[0])}
          className={
            'absolute inset-0 h-5 w-full appearance-none bg-transparent cursor-pointer touch-pan-y ' +
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 ' +
            '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full ' +
            '[&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 ' +
            '[&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow ' +
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full ' +
            '[&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-2 ' +
            '[&::-moz-range-thumb]:border-white'
          }
        />
      </div>
      {/* Full labels on sm+; on mobile the selected value above is enough */}
      <div className="hidden sm:flex justify-between gap-1 text-[11px] text-gray-500 leading-snug">
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex-1 min-w-0 text-left hover:text-black transition-colors truncate ${
              i === activeIndex && value ? 'text-black font-medium' : ''
            }`}
            title={option}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BuyerProfilePage() {
  const { getAccessToken } = useAuth()
  const [form, setForm] = useState<BuyerSetupInput>(emptyBuyerForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('Please sign in again.')
        const result = await fetchBuyerProfile(token)
        if (cancelled) return
        setForm({
          businessType: result.buyer.businessType,
          businessTypeOther: result.buyer.businessTypeOther || '',
          industry: result.buyer.industry,
          industryOther: result.buyer.industryOther || '',
          interests: result.buyer.interests || [],
          preferredFabrics: result.buyer.preferredFabrics || [],
          typicalOrderQuantity: result.buyer.typicalOrderQuantity,
          budgetRange: result.buyer.budgetRange,
        })
      } catch (err) {
        if (!cancelled) setError(getFriendlyErrorMessage(err, 'Could not load profile.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken])

  const canSave = useMemo(() => {
    if (
      !form.businessType ||
      !form.industry ||
      !form.interests.length ||
      !form.preferredFabrics.length ||
      !form.typicalOrderQuantity ||
      !form.budgetRange
    ) {
      return false
    }
    if (form.businessType === 'Other' && !form.businessTypeOther?.trim()) return false
    if (form.industry === 'Other' && !form.industryOther?.trim()) return false
    return true
  }, [form])

  const handleSave = async () => {
    setError('')
    setSaved(false)
    if (!canSave) {
      setError('Please complete all preference fields before saving.')
      return
    }

    setSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')
      await updateBuyerProfile(token, form)
      setSaved(true)
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not save profile.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-canvas">
      <Navbar variant="solid" showActions fixed={false} />
      <Container className="flex-1 py-8 md:py-10 pb-16 md:pb-20">
        <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-6" />

        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-semibold text-black tracking-tight">
            Buyer profile
          </h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-2xl">
            Preferences that shape your marketplace feed and AI recommendations.
          </p>
        </div>

        {loading ? (
          <PageLoader label="Loading profile" />
        ) : (
          <div className="w-full min-w-0 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            {saved && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 inline-flex items-start sm:items-center gap-2">
                <Check size={15} className="shrink-0 mt-0.5 sm:mt-0" />
                <span>Preferences saved. Recommendations will use your latest profile.</span>
              </div>
            )}

            <ProfileAccountCard roleLabel="Buyer" />

            <div className="w-full min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 md:p-8 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                <div className="space-y-6 min-w-0">
                  <PreferenceSection title="Business type">
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_TYPES.map((item) => (
                        <ChoiceChip
                          key={item}
                          label={item}
                          selected={form.businessType === item}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              businessType: item,
                              businessTypeOther: item === 'Other' ? prev.businessTypeOther : '',
                            }))
                          }
                        />
                      ))}
                    </div>
                    {form.businessType === 'Other' && (
                      <input
                        type="text"
                        value={form.businessTypeOther || ''}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, businessTypeOther: e.target.value }))
                        }
                        placeholder="Tell us exactly what your business type is"
                        className="mt-1 w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                      />
                    )}
                  </PreferenceSection>

                  <PreferenceSection title="Industry">
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRIES.map((item) => (
                        <ChoiceChip
                          key={item}
                          label={item}
                          selected={form.industry === item}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              industry: item,
                              industryOther: item === 'Other' ? prev.industryOther : '',
                            }))
                          }
                        />
                      ))}
                    </div>
                    {form.industry === 'Other' && (
                      <input
                        type="text"
                        value={form.industryOther || ''}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, industryOther: e.target.value }))
                        }
                        placeholder="Tell us exactly what your industry is"
                        className="mt-1 w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                      />
                    )}
                  </PreferenceSection>

                  <PreferenceSection title="Interests" hint="Select all that apply">
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((item) => (
                        <ChoiceChip
                          key={item}
                          label={item}
                          selected={form.interests.includes(item)}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              interests: toggleValue(prev.interests, item),
                            }))
                          }
                        />
                      ))}
                    </div>
                  </PreferenceSection>
                </div>

                <div className="space-y-6 min-w-0 border-t border-gray-100 pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-gray-100 lg:pl-12">
                  <PreferenceSection title="Preferred fabrics" hint="Select all that apply">
                    <div className="flex flex-wrap gap-2">
                      {FABRIC_PREFERENCES.map((item) => (
                        <ChoiceChip
                          key={item}
                          label={item}
                          selected={form.preferredFabrics.includes(item)}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              preferredFabrics: toggleValue(prev.preferredFabrics, item),
                            }))
                          }
                        />
                      ))}
                    </div>
                  </PreferenceSection>

                  <PreferenceSection title="Typical order quantity">
                    <DiscreteRangeSlider
                      options={ORDER_QUANTITY_RANGES}
                      value={form.typicalOrderQuantity}
                      onChange={(typicalOrderQuantity) =>
                        setForm((prev) => ({ ...prev, typicalOrderQuantity }))
                      }
                      ariaLabel="Typical order quantity"
                    />
                  </PreferenceSection>

                  <PreferenceSection title="Budget range">
                    <DiscreteRangeSlider
                      options={BUDGET_RANGES}
                      value={form.budgetRange}
                      onChange={(budgetRange) => setForm((prev) => ({ ...prev, budgetRange }))}
                      ariaLabel="Budget range"
                    />
                  </PreferenceSection>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-6 sm:mt-8 pt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <Link
                  to="/addresses"
                  className="text-sm text-center sm:text-left text-gray-600 hover:text-black transition-colors"
                >
                  Manage shipping addresses
                </Link>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="btn-pill-black w-full sm:w-auto px-6 py-2.5 text-sm disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save preferences'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
      <Footer />
    </main>
  )
}
