import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type ListRecordCardProps = {
  to?: string
  image?: string | null
  imageAlt?: string
  imageFallback?: ReactNode
  imageBadge?: ReactNode
  children: ReactNode
  aside?: ReactNode
  onClick?: () => void
}

export function ListRecordCard({
  to,
  image,
  imageAlt = '',
  imageFallback,
  imageBadge,
  children,
  aside,
  onClick,
}: ListRecordCardProps) {
  const mediaDesktop = (
    <div className="relative w-28 md:w-40 lg:w-52 shrink-0 self-stretch min-h-[7.5rem] bg-[#f5f3ef] overflow-hidden rounded-l-xl">
      {image ? (
        <img src={image} alt={imageAlt} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          {imageFallback}
        </div>
      )}
      {imageBadge}
    </div>
  )

  const mediaMobile = (
    <div className="relative w-[5.5rem] h-[5.5rem] shrink-0 rounded-lg bg-[#f5f3ef] overflow-hidden">
      {image ? (
        <img src={image} alt={imageAlt} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          {imageFallback}
        </div>
      )}
      {imageBadge}
    </div>
  )

  return (
    <article className="w-full min-w-0 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
      {/* Mobile: compact row — image + stacked details/price, no sparse footer */}
      <div className="flex sm:hidden gap-3 p-3">
        {to ? (
          <Link to={to} className="shrink-0" onClick={onClick}>
            {mediaMobile}
          </Link>
        ) : (
          mediaMobile
        )}
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div className="min-w-0">{children}</div>
          {aside ? (
            <div className="flex items-end justify-between gap-2 pt-1">{aside}</div>
          ) : null}
        </div>
      </div>

      {/* sm+: horizontal list row */}
      <div className="hidden sm:flex w-full min-w-0 items-stretch gap-0">
        {to ? (
          <Link to={to} className="shrink-0" onClick={onClick}>
            {mediaDesktop}
          </Link>
        ) : (
          mediaDesktop
        )}

        <div className="min-w-0 flex-1 flex flex-row items-center gap-6 p-4 md:p-5">
          <div className="min-w-0 flex-1">{children}</div>
          {aside ? (
            <div className="flex flex-col items-end justify-center gap-2 shrink-0 min-w-[120px] md:min-w-[140px] border-l border-gray-100 pl-6">
              {aside}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
