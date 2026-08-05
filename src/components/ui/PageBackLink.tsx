import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PageBackLink({
  to,
  label = 'Back',
  className = '',
}: {
  to: string
  label?: string
  className?: string
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black transition-colors ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </Link>
  )
}
