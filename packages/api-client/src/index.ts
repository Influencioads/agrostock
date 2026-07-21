import axios, { type AxiosInstance } from 'axios';
import { io, type Socket } from 'socket.io-client';

/* ── notification preferences ───────────────────────────────────── */

export type NotificationCategoryKey =
  | 'orders'
  | 'bids'
  | 'auctions'
  | 'wallet'
  | 'account'
  | 'reviews'
  | 'hire'
  | 'transport'
  | 'loader'
  | 'community'
  | 'support';

export interface NotificationCategoryPref {
  label: string;
  transactional: boolean;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface NotificationPreferences {
  categories: Record<NotificationCategoryKey, NotificationCategoryPref>;
  emailUnsubscribedAll: boolean;
}

export interface NotificationPrefsPatch {
  emailUnsubscribedAll?: boolean;
  categories?: Partial<
    Record<NotificationCategoryKey, Partial<{ email: boolean; push: boolean; inApp: boolean }>>
  >;
}

/* ── country reference ──────────────────────────────────────────── */

/** A country a seller can trade from or supply to. `name` is the stored value. */
export interface Country {
  name: string;
  flag: string;
}

/**
 * Shared country list for location + supply-country pickers across web and
 * mobile. Ordered roughly by agri-trade relevance, then alphabetical. `name`
 * is what gets persisted, so keep these stable.
 */
export const COUNTRIES: Country[] = [
  { name: 'India', flag: '🇮🇳' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Russia', flag: '🇷🇺' },
  { name: 'Ukraine', flag: '🇺🇦' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Turkey', flag: '🇹🇷' },
  { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'Thailand', flag: '🇹🇭' },
  { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'Egypt', flag: '🇪🇬' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'South Africa', flag: '🇿🇦' },
  { name: 'Kenya', flag: '🇰🇪' },
  { name: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Kuwait', flag: '🇰🇼' },
  { name: 'Iran', flag: '🇮🇷' },
  { name: 'Iraq', flag: '🇮🇶' },
  { name: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Uzbekistan', flag: '🇺🇿' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'Italy', flag: '🇮🇹' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Poland', flag: '🇵🇱' },
  { name: 'Romania', flag: '🇷🇴' },
  { name: 'Belgium', flag: '🇧🇪' },
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Peru', flag: '🇵🇪' },
  { name: 'Chile', flag: '🇨🇱' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Philippines', flag: '🇵🇭' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Nepal', flag: '🇳🇵' },
  { name: 'Myanmar', flag: '🇲🇲' },
  { name: 'Morocco', flag: '🇲🇦' },
  { name: 'Algeria', flag: '🇩🇿' },
  { name: 'Tunisia', flag: '🇹🇳' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Tanzania', flag: '🇹🇿' },
  { name: 'Uganda', flag: '🇺🇬' },
  { name: 'Ivory Coast', flag: '🇨🇮' },
  { name: 'Sudan', flag: '🇸🇩' },
  { name: 'Azerbaijan', flag: '🇦🇿' },
  { name: 'Georgia', flag: '🇬🇪' },
  { name: 'Afghanistan', flag: '🇦🇫' },
  { name: 'Jordan', flag: '🇯🇴' },
  { name: 'Lebanon', flag: '🇱🇧' },
  { name: 'Oman', flag: '🇴🇲' },
  { name: 'Bahrain', flag: '🇧🇭' },
  { name: 'Yemen', flag: '🇾🇪' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'Greece', flag: '🇬🇷' },
  { name: 'Hungary', flag: '🇭🇺' },
  { name: 'Bulgaria', flag: '🇧🇬' },
  { name: 'Serbia', flag: '🇷🇸' },
  { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Denmark', flag: '🇩🇰' },
  { name: 'Ireland', flag: '🇮🇪' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Austria', flag: '🇦🇹' },
  { name: 'New Zealand', flag: '🇳🇿' },
];

/** Look up a country's flag by its stored name (empty string when unknown). */
export const countryFlag = (name?: string | null): string =>
  (name && COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.flag) || '';

/* ── response types (mirror the NestJS API) ─────────────────────── */

export interface ApiSubcategory {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  sort: number;
  categoryId: string;
  parentId?: string | null;
  _count?: { products: number; children?: number };
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  tint: string | null;
  sort?: number;
  subcategories?: ApiSubcategory[];
  _count?: { products: number };
}

export interface ApiMarket {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  country: string;
  region?: string | null;
  flag?: string | null;
  active?: boolean;
  /** Seller-proposed markets are `pending` until an admin approves them. */
  status?: 'pending' | 'approved' | 'rejected';
  createdById?: string | null;
  createdBy?: { id: string; name: string } | null;
  _count?: { products: number; profiles: number };
}

export interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  /** Cover image — always mirrors `images[0]` when the gallery is non-empty. */
  imageUrl: string | null;
  /** Gallery, max 6, ordered; the first entry is the cover. */
  images?: string[];
  grade: string | null;
  flag: string | null;
  origin: string | null;
  /** Structured listing location (city + country). */
  city?: string | null;
  country?: string | null;
  /** Countries the seller can supply/ship this product to. */
  supplyCountries?: string[];
  qty: string | null;
  moq: string | null;
  price: string;
  /** USD cents baseline for currency conversion (null when the price string is unparseable). */
  priceCents?: number | null;
  unit: string;
  rating: string;
  verified: boolean;
  safeDeal: boolean;
  isOffer: boolean;
  isAuction: boolean;
  /** New listings await admin approval; only approved products are public. */
  approved?: boolean;
  startBidCents?: number | null;
  auctionEndsAt?: string | null;
  delivery: string | null;
  /** Category/subcategory-specific attribute values, keyed by field key. */
  attributes?: Record<string, unknown> | null;
  category?: { name: string } | ApiCategory;
  subcategory?: { name: string } | ApiSubcategory | null;
  seller?: { id?: string; name: string; country?: string | null; kycStatus?: string } | null;
  market?: ApiMarket | null;
}

/** A raw auction bid row (owner/admin bid-book view). Distinct from `ApiSellerBid`. */
export interface ApiAuctionBid {
  id: string;
  amountCents: number;
  createdAt: string;
  bidder?: { id: string; name: string };
}

/**
 * One row of the PUBLIC, masked bid history for an open ascending auction.
 * Everyone sees the offer price and order; `masked` hides the identity (the
 * seller/admin sees the real name; the viewer's own rows read "You").
 */
export interface ApiAuctionBidRow {
  id: string;
  amountCents: number;
  createdAt: string;
  auto: boolean;
  isYou: boolean;
  isTop: boolean;
  flag: string;
  masked: string;
}

/** Public snapshot fields shared by the auction list + detail payloads. */
export interface ApiAuctionPublic {
  bidCount: number;
  /** PUBLIC in an open auction — the current highest bid (null when none yet). */
  highestCents: number | null;
  highBidderMasked: string | null;
  highBidderId: string | null;
  /** Real winner name — owner/admin only, else null. */
  highBidder: string | null;
  bidIncrementCents: number;
  /** Lowest bid that would currently lead: `highest + increment`. */
  minNextCents: number;
  /** Reserve price — owner/admin only. */
  reserveCents: number | null;
  hasReserve: boolean;
  reserveMet: boolean;
}

/** The viewer's position in a lot (buyers only; null for the owner/guests). */
export interface ApiAuctionStanding {
  yourMaxCents: number | null;
  yourRank: number | null;
  bidderCount: number;
  leading: boolean;
  outbid: boolean;
  autoMaxCents: number | null;
}

/** A seller's auction listing, enriched with the public snapshot. */
export interface ApiAuctionListing extends ApiProduct, ApiAuctionPublic {}

/** Full open-auction detail: product + public snapshot + the viewer's standing. */
export interface ApiAuctionDetail extends ApiProduct, ApiAuctionPublic {
  isOwner: boolean;
  standing: ApiAuctionStanding | null;
}

/** LIVE iff `status === 'approved' && active && product.approved`. */
export interface ApiAdCampaign {
  id: string;
  sellerId: string;
  productId: string;
  dailyBudgetCents: number;
  /** The seller's pause/resume switch. Toggling it never re-triggers review. */
  active: boolean;
  /** The admin's moderation gate. */
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  /** Delivery metrics. */
  impressions?: number;
  clicks?: number;
  createdAt: string;
  product?: { id: string; name: string; emoji: string | null };
  seller?: { id: string; name: string };
}

export interface ApiDriver {
  id: string;
  name: string;
  vehicle: string | null;
  ratingPct: number | null;
  onTimePct: number | null;
  status: 'active' | 'off';
  /** Uploaded photo path ("/uploads/drivers/…"); resolve with `assetUrl()`. */
  photoUrl: string | null;
  phone: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  experienceYears: number | null;
  ratePerHourCents: number | null;
  createdAt: string;
}

/** Fields accepted when creating/editing a driver (dates as ISO strings). */
export interface DriverInput {
  name: string;
  vehicle?: string;
  ratingPct?: number;
  onTimePct?: number;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  experienceYears?: number;
  ratePerHourCents?: number;
}

export interface ApiVehicle {
  id: string;
  type: string;
  plate: string;
  capacityMt: string | null;
  status: 'available' | 'on_trip' | 'maintenance';
  /** Uploaded photo path ("/uploads/vehicles/…"); resolve with `assetUrl()`. */
  photoUrl: string | null;
  makeModel: string | null;
  year: number | null;
  insuranceExpiry: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ApiRoute {
  id: string;
  name: string;
  fromCity: string;
  toCity: string;
  fromCountry: string | null;
  toCountry: string | null;
  distanceKm: number | null;
  baseRateCents: number | null;
  active: boolean;
  createdAt: string;
}

/** A place resolved by the server-side geocoding proxy (`/geo`). */
export interface ApiGeoPoint {
  query: string;
  lat: number;
  lng: number;
  label: string;
}

export interface ApiGeoRoute {
  from: ApiGeoPoint;
  to: ApiGeoPoint;
  /** Great-circle (straight-line) distance in km. */
  distanceKm: number;
}

export interface ApiCmsPage {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  published: boolean;
  updatedAt: string;
  createdAt: string;
}

/** The three admin-uploadable brand assets. `null` = use the built-in default. */
export const BRAND_ASSET_KINDS = ['logo', 'appIcon', 'favicon'] as const;
export type BrandAssetKind = (typeof BRAND_ASSET_KINDS)[number];

export interface ApiBranding {
  logoUrl: string | null;
  appIconUrl: string | null;
  faviconUrl: string | null;
}

export interface ApiAdminPayments {
  totalBalanceCents: number;
  walletCount: number;
  escrowHeldCents: number;
  byType: Record<string, number>;
  byRole?: Record<string, number>;
  txns: {
    id: string;
    amountCents: number;
    type: string;
    note: string | null;
    createdAt: string;
    user: { id: string; name: string; role: string } | null;
  }[];
}

export interface ApiAdminWallet {
  userId: string;
  balanceCents: number;
  user: { id: string; name: string; email: string; role: string; country: string | null } | null;
}
export interface ApiWalletTx {
  id: string;
  amountCents: number;
  type: string;
  note: string | null;
  createdAt: string;
}
export interface ApiAdminWalletLedger {
  userId: string;
  balanceCents: number;
  user: { id: string; name: string; email: string; role: string } | null;
  txns: ApiWalletTx[];
}
export interface ApiPayoutRequest {
  id: string;
  userId: string;
  amountCents: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  note: string | null;
  decidedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string } | null;
}

export interface AdminCommunityAnalytics {
  groups: number;
  posts: number;
  requirements: number;
  messages: number;
  openReports: number;
}
export interface AdminCommunityReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string } | null;
}
export interface AdminCommunityGroup {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  isDefault: boolean;
  kind: string;
  _count?: { members: number; posts: number; messages: number };
}
export interface AdminCommunityPost {
  id: string;
  body: string;
  type: string;
  pinned: boolean;
  createdAt: string;
  author: { id: string; name: string } | null;
  group: { id: string; name: string } | null;
  _count?: { savedBy: number };
}

/** Public profile fields — the private contact fields never appear here. */
export interface ApiProfile {
  bio?: string | null;
  location?: string | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  timezone?: string | null;
  languages?: string | null;
  /** Uploaded photo path ("/uploads/avatars/…"); resolve with `assetUrl()`. */
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  market?: ApiMarket | null;
  // Operational registration data (transporters / loader companies).
  originCity?: string | null;
  originCountry?: string | null;
  operatingCities?: string[];
  operatingCountries?: string[];
  supplyingCities?: string[];
  supplyingCountries?: string[];
  minWorkHours?: number | null;
  minDistanceKm?: number | null;
  minLoaders?: number | null;
}

/** Own/admin view — includes the private contact fields. */
export interface ApiPrivateProfile extends ApiProfile {
  phone?: string | null;
  whatsapp?: string | null;
  contactEmail?: string | null;
  marketId?: string | null;
}

export interface ApiDirectoryEntry {
  id: string;
  name: string;
  country: string | null;
  kycStatus: string;
  createdAt: string;
  type: 'seller' | 'transporter' | 'loaderco' | 'worker';
  profile?: ApiProfile | null;
  routes?: { name: string; fromCity: string; toCity: string }[];
  _count?: Record<string, number>;
}

export interface ApiWorkerEntry {
  id: string;
  name: string;
  rating: string | null;
  status: string;
  type: 'worker';
  independent?: boolean;
  originCity?: string | null;
  originCountry?: string | null;
  operatingCities?: string[];
  operatingCountries?: string[];
  minWorkHours?: number | null;
  loaderco?: { id: string; name: string } | null;
  user?: { id: string; country: string | null; kycStatus: string; profile?: ApiProfile | null } | null;
  _count?: { assignments: number };
}

// ── Loader company (loaderco) dashboard ──
export interface ApiLoaderWorker {
  id: string;
  name: string;
  rating?: string | null;
  status: string;
  phone?: string | null;
  skill?: string | null;
  dailyWageCents?: number | null;
  originCity?: string | null;
  originCountry?: string | null;
  operatingCities?: string[];
  operatingCountries?: string[];
  minWorkHours?: number | null;
  team?: { id: string; name: string } | null;
  user?: { id: string; email: string } | null;
}
export interface ApiLoaderTeam {
  id: string;
  name: string;
  _count?: { workers: number };
  workers?: { id: string; name: string; status: string; rating?: string | null; skill?: string | null }[];
}
export interface ApiLoaderJob {
  id: string;
  reference: string;
  location: string;
  workersNeeded: number;
  status: string;
  payCents?: number | null;
  cargo?: string | null;
  neededDate?: string | null;
  createdBy?: { id: string; name: string; role: string } | null;
  order?: { reference: string; qty: string | null; product?: { name: string } | null } | null;
  assignments?: { id: string; status: string; worker?: { id: string; name: string; status: string } }[];
}
export interface ApiLoaderJobDetail extends ApiLoaderJob {
  otp?: string | null;
  notes?: string | null;
  createdBy?: { id: string; name: string; role: string; country?: string | null } | null;
  order?: {
    reference: string;
    qty: string | null;
    amountCents?: number | null;
    status?: ApiOrderStatus;
    product?: { name: string; emoji?: string | null; imageUrl?: string | null } | null;
    buyer?: { name: string } | null;
    seller?: { name: string } | null;
  } | null;
  assignments?: {
    id: string;
    status: string;
    worker?: { id: string; name: string; status: string; skill?: string | null; phone?: string | null };
  }[];
  attendance?: { id: string; checkInAt: string | null; checkOutAt: string | null; worker?: { id: string; name: string } }[];
}
export interface ApiAttendance {
  id: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  date: string;
  worker?: { id: string; name: string };
  job?: { id: string; reference: string; location: string };
}
export interface ApiLoaderRate {
  id: string;
  service: string;
  rateCents: number;
  unit: string;
}
export interface ApiLoaderReview {
  id: string;
  stars: number;
  text: string | null;
  createdAt: string;
  rater?: { id: string; name: string } | null;
  job?: { reference: string } | null;
  team?: { name: string } | null;
}
export interface ApiLoaderReviews {
  avg: number;
  count: number;
  list: ApiLoaderReview[];
}

// ── Unified two-way reviews ──
export type ReviewKind = 'order' | 'trip' | 'loaderjob' | 'assignment' | 'hire';
export type ReviewRole =
  | 'seller'
  | 'buyer'
  | 'product'
  | 'transporter'
  | 'loaderco'
  | 'worker'
  | 'client';
export type ReviewStatus = 'visible' | 'hidden' | 'removed';
export interface ApiReview {
  id: string;
  kind: ReviewKind;
  revieweeRole: ReviewRole;
  stars: number;
  text: string | null;
  createdAt: string;
  editedByAuthorAt: string | null;
  raterId: string;
  revieweeId: string;
  productId: string | null;
  rater?: { id: string; name: string } | null;
  reviewee?: { id: string; name: string } | null;
}
export interface ApiReviewSummary {
  avg: number;
  count: number;
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
  list: ApiReview[];
}
export interface ApiReviewSide {
  role: ReviewRole;
  revieweeId: string;
  productId?: string | null;
}
export interface ApiReviewEligibility {
  eligible: boolean;
  reason?: string;
  sides: ApiReviewSide[];
  done: Record<string, boolean>;
}
/** One row of the admin moderation list (includes moderation internals). */
export interface ApiAdminReview extends ApiReview {
  status: ReviewStatus;
  adminNote: string | null;
  subjectId: string;
  reviewee?: { id: string; name: string; email?: string } | null;
  rater?: { id: string; name: string; email?: string } | null;
  product?: { id: string; name: string; slug: string } | null;
  editedByAdmin?: { id: string; name: string } | null;
}
export interface ApiWalletTx {
  id: string;
  amountCents: number;
  type: string;
  note: string | null;
  createdAt: string;
}
export interface ApiWallet {
  id: string;
  balanceCents: number;
  txns: ApiWalletTx[];
}
export interface ApiEarnings {
  earnedCents: number;
  weekCents: number;
  monthCents: number;
  txns: ApiWalletTx[];
}

export interface ApiPublicProfile {
  id: string;
  name: string;
  role: string;
  roles: string[];
  country: string | null;
  kycStatus: string;
  createdAt: string;
  profile: ApiProfile | null;
  contactMasked: { phone: string | null; email: string | null };
  products?: ApiProduct[];
  routes?: { name: string; fromCity: string; toCity: string; distanceKm: number | null }[];
  workerProfile?: {
    id: string;
    rating: string | null;
    status: string;
    originCity?: string | null;
    originCountry?: string | null;
    operatingCities?: string[];
    operatingCountries?: string[];
    minWorkHours?: number | null;
    loaderco?: { id: string; name: string } | null;
  } | null;
  _count?: Record<string, number>;
}

export interface ApiHireRequest {
  id: string;
  reference: string;
  targetType: 'transporter' | 'loaderco' | 'worker';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string | null;
  fromCity: string | null;
  toCity: string | null;
  cargo: string | null;
  location: string | null;
  workersNeeded: number | null;
  neededDate: string | null;
  budgetCents: number | null;
  createdAt: string;
  decidedAt: string | null;
  requester?: ApiHireParty;
  targetUser?: ApiHireParty;
  worker?: { id: string; name: string; rating: string | null; status: string } | null;
  transportRequestId?: string | null;
  loaderJobId?: string | null;
  /** Set when a seller sourced this hire from inside one of their orders. */
  orderId?: string | null;
  order?: { id: string; reference: string; status: ApiOrderStatus; amount?: string; product?: { name: string } | null } | null;
}

/** Counterparty in a hire — enough to vet and contact before accepting. */
export interface ApiHireParty {
  id: string;
  name: string;
  country: string | null;
  role: string;
  email?: string;
  kycStatus?: string;
  profile?: {
    phone?: string | null;
    whatsapp?: string | null;
    contactEmail?: string | null;
    avatarUrl?: string | null;
    avatarEmoji?: string | null;
    location?: string | null;
  } | null;
}

export interface ApiFxRates {
  base: 'USD';
  fetchedAt: string;
  stale: boolean;
  rates: Record<string, number>;
}

export interface ApiOffice {
  id: string;
  flag: string;
  name: string;
  type: string;
  city: string;
  mgr: string;
  tz: string | null;
  langs: string | null;
  staff: number;
}

/** Per-module admin capability. Mirrors the API `AdminPermission` enum. */
export type AdminPermission =
  | 'users_manage'
  | 'kyc_review'
  | 'role_requests'
  | 'products_moderate'
  | 'auctions_manage'
  | 'bids_manage'
  | 'orders_manage'
  | 'disputes_manage'
  | 'finance_manage'
  | 'transport_manage'
  | 'loaders_manage'
  | 'markets_manage'
  | 'offices_manage'
  | 'ads_moderate'
  | 'community_moderate'
  | 'support_agent'
  | 'cms_manage'
  | 'branding_manage'
  | 'audit_view'
  | 'reports_view'
  | 'staff_manage'
  | 'reviews_moderate';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Effective roles (primary ∪ approved extras) — drives the console switcher. */
  roles?: string[];
  active?: boolean;
  /** Per-module admin capabilities (only meaningful for role=admin accounts). */
  adminPermissions?: AdminPermission[];
  country: string | null;
  kycStatus: string;
  createdAt?: string;
}

export interface AdminCompanyBase {
  id: string;
  name: string;
  email: string;
  country: string | null;
  active: boolean;
  kycStatus: string;
  profile: { listApproved: boolean; phone: string | null; whatsapp: string | null; location: string | null } | null;
}
export interface AdminTransportCompany extends AdminCompanyBase {
  _count: { vehicles: number; routes: number; trips: number; drivers: number };
}
export interface AdminLoaderCompany extends AdminCompanyBase {
  _count: { workers: number; teams: number; loaderJobsManaged: number };
}
// Detail payloads carry the full nested records; kept loose to avoid duplicating every logistics model here.
export type AdminTransportCompanyDetail = Omit<AdminCompanyBase, 'profile'> & {
  profile: Record<string, unknown> | null;
  vehicles: Record<string, unknown>[];
  routes: Record<string, unknown>[];
  drivers: Record<string, unknown>[];
  trips: Record<string, unknown>[];
};
export type AdminLoaderCompanyDetail = Omit<AdminCompanyBase, 'profile'> & {
  profile: Record<string, unknown> | null;
  workers: Record<string, unknown>[];
  teams: Record<string, unknown>[];
  loaderJobsManaged: Record<string, unknown>[];
  loaderRates: Record<string, unknown>[];
};

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  imageUrl: string | null;
  price: string;
  priceCents: number | null;
  qty: string | null;
  moq: string | null;
  grade: string | null;
  origin: string | null;
  unit: string;
  delivery: string | null;
  status: 'pending' | 'live' | 'rejected' | 'hidden';
  approved: boolean;
  verified: boolean;
  safeDeal: boolean;
  isOffer: boolean;
  isAuction: boolean;
  rejectionReason: string | null;
  createdAt: string;
  seller: { name: string; country: string | null } | null;
  category: { name: string } | null;
}

export interface AdminAuction {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  status: string;
  startBidCents: number | null;
  auctionEndsAt: string | null;
  seller: { id: string; name: string } | null;
  highestCents: number | null;
  highBidder: string | null;
  bidCount: number;
}

export interface AdminBuyerBid {
  id: string;
  status: 'open' | 'awarded' | 'closed' | 'cancelled';
  mode: string;
  qtyValue: number;
  qtyUnit: string;
  targetPriceCents: number | null;
  bestPriceCents: number | null;
  createdAt: string;
  buyer: { id: string; name: string; country: string | null } | null;
  category: { id: string; name: string; slug: string; emoji: string | null } | null;
  product: { id: string; name: string; slug: string; emoji: string | null } | null;
  _count: { sellerBids: number };
}

export interface ApiRoleRequest {
  id: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  user?: { id: string; name: string; email: string; role: string; roles: string[]; country: string | null };
}

/** The full lifecycle. `shipped` is legacy — only pre-lifecycle rows carry it. */
export type ApiOrderStatus =
  | 'enquiry'
  | 'quote'
  | 'processing'
  | 'paid'
  | 'packed'
  | 'dispatched'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'dispute'
  | 'cancelled';

export type ApiOrderParty = 'buyer' | 'seller' | 'transporter';
export type ApiDispatchMode = 'platform' | 'external';

export interface ApiOrder {
  id: string;
  reference: string;
  amount: string;
  qty: string | null;
  status: ApiOrderStatus;
  createdAt?: string;
  amountCents?: number | null;
  unitPriceCents?: number | null;
  qtyValue?: number | null;
  qtyUnit?: string | null;
  currency?: string;
  note?: string | null;
  dispatchMode?: ApiDispatchMode | null;
  transporterName?: string | null;
  transporterPhone?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  dispatchedAt?: string | null;
  // The server's ORDER_INCLUDE always selects `id` on each party, so callers can
  // deep-link to a profile without re-checking for it.
  buyer?: { id: string; name: string; country?: string | null };
  seller?: { id: string; name: string; country?: string | null };
  product?: { id?: string; name: string; slug?: string; emoji?: string | null; imageUrl?: string | null } | null;
}

/** The happy path, in order — drives the progress steppers on web and mobile. */
export const ORDER_STEPS: ApiOrderStatus[] = [
  'enquiry',
  'quote',
  'processing',
  'paid',
  'packed',
  'dispatched',
  'in_transit',
  'delivered',
];

export const ORDER_LABELS: Record<ApiOrderStatus, string> = {
  enquiry: 'Enquiry sent',
  quote: 'Seller responded',
  processing: 'Order placed',
  paid: 'Escrow held',
  packed: 'Packed & ready',
  dispatched: 'Dispatched',
  shipped: 'Shipped',
  in_transit: 'In transit',
  delivered: 'Delivered',
  dispute: 'Dispute',
  cancelled: 'Cancelled',
};

/**
 * Mirrors `ORDER_TRANSITIONS` in `apps/api/src/orders/orders.module.ts`.
 *
 * `dispatched`, `in_transit` and `delivered` are absent by design — they are
 * only reachable through `orders.dispatch()` / `verifyPickup()` /
 * `verifyDelivery()`, so the OTP handshake cannot be skipped. Sending them to
 * `orders.setStatus()` is a 400.
 */
export const ORDER_NEXT: Record<ApiOrderStatus, { to: ApiOrderStatus; by: ApiOrderParty[] }[]> = {
  enquiry: [{ to: 'quote', by: ['seller'] }, { to: 'cancelled', by: ['buyer', 'seller'] }],
  quote: [{ to: 'processing', by: ['buyer'] }, { to: 'cancelled', by: ['buyer', 'seller'] }],
  processing: [
    { to: 'paid', by: ['buyer'] },
    { to: 'packed', by: ['seller'] },
    { to: 'cancelled', by: ['buyer', 'seller'] },
    { to: 'dispute', by: ['buyer', 'seller'] },
  ],
  paid: [{ to: 'packed', by: ['seller'] }, { to: 'dispute', by: ['buyer', 'seller'] }],
  packed: [{ to: 'dispute', by: ['buyer', 'seller'] }],
  dispatched: [{ to: 'dispute', by: ['buyer', 'seller'] }],
  // Legacy rows only — no forward edge (see ORDER_TRANSITIONS on the server).
  shipped: [{ to: 'dispute', by: ['buyer', 'seller'] }],
  in_transit: [{ to: 'dispute', by: ['buyer', 'seller'] }],
  delivered: [],
  dispute: [{ to: 'processing', by: ['seller'] }, { to: 'cancelled', by: ['buyer', 'seller'] }],
  cancelled: [],
};

/** The single forward step this party may take right now, if any. */
export function nextStatusFor(status: ApiOrderStatus, party: ApiOrderParty): ApiOrderStatus | null {
  const forward = ORDER_NEXT[status]?.find(
    (e) => e.by.includes(party) && e.to !== 'cancelled' && e.to !== 'dispute',
  );
  return forward?.to ?? null;
}

export interface ApiOrderEvent {
  id: string;
  type: string;
  fromStatus: ApiOrderStatus | null;
  toStatus: ApiOrderStatus | null;
  note: string | null;
  createdAt: string;
  actor?: { id: string; name: string } | null;
}

export interface ApiTrip {
  id: string;
  reference: string;
  fromCity: string;
  toCity: string;
  cargo: string;
  status: 'pending' | 'loading' | 'in_transit' | 'delivered' | 'delayed';
  transporter?: { id: string; name: string; country: string | null };
  vehicle?: { id: string; type: string; plate: string; capacityMt: string | null } | null;
  route?: { id: string; name: string; fromCity: string; toCity: string; distanceKm: number | null } | null;
}

/**
 * `GET /orders/:id`. OTPs are masked per party by the server: the seller sees
 * `pickupOtp`, the buyer sees `deliveryOtp`, the transporter sees neither.
 */
export interface ApiOrderDetail extends ApiOrder {
  pickupOtp: string | null;
  pickupVerifiedAt: string | null;
  deliveryOtp: string | null;
  deliveryVerifiedAt: string | null;
  parties: ApiOrderParty[];
  events: ApiOrderEvent[];
  trip: ApiTrip | null;
  invoices: Pick<ApiInvoice, 'id' | 'number' | 'kind' | 'status' | 'totalCents' | 'currency' | 'issuedAt'>[];
}

export interface DispatchBody {
  mode: ApiDispatchMode;
  transporterUserId?: string;
  vehicleId?: string;
  routeId?: string;
  transporterName?: string;
  transporterPhone?: string;
  vehiclePlate?: string;
  driverName?: string;
  fromCity?: string;
  toCity?: string;
}

// ── Buyer bids / reverse auction ─────────────────────────────────

export type ApiBuyerBidMode = 'quote' | 'auction';

/** A seller's response to an `ApiBuyerBid`. Distinct from an auction bid. */
export interface ApiSellerBid {
  id: string;
  priceCents: number;
  qtyValue: number;
  etaDays: number | null;
  message: string | null;
  status: 'submitted' | 'awarded' | 'rejected' | 'withdrawn';
  createdAt: string;
  seller?: { id: string; name: string; country: string | null };
}

export interface ApiBuyerBid {
  id: string;
  reference: string;
  mode: ApiBuyerBidMode;
  status: 'open' | 'awarded' | 'closed' | 'cancelled';
  title: string;
  productName: string;
  qtyValue: number;
  qtyUnit: string;
  targetPriceCents: number | null;
  currency: string;
  deliveryPlace: string | null;
  destinationCountry: string | null;
  deadline: string | null;
  auctionEndsAt: string | null;
  notes: string | null;
  /** Buyer-supplied photos of the goods wanted, max 6; the first is the cover. */
  images: string[];
  createdAt: string;
  orderId: string | null;
  awardedSellerBidId: string | null;
  buyer?: { id: string; name: string; country: string | null };
  category?: { id: string; name: string; slug: string; emoji: string | null } | null;
  product?: { id: string; name: string; slug: string; emoji: string | null } | null;
  /** Lowest price so far. Null in sealed quote-mode when the viewer isn't the buyer. */
  bestPriceCents?: number | null;
  _count?: { sellerBids: number };
}

export interface ApiBuyerBidDetail extends ApiBuyerBid {
  sellerBids: ApiSellerBid[];
  isOwner: boolean;
  /** Distinct sellers who have bid. Safe in both modes — competition without identity. */
  sellerCount: number;
  bidCount: number;
  /** The viewer's own lowest price. Null for the owner, who sees every price anyway. */
  yourBestPriceCents: number | null;
}

/**
 * One row of the masked seller-bid book for a buyer bid. This is a REVERSE
 * auction — cheapest wins — so `isTop` marks the LOWEST price, the mirror of
 * `ApiAuctionBidRow`'s highest. Sealed in quote mode: a non-owner gets only
 * their own rows.
 */
export interface ApiBuyerBidRow {
  id: string;
  priceCents: number;
  qtyValue: number;
  etaDays: number | null;
  message: string | null;
  status: 'submitted' | 'awarded' | 'rejected' | 'withdrawn';
  createdAt: string;
  isYou: boolean;
  isTop: boolean;
  /** Stable decorative flag keyed off the seller id. Not their real country. */
  flag: string;
  /** Real name for the owner/admin, 'You' for your own row, else "R••• K.". */
  masked: string;
  /** Real seller id — owner/admin only, else null. */
  sellerId: string | null;
}

// ── Invoicing ────────────────────────────────────────────────────

export type ApiInvoiceKind = 'order' | 'trip' | 'loaderjob' | 'assignment';

export interface ApiInvoiceLine {
  id: string;
  description: string;
  qty: number;
  unit: string | null;
  unitPriceCents: number;
  amountCents: number;
}

export interface ApiInvoice {
  id: string;
  number: string;
  kind: ApiInvoiceKind;
  status: 'draft' | 'issued' | 'paid' | 'void';
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  issuer?: { id: string; name: string; email: string; country: string | null };
  recipient?: { id: string; name: string; email: string; country: string | null };
  /** Exactly one subject FK is set, matching `kind`. */
  orderId?: string | null;
  tripId?: string | null;
  loaderJobId?: string | null;
  jobAssignmentId?: string | null;
  order?: { id: string; reference: string; product?: { name: string } | null } | null;
  lines?: ApiInvoiceLine[];
}

export interface ApiKyc {
  id: string;
  status: string;
  docs: number;
  createdAt: string;
  user: { name: string; role: string; country: string | null };
  _count?: { documents: number };
}

export type ApiKycDocType = 'trade_license' | 'government_id' | 'bank_proof' | 'tax_certificate' | 'other';

export interface ApiKycDocument {
  id: string;
  type: ApiKycDocType;
  originalName: string | null;
  mime: string;
  sizeBytes: number;
  createdAt: string;
}

/** The caller's own KYC status + uploaded documents (`GET /me/kyc`). */
export interface ApiMyKyc {
  status: string;
  notes: string | null;
  documents: ApiKycDocument[];
}

/** Full KYC record for the admin doc viewer (`GET /admin/kyc/:id`). */
export interface ApiKycDetail {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string; country: string | null };
  documents: ApiKycDocument[];
}

/** An invoice row in the admin oversight list (`GET /admin/invoices`). */
export interface ApiAdminInvoice {
  id: string;
  number: string;
  kind: ApiInvoiceKind;
  status: 'draft' | 'issued' | 'paid' | 'void';
  currency: string;
  totalCents: number;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  issuer: { id: string; name: string; email: string };
  recipient: { id: string; name: string; email: string };
}

export interface ApiStats {
  users: number;
  products: number;
  orders: number;
  pendingKyc: number;
  pendingProducts?: number;
  pendingRoleRequests?: number;
  pendingMarkets?: number;
  pendingAds?: number;
  disputes?: number;
  pendingPayouts?: number;
}

export interface ApiAdminReports {
  kpis: { newUsers: number; orders: number; gmvCents: number; escrowReleasedCents: number };
  usersByRole: Record<string, number>;
  ordersByStatus: Record<string, number>;
  volumeSeries: number[];
  growthSeries: number[];
}

export interface ApiAuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
}

