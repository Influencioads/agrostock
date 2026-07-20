/** Mock data for the Admin Command Centre (UI-first; swaps to live API later). */
import type { BadgeTone } from '@agrotraders/ui';

export const kpis = [
  { label: 'Total Users', value: '84,210', delta: '+1,204', up: true, icon: 'worker' as const },
  { label: 'GMV (30d)', value: '$142M', delta: '+9.4%', up: true, icon: 'chart' as const },
  { label: 'Commission Rev', value: '$3.8M', delta: '+7%', up: true, icon: 'wallet' as const },
  { label: 'Pending KYC', value: '142', delta: 'Review', up: true, icon: 'shield' as const },
];

export const gmvSeries = [
  { m: 'Nov', v: 88 },
  { m: 'Dec', v: 96 },
  { m: 'Jan', v: 102 },
  { m: 'Feb', v: 118 },
  { m: 'Mar', v: 124 },
  { m: 'Apr', v: 131 },
  { m: 'May', v: 138 },
  { m: 'Jun', v: 142 },
];

export interface QueueItem {
  item: string;
  type: 'Product' | 'KYC' | 'Ad' | 'Dispute';
  by: string;
  country: string;
  status: string;
  tone: BadgeTone;
}
export const approvalQueue: QueueItem[] = [
  { item: 'Sunflower Oil 22t', type: 'Product', by: 'Black Sea Oils', country: '🇺🇦', status: 'Pending', tone: 'warn' },
  { item: 'Outback Pulses', type: 'KYC', by: 'Outback Pulses', country: '🇦🇺', status: 'Review', tone: 'info' },
  { item: 'Harvest Festival Ad', type: 'Ad', by: 'Punjab Agro', country: '🇮🇳', status: 'Pending', tone: 'warn' },
  { item: 'Dispute #DS-118', type: 'Dispute', by: 'Karim Trading', country: '🇦🇪', status: 'Escalated', tone: 'error' },
  { item: 'SwiftHaul Fleet', type: 'KYC', by: 'SwiftHaul', country: '🇦🇪', status: 'Approved', tone: 'green' },
];

export const activity = [
  { a: 'KYC approved · Altai Harvest', b: '2 min ago' },
  { a: 'Product removed · spam listing', b: '18 min ago' },
  { a: 'Payout released · $84,000', b: '1 hr ago' },
  { a: 'Dispute escalated · #DS-118', b: '2 hr ago' },
  { a: 'Ad approved · Harvest Festival', b: '3 hr ago' },
];

/** `role` and `kyc` hold raw enum tokens; labels come from the `enums` catalog at render time. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  country: string;
  kyc: 'verified' | 'pending' | 'rejected';
  joined: string;
}
export const users: UserRow[] = [
  { id: 'U-1042', name: 'Karim Trading', email: 'ops@karim.ae', role: 'buyer', country: '🇦🇪 UAE', kyc: 'verified', joined: 'Jan 2025' },
  { id: 'U-1043', name: 'Punjab Agro Exports', email: 'sales@punjabagro.in', role: 'seller', country: '🇮🇳 India', kyc: 'verified', joined: 'Feb 2025' },
  { id: 'U-1051', name: 'SwiftHaul Logistics', email: 'fleet@swifthaul.ae', role: 'transporter', country: '🇦🇪 UAE', kyc: 'pending', joined: 'Mar 2025' },
  { id: 'U-1067', name: 'Black Sea Oils', email: 'export@blackseaoils.ua', role: 'seller', country: '🇺🇦 Ukraine', kyc: 'pending', joined: 'Apr 2025' },
  { id: 'U-1074', name: 'PortForce Crews', email: 'jobs@portforce.in', role: 'loaderco', country: '🇮🇳 India', kyc: 'verified', joined: 'Apr 2025' },
  { id: 'U-1090', name: 'Berlin Grain GmbH', email: 'buy@berlingrain.de', role: 'buyer', country: '🇩🇪 Germany', kyc: 'verified', joined: 'May 2025' },
  { id: 'U-1101', name: 'Pampas Trading', email: 'grain@pampas.ar', role: 'seller', country: '🇦🇷 Argentina', kyc: 'rejected', joined: 'May 2025' },
  { id: 'U-1118', name: 'Astana Co', email: 'trade@astana.kz', role: 'buyer', country: '🇰🇿 Kazakhstan', kyc: 'pending', joined: 'Jun 2025' },
];

export interface KycItem {
  id: string;
  company: string;
  role: string;
  country: string;
  docs: number;
  submitted: string;
}
export const kycQueue: KycItem[] = [
  { id: 'KYC-318', company: 'Outback Pulses', role: 'Seller', country: '🇦🇺 Australia', docs: 4, submitted: '2 days ago' },
  { id: 'KYC-319', company: 'SwiftHaul Logistics', role: 'Transporter', country: '🇦🇪 UAE', docs: 3, submitted: '1 day ago' },
  { id: 'KYC-321', company: 'Black Sea Oils', role: 'Seller', country: '🇺🇦 Ukraine', docs: 5, submitted: '6 hr ago' },
  { id: 'KYC-322', company: 'Astana Co', role: 'Buyer', country: '🇰🇿 Kazakhstan', docs: 3, submitted: '3 hr ago' },
];

export interface ProductItem {
  id: string;
  name: string;
  seller: string;
  category: string;
  price: string;
  status: string;
  tone: BadgeTone;
}
export const productQueue: ProductItem[] = [
  { id: 'P-7741', name: 'Crude Sunflower Oil 22t', seller: 'Black Sea Oils 🇺🇦', category: 'Oils', price: '$920/MT', status: 'Pending', tone: 'warn' },
  { id: 'P-7742', name: 'Yellow Maize Feed Grade', seller: 'Pampas Trading 🇦🇷', category: 'Animal Feed', price: '$224/MT', status: 'Review', tone: 'info' },
  { id: 'P-7743', name: 'Organic Red Lentils', seller: 'Anatolia Pulses 🇹🇷', category: 'Pulses', price: '$1,020/MT', status: 'Approved', tone: 'green' },
  { id: 'P-7744', name: 'White Sugar ICUMSA 45', seller: 'Siam Sugar Mills 🇹🇭', category: 'Spices', price: '$615/MT', status: 'Pending', tone: 'warn' },
];

/** `status` holds the raw `OrderStatus` token; label and badge tone are derived at render time. */
export interface OrderItem {
  id: string;
  buyer: string;
  seller: string;
  amount: string;
  status: string;
}
export const orders: OrderItem[] = [
  { id: 'AG-7741', buyer: 'Karim Trading 🇦🇪', seller: 'Punjab Agro 🇮🇳', amount: '$42,000', status: 'in_transit' },
  { id: 'AG-7740', buyer: 'Berlin Grain 🇩🇪', seller: 'Kuban Grain 🇷🇺', amount: '$32,160', status: 'processing' },
  { id: 'AG-7738', buyer: 'Astana Co 🇰🇿', seller: 'Altai Harvest 🇷🇺', amount: '$21,000', status: 'paid' },
  { id: 'AG-7732', buyer: 'Al Noor 🇦🇪', seller: 'Anatolia 🇹🇷', amount: '$20,400', status: 'delivered' },
  { id: 'AG-7729', buyer: 'Cairo Foods 🇪🇬', seller: 'Black Sea Oils 🇺🇦', amount: '$18,400', status: 'dispute' },
];

