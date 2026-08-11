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
  EmailAuthProvider,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import {
  fetchMe,
  fetchSellerProfile,
  fetchSignInHint,
  syncAuth,
  type AuthSyncResponse,
  type AuthUser,
  type UserRole,
} from '../lib/api'
import { authStorage } from '../lib/authStorage'
import {
  getFirebaseAuthErrorMessage,
  messageForSignInProviders,
  resolveEmailPasswordLoginMessage,
  type EmailLoginProbe,
} from '../lib/firebaseErrors'
import { registerPushNotifications } from '../lib/messaging'
import { notifySessionExpired } from '../lib/sessionExpiry'
import { isSellerProfileComplete } from '../lib/sellerPreferences'

type AuthContextValue = {
  user: AuthUser | null
  firebaseUser: FirebaseUser | null
  sellerSetupCompleted: boolean
  buyerSetupCompleted: boolean
  loading: boolean
  registerWithEmail: (email: string, password: string, role: UserRole) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<AuthSyncResponse>
  loginWithGoogle: (role?: UserRole) => Promise<AuthSyncResponse>
  completeEmailVerification: () => Promise<AuthSyncResponse>
  resendVerificationEmail: () => Promise<void>
  changeEmail: (newEmail: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  verifyPasswordReset: (oobCode: string) => Promise<string>
  completePasswordReset: (oobCode: string, newPassword: string) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  markSellerSetupCompleted: () => void
  markBuyerSetupCompleted: () => void
  refreshAuthProfile: () => Promise<AuthSyncResponse | null>
  getRedirectPath: (result: AuthSyncResponse) => string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Backend flag can lag; verify seller fields so incomplete/legacy profiles always go to setup. */
async function withVerifiedSellerSetup(
  result: AuthSyncResponse,
  token: string,
): Promise<AuthSyncResponse> {
  if (result.user.role !== 'SELLER') return result

  if (!result.sellerSetupCompleted) {
    return { ...result, sellerSetupCompleted: false }
  }

  try {
    const profile = await fetchSellerProfile(token)
    return {
      ...result,
      sellerSetupCompleted: isSellerProfileComplete(profile.seller),
    }
  } catch {
    // No seller doc yet → must complete setup
    return { ...result, sellerSetupCompleted: false }
  }
}

async function persistAndSync(firebaseUser: FirebaseUser, role?: UserRole) {
  const token = await firebaseUser.getIdToken(true)
  authStorage.setToken(token)

  const result = await syncAuth(token, role ?? authStorage.getPendingRole() ?? undefined)
  authStorage.clearPendingRole()
  authStorage.clearPendingEmail()
  return withVerifiedSellerSetup(result, token)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [sellerSetupCompleted, setSellerSetupCompleted] = useState(false)
  const [buyerSetupCompleted, setBuyerSetupCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  const applyAuthResult = useCallback((result: AuthSyncResponse) => {
    setUser(result.user)
    setSellerSetupCompleted(result.sellerSetupCompleted)
    setBuyerSetupCompleted(result.buyerSetupCompleted)
    return result
  }, [])

  const getRedirectPath = useCallback((result: AuthSyncResponse) => {
    if (result.user.role === 'BUYER') {
      return result.buyerSetupCompleted ? '/marketplace' : '/buyer/setup'
    }
    if (!result.sellerSetupCompleted) return '/seller/setup'
    return '/seller/dashboard'
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setFirebaseUser(current)

      if (!current) {
        setUser(null)
        setSellerSetupCompleted(false)
        setBuyerSetupCompleted(false)
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
          const profile = await withVerifiedSellerSetup(await fetchMe(token), token)
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
    const normalizedEmail = email.trim()
    try {
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      authStorage.setPendingRole(role)
      authStorage.setPendingEmail(normalizedEmail)

      try {
        await sendEmailVerification(credential.user)
        console.log('[auth:register] Firebase verification email sent', { email: normalizedEmail })
      } catch (emailError) {
        console.error('[auth:register] Firebase verification email failed', emailError)
        throw new Error(getFirebaseAuthErrorMessage(emailError))
      }
    } catch (error) {
      if (error instanceof Error && !String((error as { code?: string }).code || '').startsWith('auth/')) {
        throw error
      }

      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: string }).code)
          : ''

      if (code === 'auth/email-already-in-use') {
        try {
          let providers = await fetchSignInMethodsForEmail(auth, normalizedEmail)
          if (!providers.length) {
            const hint = await fetchSignInHint(normalizedEmail)
            providers = hint.providers
          }
          const googleOnly = messageForSignInProviders(providers)
          if (googleOnly?.includes('Google')) {
            throw new Error(
              'This email is already registered with Google. Please use Continue with Google.',
            )
          }
        } catch (hintError) {
          if (
            hintError instanceof Error &&
            hintError.message.includes('Google')
          ) {
            throw hintError
          }
        }
      }

      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim()
      try {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password)

        if (!credential.user.emailVerified) {
          authStorage.setPendingEmail(normalizedEmail)
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

        const code =
          typeof error === 'object' && error && 'code' in error
            ? String((error as { code: string }).code)
            : ''

        if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/user-not-found'
        ) {
          let probe: EmailLoginProbe = { exists: null, providers: [] }

          try {
            const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail)
            // Empty list is unreliable when Firebase email enumeration protection is on.
            if (methods.length > 0) {
              probe = { exists: true, providers: methods }
            }
          } catch {
            // ignore — try backend hint
          }

          if (probe.exists === null) {
            try {
              const hint = await fetchSignInHint(normalizedEmail)
              probe = {
                exists: hint.exists,
                providers: hint.providers || [],
              }
            } catch {
              // leave exists null → show wrong-password, not "no account"
            }
          }

          throw new Error(resolveEmailPasswordLoginMessage(error, probe))
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

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const current = auth.currentUser
    if (!current?.email) {
      throw new Error('No active session. Please sign in again.')
    }

    const hasPasswordProvider = current.providerData.some(
      (provider) => provider.providerId === 'password',
    )
    if (!hasPasswordProvider) {
      throw new Error('Password can only be changed for email sign-in accounts.')
    }

    try {
      const credential = EmailAuthProvider.credential(current.email, currentPassword)
      await reauthenticateWithCredential(current, credential)
      await updatePassword(current, newPassword)
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: string }).code)
          : ''

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Current password is not right. Please try again.')
      }
      if (code === 'auth/weak-password') {
        throw new Error(
          'Password must be at least 6 characters and include 1 number and 1 special character.',
        )
      }
      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      throw new Error('Please enter your email address.')
    }

    try {
      let providers: string[] = []
      try {
        providers = await fetchSignInMethodsForEmail(auth, normalizedEmail)
      } catch {
        providers = []
      }
      if (!providers.length) {
        try {
          const hint = await fetchSignInHint(normalizedEmail)
          providers = hint.exists ? hint.providers : []
          if (!hint.exists) {
            throw new Error('No account found with this email. Please sign up.')
          }
        } catch (hintError) {
          if (hintError instanceof Error && hintError.message.includes('sign up')) {
            throw hintError
          }
        }
      }

      const hasPassword = providers.includes('password')
      const hasGoogle = providers.includes('google.com')
      if (hasGoogle && !hasPassword) {
        throw new Error(
          'This account was created with Google. Please use Continue with Google to sign in.',
        )
      }
      if (providers.length && !hasPassword) {
        throw new Error(
          'This account does not use an email password. Please sign in with Google.',
        )
      }

      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      })
    } catch (error) {
      if (error instanceof Error && !String((error as { code?: string }).code || '').startsWith('auth/')) {
        throw error
      }
      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const verifyPasswordReset = useCallback(async (oobCode: string) => {
    try {
      return await verifyPasswordResetCode(auth, oobCode)
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const completePasswordReset = useCallback(async (oobCode: string, newPassword: string) => {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword)
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: string }).code)
          : ''
      if (code === 'auth/weak-password') {
        throw new Error(
          'Password must be at least 6 characters and include 1 number and 1 special character.',
        )
      }
      throw new Error(getFirebaseAuthErrorMessage(error))
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    authStorage.clearAll()
    setUser(null)
    setFirebaseUser(null)
    setSellerSetupCompleted(false)
    setBuyerSetupCompleted(false)
  }, [])

  const getAccessToken = useCallback(async () => {
    const current = auth.currentUser
    if (!current) return null
    try {
      const token = await current.getIdToken()
      authStorage.setToken(token)
      return token
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: string }).code)
          : ''
      if (
        code === 'auth/user-token-expired' ||
        code === 'auth/id-token-expired' ||
        code === 'auth/user-disabled' ||
        code === 'auth/invalid-user-token' ||
        code === 'auth/requires-recent-login'
      ) {
        notifySessionExpired({ code })
      }
      return null
    }
  }, [])

  const markSellerSetupCompleted = useCallback(() => {
    setSellerSetupCompleted(true)
  }, [])

  const markBuyerSetupCompleted = useCallback(() => {
    setBuyerSetupCompleted(true)
  }, [])

  const refreshAuthProfile = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) return null
    const profile = await withVerifiedSellerSetup(await fetchMe(token), token)
    return applyAuthResult(profile)
  }, [applyAuthResult, getAccessToken])

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      sellerSetupCompleted,
      buyerSetupCompleted,
      loading,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      completeEmailVerification,
      resendVerificationEmail,
      changeEmail,
      changePassword,
      requestPasswordReset,
      verifyPasswordReset,
      completePasswordReset,
      logout,
      getAccessToken,
      markSellerSetupCompleted,
      markBuyerSetupCompleted,
      refreshAuthProfile,
      getRedirectPath,
    }),
    [
      user,
      firebaseUser,
      sellerSetupCompleted,
      buyerSetupCompleted,
      loading,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      completeEmailVerification,
      resendVerificationEmail,
      changeEmail,
      changePassword,
      requestPasswordReset,
      verifyPasswordReset,
      completePasswordReset,
      logout,
      getAccessToken,
      markSellerSetupCompleted,
      markBuyerSetupCompleted,
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
