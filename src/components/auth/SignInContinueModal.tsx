import { useNavigate } from 'react-router-dom'
import { ShoppingBag, X } from 'lucide-react'
import { Modal } from '../ui/Modal'

type SignInContinueModalProps = {
  open: boolean
  onClose: () => void
}

export function SignInContinueModal({ open, onClose }: SignInContinueModalProps) {
  const navigate = useNavigate()

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

        <div className="mx-auto mb-5 w-14 h-14 rounded-full border border-gray-300 flex items-center justify-center">
          <ShoppingBag size={22} className="text-black" />
        </div>

        <h3 className="font-serif text-2xl md:text-[28px] font-semibold text-black mb-3">
          Sign in to Continue
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto mb-7">
          Create an account or sign in to add products to your cart, save favorites, and place
          orders securely.
        </p>

        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/signup')
          }}
          className="btn-pill-black w-full py-3 text-sm rounded-lg mb-2.5"
        >
          Create Account
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/login')
          }}
          className="w-full py-3 text-sm font-medium rounded-lg border border-gray-300 bg-white text-black hover:bg-[#f5f3ef]"
        >
          Sign In
        </button>

        <div className="flex items-center gap-3 my-5">
          <span className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ShoppingBag size={14} />
          Continue Browsing
        </button>
      </div>
    </Modal>
  )
}
