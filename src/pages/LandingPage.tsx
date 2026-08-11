import { Navigate } from 'react-router-dom'
import { Navbar } from '../components/navbar'
import { Hero } from '../components/hero'
import { TrustSection } from '../components/trust-section'
import { CategoryGrid } from '../components/category-grid'
import { FeaturedProducts } from '../components/featured-products'
import { CTASection } from '../components/cta-section'
import { HowItWorks } from '../components/how-it-works'
import { FaqSection } from '../components/faq-section'
import { StatsTestimonialSection } from '../components/stats'
import { Footer } from '../components/footer'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'

export function LandingPage() {
  const { user, loading, sellerSetupCompleted, buyerSetupCompleted } = useAuth()

  if (loading) {
    return <PageLoader fullScreen label="Loading" />
  }

  // Sellers should not see the buyer landing page.
  if (user?.role === 'SELLER') {
    return (
      <Navigate
        to={sellerSetupCompleted ? '/seller/dashboard' : '/seller/setup'}
        replace
      />
    )
  }

  if (user?.role === 'BUYER' && !buyerSetupCompleted) {
    return <Navigate to="/buyer/setup" replace />
  }

  return (
    <main className="flex-1 flex flex-col bg-[var(--color-canvas)]">
      <Navbar />
      <Hero />
      <TrustSection />
      <FeaturedProducts />
      <CategoryGrid />
      <CTASection />
      <HowItWorks />
      <FaqSection />
      <StatsTestimonialSection />
      <Footer />
    </main>
  )
}
