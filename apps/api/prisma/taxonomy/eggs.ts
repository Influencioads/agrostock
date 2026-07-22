import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Eggs splits table lots from hatching lots (hatching is its own level-2 node, so breed
 * and hybrid lines live there). Chicken eggs go to level 4 on shell colour × weight grade
 * and on the production systems that trade as separate lots (cage, barn, free-range);
 * hatching eggs go to level 4 on the actual commercial hybrid lines buyers order by name.
 */
export const eggs: TaxCategory = {
  name: 'Eggs',
  emoji: '🥚',
  tint: TINT.sand,
  children: [
    {
      name: 'Goose eggs',
      ru: 'Гусиное яйцо',
      children: [
        {
          name: 'Table goose eggs',
          children: [
            { name: 'Weight 140–160 g' },
            { name: 'Weight 160–180 g' },
            { name: 'Weight 180 g and above' },
          ],
        },
        { name: 'Blown & decorative goose eggshells' },
      ],
    },
    {
      name: 'Hatching eggs',
      ru: 'Инкубационное яйцо',
      children: [
        {
          name: 'Broiler hatching eggs',
          children: [
            { name: 'Cobb 500' },
            { name: 'Ross 308' },
            { name: 'Ross 708' },
            { name: 'Arbor Acres Plus' },
            { name: 'Hubbard Flex' },
            { name: 'Indian River' },
          ],
        },
        {
          name: 'Layer hatching eggs',
          children: [
            { name: 'Lohmann Brown Classic' },
            { name: 'Lohmann LSL Classic' },
            { name: 'Hy-Line Brown' },
            { name: 'Hy-Line W-36' },
            { name: 'ISA Brown' },
            { name: 'Bovans White' },
            { name: 'Dekalb White' },
            { name: 'Novogen Brown' },
          ],
        },
        {
          name: 'Dual-purpose & native breed hatching eggs',
          children: [
            { name: 'Rhode Island Red' },
            { name: 'Plymouth Rock' },
            { name: 'Sussex' },
            { name: 'Australorp' },
            { name: 'Kadaknath' },
            { name: 'Aseel' },
            { name: 'Giriraja' },
            { name: 'Vanaraja' },
            { name: 'Sonali' },
          ],
        },
        {
          name: 'Turkey hatching eggs',
          children: [{ name: 'B.U.T. 6' }, { name: 'Hybrid Converter' }, { name: 'Nicholas Select' }],
        },
        {
          name: 'Duck hatching eggs',
          children: [
            { name: 'Cherry Valley Pekin' },
            { name: 'Muscovy' },
            { name: 'Khaki Campbell' },
            { name: 'Indian Runner' },
          ],
        },
        {
          name: 'Goose hatching eggs',
          children: [
            { name: 'Landes' },
            { name: 'Rhine' },
            { name: 'Kholmogory' },
            { name: 'Toulouse' },
            { name: 'Embden' },
            { name: 'Hungarian White' },
          ],
        },
        {
          name: 'Quail hatching eggs',
          children: [
            { name: 'Japanese Coturnix' },
            { name: 'Pharaoh' },
            { name: 'Texas A&M White' },
            { name: 'Manchurian Golden' },
          ],
        },
        {
          name: 'Guinea fowl hatching eggs',
          children: [{ name: 'Pearl grey' }, { name: 'White guinea fowl' }, { name: 'Lavender guinea fowl' }],
        },
        {
          name: 'Ostrich hatching eggs',
          children: [{ name: 'African Black' }, { name: 'Blue Neck' }, { name: 'Red Neck' }],
        },
      ],
    },
    {
      name: 'Turkey eggs',
      ru: 'Индюшиное яйцо',
      children: [
        {
          name: 'Table turkey eggs',
          children: [
            { name: 'Weight 70–80 g' },
            { name: 'Weight 80–90 g' },
            { name: 'Weight 90 g and above' },
          ],
        },
        { name: 'Decorative turkey eggshells' },
      ],
    },
    {
      name: 'Chicken eggs',
      ru: 'Куриное яйцо',
      children: [
        {
          name: 'White-shell table eggs',
          children: [
            { name: 'Jumbo — 73 g and above' },
            { name: 'XL — 63–73 g' },
            { name: 'L — 53–63 g' },
            { name: 'M — 43–53 g' },
            { name: 'S — under 43 g' },
            { name: 'Peewee pullet eggs' },
          ],
        },
        {
          name: 'Brown-shell table eggs',
          children: [
            { name: 'Jumbo — 73 g and above' },
            { name: 'XL — 63–73 g' },
            { name: 'L — 53–63 g' },
            { name: 'M — 43–53 g' },
            { name: 'S — under 43 g' },
            { name: 'Peewee pullet eggs' },
          ],
        },
        {
          name: 'Speciality-shell table eggs',
          children: [
            { name: 'Cream & tinted shell eggs' },
            { name: 'Blue shell eggs (Araucana)' },
            { name: 'Olive-green shell eggs' },
            { name: 'Dark-brown Marans eggs' },
          ],
        },
        {
          name: 'Production-system lots',
          children: [
            { name: 'Conventional cage eggs' },
            { name: 'Enriched-colony cage eggs' },
            { name: 'Barn (cage-free) eggs' },
            { name: 'Free-range eggs' },
            { name: 'Pasture-raised eggs' },
          ],
        },
        {
          name: 'Nutritionally enriched eggs',
          children: [
            { name: 'Omega-3 enriched eggs' },
            { name: 'Selenium-enriched eggs' },
            { name: 'Vitamin-D enriched eggs' },
            { name: 'Low-cholesterol eggs' },
          ],
        },
        {
          name: 'Boiled & processed chicken eggs',
          children: [
            { name: 'Hard-boiled peeled eggs' },
            { name: 'Liquid whole egg' },
            { name: 'Liquid egg white' },
            { name: 'Liquid egg yolk' },
            { name: 'Whole egg powder' },
            { name: 'Egg white powder' },
            { name: 'Egg yolk powder' },
            { name: 'Frozen egg melange' },
          ],
        },
        {
          name: 'Industrial-grade shell eggs',
          children: [{ name: 'Grade B eggs (checks)' }, { name: 'Breaker-stock eggs' }],
        },
      ],
    },
    {
      name: 'Quail eggs',
      ru: 'Перепелиное яйцо',
      children: [
        {
          name: 'Fresh quail eggs',
          children: [
            { name: 'Weight 9–10 g' },
            { name: 'Weight 10–12 g' },
            { name: 'Weight 12–14 g' },
          ],
        },
        { name: 'Boiled & peeled quail eggs' },
        { name: 'Canned quail eggs in brine' },
        { name: 'Pickled quail eggs' },
        { name: 'Quail egg powder' },
      ],
    },
    {
      name: 'Ostrich eggs',
      ru: 'Страусиное яйцо',
      children: [
        { name: 'Fresh table ostrich eggs' },
        { name: 'Blown ostrich eggshells' },
        { name: 'Carved & painted ostrich eggshells' },
      ],
    },
    {
      name: 'Duck eggs',
      ru: 'Утиное яйцо',
      children: [
        {
          name: 'Fresh table duck eggs',
          children: [
            { name: 'Weight 60–70 g' },
            { name: 'Weight 70–80 g' },
            { name: 'Weight 80 g and above' },
          ],
        },
        { name: 'Salted duck eggs' },
        { name: 'Salted duck egg yolks' },
        { name: 'Century (preserved) duck eggs' },
        { name: 'Balut' },
      ],
    },
    {
      name: 'Guinea fowl eggs',
      ru: 'Цесарское яйцо',
      children: [{ name: 'Fresh table guinea fowl eggs' }, { name: 'Decorative guinea fowl eggshells' }],
    },
  ],
};
