import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, Eye, EyeOff, ShoppingCart, Store } from 'lucide-react'
import { AuthLayout, GoogleIcon } from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../lib/api'

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

export function LoginPage() {
  const navigate = useNavigate()
  const { loginWithEmail, loginWithGoogle, getRedirectPath, logout } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsRole, setNeedsRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const finishAuth = (result: Parameters<typeof getRedirectPath>[0]) => {
    navigate(getRedirectPath(result), { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await loginWithEmail(email.trim(), password)
      finishAuth(result)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', { replace: true })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (role?: UserRole) => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithGoogle(role)
      finishAuth(result)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'ROLE_REQUIRED') {
        // New Google account — must pick Buyer/Seller before we create the user.
        setNeedsRole(true)
        setSelectedRole(null)
        setError('')
      } else {
        setError(err instanceof Error ? err.message : 'Google sign-in failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmRole = async () => {
    if (!selectedRole) return
    await handleGoogle(selectedRole)
  }

  const handleCancelRole = async () => {
    setNeedsRole(false)
    setSelectedRole(null)
    setError('')
    try {
      await logout()
    } catch {
      // ignore
    }
  }

  return (
    <AuthLayout imageSrc="/images/signup-image-one.png">
      <div className="flex items-start justify-between px-6 md:px-12 lg:px-16 xl:px-20 pt-6 md:pt-8">
        {needsRole ? (
          <button
            type="button"
            onClick={() => void handleCancelRole()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </Link>
        )}
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center px-6 md:px-12 lg:px-16 xl:px-20 py-8 md:py-10 lg:py-12">
        <div className={`w-full ${needsRole ? 'max-w-[480px]' : 'max-w-md'}`}>
          {needsRole ? (
            <>
              <h1 className="text-2xl md:text-3xl lg:text-[32px] font-serif font-semibold text-black mb-2 leading-tight">
                What describes you the best?
              </h1>
              <p className="text-sm text-gray-500 mb-8 md:mb-10">
                This Google account is new to Fabrica. Choose Buyer or Seller to finish creating
                your account — you can&apos;t continue without this.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {roleOptions.map(({ id, title, description, icon: Icon }) => {
                  const isSelected = selectedRole === id
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={loading}
                      onClick={() => setSelectedRole(id)}
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
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={!selectedRole || loading}
                onClick={() => void handleConfirmRole()}
                className="btn-pill-black w-full py-3 text-sm rounded-lg mt-6 disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Continue'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-6">
                Prefer email signup?{' '}
                <button
                  type="button"
                  onClick={() => void handleCancelRole().then(() => navigate('/signup'))}
                  className="font-semibold text-black underline underline-offset-2 hover:opacity-70"
                >
                  Go to Sign up
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl lg:text-[32px] font-serif font-semibold text-black mb-2 leading-tight">
                Welcome back
              </h1>
              <p className="text-sm text-gray-500 mb-8">Sign in to continue to Fabrica.</p>

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
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
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
                  <div className="mt-2 flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-gray-600 hover:text-black underline underline-offset-2"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pill-black w-full py-3 text-sm rounded-lg mt-2 disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
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
                onClick={() => void handleGoogle()}
                className="w-full flex items-center justify-center gap-2.5 py-3 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="text-center text-sm text-gray-500 mt-8">
                Don&apos;t have an account?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-black underline underline-offset-2 hover:opacity-70"
                >
                  Sign up
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
