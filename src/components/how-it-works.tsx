import { Container } from './container'
import { Search, ShoppingBag, Package, CheckCircle } from 'lucide-react'

const steps = [
  {
    number: '1',
    icon: Search,
    title: 'Search or Ask AI',
    description: 'Find fabrics using AI or browse thousands of products across categories.',
  },
  {
    number: '2',
    icon: ShoppingBag,
    title: 'Compare & Select',
    description: 'Compare fabric specs, pricing, and reviews. Place your order instantly.',
  },
  {
    number: '3',
    icon: Package,
    title: 'We Handle the Rest',
    description: 'We connect, verify, and manage the order. Track your shipment in real-time.',
  },
  {
    number: '4',
    icon: CheckCircle,
    title: 'Get Quality Fabrics',
    description: 'Receive on-time, every time with 100% purchase protection guaranteed.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full py-8 md:py-10 bg-white scroll-mt-20">
      <Container>
        <h2 className="text-3xl md:text-4xl lg:text-[42px] font-serif font-semibold text-black text-center mb-8 md:mb-10">
          How Fabrica Works
        </h2>

        <div className="relative">
          {/* Dashed connector line - desktop only */}
          <div
            className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-px border-t-2 border-dashed border-gray-200"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="relative text-center px-2">
                  <div className="flex flex-col items-center mb-5">
                    <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center mb-4 relative z-10">
                      {step.number}
                    </div>
                    <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center bg-white relative z-10">
                      <Icon size={26} strokeWidth={1.5} className="text-black" />
                    </div>
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-black mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-[220px] mx-auto">
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
