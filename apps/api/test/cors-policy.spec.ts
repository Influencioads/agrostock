import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveCorsOrigins } from '../src/config/cors';

describe('CORS policy (F22)', () => {
  it('returns the parsed allowlist when configured', () => {
    expect(
      resolveCorsOrigins({ CORS_ORIGINS: 'https://app.example.com, https://admin.example.com' }),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('fails CLOSED in production when the allowlist is empty', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'production' })).toBe(false);
    expect(resolveCorsOrigins({ NODE_ENV: 'production', CORS_ORIGINS: ' ' })).toBe(false);
  });

  it('stays permissive only outside production', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'development' })).toBe(true);
  });

  it('is wired into both WebSocket gateways instead of origin:true', () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    for (const gateway of ['src/support/support.gateway.ts', 'src/community/community.gateway.ts']) {
      const source = readFileSync(`${root}/${gateway}`, 'utf8');
      expect(source).toContain('resolveCorsOrigins()');
      expect(source).not.toContain('origin: true');
    }
  });
});
