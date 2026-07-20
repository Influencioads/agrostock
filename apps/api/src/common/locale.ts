import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { FALLBACK_LNG, isLang, type Lang } from '@agrotraders/i18n';

/**
 * Picks the best supported locale from an `Accept-Language` header.
 * Matches the full tag first (`zh-Hans`), then the bare language code (`ru-RU` → `ru`).
 */
export function parseAcceptLanguage(header: string | undefined): Lang {
  if (!header) return FALLBACK_LNG;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.trim(), q: q ? Number(q) : 1 };
    })
    .filter((t) => t.tag && !Number.isNaN(t.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    if (isLang(tag)) return tag;
    const base = tag.split('-')[0];
    if (isLang(base)) return base;
  }
  return FALLBACK_LNG;
}

interface LocaleRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { locale?: string | null };
}

/**
 * The locale to render DB labels in: the signed-in user's saved preference wins,
 * otherwise the request's `Accept-Language`, otherwise English.
 */
export function resolveLocale(req: LocaleRequest): Lang {
  const saved = req.user?.locale;
  if (saved && isLang(saved)) return saved;
  const header = req.headers['accept-language'];
  return parseAcceptLanguage(Array.isArray(header) ? header[0] : header);
}

/** `@Locale() locale: Lang` on any controller method. */
export const Locale = createParamDecorator((_data: unknown, ctx: ExecutionContext): Lang =>
  resolveLocale(ctx.switchToHttp().getRequest<LocaleRequest>()),
);

/**
 * Folds a row's single matching translation over its base (English) fields.
 *
 * Rows are queried with `include: { translations: { where: { locale } } }`, so the
 * array holds at most one entry; when it is empty the base row shows through. English
 * never has a translation row, which is why the base row stays canonical.
 */
export function localize<T extends object, K extends keyof T>(
  row: T & { translations?: Partial<Pick<T, K>>[] },
  fields: readonly K[],
): T {
  const tr = row.translations?.[0];
  if (!tr) return stripInternal(row);
  const merged = { ...row };
  for (const field of fields) {
    const value = tr[field];
    if (value != null) merged[field] = value as T[K];
  }
  return stripInternal(merged);
}

/**
 * Drop the translation bookkeeping before a row goes over the wire: the joined
 * `translations` array (already folded in) and `sourceHashes`, which is internal
 * skip-if-unchanged state that no client should see.
 */
function stripInternal<T extends object>(row: T & { translations?: unknown; sourceHashes?: unknown }): T {
  const { translations: _translations, sourceHashes: _sourceHashes, ...rest } = row;
  return rest as T;
}
