import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { authStorage } from '../lib/authStorage'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const {
    firebaseUser,
    completeEmailVerification,
    resendVerificationEmail,
    logout,
    getRedirectPath,
  } = useAuth()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const email = firebaseUser?.email || authStorage.getPendingEmail() || ''

  const handleVerified = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const result = await completeEmailVerification()
      navigate(getRedirectPath(result), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please verify your email before continuing.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await resendVerificationEmail()
      setSuccess('Verification email sent. Check your inbox.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout imageSrc="/images/signup-image-two.png">
      <div className="flex items-start justify-between px-6 md:px-12 lg:px-16 xl:px-20 pt-6 md:pt-8">
        <button
          type="button"
          onClick={async () => {
            await logout()
            navigate('/signup')
          }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center px-6 md:px-12 lg:px-16 xl:px-20 py-8 md:py-10 lg:py-12">
        <div className="w-full max-w-md">
          <div className="w-12 h-12 rounded-full bg-[#f5f3ef] border border-gray-200 flex items-center justify-center mb-6">
            <Mail size={20} className="text-gray-700" />
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-[32px] font-serif font-semibold text-black mb-2 leading-tight">
            Verify your email
          </h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            We sent a verification link to{' '}
            <span className="font-medium text-black">{email || 'your email'}</span>. Open your inbox
            and verify your account to continue. Also check Spam / Promotions.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="space-y-3">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noreferrer"
              className="btn-pill-black w-full py-3 text-sm rounded-lg inline-flex items-center justify-center"
            >
              Open Gmail
            </a>

            <button
              type="button"
              disabled={loading}
              onClick={handleVerified}
              className="w-full py-3 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              I&apos;ve Verified My Email
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleResend}
              className="w-full py-3 text-sm font-medium text-gray-700 hover:text-black transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={15} />
              Resend Verification Email
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Already verified?{' '}
            <Link to="/login" className="font-semibold text-black underline underline-offset-2 hover:opacity-70">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
