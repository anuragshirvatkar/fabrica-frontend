import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { AiOnboardingFlow } from '../components/onboarding/AiOnboardingFlow'
import { useAuth } from '../context/AuthContext'
import { setupBuyerProfile } from '../lib/api'
import type { BuyerSetupInput } from '../lib/buyerPreferences'

export function BuyerSetupPage() {
  const navigate = useNavigate()
  const { user, logout, getAccessToken, markBuyerSetupCompleted } = useAuth()
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

    const payload: BuyerSetupInput = {
      businessType: String(answers.businessType || ''),
      businessTypeOther: String(answers.businessTypeOther || ''),
      industry: String(answers.industry || ''),
      industryOther: String(answers.industryOther || ''),
      interests: Array.isArray(answers.interests) ? (answers.interests as string[]) : [],
      preferredFabrics: Array.isArray(answers.preferredFabrics)
        ? (answers.preferredFabrics as string[])
        : [],
      typicalOrderQuantity: String(answers.typicalOrderQuantity || ''),
      budgetRange: String(answers.budgetRange || ''),
    }

    await setupBuyerProfile(access, payload)
    markBuyerSetupCompleted()
    navigate('/marketplace', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-xl font-semibold text-black tracking-wide">FABRICA</p>
            <p className="text-[10px] tracking-[0.2em] text-gray-500">BUYER SETUP</p>
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
          role="BUYER"
          token={token}
          onComplete={handleComplete}
          headerSlot={
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1 mb-2">
                <Shield size={12} />
                AI-guided setup · voice or tap
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-semibold text-black tracking-tight">
                Let’s personalize Fabrica for you
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Tap an option, type, or use the mic — unclear answers get asked again.
              </p>
            </div>
          }
        />
      </main>
    </div>
  )
}
