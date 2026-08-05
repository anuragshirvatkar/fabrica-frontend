import { Check, ExternalLink, Sparkles, X } from 'lucide-react'
import { Modal } from './Modal'

type SuccessModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
  buttonLabel?: string
  secondaryLabel?: string
  onSecondary?: () => void
  primaryLabel?: string
  onPrimary?: () => void
}

export function SuccessModal({
  open,
  onClose,
  title = 'Success',
  message = 'Your changes have been saved.',
  buttonLabel = 'Continue',
  secondaryLabel,
  onSecondary,
  primaryLabel,
  onPrimary,
}: SuccessModalProps) {
  const hasDualActions = Boolean(secondaryLabel || primaryLabel)
  const lines = message.split('\n').filter(Boolean)

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      showClose={false}
      closeOnBackdrop
    >
      <div className="relative px-6 md:px-8 py-8 md:py-10 text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-[#f5f3ef] hover:text-gray-600"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="relative mx-auto mb-5 w-16 h-16 flex items-center justify-center">
          <span className="w-14 h-14 rounded-full border-2 border-black flex items-center justify-center">
            <Check size={28} strokeWidth={2.25} className="text-black" />
          </span>
          <span className="absolute -top-0.5 -right-0.5 text-emerald-500">
            <Sparkles size={18} fill="currentColor" />
          </span>
        </div>

        <h3 className="font-serif text-2xl md:text-[28px] font-semibold text-black mb-3">
          {title}
        </h3>
        <div className="w-12 h-px bg-gray-200 mx-auto mb-4" />
        <div className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto mb-7 space-y-0.5">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {hasDualActions ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
            {secondaryLabel && (
              <button
                type="button"
                onClick={onSecondary || onClose}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-black hover:bg-[#f5f3ef]"
              >
                {secondaryLabel}
                <ExternalLink size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onPrimary || onClose}
              className="btn-pill-black px-5 py-2.5 text-sm rounded-lg"
            >
              {primaryLabel || buttonLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="btn-pill-black px-6 py-2.5 text-sm rounded-lg min-w-[140px]"
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </Modal>
  )
}
