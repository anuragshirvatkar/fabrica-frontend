import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { onSessionExpired } from '../../lib/sessionExpiry'

const AUTH_PAGES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

export function SessionExpiryHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  useEffect(() => {
    return onSessionExpired(async () => {
      const from = `${location.pathname}${location.search}`
      const alreadyOnAuthPage = AUTH_PAGES.some(
        (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
      )

      try {
        await logout()
      } catch {
        // Still send the user to login even if Firebase sign-out fails.
      }

      if (!alreadyOnAuthPage) {
        navigate('/login', {
          replace: true,
          state: { from, reason: 'session_expired' },
        })
      }
    })
  }, [logout, navigate, location.pathname, location.search])

  return null
}
