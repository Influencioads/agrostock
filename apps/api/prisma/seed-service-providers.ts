import {
  KycStatus,
  PrismaClient,
  Role,
  ServiceCategory,
  ServicePricingBasis,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const businesses: Array<{
  slug: string;
  loginEmail?: string;
  name: string;
  role: Role;
  country: string;
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
    country: 'India', categories: [ServiceCategory.accounting, ServiceCategory.customs_clearance],
    cities: ['Mumbai', 'Delhi'], capacity: 40, certifications: ['ICAI'], minOrderQty: 1,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_month, priceFromCents: 45000, currency: 'USD',
    blurb: 'Export-import accounting, GST support and customs documentation for agricultural traders.',
  },
  {
    slug: 'harbour-pack-solutions', loginEmail: 'packer@agrostock.live', name: 'Harbour Pack Solutions', role: Role.packer,
    country: 'India', categories: [ServiceCategory.packing, ServiceCategory.fulfillment],
    cities: ['Chennai', 'Bengaluru'], capacity: 25000, certifications: ['FSSAI', 'ISO 22000'], minOrderQty: 500,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 1200, currency: 'USD',
    blurb: 'Vacuum, jute and retail packing for nuts, pulses, grains and spices.',
  },
  {
    slug: 'anatolia-processing-works', loginEmail: 'processor@agrostock.live', name: 'Anatolia Processing Works', role: Role.processor,
    country: 'Turkey', categories: [ServiceCategory.roasting, ServiceCategory.roasting_salting, ServiceCategory.sorting_grading],
    cities: ['Mersin', 'Istanbul'], capacity: 18000, certifications: ['HACCP', 'BRCGS'], minOrderQty: 1000,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 9500, currency: 'USD',
    blurb: 'Roasting, salting, sorting and grading for tree nuts and seeds.',
  },
  {
    slug: 'gulf-fulfilment-hub', loginEmail: 'fulfillment@agrostock.live', name: 'Gulf Fulfilment Hub', role: Role.fulfillment_partner,
    country: 'United Arab Emirates', categories: [ServiceCategory.fulfillment],
    cities: ['Dubai', 'Jebel Ali'], capacity: 900, certifications: ['ISO 9001'], minOrderQty: 1,
    turnaroundDays: 1, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: 18000, currency: 'USD',
    blurb: 'Bonded warehousing, order dispatch, inventory handling and delivery proof.',
  },
  {
    slug: 'steppe-trade-finance', loginEmail: 'finance@agrostock.live', name: 'Steppe Trade Finance', role: Role.finance_partner,
    country: 'Kazakhstan', categories: [ServiceCategory.financial_services],
    cities: ['Almaty', 'Astana'], capacity: 20, certifications: [], minOrderQty: 1,
    turnaroundDays: 7, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: null, currency: 'USD',
    blurb: 'Working capital, trade finance and invoice discounting for commodity businesses.',
  },
  {
    slug: 'deccan-food-processors', name: 'Deccan Food Processors', role: Role.processor,
    country: 'India', categories: [ServiceCategory.chopping, ServiceCategory.blanching, ServiceCategory.pitting],
    cities: ['Hyderabad', 'Pune'], capacity: 12000, certifications: ['FSSAI', 'HACCP'], minOrderQty: 750,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_kg, priceFromCents: 18, currency: 'USD',
    blurb: 'Contract chopping, blanching and pitting with export-grade food safety controls.',
  },
  {
    slug: 'gateway-customs-advisors', name: 'Gateway Customs Advisors', role: Role.accountant,
    country: 'United Arab Emirates', categories: [ServiceCategory.customs_clearance, ServiceCategory.accounting],
    cities: ['Dubai', 'Sharjah'], capacity: 30, certifications: ['FTA Registered'], minOrderQty: 1,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: 12500, currency: 'USD',
    blurb: 'Customs clearance, VAT accounting and cross-border documentation for food imports.',
  },
  {
    slug: 'northern-cold-pack', name: 'Northern Cold Pack', role: Role.packer,
    country: 'Russia', categories: [ServiceCategory.packing, ServiceCategory.sorting_grading],
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

    await prisma.serviceProvider.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        companyName: business.name,
        categories: business.categories,
        citiesServed: business.cities,
        country: business.country,
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
  }

  console.log(`Seeded ${businesses.length} public service businesses.`);
  console.log('Service demo logins:');
  for (const business of businesses.filter((entry) => entry.loginEmail)) {
    console.log(`- ${business.name}: ${business.loginEmail}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
