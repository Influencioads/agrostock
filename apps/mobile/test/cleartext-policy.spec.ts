import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

const appConfig = require(join(ROOT, 'app.config.js')) as (input: {
  config: { plugins: unknown[]; android?: object; ios?: object };
}) => { plugins: Array<unknown> };

function cleartextFlag(env: Record<string, string | undefined>): boolean {
  const saved = { ...process.env };
  Object.assign(process.env, { EAS_BUILD_PROFILE: undefined, ALLOW_CLEARTEXT_HTTP: undefined, ...env });
  try {
    const result = appConfig({ config: { plugins: [] } });
    const buildProps = result.plugins.find(
      (p): p is [string, { android: { usesCleartextTraffic: boolean } }] =>
        Array.isArray(p) && p[0] === 'expo-build-properties',
    );
    if (!buildProps) throw new Error('expo-build-properties plugin missing');
    return buildProps[1].android.usesCleartextTraffic;
  } finally {
    process.env = saved;
  }
}

describe('Android cleartext policy (F42)', () => {
  afterEach(() => {
    delete process.env.EAS_BUILD_PROFILE;
    delete process.env.ALLOW_CLEARTEXT_HTTP;
  });

  it('release builds deny cleartext by default', () => {
    expect(cleartextFlag({})).toBe(false);
    expect(cleartextFlag({ EAS_BUILD_PROFILE: 'preview' })).toBe(false);
  });

  it('production can never opt in', () => {
    expect(cleartextFlag({ EAS_BUILD_PROFILE: 'production', ALLOW_CLEARTEXT_HTTP: '1' })).toBe(false);
  });

  it('non-production builds may opt in explicitly', () => {
    expect(cleartextFlag({ EAS_BUILD_PROFILE: 'preview', ALLOW_CLEARTEXT_HTTP: '1' })).toBe(true);
  });

  it('the committed main manifest denies cleartext (debug overlay re-enables it)', () => {
    const main = readFileSync(join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    expect(main).toContain('android:usesCleartextTraffic="false"');
    const debug = readFileSync(join(ROOT, 'android/app/src/debug/AndroidManifest.xml'), 'utf8');
    expect(debug).toContain('tools:replace="android:usesCleartextTraffic"');
  });
});
