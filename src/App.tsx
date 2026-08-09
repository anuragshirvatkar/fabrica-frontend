import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AiAssistant } from './components/ai/AiAssistant'
import { StaticAssetsGate } from './components/StaticAssetsGate'
import {
  GuestRoute,
  ProtectedRoute,
  VerifyEmailRoute,
} from './components/auth/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { AboutUsPage } from './pages/AboutUsPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SignUpPage } from './pages/SignUpPage'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { SellerSetupPage } from './pages/SellerSetupPage'
import { SellerProfilePage } from './pages/SellerProfilePage'
import { BuyerSetupPage } from './pages/BuyerSetupPage'
import { BuyerProfilePage } from './pages/BuyerProfilePage'
import { SellerDashboardPage } from './pages/SellerDashboardPage'
import { SellerProductsPage } from './pages/SellerProductsPage'
import { SellerDraftsPage } from './pages/SellerDraftsPage'
import { AddProductPage } from './pages/AddProductPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { AddressesPage } from './pages/AddressesPage'
import { SellerOrdersPage } from './pages/SellerOrdersPage'
import { SellerOrderDetailPage } from './pages/SellerOrderDetailPage'
import { SellerPaymentsPage } from './pages/SellerPaymentsPage'
import { SellerPaymentDetailPage } from './pages/SellerPaymentDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <StaticAssetsGate>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:id" element={<ProductDetailPage />} />

          <Route
            path="/signup"
            element={
              <GuestRoute>
                <SignUpPage />
              </GuestRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/verify-email"
            element={
              <VerifyEmailRoute>
                <VerifyEmailPage />
              </VerifyEmailRoute>
            }
          />

          <Route
            path="/buyer/setup"
            element={
              <ProtectedRoute roles={['BUYER']}>
                <BuyerSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={['BUYER']} requireCompletedBuyerSetup>
                <BuyerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute roles={['BUYER']} requireCompletedBuyerSetup>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute roles={['BUYER']} requireCompletedBuyerSetup>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute roles={['BUYER']} requireCompletedBuyerSetup>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute roles={['BUYER']} requireCompletedBuyerSetup>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute roles={['BUYER']} requireCompletedBuyerSetup>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/addresses"
            element={
              <ProtectedRoute roles={['BUYER']} requireCompletedBuyerSetup>
                <AddressesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/setup"
            element={
              <ProtectedRoute roles={['SELLER']}>
                <SellerSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/profile"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/dashboard"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/orders"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/orders/:id"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerOrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/products"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/products/new"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <AddProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/products/:productId/edit"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <AddProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/drafts"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerDraftsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/payments"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/payments/:id"
            element={
              <ProtectedRoute roles={['SELLER']} requireCompletedSellerSetup>
                <SellerPaymentDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <AiAssistant />
      </BrowserRouter>
      </StaticAssetsGate>
    </AuthProvider>
  )
}
