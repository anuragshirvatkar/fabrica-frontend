import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  title?: string
  description?: string
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  actionLabel?: string
  onAction?: () => void
  className?: string
  compact?: boolean
}

export function EmptyState({
  title = 'No data yet',
  description = 'There’s nothing to show here right now.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-gray-200 bg-[#fafafa] ${
        compact ? 'px-5 py-8' : 'px-6 py-12 md:py-16'
      } ${className}`}
    >
      <div
        className={`rounded-full bg-[#f5f3ef] border border-[#ece8e3] flex items-center justify-center mb-4 ${
          compact ? 'w-12 h-12' : 'w-14 h-14'
        }`}
      >
        <Icon size={compact ? 20 : 24} strokeWidth={1.5} className="text-gray-600" />
      </div>

      <h3 className={`font-serif font-semibold text-black mb-1.5 ${compact ? 'text-lg' : 'text-xl'}`}>
        {title}
      </h3>
      <p className={`text-sm text-gray-500 leading-relaxed max-w-sm ${compact ? 'mb-4' : 'mb-6'}`}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-pill-black px-5 py-2.5 text-sm rounded-lg"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
