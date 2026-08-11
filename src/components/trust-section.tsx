import { Container } from './container'
import { Shield, FileText, Sparkles, ShoppingBag } from 'lucide-react'

const trustItems = [
  {
    icon: Shield,
    title: 'Verified Suppliers',
    description: 'Trusted & verified textile suppliers.',
  },
  {
    icon: FileText,
    title: 'Wide Selection',
    description: 'Thousands of fabrics across categories.',
  },
  {
    icon: Sparkles,
    title: 'Smart AI Search',
    description: 'Find the right fabric faster with AI.',
  },
  {
    icon: ShoppingBag,
    title: 'Built for Business',
    description: 'Designed for B2B sourcing needs.',
  },
]

export function TrustSection() {
  return (
    <section className="w-full pt-10 md:pt-12 pb-4 md:pb-5 bg-[var(--color-canvas)]">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-black/10">
          {trustItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className={[
                  'flex flex-col items-start gap-3.5 py-7 sm:py-8 lg:py-1',
                  'px-0 sm:px-7 lg:px-8 first:lg:pl-0 last:lg:pr-0',
                  index > 0 ? 'max-sm:border-t max-sm:border-black/10' : '',
                  index % 2 === 1 ? 'sm:max-lg:border-l sm:max-lg:border-black/10' : '',
                  index >= 2 ? 'sm:max-lg:border-t sm:max-lg:border-black/10' : '',
                ].join(' ')}
              >
                <Icon size={22} strokeWidth={1.35} className="text-black" />
                <div>
                  <h3 className="font-serif text-lg md:text-xl font-semibold text-black leading-snug mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
