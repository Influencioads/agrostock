import type { ComponentType } from 'react';
import { SellerAddProduct } from './seller/AddProduct';
import { SellerBids } from './seller/Bids';
import { SellerAds } from './seller/Ads';
import { SellerAuctions } from './seller/Auctions';
import { SellerOffers } from './seller/Offers';
import { SellerAnalytics } from './seller/Analytics';
import { SellerPayouts } from './seller/Payouts';
import { BuyerDashboard } from './buyer/Dashboard';
import { BuyerBids } from './buyer/Bids';
import { BuyerAuctions } from './buyer/Auctions';
import { BuyerInvoices } from './buyer/Invoices';
import { BuyerMessages } from './buyer/Messages';
import { BuyerSaved } from './buyer/Saved';
import { BuyerSafeDeal } from './buyer/SafeDeal';
import { BuyerTransport } from './buyer/Transport';
import { BuyerWallet } from './buyer/Wallet';
import { TransporterLoads } from './transporter/Loads';
import { TransporterQuotes } from './transporter/Quotes';
import { TransporterVehicles } from './transporter/Vehicles';
import { TransporterDrivers } from './transporter/Drivers';
import { TransporterRoutes } from './transporter/Routes';
import { TransporterMyRequests } from './transporter/MyRequests';
import { TransporterInvoices } from './transporter/Invoices';
import { TransporterRatings } from './transporter/Ratings';
import { TransporterTracking } from './transporter/Tracking';
import { LoaderTeams, LoaderAvailability, LoaderAttendance, LoaderPricing, LoaderReviews } from './loaderco/extras';
import { WorkerAttendance } from './worker/Attendance';
import { WorkerReviews } from './worker/Reviews';
import { WalletScreen, EarningsScreen } from './components/MoneyScreens';
import { InvoiceCenter } from './components/InvoiceCenter';
import { HiresScreen } from './HiresScreen';
import { Kyc } from './auth/Kyc';

/** Section-routed earnings sit under a navigator header — no internal heading. */
const SectionEarnings = () => <EarningsScreen showTitle={false} />;

/**
 * Maps `${role}:${section}` → screen component. Sections register here as they
 * are built; unknown keys fall back to a Placeholder in SectionScreen.
 */
export type SectionComponent = ComponentType<Record<string, never>>;

export const sectionRegistry: Record<string, SectionComponent> = {
  // Verification (KYC) — shared across every role.
  'buyer:verify': Kyc,
  'seller:verify': Kyc,
  'transporter:verify': Kyc,
  'loaderco:verify': Kyc,
  'worker:verify': Kyc,
  // Seller
  'seller:add': SellerAddProduct,
  'seller:bids': SellerBids,
  'seller:auctions': SellerAuctions,
  'seller:offers': SellerOffers,
  'seller:analytics': SellerAnalytics,
  'seller:payouts': SellerPayouts,
  'seller:ads': SellerAds,
  'seller:wallet': WalletScreen,
  'seller:invoices': InvoiceCenter,
  // The shared hires screen already renders sent + incoming for any role.
  'seller:hires': HiresScreen,
  // Buyer
  'buyer:dashboard': BuyerDashboard,
  'buyer:bids': BuyerBids,
  'buyer:auctions': BuyerAuctions,
  'buyer:invoices': BuyerInvoices,
  'buyer:messages': BuyerMessages,
  'buyer:saved': BuyerSaved,
  'buyer:safedeal': BuyerSafeDeal,
  'buyer:transport': BuyerTransport,
  'buyer:wallet': BuyerWallet,
  // Transporter
  'transporter:loads': TransporterLoads,
  'transporter:myrequests': TransporterMyRequests,
  'transporter:quotes': TransporterQuotes,
  'transporter:vehicles': TransporterVehicles,
  'transporter:drivers': TransporterDrivers,
  'transporter:routes': TransporterRoutes,
  'transporter:invoices': TransporterInvoices,
  'transporter:earnings': SectionEarnings,
  'transporter:wallet': WalletScreen,
  'transporter:hires': HiresScreen,
  'transporter:ratings': TransporterRatings,
  'transporter:tracking': TransporterTracking,
  // Loader company
  'loaderco:teams': LoaderTeams,
  'loaderco:availability': LoaderAvailability,
  'loaderco:attendance': LoaderAttendance,
  'loaderco:pricing': LoaderPricing,
  'loaderco:earnings': SectionEarnings,
  'loaderco:wallet': WalletScreen,
  'loaderco:reviews': LoaderReviews,
  'loaderco:invoices': InvoiceCenter,
  'loaderco:hires': HiresScreen,
  // Worker
  'worker:wallet': WalletScreen,
  'worker:earnings': SectionEarnings,
  'worker:attendance': WorkerAttendance,
  'worker:reviews': WorkerReviews,
  'worker:invoices': InvoiceCenter,
  'worker:hires': HiresScreen,
};

export function getSection(role: string, section: string): SectionComponent | null {
  return sectionRegistry[`${role}:${section}`] ?? null;
}
