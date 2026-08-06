import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../lib/api'
import { PageLoader } from '../ui/PageLoader'

type ProtectedRouteProps = {
  children: React.ReactNode
  roles?: UserRole[]
  /** Kept for route clarity; incomplete sellers are always redirected to setup */
  requireCompletedSellerSetup?: boolean
  /** When true, buyers without onboarding prefs are redirected to setup */
  requireCompletedBuyerSetup?: boolean
}

export function ProtectedRoute({
  children,
  roles,
  requireCompletedSellerSetup: _requireCompletedSellerSetup = false,
  requireCompletedBuyerSetup = false,
}: ProtectedRouteProps) {
  const { user, loading, sellerSetupCompleted, buyerSetupCompleted, getRedirectPath } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader fullScreen label="Loading your account" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Navigate
        to={getRedirectPath({ user, sellerSetupCompleted, buyerSetupCompleted })}
        replace
      />
    )
  }

  // Incomplete seller profile is compulsory — block every route except setup.
  if (
    user.role === 'SELLER' &&
    !sellerSetupCompleted &&
    location.pathname !== '/seller/setup'
  ) {
    return <Navigate to="/seller/setup" replace />
  }

  if (user.role === 'SELLER' && location.pathname === '/seller/setup' && sellerSetupCompleted) {
    return <Navigate to="/seller/dashboard" replace />
  }

  if (user.role === 'BUYER' && requireCompletedBuyerSetup && !buyerSetupCompleted) {
    return <Navigate to="/buyer/setup" replace />
  }

  if (user.role === 'BUYER' && location.pathname === '/buyer/setup' && buyerSetupCompleted) {
    return <Navigate to="/marketplace" replace />
  }

  return <>{children}</>
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, sellerSetupCompleted, buyerSetupCompleted, getRedirectPath } = useAuth()

  if (loading) {
    return <PageLoader fullScreen label="Loading" />
  }

  if (user) {
    return (
      <Navigate
        to={getRedirectPath({ user, sellerSetupCompleted, buyerSetupCompleted })}
        replace
      />
    )
  }

  return <>{children}</>
}

export function VerifyEmailRoute({ children }: { children: React.ReactNode }) {
  const {
    user,
    firebaseUser,
    loading,
    sellerSetupCompleted,
    buyerSetupCompleted,
    getRedirectPath,
  } = useAuth()

  if (loading) {
    return <PageLoader fullScreen label="Loading" />
  }

  if (user) {
    return (
      <Navigate
        to={getRedirectPath({ user, sellerSetupCompleted, buyerSetupCompleted })}
        replace
      />
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/signup" replace />
  }

  return <>{children}</>
}
