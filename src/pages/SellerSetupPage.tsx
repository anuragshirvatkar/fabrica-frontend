import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { AiOnboardingFlow } from '../components/onboarding/AiOnboardingFlow'
import { useAuth } from '../context/AuthContext'
import { setupSellerProfile } from '../lib/api'
import type { SellerSetupInput } from '../lib/sellerPreferences'

export function SellerSetupPage() {
  const navigate = useNavigate()
  const { user, logout, getAccessToken, markSellerSetupCompleted } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const access = await getAccessToken()
      setToken(access)
    })()
  }, [getAccessToken])

  const handleComplete = async (answers: Record<string, unknown>) => {
    const access = token || (await getAccessToken())
    if (!access) throw new Error('Please sign in again.')

    const address = (answers.address || {}) as {
      line1?: string
      city?: string
      state?: string
      pincode?: string
      country?: string
    }

    const payload: SellerSetupInput = {
      companyName: String(answers.companyName || ''),
      phone: String(answers.phone || ''),
      gst: String(answers.gst || ''),
      description: String(answers.description || ''),
      address: {
        line1: String(address.line1 || ''),
        city: String(address.city || ''),
        state: String(address.state || ''),
        pincode: String(address.pincode || ''),
        country: String(address.country || 'India'),
      },
      operatingHours: String(answers.operatingHours || ''),
      operatingHoursOther: String(answers.operatingHoursOther || ''),
      productCategories: Array.isArray(answers.productCategories)
        ? (answers.productCategories as string[])
        : [],
      fabricTypes: Array.isArray(answers.fabricTypes) ? (answers.fabricTypes as string[]) : [],
      moqRange: String(answers.moqRange || ''),
    }

    await setupSellerProfile(access, payload)
    markSellerSetupCompleted()
    navigate('/seller/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-xl font-semibold text-black tracking-wide">FABRICA</p>
            <p className="text-[10px] tracking-[0.2em] text-gray-500">SELLER SETUP</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-gray-500 truncate max-w-[180px]">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm text-gray-600 hover:text-black"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-4 md:py-5 flex flex-col">
        <AiOnboardingFlow
          role="SELLER"
          token={token}
          onComplete={handleComplete}
          headerSlot={
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1 mb-2">
                <Shield size={12} />
                AI-guided store setup · voice or tap
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-semibold text-black tracking-tight">
                Let’s open your store on Fabrica
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Tap chips, type, or use the mic — unclear answers get asked again.
              </p>
            </div>
          }
        />
      </main>
    </div>
  )
}
