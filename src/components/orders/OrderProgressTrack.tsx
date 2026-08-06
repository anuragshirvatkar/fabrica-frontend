import { ORDER_FLOW, ORDER_STATUS_LABELS, type OrderStatus } from '../../lib/orderStatuses'

const SHORT_LABELS: Record<(typeof ORDER_FLOW)[number], string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_DISPATCH: 'Ready',
  COMPLETED: 'Completed',
}

type OrderProgressTrackProps = {
  status: OrderStatus
  title?: string
  className?: string
  hint?: string
}

export function OrderProgressTrack({
  status,
  title = 'Progress',
  className = '',
  hint,
}: OrderProgressTrackProps) {
  const activeIndex = Math.max(
    0,
    ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]),
  )
  const isComplete = status === 'COMPLETED'

  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 md:p-6 ${className}`}>
      {title ? <h2 className="font-serif text-xl font-semibold text-black mb-7">{title}</h2> : null}

      <ol className="flex items-start w-full">
        {ORDER_FLOW.map((step, index) => {
          const reached = index <= activeIndex
          const current = index === activeIndex
          const segmentDone = index < activeIndex
          const segmentInTransit = current && !isComplete && index < ORDER_FLOW.length - 1

          return (
            <li
              key={step}
              className={`flex items-start min-w-0 ${index === ORDER_FLOW.length - 1 ? '' : 'flex-1'}`}
            >
              <div className="flex flex-col items-center w-[4.5rem] sm:w-[5.5rem] shrink-0 -ml-1 first:ml-0">
                <span
                  className={`relative z-[1] flex items-center justify-center rounded-full border-2 transition-colors ${
                    current
                      ? 'w-6 h-6 sm:w-7 sm:h-7 border-black bg-black ring-[5px] ring-black/10'
                      : reached
                        ? 'w-5 h-5 sm:w-6 sm:h-6 border-black bg-black'
                        : 'w-5 h-5 sm:w-6 sm:h-6 border-gray-300 bg-white'
                  }`}
                  aria-current={current ? 'step' : undefined}
                  title={ORDER_STATUS_LABELS[step]}
                >
                  {reached && (
                    <span
                      className={`rounded-full bg-white ${current ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}
                    />
                  )}
                </span>
                <span
                  className={`mt-2.5 text-[11px] sm:text-xs leading-snug font-medium text-center px-0.5 ${
                    reached ? 'text-black' : 'text-gray-400'
                  }`}
                >
                  <span className="sm:hidden">{SHORT_LABELS[step]}</span>
                  <span className="hidden sm:inline">{ORDER_STATUS_LABELS[step]}</span>
                </span>
              </div>

              {index < ORDER_FLOW.length - 1 && (
                <div
                  className="relative flex-1 h-[2px] mt-[11px] sm:mt-[12px] mx-0.5 rounded-full bg-gray-200 overflow-hidden"
                  aria-hidden
                >
                  {segmentDone && <div className="absolute inset-0 bg-black" />}
                  {segmentInTransit && (
                    <div className="absolute inset-y-0 left-0 h-full w-full origin-left animate-metro-progress bg-black" />
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {hint ? <p className="text-xs text-gray-500 mt-6">{hint}</p> : null}
    </section>
  )
}
