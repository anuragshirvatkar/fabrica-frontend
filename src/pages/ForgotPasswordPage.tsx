import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout imageSrc="/images/signup-image-two.png">
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
            <Mail size={20} className="text-gray-700" />
          </div>

          {sent ? (
            <>
              <h1 className="text-2xl md:text-3xl lg:text-[32px] font-serif font-semibold text-black mb-2 leading-tight">
                Check your email
              </h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                We sent a password reset link to{' '}
                <span className="font-medium text-black">{email.trim()}</span>. Open the link to
                choose a new password. Also check Spam / Promotions.
              </p>
              <Link
                to="/login"
                className="btn-pill-black inline-flex justify-center w-full py-3 text-sm rounded-lg"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl lg:text-[32px] font-serif font-semibold text-black mb-2 leading-tight">
                Forgot password?
              </h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Enter the email for your Fabrica account. We&apos;ll send a link to reset your
                password.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-black mb-1.5">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your business email"
                      className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pill-black w-full py-3 text-sm rounded-lg disabled:opacity-60"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
