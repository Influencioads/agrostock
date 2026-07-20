import { describe, expect, it } from 'vitest';
import { HOME_QUICK_LINKS, HOME_SERVICE_LINKS } from './homeLinks';

describe('home navigation links', () => {
  it('keeps every website marketplace entry visible on mobile home', () => {
    expect(HOME_QUICK_LINKS.map((l) => l.labelKey)).toEqual([
      'pubX.home.link.buy',
      'pubX.home.link.sellers',
      'pubX.home.link.auctions',
      'pubX.home.link.bids',
      'pubX.home.link.transporters',
      'pubX.home.link.loaders',
      'pubX.home.link.workers',
    ]);
  });

  it('makes every service tile navigable', () => {
    expect(HOME_SERVICE_LINKS).toHaveLength(4);
    expect(HOME_SERVICE_LINKS.every((l) => l.route)).toBe(true);
  });
});
