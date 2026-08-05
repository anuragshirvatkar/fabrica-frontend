import type { UserRole } from './api'

const TOKEN_KEY = 'fabrica_id_token'
const PENDING_ROLE_KEY = 'fabrica_pending_role'
const PENDING_EMAIL_KEY = 'fabrica_pending_email'

export const authStorage = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clearToken: () => sessionStorage.removeItem(TOKEN_KEY),

  getPendingRole: () => sessionStorage.getItem(PENDING_ROLE_KEY) as UserRole | null,
  setPendingRole: (role: UserRole) => sessionStorage.setItem(PENDING_ROLE_KEY, role),
  clearPendingRole: () => sessionStorage.removeItem(PENDING_ROLE_KEY),

  getPendingEmail: () => sessionStorage.getItem(PENDING_EMAIL_KEY),
  setPendingEmail: (email: string) => sessionStorage.setItem(PENDING_EMAIL_KEY, email),
  clearPendingEmail: () => sessionStorage.removeItem(PENDING_EMAIL_KEY),

  clearAll: () => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(PENDING_ROLE_KEY)
    sessionStorage.removeItem(PENDING_EMAIL_KEY)
  },
}
