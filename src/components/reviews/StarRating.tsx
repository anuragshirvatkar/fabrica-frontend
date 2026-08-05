import { Star } from 'lucide-react'

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  size?: number
  readOnly?: boolean
  className?: string
}

export function StarRating({
  value,
  onChange,
  size = 18,
  readOnly = false,
  className = '',
}: StarRatingProps) {
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value
        if (readOnly || !onChange) {
          return (
            <Star
              key={star}
              size={size}
              className={active ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
            />
          )
        }
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              size={size}
              className={active ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}
            />
          </button>
        )
      })}
    </div>
  )
}
