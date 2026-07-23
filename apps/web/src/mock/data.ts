/**
 * Realistic mock data for the public marketplace (UI-first).
 * Replaced by live NestJS API calls in the backend-wiring pass.
 */

export interface Category {
  name: string;
  count: string;
  emoji: string;
  tint: string;
}
export const categories: Category[] = [
  { name: 'Grains', count: '1,240', emoji: '🌾', tint: '#DFF3E4' },
  { name: 'Pulses', count: '860', emoji: '🫘', tint: '#EDF7EF' },
  { name: 'Fruits', count: '1,510', emoji: '🍎', tint: '#FBF4E4' },
  { name: 'Vegetables', count: '1,120', emoji: '🥦', tint: '#DFF3E4' },
  { name: 'Spices', count: '690', emoji: '🌶️', tint: '#FBE9E6' },
  { name: 'Seeds', count: '540', emoji: '🌱', tint: '#EDF7EF' },
  { name: 'Fertilizers', count: '430', emoji: '🧪', tint: '#E6F0F4' },
  { name: 'Oils', count: '380', emoji: '🫒', tint: '#FBF4E4' },
  { name: 'Animal Feed', count: '290', emoji: '🐄', tint: '#DFF3E4' },
  { name: 'Machinery', count: '210', emoji: '🚜', tint: '#EDF7EF' },
  { name: 'Packaging', count: '170', emoji: '📦', tint: '#F0EFEA' },
];

export interface Offer {
  name: string;
  seller: string;
  flag: string;
  grade: string;
  price: string;
  unit: string;
  old: string;
  disc: string;
  /** ms from now until the offer ends */
  endsInMs: number;
}
export const offers: Offer[] = [
  { name: 'Premium Basmati Rice 1121', seller: 'Punjab Agro Exports', flag: '🇮🇳', grade: 'Grade A', price: '$840', unit: '/ ton', old: '$980', disc: '-14%', endsInMs: 5 * 3600e3 },
  { name: 'Golden Durum Wheat', seller: 'Kuban Grain Co.', flag: '🇷🇺', grade: 'Milling', price: '$268', unit: '/ ton', old: '$305', disc: '-12%', endsInMs: 8 * 3600e3 },
  { name: 'Robusta Green Coffee', seller: 'Highland Estates', flag: '🇻🇳', grade: 'Screen 18', price: '$2,140', unit: '/ ton', old: '$2,420', disc: '-11%', endsInMs: 3 * 3600e3 },
  { name: 'Organic Red Lentils', seller: 'Anatolia Pulses', flag: '🇹🇷', grade: 'Organic', price: '$1,020', unit: '/ ton', old: '$1,160', disc: '-12%', endsInMs: 11 * 3600e3 },
];

export interface Auction {
  name: string;
  seller: string;
  flag: string;
  bid: string;
  bidders: number;
  up: string;
  endsInMs: number;
}
export const auctions: Auction[] = [
  { name: 'Sunflower Oil — Crude, 22t', seller: 'Black Sea Oils', flag: '🇺🇦', bid: '$18,400', bidders: 14, up: '+$600', endsInMs: 7 * 60e3 },
  { name: 'Yellow Maize, 50t Lot', seller: 'Pampas Trading', flag: '🇦🇷', bid: '$11,250', bidders: 9, up: '+$250', endsInMs: 23 * 60e3 },
  { name: 'Cardamom 8mm, 500kg', seller: 'Idukki Spice Board', flag: '🇮🇳', bid: '$9,800', bidders: 21, up: '+$150', endsInMs: 2 * 60e3 },
];

export interface IntlProduct {
  name: string;
  flag: string;
  port: string;
  moq: string;
  grade: string;
  cur: string;
  price: string;
}
export const intl: IntlProduct[] = [
  { name: 'Chickpeas Kabuli 9mm', flag: '🇦🇺', port: 'Port of Melbourne', moq: '25 MT', grade: 'Premium', cur: 'USD', price: '$1,180/MT' },
  { name: 'Soybean Meal 48%', flag: '🇧🇷', port: 'Port of Santos', moq: '100 MT', grade: 'Feed', cur: 'USD', price: '$520/MT' },
  { name: 'White Sugar ICUMSA 45', flag: '🇹🇭', port: 'Laem Chabang', moq: '500 MT', grade: 'Refined', cur: 'USD', price: '$615/MT' },
  { name: 'Buckwheat Groats', flag: '🇷🇺', port: 'Novorossiysk', moq: '20 MT', grade: 'Grade 1', cur: 'USD', price: '$740/MT' },
];

