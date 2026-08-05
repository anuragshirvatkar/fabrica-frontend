'use client'

import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { SearchBar } from '@/components/search-bar'
import { TrustSection } from '@/components/trust-section'
import { CategoryGrid } from '@/components/category-grid'
import { CTASection } from '@/components/cta-section'
import { HowItWorks } from '@/components/how-it-works'
import { Stats } from '@/components/stats'
import { Testimonial } from '@/components/testimonial'
import { Newsletter } from '@/components/newsletter'
import { Footer } from '@/components/footer'

export default function Page() {
  return (
    <main className="bg-background min-h-screen">
      <Navbar />
      <Hero />
      <SearchBar />
      <TrustSection />
      <CategoryGrid />
      <CTASection />
      <HowItWorks />
      <Stats />
      <Testimonial />
      <Newsletter />
      <Footer />
    </main>
  )
}
