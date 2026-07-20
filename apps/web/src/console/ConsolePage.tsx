import { useState } from 'react';
import { AnimatePresence, Card, Icon, motion, usePageMotion } from '@agrotraders/ui';
import { useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { ConsoleLayout, type ConsoleNavItem } from './ConsoleLayout';
import { Overview } from './sections/Overview';
import { BuyerDashboard } from './sections/BuyerDashboard';
import { BrowseSection, SavedSection, SafeDealSection, TransportSection, InvoicesSection, MessagesSection } from './sections/BuyerExtras';
import { BuyerBids } from './sections/BuyerBids';
import { BuyerAuctions } from './sections/BuyerAuctions';
import { SellerDashboard } from './sections/SellerDashboard';
import { AddProductSection, SellerBids, SellerAuctions, SellerOffers, SellerAds, SellerAnalytics } from './sections/SellerExtras';
import { SellerProducts } from './sections/SellerProducts';
import { SellerOrders } from './sections/SellerOrders';
import { BuyerOrders } from './sections/BuyerOrders';
import { WalletSection } from './sections/WalletSection';
import { EarningsSection } from './sections/EarningsSection';
import { TransporterRequests, TransporterTrips, TransporterVehicles, TransporterRoutes } from './sections/transporter';
import { TransporterDashboard } from './sections/TransporterDashboard';
import { TransporterQuotes, TransporterDrivers, TransporterInvoices, TransporterOrders, TransporterRatings, TransporterMyRequests } from './sections/TransporterExtras';
import { SellerInvoices, LoadercoInvoices, WorkerInvoices } from './sections/InvoiceCenter';
import { LoaderWorkers, LoaderTeams } from './sections/loaderco';
import { LoaderDashboard } from './sections/LoaderDashboard';
import { LoaderJobRequests, LoaderActiveJobs, LoaderAvailability, LoaderPricing, LoaderAttendance, LoaderReviews } from './sections/LoaderExtras';
import { WorkerJobs, WorkerDashboard, WorkerAttendance, WorkerReviews } from './sections/worker';
import { RolesAccessSection } from './sections/AccessSections';
import { HiresSection } from './sections/HiresSection';
import { KycSection } from './sections/KycSection';
import { ProfileForm } from '../pages/ProfileFormPage';

// Nav items carry only `id` + `icon`; labels are translated at render from
// `web:console.nav.<id>` in ConsoleLayout (never store the English label here).
const dash: ConsoleNavItem = { id: 'dashboard', icon: 'gauge' };
// Available in every role's console — request additional dashboards.
const accessNav: ConsoleNavItem = { id: 'access', icon: 'user' };
const hiresNav: ConsoleNavItem = { id: 'hires', icon: 'worker' };
const verifyNav: ConsoleNavItem = { id: 'verify', icon: 'shield' };
const profileNav: ConsoleNavItem = { id: 'profile', icon: 'user' };

const NAV: Record<string, ConsoleNavItem[]> = {
  buyer: [
    dash,
    { id: 'browse', icon: 'search' },
    { id: 'orders', icon: 'box' },
    { id: 'bids', icon: 'gavel' },
    { id: 'auctions', icon: 'gavel' },
    { id: 'saved', icon: 'heart' },
    { id: 'safedeal', icon: 'shield' },
    { id: 'transport', icon: 'truck' },
    { id: 'wallet', icon: 'wallet' },
    { id: 'invoices', icon: 'file' },
    { id: 'messages', icon: 'message' },
  ],
  seller: [
    dash,
    { id: 'inventory', icon: 'store' },
    { id: 'add', icon: 'plus' },
    { id: 'orders', icon: 'box' },
    { id: 'bids', icon: 'file' },
    { id: 'auctions', icon: 'gavel' },
    { id: 'offers', icon: 'star' },
    { id: 'ads', icon: 'chart' },
    { id: 'payouts', icon: 'wallet' },
    { id: 'wallet', icon: 'wallet' },
    { id: 'invoices', icon: 'file' },
    { id: 'analytics', icon: 'gauge' },
  ],
  transporter: [
    dash,
    { id: 'loads', icon: 'box' },
    { id: 'requests', icon: 'search' },
    { id: 'myrequests', icon: 'box' },
    { id: 'quotes', icon: 'file' },
    { id: 'trips', icon: 'truck' },
    { id: 'vehicles', icon: 'truck' },
    { id: 'drivers', icon: 'user' },
    { id: 'routes', icon: 'globe' },
    { id: 'earnings', icon: 'wallet' },
    { id: 'wallet', icon: 'wallet' },
    { id: 'invoices', icon: 'file' },
    { id: 'ratings', icon: 'star' },
  ],
  loaderco: [
    dash,
    { id: 'jobrequests', icon: 'box' },
    { id: 'activejobs', icon: 'worker' },
    { id: 'workers', icon: 'user' },
    { id: 'teams', icon: 'grid' },
    { id: 'availability', icon: 'clock' },
    { id: 'pricing', icon: 'chart' },
    { id: 'attendance', icon: 'check' },
    { id: 'earnings', icon: 'wallet' },
    { id: 'wallet', icon: 'wallet' },
    { id: 'invoices', icon: 'file' },
    { id: 'reviews', icon: 'star' },
  ],
  worker: [
    dash,
    { id: 'jobs', icon: 'worker' },
    { id: 'earnings', icon: 'wallet' },
    { id: 'wallet', icon: 'wallet' },
    { id: 'attendance', icon: 'clock' },
    { id: 'reviews', icon: 'star' },
    { id: 'invoices', icon: 'file' },
  ],
};

/** Roles with a dedicated dashboard title; others fall back to `console.title.fallback`. */
const TITLE_ROLES = new Set(['buyer', 'seller', 'transporter', 'loaderco', 'worker']);

function ComingSoon({ labelKey }: { labelKey: string }) {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col items-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
        <Icon name="gauge" size={28} />
      </span>
      <p className="mt-3 font-display text-lg font-bold text-ink">
        {t(`console.nav.${labelKey}`, { defaultValue: t('console.sectionFallback') })}
      </p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{t('console.comingSoonBody')}</p>
    </Card>
  );
}