export interface Insight {
  name: string;
  price: string;
  chg: string;
  up: boolean;
  data: number[];
}
export const insights: Insight[] = [
  { name: 'Wheat', price: '$268', chg: '+2.4%', up: true, data: [40, 42, 41, 44, 43, 47, 46, 49] },
  { name: 'Maize', price: '$224', chg: '-1.1%', up: false, data: [50, 48, 49, 46, 47, 45, 46, 44] },
  { name: 'Soybean', price: '$512', chg: '+3.8%', up: true, data: [30, 33, 32, 36, 38, 37, 41, 44] },
  { name: 'Rice', price: '$840', chg: '+0.9%', up: true, data: [44, 45, 44, 46, 45, 47, 46, 47] },
];

export interface CommunityPost {
  tag: string;
  q: string;
  by: string;
  badge: string;
  replies: number;
}
export const community: CommunityPost[] = [
  { tag: 'Market Tip', q: 'Best moisture level for long-term wheat storage?', by: 'Dr. Elena Markova', badge: 'Agronomist', replies: 34 },
  { tag: 'Buyer Need', q: 'Looking for 200 MT organic lentils, EU delivery Q3', by: 'Green Foods GmbH', badge: 'Buyer', replies: 18 },
  { tag: 'Crop Advice', q: 'Aphid control in early sunflower — organic options?', by: 'Ahmet Yıldız', badge: 'Expert', replies: 27 },
];

export interface OfficePreview {
  flag: string;
  city: string;
  type: string;
  mgr: string;
}
export const officesPreview: OfficePreview[] = [
  { flag: '🇦🇪', city: 'Dubai', type: 'Head Office', mgr: 'Omar Al-Farsi' },
  { flag: '🇷🇺', city: 'Moscow', type: 'Regional Office', mgr: 'Irina Volkova' },
  { flag: '🇮🇳', city: 'Mumbai', type: 'Country Office', mgr: 'Rahul Mehta' },
  { flag: '🇰🇿', city: 'Almaty', type: 'Sales Office', mgr: 'Aigerim N.' },
];

