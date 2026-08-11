import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { Container } from '../components/container'
import { PageBackLink } from '../components/ui/PageBackLink'
import { FAQ_ITEMS } from '../lib/faq'

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar variant="solid" showActions />

      <section className="relative flex-1 pt-16 md:pt-[72px] overflow-hidden bg-white">
          <div className="absolute inset-y-0 right-0 w-full lg:w-[55%] pointer-events-none">
          <img
            src="/about-us-one.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-white/70 lg:bg-gradient-to-r lg:from-white lg:from-0% lg:via-white/40 lg:via-[18%] lg:to-transparent lg:to-[38%]" />
        </div>

        <Container className="relative z-10 pb-12 md:pb-16">
          <PageBackLink to="/" label="Back to home" className="pt-6 md:pt-8 mb-6" />

          <div className="max-w-xl lg:max-w-[48%]">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-gray-500 uppercase mb-5">
              FAQ
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-[56px] font-semibold text-black leading-[1.12] mb-4 md:mb-5">
              Questions,
              <br />
              answered
            </h1>
            <p className="text-sm md:text-[15px] text-gray-600 leading-relaxed max-w-md mb-8">
              Essentials about buying and sourcing on Fabrica.
            </p>

            <div className="border-t border-gray-200">
              {FAQ_ITEMS.map((item, index) => {
                const open = openIndex === index
                return (
                  <div key={item.question} className="border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setOpenIndex(open ? null : index)}
                      className="w-full flex items-center justify-between gap-4 py-4 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-sm md:text-base font-medium text-black">
                        {item.question}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-gray-500 transition-transform duration-200 ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="pb-4 text-sm text-gray-600 leading-relaxed pr-6">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}
