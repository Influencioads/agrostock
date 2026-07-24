import { describe, expect, it } from 'vitest';
import { resolveProductLoad } from './productResolution';

describe('transactional product resolution', () => {
  it('never substitutes mock or stale data while the live product is loading', () => {
    expect(resolveProductLoad(undefined, true, false)).toEqual({ state: 'loading', product: null });
  });

  it('fails closed with a retryable error state when the request errors (F28)', () => {
    // Distinct from not-found so the page can offer a retry rather than a 404.
    expect(resolveProductLoad(undefined, false, true)).toEqual({ state: 'error', product: null });
    expect(resolveProductLoad(undefined, true, true)).toEqual({ state: 'error', product: null });
  });

  it('reports not-found only when the request finished cleanly with no product', () => {
    expect(resolveProductLoad(undefined, false, false)).toEqual({ state: 'not-found', product: null });
  });

  it('renders only the exact live product supplied by the API', () => {
    const live = { id: 'live-product', name: 'Live wheat' };
    expect(resolveProductLoad(live, false, false)).toEqual({ state: 'ready', product: live });
  });
});
