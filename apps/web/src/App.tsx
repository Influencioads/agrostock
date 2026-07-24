import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MotionConfig } from '@agrotraders/ui';
import { I18nProvider } from './i18n';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { SiteLayout } from './layouts/SiteLayout';

import { ChatWidgets } from './chat/ChatWidgets';
import { CurrencyProvider } from './currency/CurrencyContext';
import { ScrollToTop } from './lib/ScrollToTop';

// PERF-05: route pages are code-split so the initial storefront bundle no
// longer ships the console, auth flows and every marketing page at once.
const WebsitePage = lazy(() => import('./pages/WebsitePage').then((m) => ({ default: m.WebsitePage })));
const MarketPage = lazy(() => import('./pages/MarketPage').then((m) => ({ default: m.MarketPage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const OfficesPage = lazy(() => import('./pages/OfficesPage').then((m) => ({ default: m.OfficesPage })));
const DirectoryPage = lazy(() => import('./pages/DirectoryPage').then((m) => ({ default: m.DirectoryPage })));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage })));
const AuctionsPage = lazy(() => import('./pages/AuctionsPage').then((m) => ({ default: m.AuctionsPage })));
const BuyerBidsPage = lazy(() => import('./pages/BuyerBidsPage').then((m) => ({ default: m.BuyerBidsPage })));
const BuyerBidRoomPage = lazy(() => import('./pages/BuyerBidRoomPage').then((m) => ({ default: m.BuyerBidRoomPage })));
const RequirementsBoardPage = lazy(() => import('./pages/RequirementsBoardPage').then((m) => ({ default: m.RequirementsBoardPage })));
const SafeDealPage = lazy(() => import('./pages/SafeDealPage').then((m) => ({ default: m.SafeDealPage })));
const ProfileFormPage = lazy(() => import('./pages/ProfileFormPage').then((m) => ({ default: m.ProfileFormPage })));
const PageView = lazy(() => import('./pages/PageView').then((m) => ({ default: m.PageView })));
const ConsolePage = lazy(() => import('./console/ConsolePage').then((m) => ({ default: m.ConsolePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const OtpLoginPage = lazy(() => import('./pages/OtpLoginPage').then((m) => ({ default: m.OtpLoginPage })));
const SystemPage = lazy(() => import('./pages/SystemPage').then((m) => ({ default: m.SystemPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

/**
 * FLOW-01: carry the order id from a notification deep link (/orders/:id) into
 * the console orders section, which reads `?open=` to expand that order.
 */
function OrderDeepLink() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/console/orders?open=${encodeURIComponent(id)}` : '/console/orders'} replace />;
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <CurrencyProvider>
        <MotionConfig reducedMotion="user">
        <ScrollToTop />
        <Suspense fallback={<div className="py-24 text-center text-ink-soft">Loading…</div>}>
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
          {/* F05/FLOW-01: buyer order notifications link to /orders/:id. Forward the
              id as ?open= so the console can actually open that order — the old
              redirect dropped it, so every order notification landed on a generic
              list despite the comment claiming otherwise. */}
          <Route path="/orders/:id" element={<OrderDeepLink />} />

          {/* internal design-system reference (not linked publicly) */}
          <Route path="/system" element={<SystemPage />} />

          {/* WEB-08: a real 404. Unknown URLs used to silently redirect to the
              homepage, so a typo'd or dead link gave the user no feedback at all. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
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
