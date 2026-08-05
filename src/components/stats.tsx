import { useEffect, useState } from 'react'
import { Container } from './container'

const stats = [
  { number: '10K+', label: 'Businesses Trust Us' },
  { number: '50K+', label: 'Fabrics Available' },
  { number: '120+', label: 'Countries Served' },
]

const testimonials = [
  {
    quote:
      'Fabrica has completely transformed the way we source fabrics. The quality, variety and seamless experience save us time and effort.',
    author: 'Rahul Mehta',
    role: 'Procurement Head, Mehta Fashions',
  },
  {
    quote:
      'We cut our sourcing time in half. Verified suppliers and AI search make finding the right fabric effortless for our team.',
    author: 'Priya Sharma',
    role: 'Design Director, Sharma Textiles',
  },
  {
    quote:
      'The B2B workflow is exactly what we needed. Bulk pricing, reliable delivery, and quality we can trust every single order.',
    author: 'Arjun Patel',
    role: 'Operations Lead, Patel Garments',
  },
]

export function Stats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center sm:text-left">
          <div className="text-4xl md:text-5xl lg:text-[52px] font-serif font-semibold text-black mb-1 leading-none">
            {stat.number}
          </div>
          <p className="text-sm text-gray-500">{stat.label}</p>
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
    <section className="w-full py-8 md:py-10 bg-[#f9f9f9]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Stats />

          <div className="bg-[#f5f3ef] rounded-2xl p-8 md:p-10 lg:p-12 min-h-[280px] flex flex-col justify-between">
            <div>
              <div className="text-5xl md:text-6xl font-serif text-black/20 leading-none mb-4 select-none">
                &ldquo;
              </div>
              <blockquote>
                <p
                  key={activeIndex}
                  className="text-base md:text-lg text-black leading-relaxed mb-6 animate-[fadeIn_0.5s_ease-in-out]"
                >
                  {current.quote}
                </p>
              </blockquote>
              <p
                key={`author-${activeIndex}`}
                className="text-sm text-gray-500 animate-[fadeIn_0.5s_ease-in-out]"
              >
                &mdash; {current.author}, {current.role}
              </p>
            </div>

            <div className="flex gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`View testimonial ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === activeIndex ? 'bg-black' : 'bg-gray-300 hover:bg-gray-400'
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
