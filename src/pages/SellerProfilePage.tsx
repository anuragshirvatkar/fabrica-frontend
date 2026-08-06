import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { ProfileAccountCard } from '../components/auth/ProfileAccountCard'
import { SellerShell } from '../components/seller/SellerShell'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { fetchSellerProfile, updateSellerProfile } from '../lib/api'
import {
  OPERATING_HOURS,
  SELLER_FABRIC_TYPES,
  SELLER_MOQ_RANGES,
  SELLER_PRODUCT_CATEGORIES,
  emptySellerForm,
  sellerProfileToForm,
  type SellerSetupInput,
} from '../lib/sellerPreferences'
import { getFriendlyErrorMessage } from '../lib/errors'
import { StateSelect } from '../components/ui/StateSelect'

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

export function SellerProfilePage() {
  const { user, getAccessToken } = useAuth()
  const [form, setForm] = useState<SellerSetupInput>(emptySellerForm)
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
        const result = await fetchSellerProfile(token)
        if (cancelled) return
        setForm(sellerProfileToForm(result.seller))
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
    if (!form.companyName.trim() || !form.phone.trim() || !form.gst.trim()) return false
    const { line1, city, state, pincode } = form.address
    if (!line1.trim() || !city.trim() || !state || !pincode.trim()) return false
    if (!form.operatingHours) return false
    if (form.operatingHours === 'Other' && !form.operatingHoursOther?.trim()) return false
    if (!form.productCategories.length || !form.fabricTypes.length || !form.moqRange) return false
    return true
  }, [form])

  const handleSave = async () => {
    setError('')
    setSaved(false)
    if (!canSave) {
      setError('Please complete all required fields before saving.')
      return
    }

    setSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')
      await updateSellerProfile(token, {
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
      setSaved(true)
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not save profile.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SellerShell>
      <main className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <PageBackLink to="/seller/dashboard" label="Back to dashboard" className="mb-3" />

        <div className="flex items-start gap-3 mb-6">
          <span className="w-11 h-11 rounded-xl bg-[#ece8e3] flex items-center justify-center text-base font-semibold text-gray-800">
            {(user?.email?.[0] || 'S').toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-serif font-semibold text-black">Seller profile</h1>
            <p className="text-sm text-gray-500 mt-1">
              Update your business details, hours, categories, and MOQ.
            </p>
          </div>
        </div>

        {loading ? (
          <PageLoader label="Loading profile" />
        ) : (
          <div className="max-w-3xl space-y-5">
            <ProfileAccountCard roleLabel="Seller" />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            {saved && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 inline-flex items-center gap-2">
                <Check size={15} />
                Profile saved.
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6 space-y-6">
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="profile-company"
                    className="block text-xs font-semibold text-black mb-1.5"
                  >
                    Business / Company name
                  </label>
                  <input
                    id="profile-company"
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="profile-gst"
                      className="block text-xs font-semibold text-black mb-1.5"
                    >
                      GST number
                    </label>
                    <input
                      id="profile-gst"
                      type="text"
                      value={form.gst}
                      onChange={(e) => setForm((prev) => ({ ...prev, gst: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-semibold text-black mb-1.5"
                    >
                      Phone number
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-description"
                    className="block text-xs font-semibold text-black mb-1.5"
                  >
                    Business description
                  </label>
                  <div className="relative">
                    <textarea
                      id="profile-description"
                      rows={3}
                      value={form.description || ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value.slice(0, MAX_DESCRIPTION_LENGTH),
                        }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 resize-none"
                    />
                    <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-400">
                      {(form.description || '').length} / {MAX_DESCRIPTION_LENGTH}
                    </span>
                  </div>
                </div>
              </div>

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
                      htmlFor="seller-profile-state"
                      className="block text-xs font-semibold text-black mb-1.5"
                    >
                      State
                    </label>
                    <StateSelect
                      id="seller-profile-state"
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
                          operatingHoursOther: item === 'Other' ? prev.operatingHoursOther : '',
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
                <p className="text-xs font-semibold text-black mb-2.5">Fabric types</p>
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

              <div className="flex justify-end pt-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="btn-pill-black px-5 py-2.5 text-sm rounded-lg disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </SellerShell>
  )
}
