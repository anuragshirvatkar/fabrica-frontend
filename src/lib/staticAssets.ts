/** Hero slideshow on the landing page. */
export const HERO_IMAGES = [
  '/images/landing-page-image.png',
  '/images/landing-page-image3.png',
  '/images/landing-page-image2.png',
] as const

/**
 * Critical marketing / auth static images that must be ready before the app UI
 * is shown. Product/marketplace photos from the API are intentionally excluded.
 */
export const CRITICAL_STATIC_IMAGES = [
  ...HERO_IMAGES,
  '/images/fabric-cotton.png',
  '/images/fabric-linen.png',
  '/images/fabric-denim.png',
  '/images/fabric-silk.png',
  '/images/cta-image-new.png',
  '/images/signup-image-one.png',
  '/images/signup-image-two.png',
  '/about-us-one.png',
  '/about-us-two.png',
] as const

/** Preload a list of image URLs. Failures resolve so one bad asset cannot block the app. */
export function preloadImages(urls: readonly string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = src
        }),
    ),
  ).then(() => undefined)
}
