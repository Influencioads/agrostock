import {
  Auctions,
  Categories,
  Hero,
  Highlighted,
  Offers,
  OfficesPreview,
  SafeDeal,
  Services,
} from '../components/site/sections';

/**
 * WEB-01 (F29 follow-through): the `International`, `Insights` and `Community`
 * sections rendered hardcoded arrays from `mock/data.ts` — invented tradable
 * products with prices, invented market-price sparklines, and fabricated posts
 * from named "experts" — all presented as real marketplace data. There is no
 * endpoint behind any of them, so they are removed rather than dressed up.
 * `OfficesPreview` is kept because it now reads the real /offices endpoint.
 */
export function WebsitePage() {
  return (
    <>
      <Hero />
      <Highlighted />
      <Categories />
      <Offers />
      <Auctions />
      <Services />
      <SafeDeal />
      <OfficesPreview />
    </>
  );
}
