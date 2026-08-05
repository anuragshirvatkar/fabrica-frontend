import { Link } from 'react-router-dom'
import { Container } from './container'
import { ArrowRight, Leaf, Wind, Shirt, Sparkles } from 'lucide-react'

const categories = [
  {
    name: 'Cotton',
    label: 'Cotton Fabrics',
    count: 'Browse cotton',
    image: '/images/fabric-cotton.png',
    icon: Leaf,
  },
  {
    name: 'Linen',
    label: 'Linen Fabrics',
    count: 'Browse linen',
    image: '/images/fabric-linen.png',
    icon: Wind,
  },
  {
    name: 'Denim',
    label: 'Denim Fabrics',
    count: 'Browse denim',
    image: '/images/fabric-denim.png',
    icon: Shirt,
  },
  {
    name: 'Silk',
    label: 'Silk Fabrics',
    count: 'Browse silk',
    image: '/images/fabric-silk.png',
    icon: Sparkles,
  },
]

export function CategoryGrid() {
  return (
    <section className="w-full py-8 md:py-10 bg-[#f9f9f9]">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
          <h2 className="text-3xl md:text-4xl lg:text-[42px] font-serif font-semibold text-black leading-tight">
            Browse by Category
          </h2>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-black transition-colors"
          >
            View all categories
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.name}
                to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                className="group relative rounded-2xl overflow-hidden bg-white border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white">
                    <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2">
                      <Icon size={15} />
                    </div>
                    <p className="font-semibold text-sm md:text-base">{category.label}</p>
                    <p className="text-xs text-white/75 mt-0.5">{category.count}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
