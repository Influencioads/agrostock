import {
  KycStatus,
  PrismaClient,
  Role,
  ServiceCategory,
  ServicePricingBasis,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { canRolePriceService } from '@agrotraders/types';

const prisma = new PrismaClient();

/** How many leaf services each demo business publishes a price for. */
const PRICED_SERVICES_PER_BUSINESS = 6;

const businesses: Array<{
  slug: string;
  loginEmail?: string;
  name: string;
  role: Role;
  country: string;
  countriesServed: string[];
  productsHandled: string[];
  acceptsInternationalOrders: boolean;
  categories: ServiceCategory[];
  cities: string[];
  capacity: number;
  certifications: string[];
  minOrderQty: number;
  turnaroundDays: number;
  pricingBasis: ServicePricingBasis;
  priceFromCents: number | null;
  currency: string;
  blurb: string;
}> = [
  {
    slug: 'meridian-trade-accounting', loginEmail: 'accountant@agrostock.live', name: 'Meridian Trade Accounting', role: Role.accountant,
    country: 'India',
    countriesServed: ['India', 'United Arab Emirates', 'Singapore'], productsHandled: ['Rice', 'Spices', 'Pulses'], acceptsInternationalOrders: true, categories: [ServiceCategory.accounting, ServiceCategory.customs_clearance],
    cities: ['Mumbai', 'Delhi'], capacity: 40, certifications: ['ICAI'], minOrderQty: 1,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_month, priceFromCents: 45000, currency: 'USD',
    blurb: 'Export-import accounting, GST support and customs documentation for agricultural traders.',
  },
  {
    slug: 'harbour-pack-solutions', loginEmail: 'packer@agrostock.live', name: 'Harbour Pack Solutions', role: Role.packer,
    country: 'India',
    countriesServed: ['India', 'Sri Lanka', 'United Arab Emirates'], productsHandled: ['Cashew', 'Peanut', 'Turmeric', 'Rice'], acceptsInternationalOrders: true, categories: [ServiceCategory.packing, ServiceCategory.fulfillment],
    cities: ['Chennai', 'Bengaluru'], capacity: 25000, certifications: ['FSSAI', 'ISO 22000'], minOrderQty: 500,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 1200, currency: 'USD',
    blurb: 'Vacuum, jute and retail packing for nuts, pulses, grains and spices.',
  },
  {
    slug: 'anatolia-processing-works', loginEmail: 'processor@agrostock.live', name: 'Anatolia Processing Works', role: Role.processor,
    country: 'Turkey',
    countriesServed: ['Turkey', 'Germany', 'Russia'], productsHandled: ['Hazelnut', 'Pistachio', 'Almond', 'Sunflower seed'], acceptsInternationalOrders: true, categories: [ServiceCategory.roasting, ServiceCategory.roasting_salting, ServiceCategory.sorting_grading],
    cities: ['Mersin', 'Istanbul'], capacity: 18000, certifications: ['HACCP', 'BRCGS'], minOrderQty: 1000,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 9500, currency: 'USD',
    blurb: 'Roasting, salting, sorting and grading for tree nuts and seeds.',
  },
  {
    slug: 'gulf-fulfilment-hub', loginEmail: 'fulfillment@agrostock.live', name: 'Gulf Fulfilment Hub', role: Role.fulfillment_partner,
    country: 'United Arab Emirates',
    countriesServed: ['United Arab Emirates', 'Saudi Arabia', 'Oman'], productsHandled: ['Dates', 'Rice', 'Packaged foods'], acceptsInternationalOrders: true, categories: [ServiceCategory.fulfillment],
    cities: ['Dubai', 'Jebel Ali'], capacity: 900, certifications: ['ISO 9001'], minOrderQty: 1,
    turnaroundDays: 1, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: 18000, currency: 'USD',
    blurb: 'Bonded warehousing, order dispatch, inventory handling and delivery proof.',
  },
  {
    slug: 'steppe-trade-finance', loginEmail: 'finance@agrostock.live', name: 'Steppe Trade Finance', role: Role.finance_partner,
    country: 'Kazakhstan',
    countriesServed: ['Kazakhstan', 'Russia', 'Uzbekistan'], productsHandled: ['Wheat', 'Barley', 'Sunflower oil'], acceptsInternationalOrders: false, categories: [ServiceCategory.financial_services],
    cities: ['Almaty', 'Astana'], capacity: 20, certifications: [], minOrderQty: 1,
    turnaroundDays: 7, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: null, currency: 'USD',
    blurb: 'Working capital, trade finance and invoice discounting for commodity businesses.',
  },
  {
    slug: 'deccan-food-processors', name: 'Deccan Food Processors', role: Role.processor,
    country: 'India',
    countriesServed: ['India'], productsHandled: ['Mango', 'Tomato', 'Onion', 'Groundnut'], acceptsInternationalOrders: false, categories: [ServiceCategory.chopping, ServiceCategory.blanching, ServiceCategory.pitting],
    cities: ['Hyderabad', 'Pune'], capacity: 12000, certifications: ['FSSAI', 'HACCP'], minOrderQty: 750,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_kg, priceFromCents: 18, currency: 'USD',
    blurb: 'Contract chopping, blanching and pitting with export-grade food safety controls.',
  },
  {
    slug: 'gateway-customs-advisors', name: 'Gateway Customs Advisors', role: Role.accountant,
    country: 'United Arab Emirates',
    countriesServed: ['United Arab Emirates', 'Qatar', 'Kuwait'], productsHandled: ['Grains', 'Edible oils', 'Frozen foods'], acceptsInternationalOrders: true, categories: [ServiceCategory.customs_clearance, ServiceCategory.accounting],
    cities: ['Dubai', 'Sharjah'], capacity: 30, certifications: ['FTA Registered'], minOrderQty: 1,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: 12500, currency: 'USD',
    blurb: 'Customs clearance, VAT accounting and cross-border documentation for food imports.',
  },
  {
    slug: 'northern-cold-pack', name: 'Northern Cold Pack', role: Role.packer,
    country: 'Russia',
    countriesServed: ['Russia', 'Belarus', 'Kazakhstan'], productsHandled: ['Berries', 'Potato', 'Carrot', 'Frozen vegetables'], acceptsInternationalOrders: true, categories: [ServiceCategory.packing, ServiceCategory.sorting_grading],
    cities: ['Moscow', 'Saint Petersburg'], capacity: 20000, certifications: ['ISO 22000'], minOrderQty: 1000,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 7200, currency: 'USD',
    blurb: 'Temperature-controlled sorting and packing for fresh and frozen agricultural goods.',
  },
];

async function main() {
  // Match the existing buyer/seller demo-account convention. Production users
  // must never reuse these public demo credentials.
  const loginPassword = process.env.SERVICE_PROVIDER_LOGIN_PASSWORD || 'password123';
  const loginPasswordHash = await bcrypt.hash(loginPassword, 10);
  const lockedPasswordHash = await bcrypt.hash(randomUUID(), 12);
  let priced = 0;

  for (const business of businesses) {
    const directoryEmail = `${business.slug}@directory.agrotraders.org`;
    const email = business.loginEmail || directoryEmail;

    // Existing production seeds used the directory email. Rename that same
    // user so its ServiceProvider relation and enquiry history remain intact.
    if (business.loginEmail) {
      const desired = await prisma.user.findUnique({ where: { email } });
      const legacy = desired ? null : await prisma.user.findUnique({ where: { email: directoryEmail } });
      if (legacy) {
        await prisma.user.update({ where: { id: legacy.id }, data: { email } });
      }
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash: business.loginEmail ? loginPasswordHash : lockedPasswordHash,
        name: business.name,
        role: business.role,
        country: business.country,
        active: true,
        kycStatus: KycStatus.verified,
        emailVerifiedAt: new Date(),
      },
      update: {
        name: business.name,
        role: business.role,
        country: business.country,
        active: true,
        kycStatus: KycStatus.verified,
        ...(business.loginEmail ? { passwordHash: loginPasswordHash, emailVerifiedAt: new Date() } : {}),
      },
    });

    const provider = await prisma.serviceProvider.upsert({
      where: { userId: user.id },
      select: { id: true },
      create: {
        userId: user.id,
        companyName: business.name,
        categories: business.categories,
        citiesServed: business.cities,
        country: business.country,
        countriesServed: business.countriesServed,
        productsHandled: business.productsHandled,
        acceptsInternationalOrders: business.acceptsInternationalOrders,
        capacityPerDay: business.capacity,
        certifications: business.certifications,
        minOrderQty: business.minOrderQty,
        turnaroundDays: business.turnaroundDays,
        pricingBasis: business.pricingBasis,
        priceFromCents: business.priceFromCents,
        priceCurrency: business.currency,
        blurb: business.blurb,
        listed: true,
      },
      update: {
        companyName: business.name,
        categories: business.categories,
        citiesServed: business.cities,
        country: business.country,
        countriesServed: business.countriesServed,
        productsHandled: business.productsHandled,
        acceptsInternationalOrders: business.acceptsInternationalOrders,
        capacityPerDay: business.capacity,
        certifications: business.certifications,
        minOrderQty: business.minOrderQty,
        turnaroundDays: business.turnaroundDays,
        pricingBasis: business.pricingBasis,
        priceFromCents: business.priceFromCents,
        priceCurrency: business.currency,
        blurb: business.blurb,
        listed: true,
      },
    });

    priced += await seedPricedServices(provider.id, business);
  }

  console.log(`Seeded ${businesses.length} public service businesses.`);
  console.log(`Seeded ${priced} per-service prices.`);
  console.log('Service demo logins:');
  for (const business of businesses.filter((entry) => entry.loginEmail)) {
    console.log(`- ${business.name}: ${business.loginEmail}`);
  }
}

