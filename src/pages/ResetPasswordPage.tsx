import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { getPasswordRuleStatus, isPasswordValid } from '../lib/passwordRules'

const fieldClassName =
  'w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { verifyPasswordReset, completePasswordReset } = useAuth()

  const oobCode = searchParams.get('oobCode') || ''
  const mode = searchParams.get('mode')

  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(true)
  const [linkError, setLinkError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const passwordRules = useMemo(() => getPasswordRuleStatus(newPassword), [newPassword])
  const passwordOk = isPasswordValid(newPassword)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!oobCode || (mode && mode !== 'resetPassword')) {
        if (!cancelled) {
          setLinkError('This password reset link is invalid. Please request a new one.')
          setChecking(false)
        }
        return
      }

      try {
        const accountEmail = await verifyPasswordReset(oobCode)
        if (!cancelled) {
          setEmail(accountEmail)
          setLinkError('')
        }
      } catch (err) {
        if (!cancelled) {
          setLinkError(err instanceof Error ? err.message : 'This reset link is invalid.')
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [oobCode, mode, verifyPasswordReset])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!passwordOk) {
      setError('Password must be at least 6 characters and include 1 number and 1 special character.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await completePasswordReset(oobCode, newPassword)
      setDone(true)
      window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout imageSrc="/images/signup-image-one.png">
      <div className="flex items-start justify-between px-6 md:px-12 lg:px-16 xl:px-20 pt-6 md:pt-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft size={18} />
          Back to sign in
        </Link>
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center px-6 md:px-12 lg:px-16 xl:px-20 py-8 md:py-10 lg:py-12">
        <div className="w-full max-w-md">
          <div className="w-12 h-12 rounded-full bg-[#f5f3ef] border border-gray-200 flex items-center justify-center mb-6">
            <Lock size={20} className="text-gray-700" />
          </div>

          {checking ? (
            <p className="text-sm text-gray-500">Verifying reset link…</p>
          ) : linkError ? (
            <>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold text-black mb-2">
                Link not valid
              </h1>
              <p className="text-sm text-red-700 mb-6">{linkError}</p>
              <Link
                to="/forgot-password"
                className="btn-pill-black inline-flex justify-center w-full py-3 text-sm rounded-lg"
              >
                Request a new link
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold text-black mb-2">
                Password updated
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been changed. Redirecting you to sign in…
              </p>
              <Link
                to="/login"
                className="btn-pill-black inline-flex justify-center w-full py-3 text-sm rounded-lg"
              >
                Sign in now
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold text-black mb-2">
                Choose a new password
              </h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Set a new password for{' '}
                <span className="font-medium text-black">{email}</span>.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-semibold text-black mb-1.5"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className={fieldClassName}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700"
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPassword ? (
                    <ul className="mt-2 space-y-1">
                      {passwordRules.map((rule) => (
                        <li
                          key={rule.id}
                          className={`text-xs ${rule.met ? 'text-emerald-700' : 'text-gray-500'}`}
                        >
                          {rule.met ? '✓' : '○'} {rule.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-semibold text-black mb-1.5"
                  >
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className={fieldClassName}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pill-black w-full py-3 text-sm rounded-lg disabled:opacity-60"
                >
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
