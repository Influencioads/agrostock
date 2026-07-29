/**
 * Slug derivation for names that are not written in Latin script.
 *
 * The plain `toLowerCase().replace(/[^a-z0-9]+/g, '-')` every module used
 * collapses a Cyrillic name to the empty string, so two Russian markets both
 * slugged to `''` and the second one hit the unique constraint. Transliterating
 * first keeps the slug readable and, more importantly, distinct.
 */
const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Lowercase, transliterate, then reduce to `a-z0-9-`. */
export function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (ch) => CYRILLIC[ch] ?? '')
    // Latin letters carrying diacritics (Türkiye, São Paulo) decompose to ASCII.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
