import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  verifyBeforeUpdateEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { fetchMe, syncAuth, type AuthSyncResponse, type AuthUser, type UserRole } from '../lib/api'
import { authStorage } from '../lib/authStorage'
import { getFirebaseAuthErrorMessage } from '../lib/firebaseErrors'
import { registerPushNotifications } from '../lib/messaging'

type AuthContextValue = {
  user: AuthUser | null
  firebaseUser: FirebaseUser | null
  sellerSetupCompleted: boolean
  loading: boolean
  registerWithEmail: (email: string, password: string, role: UserRole) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<AuthSyncResponse>
  loginWithGoogle: (role?: UserRole) => Promise<AuthSyncResponse>
  completeEmailVerification: () => Promise<AuthSyncResponse>
  resendVerificationEmail: () => Promise<void>
  changeEmail: (newEmail: string) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  markSellerSetupCompleted: () => void
  refreshAuthProfile: () => Promise<AuthSyncResponse | null>
  getRedirectPath: (result: AuthSyncResponse) => string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function persistAndSync(firebaseUser: FirebaseUser, role?: UserRole) {
  const token = await firebaseUser.getIdToken(true)
  authStorage.setToken(token)

  const result = await syncAuth(token, role ?? authStorage.getPendingRole() ?? undefined)
  authStorage.clearPendingRole()
  authStorage.clearPendingEmail()
  return result
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [sellerSetupCompleted, setSellerSetupCompleted] = useState(true)
  const [loading, setLoading] = useState(true)

  const applyAuthResult = useCallback((result: AuthSyncResponse) => {
    setUser(result.user)
    setSellerSetupCompleted(result.sellerSetupCompleted)
    return result
  }, [])

  const getRedirectPath = useCallback((result: AuthSyncResponse) => {
    if (result.user.role === 'BUYER') return '/marketplace'
    if (!result.sellerSetupCompleted) return '/seller/setup'
    return '/seller/dashboard'
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setFirebaseUser(current)

      if (!current) {
        setUser(null)
        setSellerSetupCompleted(true)
        authStorage.clearToken()
        setLoading(false)
        return
      }

      try {
        if (!current.emailVerified) {
          setUser(null)
          setLoading(false)
          return
        }

        const token = await current.getIdToken()
        authStorage.setToken(token)

        try {
          const profile = await fetchMe(token)
          applyAuthResult(profile)
          void registerPushNotifications(token)
        } catch (error) {
          const code = (error as { code?: string }).code
          if (code === 'USER_NOT_FOUND' || code === 'EMAIL_NOT_VERIFIED') {
            setUser(null)
          } else {
            console.error(error)
          }
        }
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [applyAuthResult])

  const registerWithEmail = useCallback(async (email: string, password: string, role: UserRole) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      authStorage.setPendingRole(role)
      authStorage.setPendingEmail(email)

      try {
        await sendEmailVerification(credential.user)
        console.log('[auth:register] Firebase verification email sent', { email })
      } catch (emailError) {
        console.error('[auth:register] Firebase verification email failed', emailError)
        throw new Error(getFirebaseAuthErrorMessage(emailError))
      }
    } catch (error) {
      if (error instanceof Error && !String((error as { code?: string }).code || '').startsWith('auth/')) {
        throw error
      }
      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password)

        if (!credential.user.emailVerified) {
          authStorage.setPendingEmail(email)
          try {
            await sendEmailVerification(credential.user)
          } catch {
            // Still route to verify screen
          }
          const error = new Error('Please verify your email before continuing.') as Error & {
            code?: string
          }
          error.code = 'EMAIL_NOT_VERIFIED'
          throw error
        }

        const result = await persistAndSync(credential.user)
        return applyAuthResult(result)
      } catch (error) {
        if (error instanceof Error && (error as Error & { code?: string }).code === 'EMAIL_NOT_VERIFIED') {
          throw error
        }
        throw new Error(getFirebaseAuthErrorMessage(error))
      }
    },
    [applyAuthResult],
  )

  const loginWithGoogle = useCallback(
    async (role?: UserRole) => {
      try {
        if (role) authStorage.setPendingRole(role)

        let current = auth.currentUser
        const alreadyGoogle =
          current?.providerData.some((provider) => provider.providerId === 'google.com') ?? false

        if (!current || !alreadyGoogle) {
          const credential = await signInWithPopup(auth, googleProvider)
          current = credential.user
        }

        const result = await persistAndSync(current, role)
        return applyAuthResult(result)
      } catch (error) {
        const code =
          typeof error === 'object' && error && 'code' in error
            ? String((error as { code: string }).code)
            : ''

        if (code === 'ROLE_REQUIRED') {
          const err = new Error(
            (error as Error).message || 'Role is required for new users.',
          ) as Error & { code?: string }
          err.code = 'ROLE_REQUIRED'
          throw err
        }

        if (error instanceof Error && !code.startsWith('auth/')) {
          throw error
        }

        throw new Error(getFirebaseAuthErrorMessage(error))
      }
    },
    [applyAuthResult],
  )

  const completeEmailVerification = useCallback(async () => {
    const current = auth.currentUser
    if (!current) {
      throw new Error('No active session. Please sign up again.')
    }

    await reload(current)

    if (!auth.currentUser?.emailVerified) {
      throw new Error('Please verify your email before continuing.')
    }

    const role = authStorage.getPendingRole() ?? undefined

    try {
      const result = await persistAndSync(auth.currentUser, role)
      return applyAuthResult(result)
    } catch (error) {
      if ((error as { code?: string }).code === 'ROLE_REQUIRED') {
        throw new Error('Missing account role. Please sign up again and select Buyer or Seller.')
      }
      throw error
    }
  }, [applyAuthResult])

  const resendVerificationEmail = useCallback(async () => {
    const current = auth.currentUser
    if (!current) {
      throw new Error('No active session. Please sign up again.')
    }

    try {
      await sendEmailVerification(current)
      console.log('[auth:verify] Firebase verification email resent', {
        email: current.email,
      })
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const changeEmail = useCallback(async (newEmail: string) => {
    const current = auth.currentUser
    if (!current) {
      throw new Error('No active session. Please sign up again.')
    }

    try {
      await verifyBeforeUpdateEmail(current, newEmail)
      authStorage.setPendingEmail(newEmail)
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    authStorage.clearAll()
    setUser(null)
    setFirebaseUser(null)
    setSellerSetupCompleted(true)
  }, [])

  const getAccessToken = useCallback(async () => {
    const current = auth.currentUser
    if (!current) return null
    const token = await current.getIdToken()
    authStorage.setToken(token)
    return token
  }, [])

  const markSellerSetupCompleted = useCallback(() => {
    setSellerSetupCompleted(true)
  }, [])

  const refreshAuthProfile = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) return null
    const profile = await fetchMe(token)
    return applyAuthResult(profile)
  }, [applyAuthResult, getAccessToken])

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      sellerSetupCompleted,
      loading,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      completeEmailVerification,
      resendVerificationEmail,
      changeEmail,
      logout,
      getAccessToken,
      markSellerSetupCompleted,
      refreshAuthProfile,
      getRedirectPath,
    }),
    [
      user,
      firebaseUser,
      sellerSetupCompleted,
      loading,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      completeEmailVerification,
      resendVerificationEmail,
      changeEmail,
      logout,
      getAccessToken,
      markSellerSetupCompleted,
      refreshAuthProfile,
      getRedirectPath,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
