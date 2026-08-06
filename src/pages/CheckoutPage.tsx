import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MapPin, Plus } from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { PageBackLink } from '../components/ui/PageBackLink'
import { SuccessModal } from '../components/ui/SuccessModal'
import { StateSelect } from '../components/ui/StateSelect'
import { useAuth } from '../context/AuthContext'
import {
  createAddress,
  fetchAddresses,
  fetchCart,
  placeOrder,
  type Address,
  type ApiOrder,
} from '../lib/api'
import { formatNumber } from '../lib/format'

const emptyAddress = {
  name: '',
  companyName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: true,
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
type CheckoutStep = 'shipping' | 'review'

export function CheckoutPage() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<CheckoutStep>('shipping')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [form, setForm] = useState(emptyAddress)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [successOrder, setSuccessOrder] = useState<ApiOrder | null>(null)
  const [touched, setTouched] = useState<Partial<Record<AddressFieldKey, boolean>>>({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = await getAccessToken()
        if (!token) {
          navigate('/login')
          return
        }
        const [cartResult, addressResult] = await Promise.all([
          fetchCart(token),
          fetchAddresses(token),
        ])
        setItems(cartResult.cart.items || [])
        setAddresses(addressResult.addresses)
        const defaultAddress =
          addressResult.addresses.find((a) => a.isDefault) || addressResult.addresses[0]
        setSelectedAddressId(defaultAddress?._id || '')
        setShowForm(addressResult.addresses.length === 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load checkout')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [getAccessToken, navigate])

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = item.product as { price?: number } | undefined
        return sum + Number(product?.price || 0) * Number(item.quantity || 0)
      }, 0),
    [items],
  )

  const selectedAddress = useMemo(
    () => addresses.find((address) => address._id === selectedAddressId) || null,
    [addresses, selectedAddressId],
  )

  const saveAddress = async () => {
    setError('')
    const requiredKeys = addressFields.filter(([, , required]) => required).map(([key]) => key)
    setTouched((prev) => {
      const next = { ...prev }
      for (const key of requiredKeys) next[key] = true
      return next
    })
    if (requiredKeys.some((key) => !form[key].trim())) return

    try {
      const token = await getAccessToken()
      if (!token) return
      const result = await createAddress(token, form)
      setAddresses((prev) => [...prev, result.address])
      setSelectedAddressId(result.address._id)
      setShowForm(false)
      setForm(emptyAddress)
      setTouched({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address')
    }
  }

  const goToReview = () => {
    setError('')
    if (!selectedAddressId) {
      setError('Please select a shipping address')
      return
    }
    setStep('review')
  }

  const checkout = async () => {
    setPlacing(true)
    setError('')
    try {
      const token = await getAccessToken()
      if (!token) return
      if (!selectedAddressId) throw new Error('Please select a shipping address')
      const result = await placeOrder(token, { addressId: selectedAddressId })
      setSuccessOrder(result.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  const renderCartLines = () => (
    <div className="space-y-2.5 mb-4 max-h-56 overflow-y-auto">
      {items.map((raw) => {
        const item = raw as {
          _id?: string
          colorHex?: string
          quantity?: number
          product?: { name?: string; unit?: string; price?: number; image?: string }
        }
        return (
          <div key={String(item._id)} className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-md overflow-hidden bg-[#f5f3ef] shrink-0 relative">
              {item.product?.image ? (
                <img src={item.product.image} alt="" className="w-full h-full object-cover" />
              ) : null}
              {item.colorHex ? (
                <span
                  className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: item.colorHex }}
                  title={item.colorHex}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-black truncate">
                {item.product?.name || 'Fabric'}
              </p>
              <p className="text-[11px] text-gray-500">
                {item.quantity} {item.product?.unit || 'm'}
                {item.colorHex ? ` · ${item.colorHex}` : ''}
              </p>
            </div>
            <p className="text-xs font-medium text-black shrink-0">
              ₹{formatNumber(Number(item.product?.price || 0) * Number(item.quantity || 0))}
            </p>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-[#f9f9f9]">
      <div className="min-h-[calc(100dvh+14rem)] flex flex-col">
        <Navbar variant="solid" showActions fixed={false} />
        <Container className="flex-1 py-8 md:py-10 pb-36 md:pb-52">
          {step === 'review' ? (
            <button
              type="button"
              onClick={() => setStep('shipping')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black transition-colors mb-3"
            >
              <ArrowLeft size={16} />
              Back to shipping
            </button>
          ) : (
            <PageBackLink to="/cart" label="Back to cart" className="mb-3" />
          )}
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-black mb-1">
            Checkout
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            {step === 'shipping'
              ? 'Choose a shipping address, then review before placing.'
              : 'Confirm address and items, then place your order.'}
          </p>

          <div className="flex items-center gap-2 mb-6 text-xs font-medium">
            <span
              className={`px-2.5 py-1 rounded-full ${
                step === 'shipping' ? 'bg-black text-white' : 'bg-[#ece8e3] text-black'
              }`}
            >
              1. Shipping
            </span>
            <span className="text-gray-300">→</span>
            <span
              className={`px-2.5 py-1 rounded-full ${
                step === 'review' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              2. Review
            </span>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {loading ? (
            <p className="text-sm text-gray-500">Loading checkout...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">
              Your cart is empty.{' '}
              <Link to="/marketplace" className="underline">
                Browse products
              </Link>
            </p>
          ) : step === 'shipping' ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h2 className="font-serif text-xl font-semibold text-black">Shipping Address</h2>
                  {addresses.length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTouched({})
                        setShowForm(true)
                      }}
                      className="self-start inline-flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Plus size={14} /> Add address
                    </button>
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  {addresses.map((address) => (
                    <label
                      key={address._id}
                      className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${
                        selectedAddressId === address._id
                          ? 'border-black bg-[#fafafa]'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === address._id}
                        onChange={() => setSelectedAddressId(address._id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold text-black flex items-center gap-2">
                          <MapPin size={14} /> {address.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city},{' '}
                          {address.state} {address.postalCode}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{address.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {showForm && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-4">
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
                              onBlur={() => setTouched((prev) => ({ ...prev, [key]: true }))}
                              error={showRequired}
                            />
                          ) : (
                            <input
                              value={form[key]}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              onBlur={() => setTouched((prev) => ({ ...prev, [key]: true }))}
                              placeholder={label}
                              className={fieldClass}
                            />
                          )}
                        </label>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        void saveAddress()
                      }}
                      className="btn-pill-black px-4 py-2.5 text-sm rounded-lg sm:col-span-2"
                    >
                      Save Address
                    </button>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    to="/addresses"
                    className="text-sm text-gray-600 hover:text-black underline"
                  >
                    Manage addresses
                  </Link>
                </div>
              </section>

              <aside className="rounded-2xl border border-gray-200 bg-white p-5 h-fit lg:sticky lg:top-6">
                <p className="text-sm font-medium text-black mb-3">
                  Order summary · {items.length} item{items.length === 1 ? '' : 's'}
                </p>
                {renderCartLines()}
                <div className="flex justify-between text-sm mb-4 pt-3 border-t border-gray-100">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-black">₹{formatNumber(total)}</span>
                </div>
                <button
                  type="button"
                  disabled={!selectedAddressId}
                  onClick={goToReview}
                  className="btn-pill-black w-full py-3 text-sm rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  Continue to review
                  <ArrowRight size={16} />
                </button>
              </aside>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-black mb-3">
                    Review shipping
                  </h2>
                  {selectedAddress ? (
                    <div className="rounded-xl border border-gray-200 bg-[#fafafa] p-4">
                      <p className="text-sm font-semibold text-black flex items-center gap-2">
                        <MapPin size={14} /> {selectedAddress.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedAddress.addressLine1}
                        {selectedAddress.addressLine2
                          ? `, ${selectedAddress.addressLine2}`
                          : ''}
                        , {selectedAddress.city}, {selectedAddress.state}{' '}
                        {selectedAddress.postalCode}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{selectedAddress.phone}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">No address selected.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep('shipping')}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black"
                  >
                    <ArrowLeft size={14} />
                    Change address
                  </button>
                </div>

                <div>
                  <h2 className="font-serif text-xl font-semibold text-black mb-3">
                    Review items
                  </h2>
                  {renderCartLines()}
                </div>
              </section>

              <aside className="rounded-2xl border border-gray-200 bg-white p-5 h-fit lg:sticky lg:top-6">
                <p className="text-sm font-medium text-black mb-3">Confirm order</p>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-black">₹{formatNumber(total)}</span>
                </div>
                <button
                  type="button"
                  disabled={placing || !selectedAddressId}
                  onClick={() => {
                    void checkout()
                  }}
                  className="btn-pill-black w-full py-3 text-sm rounded-lg disabled:opacity-50"
                >
                  {placing ? 'Placing order...' : 'Place Order'}
                </button>
                <p className="text-[11px] text-gray-400 mt-2.5 leading-relaxed">
                  By placing, the seller is notified and your order starts as Pending.
                </p>
              </aside>
            </div>
          )}
        </Container>

        {!loading && items.length > 0 && (
          <div className="lg:hidden sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-base font-semibold text-black">₹{formatNumber(total)}</p>
              </div>
              {step === 'shipping' ? (
                <button
                  type="button"
                  disabled={!selectedAddressId}
                  onClick={goToReview}
                  className="btn-pill-black px-5 py-3 text-sm rounded-lg disabled:opacity-50 shrink-0"
                >
                  Review
                </button>
              ) : (
                <button
                  type="button"
                  disabled={placing || !selectedAddressId}
                  onClick={() => {
                    void checkout()
                  }}
                  className="btn-pill-black px-5 py-3 text-sm rounded-lg disabled:opacity-50 shrink-0"
                >
                  {placing ? 'Placing…' : 'Place Order'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />

      <SuccessModal
        open={Boolean(successOrder)}
        onClose={() => navigate('/orders')}
        title="Order placed"
        message={
          'Your order is pending seller acceptance.\nYou can track progress from Orders.'
        }
        secondaryLabel="View Order"
        onSecondary={() => navigate(`/orders/${successOrder?._id}`)}
        primaryLabel="Continue Shopping"
        onPrimary={() => navigate('/marketplace')}
      />
    </div>
  )
}
