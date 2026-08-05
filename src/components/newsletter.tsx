import { Container } from './container'
import { useState } from 'react'

export function Newsletter() {
  const [email, setEmail] = useState('')

  return (
    <section className="w-full py-12 md:py-16 lg:py-20 bg-black">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-serif font-semibold text-white leading-tight mb-3 md:mb-4">
              Stay ahead in textiles
            </h2>
            <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-md">
              Subscribe to get the latest sourcing tips and exclusive insights.
            </p>
          </div>

          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Enter your business email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-5 py-3.5 bg-white rounded-full focus:outline-none text-sm md:text-base text-black placeholder:text-gray-400"
              required
            />
            <button
              type="submit"
              className="btn-pill-white px-7 py-3.5 text-sm md:text-base whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>
      </Container>
    </section>
  )
}
