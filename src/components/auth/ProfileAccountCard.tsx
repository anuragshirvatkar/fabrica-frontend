import { useMemo, useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getPasswordRuleStatus, isPasswordValid } from '../../lib/passwordRules'

const fieldClassName =
  'w-full pl-3.5 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden'

type ProfileAccountCardProps = {
  roleLabel: string
}

export function ProfileAccountCard({ roleLabel }: ProfileAccountCardProps) {
  const { user, changePassword } = useAuth()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const canChangePassword = user?.authProvider === 'LOCAL'
  const passwordRules = useMemo(() => getPasswordRuleStatus(newPassword), [newPassword])
  const passwordOk = isPasswordValid(newPassword)

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
    setError('')
    setSaved(false)
  }

  const closePassword = () => {
    setPasswordOpen(false)
    resetForm()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSaved(false)

    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    if (!passwordOk) {
      setError('Password must be at least 6 characters and include 1 number and 1 special character.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.')
      return
    }

    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      resetForm()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Account</p>
            <p className="text-sm font-medium text-black break-all">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              Role: {roleLabel}
              {user?.authProvider
                ? ` · Signed in with ${user.authProvider === 'GOOGLE' ? 'Google' : 'email'}`
                : ''}
            </p>
          </div>
          {canChangePassword && (
            <button
              type="button"
              onClick={() => {
                if (passwordOpen) {
                  closePassword()
                } else {
                  setPasswordOpen(true)
                  setSaved(false)
                  setError('')
                }
              }}
              className="shrink-0 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-[#f5f3ef]"
            >
              {passwordOpen ? 'Hide password form' : 'Change password'}
            </button>
          )}
        </div>
      </div>

      {canChangePassword && passwordOpen && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
          <h2 className="font-serif text-xl font-semibold text-black">Change password</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Update the password for your email sign-in account.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {saved && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 inline-flex items-center gap-2 mb-4">
              <Check size={15} />
              Password updated.
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-md">
            <div>
              <label
                htmlFor="current-password"
                className="block text-xs font-semibold text-black mb-1.5"
              >
                Current password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className={fieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700"
                  aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-black mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className={fieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700"
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
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
                htmlFor="confirm-new-password"
                className="block text-xs font-semibold text-black mb-1.5"
              >
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={fieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-pill-black px-5 py-2.5 text-sm rounded-lg disabled:opacity-60"
              >
                {saving ? 'Updating...' : 'Update password'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={closePassword}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-[#f5f3ef] disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
