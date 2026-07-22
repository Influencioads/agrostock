import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Grain is the deepest category on the platform: rice, wheat, corn, barley, pulses and
 * oilseeds are traded against named grade codes, market classes and calibres, so the tree
 * runs to level 4 almost everywhere and to level 5 where lots genuinely change hands that
 * way (basmati sella colours, kabuli calibres, mung screen sizes, malting varieties).
 */
export const grain: TaxCategory = {
  name: 'Grain',
  emoji: '🌾',
  tint: TINT.sand,
  children: [
    {
      name: 'Broad beans',
      ru: 'Бобы',
      children: [
        {
          name: 'Dry whole faba beans',
          children: [
            {
              name: 'Baladi faba beans',
              children: [{ name: 'Baladi 7–8 mm' }, { name: 'Baladi 8–9 mm' }, { name: 'Baladi 9 mm and above' }],
            },
            {
              name: 'Chinese broad beans',
              children: [
                { name: 'Broad beans 16–18 mm' },
                { name: 'Broad beans 18–20 mm' },
                { name: 'Broad beans 20–22 mm' },
                { name: 'Broad beans 22–24 mm' },
              ],
            },
            { name: 'Aquadulce Claudia' },
            { name: 'Superaguadulce' },
            { name: 'Windsor broad beans' },
            { name: 'Vroma faba beans' },
          ],
        },
        {
          name: 'Split faba beans',
          children: [{ name: 'Split faba beans with hull' }, { name: 'Split dehulled faba beans' }],
        },
        { name: 'Dehulled faba bean kernels' },
        {
          name: 'Feed faba beans',
          children: [{ name: 'Small-seeded feed faba beans' }, { name: 'Coloured-flower feed faba beans' }],
        },
        { name: 'Faba bean hulls' },
      ],
    },
    {
      name: 'Peas',
      ru: 'Горох',
      children: [
        {
          name: 'Yellow peas',
          children: [
            {
              name: 'Whole yellow peas',
              children: [
                { name: 'Canada No.1 yellow peas' },
                { name: 'Canada No.2 yellow peas' },
                { name: 'Canada No.3 yellow peas' },
              ],
            },
            {
              name: 'Split yellow peas',
              children: [{ name: 'Machine-split yellow peas' }, { name: 'Polished split yellow peas' }],
            },
            { name: 'Yellow pea grits' },
          ],
        },
        {
          name: 'Green peas',
          children: [
            {
              name: 'Whole green peas',
              children: [
                { name: 'Canada No.1 green peas' },
                { name: 'Canada No.2 green peas' },
                { name: 'Canada No.3 green peas' },
              ],
            },
            { name: 'Split green peas' },
            { name: 'Wrinkled green peas' },
          ],
        },
        {
          name: 'Marrowfat peas',
          children: [{ name: 'Whole marrowfat peas' }, { name: 'Bleached marrowfat peas' }],
        },
        { name: 'Maple peas (dun peas)' },
        { name: 'Austrian winter peas' },
        { name: 'Blue peas' },
        {
          name: 'Feed peas',
          children: [{ name: 'Whole feed peas' }, { name: 'Pea screenings' }],
        },
      ],
    },
    {
      name: 'Buckwheat',
      ru: 'Гречиха',
      children: [
        {
          name: 'Common buckwheat',
          children: [
            { name: 'Buckwheat in husk' },
            {
              name: 'Hulled buckwheat kernels',
              children: [
                { name: 'Whole kernels (yadritsa)' },
                { name: 'Split kernels (prodel)' },
                { name: 'Buckwheat grits (smolenskaya)' },
              ],
            },
            { name: 'Roasted buckwheat kernels' },
            { name: 'Green (unroasted) buckwheat kernels' },
          ],
        },
        { name: 'Tartary buckwheat' },
        {
          name: 'Buckwheat flakes',
          children: [{ name: 'Rolled buckwheat flakes' }, { name: 'Instant buckwheat flakes' }],
        },
        { name: 'Buckwheat hulls' },
        { name: 'Feed-grade buckwheat' },
      ],
    },
    {
      name: 'Oilcake',
      ru: 'Жмых',
      children: [
        {
          name: 'Sunflower cake',
          children: [
            { name: 'Undecorticated sunflower cake' },
            { name: 'Partially decorticated sunflower cake' },
            { name: 'Decorticated sunflower cake' },
            { name: 'Pelleted sunflower cake' },
          ],
        },
        {
          name: 'Rapeseed cake',
          children: [
            { name: 'Cold-pressed rapeseed cake' },
            { name: 'Hot-pressed rapeseed cake' },
            { name: 'Double-low (00) rapeseed cake' },
          ],
        },
        {
          name: 'Soybean cake',
          children: [{ name: 'Full-fat soybean cake' }, { name: 'Toasted soybean cake' }, { name: 'Extruded soybean cake' }],
        },
        {
          name: 'Cottonseed cake',
          children: [{ name: 'Decorticated cottonseed cake' }, { name: 'Undecorticated cottonseed cake' }],
        },
        {
          name: 'Groundnut cake',
          children: [{ name: 'Decorticated groundnut cake' }, { name: 'Undecorticated groundnut cake' }],
        },
        {
          name: 'Mustard cake',
          children: [{ name: 'Cold-pressed mustard cake' }, { name: 'Expeller mustard cake' }],
        },
        { name: 'Linseed cake' },
        { name: 'Sesame cake' },
        { name: 'Camelina cake' },
        { name: 'Safflower cake' },
        { name: 'Corn germ cake' },
        { name: 'Palm kernel cake' },
        { name: 'Copra (coconut) cake' },
        { name: 'Hemp seed cake' },
        { name: 'Pumpkin seed cake' },
        {
          name: 'Castor cake',
          children: [{ name: 'Detoxified castor cake' }, { name: 'Fertilizer-grade castor cake' }],
        },
      ],
    },
    {
      name: 'Castor bean',
      ru: 'Клещевина',
      children: [
        {
          name: 'Castor seed',
          children: [
            { name: 'GCH-4 castor seed' },
            { name: 'GCH-5 castor seed' },
            { name: 'GCH-7 castor seed' },
            { name: 'DCS-9 castor seed' },
            { name: 'Aruna castor seed' },
            { name: 'Local (desi) castor seed' },
          ],
        },
        { name: 'Castor de-oiled cake' },
        { name: 'Castor hulls' },
        { name: 'Castor stalks' },
      ],
    },
    {
      name: 'Corn',
      ru: 'Кукуруза',
      children: [
        {
          name: 'Yellow dent corn',
          children: [
            {
              name: 'Food-grade yellow maize',
              children: [{ name: 'US No.1 Yellow Corn' }, { name: 'US No.2 Yellow Corn' }, { name: 'Milling-grade yellow maize' }],
            },
            {
              name: 'Feed-grade yellow maize',
              children: [
                { name: 'US No.3 Yellow Corn' },
                { name: 'US No.4 Yellow Corn' },
                { name: 'Feed maize class 3' },
                { name: 'Brazil Feed Grade 2 maize' },
              ],
            },
            { name: 'Starch and ethanol grade yellow maize' },
          ],
        },
        {
          name: 'White dent corn',
          children: [
            {
              name: 'Food-grade white maize',
              children: [
                { name: 'US No.1 White Corn' },
                { name: 'US No.2 White Corn' },
                { name: 'Grade WM1 white maize' },
                { name: 'Grade WM2 white maize' },
              ],
            },
            { name: 'Feed-grade white maize' },
            { name: 'Nixtamal (masa) grade white maize' },
          ],
        },
        {
          name: 'Flint corn',
          children: [{ name: 'Argentine flint maize' }, { name: 'Brazilian flint maize' }, { name: 'Cornflake-grade flint maize' }],
        },
        {
          name: 'Popcorn',
          children: [
            {
              name: 'Butterfly popcorn',
              children: [{ name: 'Yellow butterfly popcorn' }, { name: 'White butterfly popcorn' }],
            },
            {
              name: 'Mushroom popcorn',
              children: [{ name: 'Yellow mushroom popcorn' }, { name: 'Extra-large mushroom popcorn' }],
            },
            { name: 'Ladyfinger popcorn' },
            { name: 'Hulless popcorn' },
          ],
        },
        {
          name: 'Sweet corn kernels',
          children: [
            { name: 'Normal sugary (su) sweet corn' },
            { name: 'Sugary enhanced (se) sweet corn' },
            { name: 'Shrunken-2 (sh2) super sweet corn' },
          ],
        },
        {
          name: 'Waxy corn',
          children: [{ name: 'Waxy yellow maize' }, { name: 'Waxy white maize' }],
        },
        { name: 'Blue corn' },
        { name: 'High-amylose corn' },
        { name: 'High-oil corn' },
        {
          name: 'Corn by-products',
          children: [
            { name: 'Corn germ' },
            { name: 'Corn screenings' },
            { name: 'Broken maize' },
            { name: 'Maize cobs' },
          ],
        },
      ],
    },
    {
      name: 'Sesame',
      ru: 'Кунжут',
      children: [
        {
          name: 'White sesame seeds',
          children: [
            { name: 'Natural white sesame seeds' },
            { name: 'Machine-hulled white sesame seeds' },
            { name: 'Roasted white sesame seeds' },
          ],
        },
        {
          name: 'Black sesame seeds',
          children: [{ name: 'Natural black sesame seeds' }, { name: 'Hulled black sesame seeds' }, { name: 'Roasted black sesame seeds' }],
        },
        { name: 'Brown sesame seeds' },
        { name: 'Red sesame seeds' },
        {
          name: 'Crushing-grade sesame seeds',
          children: [{ name: 'Mixed crushing sesame' }, { name: 'Sesame seed screenings' }],
        },
      ],
    },
    {
      name: 'Lupine',
      ru: 'Люпин',
      children: [
        {
          name: 'Narrow-leafed (blue) lupin',
          children: [{ name: 'Sweet blue lupin' }, { name: 'Bitter blue lupin' }],
        },
        {
          name: 'White lupin',
          children: [{ name: 'Sweet white lupin' }, { name: 'Bitter white lupin' }],
        },
        { name: 'Yellow lupin' },
        { name: 'Andean lupin (tarwi)' },
        { name: 'Dehulled lupin kernels' },
        { name: 'Lupin flakes' },
        { name: 'Lupin hulls' },
      ],
    },
    {
      name: 'Flax',
      ru: 'Лён',
      children: [
        {
          name: 'Brown flaxseed',
          children: [
            { name: 'Canada No.1 flaxseed' },
            { name: 'Canada No.2 flaxseed' },
            { name: 'Crushing-grade brown flaxseed' },
            { name: 'Food-grade brown flaxseed' },
          ],
        },
        {
          name: 'Golden flaxseed',
          children: [{ name: 'Food-grade golden flaxseed' }, { name: 'Crushing-grade golden flaxseed' }],
        },
        { name: 'Solin (low-linolenic flaxseed)' },
        { name: 'Milled flaxseed' },
        {
          name: 'Flax fibre',
          children: [{ name: 'Long line flax fibre' }, { name: 'Scutched flax fibre' }, { name: 'Short flax fibre (tow)' }],
        },
        { name: 'Flax straw' },
        { name: 'Flax shives' },
      ],
    },
    {
      name: 'Flour',
      ru: 'Мука',
      children: [
        {
          name: 'Wheat flour',
          children: [
            { name: 'Highest grade wheat flour' },
            { name: 'First grade wheat flour' },
            { name: 'Second grade wheat flour' },
            { name: 'Wholemeal wheat flour' },
            { name: 'Maida (refined wheat flour)' },
            { name: 'Chakki atta' },
            { name: 'Strong bread flour' },
            { name: 'Pastry and biscuit flour' },
          ],
        },
        {
          name: 'Semolina',
          children: [{ name: 'Durum semolina' }, { name: 'Soft wheat semolina (sooji)' }, { name: 'Coarse rava' }],
        },
        {
          name: 'Rye flour',
          children: [{ name: 'Sifted rye flour' }, { name: 'Peeled (medium) rye flour' }, { name: 'Wholemeal rye flour' }],
        },
        {
          name: 'Maize flour',
          children: [{ name: 'Fine maize flour' }, { name: 'Coarse maize meal' }, { name: 'Masa harina' }],
        },
        {
          name: 'Rice flour',
          children: [{ name: 'White rice flour' }, { name: 'Brown rice flour' }, { name: 'Glutinous rice flour' }],
        },
        {
          name: 'Chickpea flour',
          children: [{ name: 'Besan (desi gram flour)' }, { name: 'Kabuli chickpea flour' }],
        },
        {
          name: 'Soy flour',
          children: [{ name: 'Full-fat soy flour' }, { name: 'Defatted soy flour' }, { name: 'Toasted soy flour' }],
        },
        { name: 'Buckwheat flour' },
        { name: 'Oat flour' },
        { name: 'Barley flour' },
        { name: 'Millet flour' },
        { name: 'Sorghum flour' },
        { name: 'Pea flour' },
        { name: 'Lentil flour' },
        { name: 'Triticale flour' },
        { name: 'Feed-grade flour' },
      ],
    },
    {
      name: 'Chickpea',
      ru: 'Нут',
      children: [
        {
          name: 'Kabuli chickpeas',
          children: [
            {
              name: 'Bold kabuli chickpeas',
              children: [{ name: 'Kabuli 10 mm' }, { name: 'Kabuli 11 mm' }, { name: 'Kabuli 12 mm' }],
            },
            {
              name: 'Medium kabuli chickpeas',
              children: [{ name: 'Kabuli 7 mm' }, { name: 'Kabuli 8 mm' }, { name: 'Kabuli 9 mm' }],
            },
            {
              name: 'Small kabuli chickpeas',
              children: [{ name: 'Kabuli 5 mm' }, { name: 'Kabuli 6 mm' }],
            },
            { name: 'Split kabuli chickpeas' },
            { name: 'Roasted kabuli chickpeas' },
          ],
        },
        {
          name: 'Desi chickpeas',
          children: [
            {
              name: 'Brown desi chickpeas',
              children: [{ name: 'Desi 6 mm' }, { name: 'Desi 7 mm' }, { name: 'Desi 8 mm' }],
            },
            { name: 'Kala chana (black desi)' },
            { name: 'Green desi chickpeas (hara chana)' },
            {
              name: 'Chana dal (split desi)',
              children: [{ name: 'Medium chana dal' }, { name: 'Bold chana dal' }],
            },
            { name: 'Dehulled desi chickpeas' },
          ],
        },
        { name: 'Dollar chana' },
        { name: 'Chickpea splits and brokens' },
      ],
    },
    {
      name: 'Oats',
      ru: 'Овёс',
      children: [
        {
          name: 'Milling oats',
          children: [
            { name: 'Canada No.1 CW oats' },
            { name: 'Canada No.2 CW oats' },
            { name: 'US No.1 Heavy White Oats' },
            { name: 'US No.2 White Oats' },
          ],
        },
        {
          name: 'Feed oats',
          children: [{ name: 'Whole feed oats' }, { name: 'Oat screenings' }],
        },
        { name: 'Hulless (naked) oats' },
        { name: 'Black oats' },
        {
          name: 'Oat groats',
          children: [{ name: 'Whole oat groats' }, { name: 'Steel-cut oat groats' }],
        },
        {
          name: 'Oat flakes',
          children: [
            { name: 'Jumbo rolled oats' },
            { name: 'Regular rolled oats' },
            { name: 'Quick-cooking oat flakes' },
            { name: 'Instant oat flakes' },
          ],
        },
        { name: 'Oat bran' },
        { name: 'Oat hulls' },
      ],
    },
    {
      name: 'Sunflower',
      ru: 'Подсолнечник',
      children: [
        {
          name: 'Oil-type sunflower seed',
          children: [
            { name: 'Linoleic sunflower seed' },
            { name: 'High-oleic sunflower seed' },
            { name: 'Mid-oleic (NuSun) sunflower seed' },
            { name: 'Black oil sunflower seed' },
          ],
        },
        {
          name: 'Confectionery sunflower seed',
          children: [
            {
              name: 'Sunflower seed 361',
              children: [{ name: '361 seed 20/64 inch' }, { name: '361 seed 22/64 inch' }, { name: '361 seed 24/64 inch' }],
            },
            {
              name: 'Sunflower seed 363',
              children: [{ name: '363 seed 20/64 inch' }, { name: '363 seed 22/64 inch' }, { name: '363 seed 24/64 inch' }],
            },
            {
              name: 'Sunflower seed 5009',
              children: [{ name: '5009 seed 22/64 inch' }, { name: '5009 seed 24/64 inch' }],
            },
            { name: 'Sunflower seed 601' },
            { name: 'Sunflower seed 909' },
            { name: 'Striped confectionery sunflower seed' },
          ],
        },
        {
          name: 'Sunflower kernels',
          children: [
            { name: 'Confectionery grade sunflower kernels' },
            { name: 'Bakery grade sunflower kernels' },
            { name: 'Roasted sunflower kernels' },
            { name: 'Broken sunflower kernels' },
          ],
        },
        { name: 'Birdfeed sunflower seed' },
        { name: 'Sunflower hulls' },
      ],
    },
    {
      name: 'Millet',
      ru: 'Просо',
      children: [
        {
          name: 'Proso millet',
          children: [
            { name: 'Yellow proso millet' },
            { name: 'Red proso millet' },
            { name: 'White proso millet' },
            { name: 'Hulled proso millet groats' },
          ],
        },
        {
          name: 'Pearl millet (bajra)',
          children: [{ name: 'Grey pearl millet' }, { name: 'Yellow pearl millet' }, { name: 'Feed-grade pearl millet' }],
        },
        {
          name: 'Foxtail millet',
          children: [{ name: 'Yellow foxtail millet' }, { name: 'White foxtail millet' }],
        },
        {
          name: 'Finger millet (ragi)',
          children: [{ name: 'Red finger millet' }, { name: 'White finger millet' }],
        },
        { name: 'Barnyard millet' },
        { name: 'Kodo millet' },
        { name: 'Little millet' },
        { name: 'Browntop millet' },
        { name: 'Japanese millet' },
        { name: 'Birdseed millet' },
      ],
    },
    {
      name: 'Wheat',
      ru: 'Пшеница',
      children: [
        {
          name: 'Hard red winter wheat',
          children: [
            { name: 'US No.1 HRW' },
            { name: 'US No.2 HRW' },
            { name: 'US No.3 HRW' },
            { name: 'Ordinary protein HRW' },
          ],
        },
        {
          name: 'Hard red spring wheat',
          children: [
            { name: 'US No.1 Dark Northern Spring' },
            { name: 'US No.2 Dark Northern Spring' },
            { name: 'US No.2 Northern Spring' },
            { name: 'CWRS No.1' },
            { name: 'CWRS No.2' },
            { name: 'CWRS No.3' },
          ],
        },
        {
          name: 'Soft red winter wheat',
          children: [{ name: 'US No.1 SRW' }, { name: 'US No.2 SRW' }],
        },
        {
          name: 'Soft white wheat',
          children: [
            { name: 'US No.1 Soft White' },
            { name: 'US No.2 Soft White' },
            { name: 'Western White' },
            { name: 'White Club wheat' },
          ],
        },
        {
          name: 'Hard white wheat',
          children: [{ name: 'US No.1 Hard White' }, { name: 'US No.2 Hard White' }],
        },
        {
          name: 'Durum wheat',
          children: [
            { name: 'CWAD No.1' },
            { name: 'CWAD No.2' },
            { name: 'CWAD No.3' },
            { name: 'US No.1 Hard Amber Durum' },
            { name: 'US No.2 Hard Amber Durum' },
            { name: 'Desert Durum' },
          ],
        },
        {
          name: 'Milling wheat (GOST classes)',
          children: [{ name: 'Class 2 milling wheat' }, { name: 'Class 3 milling wheat' }, { name: 'Class 4 milling wheat' }],
        },
        {
          name: 'Feed wheat',
          children: [{ name: 'Class 5 feed wheat' }, { name: 'US No.4 wheat' }, { name: 'Sprout-damaged feed wheat' }],
        },
        {
          name: 'Ancient wheats',
          children: [
            { name: 'Spelt' },
            { name: 'Emmer (farro)' },
            { name: 'Einkorn' },
            { name: 'Khorasan (Kamut) wheat' },
          ],
        },
        {
          name: 'Wheat milling by-products',
          children: [{ name: 'Wheat bran' }, { name: 'Wheat middlings' }, { name: 'Wheat germ' }, { name: 'Wheat screenings' }],
        },
      ],
    },
    {
      name: 'Rapeseed',
      ru: 'Рапс',
      children: [
        {
          name: 'Canola (double-low rapeseed)',
          children: [
            { name: 'Canada No.1 Canola' },
            { name: 'Canada No.2 Canola' },
            { name: 'Winter canola' },
            { name: 'Spring canola' },
            { name: 'High-oleic canola' },
          ],
        },
        {
          name: 'High-erucic acid rapeseed (HEAR)',
          children: [{ name: 'Industrial HEAR seed' }, { name: 'Erucamide-grade HEAR seed' }],
        },
        { name: 'Yellow-seeded rapeseed' },
        { name: 'Black-seeded rapeseed' },
        { name: 'Rapeseed screenings' },
      ],
    },
    {
      name: 'Rice',
      ru: 'Рис',
      children: [
        {
          name: 'Basmati rice',
          children: [
            {
              name: '1121 Sella basmati',
              children: [{ name: 'Golden Sella 1121' }, { name: 'Creamy Sella 1121' }, { name: 'White Sella 1121' }],
            },
            { name: '1121 Steam basmati' },
            { name: '1121 Raw basmati' },
            {
              name: '1509 basmati',
              children: [{ name: '1509 Golden Sella' }, { name: '1509 Creamy Sella' }, { name: '1509 Steam' }, { name: '1509 Raw' }],
            },
            {
              name: 'Pusa basmati (1401)',
              children: [{ name: 'Pusa Golden Sella' }, { name: 'Pusa Creamy Sella' }, { name: 'Pusa Steam' }, { name: 'Pusa Raw' }],
            },
            {
              name: 'Sharbati basmati',
              children: [{ name: 'Sharbati Golden Sella' }, { name: 'Sharbati Steam' }, { name: 'Sharbati Raw' }],
            },
            {
              name: 'Sugandha basmati',
              children: [{ name: 'Sugandha Golden Sella' }, { name: 'Sugandha Steam' }, { name: 'Sugandha Raw' }],
            },
            {
              name: 'Traditional basmati',
              children: [{ name: 'Traditional Sella' }, { name: 'Traditional Steam' }, { name: 'Traditional Raw' }],
            },
            {
              name: 'Super Kernel basmati',
              children: [{ name: 'Super Kernel Sella' }, { name: 'Super Kernel Steam' }, { name: 'Super Kernel White' }],
            },
            { name: 'Brown basmati rice' },
          ],
        },
        {
          name: 'Non-basmati rice',
          children: [
            {
              name: 'Sona Masoori',
              children: [{ name: 'Sona Masoori raw' }, { name: 'Sona Masoori steam' }, { name: 'Sona Masoori parboiled' }],
            },
            {
              name: 'IR64',
              children: [{ name: 'IR64 5% broken' }, { name: 'IR64 25% broken' }, { name: 'IR64 parboiled' }],
            },
            {
              name: 'Swarna (MTU 7029)',
              children: [{ name: 'Swarna raw' }, { name: 'Swarna parboiled' }],
            },
            {
              name: 'Ponni',
              children: [{ name: 'Ponni raw' }, { name: 'Ponni boiled' }, { name: 'Ponni steam' }],
            },
            { name: 'Samba Masuri (BPT 5204)' },
            { name: 'PR11 long grain' },
            { name: 'PR106 long grain' },
            { name: 'Kolam rice' },
            { name: 'Sharbati non-basmati' },
          ],
        },
        {
          name: 'Long grain white rice',
          children: [
            { name: 'White rice 5% broken' },
            { name: 'White rice 10% broken' },
            { name: 'White rice 15% broken' },
            { name: 'White rice 25% broken' },
            { name: 'White rice 100% broken' },
          ],
        },
        {
          name: 'Parboiled rice',
          children: [
            { name: 'Parboiled rice 5% broken' },
            { name: 'Parboiled rice 10% broken' },
            { name: 'Parboiled rice 25% broken' },
            { name: 'Golden parboiled rice' },
            { name: 'Creamy parboiled rice' },
            { name: 'Idli rice' },
          ],
        },
        {
          name: 'Brown rice',
          children: [
            { name: 'Long grain brown rice' },
            { name: 'Medium grain brown rice' },
            { name: 'Short grain brown rice' },
            { name: 'Germinated brown rice (GABA)' },
          ],
        },
        {
          name: 'Aromatic rice',
          children: [
            { name: 'Thai Hom Mali jasmine rice' },
            { name: 'Pathumthani fragrant rice' },
            { name: 'Ambemohar' },
            { name: 'Kalanamak' },
            { name: 'Gobindobhog' },
            { name: 'Jeerakasala (jeera rice)' },
            { name: 'Seeraga samba' },
            { name: 'Chinigura' },
          ],
        },
        {
          name: 'Medium and short grain rice',
          children: [
            { name: 'Japonica rice' },
            { name: 'Calrose rice' },
            { name: 'Arborio rice' },
            { name: 'Carnaroli rice' },
            { name: 'Bomba rice' },
            { name: 'Koshihikari sushi rice' },
            { name: 'Camolino rice' },
          ],
        },
        {
          name: 'Glutinous rice',
          children: [{ name: 'White glutinous rice' }, { name: 'Black glutinous rice' }, { name: 'Long grain glutinous rice' }],
        },
        {
          name: 'Specialty coloured rice',
          children: [
            { name: 'Red rice' },
            { name: 'Black (forbidden) rice' },
            { name: 'Purple rice' },
            { name: 'Matta (rosematta) rice' },
            { name: 'Wild rice' },
          ],
        },
        {
          name: 'Broken rice',
          children: [
            { name: 'A1 Super broken rice' },
            { name: 'A1 Special broken rice' },
            { name: 'C9 broken rice' },
            { name: 'Basmati Tibar' },
            { name: 'Basmati Dubar' },
            { name: 'Basmati Mongra' },
            { name: 'Brewers rice' },
          ],
        },
        {
          name: 'Paddy (rough rice)',
          children: [
            { name: 'Long grain paddy' },
            { name: 'Medium grain paddy' },
            { name: 'Basmati paddy' },
            { name: 'Hybrid paddy' },
          ],
        },
        {
          name: 'Rice by-products',
          children: [
            { name: 'Rice bran' },
            { name: 'De-oiled rice bran' },
            { name: 'Rice husk' },
            { name: 'Rice germ' },
          ],
        },
      ],
    },
    {
      name: 'Rye',
      ru: 'Рожь',
      children: [
        {
          name: 'Milling rye',
          children: [
            { name: 'Rye class 1' },
            { name: 'Rye class 2' },
            { name: 'Rye class 3' },
            { name: 'US No.2 Rye' },
          ],
        },
        { name: 'Feed rye' },
        { name: 'Hybrid rye' },
        { name: 'Winter rye' },
        { name: 'Spring rye' },
        {
          name: 'Rye malt',
          children: [{ name: 'Fermented rye malt' }, { name: 'Unfermented rye malt' }],
        },
        { name: 'Rye flakes' },
        { name: 'Rye bran' },
      ],
    },
    {
      name: 'Sorghum',
      ru: 'Сорго',
      children: [
        {
          name: 'Grain sorghum (milo)',
          children: [
            { name: 'US No.2 Yellow Sorghum' },
            { name: 'US No.3 Yellow Sorghum' },
            { name: 'White grain sorghum' },
            { name: 'Red grain sorghum' },
            { name: 'Bronze grain sorghum' },
            { name: 'Tannin-free food-grade sorghum' },
          ],
        },
        {
          name: 'Forage sorghum',
          children: [{ name: 'Sorghum-sudangrass hybrid' }, { name: 'Sudan grass' }, { name: 'Brown midrib forage sorghum' }],
        },
        { name: 'Sweet sorghum' },
        { name: 'Broomcorn sorghum' },
        { name: 'Sorghum flakes' },
      ],
    },
    {
      name: 'Soybean',
      ru: 'Соя',
      children: [
        {
          name: 'Yellow soybeans',
          children: [
            { name: 'US No.1 Yellow Soybeans' },
            { name: 'US No.2 Yellow Soybeans' },
            { name: 'Crushing-grade soybeans' },
            { name: 'Tofu-grade soybeans' },
            { name: 'Soymilk-grade soybeans' },
            { name: 'Natto (small-seeded) soybeans' },
          ],
        },
        { name: 'Black soybeans' },
        { name: 'Green soybeans' },
        { name: 'Brown soybeans' },
        {
          name: 'Processed soybeans',
          children: [
            { name: 'Toasted full-fat soybeans' },
            { name: 'Extruded soybeans' },
            { name: 'Dehulled soybean splits' },
            { name: 'Soybean flakes' },
          ],
        },
        { name: 'Soybean hulls' },
      ],
    },
    {
      name: 'Triticale',
      ru: 'Тритикале',
      children: [
        { name: 'Winter triticale' },
        { name: 'Spring triticale' },
        { name: 'Milling triticale' },
        { name: 'Feed triticale' },
        { name: 'Distilling triticale' },
        { name: 'Triticale flakes' },
      ],
    },
    {
      name: 'Beans',
      ru: 'Фасоль',
      children: [
        {
          name: 'Kidney beans',
          children: [
            { name: 'Dark red kidney beans' },
            { name: 'Light red kidney beans' },
            { name: 'White kidney beans (cannellini)' },
            { name: 'Speckled kidney beans (chitra rajma)' },
            { name: 'Jammu rajma' },
          ],
        },
        {
          name: 'Mung beans (green gram)',
          children: [
            {
              name: 'Whole green mung beans',
              children: [{ name: 'Mung 2.8 mm' }, { name: 'Mung 3.0 mm' }, { name: 'Mung 3.2 mm' }, { name: 'Mung 3.5 mm' }],
            },
            { name: 'Split mung with skin (chilka moong dal)' },
            { name: 'Split dehulled mung (moong dal)' },
            { name: 'Sprouting-grade mung beans' },
          ],
        },
        {
          name: 'Black gram (urad)',
          children: [
            { name: 'Whole urad (black matpe)' },
            { name: 'Split urad with skin' },
            { name: 'Urad dal (split dehulled)' },
            { name: 'Urad gota (whole dehulled)' },
          ],
        },
        {
          name: 'Cowpeas',
          children: [
            { name: 'Black-eyed peas' },
            { name: 'Brown cowpeas' },
            { name: 'Red cowpeas' },
            { name: 'White cowpeas' },
          ],
        },
        {
          name: 'Lima beans',
          children: [{ name: 'Large lima beans' }, { name: 'Baby lima beans' }],
        },
        {
          name: 'Adzuki beans',
          children: [{ name: 'Red adzuki beans' }, { name: 'Erimo adzuki beans' }],
        },
        { name: 'Navy (pea) beans' },
        { name: 'Pinto beans' },
        { name: 'Black turtle beans' },
        { name: 'Great northern beans' },
        { name: 'Cranberry (borlotti) beans' },
        { name: 'Small red beans' },
        { name: 'Pink beans' },
        { name: 'Speckled sugar beans' },
        { name: 'Moth beans (matki)' },
        { name: 'Rice beans' },
        { name: 'Horse gram (kulthi)' },
        { name: 'Bean splits and brokens' },
      ],
    },
    {
      name: 'Fodder',
      ru: 'Фураж',
      children: [
        {
          name: 'Fodder wheat',
          children: [{ name: 'Class 5 fodder wheat' }, { name: 'Sprouted fodder wheat' }, { name: 'Frost-damaged fodder wheat' }],
        },
        {
          name: 'Fodder barley',
          children: [{ name: 'Two-row fodder barley' }, { name: 'Six-row fodder barley' }],
        },
        { name: 'Fodder maize' },
        { name: 'Fodder oats' },
        { name: 'Fodder rye' },
        { name: 'Fodder triticale' },
        { name: 'Fodder peas' },
        { name: 'Fodder sorghum' },
        { name: 'Fodder millet' },
        {
          name: 'Grain screenings',
          children: [{ name: 'Cereal screenings' }, { name: 'Pulse screenings' }, { name: 'Oilseed screenings' }],
        },
        { name: 'Off-grade grain' },
      ],
    },
    {
      name: 'Lentil',
      ru: 'Чечевица',
      children: [
        {
          name: 'Red lentils',
          children: [
            { name: 'Small red lentils (Crimson)' },
            { name: 'Large red lentils' },
            { name: 'Football lentils (whole dehulled)' },
            {
              name: 'Split red lentils',
              children: [{ name: 'Masoor dal (split with hull)' }, { name: 'Malka masoor (split dehulled)' }],
            },
          ],
        },
        {
          name: 'Green lentils',
          children: [
            { name: 'Large green lentils (Laird)' },
            { name: 'Medium green lentils (Richlea)' },
            { name: 'Small green lentils (Eston)' },
            { name: 'French green lentils (Du Puy)' },
            { name: 'Split green lentils' },
          ],
        },
        {
          name: 'Brown lentils',
          children: [
            { name: 'Spanish brown lentils (Pardina)' },
            { name: 'Indian brown lentils' },
            { name: 'Split brown lentils' },
          ],
        },
        { name: 'Black lentils (Beluga)' },
        {
          name: 'Yellow lentils',
          children: [{ name: 'Whole yellow lentils' }, { name: 'Split yellow lentils' }],
        },
        { name: 'Lentil splits and brokens' },
      ],
    },
    {
      name: 'Meal',
      ru: 'Шрот',
      children: [
        {
          name: 'Soybean meal',
          children: [
            { name: 'Hi-pro dehulled soybean meal' },
            { name: 'Standard soybean meal' },
            { name: 'Pelleted soybean meal' },
          ],
        },
        {
          name: 'Sunflower meal',
          children: [
            { name: 'Undecorticated sunflower meal' },
            { name: 'Partially decorticated sunflower meal' },
            { name: 'Hi-pro decorticated sunflower meal' },
            { name: 'Pelleted sunflower meal' },
          ],
        },
        {
          name: 'Rapeseed meal',
          children: [{ name: 'Canola meal' }, { name: 'Double-low rapeseed meal' }, { name: 'Pelleted rapeseed meal' }],
        },
        {
          name: 'Cottonseed meal',
          children: [{ name: 'Decorticated cottonseed meal' }, { name: 'Undecorticated cottonseed meal' }],
        },
        {
          name: 'Corn milling meals',
          children: [{ name: 'Corn gluten meal' }, { name: 'Corn gluten feed' }, { name: 'Corn germ meal' }],
        },
        { name: 'Groundnut meal' },
        { name: 'Linseed meal' },
        { name: 'Sesame meal' },
        { name: 'Mustard meal' },
        { name: 'Camelina meal' },
        { name: 'Palm kernel meal' },
        { name: 'Copra meal' },
        { name: 'De-oiled rice bran' },
        { name: 'Guar korma' },
      ],
    },
    {
      name: 'Barley',
      ru: 'Ячмень',
      children: [
        {
          name: 'Malting barley',
          children: [
            {
              name: 'Two-row spring malting barley',
              children: [
                { name: 'RGT Planet' },
                { name: 'Laureate' },
                { name: 'Propino' },
                { name: 'Concerto' },
                { name: 'Scarlett' },
              ],
            },
            {
              name: 'Two-row winter malting barley',
              children: [{ name: 'Flagon' }, { name: 'Craft' }, { name: 'Electrum' }],
            },
            {
              name: 'Six-row malting barley',
              children: [{ name: 'Etincel' }, { name: 'Tradition' }, { name: 'Robust' }],
            },
            { name: 'CW Select Two-Row malting barley' },
          ],
        },
        {
          name: 'Feed barley',
          children: [
            { name: 'Two-row feed barley' },
            { name: 'Six-row feed barley' },
            { name: 'US No.2 Feed Barley' },
            { name: 'Hulless feed barley' },
          ],
        },
        {
          name: 'Food barley',
          children: [
            { name: 'Pearled barley' },
            { name: 'Pot barley' },
            { name: 'Barley groats' },
            { name: 'Barley flakes' },
            { name: 'Hulless food barley' },
          ],
        },
        {
          name: 'Barley malt',
          children: [
            { name: 'Pilsner malt' },
            { name: 'Pale ale malt' },
            { name: 'Vienna malt' },
            { name: 'Munich malt' },
            { name: 'Caramel (crystal) malt' },
            { name: 'Chocolate malt' },
            { name: 'Roasted barley' },
          ],
        },
        { name: 'Black barley' },
        { name: 'Naked (hulless) barley' },
      ],
    },
  ],
};
