import { describe, expect, it } from 'vitest';
import { resolveProductLoad } from './productResolution';

describe('transactional product resolution', () => {
  it('never substitutes mock or stale data while the live product is loading', () => {
    expect(resolveProductLoad(undefined, true, false)).toEqual({ state: 'loading', product: null });
  });

  it('fails closed when the live product request errors', () => {
    expect(resolveProductLoad(undefined, false, true)).toEqual({ state: 'not-found', product: null });
  });

  it('renders only the exact live product supplied by the API', () => {
    const live = { id: 'live-product', name: 'Live wheat' };
    expect(resolveProductLoad(live, false, false)).toEqual({ state: 'ready', product: live });
  });
});
