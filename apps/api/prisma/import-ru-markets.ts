/**
 * Imports the extracted Russian wholesale markets (`data/markets/ru-wholesale.json`,
 * produced by `scripts/extract-ru-markets.mjs`) into the Market table.
 *
 * Idempotent: keyed on the derived slug, so re-running updates rather than
 * duplicates. Nothing is deleted.
 *
 * The base Market row holds ENGLISH name/city/region — that is the invariant the
 * rest of the platform reads against (`localize()` falls back to the base row,
 * and the city filter matches the English `country-state-city` dataset). The
 * original Russian strings land in a `ru` MarketTranslation, and the remaining
 * locales are filled afterwards by `pnpm --filter @agrotraders/api backfill:taxonomy`.
 *
 * Run:  pnpm --filter @agrotraders/api import:ru-markets [-- --only-wholesale] [--dry]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TranslationService } from '../src/translation/translation.service';
import { slugifyName } from '../src/common/slug';

interface Row {
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  placeId: string;
  looksWholesale: string;
}

const SOURCE = join(__dirname, '..', '..', '..', 'data', 'markets', 'ru-wholesale.json');

/**
 * Google returns plenty of signboard names wrapped in quotes (`"Бакалея, База"`).
 * A leading quote defeats the native `<select>` type-ahead — the picker jumps to
 * the option starting with the letter you press, and `"` is not a letter — and
 * sorts them all into a clump at the top. Only QUOTE characters are stripped:
 * `#Seafood48` is genuinely called that.
 */
const stripQuotes = (name: string) => name.replace(/^["'«»„“”\s]+/, '').replace(/["'«»„“”\s]+$/, '').trim() || name;

/* ── City names: translated is wrong, transliterated is right ────── */

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ'’ʹ\-\s.]/g, '');
const translit = (s: string) => normalize(s.replace(/[Ѐ-ӿ]/g, (c) => CYRILLIC[c.toLowerCase()] ?? c));

/** Canonical English spellings — the same list `/geo/cities` serves, so a market's
 *  city matches what the city filter and the signup picker offer. */
const canonicalCities = new Map<string, string>();
for (const city of JSON.parse(
  readFileSync(join(__dirname, '..', 'src', 'geo', 'data', 'cities', 'RU.json'), 'utf8'),
) as string[]) {
  const key = normalize(city);
  if (!canonicalCities.has(key)) canonicalCities.set(key, city);
}

/**
 * Google TRANSLATES city names that happen to be ordinary words — Курган came
 * back as "Mound", Орёл as "Eagle", Шахты as "Mines". A real transliteration
 * shares its letters with the source, so when it does not, fall back to the
 * canonical spelling. Names that legitimately differ (Хошимин → Ho Chi Minh
 * City) have no entry in the Russian city list and are left alone.
 */
function canonicalCity(ru: string, translated: string): string {
  const source = translit(ru);
  const target = normalize(translated);
  const looksTransliterated =
    !source || !target || source.includes(target) || target.includes(source) || source.slice(0, 4) === target.slice(0, 4);
  if (looksTransliterated) return translated;
  return canonicalCities.get(source) ?? translated;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const onlyWholesale = args.includes('--only-wholesale');

  const all: Row[] = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const rows = onlyWholesale ? all.filter((r) => r.looksWholesale === 'yes') : all;
  console.log(`${rows.length} row(s) from ${SOURCE}${onlyWholesale ? ' (wholesale-looking only)' : ''}`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const translation = app.get(TranslationService);

  // Names, cities and regions are Russian. Translate the DISTINCT strings once —
  // 3.5k markets share ~200 cities and ~80 regions between them.
  const distinct = [...new Set(rows.flatMap((r) => [r.name, r.city, r.region]).filter(Boolean))];
  const english = new Map<string, string>();
  if (translation.enabled && !dry) {
    console.log(`translating ${distinct.length} distinct string(s) ru → en…`);
    for (let i = 0; i < distinct.length; i += 100) {
      const chunk = distinct.slice(i, i + 100);
      const out = await translation.translateFrom(chunk, 'en', 'ru');
      chunk.forEach((src, j) => english.set(src, out[j] || src));
    }
  } else {
    console.log('translation disabled or --dry: keeping the Russian strings as the base row');
  }
  const en = (s: string) => english.get(s) || s;

  // Slugs must be unique across the whole table, including the markets already
  // there, so seed the taken-set from the database.
  const taken = new Set((await prisma.market.findMany({ select: { slug: true } })).map((m) => m.slug));
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const nameEn = stripQuotes(en(row.name));
    const cityEn = canonicalCity(row.city, en(row.city));
    // The Russian name transliterates; the city disambiguates the many markets
    // literally called "Овощная база".
    const base = slugifyName(`${row.name} ${row.city}`) || slugifyName(`${nameEn} ${cityEn}`) || 'market';
    // An existing row for this place keeps ITS slug — re-running must not orphan
    // products already attached to it.
    const existing = await prisma.market.findFirst({
      where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }], address: row.address },
      select: { id: true, slug: true },
    });

    let slug = existing?.slug ?? base;
    if (!existing) {
      let n = 2;
      while (taken.has(slug)) slug = `${base}-${n++}`;
      taken.add(slug);
    }

    const data = {
      name: nameEn,
      city: cityEn,
      region: en(row.region),
      address: row.address,
      country: 'Russia',
      flag: '🇷🇺',
      status: 'approved' as const,
      active: true,
    };

    if (dry) {
      if (created < 5) console.log(`  ${slug} → ${data.name} · ${data.city} · ${data.address}`);
      created++;
      continue;
    }

    const market = await prisma.market.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
    existing ? updated++ : created++;

    // The Russian originals, so a Russian reader sees the name on the signboard.
    await prisma.marketTranslation.upsert({
      where: { marketId_locale: { marketId: market.id, locale: 'ru' } },
      create: { marketId: market.id, locale: 'ru', name: stripQuotes(row.name), city: row.city, region: row.region },
      update: { name: stripQuotes(row.name), city: row.city, region: row.region },
    });
  }

  console.log(`${created} created, ${updated} updated${dry ? ' (dry run — nothing written)' : ''}`);
  console.log('next: pnpm --filter @agrotraders/api backfill:taxonomy  # fills the other 9 locales');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
