import { useEffect, useState } from 'react'
import { Container } from './container'

const stats = [
  { number: '10K+', label: 'Businesses' },
  { number: '50K+', label: 'Fabrics' },
  { number: '120+', label: 'Countries' },
]

const testimonials = [
  {
    quote: 'Fabrica transformed how we source fabrics — faster, clearer, and far more reliable.',
    author: 'Rahul Mehta',
    role: 'Procurement Head, Mehta Fashions',
  },
  {
    quote: 'We cut sourcing time in half with verified suppliers and AI search.',
    author: 'Priya Sharma',
    role: 'Design Director, Sharma Textiles',
  },
  {
    quote: 'The B2B workflow just works — bulk pricing, delivery, and quality we trust.',
    author: 'Arjun Patel',
    role: 'Operations Lead, Patel Garments',
  },
]

export function Stats() {
  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
      {stats.map((stat) => (
        <div key={stat.label}>
          <div className="text-3xl md:text-4xl font-serif font-semibold text-black leading-none">
            {stat.number}
          </div>
          <p className="text-xs md:text-sm text-gray-500 mt-1.5 tracking-wide">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}

export function StatsTestimonialSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const current = testimonials[activeIndex]

  return (
    <section className="w-full pt-10 md:pt-14 pb-12 md:pb-16 bg-white">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-5 space-y-8">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-gray-400 mb-3">
                Trusted worldwide
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold text-black leading-tight">
                Built for teams that source at scale.
              </h2>
            </div>
            <Stats />
          </div>

          <div className="lg:col-span-7 lg:border-l lg:border-black/10 lg:pl-12 xl:pl-16">
            <blockquote className="max-w-xl">
              <p
                key={activeIndex}
                className="font-serif text-xl md:text-2xl text-black leading-snug tracking-tight line-clamp-2 animate-[fadeIn_0.5s_ease-in-out]"
              >
                &ldquo;{current.quote}&rdquo;
              </p>
              <footer
                key={`author-${activeIndex}`}
                className="mt-6 animate-[fadeIn_0.5s_ease-in-out]"
              >
                <p className="text-sm font-medium text-black">{current.author}</p>
                <p className="text-sm text-gray-500 mt-0.5">{current.role}</p>
              </footer>
            </blockquote>

            <div className="flex gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`View testimonial ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? 'w-7 bg-black' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
