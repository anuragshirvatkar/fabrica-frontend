import { Container } from './container'
import { Search, ShoppingBag, Package, CheckCircle } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Search or Ask AI',
    description: 'Find fabrics using AI or browse thousands of products across categories.',
  },
  {
    number: '02',
    icon: ShoppingBag,
    title: 'Compare & Select',
    description: 'Compare fabric specs, pricing, and reviews. Place your order instantly.',
  },
  {
    number: '03',
    icon: Package,
    title: 'We Handle the Rest',
    description: 'We connect, verify, and manage the order. Track your shipment in real-time.',
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Get Quality Fabrics',
    description: 'Receive on-time, every time with 100% purchase protection guaranteed.',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="w-full pt-10 md:pt-12 pb-12 md:pb-16 bg-[var(--color-canvas)] scroll-mt-20"
    >
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-black leading-tight">
            How Fabrica Works
          </h2>
          <p className="text-sm text-gray-500 mt-2">Simple steps. Seamless sourcing.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-black/10">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                className={[
                  'flex flex-col items-center text-center gap-2.5 px-3 sm:px-5 lg:px-6 py-5 sm:py-4 lg:py-1',
                  index > 0 ? 'max-sm:border-t max-sm:border-black/10' : '',
                  index % 2 === 1 ? 'sm:max-lg:border-l sm:max-lg:border-black/10' : '',
                  index >= 2 ? 'sm:max-lg:border-t sm:max-lg:border-black/10' : '',
                ].join(' ')}
              >
                <span className="text-[11px] font-medium tracking-[0.14em] text-gray-400">
                  {step.number}
                </span>
                <div className="w-11 h-11 rounded-full bg-[#ece8e3] flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.5} className="text-black" />
                </div>
                <div>
                  <h3 className="text-sm md:text-[15px] font-semibold text-black mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 leading-relaxed max-w-[200px] mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
