import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Packaging goes 4 levels deep (5 only for pallet footprints and corrugated flute codes),
 * because packaging buyers filter by construction family first (corrugated ply, sack fabric,
 * film resin, pallet standard) and then by the named industry spec they actually order against.
 */
export const packaging: TaxCategory = {
  name: 'Packaging',
  emoji: '📦',
  tint: TINT.stone,
  children: [
    {
      name: 'Banana boxes',
      ru: 'Банановые коробки',
      children: [
        {
          name: 'Telescopic two-piece banana carton',
          children: [
            { name: '3-ply telescopic banana carton' },
            { name: '5-ply telescopic banana carton' },
            { name: 'Banana carton base (tray)' },
            { name: 'Banana carton lid (cap)' },
          ],
        },
        {
          name: 'Vented banana carton',
          children: [{ name: 'Side-vented banana carton' }, { name: 'Top-and-bottom vented banana carton' }],
        },
        {
          name: 'Waxed banana carton',
          children: [{ name: 'Curtain-coated waxed carton' }, { name: 'Cascade-waxed carton' }],
        },
        { name: 'One-piece RSC banana box' },
        { name: 'Plantain carton' },
        { name: 'Used banana boxes (recovered)' },
      ],
    },
    {
      name: 'Barrels',
      ru: 'Бочки',
      children: [
        {
          name: 'Steel drums',
          children: [
            { name: 'Tight-head steel drum (1A1)' },
            { name: 'Open-head steel drum (1A2)' },
            { name: 'Lacquered food-grade steel drum' },
            { name: 'Galvanised steel drum' },
            { name: 'Conical (nestable) steel drum' },
          ],
        },
        {
          name: 'HDPE plastic drums',
          children: [
            { name: 'Tight-head HDPE drum (1H1)' },
            { name: 'Open-head HDPE drum (1H2)' },
            { name: 'Fluorinated HDPE drum' },
            { name: 'L-ring HDPE drum' },
            { name: 'Aseptic bag-in-drum' },
          ],
        },
        {
          name: 'Stainless steel barrels',
          children: [{ name: 'AISI 304 stainless drum' }, { name: 'AISI 316 stainless drum' }, { name: 'Beer keg' }],
        },
        {
          name: 'Fibre drums',
          children: [{ name: 'Kraft fibre drum' }, { name: 'Foil-lined fibre drum' }, { name: 'PE-lined fibre drum' }],
        },
        {
          name: 'Wooden barrels',
          children: [
            { name: 'Oak wine barrel' },
            { name: 'Oak whisky cask' },
            { name: 'Acacia barrel' },
            { name: 'Chestnut barrel' },
            { name: 'Pickling (salting) tub' },
          ],
        },
        { name: 'Aluminium drums' },
        {
          name: 'Drum closures & accessories',
          children: [
            { name: 'Drum bungs & gaskets' },
            { name: 'Lever-lock closing ring' },
            { name: 'Bolt-ring closure' },
            { name: 'Drum liner bag' },
          ],
        },
      ],
    },
    {
      name: 'Paper',
      ru: 'Бумага',
      children: [
        {
          name: 'Kraft paper',
          children: [
            { name: 'Unbleached natural kraft' },
            { name: 'Bleached white kraft' },
            { name: 'Extensible sack kraft' },
            { name: 'Ribbed kraft' },
            { name: 'PE-coated kraft' },
          ],
        },
        {
          name: 'Greaseproof & parchment paper',
          children: [
            { name: 'Genuine vegetable parchment' },
            { name: 'Greaseproof MG paper' },
            { name: 'Silicone-coated baking paper' },
          ],
        },
        {
          name: 'Waxed paper',
          children: [{ name: 'Paraffin-waxed wrapping paper' }, { name: 'Wax-laminated interleaving paper' }],
        },
        {
          name: 'Fruit wrapping tissue',
          children: [
            { name: 'Citrus wrapping tissue' },
            { name: 'Apple & pear wrapping tissue' },
            { name: 'Diphenyl-treated wrap' },
          ],
        },
        {
          name: 'Containerboard',
          children: [
            { name: 'Kraftliner' },
            { name: 'Testliner' },
            { name: 'White-top liner' },
            { name: 'Semi-chemical fluting' },
            { name: 'Recycled fluting (schrenz)' },
          ],
        },
        {
          name: 'Label & facestock paper',
          children: [
            { name: 'Self-adhesive label stock' },
            { name: 'Wet-glue label paper' },
            { name: 'Thermal label paper' },
            { name: 'Metallised label paper' },
          ],
        },
        {
          name: 'Interleaving & void-fill paper',
          children: [{ name: 'Honeycomb wrap paper' }, { name: 'Crinkle-cut void fill' }, { name: 'Newsprint offcuts' }],
        },
        { name: 'Recovered paper & board scrap' },
      ],
    },
    {
      name: 'Cardboard',
      ru: 'Картон',
      children: [
        {
          name: 'Corrugated board',
          children: [
            {
              name: 'Single-face board',
              children: [{ name: 'B-flute single face' }, { name: 'E-flute single face' }],
            },
            {
              name: 'Single-wall 3-ply board',
              children: [
                { name: 'B-flute 3-ply' },
                { name: 'C-flute 3-ply' },
                { name: 'E-flute 3-ply' },
                { name: 'F-flute (micro) 3-ply' },
              ],
            },
            {
              name: 'Double-wall 5-ply board',
              children: [{ name: 'BC-flute 5-ply' }, { name: 'EB-flute 5-ply' }, { name: 'BB-flute 5-ply' }],
            },
            {
              name: 'Triple-wall 7-ply board',
              children: [{ name: 'AAA-flute 7-ply' }, { name: 'BCA-flute 7-ply' }],
            },
            { name: 'Waxed corrugated board' },
            { name: 'Water-repellent (WRP) corrugated board' },
          ],
        },
        {
          name: 'Solid & recycled board',
          children: [
            { name: 'Greyboard (chipboard)' },
            { name: 'Duplex board' },
            { name: 'Triplex board' },
            { name: 'Solid fibreboard' },
          ],
        },
        {
          name: 'Folding boxboard',
          children: [
            { name: 'Folding boxboard (FBB)' },
            { name: 'Solid bleached sulphate (SBS)' },
            { name: 'Coated unbleached kraft (CUK)' },
            { name: 'White-lined chipboard (WLC)' },
          ],
        },
        {
          name: 'Corrugated sheets & pads',
          children: [
            { name: 'Layer pads & separators' },
            { name: 'Slip sheets' },
            { name: 'Corner boards (edge protectors)' },
            { name: 'Partition inserts & dividers' },
          ],
        },
        { name: 'Honeycomb board' },
      ],
    },
    {
      name: 'Containers',
      ru: 'Контейнеры',
      children: [
        {
          name: 'Intermediate bulk containers (IBC)',
          children: [
            { name: 'Composite IBC in steel cage (31HA1)' },
            { name: 'Rigid HDPE IBC' },
            { name: 'Stainless steel IBC' },
            { name: 'Collapsible (folding) IBC' },
            { name: 'Aseptic bag-in-IBC' },
          ],
        },
        {
          name: 'Plastic pails & jerrycans',
          children: [
            { name: 'PP food-grade pail with lid' },
            { name: 'HDPE jerrycan' },
            { name: 'Round tub with tamper-evident lid' },
            { name: 'Hinged-lid deli container' },
            { name: 'Honey pail' },
          ],
        },
        {
          name: 'Shipping containers',
          children: [
            { name: 'Dry cargo container 20 ft' },
            { name: 'Dry cargo container 40 ft HC' },
            { name: 'Reefer container 40 ft' },
            { name: 'Ventilated (coffee) container' },
            { name: 'Flexitank-fitted container' },
            { name: 'Open-top container' },
          ],
        },
        {
          name: 'Insulated & thermal containers',
          children: [
            { name: 'EPS insulated fish box' },
            { name: 'PU insulated shipper' },
            { name: 'Insulated pallet cover' },
            { name: 'Reusable cold-chain tote' },
          ],
        },
        {
          name: 'Metal cans & tins',
          children: [
            { name: 'Tinplate food can (three-piece)' },
            { name: 'Two-piece drawn aluminium can' },
            { name: 'Easy-open end can' },
            { name: 'Rectangular oil tin' },
            { name: 'Milk churn' },
          ],
        },
        { name: 'Flexitanks' },
      ],
    },
    {
      name: 'Boxes',
      ru: 'Коробки',
      children: [
        {
          name: 'Slotted corrugated boxes',
          children: [
            { name: 'Regular slotted carton (RSC)' },
            { name: 'Half-slotted carton (HSC)' },
            { name: 'Full-overlap carton (FOL)' },
            { name: 'Centre-special slotted carton (CSSC)' },
          ],
        },
        {
          name: 'Die-cut boxes',
          children: [
            { name: 'Crash-lock bottom box' },
            { name: 'Auto-bottom box' },
            { name: 'Tuck-end box' },
            { name: 'Pizza-style box' },
            { name: 'Book-wrap (mailer) box' },
          ],
        },
        {
          name: 'Telescopic boxes',
          children: [{ name: 'Full telescopic box' }, { name: 'Partial telescopic box' }, { name: 'Tray-and-hood box' }],
        },
        {
          name: 'Produce boxes',
          children: [
            { name: 'Vented produce carton' },
            { name: 'Waxed produce carton' },
            { name: 'Berry punnet master carton' },
            { name: 'Grape carton with liner' },
            { name: 'Egg master carton' },
          ],
        },
        { name: 'Bliss boxes' },
        {
          name: 'Bulk & octabin boxes',
          children: [{ name: 'Octabin bulk box' }, { name: 'Bulk bin with pallet base' }, { name: 'Gaylord box' }],
        },
        {
          name: 'Rigid set-up & gift boxes',
          children: [{ name: 'Rigid two-piece gift box' }, { name: 'Magnetic-closure box' }, { name: 'Hamper box' }],
        },
      ],
    },
    {
      name: 'Trays',
      ru: 'Лотки',
      children: [
        {
          name: 'Moulded pulp trays',
          children: [
            { name: 'Egg tray 30-cell' },
            { name: 'Egg carton with lid' },
            { name: 'Apple & pear cup tray' },
            { name: 'Stone-fruit cup tray' },
            { name: 'Bottle tray' },
          ],
        },
        {
          name: 'EPS foam trays',
          children: [
            { name: 'Meat display tray' },
            { name: 'Absorbent-pad meat tray' },
            { name: 'Fish barquette' },
            { name: 'Produce foam tray' },
          ],
        },
        {
          name: 'PET & rPET trays',
          children: [
            { name: 'Sealable MAP tray' },
            { name: 'Skin-pack tray' },
            { name: 'Berry punnet (clamshell)' },
            { name: 'Salad bowl with lid' },
          ],
        },
        {
          name: 'PP & CPET trays',
          children: [{ name: 'Ovenable CPET tray' }, { name: 'Sealable PP tray' }, { name: 'Multi-compartment PP tray' }],
        },
        {
          name: 'Corrugated trays',
          children: [{ name: 'Display-ready tray' }, { name: 'Stackable produce tray' }, { name: 'Cherry tomato tray' }],
        },
        {
          name: 'Wooden veneer trays',
          children: [{ name: 'Poplar veneer punnet' }, { name: 'Chip basket' }, { name: 'Cheese ripening board' }],
        },
        { name: 'Aluminium foil trays' },
      ],
    },
    {
      name: 'Bag-closing thread',
      ru: 'Нитки мешкозашивочные',
      children: [
        { name: 'Polypropylene bag-closing thread' },
        { name: 'Polyester bag-closing thread' },
        { name: 'Cotton bag-closing thread' },
        { name: 'Nylon bag-closing thread' },
        { name: 'Polyester-cotton corespun thread' },
        { name: 'Jute twine' },
        { name: 'Crepe sealing tape for bag mouths' },
      ],
    },
    {
      name: 'Bags',
      ru: 'Пакеты',
      children: [
        {
          name: 'PP woven sacks',
          children: [
            { name: 'Unlaminated PP woven sack' },
            { name: 'BOPP laminated woven sack' },
            { name: 'PE-laminated woven sack' },
            { name: 'Gusseted PP woven sack' },
            { name: 'Valve-type PP woven sack' },
            { name: 'PP woven sack with PE liner' },
          ],
        },
        {
          name: 'Paper sacks',
          children: [
            { name: 'Multiwall kraft sack' },
            { name: 'Valve paper sack' },
            { name: 'Open-mouth pasted sack' },
            { name: 'Sewn-mouth paper sack' },
            { name: 'PE-lined paper sack' },
          ],
        },
        {
          name: 'FIBC bulk bags',
          children: [
            { name: 'U-panel FIBC' },
            { name: 'Four-panel FIBC' },
            { name: 'Circular (tubular) FIBC' },
            { name: 'Baffle (Q-bag) FIBC' },
            { name: 'Conductive FIBC (Type C)' },
            { name: 'Antistatic FIBC (Type D)' },
            { name: 'Food-grade FIBC with liner' },
            { name: 'One-loop & two-loop FIBC' },
          ],
        },
        {
          name: 'Polyethylene bags',
          children: [
            { name: 'LDPE box liner bag' },
            { name: 'HDPE produce bag' },
            { name: 'Vacuum pouch' },
            { name: 'Zip-lock pouch' },
            { name: 'Bag-in-box liner with tap' },
            { name: 'Silage bag (sleeve)' },
          ],
        },
        {
          name: 'Laminated stand-up pouches',
          children: [
            { name: 'Doypack with zipper' },
            { name: 'Kraft-foil laminate pouch' },
            { name: 'Spouted pouch' },
            { name: 'Degassing-valve coffee pouch' },
            { name: 'Retort pouch' },
          ],
        },
        {
          name: 'Vacuum & shrink bags',
          children: [{ name: 'Shrink bag for meat' }, { name: 'Cheese ripening bag' }, { name: 'Sous-vide bag' }],
        },
      ],
    },
    {
      name: 'Film',
      ru: 'Плёнка',
      children: [
        {
          name: 'Stretch film',
          children: [
            { name: 'Hand stretch wrap' },
            { name: 'Machine pallet wrap' },
            { name: 'Pre-stretched film' },
            { name: 'Black & coloured stretch film' },
            { name: 'Bundling stretch film' },
          ],
        },
        {
          name: 'Shrink film',
          children: [
            { name: 'POF cross-linked shrink film' },
            { name: 'PVC shrink film' },
            { name: 'PE shrink hood' },
            { name: 'Shrink sleeve label film' },
            { name: 'Shrink bundling film' },
          ],
        },
        {
          name: 'BOPP film',
          children: [
            { name: 'Plain transparent BOPP' },
            { name: 'Metallised BOPP' },
            { name: 'Pearlised (cavitated) BOPP' },
            { name: 'Matte BOPP' },
            { name: 'Heat-sealable BOPP' },
          ],
        },
        {
          name: 'PE liner & sheet film',
          children: [
            { name: 'LDPE box liner sheet' },
            { name: 'Pallet top sheet' },
            { name: 'HDPE bin liner sheet' },
            { name: 'Perforated produce liner' },
          ],
        },
        {
          name: 'Barrier & lamination film',
          children: [
            { name: 'Polyamide (nylon) film' },
            { name: 'EVOH barrier film' },
            { name: 'PET polyester film' },
            { name: 'Aluminium foil laminate' },
            { name: 'Metallised PET film' },
          ],
        },
        {
          name: 'Cling & wrapping film',
          children: [{ name: 'PVC cling film' }, { name: 'PE cling film' }, { name: 'Cellulose (NatureFlex) film' }],
        },
        {
          name: 'Agricultural film',
          children: [
            { name: 'Silage bale wrap' },
            { name: 'Silage pit cover film' },
            { name: 'Greenhouse cover film' },
            { name: 'Mulch film' },
            { name: 'Oxygen-barrier silage film' },
          ],
        },
        { name: 'Compostable & biodegradable film' },
      ],
    },
    {
      name: 'Pallets',
      ru: 'Поддоны',
      children: [
        {
          name: 'Wooden pallets',
          children: [
            {
              name: 'EUR/EPAL pallets',
              children: [
                { name: 'EPAL 1 (1200x800)' },
                { name: 'EPAL 2 (1200x1000)' },
                { name: 'EPAL 3 (1000x1200)' },
                { name: 'EPAL 6 (800x600)' },
                { name: 'EPAL 7 (1140x1140)' },
              ],
            },
            {
              name: 'CP chemical pallets',
              children: [
                { name: 'CP1 (1000x1200)' },
                { name: 'CP2 (800x1200)' },
                { name: 'CP3 (1140x1140)' },
                { name: 'CP4 (1100x1300)' },
                { name: 'CP5 (760x1140)' },
                { name: 'CP6 (1000x1200)' },
                { name: 'CP7 (1100x1300)' },
                { name: 'CP8 (1140x1140)' },
                { name: 'CP9 (1140x1140)' },
              ],
            },
            { name: 'One-way (single-trip) pallet' },
            { name: 'Industrial heavy-duty pallet' },
            { name: 'Half pallet & display pallet' },
            { name: 'ISPM-15 heat-treated pallet' },
            { name: 'Used & refurbished wooden pallets' },
          ],
        },
        {
          name: 'Plastic pallets',
          children: [
            { name: 'Nestable plastic pallet' },
            { name: 'Rackable plastic pallet' },
            { name: 'Hygienic export plastic pallet' },
            { name: 'Half-size plastic pallet' },
            { name: 'Pallet with steel reinforcement' },
          ],
        },
        {
          name: 'Pressed wood pallets',
          children: [{ name: 'Moulded (Inka) pallet' }, { name: 'Nestable presswood pallet' }],
        },
        {
          name: 'Metal pallets',
          children: [{ name: 'Steel pallet' }, { name: 'Aluminium pallet' }, { name: 'Steel post pallet' }],
        },
        { name: 'Paper & honeycomb pallets' },
        {
          name: 'Pallet collars & accessories',
          children: [
            { name: 'Wooden pallet collar' },
            { name: 'Pallet lid' },
            { name: 'Pallet corner post' },
            { name: 'Anti-slip pallet sheet' },
          ],
        },
      ],
    },
    {
      name: 'Net bags',
      ru: 'Сетка',
      children: [
        {
          name: 'Raschel mesh bags',
          children: [
            { name: 'Onion raschel bag' },
            { name: 'Potato raschel bag' },
            { name: 'Citrus raschel bag' },
            { name: 'Firewood raschel bag' },
            { name: 'Raschel bag with header label' },
          ],
        },
        {
          name: 'Leno woven mesh bags',
          children: [{ name: 'Leno onion bag' }, { name: 'Leno cabbage bag' }, { name: 'Leno bulk mesh bag' }],
        },
        {
          name: 'Tubular netting rolls',
          children: [
            { name: 'Extruded (Vexar) netting roll' },
            { name: 'Knitted tubular netting roll' },
            { name: 'Monofilament netting roll' },
          ],
        },
        {
          name: 'Bale netwrap',
          children: [{ name: 'Round-bale netwrap' }, { name: 'Edge-to-edge netwrap' }],
        },
        {
          name: 'Protective fruit netting',
          children: [
            { name: 'Foam fruit sleeve net' },
            { name: 'Melon & pineapple net sleeve' },
            { name: 'Bottle protection net' },
          ],
        },
        { name: 'Big-bag mesh (ventilated FIBC)' },
      ],
    },
    {
      name: 'Adhesive tape',
      ru: 'Скотч',
      children: [
        {
          name: 'BOPP packing tape',
          children: [
            { name: 'Clear BOPP tape' },
            { name: 'Brown (tan) BOPP tape' },
            { name: 'Printed BOPP tape' },
            { name: 'Low-noise BOPP tape' },
            { name: 'Machine-roll BOPP tape' },
          ],
        },
        {
          name: 'Gummed paper tape',
          children: [{ name: 'Water-activated kraft tape' }, { name: 'Reinforced gummed tape' }],
        },
        {
          name: 'Filament & strapping tape',
          children: [{ name: 'Mono-directional filament tape' }, { name: 'Cross-weave filament tape' }],
        },
        { name: 'Masking tape' },
        { name: 'Double-sided tape' },
        { name: 'Cloth (duct) tape' },
        { name: 'PVC carton sealing tape' },
        { name: 'Aluminium foil tape' },
        {
          name: 'Strapping & closures',
          children: [
            { name: 'PP strapping band' },
            { name: 'PET strapping band' },
            { name: 'Steel strapping band' },
            { name: 'Strapping seals & buckles' },
          ],
        },
      ],
    },
    {
      name: 'Glass containers',
      ru: 'Стеклотара',
      children: [
        {
          name: 'Glass jars',
          children: [
            { name: 'Twist-off jar TO-63' },
            { name: 'Twist-off jar TO-82' },
            { name: 'Preserve (mason) jar with clip' },
            { name: 'Honey jar' },
            { name: 'Baby-food jar' },
            { name: 'Caviar jar' },
          ],
        },
        {
          name: 'Glass bottles',
          children: [
            {
              name: 'Wine bottles',
              children: [
                { name: 'Bordeaux bottle' },
                { name: 'Burgundy bottle' },
                { name: 'Champagne (sparkling) bottle' },
                { name: 'Rhine (flute) bottle' },
              ],
            },
            { name: 'Beer bottle' },
            { name: 'Juice bottle' },
            { name: 'Edible oil bottle' },
            { name: 'Milk bottle' },
            { name: 'Spirits bottle' },
            { name: 'Sauce & vinegar bottle' },
          ],
        },
        {
          name: 'Demijohns & carboys',
          children: [{ name: 'Wicker-clad demijohn' }, { name: 'Glass carboy for fermentation' }],
        },
        {
          name: 'Closures for glass',
          children: [
            { name: 'Twist-off lug cap' },
            { name: 'Crown cap' },
            { name: 'Natural cork stopper' },
            { name: 'Agglomerated cork stopper' },
            { name: 'BVS screw cap' },
            { name: 'Swing-top (Bugel) closure' },
          ],
        },
        { name: 'Cullet & recovered glass' },
      ],
    },
    {
      name: 'Textile packaging',
      ru: 'Текстильная тара',
      children: [
        {
          name: 'Jute sacks',
          children: [
            { name: 'B-Twill jute sack' },
            { name: 'DW (double warp) jute sack' },
            { name: 'Food-grade coffee & cocoa jute bag' },
            { name: 'Laminated jute bag' },
            { name: 'Vegetable-oil-batched (VOB) jute sack' },
          ],
        },
        {
          name: 'Hessian & burlap cloth',
          children: [{ name: 'Hessian cloth roll' }, { name: 'Burlap sheet' }, { name: 'Hessian wrapping bag' }],
        },
        {
          name: 'Cotton bags',
          children: [
            { name: 'Cotton drawstring bag' },
            { name: 'Canvas sack' },
            { name: 'Muslin (cheesecloth) bag' },
            { name: 'Calico flour bag' },
          ],
        },
        {
          name: 'Woven PP fabric rolls',
          children: [
            { name: 'Unlaminated PP woven fabric roll' },
            { name: 'Laminated PP woven fabric roll' },
            { name: 'BOPP printed fabric roll' },
          ],
        },
        {
          name: 'Tarpaulins & covers',
          children: [
            { name: 'HDPE laminated tarpaulin' },
            { name: 'Canvas tarpaulin' },
            { name: 'Grain pile cover' },
            { name: 'Truck side curtain' },
          ],
        },
        {
          name: 'Twine, rope & webbing',
          children: [
            { name: 'Baler twine' },
            { name: 'Sisal rope' },
            { name: 'Jute rope' },
            { name: 'PP lifting webbing' },
          ],
        },
      ],
    },
    {
      name: 'Crates',
      ru: 'Ящики',
      children: [
        {
          name: 'Returnable plastic crates',
          children: [
            { name: 'Foldable (collapsible) crate' },
            { name: 'Stack-and-nest crate' },
            { name: 'Vented produce crate' },
            { name: 'Bread crate' },
            { name: 'Bottle crate' },
            { name: 'Fish crate with drain' },
            { name: 'Meat (E2) crate' },
          ],
        },
        {
          name: 'Wooden crates',
          children: [
            { name: 'Nailed wooden crate' },
            { name: 'Wirebound crate' },
            { name: 'Plywood crate' },
            { name: 'ISPM-15 heat-treated export crate' },
            { name: 'Fruit picking crate' },
            { name: 'Wooden gift crate' },
          ],
        },
        {
          name: 'Bulk bins & pallet boxes',
          children: [
            { name: 'Vented plastic bulk bin' },
            { name: 'Solid-wall plastic bulk bin' },
            { name: 'Collapsible bulk container' },
            { name: 'Wooden apple bin' },
            { name: 'Potato storage bin' },
          ],
        },
        {
          name: 'Metal cages & stillages',
          children: [
            { name: 'Wire mesh pallet cage' },
            { name: 'Roll cage (roll container)' },
            { name: 'Stackable steel stillage' },
          ],
        },
        {
          name: 'Baskets',
          children: [{ name: 'Wicker harvest basket' }, { name: 'Veneer chip basket' }, { name: 'Bamboo basket' }],
        },
      ],
    },
  ],
};
