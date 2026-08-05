import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Globe2,
  Headphones,
  Leaf,
  Medal,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { Container } from '../components/container'
import { useAuth } from '../context/AuthContext'

const values = [
  {
    title: 'Our Mission',
    description:
      'To empower businesses with a seamless fabric sourcing experience that is transparent, efficient, and built for growth.',
    icon: Leaf,
  },
  {
    title: 'Our Vision',
    description:
      'To become the global platform of choice for fabrics and textile solutions trusted by manufacturers and buyers worldwide.',
    icon: Users,
  },
  {
    title: 'Our Promise',
    description:
      'Quality fabrics, verified suppliers, and a seamless experience from discovery to delivery — every single time.',
    icon: Medal,
  },
  {
    title: 'For Every Business',
    description:
      'Whether you are a small brand or a large manufacturer, Fabrica is designed to support your sourcing journey.',
    icon: Globe2,
  },
]

const highlights = [
  { title: 'Trusted Quality', subtitle: 'Verified Suppliers', icon: ShieldCheck },
  { title: 'Reliable Delivery', subtitle: 'On Time, Every Time', icon: Truck },
  { title: 'Dedicated Support', subtitle: 'Always Here', icon: Headphones },
  { title: 'Sustainable Future', subtitle: 'Better Fabrics, Brighter Tomorrow', icon: Leaf },
]

const stats = [
  { value: '10K+', label: 'Fabrics Listed' },
  { value: '2K+', label: 'Happy Businesses' },
  { value: '50+', label: 'Countries Served' },
]

export function AboutUsPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="solid" showActions />

      {/* Hero */}
      <section className="relative pt-16 md:pt-[72px] overflow-hidden bg-white">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[55%] pointer-events-none">
          <img
            src="/about-us-one.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-white/70 lg:bg-gradient-to-r lg:from-white lg:from-0% lg:via-white/40 lg:via-[18%] lg:to-transparent lg:to-[38%]" />
        </div>

        <Container className="relative z-10">
          <div className="max-w-xl lg:max-w-[48%] pt-12 md:pt-16 lg:pt-20 pb-10 md:pb-14">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-gray-500 uppercase mb-5">
              About Us
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-[56px] font-semibold text-black leading-[1.12] mb-5 md:mb-6">
              Building a Better
              <br />
              Fabric Future
            </h1>
            <p className="text-sm md:text-[15px] text-gray-600 leading-relaxed max-w-md mb-3">
              Fabrica is a trusted B2B marketplace connecting fabric manufacturers and buyers,
              making sourcing simple, transparent, and reliable.
            </p>
            <p className="text-sm md:text-[15px] text-gray-600 leading-relaxed max-w-md">
              We help businesses discover quality fabrics, compare suppliers, and grow with
              confidence — from sample to scale.
            </p>
          </div>

          <div className="max-w-xl border-t border-gray-200 py-6 md:py-7">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`sm:pr-4 ${index > 0 ? 'sm:pl-4 md:pl-6 sm:border-l border-gray-200' : ''}`}
                >
                  <p className="font-serif text-2xl md:text-3xl font-semibold text-black leading-none">
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-gray-500 mt-1.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="bg-[#f9f9f9] py-12 md:py-16">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {values.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-5 py-7 md:px-6 md:py-8 text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-full border border-gray-200 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-gray-700" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-black mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-[13px] text-gray-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Trusted Quality bar — above marketplace partner section */}
      <section className="bg-[#1a1a1a] text-white">
        <Container className="py-7 md:py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0">
            {highlights.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className={`flex items-center gap-3 lg:px-6 ${
                    index > 0 ? 'lg:border-l lg:border-white/15' : 'lg:pl-0'
                  }`}
                >
                  <Icon size={22} className="text-white shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium leading-tight">{item.title}</p>
                    <p className="text-xs text-white/55 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Partner / marketplace CTA */}
      <section className="relative bg-[#f5f3ef] py-12 md:py-16 overflow-hidden">
        <svg
          className="pointer-events-none absolute right-0 bottom-0 w-56 md:w-72 lg:w-80 text-black/[0.06]"
          viewBox="0 0 200 220"
          fill="none"
          aria-hidden
        >
          <path
            d="M120 210c-10-40 8-70 28-95 18-22 22-40 12-58-8-14-24-18-36-8-10 8-12 24-4 36 10 16 4 34-14 42-22 10-40-2-48-22-6-16 0-34 14-44"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M150 40c8 12 6 28-4 38M132 70c12 4 22 14 24 28M98 120c14 8 20 24 16 40"
            stroke="currentColor"
            strokeWidth="1"
          />
          <ellipse cx="148" cy="38" rx="10" ry="16" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="168" cy="88" rx="9" ry="14" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="108" cy="148" rx="8" ry="13" stroke="currentColor" strokeWidth="1" />
        </svg>

        <Container className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] lg:aspect-[5/4] bg-white/40">
              <img
                src="/about-us-two.png"
                alt="Fabric swatches hanging on a rack"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:pl-2">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase mb-3">
                More Than a Marketplace
              </p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-[42px] font-semibold text-black leading-tight mb-4">
                We&apos;re a partner in your fabric journey
              </h2>
              <p className="text-sm md:text-[15px] text-gray-600 leading-relaxed mb-8 max-w-md">
                From finding the right fabric to scaling production, Fabrica supports your business
                with trusted suppliers, clear pricing, and tools built for growth.
              </p>
              {user ? (
                <Link to="/marketplace" className="btn-pill-black px-7 py-3.5 text-sm w-fit group">
                  Explore
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <Link to="/signup" className="btn-pill-black px-7 py-3.5 text-sm w-fit group">
                  Join Fabrica Today
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}
