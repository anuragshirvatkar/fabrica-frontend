import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { StarRating } from './StarRating'
import type { ApiReview } from '../../lib/api'

type ReviewModalProps = {
  open: boolean
  onClose: () => void
  productName: string
  initial?: ApiReview | null
  saving?: boolean
  error?: string
  onSubmit: (data: { rating: number; review: string }) => Promise<void> | void
}

export function ReviewModal({
  open,
  onClose,
  productName,
  initial,
  saving = false,
  error = '',
  onSubmit,
}: ReviewModalProps) {
  const [rating, setRating] = useState(initial?.rating || 0)
  const [message, setMessage] = useState(initial?.review || '')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setRating(initial?.rating || 0)
    setMessage(initial?.review || '')
    setLocalError('')
  }, [open, initial?._id, initial?.rating, initial?.review])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (rating < 1 || rating > 5) {
      setLocalError('Please select a rating from 1 to 5')
      return
    }
    setLocalError('')
    await onSubmit({ rating, review: message.trim() })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit review' : 'Write a review'}
      description={productName}
      maxWidthClassName="max-w-md"
      disableClose={saving}
      closeOnBackdrop={!saving}
      showClose={!saving}
    >
      <form onSubmit={handleSubmit} className="px-6 md:px-8 pb-7 space-y-4">
        <div>
          <p className="text-sm font-medium text-black mb-2">Rating</p>
          <StarRating value={rating} onChange={setRating} size={28} />
        </div>

        <div>
          <label htmlFor="review-message" className="block text-sm font-medium text-black mb-2">
            Message
          </label>
          <textarea
            id="review-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Share your experience with this fabric…"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 resize-y min-h-[96px]"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/1000</p>
        </div>

        {(localError || error) && (
          <p className="text-sm text-red-600">{localError || error}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-black text-white hover:bg-black/90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Submit review'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