/**
 * Publish a handful of leaf prices so the public price list is not empty.
 *
 * Leaves are chosen by asking `canRolePriceService` which slugs this role may
 * offer, rather than hard-coding slugs: the taxonomy is 603 nodes and growing,
 * and a hard-coded list would silently seed nothing the first time a branch is
 * renamed. Existing rows are left alone — re-running the seed must never
 * overwrite a price a provider has since tuned by hand.
 */
async function seedPricedServices(
  providerId: string,
  business: (typeof businesses)[number],
): Promise<number> {
  const leaves = await prisma.serviceNode.findMany({
    where: { isLeaf: true, isActive: true },
    orderBy: { slug: 'asc' },
    select: { id: true, slug: true },
  });
  const mine = leaves
    .filter((node) => canRolePriceService(business.role, node.slug))
    .slice(0, PRICED_SERVICES_PER_BUSINESS);
  if (!mine.length) return 0;

  const existing = await prisma.providerService.findMany({
    where: { providerId, serviceNodeId: { in: mine.map((n) => n.id) } },
    select: { serviceNodeId: true },
  });
  const already = new Set(existing.map((e) => e.serviceNodeId));
  const fresh = mine.filter((n) => !already.has(n.id));
  if (!fresh.length) return 0;

  // Spread around the headline figure so the list shows both single prices and
  // ranges. A provider with no headline price stays "on request" throughout.
  const base = business.priceFromCents;
  const result = await prisma.providerService.createMany({
    data: fresh.map((node, i) => ({
      providerId,
      serviceNodeId: node.id,
      pricingBasis: base == null ? ServicePricingBasis.on_request : business.pricingBasis,
      priceMinCents: base == null ? null : Math.round(base * (1 + i * 0.15)),
      priceMaxCents: base == null || i % 2 === 0 ? null : Math.round(base * (1 + i * 0.15) * 1.4),
      currency: business.currency,
      minOrderQty: business.minOrderQty,
      minOrderUnit: business.pricingBasis === ServicePricingBasis.per_kg ? 'kg' : 'MT',
      leadTimeDays: business.turnaroundDays + (i % 3),
      isNegotiable: i % 3 === 0,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
