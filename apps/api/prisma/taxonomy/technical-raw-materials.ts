import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Technical raw materials run 4 levels deep, and 5 wherever lots genuinely trade on a
 * measured band — wool micron ranges, down fill power and natural-casing calibres — since
 * those bands, not the species alone, are what a tannery, spinner or sausage plant buys against.
 */
export const technicalRawMaterials: TaxCategory = {
  name: 'Technical raw materials',
  emoji: '🧵',
  tint: TINT.sky,
  children: [
    {
      name: 'Fur',
      ru: 'Мех',
      children: [
        {
          name: 'Mink pelts',
          children: [
            { name: 'Black (Scanblack) mink' },
            { name: 'Mahogany mink' },
            { name: 'Brown (Scanbrown) mink' },
            { name: 'Sapphire mink' },
            { name: 'Pearl mink' },
            { name: 'White (Scanwhite) mink' },
          ],
        },
        {
          name: 'Fox pelts',
          children: [
            { name: 'Silver fox' },
            { name: 'Blue (arctic) fox' },
            { name: 'Shadow fox' },
            { name: 'Red fox' },
            { name: 'Golden Island fox' },
          ],
        },
        {
          name: 'Sable & marten pelts',
          children: [{ name: 'Barguzin sable' }, { name: 'Yenisei sable' }, { name: 'Stone marten' }, { name: 'Pine marten' }],
        },
        {
          name: 'Karakul lambskin',
          children: [{ name: 'Karakul flat (broadtail)' }, { name: 'Persian lamb curl' }, { name: 'Swakara pelt' }],
        },
        {
          name: 'Sheepskin & shearling',
          children: [
            { name: 'Double-face shearling' },
            { name: 'Toscana shearling' },
            { name: 'Merino shearling' },
            { name: 'Mouton (sheared) sheepskin' },
          ],
        },
        {
          name: 'Rabbit pelts',
          children: [{ name: 'Rex rabbit skin' }, { name: 'White rabbit skin' }, { name: 'Sheared rabbit plate' }],
        },
        { name: 'Chinchilla pelts' },
        { name: 'Raccoon dog (finnraccoon) pelts' },
        { name: 'Muskrat pelts' },
        { name: 'Nutria (coypu) pelts' },
        { name: 'Squirrel pelts' },
        { name: 'Lynx & wildcat pelts' },
        {
          name: 'Fur plates & trimmings',
          children: [
            { name: 'Dressed fur plates' },
            { name: 'Fur strips & bandings' },
            { name: 'Tails & paws' },
            { name: 'Fur cutting scraps' },
          ],
        },
        {
          name: 'Dressed & dyed fur',
          children: [{ name: 'Dressed natural-colour fur' }, { name: 'Dyed fur' }, { name: 'Sheared & plucked fur' }],
        },
      ],
    },
    {
      name: 'Natural casings',
      ru: 'Натуральные оболочки',
      children: [
        {
          name: 'Hog casings',
          children: [
            {
              name: 'Hog rounds (small intestine)',
              children: [
                { name: 'Hog rounds 28/30 mm' },
                { name: 'Hog rounds 30/32 mm' },
                { name: 'Hog rounds 32/34 mm' },
                { name: 'Hog rounds 34/36 mm' },
                { name: 'Hog rounds 36/38 mm' },
                { name: 'Hog rounds 38/40 mm' },
                { name: 'Hog rounds 40/42 mm' },
                { name: 'Hog rounds 42+ mm' },
              ],
            },
            {
              name: 'Hog middles (chitterlings)',
              children: [{ name: 'Hog middles 50/55 mm' }, { name: 'Hog middles 55/60 mm' }, { name: 'Hog middles 60+ mm' }],
            },
            { name: 'Hog bungs' },
            { name: 'Hog caps (stomachs)' },
            { name: 'Hog bladders' },
            { name: 'Hog casing sets (tubed)' },
          ],
        },
        {
          name: 'Sheep casings',
          children: [
            {
              name: 'Sheep rounds',
              children: [
                { name: 'Sheep rounds 16/18 mm' },
                { name: 'Sheep rounds 18/20 mm' },
                { name: 'Sheep rounds 20/22 mm' },
                { name: 'Sheep rounds 22/24 mm' },
                { name: 'Sheep rounds 24/26 mm' },
                { name: 'Sheep rounds 26/28 mm' },
              ],
            },
            { name: 'Sheep bungs' },
            { name: 'Sheep casing sets (tubed)' },
          ],
        },
        {
          name: 'Beef casings',
          children: [
            {
              name: 'Beef rounds',
              children: [
                { name: 'Beef rounds 35/38 mm' },
                { name: 'Beef rounds 38/40 mm' },
                { name: 'Beef rounds 40/43 mm' },
                { name: 'Beef rounds 43/46 mm' },
                { name: 'Beef rounds 46+ mm' },
              ],
            },
            {
              name: 'Beef middles',
              children: [{ name: 'Beef middles 45/50 mm' }, { name: 'Beef middles 50/55 mm' }, { name: 'Beef middles 55+ mm' }],
            },
            { name: 'Beef bungs' },
            { name: 'Beef bladders' },
            { name: 'Beef weasands (oesophagus)' },
          ],
        },
        {
          name: 'Goat casings',
          children: [{ name: 'Goat rounds 18/20 mm' }, { name: 'Goat rounds 20/22 mm' }, { name: 'Goat rounds 22/24 mm' }],
        },
        { name: 'Horse casings' },
        {
          name: 'Processed casing forms',
          children: [
            { name: 'Salted casings in barrel' },
            { name: 'Pre-flushed (pre-tubed) casings' },
            { name: 'Dried casings' },
            { name: 'Shirred casing sticks' },
          ],
        },
      ],
    },
    {
      name: 'Feathers & down',
      ru: 'Перо, пух',
      children: [
        {
          name: 'Goose down',
          children: [
            {
              name: 'White goose down',
              children: [
                { name: 'White goose down 600 fill power' },
                { name: 'White goose down 700 fill power' },
                { name: 'White goose down 800 fill power' },
                { name: 'White goose down 850+ fill power' },
              ],
            },
            {
              name: 'Grey goose down',
              children: [
                { name: 'Grey goose down 550 fill power' },
                { name: 'Grey goose down 650 fill power' },
                { name: 'Grey goose down 750 fill power' },
              ],
            },
            { name: 'Eiderdown' },
          ],
        },
        {
          name: 'Duck down',
          children: [
            {
              name: 'White duck down',
              children: [
                { name: 'White duck down 550 fill power' },
                { name: 'White duck down 600 fill power' },
                { name: 'White duck down 650 fill power' },
              ],
            },
            {
              name: 'Grey duck down',
              children: [{ name: 'Grey duck down 500 fill power' }, { name: 'Grey duck down 600 fill power' }],
            },
          ],
        },
        {
          name: 'Goose feather',
          children: [
            { name: 'White goose feather' },
            { name: 'Grey goose feather' },
            { name: 'Goose feather fibre' },
            { name: 'Goose quill (flight) feather' },
          ],
        },
        {
          name: 'Duck feather',
          children: [{ name: 'White duck feather' }, { name: 'Grey duck feather' }, { name: 'Duck feather fibre' }],
        },
        {
          name: 'Down-feather blends',
          children: [
            { name: 'Goose down-feather blend' },
            { name: 'Duck down-feather blend' },
            { name: 'Crushed feather blend' },
          ],
        },
        {
          name: 'Raw & washed feather stock',
          children: [
            { name: 'Raw unwashed feather' },
            { name: 'Washed sterilised feather' },
            { name: 'Wet-blown feather' },
          ],
        },
        {
          name: 'Ostrich feathers',
          children: [
            { name: 'Prime white plumes' },
            { name: 'Femina plumes' },
            { name: 'Byock feathers' },
            { name: 'Drab body feathers' },
            { name: 'Floss & tail feathers' },
          ],
        },
        {
          name: 'Decorative & fly-tying feathers',
          children: [
            { name: 'Pheasant tail feathers' },
            { name: 'Peacock eye feathers' },
            { name: 'Rooster saddle hackle' },
            { name: 'Turkey marabou' },
          ],
        },
        { name: 'Feather quill & keratin scrap' },
      ],
    },
    {
      name: 'Horns',
      ru: 'Рога',
      children: [
        {
          name: 'Cattle horns',
          children: [
            { name: 'Raw cattle horn' },
            { name: 'Cleaned & boiled cattle horn' },
            { name: 'Horn tips' },
            { name: 'Horn cores' },
          ],
        },
        {
          name: 'Buffalo horns',
          children: [{ name: 'Raw buffalo horn' }, { name: 'Polished buffalo horn' }, { name: 'Buffalo horn plates' }],
        },
        {
          name: 'Sheep & goat horns',
          children: [{ name: 'Ram horns' }, { name: 'Goat horns' }, { name: 'Ibex-type spiral horns' }],
        },
        {
          name: 'Deer antlers',
          children: [
            { name: 'Red deer antler' },
            { name: 'Elk (maral) antler' },
            { name: 'Roe deer antler' },
            { name: 'Reindeer antler' },
            { name: 'Sika deer velvet antler (panty)' },
            { name: 'Naturally shed antler' },
          ],
        },
        {
          name: 'Saiga & antelope horns',
          children: [{ name: 'Saiga horn' }, { name: 'Antelope horn' }],
        },
        {
          name: 'Horn & hoof processing stock',
          children: [
            { name: 'Horn meal (fertilizer)' },
            { name: 'Horn shavings' },
            { name: 'Hooves' },
            { name: 'Keratin horn scrap' },
          ],
        },
        {
          name: 'Worked horn blanks',
          children: [{ name: 'Horn sheets & plates' }, { name: 'Horn rods & blanks' }, { name: 'Horn button blanks' }],
        },
      ],
    },
    {
      name: 'Wool',
      ru: 'Шерсть',
      children: [
        {
          name: 'Greasy wool',
          children: [
            {
              name: 'Merino greasy wool',
              children: [
                { name: 'Ultrafine merino under 16.5 micron' },
                { name: 'Superfine merino 16.6-18.5 micron' },
                { name: 'Fine merino 18.6-20 micron' },
                { name: 'Medium merino 20.1-23 micron' },
              ],
            },
            {
              name: 'Crossbred greasy wool',
              children: [
                { name: 'Fine crossbred 24-26 micron' },
                { name: 'Medium crossbred 27-31 micron' },
                { name: 'Strong crossbred 32-35 micron' },
              ],
            },
            {
              name: 'Carpet-grade greasy wool',
              children: [{ name: 'Carpet wool 36-40 micron' }, { name: 'Coarse carpet wool above 40 micron' }],
            },
            { name: 'Lambswool (greasy)' },
            { name: 'Skirtings & bellies' },
            { name: 'Crutchings & locks' },
          ],
        },
        {
          name: 'Scoured wool',
          children: [
            { name: 'Scoured merino wool' },
            { name: 'Scoured crossbred wool' },
            { name: 'Scoured carpet wool' },
            { name: 'Scoured lambswool' },
          ],
        },
        { name: 'Carbonised wool' },
        {
          name: 'Wool tops & slivers',
          children: [
            { name: 'Merino combed top' },
            { name: 'Crossbred combed top' },
            { name: 'Dyed wool top' },
            { name: 'Superwash-treated top' },
          ],
        },
        {
          name: 'Pulled & slipe wool',
          children: [{ name: 'Slipe wool from pelts' }, { name: 'Lime-pulled wool' }],
        },
        {
          name: 'Wool noils & waste',
          children: [
            { name: 'Wool noil' },
            { name: 'Card waste' },
            { name: 'Comber waste' },
            { name: 'Shoddy & recycled wool' },
          ],
        },
        {
          name: 'Cashmere',
          children: [
            { name: 'Raw cashmere' },
            { name: 'Dehaired cashmere 15-16 micron' },
            { name: 'Dehaired cashmere 16.5-17.5 micron' },
            { name: 'Cashmere noil' },
          ],
        },
        {
          name: 'Mohair',
          children: [
            { name: 'Kid mohair (under 27 micron)' },
            { name: 'Young goat mohair (27-30 micron)' },
            { name: 'Adult mohair (above 30 micron)' },
            { name: 'Mohair top' },
          ],
        },
        {
          name: 'Camel hair',
          children: [{ name: 'Baby camel down' }, { name: 'Dehaired camel hair' }, { name: 'Coarse camel hair' }],
        },
        {
          name: 'Alpaca & llama fibre',
          children: [
            { name: 'Royal alpaca (under 19 micron)' },
            { name: 'Baby alpaca (19-22.5 micron)' },
            { name: 'Superfine alpaca (22.6-25.5 micron)' },
            { name: 'Huarizo & coarse alpaca' },
            { name: 'Llama fibre' },
          ],
        },
        { name: 'Yak down' },
        { name: 'Angora rabbit wool' },
        {
          name: 'Vicuna & guanaco fibre',
          children: [{ name: 'Vicuna fibre' }, { name: 'Guanaco fibre' }],
        },
      ],
    },
    {
      name: 'Hides',
      ru: 'Шкуры',
      children: [
        {
          name: 'Cattle hides',
          children: [
            {
              name: 'Wet-salted cattle hides',
              children: [{ name: 'Cow hides' }, { name: 'Bull hides' }, { name: 'Steer hides' }, { name: 'Heifer hides' }],
            },
            {
              name: 'Wet blue cattle hides',
              children: [{ name: 'Wet blue sides' }, { name: 'Wet blue whole hides' }, { name: 'Wet blue double butts' }],
            },
            { name: 'Crust cattle hides' },
            { name: 'Dry-salted & air-dried cattle hides' },
            {
              name: 'Cattle hide splits',
              children: [{ name: 'Wet blue split' }, { name: 'Crust split' }, { name: 'Limed split' }],
            },
          ],
        },
        {
          name: 'Buffalo hides',
          children: [
            { name: 'Wet-salted buffalo hides' },
            { name: 'Wet blue buffalo hides' },
            { name: 'Crust buffalo hides' },
            { name: 'Buffalo splits' },
          ],
        },
        {
          name: 'Calf skins',
          children: [
            { name: 'Wet-salted calf skins' },
            { name: 'Wet blue calf skins' },
            { name: 'Crust calf skins' },
            { name: 'Vealskins' },
          ],
        },
        {
          name: 'Goat skins',
          children: [
            { name: 'Wet-salted goat skins' },
            { name: 'Pickled goat skins' },
            { name: 'Wet blue goat skins' },
            { name: 'Crust goat skins' },
            { name: 'Kid skins' },
          ],
        },
        {
          name: 'Sheep skins',
          children: [
            { name: 'Wet-salted sheep skins' },
            { name: 'Pickled sheep skins' },
            { name: 'Wet blue sheep skins' },
            { name: 'Crust sheep skins' },
            { name: 'Wool-on sheepskins' },
            { name: 'Lamb skins' },
          ],
        },
        {
          name: 'Pig skins',
          children: [{ name: 'Wet-salted pig skins' }, { name: 'Wet blue pig skins' }, { name: 'Crust pig skins' }],
        },
        {
          name: 'Horse hides',
          children: [{ name: 'Wet-salted horse hides' }, { name: 'Horse fronts' }, { name: 'Shell cordovan butts' }],
        },
        {
          name: 'Deer & game skins',
          children: [{ name: 'Red deer skins' }, { name: 'Roe deer skins' }, { name: 'Elk skins' }],
        },
        { name: 'Camel hides' },
        {
          name: 'Fish skins',
          children: [
            { name: 'Salmon skins' },
            { name: 'Tilapia skins' },
            { name: 'Sturgeon skins' },
            { name: 'Perch (nile perch) skins' },
          ],
        },
        {
          name: 'Hide trimmings & gelatine stock',
          children: [
            { name: 'Limed hide trimmings' },
            { name: 'Raw hide cuttings' },
            { name: 'Wet blue shavings' },
            { name: 'Glue stock' },
          ],
        },
      ],
    },
  ],
};
