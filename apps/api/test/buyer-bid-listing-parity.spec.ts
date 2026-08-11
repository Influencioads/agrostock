import { describe, expect, it, vi } from 'vitest';
import type { AttrField } from '@agrotraders/types';
import { BuyerBidsService } from '../src/buyer-bids/buyer-bids.module';

/**
 * A requirement carries the same spec sheet a listing does, so a seller reads
 * one description on both sides of the trade. These cover the fields that only
 * exist because of that — and the trimming that keeps a buyer from writing
 * arbitrary JSON into the column.
 */

const fx = { toUsdCents: vi.fn(async (amount: number) => Math.round(amount * 100)) };

// What an admin defined on "Rice"; a requirement drilled to any descendant
// inherits these (fieldMap resolves the inheritance before we see it).
const RICE_FIELDS: AttrField[] = [
  { key: 'grade', label: 'Grade', type: 'select', options: ['A', 'B'] },
  { key: 'moisture', label: 'Moisture', type: 'number', unit: '%' },
  { key: 'certs', label: 'Certifications', type: 'multiselect', options: ['organic', 'halal'] },
];

function service() {
  const prisma = { buyerBid: { create: vi.fn(async ({ data }: { data: unknown }) => data) } };
  const categories = { fieldMap: vi.fn(async () => new Map([['basmati-1121', RICE_FIELDS]])) };
  return new BuyerBidsService(
    prisma as never,
    { create: vi.fn() } as never,
    { emit: vi.fn() } as never,
    fx as never,
    categories as never,
  );
}

const base = { title: 'Rice for Jebel Ali', productName: 'Basmati 1121', qtyValue: 100 };
const create = (dto: Record<string, unknown>) =>
  service().create({ id: 'u1' } as never, { ...base, ...dto } as never) as Promise<Record<string, unknown>>;

describe('a requirement stores the same listing fields a product does', () => {
  it('persists every one of them rather than dropping the ones the form now asks for', async () => {
    const row = await create({
      moq: 25,
      vatExtra: true,
      origin: 'India',
      delivery: 'self_pickup',
      supplyCountries: ['India', 'Pakistan'],
      marketId: 'mkt1',
      safeDeal: true,
      negotiable: true,
    });

    expect(row).toMatchObject({
      moq: 25,
      vatExtra: true,
      origin: 'India',
      delivery: 'self_pickup',
      supplyCountries: ['India', 'Pakistan'],
      marketId: 'mkt1',
      safeDeal: true,
      negotiable: true,
    });
  });

  it('defaults an unanswered form the way a listing does — escrow on, VAT included, no lot floor', async () => {
    const row = await create({});
    expect(row).toMatchObject({ safeDeal: true, negotiable: false, vatExtra: false, moq: null, supplyCountries: [] });
    // Absent, never `{}` — an empty spec sheet must not shadow the column.
    expect(row.attributes).toBeUndefined();
  });
});

describe('spec values are trimmed to the fields the chosen taxonomy node defines', () => {
  it('keeps the real specs and drops keys and options that are not on the field list', async () => {
    const row = await create({
      subcategoryId: 'basmati-1121',
      attributes: {
        grade: 'A',
        moisture: '12.5',
        certs: ['organic', 'not-a-cert'],
        // Neither is on Rice's field list: an unknown key, and a value outside
        // the closed option set. Both are arbitrary buyer input.
        smuggled: '<script>alert(1)</script>',
        grade_typo: 'A',
      },
    });

    expect(row.attributes).toEqual({ grade: 'A', moisture: '12.5', certs: ['organic'] });
  });

  it('stores nothing when the buyer never drilled to a node that has fields', async () => {
    const row = await create({ attributes: { grade: 'A' } });
    expect(row.attributes).toBeUndefined();
  });
});
