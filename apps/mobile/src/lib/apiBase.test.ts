import { describe, expect, it } from 'vitest';
import { assetUrlFromBase, resolveApiBase } from './apiBase';

describe('mobile API base resolution', () => {
  it('defaults to the local API port used by this repo', () => {
    expect(resolveApiBase()).toBe('http://localhost:3100');
  });

  it('normalizes configured URLs before clients and images use them', () => {
    expect(resolveApiBase('https://api.agrotraders.org/')).toBe('https://api.agrotraders.org');
  });

  it('resolves relative upload paths against the same API origin', () => {
    expect(assetUrlFromBase('/uploads/products/a.webp', 'https://api.agrotraders.org')).toBe(
      'https://api.agrotraders.org/uploads/products/a.webp',
    );
  });

  it('leaves absolute and data URLs untouched', () => {
    expect(assetUrlFromBase('https://cdn.example/a.webp', 'https://api.agrotraders.org')).toBe(
      'https://cdn.example/a.webp',
    );
    expect(assetUrlFromBase('data:image/png;base64,abc', 'https://api.agrotraders.org')).toBe(
      'data:image/png;base64,abc',
    );
  });
});
