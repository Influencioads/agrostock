/**
 * A pass-through `TextTranslationService` double.
 *
 * The real one is the translate-on-read cache: it hits Postgres for a cached row
 * and Google for a miss. Specs that exercise filters, visibility or currency have
 * no business doing either, and the production service already passes text
 * through untouched whenever the locale is English or the client is disabled —
 * which is the behaviour reproduced here.
 *
 * Localization itself is covered where it belongs, against the real service.
 */
export function noTranslate() {
  return {
    enabled: false,
    localize: async (text: unknown) => text,
    localizeMany: async (texts: unknown[]) => texts,
    localizeRows: async (rows: unknown[]) => rows,
  } as never;
}
