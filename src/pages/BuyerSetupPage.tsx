import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { setupBuyerProfile } from '../lib/api'
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

const TOTAL_STEPS = 2

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

export function BuyerSetupPage() {
  const navigate = useNavigate()
  const { user, logout, getAccessToken, markBuyerSetupCompleted } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<BuyerSetupInput>(emptyBuyerForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const stepsAway = TOTAL_STEPS - step + 1

  const canContinueStep1 = useMemo(() => {
    if (!form.businessType || !form.industry || !form.interests.length) return false
    if (form.businessType === 'Other' && !form.businessTypeOther?.trim()) return false
    if (form.industry === 'Other' && !form.industryOther?.trim()) return false
    return true
  }, [
    form.businessType,
    form.businessTypeOther,
    form.industry,
    form.industryOther,
    form.interests.length,
  ])

  const canSubmit = useMemo(
    () =>
      Boolean(
        canContinueStep1 &&
          form.preferredFabrics.length &&
          form.typicalOrderQuantity &&
          form.budgetRange,
      ),
    [canContinueStep1, form.preferredFabrics.length, form.typicalOrderQuantity, form.budgetRange],
  )

  const prompt =
    step === 1
      ? 'Tell me a little about your business — what do you do, and what are you usually looking for?'
      : 'Almost there. Which fabrics matter most, and how do you typically buy?'

  const handleNext = () => {
    setError('')
    if (!canContinueStep1) {
      setError(
        'Pick your business type, industry, and at least one interest. If you chose Other, tell us exactly what it is.',
      )
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    setError('')
    if (!canSubmit) {
      setError('Choose preferred fabrics, typical order size, and budget to finish.')
      return
    }

    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')

      await setupBuyerProfile(token, form)
      markBuyerSetupCompleted()
      navigate('/marketplace', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save buyer preferences.')
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
            {(user?.email?.[0] || 'B').toUpperCase()}
          </span>
          <span className="text-sm font-medium text-black">Buyer</span>
          <ChevronDown size={16} className="text-gray-500" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 md:px-6 pb-10">
        <div className="w-full max-w-2xl mb-6 md:mb-7 text-left">
          <h1 className="text-2xl md:text-[2rem] font-serif font-semibold text-black tracking-tight mb-2">
            Let&apos;s personalize Fabrica
          </h1>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              {stepsAway === 1
                ? 'Last step — then your marketplace unlocks.'
                : `${stepsAway} steps away from a marketplace tuned to your sourcing style.`}
            </p>
            <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Business type</p>
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
                      className="mt-3 w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Industry</p>
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
                      className="mt-3 w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">
                    What are you usually interested in?
                  </p>
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
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Preferred fabrics</p>
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
                </div>

                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Typical order quantity</p>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_QUANTITY_RANGES.map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={form.typicalOrderQuantity === item}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, typicalOrderQuantity: item }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-black mb-2.5">Budget range</p>
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_RANGES.map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={form.budgetRange === item}
                        onClick={() => setForm((prev) => ({ ...prev, budgetRange: item }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-8">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setStep(1)
                  }}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              ) : (
                <span />
              )}

              {step === 1 ? (
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
                  {loading ? 'Saving...' : 'Save & open marketplace'}
                  {!loading && <ArrowRight size={16} />}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-gray-400 mt-8 text-center">
          <Shield size={14} className="flex-shrink-0" />
          Used to personalize search and AI recommendations. You can edit this anytime in Profile.
        </p>
      </main>
    </div>
  )
}
