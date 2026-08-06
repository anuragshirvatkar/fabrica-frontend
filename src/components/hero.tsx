import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container } from './container'
import { ArrowRight, Play } from 'lucide-react'
import { SearchBar } from './search-bar'

const heroImages = [
  '/images/landing-page-image.png',
  '/images/landing-page-image3.png',
  '/images/landing-page-image2.png',
]

const SLIDE_DURATION = 2800
const DISPLAY_DURATION = 10000

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState<number | null>(null)
  const [isSliding, setIsSliding] = useState(false)
  const [slideReady, setSlideReady] = useState(true)
  const slideCount = useRef(0)

  const goToNext = useCallback(() => {
    setActiveIndex((current) => {
      const next = (current + 1) % heroImages.length
      setPrevIndex(current)
      setIsSliding(true)
      setSlideReady(false)
      slideCount.current += 1
      return next
    })
  }, [])

  useEffect(() => {
    if (!isSliding) return

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSlideReady(true))
    })

    const timer = setTimeout(() => {
      setIsSliding(false)
      setPrevIndex(null)
      setSlideReady(true)
    }, SLIDE_DURATION)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [isSliding, activeIndex])

  useEffect(() => {
    const interval = setInterval(goToNext, DISPLAY_DURATION)
    return () => clearInterval(interval)
  }, [goToNext])

  const getSlideClass = (index: number) => {
    if (index === activeIndex) {
      if (isSliding && !slideReady) return 'translate-x-full'
      return 'translate-x-0'
    }
    if (index === prevIndex && isSliding) {
      if (!slideReady) return 'translate-x-0'
      return '-translate-x-full'
    }
    return 'translate-x-full'
  }

  return (
    <section className="relative w-full min-h-[100dvh] h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {heroImages.map((src, index) => {
          const isActive = index === activeIndex
          const isVisible = isActive || (index === prevIndex && isSliding)

          return (
            <div
              key={src}
              className={`absolute inset-0 transition-transform duration-[2800ms] ease-in-out ${getSlideClass(index)} ${
                isVisible ? 'z-10' : 'z-0'
              }`}
              aria-hidden={!isActive}
            >
              {isActive && (
                <img
                  key={`zoom-${slideCount.current}`}
                  src={src}
                  alt="Designers examining premium fabrics"
                  className="absolute inset-0 w-full h-full object-cover object-center hero-ken-burns"
                  draggable={false}
                />
              )}
              {!isActive && isVisible && (
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  draggable={false}
                />
              )}
            </div>
          )
        })}

        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none z-20" />
      </div>

      <Container className="relative z-30 flex flex-col justify-center h-full pt-20 sm:pt-16 md:pt-20 pb-40 sm:pb-44 md:pb-48">
        <div className="max-w-xl lg:max-w-2xl">
          <h1 className="text-[2rem] leading-[1.12] sm:text-5xl md:text-6xl lg:text-[64px] font-serif font-semibold text-white sm:leading-[1.1] mb-4 sm:mb-5 md:mb-6">
            Source.<br />
            Connect.<br />
            Grow.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed mb-6 sm:mb-8 max-w-md md:max-w-lg">
            The modern B2B textile marketplace connecting buyers with trusted suppliers worldwide.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <Link
              to="/marketplace"
              className="btn-pill-white px-5 py-2.5 sm:px-6 sm:py-3 md:px-7 md:py-3.5 text-sm md:text-base group"
            >
              Explore Marketplace
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="https://youtu.be/h5J1ntMXC70"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-white text-sm md:text-base font-medium hover:opacity-80 transition-opacity"
            >
              <span className="w-9 h-9 rounded-full border border-white/70 flex items-center justify-center">
                <Play size={14} fill="white" className="ml-0.5" />
              </span>
              How it works
            </a>
          </div>
        </div>
      </Container>

      <div className="absolute bottom-0 left-0 right-0 z-30 pb-4 sm:pb-6 md:pb-8">
        <SearchBar />
      </div>
    </section>
  )
}
