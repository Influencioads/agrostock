import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Undo the machine translation of trade codes in `SubcategoryTranslation.attrFields`.
 *
 * The hourly sweep sent every attribute option to Google, codes included, and
 * Google transliterated them: `SWP`→`СВП`, `BB`→`ББ`, `D24`→`Д24`, and `AAA`
 * came back as `АААА` — a grade code with a letter ADDED. Bracketed codes fared
 * no better: `Butts (B)`→`Баттс (Б)`, `Plastic (HDPE)`→`Пластик (ПЭВП)`.
 *
 * These are not translations, they are corruption: a buyer filtering on grade
 * `SWP` no longer matches, and the code means nothing in Cyrillic.
 *
 * `translation-sweep.service.ts` now refuses to send codes at all, so this is a
 * ONE-OFF repair of rows written before that guard. Idempotent and safe to
 * re-run; prose translations are left alone.
 */

/** No lowercase letter anywhere — `SWP`, `W180`, `D24`, `20/22`, `IQF`. */
function isTradeCode(text: string): boolean {
  return /[A-Za-z]/.test(text) && !/[a-z]/.test(text);
}

/** Put back a bracketed code the translator rewrote, keeping the prose. */
function restoreBracketedCodes(source: string, translated: string): string {
  const codes = source.match(/\(([^)]*)\)/g)?.filter((c) => isTradeCode(c.slice(1, -1))) ?? [];
  if (!codes.length) return translated;
  let out = translated;
  const found = out.match(/\(([^)]*)\)/g) ?? [];
  codes.forEach((code, i) => {
    if (found[i] && found[i] !== code) out = out.replace(found[i], code);
  });
  return out;
}

type Dict = { label?: Record<string, string>; option?: Record<string, string> };

async function main() {
  const rows = await prisma.subcategoryTranslation.findMany({
    where: { NOT: { attrFields: { equals: Prisma.DbNull } } },
    select: { id: true, locale: true, attrFields: true },
  });

  let rowsTouched = 0;
  let codesRestored = 0;
  let bracketsRestored = 0;
  const samples: string[] = [];

  for (const row of rows) {
    const dict = (row.attrFields as Dict | null) ?? {};
    let changed = false;
    const next: Dict = {};

    for (const bucket of ['label', 'option'] as const) {
      const src = dict[bucket];
      if (!src) continue;
      const out: Record<string, string> = {};
      for (const [en, translated] of Object.entries(src)) {
        let fixed: string;
        if (isTradeCode(en)) {
          fixed = en;
          if (translated !== en) {
            codesRestored++;
            if (samples.length < 12) samples.push(`${row.locale}: ${translated} -> ${en}`);
          }
        } else {
          fixed = restoreBracketedCodes(en, translated);
          if (fixed !== translated) {
            bracketsRestored++;
            if (samples.length < 12) samples.push(`${row.locale}: ${translated} -> ${fixed}`);
          }
        }
        if (fixed !== translated) changed = true;
        out[en] = fixed;
      }
      next[bucket] = out;
    }

    if (!changed) continue;
    await prisma.subcategoryTranslation.update({
      where: { id: row.id },
      data: { attrFields: next as Prisma.InputJsonValue },
    });
    rowsTouched++;
  }

  console.log(`attr codes: ${codesRestored} codes + ${bracketsRestored} bracketed restored across ${rowsTouched} rows (of ${rows.length})`);
  for (const s of samples) console.log(`  ${s}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