export function ConsolePage() {
  const { user, activeRole } = useAuth();
  const { t } = useI18n();
  const role = activeRole || user?.role || 'buyer';
  const greetName = user?.name ?? t('console.nameFallback');
  // Admins have no public console (they use admin.agrotraders.org); every other
  // role gets Hires (direct hiring) + the extended Profile.
  const extras = [hiresNav, verifyNav, profileNav, accessNav];
  const nav = [...(NAV[role] ?? NAV.buyer), ...extras];
  const [active, setActive] = useState('dashboard');

  const render = () => {
    if (active === 'access') return <RolesAccessSection />;
    if (active === 'hires') return <HiresSection />;
    if (active === 'verify') return <KycSection />;
    if (active === 'profile') return <ProfileForm />;
    if (active === 'dashboard') {
      if (role === 'buyer') return <BuyerDashboard name={greetName} onNavigate={setActive} />;
      if (role === 'seller') return <SellerDashboard name={greetName} onNavigate={setActive} />;
      if (role === 'transporter') return <TransporterDashboard name={greetName} onNavigate={setActive} />;
      if (role === 'loaderco') return <LoaderDashboard name={greetName} onNavigate={setActive} />;
      if (role === 'worker') return <WorkerDashboard />;
      return <Overview name={greetName} />;
    }
    // Wallet (add money to hire) and Earnings (read-only, from completed work)
    // are shared across every role that has them.
    if (active === 'wallet') return <WalletSection />;
    if (active === 'earnings') return <EarningsSection />;
    if (role === 'seller') {
      if (active === 'inventory') return <SellerProducts />;
      if (active === 'add') return <AddProductSection onNavigate={setActive} />;
      if (active === 'orders') return <SellerOrders />;
      if (active === 'bids') return <SellerBids />;
      if (active === 'auctions') return <SellerAuctions />;
      if (active === 'offers') return <SellerOffers />;
      if (active === 'ads') return <SellerAds />;
      if (active === 'payouts') return <EarningsSection title={t('console.payoutsTitle')} sub={t('console.payoutsSub')} />;
      if (active === 'invoices') return <SellerInvoices />;
      if (active === 'analytics') return <SellerAnalytics />;
    }
    if (role === 'buyer') {
      if (active === 'browse') return <BrowseSection />;
      if (active === 'orders') return <BuyerOrders />;
      if (active === 'bids') return <BuyerBids />;
      if (active === 'auctions') return <BuyerAuctions />;
      if (active === 'saved') return <SavedSection />;
      if (active === 'safedeal') return <SafeDealSection />;
      if (active === 'transport') return <TransportSection />;
      if (active === 'invoices') return <InvoicesSection />;
      if (active === 'messages') return <MessagesSection />;
    }
    if (role === 'transporter') {
      if (active === 'loads') return <TransporterOrders />;
      if (active === 'requests') return <TransporterRequests />;
      if (active === 'myrequests') return <TransporterMyRequests />;
      if (active === 'quotes') return <TransporterQuotes />;
      if (active === 'trips') return <TransporterTrips />;
      if (active === 'vehicles') return <TransporterVehicles />;
      if (active === 'drivers') return <TransporterDrivers />;
      if (active === 'routes') return <TransporterRoutes />;
      if (active === 'invoices') return <TransporterInvoices />;
      if (active === 'ratings') return <TransporterRatings />;
    }
    if (role === 'loaderco') {
      if (active === 'jobrequests') return <LoaderJobRequests />;
      if (active === 'activejobs') return <LoaderActiveJobs />;
      if (active === 'workers') return <LoaderWorkers />;
      if (active === 'teams') return <LoaderTeams />;
      if (active === 'availability') return <LoaderAvailability />;
      if (active === 'pricing') return <LoaderPricing />;
      if (active === 'attendance') return <LoaderAttendance />;
      if (active === 'invoices') return <LoadercoInvoices />;
      if (active === 'reviews') return <LoaderReviews />;
    }
    if (role === 'worker' && active === 'jobs') return <WorkerJobs />;
    if (role === 'worker' && active === 'attendance') return <WorkerAttendance />;
    if (role === 'worker' && active === 'reviews') return <WorkerReviews />;
    if (role === 'worker' && active === 'invoices') return <WorkerInvoices />;
    return <ComingSoon labelKey={active} />;
  };

  return (
    <ConsoleLayout
      title={TITLE_ROLES.has(role) ? t(`console.title.${role}`) : t('console.title.fallback')}
      sub={user?.name ?? ''}
      nav={nav}
      active={active}
      onSelect={setActive}
    >
      <SectionSwap sectionKey={`${role}:${active}`}>{render()}</SectionSwap>
    </ConsoleLayout>
  );
}

/** Animates the console content whenever the active section changes. */
function SectionSwap({ sectionKey, children }: { sectionKey: string; children: React.ReactNode }) {
  const page = usePageMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={sectionKey} {...page}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
