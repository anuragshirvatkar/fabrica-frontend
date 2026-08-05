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
    <section className="w-full pt-10 md:pt-12 pb-8 md:pb-10 bg-[#f9f9f9]">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {trustItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex items-start gap-3.5">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[#ece8e3] flex items-center justify-center">
                  <Icon size={20} strokeWidth={1.5} className="text-[#3d3d3d]" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-[15px] font-semibold text-black leading-snug mb-0.5">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-[#6b6b6b] leading-snug">
                    {item.description}
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
