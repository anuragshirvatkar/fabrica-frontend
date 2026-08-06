export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : ''

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in.'
    case 'auth/wrong-password':
      return 'Password is not right. Please try again.'
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/invalid-credential':
      // Prefer resolveEmailPasswordLoginError for a precise message.
      return 'Password is not right. Please try again.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters and include 1 number and 1 special character.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.'
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked. Please allow popups and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/requires-recent-login':
      return 'Please sign in again before changing your email.'
    case 'auth/unauthorized-domain':
      return 'This site domain is not authorized for Google sign-in. Add it in Firebase Authorized domains.'
    case 'auth/expired-action-code':
      return 'This reset link has expired. Please request a new one.'
    case 'auth/invalid-action-code':
      return 'This reset link is invalid or has already been used. Please request a new one.'
    case 'auth/missing-continue-uri':
    case 'auth/invalid-continue-uri':
    case 'auth/unauthorized-continue-uri':
      return 'Password reset is misconfigured. Please contact support.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

const LOGIN_PROBE_CODES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
])

export function messageForSignInProviders(providers: string[]): string | null {
  const hasPassword = providers.includes('password')
  const hasGoogle = providers.includes('google.com')

  if (hasGoogle && !hasPassword) {
    return 'This account was created with Google. Please use Continue with Google to sign in.'
  }
  if (hasPassword) {
    return 'Password is not right. Please try again.'
  }
  if (hasGoogle) {
    return 'This account was created with Google. Please use Continue with Google to sign in.'
  }
  return null
}

export type EmailLoginProbe = {
  /** null = could not determine (e.g. enumeration protection / API down) */
  exists: boolean | null
  providers: string[]
}

/** Map a failed email/password login to a precise message using known providers. */
export function resolveEmailPasswordLoginMessage(
  error: unknown,
  probe: EmailLoginProbe | null | undefined,
): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : ''

  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.'
  }

  if (!LOGIN_PROBE_CODES.has(code)) {
    return getFirebaseAuthErrorMessage(error)
  }

  if (code === 'auth/user-not-found' || probe?.exists === false) {
    return 'No account found with this email. Please sign up.'
  }

  if (probe?.providers?.length) {
    return messageForSignInProviders(probe.providers) || 'Password is not right. Please try again.'
  }

  // Account exists but providers unknown, or probe failed — wrong password is the common case.
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || probe?.exists === true) {
    return 'Password is not right. Please try again.'
  }

  return getFirebaseAuthErrorMessage(error)
}
