import { describe, expect, it, vi } from 'vitest';
import { TextTranslationService } from '../src/translation/text-translation.service';
import { ServiceProvidersService } from '../src/services/service-providers.module';

/**
 * The services directory was the one public listing that never went through the
 * translator: a Russian visitor read "Northern Cold Pack / Moscow, Saint
 * Petersburg / ISO 22000" in English while every sibling card was translated.
 *
 * Two things had to be true and neither threw when it wasn't — the directory has
 * to CALL the translator, and the translator has to handle `string[]` columns,
 * which it silently skipped. One suite, both.
 */

/** A translator with the real batching logic and a stubbed Google + cache. */
function realTranslator() {
  const seen: string[][] = [];
  const google = {
    enabled: true,
    translate: vi.fn(async (texts: string[]) => {
      seen.push(texts);
      return texts.map((t) => `ru:${t}`);
    }),
  };
  const prisma = {
    textTranslation: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
  };
  return { text: new TextTranslationService(prisma as never, google as never), google, seen };
}

describe('TextTranslationService.localizeRows — string[] columns', () => {
  it('translates every element of an array field', async () => {
    const { text } = realTranslator();
    const rows = [{ companyName: 'Northern Cold Pack', citiesServed: ['Moscow', 'Saint Petersburg'] }];

    const [out] = await text.localizeRows(rows, ['companyName', 'citiesServed'], 'ru');

    expect(out.companyName).toBe('ru:Northern Cold Pack');
    expect(out.citiesServed).toEqual(['ru:Moscow', 'ru:Saint Petersburg']);
  });

  it('does not mutate the caller\'s array', async () => {
    const { text } = realTranslator();
    const cities = ['Moscow'];
    const rows = [{ citiesServed: cities }];

    await text.localizeRows(rows, ['citiesServed'], 'ru');

    // The shallow row spread shares the array reference; writing through it would
    // translate the Prisma result in place and poison any other reader of it.
    expect(cities).toEqual(['Moscow']);
  });

  it('still batches: one Google call for scalars and arrays together', async () => {
    const { text, google, seen } = realTranslator();
    const rows = [
      { companyName: 'A', citiesServed: ['X', 'Y'] },
      { companyName: 'B', citiesServed: ['Z'] },
    ];

    await text.localizeRows(rows, ['companyName', 'citiesServed'], 'ru');

    expect(google.translate).toHaveBeenCalledTimes(1);
    expect(seen[0].sort()).toEqual(['A', 'B', 'X', 'Y', 'Z']);
  });

  it('leaves non-string entries and the source locale alone', async () => {
    const { text, google } = realTranslator();
    const rows = [{ certifications: [], turnaroundDays: 3, companyName: 'A' }];

    const [en] = await text.localizeRows(rows, ['companyName'], 'en');
    expect(en.companyName).toBe('A');
    expect(google.translate).not.toHaveBeenCalled();

    const [ru] = await text.localizeRows(rows, ['companyName', 'certifications', 'turnaroundDays'], 'ru');
    expect(ru.turnaroundDays).toBe(3);
    expect(ru.certifications).toEqual([]);
  });
});

describe('ServiceProvidersService — the directory actually localizes', () => {
  const row = {
    id: 'p1',
    companyName: 'Northern Cold Pack',
    blurb: 'Temperature-controlled sorting and packing.',
    country: 'Russia',
    citiesServed: ['Moscow', 'Saint Petersburg'],
    countriesServed: ['Russia'],
    productsHandled: ['Walnuts'],
    certifications: ['ISO 22000'],
    categories: ['packing'],
    turnaroundDays: 3,
    user: { id: 'u1', name: 'Cold Pack LLC' },
  };

  function svcFor() {
    const { text } = realTranslator();
    const prisma = {
      serviceProvider: {
        findMany: vi.fn(async () => [{ ...row }]),
        findFirst: vi.fn(async () => ({ ...row })),
      },
    };
    return new ServiceProvidersService(prisma as never, text);
  }

  it('translates names, blurbs and every array column on the public list', async () => {
    const [out] = await svcFor().list({}, 'ru');

    expect(out.companyName).toBe('ru:Northern Cold Pack');
    expect(out.blurb).toBe('ru:Temperature-controlled sorting and packing.');
    expect(out.country).toBe('ru:Russia');
    expect(out.citiesServed).toEqual(['ru:Moscow', 'ru:Saint Petersburg']);
    expect(out.certifications).toEqual(['ru:ISO 22000']);
    expect(out.productsHandled).toEqual(['ru:Walnuts']);
  });

  it('translates the account name the card falls back to when there is no company name', async () => {
    const [out] = await svcFor().list({}, 'ru');
    expect(out.user.name).toBe('ru:Cold Pack LLC');
  });

  it('leaves enum columns to the i18n catalogs', async () => {
    const [out] = await svcFor().list({}, 'ru');
    // Categories render from `enums.json`; a machine translation here would
    // compete with the curated label and lose.
    expect(out.categories).toEqual(['packing']);
    expect(out.turnaroundDays).toBe(3);
  });

  it('serves English untouched', async () => {
    const [out] = await svcFor().list({}, 'en');
    expect(out.companyName).toBe('Northern Cold Pack');
    expect(out.citiesServed).toEqual(['Moscow', 'Saint Petersburg']);
  });

  it('localizes the single-provider read too', async () => {
    const out = await svcFor().publicOne('u1', 'ru');
    expect(out.companyName).toBe('ru:Northern Cold Pack');
    expect(out.citiesServed).toEqual(['ru:Moscow', 'ru:Saint Petersburg']);
  });
});
