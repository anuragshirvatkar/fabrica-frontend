import { useEffect, useState, type ReactNode } from 'react'
import { CRITICAL_STATIC_IMAGES, preloadImages } from '../lib/staticAssets'
import { PageLoader } from './ui/PageLoader'

/** Max wait so a stuck network request cannot block the site forever. */
const PRELOAD_TIMEOUT_MS = 15000

/**
 * Holds the app behind the Fabrica preloader until critical static images
 * (landing hero, categories, CTA, auth, about) are cached and ready.
 */
export function StaticAssetsGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const markReady = () => {
      if (!cancelled) setReady(true)
    }

    const timeoutId = window.setTimeout(markReady, PRELOAD_TIMEOUT_MS)
    void preloadImages(CRITICAL_STATIC_IMAGES).finally(markReady)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  if (!ready) {
    return <PageLoader fullScreen label="Loading Fabrica" className="min-h-dvh" />
  }

  return <>{children}</>
}
