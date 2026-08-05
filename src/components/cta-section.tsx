import { Link } from 'react-router-dom'
import { Container } from './container'
import { ArrowRight } from 'lucide-react'

export function CTASection() {
  return (
    <section className="w-full py-8 md:py-10 bg-[#f9f9f9]">
      <Container>
        <div className="bg-[#f5f3ef] rounded-2xl md:rounded-3xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch">
            <div className="flex flex-col justify-center p-8 md:p-10 lg:p-12 xl:p-14">
              <h2 className="text-3xl md:text-4xl lg:text-[42px] font-serif font-semibold text-black leading-tight mb-4 md:mb-5">
                Smarter Sourcing Starts Here
              </h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-8 max-w-md">
                Join thousands of businesses sourcing quality fabrics with confidence.
              </p>
              <Link to="/signup" className="btn-pill-black px-6 py-3.5 text-sm md:text-base w-fit group">
                Get started now
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="relative min-h-[240px] sm:min-h-[280px] lg:min-h-full">
              <img
                src="/images/cta-image-new.png"
                alt="Premium fabric sourcing workspace with sketchbook and swatches"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
