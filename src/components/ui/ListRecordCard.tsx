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
  const media = (
    <div className="relative w-20 sm:w-28 md:w-40 lg:w-52 shrink-0 min-h-[6.5rem] sm:min-h-[7.5rem] bg-[#f5f3ef] overflow-hidden rounded-l-xl">
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
    <article className="w-full rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex w-full items-stretch gap-0">
        {to ? (
          <Link to={to} className="shrink-0" onClick={onClick}>
            {media}
          </Link>
        ) : (
          media
        )}

        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-3 sm:p-4 md:p-5">
          <div className="min-w-0 flex-1">{children}</div>
          {aside ? (
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 shrink-0 w-full sm:w-auto sm:min-w-[120px] md:min-w-[140px] border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-6">
              {aside}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
