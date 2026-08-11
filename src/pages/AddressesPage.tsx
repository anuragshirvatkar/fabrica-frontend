import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageBackLink } from '../components/ui/PageBackLink'
import { useAuth } from '../context/AuthContext'
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
  type Address,
} from '../lib/api'
import { StateSelect } from '../components/ui/StateSelect'

const emptyForm = {
  name: '',
  companyName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
}

const addressFields = [
  ['name', 'Full name', true],
  ['phone', 'Phone', true],
  ['addressLine1', 'Address line 1', true],
  ['addressLine2', 'Address line 2', false],
  ['city', 'City', true],
  ['state', 'State', true],
  ['postalCode', 'Postal code', true],
  ['companyName', 'Company name', false],
] as const

type AddressFieldKey = (typeof addressFields)[number][0]

export function AddressesPage() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<AddressFieldKey, boolean>>>({})

  const load = async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        navigate('/login')
        return
      }
      const result = await fetchAddresses(token)
      setAddresses(result.addresses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const markTouched = (key: AddressFieldKey) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
  }

  const resetFormState = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setTouched({})
  }

  const save = async () => {
    setError('')
    const requiredKeys = addressFields.filter(([, , required]) => required).map(([key]) => key)
    setTouched((prev) => {
      const next = { ...prev }
      for (const key of requiredKeys) next[key] = true
      return next
    })
    const missing = requiredKeys.some((key) => !form[key].trim())
    if (missing) return

    try {
      const token = await getAccessToken()
      if (!token) return
      if (editingId) await updateAddress(token, editingId, form)
      else await createAddress(token, form)
      resetFormState()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f9f9f9]">
      <div className="min-h-[calc(100dvh+14rem)] flex flex-col">
      <Navbar variant="solid" showActions fixed={false} />
      <Container wide className="flex-1 py-8 md:py-10 pb-16 md:pb-20">
        <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-3" />
        <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-black mb-1">Addresses</h1>
            <p className="text-sm text-gray-500">Save up to 3 delivery addresses.</p>
          </div>
          {addresses.length < 3 && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setTouched({})
                setShowForm(true)
              }}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 btn-pill-black px-4 py-2.5 text-sm"
            >
              <Plus size={15} /> Add Address
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading addresses...</p>
        ) : addresses.length === 0 && !showForm ? (
          <EmptyState
            icon={MapPin}
            title="No addresses saved"
            description="Add a delivery address to place orders."
            actionLabel="Add Address"
            onAction={() => {
              setTouched({})
              setShowForm(true)
            }}
          />
        ) : (
          <div className="w-full space-y-3 mb-6">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="w-full min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3 sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-black break-words">
                    {address.name}{' '}
                    {address.isDefault && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ml-1 whitespace-nowrap">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city},{' '}
                    {address.state} {address.postalCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{address.phone}</p>
                </div>
                <div className="flex gap-2 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(address._id)
                      setForm({
                        name: address.name,
                        companyName: address.companyName || '',
                        phone: address.phone,
                        addressLine1: address.addressLine1,
                        addressLine2: address.addressLine2 || '',
                        city: address.city,
                        state: address.state,
                        postalCode: address.postalCode,
                        country: address.country || 'India',
                        isDefault: Boolean(address.isDefault),
                      })
                      setTouched({})
                      setShowForm(true)
                    }}
                    className="p-2 rounded-lg border border-gray-200"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(address._id)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addressFields.map(([key, label, required]) => {
              const showRequired =
                required && Boolean(touched[key]) && !form[key].trim()
              const fieldClass = `w-full px-3.5 py-2.5 text-sm border rounded-lg ${
                showRequired ? 'border-red-300' : 'border-gray-200'
              }`
              return (
                <label key={key} className="block">
                  <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-gray-700">
                    <span>
                      {label}
                      {!required && (
                        <span className="ml-1 font-normal text-gray-400">(optional)</span>
                      )}
                    </span>
                    {showRequired && (
                      <span className="text-xs font-medium text-red-600">Required</span>
                    )}
                  </span>
                  {key === 'state' ? (
                    <StateSelect
                      value={form.state}
                      onChange={(state) => setForm((prev) => ({ ...prev, state }))}
                      onBlur={() => markTouched(key)}
                      error={showRequired}
                    />
                  ) : (
                    <input
                      value={form[key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      onBlur={() => markTouched(key)}
                      placeholder={label}
                      className={fieldClass}
                    />
                  )}
                </label>
              )
            })}
            <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              Set as default address
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void save()
                }}
                className="btn-pill-black px-4 py-2.5 text-sm rounded-lg"
              >
                {editingId ? 'Update Address' : 'Save Address'}
              </button>
              <button
                type="button"
                onClick={resetFormState}
                className="px-4 py-2.5 text-sm rounded-lg border border-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Container>
      </div>
      <Footer />

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => !deleting && setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return
          setDeleting(true)
          try {
            const token = await getAccessToken()
            if (!token) return
            await deleteAddress(token, deleteId)
            setDeleteId(null)
            await load()
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete address?"
        message="This address will be permanently removed from your account."
        confirmLabel="Delete Address"
        loading={deleting}
        irreversible
      />
    </div>
  )
}