export interface DisputeItem {
  id: string;
  order: string;
  parties: string;
  reason: string;
  amount: string;
  status: string;
  tone: BadgeTone;
}
export const disputes: DisputeItem[] = [
  { id: 'DS-118', order: 'AG-7729', parties: 'Cairo Foods ↔ Black Sea Oils', reason: 'Quality mismatch', amount: '$18,400', status: 'Escalated', tone: 'error' },
  { id: 'DS-114', order: 'AG-7701', parties: 'Karim ↔ Pampas', reason: 'Late shipment', amount: '$11,250', status: 'Mediation', tone: 'warn' },
  { id: 'DS-109', order: 'AG-7688', parties: 'Berlin ↔ Kuban', reason: 'Moisture spec', amount: '$26,800', status: 'Resolved', tone: 'green' },
];

export const offices = [
  { flag: '🇦🇪', name: 'AgroTraders HQ', type: 'Head Office', city: 'Dubai, UAE', mgr: 'Omar Al-Farsi', staff: 48 },
  { flag: '🇷🇺', name: 'AgroTraders CIS', type: 'Regional Office', city: 'Moscow, Russia', mgr: 'Irina Volkova', staff: 22 },
  { flag: '🇰🇿', name: 'Central Asia', type: 'Country Office', city: 'Almaty, Kazakhstan', mgr: 'Aigerim N.', staff: 14 },
  { flag: '🇮🇳', name: 'South Asia', type: 'Country Office', city: 'Mumbai, India', mgr: 'Rahul Mehta', staff: 31 },
  { flag: '🇹🇷', name: 'Türkiye & Levant', type: 'Sales Office', city: 'Istanbul, Türkiye', mgr: 'Mehmet Demir', staff: 9 },
  { flag: '🇺🇦', name: 'Black Sea Hub', type: 'Warehouse', city: 'Odesa, Ukraine', mgr: 'Olena Koval', staff: 18 },
];

export const audit = [
  { time: '10:42', actor: 'admin@agrotraders', action: 'Approved KYC', target: 'KYC-318 · Outback Pulses', ip: '10.0.4.21' },
  { time: '10:18', actor: 'admin@agrotraders', action: 'Removed product', target: 'P-7710 · spam listing', ip: '10.0.4.21' },
  { time: '09:55', actor: 'ops@agrotraders', action: 'Released payout', target: '$84,000 · Punjab Agro', ip: '10.0.4.33' },
  { time: '09:40', actor: 'admin@agrotraders', action: 'Escalated dispute', target: 'DS-118', ip: '10.0.4.21' },
  { time: '09:12', actor: 'cms@agrotraders', action: 'Published banner', target: 'Harvest Festival', ip: '10.0.4.18' },
];

export interface NavModule {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}
