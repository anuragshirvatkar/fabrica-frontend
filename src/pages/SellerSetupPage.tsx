import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Sparkles, ArrowRight, Shield, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { setupSellerProfile } from '../lib/api'

const MAX_DESCRIPTION_LENGTH = 300

export function SellerSetupPage() {
  const navigate = useNavigate()
  const { user, logout, getAccessToken, markSellerSetupCompleted } = useAuth()

  const [companyName, setCompanyName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Please sign in again.')
      }

      await setupSellerProfile(token, {
        companyName: companyName.trim(),
        phone: phoneNumber.trim(),
        gst: gstNumber.trim(),
        description: description.trim(),
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
        <div className="text-center max-w-xl mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-gray-200 bg-white mb-4">
            <Store size={22} className="text-gray-800" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-black mb-3 inline-flex items-center gap-2 justify-center flex-wrap">
            Welcome to Fabrica!
            <Sparkles size={20} className="text-amber-500" />
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Let&apos;s complete your initial setup so you can start listing your products and reach
            buyers.
          </p>
        </div>

        <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-start gap-3 mb-6 md:mb-8">
            <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              1
            </span>
            <div>
              <h2 className="text-base font-semibold text-black">Initial Setup</h2>
              <p className="text-sm text-gray-500">Tell us about your business</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="companyName" className="block text-xs font-semibold text-black mb-1.5">
                  Business / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label htmlFor="gstNumber" className="block text-xs font-semibold text-black mb-1.5">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="gstNumber"
                  type="text"
                  required
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="Enter your GST number"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-xs font-semibold text-black mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-black mb-1.5">
                Business Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                  placeholder="Tell buyers about your products and business..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400 resize-none"
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-400">
                  {description.length} / {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-pill-black px-5 py-2.5 text-sm rounded-lg disabled:opacity-60 inline-flex items-center gap-2"
              >
                {loading ? 'Saving...' : 'Save & Continue'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </div>

        <p className="flex items-center gap-2 text-xs text-gray-400 mt-8 text-center">
          <Shield size={14} className="flex-shrink-0" />
          Your information is secure and will only be used to verify your business.
        </p>
      </main>
    </div>
  )
}
