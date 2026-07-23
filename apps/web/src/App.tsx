import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MotionConfig } from '@agrotraders/ui';
import { I18nProvider } from './i18n';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { SiteLayout } from './layouts/SiteLayout';
import { WebsitePage } from './pages/WebsitePage';
import { MarketPage } from './pages/MarketPage';
import { ProductPage } from './pages/ProductPage';
import { OfficesPage } from './pages/OfficesPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { AuctionsPage } from './pages/AuctionsPage';
import { BuyerBidsPage } from './pages/BuyerBidsPage';
import { BuyerBidRoomPage } from './pages/BuyerBidRoomPage';
import { RequirementsBoardPage } from './pages/RequirementsBoardPage';
import { SafeDealPage } from './pages/SafeDealPage';
import { ProfileFormPage } from './pages/ProfileFormPage';
import { PageView } from './pages/PageView';
import { ConsolePage } from './console/ConsolePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OtpLoginPage } from './pages/OtpLoginPage';
import { SystemPage } from './pages/SystemPage';
import { ChatWidgets } from './chat/ChatWidgets';
import { CurrencyProvider } from './currency/CurrencyContext';
import { ScrollToTop } from './lib/ScrollToTop';

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <CurrencyProvider>
        <MotionConfig reducedMotion="user">
        <ScrollToTop />
        <Routes>
          {/* public site */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<WebsitePage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/offices" element={<OfficesPage />} />
            {/* directories + marketplace surfaces (hero quick-access) */}
            <Route path="/sellers" element={<DirectoryPage type="sellers" />} />
            <Route path="/transporters" element={<DirectoryPage type="transporters" />} />
            <Route path="/loaders" element={<DirectoryPage type="loaders" />} />
            <Route path="/workers" element={<DirectoryPage type="workers" />} />
            <Route path="/u/:userId" element={<PublicProfilePage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/bids" element={<BuyerBidsPage />} />
            <Route path="/bid/:id" element={<BuyerBidRoomPage />} />
            {/* The older community requirements board, moved off /bids. */}
            <Route path="/requirements" element={<RequirementsBoardPage />} />
            <Route path="/safe-deal" element={<SafeDealPage />} />
            <Route path="/p/:slug" element={<PageView />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <ProfileFormPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/otp-login" element={<OtpLoginPage />} />

          {/* protected console. The `:section/*` form lets notification deep
              links (F05) such as /console/wallet or /console/settings/verification
              open the right section instead of falling through to the catch-all. */}
          <Route
            path="/console"
            element={
              <ProtectedRoute>
                <ConsolePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/console/:section/*"
            element={
              <ProtectedRoute>
                <ConsolePage />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/console" replace />} />
          {/* F05: buyer order notifications link to /orders/:id — route it to the
              console orders section with the order pre-opened. */}
          <Route path="/orders/:id" element={<Navigate to="/console/orders" replace />} />

          {/* internal design-system reference (not linked publicly) */}
          <Route path="/system" element={<SystemPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* Global chat systems (Community bottom-left, Live Support bottom-right). */}
        <ChatWidgets />
        {/* Foreground toasts for live in-app + push notifications. */}
        <Toaster position="top-right" richColors closeButton />
        </MotionConfig>
        </CurrencyProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
