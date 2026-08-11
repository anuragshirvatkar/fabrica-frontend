import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchSellerProfile, type SellerProfile } from '../../lib/api'
import { Footer } from '../footer'
import { NotificationBell } from '../notifications/NotificationBell'

const navItems: Array<{
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  soon?: boolean
}> = [
  { to: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/seller/profile', label: 'Profile', icon: UserRound },
  { to: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/seller/products', label: 'Products', icon: Package },
  { to: '/seller/drafts', label: 'Drafts', icon: FileText },
  { to: '/seller/payments', label: 'Payments', icon: CreditCard },
]

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'S'
}

export function SellerShell({
  children,
  seller: sellerProp,
}: {
  children: React.ReactNode
  seller?: SellerProfile | null
}) {
  const { user, logout, getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [seller, setSeller] = useState<SellerProfile | null>(sellerProp ?? null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sellerProp !== undefined) {
      setSeller(sellerProp)
      return
    }

    const load = async () => {
      try {
        const token = await getAccessToken()
        if (!token) return
        const result = await fetchSellerProfile(token)
        setSeller(result.seller)
      } catch {
        setSeller(null)
      }
    }
    load()
  }, [getAccessToken, sellerProp])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = getInitials(seller?.companyName, user?.email)

  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="hidden lg:flex w-[232px] shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="h-16 px-5 flex items-center border-b border-gray-200/80">
          <Link to="/seller/dashboard" className="brand-mark text-xl">
            FABRICA
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end, soon }) =>
            soon ? (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                title="Coming soon"
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{label}</span>
              </div>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[#ece8e3] text-black font-semibold'
                      : 'text-gray-600 hover:bg-[#f0eee9] hover:text-black'
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{label}</span>
              </NavLink>
            ),
          )}
        </nav>

        <div className="px-3 pb-5">
          <button
            type="button"
            onClick={async () => {
              await logout()
              navigate('/')
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-[#f0eee9] hover:text-black transition-colors"
          >
            <LogOut size={18} strokeWidth={1.6} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 lg:px-8">
          <Link to="/seller/dashboard" className="lg:hidden brand-mark text-lg">
            FABRICA
          </Link>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2 md:gap-3">
            <NotificationBell className="text-gray-600 hover:bg-[#f5f3ef]" />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-[#f5f3ef] transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-[#ece8e3] text-sm font-semibold text-gray-800 flex items-center justify-center">
                  {initials}
                </span>
                <span className="hidden sm:flex flex-col items-start text-left leading-tight">
                  <span className="text-sm font-semibold text-black max-w-[160px] truncate">
                    {seller?.companyName || 'Seller Store'}
                  </span>
                  <span className="text-xs text-gray-500">Seller</span>
                </span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-lg py-1.5 z-30">
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false)
                      await logout()
                      navigate('/')
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-[#f5f3ef]"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="lg:hidden border-b border-gray-200 bg-white px-2 py-2 flex gap-1 overflow-x-auto scrollbar-none snap-x">
          {navItems.map(({ to, label, icon: Icon, end, soon }) =>
            soon ? (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-400 whitespace-nowrap snap-start"
              >
                <Icon size={15} />
                {label}
              </span>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap snap-start ${
                    isActive ? 'bg-[#ece8e3] text-black font-semibold' : 'text-gray-600'
                  }`
                }
              >
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ),
          )}
        </div>

        {/* Just enough height that the footer sits below the fold, without a huge empty scroll */}
        <div className="flex-1 w-full min-w-0 min-h-[calc(100dvh-4rem)] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 md:py-8 pb-10 md:pb-12">
          {children}
        </div>
        <Footer showMarketplace={false} />
      </div>
    </div>
  )
}
