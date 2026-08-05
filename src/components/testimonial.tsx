
import { Container } from './container'
import { Star } from 'lucide-react'

export function Testimonial() {
  return (
    <section className="w-full py-32 bg-white" style={{ borderBottom: '1px solid #EAE7E2' }}>
      <Container>
        <div className="max-w-2xl mx-auto text-center">
          {/* Star rating */}
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} style={{ fill: '#D8C7B2', color: '#D8C7B2' }} />
            ))}
          </div>

          {/* Quote */}
          <blockquote className="mb-6">
            <p className="text-2xl md:text-3xl font-display font-semibold leading-tight mb-6 text-balance" style={{ color: '#111111' }}>
              "FABRICA completely transformed the way we source fabrics. The quality, variety and seamless experience save us time and effort."
            </p>
          </blockquote>

          {/* Attribution */}
          <div style={{ borderTop: '1px solid #EAE7E2', paddingTop: '24px' }}>
            <p className="font-semibold" style={{ color: '#111111' }}>Rahul Mehta</p>
            <p className="text-sm" style={{ color: '#6E6E6E' }}>
              Procurement Head, Mehta Fashions
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
