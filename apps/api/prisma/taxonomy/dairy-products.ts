import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Dairy goes 5 levels deep on cheese (family › named type › age/milk-species grade) and 4 levels on
 * milk, powders, milk fat and whey, because those are the lines that actually trade by named grade
 * (SMP low-heat, WPC 80, mature Cheddar). Long-tail lines such as sour cream stop at level 3.
 */
export const dairyProducts: TaxCategory = {
  name: 'Dairy products',
  emoji: '🥛',
  tint: TINT.mint,
  children: [
    {
      name: 'Yogurt',
      ru: 'Йогурт',
      children: [
        {
          name: 'Set yogurt',
          children: [
            { name: 'Plain set yogurt' },
            { name: 'Fruit-on-the-bottom yogurt' },
            { name: 'Bio set yogurt' },
          ],
        },
        {
          name: 'Stirred yogurt',
          children: [
            { name: 'Plain stirred yogurt' },
            { name: 'Fruit-blended yogurt' },
            { name: 'Low-fat stirred yogurt' },
          ],
        },
        {
          name: 'Strained yogurt',
          children: [
            { name: 'Greek yogurt' },
            { name: 'Skyr' },
            { name: 'Labneh' },
            { name: 'Süzme yogurt' },
            { name: 'Shrikhand' },
          ],
        },
        {
          name: 'Drinking yogurt',
          children: [
            { name: 'Ayran' },
            { name: 'Doogh' },
            { name: 'Lassi' },
            { name: 'Fruit yogurt drink' },
          ],
        },
        {
          name: 'Kefir',
          children: [
            { name: 'Plain kefir' },
            { name: 'Bio-kefir' },
            { name: 'Fruit kefir' },
          ],
        },
        {
          name: 'Cultured buttermilk',
          children: [
            { name: 'Chaas' },
            { name: 'Plain cultured buttermilk' },
          ],
        },
        {
          name: 'Frozen yogurt',
          children: [
            { name: 'Soft-serve frozen yogurt' },
            { name: 'Hard-pack frozen yogurt' },
          ],
        },
        {
          name: 'Yogurt powder',
          children: [
            { name: 'Sweet yogurt powder' },
            { name: 'Plain yogurt powder' },
          ],
        },
        {
          name: 'Yogurt cultures',
          children: [
            { name: 'Thermophilic yogurt culture' },
            { name: 'Probiotic culture blend' },
          ],
        },
      ],
    },
    {
      name: 'Milk',
      ru: 'Молоко',
      children: [
        {
          name: 'Raw milk',
          children: [
            { name: 'Raw cow milk' },
            { name: 'Raw buffalo milk' },
            { name: 'Raw goat milk' },
            { name: 'Raw sheep milk' },
            { name: 'Raw camel milk' },
            { name: 'Raw donkey milk' },
          ],
        },
        {
          name: 'Pasteurised milk',
          children: [
            { name: 'Whole pasteurised milk' },
            { name: 'Semi-skimmed pasteurised milk' },
            { name: 'Skimmed pasteurised milk' },
            { name: 'ESL milk' },
            { name: 'Micro-filtered milk' },
          ],
        },
        {
          name: 'UHT milk',
          children: [
            { name: 'Whole UHT milk' },
            { name: 'Semi-skimmed UHT milk' },
            { name: 'Skimmed UHT milk' },
            { name: 'Lactose-free UHT milk' },
          ],
        },
        {
          name: 'Sterilised milk',
          children: [
            { name: 'In-bottle sterilised milk' },
            { name: 'Retort-sterilised milk' },
          ],
        },
        {
          name: 'Cow milk',
          children: [
            { name: 'A2 cow milk' },
            { name: 'Holstein herd milk' },
            { name: 'Jersey milk' },
            { name: 'Toned cow milk' },
            { name: 'Double-toned cow milk' },
          ],
        },
        {
          name: 'Goat milk',
          children: [
            { name: 'Fresh goat milk' },
            { name: 'Pasteurised goat milk' },
            { name: 'UHT goat milk' },
          ],
        },
        {
          name: 'Buffalo milk',
          children: [
            { name: 'Fresh buffalo milk' },
            { name: 'Pasteurised buffalo milk' },
            { name: 'Standardised buffalo milk' },
          ],
        },
        {
          name: 'Sheep milk',
          children: [
            { name: 'Fresh sheep milk' },
            { name: 'Frozen sheep milk' },
          ],
        },
        {
          name: 'Camel milk',
          children: [
            { name: 'Fresh camel milk' },
            { name: 'Frozen camel milk' },
          ],
        },
        {
          name: 'Lactose-free milk',
          children: [
            { name: 'Lactose-free whole milk' },
            { name: 'Lactose-free skimmed milk' },
          ],
        },
        {
          name: 'Flavoured milk',
          children: [
            { name: 'Chocolate milk' },
            { name: 'Strawberry milk' },
            { name: 'Coffee milk' },
            { name: 'Badam milk' },
            { name: 'Vanilla milk' },
          ],
        },
        {
          name: 'Fortified milk',
          children: [
            { name: 'Vitamin A & D fortified milk' },
            { name: 'Calcium-fortified milk' },
            { name: 'High-protein milk' },
          ],
        },
      ],
    },
    {
      name: 'Powdered milk',
      ru: 'Молоко сухое',
      children: [
        {
          name: 'Skimmed milk powder',
          children: [
            { name: 'Low-heat SMP' },
            { name: 'Medium-heat SMP' },
            { name: 'High-heat SMP' },
            { name: 'Instant SMP' },
            { name: 'Roller-dried SMP' },
          ],
        },
        {
          name: 'Whole milk powder',
          children: [
            { name: 'Regular WMP 26% fat' },
            { name: 'High-fat WMP 28% fat' },
            { name: 'Instant WMP' },
            { name: 'Agglomerated WMP' },
          ],
        },
        {
          name: 'Buttermilk powder',
          children: [
            { name: 'Sweet buttermilk powder' },
            { name: 'Cultured buttermilk powder' },
            { name: 'Roller-dried buttermilk powder' },
          ],
        },
        {
          name: 'Casein & caseinates',
          children: [
            { name: 'Acid casein' },
            { name: 'Rennet casein' },
            { name: 'Sodium caseinate' },
            { name: 'Calcium caseinate' },
            { name: 'Potassium caseinate' },
            { name: 'Micellar casein' },
          ],
        },
        {
          name: 'Milk protein concentrate',
          children: [
            { name: 'MPC 42' },
            { name: 'MPC 70' },
            { name: 'MPC 80' },
            { name: 'MPC 85' },
            { name: 'Milk protein isolate' },
          ],
        },
        {
          name: 'Fat-filled milk powder',
          children: [
            { name: 'Vegetable-fat filled milk powder' },
            { name: 'Dairy whitener' },
            { name: 'Instant filled milk powder' },
          ],
        },
        {
          name: 'Cream powder',
          children: [
            { name: 'Sweet cream powder 40% fat' },
            { name: 'Sweet cream powder 72% fat' },
          ],
        },
        {
          name: 'Goat milk powder',
          children: [
            { name: 'Whole goat milk powder' },
            { name: 'Skimmed goat milk powder' },
          ],
        },
        {
          name: 'Camel milk powder',
          children: [
            { name: 'Whole camel milk powder' },
            { name: 'Freeze-dried camel milk powder' },
          ],
        },
        {
          name: 'Infant formula base powder',
          children: [
            { name: 'Demineralised whey base' },
            { name: 'Follow-on formula base' },
            { name: 'Growing-up milk base' },
          ],
        },
        {
          name: 'Colostrum powder',
          children: [
            { name: 'Bovine colostrum powder' },
            { name: 'Skimmed colostrum powder' },
          ],
        },
      ],
    },
    {
      name: 'Milk fat',
      ru: 'Молочный жир',
      children: [
        {
          name: 'Butter',
          children: [
            { name: 'Sweet cream butter' },
            { name: 'Cultured butter' },
            { name: 'Salted butter' },
            { name: 'Unsalted butter' },
            { name: 'Whey butter' },
            { name: 'Spreadable butter' },
            { name: 'White butter (makkhan)' },
          ],
        },
        {
          name: 'Ghee',
          children: [
            { name: 'Cow ghee' },
            { name: 'Buffalo ghee' },
            { name: 'Mixed milk ghee' },
            { name: 'Bilona ghee' },
            { name: 'Samn baladi' },
          ],
        },
        {
          name: 'Anhydrous milk fat',
          children: [
            { name: 'AMF 99.8%' },
            { name: 'Butter oil' },
            { name: 'Milk fat olein' },
            { name: 'Milk fat stearin' },
          ],
        },
        {
          name: 'Dairy blends & spreads',
          children: [
            { name: 'Butter-vegetable oil blend' },
            { name: 'Reduced-fat dairy spread' },
            { name: 'Garlic & herb butter' },
          ],
        },
        {
          name: 'Butter powder',
          children: [
            { name: 'Butter fat powder' },
            { name: 'Ghee powder' },
          ],
        },
        {
          name: 'Butter concentrates',
          children: [
            { name: 'Butter concentrate 96%' },
            { name: 'Fractionated butter fat' },
          ],
        },
      ],
    },
    {
      name: 'Ice cream',
      ru: 'Мороженое',
      children: [
        {
          name: 'Dairy ice cream',
          children: [
            { name: 'Vanilla ice cream' },
            { name: 'Chocolate ice cream' },
            { name: 'Strawberry ice cream' },
            { name: 'Pistachio ice cream' },
            { name: 'Mango ice cream' },
            { name: 'Butterscotch ice cream' },
          ],
        },
        {
          name: 'Gelato',
          children: [
            { name: 'Fior di latte gelato' },
            { name: 'Nocciola gelato' },
            { name: 'Stracciatella gelato' },
          ],
        },
        {
          name: 'Kulfi',
          children: [
            { name: 'Malai kulfi' },
            { name: 'Pista kulfi' },
            { name: 'Mango kulfi' },
            { name: 'Kesar kulfi' },
          ],
        },
        {
          name: 'Frozen custard',
          children: [
            { name: 'Vanilla frozen custard' },
            { name: 'Chocolate frozen custard' },
          ],
        },
        {
          name: 'Sorbet & sherbet',
          children: [
            { name: 'Fruit sorbet' },
            { name: 'Dairy sherbet' },
          ],
        },
        {
          name: 'Ice cream bars & sticks',
          children: [
            { name: 'Chocolate-coated ice cream bar' },
            { name: 'Water-ice lolly' },
            { name: 'Almond-coated bar' },
          ],
        },
        {
          name: 'Ice cream cones',
          children: [
            { name: 'Filled wafer cone' },
            { name: 'Sugar cone' },
          ],
        },
        {
          name: 'Ice cream sandwiches',
          children: [
            { name: 'Wafer ice cream sandwich' },
            { name: 'Cookie ice cream sandwich' },
          ],
        },
        {
          name: 'Ice cream cakes & rolls',
          children: [
            { name: 'Ice cream gateau' },
            { name: 'Ice cream roll' },
          ],
        },
        {
          name: 'Ice cream mix',
          children: [
            { name: 'Soft-serve mix powder' },
            { name: 'Liquid ice cream mix' },
            { name: 'Gelato base powder' },
          ],
        },
      ],
    },
    {
      name: 'Condensed milk',
      ru: 'Сгущённое молоко',
      children: [
        {
          name: 'Sweetened condensed milk',
          children: [
            { name: 'Full-fat sweetened condensed milk' },
            { name: 'Skimmed sweetened condensed milk' },
            { name: 'Filled sweetened condensed milk' },
            { name: 'Cocoa condensed milk' },
          ],
        },
        {
          name: 'Evaporated milk',
          children: [
            { name: 'Full-fat evaporated milk' },
            { name: 'Skimmed evaporated milk' },
            { name: 'Filled evaporated milk' },
          ],
        },
        {
          name: 'Khoa & mawa',
          children: [
            { name: 'Batti khoa' },
            { name: 'Danedar khoa' },
            { name: 'Pindi khoa' },
          ],
        },
        {
          name: 'Dulce de leche',
          children: [
            { name: 'Classic dulce de leche' },
            { name: 'Confectioner dulce de leche' },
          ],
        },
        {
          name: 'Condensed whey',
          children: [
            { name: 'Sweetened condensed whey' },
            { name: 'Condensed whey permeate' },
          ],
        },
        {
          name: 'Condensed buttermilk',
          children: [
            { name: 'Sweet condensed buttermilk' },
            { name: 'Cultured condensed buttermilk' },
          ],
        },
      ],
    },
    {
      name: 'Cream',
      ru: 'Сливки',
      children: [
        {
          name: 'Raw cream',
          children: [
            { name: 'Separated cow cream' },
            { name: 'Separated buffalo cream' },
          ],
        },
        {
          name: 'Single cream',
          children: [
            { name: 'Pasteurised single cream' },
            { name: 'UHT single cream' },
          ],
        },
        {
          name: 'Whipping cream',
          children: [
            { name: 'Dairy whipping cream' },
            { name: 'Aerosol whipped cream' },
            { name: 'Frozen whipping cream' },
          ],
        },
        {
          name: 'Double cream',
          children: [
            { name: 'Pasteurised double cream' },
            { name: 'UHT double cream' },
          ],
        },
        {
          name: 'Cooking cream',
          children: [
            { name: 'Culinary cream' },
            { name: 'Reduced-fat cooking cream' },
          ],
        },
        {
          name: 'Crème fraîche',
          children: [
            { name: 'Full-fat crème fraîche' },
            { name: 'Reduced-fat crème fraîche' },
          ],
        },
        {
          name: 'Clotted cream',
          children: [
            { name: 'Devon clotted cream' },
            { name: 'Cornish clotted cream' },
          ],
        },
        {
          name: 'Plastic cream',
          children: [
            { name: 'Plastic cream 80% fat' },
            { name: 'Frozen plastic cream' },
          ],
        },
        {
          name: 'Malai',
          children: [
            { name: 'Buffalo malai' },
            { name: 'Cow malai' },
          ],
        },
      ],
    },
    {
      name: 'Sour cream',
      ru: 'Сметана',
      children: [
        {
          name: 'Cultured sour cream',
          children: [
            { name: 'Full-fat cultured sour cream' },
            { name: 'Reduced-fat cultured sour cream' },
          ],
        },
        {
          name: 'Acidified sour cream',
          children: [
            { name: 'Direct-acidified sour cream' },
            { name: 'Stabilised sour cream' },
          ],
        },
        {
          name: 'Smetana',
          children: [
            { name: 'Smetana 20% fat' },
            { name: 'Smetana 30% fat' },
            { name: 'Country-style smetana' },
          ],
        },
        {
          name: 'Sour cream powder',
          children: [
            { name: 'Spray-dried sour cream powder' },
            { name: 'Cultured cream powder' },
          ],
        },
        {
          name: 'Sour cream dips',
          children: [
            { name: 'Onion sour cream dip' },
            { name: 'Herb sour cream dip' },
          ],
        },
      ],
    },
    {
      name: 'Dry whey',
      ru: 'Сыворотка сухая',
      children: [
        {
          name: 'Sweet whey powder',
          children: [
            { name: 'Feed-grade sweet whey powder' },
            { name: 'Food-grade sweet whey powder' },
            { name: 'Non-hygroscopic whey powder' },
          ],
        },
        {
          name: 'Acid whey powder',
          children: [
            { name: 'Casein acid whey powder' },
            { name: 'Greek yogurt acid whey powder' },
          ],
        },
        {
          name: 'Demineralised whey powder',
          children: [
            { name: 'D40 whey powder' },
            { name: 'D50 whey powder' },
            { name: 'D70 whey powder' },
            { name: 'D90 whey powder' },
          ],
        },
        {
          name: 'Whey protein concentrate',
          children: [
            { name: 'WPC 34' },
            { name: 'WPC 60' },
            { name: 'WPC 70' },
            { name: 'WPC 80' },
            { name: 'Instantised WPC 80' },
          ],
        },
        {
          name: 'Whey protein isolate',
          children: [
            { name: 'WPI 90 microfiltered' },
            { name: 'WPI 90 ion-exchange' },
            { name: 'Instantised WPI' },
          ],
        },
        {
          name: 'Whey protein hydrolysate',
          children: [
            { name: 'Partially hydrolysed whey protein' },
            { name: 'Extensively hydrolysed whey protein' },
          ],
        },
        {
          name: 'Whey permeate',
          children: [
            { name: 'Food-grade whey permeate' },
            { name: 'Feed-grade whey permeate' },
          ],
        },
        {
          name: 'Lactose',
          children: [
            { name: 'Edible-grade lactose' },
            { name: 'Refined lactose' },
            { name: 'Pharmaceutical-grade lactose' },
            { name: 'Feed-grade lactose' },
          ],
        },
        {
          name: 'Milk minerals',
          children: [
            { name: 'Whey mineral concentrate' },
            { name: 'Milk calcium powder' },
          ],
        },
      ],
    },
    {
      name: 'Cheese',
      ru: 'Сыры',
      children: [
        {
          name: 'Fresh cheese',
          children: [
            {
              name: 'Cottage cheese',
              children: [
                { name: 'Small-curd cottage cheese' },
                { name: 'Large-curd cottage cheese' },
                { name: 'Dry-curd cottage cheese' },
              ],
            },
            {
              name: 'Cream cheese',
              children: [
                { name: 'Full-fat cream cheese' },
                { name: 'Double cream cheese' },
                { name: 'Whipped cream cheese' },
              ],
            },
            {
              name: 'Ricotta',
              children: [
                { name: 'Ricotta di bufala' },
                { name: 'Ricotta di pecora' },
              ],
            },
            {
              name: 'Quark',
              children: [
                { name: 'Skimmed quark' },
                { name: 'Full-fat quark' },
                { name: 'Tvorog' },
              ],
            },
            { name: 'Mascarpone' },
            {
              name: 'Paneer',
              children: [
                { name: 'Malai paneer' },
                { name: 'Low-fat paneer' },
                { name: 'Frozen paneer blocks' },
              ],
            },
            { name: 'Chhena' },
            { name: 'Fromage blanc' },
            { name: 'Queso fresco' },
          ],
        },
        {
          name: 'Soft-ripened cheese',
          children: [
            {
              name: 'Brie',
              children: [
                { name: 'Brie de Meaux' },
                { name: 'Brie de Melun' },
                { name: 'Double-cream brie' },
              ],
            },
            {
              name: 'Camembert',
              children: [
                { name: 'Camembert de Normandie' },
                { name: 'Stabilised camembert' },
              ],
            },
            { name: 'Coulommiers' },
            { name: 'Neufchâtel' },
            { name: 'Chaource' },
          ],
        },
        {
          name: 'Washed-rind cheese',
          children: [
            { name: 'Époisses' },
            { name: 'Munster' },
            { name: 'Taleggio' },
            { name: 'Limburger' },
            { name: 'Reblochon' },
          ],
        },
        {
          name: 'Semi-hard cheese',
          children: [
            {
              name: 'Gouda',
              children: [
                { name: 'Young Gouda' },
                { name: 'Matured Gouda' },
                { name: 'Extra-aged Gouda' },
                { name: 'Cumin Gouda' },
              ],
            },
            {
              name: 'Edam',
              children: [
                { name: 'Baby Edam' },
                { name: 'Matured Edam' },
              ],
            },
            { name: 'Havarti' },
            { name: 'Tilsit' },
            { name: 'Maasdam' },
            { name: 'Raclette' },
            { name: 'Fontina' },
            { name: 'Russian cheese' },
          ],
        },
        {
          name: 'Hard cheese',
          children: [
            {
              name: 'Cheddar',
              children: [
                { name: 'Mild Cheddar' },
                { name: 'Medium Cheddar' },
                { name: 'Mature Cheddar' },
                { name: 'Extra-mature Cheddar' },
                { name: 'Coloured Cheddar' },
              ],
            },
            {
              name: 'Parmesan & Grana',
              children: [
                { name: 'Parmigiano Reggiano' },
                { name: 'Grana Padano' },
                { name: 'Trentingrana' },
                { name: 'Grated hard grana' },
              ],
            },
            {
              name: 'Emmental',
              children: [
                { name: 'Emmentaler Switzerland' },
                { name: 'French Emmental' },
              ],
            },
            { name: 'Gruyère' },
            { name: 'Comté' },
            { name: 'Pecorino Romano' },
            { name: 'Manchego' },
            { name: 'Sbrinz' },
          ],
        },
        {
          name: 'Blue cheese',
          children: [
            {
              name: 'Roquefort',
              children: [
                { name: 'Roquefort AOP' },
                { name: 'Roquefort crumbles' },
              ],
            },
            {
              name: 'Gorgonzola',
              children: [
                { name: 'Gorgonzola Dolce' },
                { name: 'Gorgonzola Piccante' },
              ],
            },
            { name: 'Stilton' },
            { name: 'Danish Blue' },
            { name: "Bleu d'Auvergne" },
            { name: 'Cabrales' },
            { name: 'Dorblu' },
          ],
        },
        {
          name: 'Brined cheese',
          children: [
            {
              name: 'Feta',
              children: [
                { name: 'Barrel-aged feta' },
                { name: 'Sheep milk feta' },
                { name: 'Goat milk feta' },
                { name: 'Cow milk white cheese' },
              ],
            },
            {
              name: 'Halloumi',
              children: [
                { name: 'Sheep & goat halloumi' },
                { name: 'Cow milk halloumi' },
                { name: 'Mint-layered halloumi' },
              ],
            },
            { name: 'Nabulsi' },
            { name: 'Akawi' },
            { name: 'Domiati' },
            { name: 'Bryndza' },
            { name: 'Chanakh' },
            { name: 'Telemea' },
          ],
        },
        {
          name: 'Pasta filata cheese',
          children: [
            {
              name: 'Mozzarella',
              children: [
                { name: 'Fior di latte' },
                { name: 'Mozzarella di bufala' },
                { name: 'Low-moisture mozzarella' },
                { name: 'Shredded mozzarella' },
                { name: 'Mozzarella pizza block' },
              ],
            },
            {
              name: 'Provolone',
              children: [
                { name: 'Provolone Dolce' },
                { name: 'Provolone Piccante' },
              ],
            },
            { name: 'Burrata' },
            { name: 'Scamorza' },
            { name: 'Caciocavallo' },
            { name: 'Suluguni' },
            { name: 'Kashkaval' },
            { name: 'String cheese' },
          ],
        },
        {
          name: 'Processed cheese',
          children: [
            {
              name: 'Processed cheese blocks',
              children: [
                { name: 'Plain processed cheese block' },
                { name: 'Smoked processed cheese block' },
              ],
            },
            {
              name: 'Processed cheese slices',
              children: [
                { name: 'Burger slices' },
                { name: 'Sandwich slices' },
              ],
            },
            { name: 'Cheese spread' },
            { name: 'Cheese sauce' },
            { name: 'Analogue pizza cheese' },
            { name: 'Cheese powder' },
            { name: 'Portion cheese triangles' },
          ],
        },
        {
          name: 'Whey cheese',
          children: [
            { name: 'Ricotta salata' },
            { name: 'Brunost' },
            { name: 'Anari' },
            { name: 'Mizithra' },
          ],
        },
        {
          name: 'Smoked cheese',
          children: [
            { name: 'Smoked Gouda' },
            { name: 'Smoked Scamorza' },
            { name: 'Smoked Cheddar' },
            { name: 'Oscypek' },
            { name: 'Smoked Suluguni' },
          ],
        },
      ],
    },
  ],
};
