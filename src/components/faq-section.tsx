import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Container } from './container'
import { FAQ_ITEMS } from '../lib/faq'

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="w-full pt-10 md:pt-12 pb-12 md:pb-16 bg-white scroll-mt-20"
    >
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-auto lg:min-h-[420px] overflow-hidden rounded-2xl">
              <img
                src="/about-us-one.png"
                alt="Fabrica fabrics"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-gray-500 uppercase mb-3">
              FAQ
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-black leading-tight mb-2">
              Questions, answered
            </h2>
            <p className="text-sm text-gray-500 mb-6 md:mb-8 max-w-md">
              A few essentials about sourcing on Fabrica.
            </p>

            <div className="border-t border-black/10">
              {FAQ_ITEMS.map((item, index) => {
                const open = openIndex === index
                return (
                  <div key={item.question} className="border-b border-black/10">
                    <button
                      type="button"
                      onClick={() => setOpenIndex(open ? null : index)}
                      className="w-full flex items-center justify-between gap-4 py-4 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-sm md:text-[15px] font-medium text-black">
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
                        <p className="pb-4 text-sm text-gray-600 leading-relaxed pr-8">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Link
              to="/faq"
              className="mt-6 text-sm font-medium text-black underline underline-offset-4 hover:text-gray-700 w-fit"
            >
              View FAQ page
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
