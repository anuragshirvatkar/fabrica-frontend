import { useEffect } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  maxWidthClassName?: string
  showClose?: boolean
  closeOnBackdrop?: boolean
  disableClose?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClassName = 'max-w-lg',
  showClose = true,
  closeOnBackdrop = true,
  disableClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disableClose) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, disableClose, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => {
          if (closeOnBackdrop && !disableClose) onClose()
        }}
      />

      <div
        className={`relative w-full ${maxWidthClassName} max-h-[min(90dvh,720px)] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden`}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 px-5 md:px-7 py-4 md:py-5 border-b border-gray-100 bg-[#fafafa] shrink-0">
            <div className="min-w-0">
              {title && (
                <h2 className="font-serif text-xl md:text-2xl font-semibold text-black">{title}</h2>
              )}
              {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={disableClose}
                className="p-2 rounded-full hover:bg-[#ece8e3] text-gray-500 disabled:opacity-50 shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
