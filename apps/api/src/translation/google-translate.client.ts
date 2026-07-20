import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper over Google Cloud Translation v2 (REST, API-key auth).
 *
 * Mirrors the graceful-degradation contract used by PushService: when
 * `GOOGLE_TRANSLATE_API_KEY` is unset the client disables itself and every call
 * is a logged no-op, so the API boots and serves canonical (English) text
 * without translation configured. Uses the same endpoint + env var as the
 * offline catalog script (`packages/i18n/scripts/translate.mjs`).
 */
/** Google Translate v2 caps a single request at 128 text segments. */
const MAX_SEGMENTS = 100;

@Injectable()
export class GoogleTranslateClient {
  private readonly logger = new Logger('GoogleTranslate');
  private readonly key: string | undefined;

  constructor(config: ConfigService) {
    this.key = config.get<string>('GOOGLE_TRANSLATE_API_KEY') || undefined;
    if (!this.key) {
      this.logger.warn(
        'Translation disabled: set GOOGLE_TRANSLATE_API_KEY to enable machine translation.',
      );
    }
  }

  get enabled() {
    return Boolean(this.key);
  }

  /**
   * Google expects a BCP-47-ish code. Our locale ids mostly pass through; the
   * script-tagged ones need an explicit mapping.
   */
  private static toGoogleCode(locale: string): string {
    if (locale === 'zh-Hans') return 'zh-CN';
    return locale;
  }

  /**
   * Translate a batch of strings in a single request. Empty inputs are echoed
   * back untouched so caller index alignment is preserved. Returns the source
   * strings unchanged when the client is disabled. Pass `source = undefined`
   * (or 'auto') to let Google auto-detect the source language — used for chat,
   * where the writer's language is not fixed.
   */
  async translate(texts: string[], target: string, source: string | undefined = 'en'): Promise<string[]> {
    if (!this.key || texts.length === 0) return texts;

    const autodetect = !source || source === 'auto';
    const out: string[] = [];
    for (let i = 0; i < texts.length; i += MAX_SEGMENTS) {
      const chunk = texts.slice(i, i + MAX_SEGMENTS);
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${this.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: chunk,
            ...(autodetect ? {} : { source: GoogleTranslateClient.toGoogleCode(source) }),
            target: GoogleTranslateClient.toGoogleCode(target),
            format: 'text',
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Google translate ${res.status}: ${await res.text()}`);
      }
      const json = (await res.json()) as {
        data: { translations: { translatedText: string }[] };
      };
      out.push(...json.data.translations.map((t) => t.translatedText));
    }
    return out;
  }

  /** Detect the language of a single string; null when disabled or on empty input. */
  async detect(text: string): Promise<string | null> {
    if (!this.key || !text.trim()) return null;

    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${this.key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: [text] }),
      },
    );
    if (!res.ok) {
      throw new Error(`Google detect ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      data: { detections: { language: string }[][] };
    };
    return json.data.detections?.[0]?.[0]?.language ?? null;
  }
}
