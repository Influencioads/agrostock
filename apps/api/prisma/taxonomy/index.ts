/**
 * The product taxonomy — single source of truth for `seed.ts` (dev reseed) and
 * `taxonomy-sync.ts` (idempotent production sync). One module per top-level
 * category; see `types.ts` for the contract and the frozen-level-1/2 rule.
 *
 * Order here is the display order: `sort` is assigned from the array index, so
 * moving an entry re-sorts the storefront.
 */
import type { TaxCategory, TaxNode } from './types';

import { vegetables } from './vegetables';
import { fruits } from './fruits';
import { berries } from './berries';
import { herbsGreens } from './herbs-greens';
import { mushrooms } from './mushrooms';
import { grain } from './grain';
import { nuts } from './nuts';
import { packaging } from './packaging';
import { animalFeed } from './animal-feed';
import { meat } from './meat';
import { fish } from './fish';
import { dairyProducts } from './dairy-products';
import { liveAnimalsPoultry } from './live-animals-poultry';
import { eggs } from './eggs';
import { seedsPlantingMaterial } from './seeds-planting-material';
import { agrochemicals } from './agrochemicals';
import { processedProducts } from './processed-products';
import { technicalRawMaterials } from './technical-raw-materials';
import { beekeepingProducts } from './beekeeping-products';
import { ornamentalPlants } from './ornamental-plants';
import { sparePartsForMachinery } from './spare-parts-for-machinery';
import { agriculturalMachinery } from './agricultural-machinery';
import { equipment } from './equipment';
import { agriculturalLandFacilities } from './agricultural-land-facilities';

export * from './types';

export const TAXONOMY: TaxCategory[] = [
  vegetables,
  fruits,
  berries,
  herbsGreens,
  mushrooms,
  grain,
  nuts,
  packaging,
  animalFeed,
  meat,
  fish,
  dairyProducts,
  liveAnimalsPoultry,
  eggs,
  seedsPlantingMaterial,
  agrochemicals,
  processedProducts,
  technicalRawMaterials,
  beekeepingProducts,
  ornamentalPlants,
  sparePartsForMachinery,
  agriculturalMachinery,
  equipment,
  agriculturalLandFacilities,
];

/** Node counts per level, for sync reporting and the taxonomy integrity test. */
export function taxonomyStats() {
  const perLevel: number[] = [TAXONOMY.length];
  const count = (nodes: TaxNode[], level: number) => {
    if (!nodes.length) return;
    perLevel[level] = (perLevel[level] ?? 0) + nodes.length;
    for (const node of nodes) count(node.children ?? [], level + 1);
  };
  for (const category of TAXONOMY) count(category.children, 1);
  return { perLevel, total: perLevel.reduce((a, b) => a + b, 0) };
}
