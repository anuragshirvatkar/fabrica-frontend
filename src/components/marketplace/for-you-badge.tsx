type ForYouBadgeProps = {
  reason?: string
  className?: string
}

/** Compact “Picked for you” pill — width stays on the title; reason wraps below. */
export function ForYouBadge({ reason, className = '' }: ForYouBadgeProps) {
  const detail = String(reason || '').trim() || 'Matches your preferred fabrics'

  return (
    <span
      className={`group/foryou inline-flex origin-top-left flex-col rounded-2xl bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md ${className}`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <span className="text-[10px] font-semibold tracking-wide text-gray-800 whitespace-nowrap">
        Picked for you
      </span>
      <span className="grid w-0 min-w-full grid-rows-[0fr] opacity-0 transition-all duration-200 ease-out group-hover/foryou:mt-0.5 group-hover/foryou:grid-rows-[1fr] group-hover/foryou:opacity-100">
        <span className="min-h-0 overflow-hidden">
          <span className="block text-[9px] font-normal leading-snug text-gray-500 line-clamp-2">
            {detail}
          </span>
        </span>
      </span>
    </span>
  )
}
