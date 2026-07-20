import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { LANGS, type AttrField, type Lang } from '@agrotraders/types';
import { FALLBACK_LNG } from '@agrotraders/i18n';
import { GoogleTranslateClient } from './google-translate.client';

/** The locales we translate *into* — every supported language except the source. */
export const TARGET_LOCALES: Lang[] = LANGS.filter((l) => l !== FALLBACK_LNG);

/** A JSON attributes blob (Product.attributes). Values are string | string[] | number | boolean. */
export type AttributeValues = Record<string, unknown>;

/**
 * Machine translation for user-generated content (translate-on-write + cache).
 *
 * Wraps {@link GoogleTranslateClient} with the field-level plumbing every worker
 * needs: stable source hashing (skip re-translating unchanged text), batched
 * multi-field translation, and attribute-aware translation driven by the shared
 * attribute schema. Disabled-client calls degrade to returning source text.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger('TranslationService');

  constructor(private readonly google: GoogleTranslateClient) {}

  get enabled() {
    return this.google.enabled;
  }

  readonly targets = TARGET_LOCALES;

  /** Stable content hash of a source value, used to detect edits since last translation. */
  hash(value: unknown): string {
    const canonical = typeof value === 'string' ? value : JSON.stringify(value ?? null);
    return createHash('sha1').update(canonical).digest('hex');
  }

  /** Per-field source hashes for the translatable fields of a record. */
  fieldHashes<T extends Record<string, unknown>>(record: T, fields: readonly (keyof T)[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of fields) out[String(f)] = this.hash(record[f]);
    return out;
  }

  /** True when nothing translatable changed since the stored hashes were written. */
  unchanged(prev: Record<string, string> | null | undefined, next: Record<string, string>): boolean {
    if (!prev) return false;
    const keys = Object.keys(next);
    return keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]);
  }

  /**
   * Translate the non-empty string fields of a record into `target` in one batch.
   * Returns a partial map of only the fields that had translatable text.
   */
  async translateFields<T extends Record<string, unknown>>(
    record: T,
    fields: readonly (keyof T)[],
    target: string,
    source = FALLBACK_LNG,
  ): Promise<Partial<Record<keyof T, string>>> {
    const picked = fields.filter((f) => typeof record[f] === 'string' && (record[f] as string).trim().length > 0);
    if (picked.length === 0) return {};
    const translated = await this.google.translate(
      picked.map((f) => record[f] as string),
      target,
      source,
    );
    const out: Partial<Record<keyof T, string>> = {};
    picked.forEach((f, i) => {
      out[f] = translated[i];
    });
    return out;
  }

  /**
   * Translate the free-text values inside a Product.attributes blob.
   *
   * Only `type: 'text'` fields are sent to Google. `select`/`multiselect` values
   * come from a fixed vocabulary that already ships translated in the `attrs`
   * i18n namespace, so clients localize those for free — paying per product for
   * them would be pure waste. Keys, numbers, booleans and dates are never touched.
   * Returns a new blob containing only the translated keys.
   */
  async translateAttributes(
    attributes: AttributeValues | null | undefined,
    schema: readonly AttrField[],
    target: string,
    source = FALLBACK_LNG,
  ): Promise<AttributeValues | null> {
    if (!attributes || schema.length === 0) return null;

    // Collect every translatable string with a slot describing where it goes back.
    const strings: string[] = [];
    const slots: { key: string; index: number | null }[] = [];

    for (const field of schema) {
      const value = attributes[field.key];
      if (value == null) continue;
      if (field.type === 'text' && typeof value === 'string' && value.trim()) {
        strings.push(value);
        slots.push({ key: field.key, index: null });
      }
    }

    if (strings.length === 0) return null;

    const translated = await this.google.translate(strings, target, source);
    const out: AttributeValues = {};
    slots.forEach((slot, i) => {
      if (slot.index === null) {
        out[slot.key] = translated[i];
      } else {
        const arr = (out[slot.key] as string[] | undefined) ?? [...((attributes[slot.key] as string[]) ?? [])];
        arr[slot.index] = translated[i];
        out[slot.key] = arr;
      }
    });
    return out;
  }

  /** Detect a string's source language (BCP-47-ish); null when disabled. */
  detect(text: string): Promise<string | null> {
    return this.google.detect(text);
  }

  /** Translate with auto source detection (for chat, where the writer's language varies). */
  translateAuto(texts: string[], target: string): Promise<string[]> {
    return this.google.translate(texts, target, undefined);
  }
}
