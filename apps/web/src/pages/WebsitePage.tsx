import {
  Auctions,
  Categories,
  Community,
  Hero,
  Highlighted,
  Insights,
  International,
  Offers,
  OfficesPreview,
  SafeDeal,
  Services,
} from '../components/site/sections';

export function WebsitePage() {
  return (
    <>
      <Hero />
      <Highlighted />
      <Categories />
      <Offers />
      <Auctions />
      <International />
      <Services />
      <Insights />
      <SafeDeal />
      <Community />
      <OfficesPreview />
    </>
  );
}
