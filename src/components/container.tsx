export function Container({
  children,
  className = '',
  wide = false,
}: {
  children: React.ReactNode
  className?: string
  /** Wider content band for list pages (addresses, favorites, etc.) */
  wide?: boolean
}) {
  return (
    <div className={`${wide ? 'container-wider' : 'container-wide'} ${className}`}>
      {children}
    </div>
  )
}
