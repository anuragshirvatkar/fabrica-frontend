import { WifiOff } from 'lucide-react'

type ConnectionErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ConnectionErrorState({
  title = 'Connection lost',
  description = 'We can’t reach the Fabrica servers right now. Check your internet connection, or try again in a moment.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}: ConnectionErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 md:py-20 px-4 ${className}`}
      role="alert"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#f5f3ef] border border-gray-100 flex items-center justify-center mb-5">
        <WifiOff size={28} className="text-gray-500" strokeWidth={1.5} />
      </div>
      <h2 className="font-serif text-2xl font-semibold text-black mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="btn-pill-black px-5 py-2.5 text-sm inline-flex items-center justify-center"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
