/**
 * Server-side notification renderer.
 *
 * Notifications are stored as a `type` + `params` pair (not a frozen English
 * string). This module turns that pair into a `{ title, body }` rendered in the
 * recipient's locale, so every delivery channel — in-app list, realtime toast,
 * FCM push and email — is localized from one catalog. The API calls this at
 * creation time using the recipient's saved `User.locale`.
 *
 * It is deliberately runtime-free (no i18next) so the NestJS API can import it
 * without a client runtime — mirroring `index.ts`. Catalogs are the same
 * `locales/<locale>/notification.json` files the clients bundle, so translators
 * fill all ten via the standard `scripts/translate.mjs` pass. They are read from
 * disk lazily (not statically imported) so this compiles cleanly under the Node
 * `rootDir: src` build without pulling the JSON into `dist`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Lang } from './index';
import { FALLBACK_LNG, isLang } from './index';

interface NotificationNode {
  title?: string;
  body?: string;
}
interface Catalog {
  common: { reason_suffix: string };
  enum: Record<string, Record<string, string>>;
  [group: string]: unknown;
}

const LOCALES_DIR = join(__dirname, '..', 'locales');
const cache = new Map<string, Catalog>();

function loadCatalog(lang: Lang): Catalog {
  const hit = cache.get(lang);
  if (hit) return hit;
  const parsed = JSON.parse(readFileSync(join(LOCALES_DIR, lang, 'notification.json'), 'utf8')) as Catalog;
  cache.set(lang, parsed);
  return parsed;
}

/** A rendered notification value: a literal, or a reference to a catalog enum label. */
export type NotificationParam = string | number | { enum: string; value: string };
export type NotificationParams = Record<string, NotificationParam | null | undefined>;

export interface RenderedNotification {
  title: string;
  body?: string;
}

/** Walk a dotted `type` path (`order.new_enquiry`) into a catalog node. */
function nodeAt(catalog: Catalog, type: string): NotificationNode | null {
  let cur: unknown = catalog;
  for (const seg of type.split('.')) {
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return null;
    }
  }
  return cur && typeof cur === 'object' ? (cur as NotificationNode) : null;
}

function resolveParam(catalog: Catalog, value: NotificationParam): string {
  if (value != null && typeof value === 'object' && 'enum' in value) {
    // A partially-translated catalog may lack the enum block — fall back to the raw token.
    return catalog.enum?.[value.enum]?.[value.value] ?? value.value;
  }
  return String(value);
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function interpolate(catalog: Catalog, template: string, params: NotificationParams): string {
  return template.replace(PLACEHOLDER, (_m, key: string) => {
    const v = params[key];
    return v == null ? '' : resolveParam(catalog, v);
  });
}

/**
 * Render a notification `type` + `params` into localized `{ title, body }`.
 *
 * Falls back to the English catalog for any locale or key the target is missing,
 * and returns `null` when the type is unknown (the caller then uses an explicit
 * title/body override, e.g. for passthrough user content like a chat preview).
 *
 * Special params: an optional non-empty `reason` appends the shared
 * `common.reason_suffix` ("Reason: …") to the body; a `{ enum, value }` param
 * resolves to a localized enum label (order status, role, …).
 */
export function renderNotification(
  locale: string,
  type: string,
  params: NotificationParams = {},
): RenderedNotification | null {
  const lang: Lang = isLang(locale) ? locale : FALLBACK_LNG;
  let catalog: Catalog;
  let node: NotificationNode | null;
  try {
    catalog = loadCatalog(lang);
    node = nodeAt(catalog, type);
    if (!node?.title && lang !== FALLBACK_LNG) {
      catalog = loadCatalog(FALLBACK_LNG);
      node = nodeAt(catalog, type);
    }
  } catch {
    return null;
  }
  if (!node?.title) return null;

  const title = interpolate(catalog, node.title, params);
  let body = node.body ? interpolate(catalog, node.body, params) : undefined;

  const reason = params.reason;
  const reasonTpl = catalog.common?.reason_suffix ?? 'Reason: {{reason}}';
  if (body && typeof reason === 'string' && reason.trim()) {
    body += ' ' + interpolate(catalog, reasonTpl, { reason });
  }

  return body != null ? { title, body } : { title };
}
