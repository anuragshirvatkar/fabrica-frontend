import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../lib/api'
import { PageLoader } from '../ui/PageLoader'

type ProtectedRouteProps = {
  children: React.ReactNode
  roles?: UserRole[]
  /** When true, sellers without a Seller profile are redirected to setup */
  requireCompletedSellerSetup?: boolean
}

export function ProtectedRoute({
  children,
  roles,
  requireCompletedSellerSetup = false,
}: ProtectedRouteProps) {
  const { user, loading, sellerSetupCompleted } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader fullScreen label="Loading your account" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'SELLER' ? '/seller/dashboard' : '/marketplace'} replace />
  }

  if (user.role === 'SELLER' && requireCompletedSellerSetup && !sellerSetupCompleted) {
    return <Navigate to="/seller/setup" replace />
  }

  if (user.role === 'SELLER' && location.pathname === '/seller/setup' && sellerSetupCompleted) {
    return <Navigate to="/seller/dashboard" replace />
  }

  return <>{children}</>
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, sellerSetupCompleted, getRedirectPath } = useAuth()

  if (loading) {
    return <PageLoader fullScreen label="Loading" />
  }

  if (user) {
    return <Navigate to={getRedirectPath({ user, sellerSetupCompleted })} replace />
  }

  return <>{children}</>
}

export function VerifyEmailRoute({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser, loading, sellerSetupCompleted, getRedirectPath } = useAuth()

  if (loading) {
    return <PageLoader fullScreen label="Loading" />
  }

  if (user) {
    return <Navigate to={getRedirectPath({ user, sellerSetupCompleted })} replace />
  }

  if (!firebaseUser) {
    return <Navigate to="/signup" replace />
  }

  return <>{children}</>
}
