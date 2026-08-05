export function SectionTitle({ 
  children, 
  subtitle,
  className = '' 
}: { 
  children: React.ReactNode
  subtitle?: string
  className?: string 
}) {
  return (
    <div className={`text-center mb-16 ${className}`}>
      <h2 className="text-5xl md:text-6xl font-display font-semibold mb-4 text-balance" style={{ color: '#111111' }}>
        {children}
      </h2>
      {subtitle && (
        <p className="text-lg max-w-2xl mx-auto" style={{ color: '#6E6E6E' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
