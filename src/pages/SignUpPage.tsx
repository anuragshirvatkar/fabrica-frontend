import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ShoppingCart,
  Store,
  ChevronRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react'
import { AuthLayout, GoogleIcon } from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../lib/api'
import { getPasswordRuleStatus, isPasswordValid } from '../lib/passwordRules'

const passwordFieldClassName =
  'w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden'

const roleOptions = [
  {
    id: 'BUYER' as const,
    title: 'Buyer',
    description: 'I want to discover and purchase fabrics from trusted suppliers.',
    icon: ShoppingCart,
  },
  {
    id: 'SELLER' as const,
    title: 'Seller',
    description: 'I want to showcase and sell my fabrics to buyers worldwide.',
    icon: Store,
  },
]

type Step = 1 | 2

function StepProgress({ step }: { step: Step }) {
  return (
    <div className="text-right">
      <p className="text-xs text-gray-500 mb-2">Step {step} of 2</p>
      <div className="flex gap-1.5 justify-end">
        <span className={`h-1 w-10 rounded-full ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`} />
        <span className={`h-1 w-10 rounded-full ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`} />
      </div>
    </div>
  )
}

function SignUpFormStep({ onBack, role }: { onBack: () => void; role: UserRole }) {
  const navigate = useNavigate()
  const { registerWithEmail, loginWithGoogle, getRedirectPath } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordRules = useMemo(() => getPasswordRuleStatus(password), [password])
  const passwordOk = isPasswordValid(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!passwordOk) {
      setError('Password must be at least 6 characters and include 1 number and 1 special character.')
      return
    }

    setLoading(true)
    try {
      await registerWithEmail(email.trim(), password, role)
      navigate('/verify-email', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithGoogle(role)
      navigate(getRedirectPath(result), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between px-6 md:px-12 lg:px-16 xl:px-20 pt-6 md:pt-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <StepProgress step={2} />
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center px-6 md:px-12 lg:px-16 xl:px-20 py-8 md:py-10 lg:py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl md:text-3xl lg:text-[32px] font-serif font-semibold text-black mb-2 leading-tight">
            Create your account
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Enter your details to get started with Fabrica.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-black mb-1.5">
                Business Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your business email"
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-black mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  aria-describedby={password.length > 0 ? 'password-requirements' : undefined}
                  className={passwordFieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div
                  id="password-requirements"
                  className="mt-3 rounded-xl border border-gray-200 bg-[#faf9f7] px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Password must include
                    </p>
                    <p className="text-[11px] tabular-nums text-gray-400">
                      {passwordRules.filter((rule) => rule.met).length}/{passwordRules.length}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {passwordRules.map((rule) => (
                      <li key={rule.id} className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            rule.met
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-gray-300 bg-white text-transparent'
                          }`}
                          aria-hidden
                        >
                          <Check size={10} strokeWidth={3} />
                        </span>
                        <span
                          className={`text-xs transition-all ${
                            rule.met
                              ? 'text-gray-400 line-through decoration-gray-400'
                              : 'text-gray-700'
                          }`}
                        >
                          {rule.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-black mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={passwordFieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="mt-2 text-xs text-red-600">Passwords do not match.</p>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && passwordOk && (
                <p className="mt-2 text-xs text-emerald-700">Passwords match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordOk}
              className="btn-pill-black w-full py-3 text-sm rounded-lg mt-2 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <span className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 py-3 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-black underline underline-offset-2 hover:opacity-70">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

function RoleSelectStep({
  selectedRole,
  onSelectRole,
}: {
  selectedRole: UserRole | null
  onSelectRole: (id: UserRole) => void
}) {
  return (
    <>
      <div className="flex items-start justify-between px-6 md:px-12 lg:px-16 xl:px-20 pt-6 md:pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </Link>
        <StepProgress step={1} />
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center px-6 md:px-12 lg:px-16 xl:px-20 py-8 md:py-10 lg:py-12">
        <div className="w-full max-w-[480px]">
          <h1 className="text-2xl md:text-3xl lg:text-[32px] font-serif font-semibold text-black mb-2 leading-tight">
            What describes you the best?
          </h1>
          <p className="text-sm text-gray-500 mb-8 md:mb-10">
            Choose the option that best matches your business on Fabrica.
          </p>

          <div className="space-y-4">
            {roleOptions.map(({ id, title, description, icon: Icon }) => {
              const isSelected = selectedRole === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectRole(id)}
                  className={`w-full text-left rounded-xl p-5 md:p-6 transition-all border ${
                    isSelected
                      ? 'bg-[#ece8e3] border-gray-300 shadow-sm'
                      : 'bg-[#f5f3ef] border-transparent hover:border-gray-200 hover:bg-[#ece8e3]/80'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/80 border border-gray-200/60 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-gray-700" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <h2 className="font-serif text-lg font-semibold text-black pb-2 mb-3 border-b border-gray-300/70 inline-block min-w-[80px]">
                        {title}
                      </h2>
                      <p className="text-sm text-gray-600 leading-relaxed pr-2">{description}</p>
                    </div>

                    <ChevronRight size={18} className="text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export function SignUpPage() {
  const [step, setStep] = useState<Step>(1)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const handleSelectRole = (id: UserRole) => {
    setSelectedRole(id)
    setStep(2)
  }

  const imageSrc = step === 1 ? '/images/signup-image-one.png' : '/images/signup-image-two.png'

  return (
    <AuthLayout imageSrc={imageSrc}>
      {step === 1 ? (
        <RoleSelectStep selectedRole={selectedRole} onSelectRole={handleSelectRole} />
      ) : (
        selectedRole && <SignUpFormStep onBack={() => setStep(1)} role={selectedRole} />
      )}
    </AuthLayout>
  )
}
