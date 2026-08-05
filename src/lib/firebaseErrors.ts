export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : ''

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Invalid email or password. Please try again.'
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
    default:
      return 'Something went wrong. Please try again.'
  }
}
