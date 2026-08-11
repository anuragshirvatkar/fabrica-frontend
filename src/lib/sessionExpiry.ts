type SessionExpiredDetail = {
  code?: string
}

type SessionExpiredHandler = (detail: SessionExpiredDetail) => void | Promise<void>

let handler: SessionExpiredHandler | null = null
let handling = false

export function onSessionExpired(fn: SessionExpiredHandler) {
  handler = fn
  return () => {
    if (handler === fn) handler = null
  }
}

/** True when an API error means the signed-in session is no longer valid. */
export function isSessionExpiredError(
  error: unknown,
  options?: { hadToken?: boolean },
): boolean {
  if (!error || typeof error !== 'object') return false

  const status = 'status' in error ? Number((error as { status?: number }).status) : 0
  const code =
    'code' in error && (error as { code?: string }).code
      ? String((error as { code?: string }).code)
      : ''
  const message =
    error instanceof Error
      ? error.message
      : 'message' in error
        ? String((error as { message?: string }).message || '')
        : ''

  if (code === 'ACCOUNT_DELETED') return true
  if (code === 'INVALID_TOKEN') return true

  if (status === 401 && options?.hadToken) {
    return /expired|invalid.*authentication token|invalid or expired/i.test(message)
  }

  return /invalid or expired authentication token/i.test(message)
}

export function notifySessionExpired(detail: SessionExpiredDetail = {}) {
  if (handling || !handler) return
  handling = true
  Promise.resolve(handler(detail)).finally(() => {
    window.setTimeout(() => {
      handling = false
    }, 1500)
  })
}
