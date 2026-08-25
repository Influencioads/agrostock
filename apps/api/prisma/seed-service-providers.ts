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

/**
 * DELETING the demo fill-out.
 *
 * Every entry added on 2026-08-25 carries a `demo-` slug, which becomes the
 * email local-part, so the whole block is removable in one statement:
 *
 *   DELETE FROM "User" WHERE email LIKE 'demo-%@directory.agrotraders.org';
 *
 * ServiceProvider and its priced services cascade from User. The ten ORIGINAL
 * providers do NOT carry the prefix, so that pattern cannot reach them — which
 * is the whole reason for the prefix.
 */

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
  /** What `capacity` counts, from CAPACITY_UNITS — kg for a line, cases for a firm. */
  capacityUnit: string;
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
    cities: ['Mumbai', 'Delhi'], capacity: 40, capacityUnit: 'filing', certifications: ['ICAI'], minOrderQty: 1,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_month, priceFromCents: 45000, currency: 'USD',
    blurb: 'Export-import accounting, GST support and customs documentation for agricultural traders.',
  },
  {
    slug: 'harbour-pack-solutions', loginEmail: 'packer@agrostock.live', name: 'Harbour Pack Solutions', role: Role.packer,
    country: 'India',
    countriesServed: ['India', 'Sri Lanka', 'United Arab Emirates'], productsHandled: ['Cashew', 'Peanut', 'Turmeric', 'Rice'], acceptsInternationalOrders: true, categories: [ServiceCategory.packing, ServiceCategory.fulfillment],
    cities: ['Chennai', 'Bengaluru'], capacity: 25000, capacityUnit: 'kg', certifications: ['FSSAI', 'ISO 22000'], minOrderQty: 500,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 1200, currency: 'USD',
    blurb: 'Vacuum, jute and retail packing for nuts, pulses, grains and spices.',
  },
  {
    slug: 'anatolia-processing-works', loginEmail: 'processor@agrostock.live', name: 'Anatolia Processing Works', role: Role.processor,
    country: 'Turkey',
    countriesServed: ['Turkey', 'Germany', 'Russia'], productsHandled: ['Hazelnut', 'Pistachio', 'Almond', 'Sunflower seed'], acceptsInternationalOrders: true, categories: [ServiceCategory.roasting, ServiceCategory.roasting_salting, ServiceCategory.sorting_grading],
    cities: ['Mersin', 'Istanbul'], capacity: 18000, capacityUnit: 'kg', certifications: ['HACCP', 'BRCGS'], minOrderQty: 1000,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 9500, currency: 'USD',
    blurb: 'Roasting, salting, sorting and grading for tree nuts and seeds.',
  },
  {
    slug: 'gulf-fulfilment-hub', loginEmail: 'fulfillment@agrostock.live', name: 'Gulf Fulfilment Hub', role: Role.fulfillment_partner,
    country: 'United Arab Emirates',
    countriesServed: ['United Arab Emirates', 'Saudi Arabia', 'Oman'], productsHandled: ['Dates', 'Rice', 'Packaged foods'], acceptsInternationalOrders: true, categories: [ServiceCategory.fulfillment],
    cities: ['Dubai', 'Jebel Ali'], capacity: 900, capacityUnit: 'order', certifications: ['ISO 9001'], minOrderQty: 1,
    turnaroundDays: 1, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: 18000, currency: 'USD',
    blurb: 'Bonded warehousing, order dispatch, inventory handling and delivery proof.',
  },
  {
    slug: 'steppe-trade-finance', loginEmail: 'finance@agrostock.live', name: 'Steppe Trade Finance', role: Role.finance_partner,
    country: 'Kazakhstan',
    countriesServed: ['Kazakhstan', 'Russia', 'Uzbekistan'], productsHandled: ['Wheat', 'Barley', 'Sunflower oil'], acceptsInternationalOrders: false, categories: [ServiceCategory.financial_services],
    cities: ['Almaty', 'Astana'], capacity: 20, capacityUnit: 'client', certifications: [], minOrderQty: 1,
    turnaroundDays: 7, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: null, currency: 'USD',
    blurb: 'Working capital, trade finance and invoice discounting for commodity businesses.',
  },
  {
    slug: 'deccan-food-processors', name: 'Deccan Food Processors', role: Role.processor,
    country: 'India',
    countriesServed: ['India'], productsHandled: ['Mango', 'Tomato', 'Onion', 'Groundnut'], acceptsInternationalOrders: false, categories: [ServiceCategory.chopping, ServiceCategory.blanching, ServiceCategory.pitting],
    cities: ['Hyderabad', 'Pune'], capacity: 12000, capacityUnit: 'kg', certifications: ['FSSAI', 'HACCP'], minOrderQty: 750,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_kg, priceFromCents: 18, currency: 'USD',
    blurb: 'Contract chopping, blanching and pitting with export-grade food safety controls.',
  },
  {
    slug: 'gateway-customs-advisors', name: 'Gateway Customs Advisors', role: Role.accountant,
    country: 'United Arab Emirates',
    countriesServed: ['United Arab Emirates', 'Qatar', 'Kuwait'], productsHandled: ['Grains', 'Edible oils', 'Frozen foods'], acceptsInternationalOrders: true, categories: [ServiceCategory.customs_clearance, ServiceCategory.accounting],
    cities: ['Dubai', 'Sharjah'], capacity: 30, capacityUnit: 'shipment', certifications: ['FTA Registered'], minOrderQty: 1,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: 12500, currency: 'USD',
    blurb: 'Customs clearance, VAT accounting and cross-border documentation for food imports.',
  },
  {
    slug: 'northern-cold-pack', name: 'Northern Cold Pack', role: Role.packer,
    country: 'Russia',
    countriesServed: ['Russia', 'Belarus', 'Kazakhstan'], productsHandled: ['Berries', 'Potato', 'Carrot', 'Frozen vegetables'], acceptsInternationalOrders: true, categories: [ServiceCategory.packing, ServiceCategory.sorting_grading],
    cities: ['Moscow', 'Saint Petersburg'], capacity: 20000, capacityUnit: 'kg', certifications: ['ISO 22000'], minOrderQty: 1000,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 7200, currency: 'USD',
    blurb: 'Temperature-controlled sorting and packing for fresh and frozen agricultural goods.',
  },
  {
    slug: 'ravel-and-co-trade-law', loginEmail: 'legal@agrostock.live', name: 'Ravel & Co Trade Law', role: Role.legal_advisor,
    country: 'India',
    countriesServed: ['India', 'United Arab Emirates', 'Other International'], productsHandled: ['Rice', 'Spices', 'Cashew'], acceptsInternationalOrders: true, categories: [ServiceCategory.legal_services],
    cities: ['Mumbai', 'Kochi'], capacity: 6, capacityUnit: 'case', certifications: ['Bar Council of India'], minOrderQty: 1,
    turnaroundDays: 5, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 6000, currency: 'USD',
    blurb: 'Trade contracts, customs disputes and GAFTA arbitration for agricultural exporters.',
  },
  {
    slug: 'nevsky-legal-partners', name: 'Nevsky Legal Partners', role: Role.legal_advisor,
    country: 'Russia',
    countriesServed: ['Russia', 'Kazakhstan', 'China'], productsHandled: ['Grains', 'Edible oils', 'Sunflower seed'], acceptsInternationalOrders: true, categories: [ServiceCategory.legal_services],
    cities: ['Moscow', 'Saint Petersburg'], capacity: 8, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 4500, currency: 'USD',
    blurb: 'Supply contracts, EAEU compliance and arbitrazh representation for grain traders.',
  },

  /* Demo fill-out, 2026-08-25. Every slug here is `demo-` prefixed so the
   * whole block is removable in one predictable query - see DELETING in
   * the file header. Nothing outside this block carries that prefix.
   */
  {
    slug: 'demo-kama-agro-law', name: 'Kama Agro Law', role: Role.legal_advisor,
    country: 'Russia', countriesServed: ['Russia', 'Kazakhstan'],
    productsHandled: ['Grain', 'Pulses'], acceptsInternationalOrders: false,
    categories: [ServiceCategory.legal_services],
    cities: ['Kazan', 'Ufa'], capacity: 7, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 4200, currency: 'USD',
    blurb: 'Grain supply contracts and EAEU customs disputes.',
  },
  {
    slug: 'demo-volga-contract-chambers', name: 'Volga Contract Chambers', role: Role.legal_advisor,
    country: 'Russia', countriesServed: ['Russia'],
    productsHandled: ['Grain', 'Oilseeds'], acceptsInternationalOrders: false,
    categories: [ServiceCategory.legal_services],
    cities: ['Samara', 'Saratov'], capacity: 5, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 5, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 3800, currency: 'USD',
    blurb: 'Contract drafting and arbitrazh representation for elevators.',
  },
  {
    slug: 'demo-baltic-trade-counsel', name: 'Baltic Trade Counsel', role: Role.legal_advisor,
    country: 'Russia', countriesServed: ['Russia', 'EU'],
    productsHandled: ['Grain', 'Nuts'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Kaliningrad', 'Saint Petersburg'], capacity: 9, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 5200, currency: 'USD',
    blurb: 'Cross-border sale of goods, sanctions screening and export licensing.',
  },
  {
    slug: 'demo-steppe-legal-bureau', name: 'Steppe Legal Bureau', role: Role.legal_advisor,
    country: 'Kazakhstan', countriesServed: ['Kazakhstan', 'Russia', 'China'],
    productsHandled: ['Grain', 'Pulses'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Almaty', 'Shymkent'], capacity: 6, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 6, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 3600, currency: 'USD',
    blurb: 'Kazakh export licensing, phytosanitary appeals and transit disputes.',
  },
  {
    slug: 'demo-bosphorus-trade-law', name: 'Bosphorus Trade Law', role: Role.legal_advisor,
    country: 'Turkey', countriesServed: ['Turkey', 'EU', 'UAE'],
    productsHandled: ['Nuts', 'Dried fruit'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Istanbul', 'Izmir'], capacity: 8, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 6100, currency: 'USD',
    blurb: 'Charterparty, bill of lading and demurrage claims for dry cargo.',
  },
  {
    slug: 'demo-gulf-commercial-advocates', name: 'Gulf Commercial Advocates', role: Role.legal_advisor,
    country: 'UAE', countriesServed: ['UAE', 'India', 'Turkey'],
    productsHandled: ['Nuts', 'Spices'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Dubai', 'Abu Dhabi'], capacity: 10, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 7400, currency: 'USD',
    blurb: 'DIFC contracts, free-zone structuring and letter-of-credit disputes.',
  },
  {
    slug: 'demo-silk-road-arbitration', name: 'Silk Road Arbitration', role: Role.legal_advisor,
    country: 'Kazakhstan', countriesServed: ['Kazakhstan', 'China', 'Russia'],
    productsHandled: ['Grain'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Astana', 'Karaganda'], capacity: 4, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 10, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 5800, currency: 'USD',
    blurb: 'Arbitration and award enforcement across the China-EAEU corridor.',
  },
  {
    slug: 'demo-siberian-agri-counsel', name: 'Siberian Agri Counsel', role: Role.legal_advisor,
    country: 'Russia', countriesServed: ['Russia', 'China'],
    productsHandled: ['Grain', 'Oilseeds'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Novosibirsk', 'Omsk'], capacity: 6, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 5, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 3400, currency: 'USD',
    blurb: 'Land lease, subsidy compliance and grain elevator disputes.',
  },
  {
    slug: 'demo-anatolia-notary-partners', name: 'Anatolia Notary Partners', role: Role.legal_advisor,
    country: 'Turkey', countriesServed: ['Turkey', 'EU'],
    productsHandled: ['Dried fruit', 'Nuts'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Mersin', 'Ankara'], capacity: 12, capacityUnit: 'document', certifications: [], minOrderQty: 1,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_document, priceFromCents: 900, currency: 'USD',
    blurb: 'Apostille, notarisation and document legalisation for exporters.',
  },
  {
    slug: 'demo-caspian-customs-law', name: 'Caspian Customs Law', role: Role.legal_advisor,
    country: 'Russia', countriesServed: ['Russia', 'Kazakhstan', 'UAE'],
    productsHandled: ['Grain', 'Pulses', 'Spices'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.legal_services],
    cities: ['Astrakhan', 'Makhachkala'], capacity: 7, capacityUnit: 'case', certifications: [], minOrderQty: 1,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_hour, priceFromCents: 3900, currency: 'USD',
    blurb: 'Customs valuation challenges and detained-cargo release.',
  },
  {
    slug: 'demo-ural-grain-audit', name: 'Ural Grain Audit', role: Role.accountant,
    country: 'Russia', countriesServed: ['Russia'],
    productsHandled: ['Grain'], acceptsInternationalOrders: false,
    categories: [ServiceCategory.accounting],
    cities: ['Yekaterinburg', 'Perm'], capacity: 35, capacityUnit: 'filing', certifications: ['IPBR'], minOrderQty: 1,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_month, priceFromCents: 42000, currency: 'USD',
    blurb: 'Statutory accounting and profit-tax support for trading houses.',
  },
  {
    slug: 'demo-don-books-and-tax', name: 'Don Books and Tax', role: Role.accountant,
    country: 'Russia', countriesServed: ['Russia'],
    productsHandled: ['Grain', 'Oilseeds'], acceptsInternationalOrders: false,
    categories: [ServiceCategory.accounting, ServiceCategory.customs_clearance],
    cities: ['Rostov-on-Don', 'Krasnodar'], capacity: 40, capacityUnit: 'filing', certifications: ['IPBR'], minOrderQty: 1,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_month, priceFromCents: 38000, currency: 'USD',
    blurb: 'Bookkeeping, VAT returns and export-refund filings.',
  },
  {
    slug: 'demo-emirates-trade-books', name: 'Emirates Trade Books', role: Role.accountant,
    country: 'UAE', countriesServed: ['UAE', 'India'],
    productsHandled: ['Nuts', 'Spices'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.accounting],
    cities: ['Dubai', 'Sharjah'], capacity: 28, capacityUnit: 'filing', certifications: ['FTA Registered'], minOrderQty: 1,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_month, priceFromCents: 52000, currency: 'USD',
    blurb: 'Corporate tax registration and free-zone bookkeeping.',
  },
  {
    slug: 'demo-neva-pack-works', name: 'Neva Pack Works', role: Role.packer,
    country: 'Russia', countriesServed: ['Russia'],
    productsHandled: ['Grain', 'Pulses'], acceptsInternationalOrders: false,
    categories: [ServiceCategory.packing],
    cities: ['Saint Petersburg', 'Veliky Novgorod'], capacity: 22000, capacityUnit: 'kg', certifications: ['ISO 22000'], minOrderQty: 500,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 6800, currency: 'USD',
    blurb: 'Retail and bulk repacking on vacuum and food-grade lines.',
  },
  {
    slug: 'demo-kuban-bagging-lines', name: 'Kuban Bagging Lines', role: Role.packer,
    country: 'Russia', countriesServed: ['Russia', 'Kazakhstan'],
    productsHandled: ['Grain', 'Oilseeds'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.packing, ServiceCategory.sorting_grading],
    cities: ['Krasnodar', 'Sochi'], capacity: 30000, capacityUnit: 'kg', certifications: ['ISO 22000', 'HACCP'], minOrderQty: 1000,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 5900, currency: 'USD',
    blurb: 'Big-bag and 25kg bagging with in-line metal detection.',
  },
  {
    slug: 'demo-marmara-packing-co', name: 'Marmara Packing Co', role: Role.packer,
    country: 'Turkey', countriesServed: ['Turkey', 'EU'],
    productsHandled: ['Dried fruit', 'Nuts'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.packing],
    cities: ['Bursa', 'Istanbul'], capacity: 26000, capacityUnit: 'kg', certifications: ['BRCGS'], minOrderQty: 750,
    turnaroundDays: 2, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 7100, currency: 'USD',
    blurb: 'Modified-atmosphere and tamper-evident retail packing.',
  },
  {
    slug: 'demo-altai-roasting-house', name: 'Altai Roasting House', role: Role.processor,
    country: 'Russia', countriesServed: ['Russia', 'Kazakhstan'],
    productsHandled: ['Nuts', 'Seeds'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.roasting, ServiceCategory.roasting_salting],
    cities: ['Barnaul', 'Novosibirsk'], capacity: 14000, capacityUnit: 'kg', certifications: ['HACCP'], minOrderQty: 800,
    turnaroundDays: 4, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 9200, currency: 'USD',
    blurb: 'Drum roasting, salting and flavour application lines.',
  },
  {
    slug: 'demo-aegean-sorting-plant', name: 'Aegean Sorting Plant', role: Role.processor,
    country: 'Turkey', countriesServed: ['Turkey', 'EU', 'UAE'],
    productsHandled: ['Dried fruit', 'Pulses'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.sorting_grading, ServiceCategory.pitting],
    cities: ['Izmir', 'Manisa'], capacity: 21000, capacityUnit: 'kg', certifications: ['BRCGS', 'HACCP'], minOrderQty: 1000,
    turnaroundDays: 3, pricingBasis: ServicePricingBasis.per_ton, priceFromCents: 8400, currency: 'USD',
    blurb: 'Optical sorting, calibration and pitting for dried fruit.',
  },
  {
    slug: 'demo-caspian-cold-fulfilment', name: 'Caspian Cold Fulfilment', role: Role.fulfillment_partner,
    country: 'Kazakhstan', countriesServed: ['Kazakhstan', 'Russia', 'China'],
    productsHandled: ['Grain', 'Nuts'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.fulfillment],
    cities: ['Aktau', 'Almaty'], capacity: 1200, capacityUnit: 'order', certifications: ['ISO 9001'], minOrderQty: 1,
    turnaroundDays: 1, pricingBasis: ServicePricingBasis.per_order, priceFromCents: 15000, currency: 'USD',
    blurb: 'Marketplace pick-pack, cold storage and last-mile handover.',
  },
  {
    slug: 'demo-anatolia-trade-finance', name: 'Anatolia Trade Finance', role: Role.finance_partner,
    country: 'Turkey', countriesServed: ['Turkey', 'UAE', 'EU'],
    productsHandled: ['Nuts', 'Dried fruit'], acceptsInternationalOrders: true,
    categories: [ServiceCategory.financial_services],
    cities: ['Istanbul', 'Mersin'], capacity: 25, capacityUnit: 'client', certifications: [], minOrderQty: 1,
    turnaroundDays: 6, pricingBasis: ServicePricingBasis.per_lot, priceFromCents: null, currency: 'USD',
    blurb: 'Letters of credit, invoice discounting and FX hedging.',
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
        capacityUnit: business.capacityUnit,
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
        capacityUnit: business.capacityUnit,
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
