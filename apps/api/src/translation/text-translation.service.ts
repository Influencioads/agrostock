import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FALLBACK_LNG } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleTranslateClient } from './google-translate.client';

/**
 * Generic translate-on-read cache — the universal safety net for every
 * user-visible free-text field that does NOT have a dedicated per-type
 * translation table (orders, auctions, hires, ads, transport, markets, support,
 * directory bios, …).
 *
 * Contract mirrors {@link GoogleTranslateClient}'s graceful degradation: when the
 * source locale is requested, the client is disabled, or the text is empty, the
 * source string passes through untouched. Otherwise the text is translated once,
 * stored in {@link TextTranslation} keyed by SHA-1(source)+locale, and reused on
 * every later read. Identical strings (a repeated status line, a city name) share
 * one row across all content types, so nothing is ever translated twice.
 *
 * Everything is batched: a whole response's worth of strings is resolved with one
 * cache query and at most one Google request, so wrapping a list endpoint adds a
 * single round-trip rather than an N+1.
 */
@Injectable()
export class TextTranslationService {
  private readonly logger = new Logger('TextTranslation');

  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleTranslateClient,
  ) {}

  get enabled() {
    return this.google.enabled;
  }

  private hash(text: string): string {
    return createHash('sha1').update(text).digest('hex');
  }

  /**
   * Translate a batch of English strings into `locale`, returning an array
   * aligned 1:1 with the input. Empty/whitespace entries and the source locale
   * pass through. Never throws: a translation failure logs and falls back to the
   * source text so a read is never broken by the translator being down.
   */
  async localizeMany(texts: (string | null | undefined)[], locale: string): Promise<(string | null | undefined)[]> {
    if (locale === FALLBACK_LNG || !this.google.enabled) return texts;

    // Unique, non-empty sources → hashes. Preserve alignment via an index map.
    const needed = new Map<string, string>(); // hash -> source
    for (const t of texts) {
      if (typeof t === 'string' && t.trim()) needed.set(this.hash(t), t);
    }
    if (needed.size === 0) return texts;

    const hashes = [...needed.keys()];
    const resolved = new Map<string, string>(); // hash -> translated

    try {
      const cached = await this.prisma.textTranslation.findMany({
        where: { locale, sourceHash: { in: hashes } },
        select: { sourceHash: true, text: true },
      });
      for (const row of cached) resolved.set(row.sourceHash, row.text);

      const missHashes = hashes.filter((h) => !resolved.has(h));
      if (missHashes.length > 0) {
        const missTexts = missHashes.map((h) => needed.get(h)!);
        const translated = await this.google.translate(missTexts, locale, FALLBACK_LNG);
        const rows = missHashes.map((h, i) => ({ sourceHash: h, locale, text: translated[i] }));
        // Concurrent readers may race on the same string; skipDuplicates makes the
        // write idempotent against the @@unique([sourceHash, locale]) constraint.
        await this.prisma.textTranslation.createMany({ data: rows, skipDuplicates: true });
        rows.forEach((r) => resolved.set(r.sourceHash, r.text));
      }
    } catch (err) {
      this.logger.error(`localizeMany(${locale}) failed, serving source: ${(err as Error).message}`);
      return texts;
    }

    return texts.map((t) => (typeof t === 'string' && t.trim() ? resolved.get(this.hash(t)) ?? t : t));
  }

  /** Translate a single string (thin wrapper over {@link localizeMany}). */
  async localize(text: string | null | undefined, locale: string): Promise<string | null | undefined> {
    const [out] = await this.localizeMany([text], locale);
    return out;
  }

  /**
   * Localize the given string fields across a list of rows in ONE batch, mutating
   * copies. Returns new row objects with the named fields translated; every other
   * field is untouched. Non-string field values pass through.
   */
  async localizeRows<T extends Record<string, unknown>>(
    rows: T[],
    fields: readonly (keyof T)[],
    locale: string,
  ): Promise<T[]> {
    if (locale === FALLBACK_LNG || !this.google.enabled || rows.length === 0) return rows;

    // Flatten every field of every row into one array, remembering coordinates.
    const flat: (string | null | undefined)[] = [];
    const coords: { row: number; field: keyof T }[] = [];
    rows.forEach((row, ri) => {
      for (const f of fields) {
        const v = row[f];
        flat.push(typeof v === 'string' ? v : undefined);
        coords.push({ row: ri, field: f });
      }
    });

    const localized = await this.localizeMany(flat, locale);
    const out = rows.map((r) => ({ ...r }));
    localized.forEach((val, i) => {
      if (typeof val === 'string') {
        const { row, field } = coords[i];
        out[row][field] = val as T[keyof T];
      }
    });
    return out;
  }
}
