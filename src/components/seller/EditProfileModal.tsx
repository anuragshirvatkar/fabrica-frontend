import { useEffect, useState } from 'react'
import type { SellerProfile } from '../../lib/api'
import { Modal } from '../ui/Modal'

const MAX_DESCRIPTION_LENGTH = 300

type EditProfileModalProps = {
  open: boolean
  seller: SellerProfile
  email?: string | null
  saving?: boolean
  error?: string
  onClose: () => void
  onSave: (data: {
    companyName: string
    phone: string
    gst: string
    description: string
  }) => Promise<void> | void
}

export function EditProfileModal({
  open,
  seller,
  email,
  saving = false,
  error = '',
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [companyName, setCompanyName] = useState(seller.companyName)
  const [gst, setGst] = useState(seller.gst)
  const [phone, setPhone] = useState(seller.phone)
  const [description, setDescription] = useState(seller.description || '')

  useEffect(() => {
    if (!open) return
    setCompanyName(seller.companyName)
    setGst(seller.gst)
    setPhone(seller.phone)
    setDescription(seller.description || '')
  }, [open, seller])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      companyName: companyName.trim(),
      phone: phone.trim(),
      gst: gst.trim(),
      description: description.trim(),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      description="Update your business details"
      maxWidthClassName="max-w-3xl"
      disableClose={saving}
    >
      <form onSubmit={handleSubmit} className="px-5 md:px-7 py-5 md:py-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="edit-companyName" className="block text-xs font-semibold text-black mb-1.5">
              Business / Company Name
            </label>
            <input
              id="edit-companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label htmlFor="edit-gst" className="block text-xs font-semibold text-black mb-1.5">
              GST Number
            </label>
            <input
              id="edit-gst"
              type="text"
              required
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label htmlFor="edit-phone" className="block text-xs font-semibold text-black mb-1.5">
              Phone Number
            </label>
            <input
              id="edit-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="edit-email" className="block text-xs font-semibold text-black mb-1.5">
              Account Email
            </label>
            <input
              id="edit-email"
              type="email"
              value={email || ''}
              disabled
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="edit-description" className="block text-xs font-semibold text-black mb-1.5">
              Business Description
            </label>
            <div className="relative">
              <textarea
                id="edit-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-400">
                {description.length} / {MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-pill-black px-5 py-2.5 text-sm rounded-lg disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
