export { isSessionExpiredError } from './sessionExpiry'

/** True when the API host is unreachable or the browser is offline. */
export function isConnectionError(error: unknown): boolean {
  if (!error) return false

  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code || '')
      : ''

  if (code === 'NETWORK_ERROR') return true

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''

  return /cannot reach api|network error|failed to fetch|load failed|networkrequestfailed/i.test(
    message,
  )
}

export function getFriendlyErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (isConnectionError(error)) {
    return 'We can’t reach Fabrica right now. Check your connection and try again.'
  }
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}
