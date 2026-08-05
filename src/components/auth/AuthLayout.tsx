type AuthLayoutProps = {
  imageSrc: string
  children: React.ReactNode
}

export function AuthLayout({ imageSrc, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <div className="relative h-40 sm:h-52 lg:h-auto lg:min-h-screen lg:w-[45%] lg:max-w-[580px] xl:max-w-[620px] flex-shrink-0">
        <img
          src={imageSrc}
          alt="Premium textile fabrics"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10 lg:bg-gradient-to-r lg:from-black/25 lg:via-transparent lg:to-transparent" />
      </div>
      <div className="flex-1 flex flex-col bg-white min-h-0 min-w-0">{children}</div>
    </div>
  )
}

export function GoogleIcon() {
  return (
    <span className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
      G
    </span>
  )
}
