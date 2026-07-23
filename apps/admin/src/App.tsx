import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MotionConfig } from '@agrotraders/ui';
import { I18nProvider } from './i18n';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './layout/AdminLayout';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage } from './pages/UsersPage';
import { RoleRequestsPage } from './pages/RoleRequestsPage';
import { TeamPage } from './pages/TeamPage';
import { KycPage } from './pages/KycPage';
import { ProductsPage } from './pages/ProductsPage';
import { AdsPage } from './pages/AdsPage';
import { AuctionsPage } from './pages/AuctionsPage';
import { BidsPage } from './pages/BidsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { OrdersPage } from './pages/OrdersPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { SafeDealPage } from './pages/SafeDealPage';
import { MarketsPage } from './pages/MarketsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { DisputesPage } from './pages/DisputesPage';
import { CmsPage } from './pages/CmsPage';
import { EmailTemplatesPage } from './pages/EmailTemplatesPage';
import { OfficesPage } from './pages/OfficesPage';
import { BrandingPage } from './pages/BrandingPage';
import { AuditPage } from './pages/AuditPage';
import { SupportInboxPage } from './pages/SupportInboxPage';
import { CommunityModerationPage } from './pages/CommunityModerationPage';
import { ReviewsModerationPage } from './pages/ReviewsModerationPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <I18nProvider>
    <AuthProvider>
      <ProtectedRoute>
        <MotionConfig reducedMotion="user">
        <Routes>
          <Route element={<AdminLayout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/role-requests" element={<RoleRequestsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/kyc" element={<KycPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/ads" element={<AdsPage />} />
        <Route path="/auctions" element={<AuctionsPage />} />
        <Route path="/bids" element={<BidsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/safedeal" element={<SafeDealPage />} />
        <Route path="/disputes" element={<DisputesPage />} />
        <Route path="/reviews" element={<ReviewsModerationPage />} />
        <Route path="/support" element={<SupportInboxPage />} />
        <Route path="/community" element={<CommunityModerationPage />} />
        <Route path="/transport" element={<CompaniesPage kind="transport" />} />
        <Route path="/loaders" element={<CompaniesPage kind="loaders" />} />
        <Route path="/cms" element={<CmsPage />} />
        <Route path="/email-templates" element={<EmailTemplatesPage />} />
        <Route path="/offices" element={<OfficesPage />} />
        <Route path="/branding" element={<BrandingPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<OverviewPage />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors closeButton />
        </MotionConfig>
      </ProtectedRoute>
    </AuthProvider>
    </I18nProvider>
  );
}
