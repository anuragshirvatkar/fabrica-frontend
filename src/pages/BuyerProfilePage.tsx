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

export function BuyerProfilePage() {
  const { user, getAccessToken } = useAuth()
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
    <main className="min-h-screen flex flex-col bg-[#f9f9f9]">
      <Navbar variant="solid" showActions fixed={false} />
      <Container className="flex-1 py-8 md:py-10 pb-36 md:pb-52">
        <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-3" />

        <div className="flex items-start gap-3 mb-6">
          <span className="w-11 h-11 rounded-xl bg-[#ece8e3] flex items-center justify-center text-base font-semibold text-gray-800">
            {(user?.email?.[0] || 'B').toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-serif font-semibold text-black">Buyer profile</h1>
            <p className="text-sm text-gray-500 mt-1">
              Update the preferences that shape your marketplace and AI recommendations.
            </p>
          </div>
        </div>

        {loading ? (
          <PageLoader label="Loading profile" />
        ) : (
          <div className="max-w-3xl space-y-5">
            <ProfileAccountCard roleLabel="Buyer" />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            {saved && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 inline-flex items-center gap-2">
                <Check size={15} />
                Preferences saved. Recommendations will use your latest profile.
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6 space-y-6">
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
                <p className="text-xs font-semibold text-black mb-2.5">Interests</p>
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

              <div className="flex flex-wrap items-center justify-end gap-3 pt-10">
                <Link to="/addresses" className="text-sm text-gray-600 hover:text-black">
                  Manage shipping addresses
                </Link>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="btn-pill-black px-5 py-2.5 text-sm rounded-lg disabled:opacity-60"
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
