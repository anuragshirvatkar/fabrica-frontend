import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Container } from './container'
import {
  Heart,
  ShoppingCart,
  ArrowLeft,
  MapPin,
  LogOut,
  ChevronDown,
  Package,
  Store,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchCart } from '../lib/api'
import { NotificationBell } from './notifications/NotificationBell'
import { HeaderSearch } from './marketplace/header-search'

type NavbarProps = {
  variant?: 'transparent' | 'solid'
  backTo?: string
  showActions?: boolean
  minimal?: boolean
  fixed?: boolean
  spacedLogo?: boolean
  showSearch?: boolean
  searchQuery?: string
}

function getAvatarLetter(email?: string | null, displayName?: string | null) {
  const name = displayName?.trim()
  if (name) return name[0].toUpperCase()
  if (email?.trim()) return email.trim()[0].toUpperCase()
  return 'U'
}

function UserMenu({
  isSolid,
  cartCount,
}: {
  isSolid: boolean
  cartCount: number
}) {
  const { user, firebaseUser, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const letter = getAvatarLetter(user?.email, firebaseUser?.displayName)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user) return null

  const itemClass =
    'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-[#f5f3ef] transition-colors'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 py-0.5 transition-colors ${
          isSolid ? 'hover:bg-gray-100' : 'hover:bg-white/10'
        }`}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
            isSolid ? 'bg-[#ece8e3] text-gray-800' : 'bg-white/20 text-white'
          }`}
        >
          {letter}
        </span>
        <ChevronDown
          size={14}
          className={isSolid ? 'text-gray-500' : 'text-white/80'}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50">
          <div className="px-3.5 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500">Signed in as</p>
            <p className="text-sm font-medium text-black truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link to="/profile" className={itemClass} onClick={() => setOpen(false)}>
              <UserRound size={15} />
              Profile
            </Link>
            <Link to="/marketplace" className={itemClass} onClick={() => setOpen(false)}>
              <Store size={15} />
              Marketplace
            </Link>
            <Link to="/cart" className={itemClass} onClick={() => setOpen(false)}>
              <ShoppingCart size={15} />
              Cart
              {cartCount > 0 && (
                <span className="ml-auto text-[11px] font-semibold bg-black text-white rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
            <Link to="/orders" className={itemClass} onClick={() => setOpen(false)}>
              <Package size={15} />
              Orders
            </Link>
            <Link to="/favorites" className={itemClass} onClick={() => setOpen(false)}>
              <Heart size={15} />
              Favourites
            </Link>
            <Link to="/addresses" className={itemClass} onClick={() => setOpen(false)}>
              <MapPin size={15} />
              Address
            </Link>
          </div>
          <div className="border-t border-gray-100 py-1">
            <button
              type="button"
              className={`${itemClass} text-red-600 hover:bg-red-50`}
              onClick={async () => {
                setOpen(false)
                await logout()
                navigate('/')
              }}
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Navbar({
  variant = 'transparent',
  backTo,
  showActions = false,
  minimal = false,
  fixed = true,
  spacedLogo = false,
  showSearch = false,
  searchQuery = '',
}: NavbarProps) {
  const { user, getAccessToken } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const isSolid = variant === 'solid'

  const textClass = isSolid ? 'text-black' : 'text-white'
  const positionClass = fixed ? 'fixed top-0 left-0 right-0 z-50' : 'relative'
  const iconClass = isSolid
    ? 'text-gray-700 hover:text-black hover:bg-gray-100'
    : 'text-white hover:bg-white/10'

  useEffect(() => {
    const loadCart = async () => {
      if (!user || user.role !== 'BUYER') {
        setCartCount(0)
        return
      }
      try {
        const token = await getAccessToken()
        if (!token) return
        const result = await fetchCart(token)
        setCartCount(result.cart.items?.length || 0)
      } catch {
        setCartCount(0)
      }
    }
    void loadCart()
  }, [user, getAccessToken])

  const barClassName = showSearch
    ? 'w-full flex flex-wrap md:flex-nowrap items-center gap-x-2 gap-y-2 min-h-16 md:h-[72px] py-2 md:py-0 px-4 sm:px-6 md:px-8 lg:px-10'
    : 'flex items-center justify-between gap-3 h-16 md:h-[72px]'

  const authDesktop = (
    <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
      {user ? (
        <>
          {showActions && !minimal && <NotificationBell className={iconClass} />}
          {(showActions || !minimal) && <UserMenu isSolid={isSolid} cartCount={cartCount} />}
        </>
      ) : (
        !minimal && (
          <>
            <Link
              to="/login"
              className={`text-sm font-medium hover:opacity-80 transition-opacity ${textClass}`}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className={
                isSolid
                  ? 'btn-pill-black px-5 py-2.5 text-sm'
                  : 'btn-pill-white px-5 py-2.5 text-sm'
              }
            >
              Sign up
            </Link>
          </>
        )
      )}
    </div>
  )

  const authMobile = (
    <div className="flex md:hidden items-center gap-2 shrink-0 ml-auto">
      {user ? (
        <>
          {showActions && !minimal && <NotificationBell className={iconClass} />}
          {(showActions || !minimal) && <UserMenu isSolid={isSolid} cartCount={cartCount} />}
        </>
      ) : (
        !minimal && (
          <>
            <Link
              to="/login"
              className={`text-sm font-medium hover:opacity-80 transition-opacity whitespace-nowrap ${textClass}`}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className={
                isSolid
                  ? 'btn-pill-black px-3.5 py-2 text-xs sm:text-sm whitespace-nowrap'
                  : 'btn-pill-white px-3.5 py-2 text-xs sm:text-sm whitespace-nowrap'
              }
            >
              Sign up
            </Link>
          </>
        )
      )}
    </div>
  )

  const barContent = (
    <>
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        {backTo && (
          <Link
            to={backTo}
            className={`p-1.5 -ml-1.5 rounded-full transition-colors ${isSolid ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <Link
          to="/"
          className={`font-semibold whitespace-nowrap ${textClass} ${
            spacedLogo
              ? 'text-sm sm:text-base md:text-lg tracking-[0.2em] sm:tracking-[0.35em]'
              : 'text-base sm:text-lg md:text-xl tracking-wide'
          }`}
        >
          FABRICA
        </Link>
      </div>

      {showSearch && (
        <div className="order-last md:order-none w-full md:w-auto md:flex-1 flex justify-center min-w-0 md:px-4 lg:px-6">
          <HeaderSearch initialQuery={searchQuery} className="w-full max-w-none md:max-w-md lg:max-w-lg" />
        </div>
      )}

      {authDesktop}
      {authMobile}
    </>
  )

  return (
    <nav className={`${isSolid ? 'bg-white border-b border-gray-100' : ''} ${positionClass}`}>
      {showSearch ? (
        <div className={barClassName}>{barContent}</div>
      ) : (
        <Container className={barClassName}>{barContent}</Container>
      )}
    </nav>
  )
}