export interface AuthResult {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export interface ProductQuery {
  /** Stable category id filter. Preferred over `category` when available. */
  categoryId?: string;
  category?: string;
  /** Stable subcategory id filter. Includes that node's descendant branch on the API. */
  subcategoryId?: string;
  subcategory?: string;
  /** Market slug filter. */
  market?: string;
  /** Market city (matched case-insensitively via the market relation). */
  city?: string;
  /** Market country (matched case-insensitively via the market relation). */
  country?: string;
  /** Product grade (e.g. "Premium", "Organic"). */
  grade?: string;
  /** Minimum price in USD cents (inclusive). */
  minPrice?: number;
  /** Maximum price in USD cents (inclusive). */
  maxPrice?: number;
  verified?: boolean;
  safe?: boolean;
  offer?: boolean;
  auction?: boolean;
  search?: string;
  sort?: string;
  /**
   * Category/subcategory-specific attribute filters, keyed by field key; each
   * maps to the selected option values (OR-ed within a field, AND across fields).
   * Serialized to `attr_<key>=v1,v2` on the wire.
   */
  attrs?: Record<string, string[]>;
  /** 1-based page number. */
  page?: number;
  /** Items per page (server clamps to a max of 60). */
  pageSize?: number;
}

/** Paginated product list envelope returned by `products.listPaged`. */
export interface ProductListResult {
  items: ApiProduct[];
  total: number;
  page: number;
  pageSize: number;
}

/** Serialize a ProductQuery into the flat string query params `GET /products` expects. */
function productQueryParams(q: ProductQuery): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {
    categoryId: q.categoryId,
    category: q.category,
    subcategoryId: q.subcategoryId,
    subcategory: q.subcategory,
    market: q.market || undefined,
    city: q.city || undefined,
    country: q.country || undefined,
    grade: q.grade || undefined,
    minPrice: q.minPrice != null ? String(q.minPrice) : undefined,
    maxPrice: q.maxPrice != null ? String(q.maxPrice) : undefined,
    verified: q.verified ? 'true' : undefined,
    safe: q.safe ? 'true' : undefined,
    offer: q.offer ? 'true' : undefined,
    auction: q.auction ? 'true' : undefined,
    search: q.search || undefined,
    sort: q.sort,
    page: q.page != null ? String(q.page) : undefined,
    pageSize: q.pageSize != null ? String(q.pageSize) : undefined,
  };
  // Attribute facets → attr_<key>=v1,v2 (only non-empty selections are sent).
  if (q.attrs) {
    for (const [key, values] of Object.entries(q.attrs)) {
      if (values && values.length) params[`attr_${key}`] = values.join(',');
    }
  }
  return params;
}

