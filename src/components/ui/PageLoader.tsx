type PageLoaderProps = {
  label?: string
  fullScreen?: boolean
  className?: string
}

/** Premium full-page / inline loader matching Fabrica’s black / stone aesthetic. */
export function PageLoader({
  label = 'Loading',
  fullScreen = false,
  className = '',
}: PageLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen ? 'min-h-screen bg-[#f9f9f9]' : 'py-16'
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-5">
        <p className="font-semibold tracking-[0.35em] text-sm md:text-base text-black">
          FABRICA
        </p>

        <div className="relative w-28 h-[2px] rounded-full bg-[#ece8e3] overflow-hidden">
          <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-black animate-fabrica-loader" />
        </div>

        <p className="text-xs text-gray-500 tracking-wide">{label}</p>
      </div>
    </div>
  )
}
