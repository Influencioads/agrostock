import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MotionConfig } from '@agrotraders/ui';
import { I18nProvider } from './i18n';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout, MODULES } from './layout/AdminLayout';
import { RequirePermission } from './auth/RequirePermission';

// PERF-05: every admin page is code-split so the initial bundle loads one
// page, not all 29. A named-export -> default shim keeps the existing imports.
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const RoleRequestsPage = lazy(() => import('./pages/RoleRequestsPage').then((m) => ({ default: m.RoleRequestsPage })));
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const KycPage = lazy(() => import('./pages/KycPage').then((m) => ({ default: m.KycPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const AdsPage = lazy(() => import('./pages/AdsPage').then((m) => ({ default: m.AdsPage })));
const AuctionsPage = lazy(() => import('./pages/AuctionsPage').then((m) => ({ default: m.AuctionsPage })));
const BidsPage = lazy(() => import('./pages/BidsPage').then((m) => ({ default: m.BidsPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const SafeDealPage = lazy(() => import('./pages/SafeDealPage').then((m) => ({ default: m.SafeDealPage })));
const MarketsPage = lazy(() => import('./pages/MarketsPage').then((m) => ({ default: m.MarketsPage })));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const DisputesPage = lazy(() => import('./pages/DisputesPage').then((m) => ({ default: m.DisputesPage })));
const CmsPage = lazy(() => import('./pages/CmsPage').then((m) => ({ default: m.CmsPage })));
const EmailTemplatesPage = lazy(() => import('./pages/EmailTemplatesPage').then((m) => ({ default: m.EmailTemplatesPage })));
const OfficesPage = lazy(() => import('./pages/OfficesPage').then((m) => ({ default: m.OfficesPage })));
const BrandingPage = lazy(() => import('./pages/BrandingPage').then((m) => ({ default: m.BrandingPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })));
const SupportInboxPage = lazy(() => import('./pages/SupportInboxPage').then((m) => ({ default: m.SupportInboxPage })));
const CommunityModerationPage = lazy(() => import('./pages/CommunityModerationPage').then((m) => ({ default: m.CommunityModerationPage })));
const ReviewsModerationPage = lazy(() => import('./pages/ReviewsModerationPage').then((m) => ({ default: m.ReviewsModerationPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

// ADM-01: the permission that guards each route's sidebar link, keyed by path,
// so routes and nav stay in lockstep from the single MODULES source of truth.
const PERM_BY_PATH = Object.fromEntries(MODULES.map((m) => [m.to, m.perm]));

/** Wrap a page in the permission gate for its own path. */
function guard(path: string, element: JSX.Element) {
  return <RequirePermission perm={PERM_BY_PATH[path]}>{element}</RequirePermission>;
}

export function App() {
  return (
    <I18nProvider>
    <AuthProvider>
      <ProtectedRoute>
        <MotionConfig reducedMotion="user">
        <Suspense fallback={<div className="p-10 text-ink-soft">Loading…</div>}>
        <Routes>
          <Route element={<AdminLayout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/users" element={guard('/users', <UsersPage />)} />
        <Route path="/role-requests" element={guard('/role-requests', <RoleRequestsPage />)} />
        <Route path="/team" element={guard('/team', <TeamPage />)} />
        <Route path="/kyc" element={guard('/kyc', <KycPage />)} />
        <Route path="/products" element={guard('/products', <ProductsPage />)} />
        <Route path="/ads" element={guard('/ads', <AdsPage />)} />
        <Route path="/auctions" element={guard('/auctions', <AuctionsPage />)} />
        <Route path="/bids" element={guard('/bids', <BidsPage />)} />
        <Route path="/categories" element={guard('/categories', <CategoriesPage />)} />
        <Route path="/markets" element={guard('/markets', <MarketsPage />)} />
        <Route path="/orders" element={guard('/orders', <OrdersPage />)} />
        <Route path="/invoices" element={guard('/invoices', <InvoicesPage />)} />
        <Route path="/safedeal" element={guard('/safedeal', <SafeDealPage />)} />
        <Route path="/disputes" element={guard('/disputes', <DisputesPage />)} />
        <Route path="/reviews" element={guard('/reviews', <ReviewsModerationPage />)} />
        <Route path="/support" element={guard('/support', <SupportInboxPage />)} />
        <Route path="/community" element={guard('/community', <CommunityModerationPage />)} />
        <Route path="/transport" element={guard('/transport', <CompaniesPage kind="transport" />)} />
        <Route path="/loaders" element={guard('/loaders', <CompaniesPage kind="loaders" />)} />
        <Route path="/cms" element={guard('/cms', <CmsPage />)} />
        <Route path="/email-templates" element={guard('/email-templates', <EmailTemplatesPage />)} />
        <Route path="/offices" element={guard('/offices', <OfficesPage />)} />
        <Route path="/branding" element={guard('/branding', <BrandingPage />)} />
        <Route path="/payments" element={guard('/payments', <PaymentsPage />)} />
        <Route path="/reports" element={guard('/reports', <ReportsPage />)} />
        <Route path="/audit" element={guard('/audit', <AuditPage />)} />
        <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<OverviewPage />} />
          </Route>
        </Routes>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
        </MotionConfig>
      </ProtectedRoute>
    </AuthProvider>
    </I18nProvider>
  );
}
