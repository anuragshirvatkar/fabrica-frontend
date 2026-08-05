import { AlertTriangle, X } from 'lucide-react'
import { useEffect } from 'react'

type ConfirmModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  irreversible?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  irreversible = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [open, loading, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        disabled={loading}
        onClick={() => {
          if (!loading) onClose()
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] border border-black/5 overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-red-700 via-red-500 to-[#c4a484]" />

        <div className="relative px-5 sm:px-7 pt-6 pb-2">
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-black hover:bg-[#f5f3ef] transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex flex-col items-center text-center sm:items-start sm:text-left sm:flex-row sm:gap-4">
            <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100 flex items-center justify-center shrink-0 mb-3 sm:mb-0">
              <AlertTriangle size={22} strokeWidth={2} />
            </span>
            <div className="min-w-0 pr-6">
              <h3
                id="confirm-modal-title"
                className="font-serif text-2xl font-semibold text-black tracking-tight"
              >
                {title}
              </h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
              {irreversible && (
                <p className="inline-flex items-center mt-3 text-xs font-semibold uppercase tracking-wide text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                  Cannot be undone
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 px-5 sm:px-7 py-4 bg-[#faf8f5] border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-white hover:border-gray-300 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/25 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