export interface DirectoryQuery {
  country?: string;
  market?: string;
  verified?: boolean;
  search?: string;
  sort?: string;
  status?: string;
  // Operational filters. operating*/supplying* match a single tag exactly.
  originCity?: string;
  originCountry?: string;
  operatingCity?: string;
  operatingCountry?: string;
  supplyingCity?: string;
  supplyingCountry?: string;
  // Numeric thresholds (find providers whose stated minimum is <= this).
  minWorkHours?: number;
  minDistanceKm?: number;
  minLoaders?: number;
}

/* ── client ─────────────────────────────────────────────────────── */

export interface ApiClientOptions {
  baseURL: string;
  getToken?: () => string | null | undefined;
  /** Optional active dashboard role for multi-role accounts. */
  getActiveRole?: () => string | null | undefined;
  /** Current UI locale, sent as `Accept-Language` so reads return translated content. */
  getLocale?: () => string | null | undefined;
  /** Supplies the stored refresh token for transparent 401 recovery. */
  getRefreshToken?: () => string | null | undefined;
  /** Called with a fresh token pair after a successful silent refresh. */
  onTokens?: (result: AuthResult) => void;
  /** Called when refresh is impossible (no/expired refresh token) — e.g. force logout. */
  onAuthError?: () => void;
}