export interface Product {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  /** Ordered gallery; `images[0]` is the cover. Empty for mock data. */
  images?: string[];
  grade: string;
  flag: string;
  seller: string;
  /** Seller user id (live API only) — enables chat-with-seller / profile links. */
  sellerId?: string;
  qty: string;
  moq: string;
  price: string;
  /** USD cents baseline for currency conversion (live API only). */
  priceCents?: number | null;
  unit: string;
  /** Legacy display rating string (cosmetic "4.8" default for unrated listings). */
  rating: string;
  /** Real, review-derived rating (live API only). `ratingCount === 0`/undefined
   *  means the listing is unrated and no stars should be shown. */
  ratingAvg?: number | null;
  ratingCount?: number;
  verified: boolean;
  safe: boolean;
  offer: boolean;
  auction: boolean;
  /** Paid ad placement — cards flagged true render a visible "Sponsored" label
   *  (F30). Set by the promoted-ad query paths, never by the organic catalog. */
  sponsored?: boolean;
  delivery: string;
  category: string;
  marketName?: string;
  marketSlug?: string;
  /** Listing location (live API only) — used for filter chips/labels. */
  city?: string;
  country?: string;
  /** Countries the seller can supply/ship to (live API only). */
  supplyCountries?: string[];
}
export const products: Product[] = [
  { id: 'basmati-1121', name: 'Premium Basmati Rice 1121', emoji: '🌾', grade: 'Grade A', flag: '🇮🇳', seller: 'Punjab Agro Exports', qty: '500 MT', moq: '25 MT', price: '$840', unit: '/MT', rating: '4.9', verified: true, safe: true, offer: true, auction: false, delivery: 'Ready', category: 'Grains' },
  { id: 'durum-wheat', name: 'Golden Durum Wheat', emoji: '🌾', grade: 'Milling', flag: '🇷🇺', seller: 'Kuban Grain Co.', qty: '2,400 MT', moq: '100 MT', price: '$268', unit: '/MT', rating: '4.8', verified: true, safe: true, offer: false, auction: false, delivery: '7 days', category: 'Grains' },
  { id: 'sunflower-oil', name: 'Crude Sunflower Oil', emoji: '🛢️', grade: 'Crude', flag: '🇺🇦', seller: 'Black Sea Oils', qty: '180 MT', moq: '22 MT', price: '$920', unit: '/MT', rating: '4.7', verified: true, safe: true, offer: false, auction: true, delivery: 'Ready', category: 'Oils' },
  { id: 'chickpeas-kabuli', name: 'Kabuli Chickpeas 9mm', emoji: '🫘', grade: 'Premium', flag: '🇦🇺', seller: 'Outback Pulses', qty: '600 MT', moq: '25 MT', price: '$1,180', unit: '/MT', rating: '5.0', verified: true, safe: true, offer: false, auction: false, delivery: '14 days', category: 'Pulses' },
  { id: 'robusta-coffee', name: 'Robusta Green Coffee', emoji: '☕', grade: 'Screen 18', flag: '🇻🇳', seller: 'Highland Estates', qty: '320 MT', moq: '18 MT', price: '$2,140', unit: '/MT', rating: '4.9', verified: true, safe: true, offer: true, auction: false, delivery: 'Ready', category: 'Grains' },
  { id: 'yellow-maize', name: 'Yellow Maize Feed Grade', emoji: '🌽', grade: 'Feed', flag: '🇦🇷', seller: 'Pampas Trading', qty: '5,000 MT', moq: '200 MT', price: '$224', unit: '/MT', rating: '4.6', verified: false, safe: true, offer: false, auction: true, delivery: '10 days', category: 'Animal Feed' },
  { id: 'red-lentils', name: 'Organic Red Lentils', emoji: '🫘', grade: 'Organic', flag: '🇹🇷', seller: 'Anatolia Pulses', qty: '400 MT', moq: '20 MT', price: '$1,020', unit: '/MT', rating: '4.8', verified: true, safe: true, offer: true, auction: false, delivery: 'Ready', category: 'Pulses' },
  { id: 'white-sugar', name: 'White Sugar ICUMSA 45', emoji: '🍬', grade: 'Refined', flag: '🇹🇭', seller: 'Siam Sugar Mills', qty: '8,000 MT', moq: '500 MT', price: '$615', unit: '/MT', rating: '4.7', verified: true, safe: false, offer: false, auction: false, delivery: '21 days', category: 'Spices' },
  { id: 'buckwheat', name: 'Buckwheat Groats Grade 1', emoji: '🌾', grade: 'Grade 1', flag: '🇷🇺', seller: 'Altai Harvest', qty: '350 MT', moq: '20 MT', price: '$740', unit: '/MT', rating: '4.9', verified: true, safe: true, offer: false, auction: false, delivery: '7 days', category: 'Grains' },
];

export const trustStats = [
  { v: '42,800+', k: 'Verified listings' },
  { v: '118', k: 'Countries served' },
  { v: '$1.4B', k: 'Safe-Deal volume' },
  { v: '24', k: 'Global offices' },
];

export const safeSteps = [
  { n: '1', title: 'Buyer pays securely', desc: 'Funds held in AgroTraders escrow, never released early.', icon: 'wallet' as const },
  { n: '2', title: 'Seller dispatches', desc: 'Verified seller ships with tracked logistics.', icon: 'truck' as const },
  { n: '3', title: 'Buyer confirms', desc: 'Delivery confirmed on inspection at destination.', icon: 'shield' as const },
  { n: '4', title: 'Payment released', desc: 'Funds released to seller. Dispute window protected.', icon: 'gauge' as const },
];

export const footerCols = [
  { h: 'Marketplace', links: ['Buy Products', 'Sell Products', 'Live Auctions', 'Offers', 'International Trade'] },
  { h: 'Services', links: ['Book Transport', 'Hire Loaders', 'Safe Deal', 'Wallet', 'Logistics'] },
  { h: 'Company', links: ['Global Offices', 'Community', 'About', 'Careers', 'Press'] },
  { h: 'Support', links: ['Help Centre', 'Contact', 'KYC & Verification', 'Disputes', 'EN / RU Support'] },
];