export function createApiClient(opts: ApiClientOptions) {
  const root = opts.baseURL.replace(/\/$/, '') + '/api';
  const http: AxiosInstance = axios.create({ baseURL: root });
  http.interceptors.request.use((config) => {
    const token = opts.getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const activeRole = opts.getActiveRole?.();
    if (activeRole) config.headers['x-agro-active-role'] = activeRole;
    const locale = opts.getLocale?.();
    if (locale) config.headers['Accept-Language'] = locale;
    return config;
  });

  // Transparent access-token refresh: on a 401, try the refresh token once and
  // replay the original request. A bare axios call avoids recursing the interceptor.
  let refreshing: Promise<string | null> | null = null;
  http.interceptors.response.use(
    (r) => r,
    async (error) => {
      const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
      const status = error.response?.status;
      const refreshTok = opts.getRefreshToken?.();
      const isRefreshCall = original?.url?.includes('/auth/refresh');
      if (status !== 401 || !original || original._retried || !refreshTok || isRefreshCall) {
        if (status === 401 && !refreshTok) opts.onAuthError?.();
        return Promise.reject(error);
      }
      original._retried = true;
      try {
        refreshing ??= axios
          .post<AuthResult>(`${root}/auth/refresh`, { refreshToken: refreshTok })
          .then((res) => {
            opts.onTokens?.(res.data);
            return res.data.accessToken;
          })
          .finally(() => {
            refreshing = null;
          });
        const newToken = await refreshing;
        if (!newToken) {
          opts.onAuthError?.();
          return Promise.reject(error);
        }
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return http(original);
      } catch (e) {
        opts.onAuthError?.();
        return Promise.reject(e);
      }
    },
  );

  const get = async <T = unknown>(url: string, params?: Record<string, unknown>) =>
    (await http.get<T>(url, { params })).data;
  const post = async <T = unknown>(url: string, body?: unknown) => (await http.post<T>(url, body ?? {})).data;
  const put = async <T = unknown>(url: string, body?: unknown) => (await http.put<T>(url, body ?? {})).data;
  const patch = async <T = unknown>(url: string, body?: unknown) => (await http.patch<T>(url, body ?? {})).data;
  const del = async <T = unknown>(url: string) => (await http.delete<T>(url)).data;

  return {
    http,
    health: () => get<{ status: string }>('/health'),
    auth: {
      login: async (email: string, password: string) =>
        (await http.post<AuthResult>('/auth/login', { email, password })).data,
      register: async (body: {
        email: string;
        password: string;
        name: string;
        role?: string;
        country?: string;
        phone?: string;
        location?: string;
        marketId?: string;
        originCity?: string;
        originCountry?: string;
        operatingCities?: string[];
        operatingCountries?: string[];
        supplyingCities?: string[];
        supplyingCountries?: string[];
        minWorkHours?: number;
        minDistanceKm?: number;
        minLoaders?: number;
      }) => (await http.post<AuthResult>('/auth/register', body)).data,
      refresh: async (refreshToken: string) =>
        (await http.post<AuthResult>('/auth/refresh', { refreshToken })).data,
      me: () => get<ApiUser>('/auth/me'),
    },
    categories: { list: () => get<ApiCategory[]>('/categories') },
    offices: { list: () => get<ApiOffice[]>('/offices') },
    markets: {
      /** Public: approved markets only. */
      list: () => get<ApiMarket[]>('/markets'),
      /** Signed-in: approved markets + the caller's own pending proposals. */
      mine: () => get<ApiMarket[]>('/markets/mine'),
      /** Seller proposes a market; it lands `pending` and only they can see it. */
      create: (body: { name: string; country: string; city?: string; region?: string; flag?: string }) =>
        post<ApiMarket>('/markets', body),
    },
    fx: { rates: (symbols?: string) => get<ApiFxRates>('/fx/rates', { symbols }) },
    directory: {
      sellers: (q: DirectoryQuery = {}) =>
        get<ApiDirectoryEntry[]>('/directory/sellers', { ...q, verified: q.verified ? 'true' : undefined }),
      transporters: (q: DirectoryQuery = {}) =>
        get<ApiDirectoryEntry[]>('/directory/transporters', { ...q, verified: q.verified ? 'true' : undefined }),
      loaders: (q: DirectoryQuery = {}) =>
        get<ApiDirectoryEntry[]>('/directory/loaders', { ...q, verified: q.verified ? 'true' : undefined }),
      workers: (q: DirectoryQuery = {}) => get<ApiWorkerEntry[]>('/directory/workers', { ...q }),
      profile: (userId: string) => get<ApiPublicProfile>(`/directory/profile/${userId}`),
    },
    hires: {
      create: (body: {
        targetType: 'transporter' | 'loaderco' | 'worker';
        targetUserId: string;
        workerId?: string;
        message?: string;
        fromCity?: string;
        toCity?: string;
        cargo?: string;
        location?: string;
        workersNeeded?: number;
        neededDate?: string;
        budgetCents?: number;
        /** Source logistics for one of your orders (seller only). */
        orderId?: string;
      }) => post<ApiHireRequest>('/hires', body),
      /** Hires you SENT, optionally narrowed to a target type or one order. */
      mine: (q?: { targetType?: 'transporter' | 'loaderco' | 'worker'; orderId?: string }) =>
        get<ApiHireRequest[]>('/hires/mine', q as Record<string, string> | undefined),
      incoming: () => get<ApiHireRequest[]>('/hires/incoming'),
      accept: (id: string) => post<ApiHireRequest>(`/hires/${id}/accept`),
      decline: (id: string) => post<ApiHireRequest>(`/hires/${id}/decline`),
      cancel: (id: string) => post<ApiHireRequest>(`/hires/${id}/cancel`),
    },
    products: {
      /**
       * Paginated product search — returns the full `{ items, total, page,
       * pageSize }` envelope. Use for catalog screens that page/report counts.
       */
      listPaged: (q: ProductQuery = {}) =>
        get<ProductListResult>('/products', productQueryParams(q)),
      /**
       * Convenience wrapper returning just the product array (first/only page).
       * Backward-compatible with callers that don't need pagination metadata.
       */
      list: async (q: ProductQuery = {}) =>
        (await get<ProductListResult>('/products', productQueryParams(q))).items,
      get: (slug: string) => get<ApiProduct>(`/products/${slug}`),
      mine: () => get<ApiProduct[]>('/products/mine'),
      create: (body: Record<string, unknown>) => post<ApiProduct>('/products', body),
      update: (id: string, body: Record<string, unknown>) => patch<ApiProduct>(`/products/${id}`, body),
      remove: (id: string) => del(`/products/${id}`),
      /** Upload a product image (any format); server converts to WebP and returns its public path. */
      uploadImage: async (file: File | Blob | { uri: string; name: string; type: string }) => {
        const fd = new FormData();
        // React Native passes a {uri,name,type} descriptor; web passes a File/Blob.
        fd.append('file', file as never);
        return (await http.post<{ imageUrl: string }>('/products/upload-image', fd)).data;
      },
      /** Upload up to 6 gallery images at once. Order in = order out. */
      uploadImages: async (files: (File | Blob | { uri: string; name: string; type: string })[]) => {
        const fd = new FormData();
        // React Native passes {uri,name,type} descriptors; web passes File/Blob.
        for (const f of files) fd.append('files', f as never);
        return (await http.post<{ imageUrls: string[] }>('/products/upload-images', fd)).data;
      },
    },
    orders: {
      /** Direct purchase — skips the enquiry stage. */
      place: (body: { productSlug: string; qty: number }) => post<ApiOrder>('/orders', body),
      /** Step 1 of the lifecycle: ask the seller for terms. */
      enquiry: (body: { productSlug: string; qty: number; note?: string }) => post<ApiOrder>('/orders/enquiry', body),
      /** Step 2: seller answers with a price. */
      respond: (id: string, body: { unitPriceCents?: number; amountCents?: number; note?: string }) =>
        patch<ApiOrder>(`/orders/${id}/respond`, body),
      mine: () => get<ApiOrder[]>('/orders/mine'),
      incoming: () => get<ApiOrder[]>('/orders/incoming'),
      /** A transporter's work queue: orders riding on one of their trips. */
      transporting: () => get<ApiOrder[]>('/orders/transporting'),
      /** Rejected by the server for `dispatched`/`in_transit`/`delivered` — use the calls below. */
      setStatus: (id: string, status: ApiOrderStatus) => patch<ApiOrder>(`/orders/${id}/status`, { status }),
      /** Seller hands over the goods; the response carries the seller's pickup OTP. */
      dispatch: (id: string, body: DispatchBody) => post<ApiOrderDetail>(`/orders/${id}/dispatch`, body),
      verifyPickup: (id: string, otp: string) => post<{ ok: true; status: 'in_transit' }>(`/orders/${id}/pickup/verify`, { otp }),
      verifyDelivery: (id: string, otp: string) => post<{ ok: true; status: 'delivered' }>(`/orders/${id}/delivery/verify`, { otp }),
      get: (id: string) => get<ApiOrderDetail>(`/orders/${id}`),
    },
    buyerBids: {
      create: (body: {
        mode?: ApiBuyerBidMode;
        title: string;
        productName: string;
        qtyValue: number;
        qtyUnit?: string;
        targetPriceCents?: number;
        deliveryPlace?: string;
        destinationCountry?: string;
        deadline?: string;
        auctionEndsAt?: string;
        notes?: string;
        categoryId?: string;
        images?: string[];
      }) => post<ApiBuyerBid>('/buyer-bids', body),
      mine: () => get<ApiBuyerBid[]>('/buyer-bids/mine'),
      /** Public board: open auction-mode bids, soonest-closing first (no login needed). */
      live: () => get<ApiBuyerBid[]>('/buyer-bids/live'),
      open: (q?: { categoryId?: string; search?: string }) => get<ApiBuyerBid[]>('/buyer-bids/open', q),
      get: (id: string) => get<ApiBuyerBidDetail>(`/buyer-bids/${id}`),
      /** The masked bid book, cheapest first. Sealed in quote mode for non-owners. */
      bidBook: (id: string) => get<ApiBuyerBidRow[]>(`/buyer-bids/${id}/bids`),
      /** Buyer-scoped twin of `products.uploadImages` — that route is seller-only. */
      uploadImages: async (files: (File | Blob | { uri: string; name: string; type: string })[]) => {
        const fd = new FormData();
        for (const f of files) fd.append('files', f as never);
        return (await http.post<{ imageUrls: string[] }>('/buyer-bids/upload-images', fd)).data;
      },
      /** Seller submits. In `auction` mode the price must undercut the current best. */
      submitBid: (id: string, body: { priceCents: number; qtyValue: number; etaDays?: number; message?: string }) =>
        post<ApiBuyerBidDetail>(`/buyer-bids/${id}/bids`, body),
      myBids: () => get<(ApiSellerBid & { buyerBid: ApiBuyerBid })[]>('/buyer-bids/mine/bids'),
      /** Buyer picks a winner; the seller bid becomes a real Order. */
      award: (id: string, bidId: string) => post<{ buyerBid: ApiBuyerBid; order: ApiOrder }>(`/buyer-bids/${id}/bids/${bidId}/award`),
      cancel: (id: string) => post<ApiBuyerBid>(`/buyer-bids/${id}/cancel`),
    },
    invoices: {
      create: (body: {
        kind: ApiInvoiceKind;
        subjectId: string;
        lines?: { description: string; qty?: number; unit?: string; unitPriceCents: number }[];
        taxCents?: number;
        dueAt?: string;
        notes?: string;
      }) => post<ApiInvoice>('/invoices', body),
      mine: (role?: 'issued' | 'received') => get<ApiInvoice[]>('/invoices/mine', role ? { role } : undefined),
      get: (id: string) => get<ApiInvoice>(`/invoices/${id}`),
      setStatus: (id: string, status: 'paid' | 'void') => patch<ApiInvoice>(`/invoices/${id}/status`, { status }),
      /**
       * A ready-to-open PDF URL. The 5-minute token rides in the query string
       * because the browser's download and React Native's `Linking.openURL`
       * cannot attach an Authorization header.
       */
      pdfUrl: async (id: string) => {
        const { token } = await post<{ token: string }>(`/invoices/${id}/pdf-token`);
        return `${root}/invoices/${id}/pdf?token=${encodeURIComponent(token)}`;
      },
    },
    kyc: {
      /** The caller's own KYC status + uploaded documents. */
      mine: () => get<ApiMyKyc>('/me/kyc'),
      /** Upload one document; web passes a File/Blob, RN a {uri,name,type} descriptor. */
      uploadDocument: async (
        type: ApiKycDocType,
        file: File | Blob | { uri: string; name: string; type: string },
      ) => {
        const fd = new FormData();
        fd.append('type', type);
        fd.append('file', file as never);
        return (await http.post<ApiMyKyc>('/me/kyc/documents', fd)).data;
      },
      deleteDocument: (id: string) => del<ApiMyKyc>(`/me/kyc/documents/${id}`),
      /**
       * A ready-to-open URL for a KYC file. The 5-minute token rides in the
       * query string (browser download / RN Linking can't send an auth header).
       * Works for the owner and for admins.
       */
      docUrl: async (id: string) => {
        const { token } = await post<{ token: string }>(`/kyc/documents/${id}/token`);
        return `${root}/kyc/documents/${id}/file?token=${encodeURIComponent(token)}`;
      },
    },
    auctions: {
      list: () => get<ApiAuctionListing[]>('/auctions'),
      detail: (slug: string) => get<ApiAuctionDetail>(`/auctions/${slug}`),
      /** Public, masked bid history for an open ascending auction. */
      bids: (slug: string) => get<ApiAuctionBidRow[]>(`/auctions/${slug}/bids`),
      placeBid: (slug: string, amount: number) => post<ApiAuctionDetail>(`/auctions/${slug}/bids`, { amount }),
      /** Set a proxy-bid ceiling; the engine bids the minimum needed up to `max`. */
      setAutoBid: (slug: string, max: number) => post<ApiAuctionDetail>(`/auctions/${slug}/autobid`, { max }),
      clearAutoBid: (slug: string) => del<ApiAuctionDetail>(`/auctions/${slug}/autobid`),
      mine: () => get('/auctions/mine'),
      /** Seller's own auction listings, with the owner's full bid view. */
      selling: () => get<ApiAuctionListing[]>('/auctions/selling'),
      /** Close early; returns the winning bid (if any). */
      close: (slug: string) => post<{ ok: true; winner: ApiAuctionBid | null }>(`/auctions/${slug}/close`),
    },
    transport: {
      requestsOpen: () => get('/transport/requests'),
      myRequests: () => get('/transport/requests/mine'),
      createRequest: (b: Record<string, unknown>) => post('/transport/requests', b),
      quote: (id: string, b: { priceCents: number; etaDays?: number }) => post(`/transport/requests/${id}/quotes`, b),
      myQuotes: () => get('/transport/quotes/mine'),
      acceptQuote: (id: string) => post(`/transport/quotes/${id}/accept`),
      withdrawQuote: (id: string) => del(`/transport/quotes/${id}`),
      myTrips: () => get('/transport/trips/mine'),
      setTripStatus: (id: string, status: string) => patch(`/transport/trips/${id}/status`, { status }),
      vehicles: () => get<ApiVehicle[]>('/transport/vehicles'),
      addVehicle: (b: Record<string, unknown>) => post<ApiVehicle>('/transport/vehicles', b),
      updateVehicle: (id: string, b: Record<string, unknown>) => patch<ApiVehicle>(`/transport/vehicles/${id}`, b),
      uploadVehiclePhoto: async (id: string, file: File | Blob | { uri: string; name: string; type: string }) => {
        const fd = new FormData();
        fd.append('file', file as never);
        return (await http.post<ApiVehicle>(`/transport/vehicles/${id}/photo`, fd)).data;
      },
      delVehicle: (id: string) => del(`/transport/vehicles/${id}`),
      routes: () => get<ApiRoute[]>('/transport/routes'),
      addRoute: (b: Record<string, unknown>) => post<ApiRoute>('/transport/routes', b),
      updateRoute: (id: string, b: Record<string, unknown>) => patch<ApiRoute>(`/transport/routes/${id}`, b),
      delRoute: (id: string) => del(`/transport/routes/${id}`),
    },
    geo: {
      /** Resolve a single place name to coordinates via the server-side proxy. */
      geocode: (q: string) => get<ApiGeoPoint>('/geo/geocode', { q }),
      /** Resolve two places and get both endpoints plus straight-line distance. */
      route: (from: string, to: string) => get<ApiGeoRoute>('/geo/route', { from, to }),
    },
    loaders: {
      // teams
      teams: () => get<ApiLoaderTeam[]>('/loaders/teams'),
      addTeam: (name: string) => post<ApiLoaderTeam>('/loaders/teams', { name }),
      updateTeam: (id: string, name: string) => patch<ApiLoaderTeam>(`/loaders/teams/${id}`, { name }),
      delTeam: (id: string) => post(`/loaders/teams/${id}/delete`),
      // workers
      workers: () => get<ApiLoaderWorker[]>('/loaders/workers'),
      addWorker: (b: {
        name: string;
        teamId?: string;
        phone?: string;
        skill?: string;
        dailyWageCents?: number;
        originCity?: string;
        originCountry?: string;
        operatingCities?: string[];
        operatingCountries?: string[];
        minWorkHours?: number;
        loginHandle?: string;
        loginPassword?: string;
      }) => post<ApiLoaderWorker>('/loaders/workers', b),
      updateWorker: (
        id: string,
        b: {
          name?: string;
          teamId?: string | null;
          phone?: string;
          skill?: string;
          dailyWageCents?: number;
          originCity?: string;
          originCountry?: string;
          operatingCities?: string[];
          operatingCountries?: string[];
          minWorkHours?: number;
          status?: string;
        },
      ) => patch<ApiLoaderWorker>(`/loaders/workers/${id}`, b),
      delWorker: (id: string) => post(`/loaders/workers/${id}/delete`),
      // jobs
      openJobs: () => get<ApiLoaderJob[]>('/loaders/jobs/open'),
      myJobs: () => get<ApiLoaderJob[]>('/loaders/jobs/mine'),
      jobDetail: (id: string) => get<ApiLoaderJobDetail>(`/loaders/jobs/${id}`),
      createJob: (b: Record<string, unknown>) => post('/loaders/jobs', b),
      claimJob: (id: string) => post(`/loaders/jobs/${id}/claim`),
      assign: (id: string, b: { workerIds?: string[]; teamId?: string; workerId?: string }) =>
        post<ApiLoaderJob>(`/loaders/jobs/${id}/assign`, b),
      unassign: (id: string, workerId: string) => post<ApiLoaderJob>(`/loaders/jobs/${id}/unassign`, { workerId }),
      setJobStatus: (id: string, status: string) => post<ApiLoaderJob>(`/loaders/jobs/${id}/status`, { status }),
      reviewJob: (id: string, b: { stars: number; text?: string }) => post<ApiLoaderReview>(`/loaders/jobs/${id}/review`, b),
      // worker side
      workerJobs: () => get('/loaders/worker/jobs'),
      accept: (id: string) => post(`/loaders/assignments/${id}/accept`),
      checkin: (id: string) => post(`/loaders/assignments/${id}/checkin`),
      checkout: (id: string) => post(`/loaders/assignments/${id}/checkout`),
      workerAttendance: () => get<ApiAttendance[]>('/loaders/worker/attendance'),
      workerReviews: () => get<ApiLoaderReviews>('/loaders/worker/reviews'),
      setWorkerAvailability: (available: boolean) =>
        post<{ id: string; status: string }>('/loaders/worker/availability', { available }),
      // availability
      availability: () => get<{ id: string; weekday: number; slot: string; available: boolean }[]>('/loaders/availability'),
      setAvailability: (cells: { weekday: number; slot: string; available: boolean }[]) =>
        put<{ id: string; weekday: number; slot: string; available: boolean }[]>('/loaders/availability', { cells }),
      // attendance
      attendance: (date?: string) => get<ApiAttendance[]>('/loaders/attendance', date ? { date } : undefined),
      attendanceCheckin: (workerId: string, jobId: string) =>
        post<ApiAttendance>('/loaders/attendance/checkin', { workerId, jobId }),
      attendanceCheckout: (id: string) => post<ApiAttendance>('/loaders/attendance/checkout', { id }),
      // rate card
      rates: () => get<ApiLoaderRate[]>('/loaders/rates'),
      addRate: (b: { service: string; rateCents: number; unit?: string }) => post<ApiLoaderRate>('/loaders/rates', b),
      updateRate: (id: string, b: { service?: string; rateCents?: number; unit?: string }) =>
        patch<ApiLoaderRate>(`/loaders/rates/${id}`, b),
      delRate: (id: string) => post(`/loaders/rates/${id}/delete`),
      // reviews
      reviews: () => get<ApiLoaderReviews>('/loaders/reviews'),
    },
    /** Unified two-way reviews across every completed service. */
    reviews: {
      /** All visible reviews on a specific subject (order/trip/job/…). */
      forSubject: (kind: ReviewKind, subjectId: string) =>
        get<ApiReviewSummary>(`/reviews/subject/${kind}/${subjectId}`),
      /** Visible reviews received by a user, optionally one target role. */
      forUser: (userId: string, role?: ReviewRole) =>
        get<ApiReviewSummary>(`/reviews/user/${userId}`, role ? { role } : undefined),
      /** Visible reviews of a product. */
      forProduct: (productId: string) => get<ApiReviewSummary>(`/reviews/product/${productId}`),
      /** Reviews the current user has authored. */
      mine: () => get<ApiReview[]>('/reviews/mine'),
      /** Whether the current user may still review a subject (drives prompts). */
      eligibility: (kind: ReviewKind, subjectId: string) =>
        get<ApiReviewEligibility>('/reviews/eligibility', { kind, subjectId }),
      /** Submit a new review for a completed service. */
      create: (body: { kind: ReviewKind; subjectId: string; revieweeRole: ReviewRole; stars: number; text?: string }) =>
        post<ApiReview>('/reviews', body),
      /** Edit one's own review (authors only; recipients can never change it). */
      update: (id: string, body: { stars?: number; text?: string }) =>
        patch<ApiReview>(`/reviews/${id}`, body),
    },
    ads: {
      mine: () => get<ApiAdCampaign[]>('/ads'),
      /** Creates a `pending` campaign — an admin must approve it before it runs. */
      create: (body: { productId: string; dailyBudgetCents: number }) => post<ApiAdCampaign>('/ads', body),
      /** Changing the budget re-opens review; toggling `active` does not. */
      update: (id: string, body: { active?: boolean; dailyBudgetCents?: number }) => patch<ApiAdCampaign>(`/ads/${id}`, body),
      /** Public: products behind live campaigns, for the Highlighted rail. */
      promoted: (limit?: number) => get<ApiProduct[]>('/ads/promoted', limit ? { limit: String(limit) } : undefined),
    },
    drivers: {
      mine: () => get<ApiDriver[]>('/drivers'),
      create: (body: DriverInput) => post<ApiDriver>('/drivers', body),
      update: (id: string, body: Partial<DriverInput & { status: 'active' | 'off' }>) => patch<ApiDriver>(`/drivers/${id}`, body),
      uploadPhoto: async (id: string, file: File | Blob | { uri: string; name: string; type: string }) => {
        const fd = new FormData();
        fd.append('file', file as never);
        return (await http.post<ApiDriver>(`/drivers/${id}/photo`, fd)).data;
      },
      remove: (id: string) => del(`/drivers/${id}`),
    },
    cms: {
      list: () => get<ApiCmsPage[]>('/cms'),
      get: (slug: string) => get<ApiCmsPage>(`/cms/${slug}`),
    },
    branding: {
      /** Public — read at app boot to resolve the logo and favicon. */
      get: () => get<ApiBranding>('/branding'),
    },
    me: {
      wallet: () => get<ApiWallet>('/me/wallet'),
      topup: (amount: number) => post<ApiWallet>('/me/wallet/topup', { amount }),
      withdraw: (amount: number) => post<ApiWallet>('/me/wallet/withdraw', { amount }),
      earnings: () => get<ApiEarnings>('/me/earnings'),
      /**
       * A ready-to-open transaction-statement URL (CSV or PDF). The 5-minute
       * token rides in the query string so a browser download or RN
       * `Linking.openURL` — neither of which can attach an auth header — works.
       */
      statementUrl: async (kind: 'csv' | 'pdf', range?: { from?: string; to?: string }) => {
        const { token } = await post<{ token: string }>('/me/wallet/statement/token');
        const qs = new URLSearchParams({ token });
        if (range?.from) qs.set('from', range.from);
        if (range?.to) qs.set('to', range.to);
        return `${root}/me/wallet/statement.${kind}?${qs.toString()}`;
      },
      dashboard: () => get<{ kpis: Record<string, number>; rating?: number; available?: boolean }>('/me/dashboard'),
      revenue: () => get<{ data8: number[]; data12: number[] }>('/me/analytics/revenue'),
      series: () => get<{ data8: number[]; data12: number[] }>('/me/analytics/series'),
      roleRequests: () => get<ApiRoleRequest[]>('/me/role-requests'),
      requestRole: (role: string, note?: string) =>
        post<ApiRoleRequest>('/me/role-requests', { role, note }),
      profile: () => get<ApiPrivateProfile | null>('/me/profile'),
      updateProfile: (body: Partial<ApiPrivateProfile>) => put<ApiPrivateProfile>('/me/profile', body),
      /** Persist the chosen UI locale so server-rendered notifications/push/email are localized. */
      setLocale: (locale: string) => put<{ id: string; locale: string }>('/me/locale', { locale }),
      /** Upload a profile photo; server converts to WebP and returns its public path. */
      uploadAvatar: async (file: File | Blob | { uri: string; name: string; type: string }) => {
        const fd = new FormData();
        // React Native passes a {uri,name,type} descriptor; web passes a File/Blob.
        fd.append('file', file as never);
        return (await http.post<{ avatarUrl: string }>('/me/profile/avatar', fd)).data;
      },
    },
    admin: {
      stats: () => get<ApiStats>('/admin/stats'),
      volume: () => get<{ data8: number[]; data12: number[] }>('/admin/stats/volume'),
      reports: (range?: { from?: string; to?: string }) => get<ApiAdminReports>('/admin/reports', range as Record<string, unknown> | undefined),
      audit: (params?: { actorId?: string; action?: string; entityType?: string; from?: string; to?: string; take?: number; skip?: number }) =>
        get<{ rows: ApiAuditEntry[]; total: number }>('/admin/audit', params as Record<string, unknown> | undefined),
      // ── reviews moderation (reviews_moderate) ──
      reviews: (params?: { kind?: string; status?: string; search?: string; take?: number; skip?: number }) =>
        get<{ rows: ApiAdminReview[]; total: number }>('/admin/reviews', params as Record<string, unknown> | undefined),
      updateReview: (id: string, body: { stars?: number; text?: string; status?: ReviewStatus; adminNote?: string }) =>
        patch<ApiAdminReview>(`/admin/reviews/${id}`, body),
      deleteReview: (id: string) => post<{ ok: boolean }>(`/admin/reviews/${id}/delete`),
      payments: (range?: { from?: string; to?: string }) => get<ApiAdminPayments>('/admin/payments', range as Record<string, unknown> | undefined),
      wallets: (search?: string, role?: string) => get<ApiAdminWallet[]>('/admin/wallets', { search, role }),
      walletLedger: (userId: string) => get<ApiAdminWalletLedger>(`/admin/wallets/${userId}`),
      adjustWallet: (userId: string, body: { amountCents: number; type: 'topup' | 'refund' | 'payout' | 'withdraw'; note?: string }) =>
        post<ApiAdminWalletLedger>(`/admin/wallets/${userId}/adjust`, body),
      payouts: (status?: string) => get<ApiPayoutRequest[]>('/admin/payouts', { status }),
      decidePayout: (id: string, status: 'approved' | 'rejected', note?: string) =>
        post<ApiPayoutRequest>(`/admin/payouts/${id}/decide`, { status, note }),
      // ── offices ──
      createOffice: (body: Omit<ApiOffice, 'id'>) => post<ApiOffice>('/admin/offices', body),
      updateOffice: (id: string, body: Partial<Omit<ApiOffice, 'id'>>) => patch<ApiOffice>(`/admin/offices/${id}`, body),
      deleteOffice: (id: string) => del(`/admin/offices/${id}`),
      ads: (status?: 'pending' | 'approved' | 'rejected') =>
        get<ApiAdCampaign[]>('/admin/ads', status ? { status } : undefined),
      approveAd: (id: string) => patch<ApiAdCampaign>(`/admin/ads/${id}/approve`),
      rejectAd: (id: string, reason?: string) => patch<ApiAdCampaign>(`/admin/ads/${id}/reject`, { reason }),
      cms: () => get<ApiCmsPage[]>('/admin/cms'),
      createCmsPage: (body: { title: string; slug?: string; body?: string; published?: boolean }) =>
        post<ApiCmsPage>('/admin/cms', body),
      updateCmsPage: (id: string, body: { title?: string; body?: string; published?: boolean }) =>
        patch<ApiCmsPage>(`/admin/cms/${id}`, body),
      branding: () => get<ApiBranding>('/admin/branding'),
      /** Replace a brand asset. Server re-encodes (PNG for icons, WebP for the logo). */
      uploadBranding: async (
        kind: BrandAssetKind,
        file: File | Blob | { uri: string; name: string; type: string },
      ) => {
        const fd = new FormData();
        // React Native passes a {uri,name,type} descriptor; web passes a File/Blob.
        fd.append('file', file as never);
        return (await http.post<ApiBranding>(`/admin/branding/upload?kind=${kind}`, fd)).data;
      },
      /** Drop an uploaded asset so the app falls back to its built-in default. */
      clearBranding: (kind: BrandAssetKind) => patch<ApiBranding>('/admin/branding', { clear: kind }),
      users: (role?: string, search?: string) => get<ApiUser[]>('/admin/users', { role, search }),
      profile: () => get<ApiUser>('/admin/profile'),
      updateOwnPassword: (password: string) => patch<ApiUser>('/admin/profile/password', { password }),
      createUser: (body: { name: string; email: string; password: string; role?: string; country?: string; active?: boolean }) =>
        post<ApiUser>('/admin/users', body),
      user: (id: string) =>
        get<ApiUser & { profile: ApiPrivateProfile | null; wallet: { balanceCents: number } | null; _count: Record<string, number> }>(
          `/admin/users/${id}`,
        ),
      updateUser: (id: string, body: { name?: string; email?: string; country?: string; active?: boolean }) =>
        patch<ApiUser>(`/admin/users/${id}`, body),
      grantUserRole: (id: string, role: string) => post<ApiUser>(`/admin/users/${id}/roles`, { role }),
      revokeUserRole: (id: string, role: string) => del<ApiUser>(`/admin/users/${id}/roles/${role}`),
      setUserKyc: (id: string, status: 'pending' | 'verified' | 'rejected') =>
        patch<ApiUser>(`/admin/users/${id}/kyc`, { status }),
      deleteUser: (id: string) => del(`/admin/users/${id}`),
      hires: () => get<ApiHireRequest[]>('/admin/hires'),
      // ── transport oversight ──
      transportCompanies: (search?: string) => get<AdminTransportCompany[]>('/admin/transport/companies', { search }),
      transportCompany: (id: string) => get<AdminTransportCompanyDetail>(`/admin/transport/companies/${id}`),
      setTransportListing: (id: string, approved: boolean) =>
        patch<{ ok: boolean; listApproved: boolean }>(`/admin/transport/companies/${id}/listing`, { approved }),
      updateVehicle: (id: string, body: Record<string, unknown>) => patch(`/admin/transport/vehicles/${id}`, body),
      updateTransportRoute: (id: string, body: Record<string, unknown>) => patch(`/admin/transport/routes/${id}`, body),
      // ── loader oversight ──
      loaderCompanies: (search?: string) => get<AdminLoaderCompany[]>('/admin/loaders/companies', { search }),
      loaderCompany: (id: string) => get<AdminLoaderCompanyDetail>(`/admin/loaders/companies/${id}`),
      setLoaderListing: (id: string, approved: boolean) =>
        patch<{ ok: boolean; listApproved: boolean }>(`/admin/loaders/companies/${id}/listing`, { approved }),
      updateLoaderRate: (id: string, body: { service?: string; rateCents?: number; unit?: string }) =>
        patch(`/admin/loaders/rates/${id}`, body),
      markets: (status?: 'pending' | 'approved' | 'rejected') => get<ApiMarket[]>('/admin/markets', status ? { status } : undefined),
      createMarket: (body: { name: string; country: string; city?: string; region?: string; flag?: string }) =>
        post<ApiMarket>('/admin/markets', body),
      approveMarket: (id: string) => patch<ApiMarket>(`/admin/markets/${id}/approve`),
      rejectMarket: (id: string) => patch<ApiMarket>(`/admin/markets/${id}/reject`),
      updateMarket: (id: string, body: Partial<{ name: string; country: string; city: string; region: string; flag: string; active: boolean }>) =>
        patch<ApiMarket>(`/admin/markets/${id}`, body),
      removeMarket: (id: string) => del(`/admin/markets/${id}`),
      orders: (params?: { status?: string; search?: string; from?: string; to?: string }) =>
        get<ApiOrder[]>('/admin/orders', params as Record<string, unknown> | undefined),
      orderDetail: (id: string) => get<Record<string, unknown>>(`/admin/orders/${id}`),
      setOrderStatus: (id: string, status: string, note?: string) => patch(`/admin/orders/${id}/status`, { status, note }),
      disputes: () => get<ApiOrder[]>('/admin/disputes'),
      resolveDispute: (id: string, body: { resolution: 'release_to_seller' | 'refund_buyer' | 'partial'; amountCents?: number; note?: string }) =>
        post(`/admin/orders/${id}/dispute/resolve`, body),
      invoices: (params?: { status?: string; kind?: string }) =>
        get<ApiAdminInvoice[]>('/admin/invoices', params),
      /** Download the platform transaction statement as a Blob (CSV or PDF). */
      paymentsStatement: async (kind: 'csv' | 'pdf', range?: { from?: string; to?: string }) =>
        (await http.get(`/admin/payments/statement.${kind}`, { responseType: 'blob', params: range })).data as Blob,
      kyc: (status?: string) => get<ApiKyc[]>('/admin/kyc', { status }),
      kycDetail: (id: string) => get<ApiKycDetail>(`/admin/kyc/${id}`),
      decideKyc: async (id: string, status: 'verified' | 'rejected', note?: string) =>
        (await http.patch(`/admin/kyc/${id}`, { status, note })).data,
      pendingProducts: () => get<AdminProduct[]>('/admin/products'),
      allProducts: (opts?: { status?: string; search?: string; categoryId?: string; type?: string }) =>
        get<AdminProduct[]>('/admin/products/all', opts as Record<string, unknown> | undefined),
      approveProduct: (id: string) => patch(`/admin/products/${id}/approve`),
      rejectProduct: (id: string, reason?: string) => patch(`/admin/products/${id}/reject`, { reason }),
      updateProduct: (id: string, body: Record<string, unknown>) => patch(`/admin/products/${id}`, body),
      deleteProduct: (id: string) => del(`/admin/products/${id}`),
      // ── auctions ──
      auctions: (status?: string) => get<AdminAuction[]>('/admin/auctions', { status }),
      auctionDetail: (slug: string) => get<Record<string, unknown>>(`/admin/auctions/${slug}`),
      auctionBids: (slug: string) => get<Record<string, unknown>[]>(`/admin/auctions/${slug}/bids`),
      closeAuction: (slug: string) => post(`/admin/auctions/${slug}/close`),
      cancelAuction: (slug: string) => post(`/admin/auctions/${slug}/cancel`),
      // ── buyer bids (reverse auctions / RFQs) ──
      buyerBidsList: (status?: string) => get<AdminBuyerBid[]>('/admin/buyer-bids', { status }),
      buyerBidDetail: (id: string) => get<Record<string, unknown>>(`/admin/buyer-bids/${id}`),
      cancelBuyerBid: (id: string) => post(`/admin/buyer-bids/${id}/cancel`),
      awardBuyerBid: (id: string, bidId: string) => post(`/admin/buyer-bids/${id}/bids/${bidId}/award`),
      roleRequests: (status?: string) => get<ApiRoleRequest[]>('/admin/role-requests', { status }),
      decideRoleRequest: (id: string, status: 'approved' | 'rejected', note?: string) =>
        patch<ApiRoleRequest>(`/admin/role-requests/${id}`, { status, note }),
      staff: () => get<ApiUser[]>('/admin/staff'),
      createStaff: (body: { name: string; email: string; password: string; permissions?: AdminPermission[] }) =>
        post<ApiUser>('/admin/staff', body),
      updateStaff: (id: string, body: { name?: string; active?: boolean; permissions?: AdminPermission[] }) =>
        patch<ApiUser>(`/admin/staff/${id}`, body),
      removeStaff: (id: string) => del(`/admin/staff/${id}`),
      // ── taxonomy management (categories + subcategories) ──
      createCategory: (body: { name: string; emoji?: string; tint?: string; sort?: number }) =>
        post<ApiCategory>('/admin/categories', body),
      updateCategory: (id: string, body: { name?: string; emoji?: string; tint?: string; sort?: number }) =>
        patch<ApiCategory>(`/admin/categories/${id}`, body),
      removeCategory: (id: string) => del(`/admin/categories/${id}`),
      createSubcategory: (categoryId: string, body: { name: string; emoji?: string; sort?: number; parentId?: string }) =>
        post<ApiSubcategory>(`/admin/categories/${categoryId}/subcategories`, body),
      updateSubcategory: (id: string, body: { name?: string; emoji?: string; sort?: number }) =>
        patch<ApiSubcategory>(`/admin/subcategories/${id}`, body),
      removeSubcategory: (id: string) => del(`/admin/subcategories/${id}`),
    },

    /* ── CHAT SYSTEM 1 — Community (separate from Support) ─────────── */
    community: {
      feed: (cursor?: string) => get('/community/feed', { cursor }),
      groups: (params: { kind?: string; search?: string } = {}) => get('/community/groups', params),
      group: (id: string) => get(`/community/groups/${id}`),
      groupMessages: (id: string, cursor?: string) => get(`/community/groups/${id}/messages`, { cursor }),
      requirements: (params: { category?: string; country?: string; search?: string } | string = {}) =>
        get('/community/requirements', typeof params === 'string' ? { category: params } : params),
      unreadSummary: () => get<{ groups: number; dms: number; total: number }>('/community/unread-summary'),
      dmRead: (userId: string) => post(`/community/dm/${userId}/read`),
      requirement: (id: string) => get(`/community/requirements/${id}`),
      search: (q: string) => get('/community/search', { q }),
      myGroups: () => get('/community/my/groups'),
      saved: () => get('/community/my/saved'),
      createGroup: (body: Record<string, unknown>) => post('/community/groups', body),
      joinGroup: (id: string) => post(`/community/groups/${id}/join`),
      leaveGroup: (id: string) => post(`/community/groups/${id}/leave`),
      invite: (id: string, userId: string) => post(`/community/groups/${id}/invite`, { userId }),
      markRead: (id: string) => post(`/community/groups/${id}/read`),
      createPost: (body: Record<string, unknown>) => post('/community/posts', body),
      createRequirement: (body: Record<string, unknown>) => post('/community/requirements', body),
      respond: (id: string, body: Record<string, unknown>) => post(`/community/requirements/${id}/respond`, body),
      send: (body: Record<string, unknown>) => post('/community/messages', body),
      dm: (userId: string, cursor?: string) => get(`/community/dm/${userId}`, { cursor }),
      translateMessage: (id: string) =>
        get<{ id: string; body: string; originalBody: string; sourceLang: string | null }>(
          `/community/messages/${id}/translation`,
        ),
      savePost: (id: string) => post(`/community/posts/${id}/save`),
      unsavePost: (id: string) => del(`/community/posts/${id}/save`),
      report: (body: Record<string, unknown>) => post('/community/report', body),
      block: (blockedId: string) => post('/community/block', { blockedId }),
      unblock: (blockedId: string) => post('/community/unblock', { blockedId }),
      admin: {
        reports: (status?: string) => get<AdminCommunityReport[]>('/community/admin/reports', { status }),
        resolveReport: (id: string, body: { action: 'actioned' | 'dismissed'; note?: string }) =>
          post(`/community/admin/reports/${id}/resolve`, body),
        deleteMessage: (id: string) => post(`/community/admin/messages/${id}/delete`),
        analytics: () => get<AdminCommunityAnalytics>('/community/admin/analytics'),
        groups: () => get<AdminCommunityGroup[]>('/community/admin/groups'),
        createGroup: (body: { name: string; description?: string; emoji?: string; isDefault?: boolean }) =>
          post<AdminCommunityGroup>('/community/admin/groups', body),
        updateGroup: (id: string, body: { name?: string; description?: string; emoji?: string; isDefault?: boolean }) =>
          post<AdminCommunityGroup>(`/community/admin/groups/${id}`, body),
        deleteGroup: (id: string) => del(`/community/admin/groups/${id}`),
        feed: (groupId?: string) => get<AdminCommunityPost[]>('/community/admin/feed', { groupId }),
        deletePost: (id: string) => post(`/community/admin/posts/${id}/delete`),
        pinPost: (id: string, pinned: boolean) => post(`/community/admin/posts/${id}/pin`, { pinned }),
        banUser: (id: string) => post(`/community/admin/users/${id}/ban`),
      },
    },

    /* ── CHAT SYSTEM 2 — Live Support (separate from Community) ────── */
    support: {
      create: (body: Record<string, unknown>) => post('/support/tickets', body),
      mine: () => get('/support/tickets/mine'),
      ticket: (id: string) => get(`/support/tickets/${id}`),
      send: (id: string, body: Record<string, unknown>) => post(`/support/tickets/${id}/messages`, body),
      read: (id: string) => post(`/support/tickets/${id}/read`),
      rate: (id: string, body: { score: number; comment?: string }) => post(`/support/tickets/${id}/rate`, body),
      reopen: (id: string) => post(`/support/tickets/${id}/reopen`),
      inbox: (filters: Record<string, string | undefined> = {}) => get('/support/inbox', filters),
      agents: () => get('/support/agents'),
      analytics: () => get('/support/analytics'),
      assign: (id: string, agentId?: string) => post(`/support/tickets/${id}/assign`, { agentId }),
      transfer: (id: string, agentId: string) => post(`/support/tickets/${id}/transfer`, { agentId }),
      note: (id: string, body: string) => post(`/support/tickets/${id}/note`, { body }),
      status: (id: string, status: string) => post(`/support/tickets/${id}/status`, { status }),
      priority: (id: string, priority: string) => post(`/support/tickets/${id}/priority`, { priority }),
      tag: (id: string, label: string) => post(`/support/tickets/${id}/tag`, { label }),
      escalate: (id: string) => post(`/support/tickets/${id}/escalate`),
      resolve: (id: string) => post(`/support/tickets/${id}/resolve`),
      close: (id: string) => post(`/support/tickets/${id}/close`),
    },

    /* ── Shared (neutral) chat infrastructure ─────────────────────── */
    notifications: {
      list: () => get('/notifications'),
      unreadCount: (system?: 'community' | 'support') =>
        get<{ count: number }>('/notifications/unread-count', { system }),
      read: (id: string) => post(`/notifications/${id}/read`),
      readAll: () => post('/notifications/read-all'),
      // Push device registration (web & mobile FCM tokens share one endpoint).
      registerDevice: (body: { platform: 'web' | 'android' | 'ios'; token: string; userAgent?: string }) =>
        post<{ ok: true }>('/notifications/register-device', body),
      unregisterDevice: (token: string) =>
        post<{ ok: true }>('/notifications/unregister-device', { token }),
      // Per-category channel preferences (email/push/in-app toggles).
      getPreferences: () => get<NotificationPreferences>('/notifications/preferences'),
      updatePreferences: (body: NotificationPrefsPatch) =>
        put<NotificationPreferences>('/notifications/preferences', body),
    },
    attachments: {
      presign: (body: { system: 'community' | 'support'; mime: string; sizeBytes: number; originalName?: string }) =>
        post<{ attachmentId: string; uploadUrl: string; s3Key: string; kind: string }>('/attachments/presign', body),
      url: (id: string) => get<{ url: string; mime: string; kind: string; originalName: string | null }>(`/attachments/${id}/url`),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Opens a Socket.IO connection for one chat system. Namespaces are strictly
 * separated ('/community' vs '/support'); the JWT is passed via the handshake
 * `auth.token`. Shared by web and mobile.
 */
export function createChatSocket(opts: {
  baseURL: string;
  namespace: '/community' | '/support';
  token: string | null | undefined;
}): Socket {
  const root = opts.baseURL.replace(/\/$/, '');
  return io(root + opts.namespace, {
    auth: { token: opts.token ?? '' },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
  });
}

export { axios };
export type { Socket };
export * from './helpers';
export * from './errors';
export * from './format';
