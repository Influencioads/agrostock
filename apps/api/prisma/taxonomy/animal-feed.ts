import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Animal feed goes 5 levels deep on compound feed (species › animal › feeding phase) and 4 levels on
 * the protein meals, brans, hay and silage, because feed lots trade on species/phase and on named
 * protein grades (SBM 46 vs 48, sunflower 36 vs high-pro); the long-tail additives stop at level 3.
 */
export const animalFeed: TaxCategory = {
  name: 'Animal feed',
  emoji: '🧺',
  tint: TINT.green,
  children: [
    {
      name: 'Amino acids',
      ru: 'Аминокислоты',
      children: [
        {
          name: 'Lysine',
          children: [
            { name: 'L-Lysine HCl 98.5%' },
            { name: 'L-Lysine sulphate 70%' },
            { name: 'Liquid lysine 50%' },
          ],
        },
        {
          name: 'Methionine',
          children: [
            { name: 'DL-Methionine 99%' },
            { name: 'Liquid methionine hydroxy analogue 88%' },
            { name: 'Calcium salt of methionine hydroxy analogue' },
            { name: 'Rumen-protected methionine' },
          ],
        },
        {
          name: 'Threonine',
          children: [{ name: 'L-Threonine 98.5%' }],
        },
        {
          name: 'Tryptophan',
          children: [{ name: 'L-Tryptophan 98%' }],
        },
        {
          name: 'Valine',
          children: [{ name: 'L-Valine 98%' }],
        },
        {
          name: 'Arginine',
          children: [{ name: 'L-Arginine 98%' }],
        },
        {
          name: 'Glycine and glutamine',
          children: [{ name: 'Glycine 98%' }, { name: 'L-Glutamine 98%' }],
        },
        { name: 'Betaine', children: [{ name: 'Betaine anhydrous 96%' }, { name: 'Betaine HCl 93%' }] },
      ],
    },
    {
      name: 'Distillers grains',
      ru: 'Барда',
      children: [
        {
          name: 'Corn distillers grains',
          children: [
            { name: 'Dried distillers grains with solubles (DDGS)' },
            { name: 'Dried distillers grains (DDG)' },
            { name: 'Wet distillers grains (WDG)' },
            { name: 'Condensed distillers solubles (CDS)' },
            { name: 'High-protein corn distillers meal' },
          ],
        },
        {
          name: 'Wheat distillers grains',
          children: [
            { name: 'Wheat DDGS' },
            { name: 'Wet wheat distillers grains' },
            { name: 'Wheat distillers solubles' },
          ],
        },
        {
          name: 'Barley and rye distillers grains',
          children: [{ name: 'Barley DDGS' }, { name: 'Rye DDGS' }],
        },
        {
          name: 'Vinasse',
          children: [
            { name: 'Beet molasses vinasse' },
            { name: 'Cane molasses vinasse' },
            { name: 'Condensed molasses solubles (CMS)' },
          ],
        },
        { name: 'Brewers spent grain', children: [{ name: 'Dried brewers grains' }, { name: 'Wet brewers grains' }] },
      ],
    },
    {
      name: 'Vitamins',
      ru: 'Витамины',
      children: [
        {
          name: 'Fat-soluble vitamins',
          children: [
            { name: 'Vitamin A acetate 500 CWS' },
            { name: 'Vitamin D3 500' },
            { name: 'Vitamin E acetate 50% adsorbate' },
            { name: 'Vitamin K3 (menadione MSB/MNB)' },
            { name: '25-hydroxy vitamin D3' },
          ],
        },
        {
          name: 'B-group vitamins',
          children: [
            { name: 'Vitamin B1 thiamine mononitrate' },
            { name: 'Vitamin B2 riboflavin 80%' },
            { name: 'Vitamin B3 niacinamide 99%' },
            { name: 'Vitamin B5 calcium D-pantothenate' },
            { name: 'Vitamin B6 pyridoxine HCl' },
            { name: 'Vitamin B12 cyanocobalamin 1%' },
            { name: 'Biotin 2%' },
            { name: 'Folic acid 96%' },
          ],
        },
        {
          name: 'Vitamin C',
          children: [{ name: 'Ascorbic acid 99% feed grade' }, { name: 'Coated vitamin C 35%' }, { name: 'Ascorbyl polyphosphate' }],
        },
        {
          name: 'Choline and carnitine',
          children: [
            { name: 'Choline chloride 60% on corn cob' },
            { name: 'Choline chloride 70% liquid' },
            { name: 'L-Carnitine 50%' },
          ],
        },
        { name: 'Carotenoids and pigments', children: [{ name: 'Beta-carotene 10%' }, { name: 'Canthaxanthin 10%' }, { name: 'Astaxanthin 10%' }] },
      ],
    },
    {
      name: 'Liquid feed',
      ru: 'Жидкие корма',
      children: [
        { name: 'Cane molasses', children: [{ name: 'Blackstrap cane molasses' }, { name: 'Cane molasses blend' }] },
        { name: 'Beet molasses' },
        { name: 'Liquid whey', children: [{ name: 'Sweet liquid whey' }, { name: 'Acid liquid whey' }, { name: 'Condensed whey permeate' }] },
        { name: 'Urea-molasses liquid supplement' },
        { name: 'Feed-grade crude glycerine' },
        { name: 'Condensed corn steep liquor' },
        { name: 'Liquid protein blend for feedlots' },
        { name: 'Liquid piglet and calf feed' },
      ],
    },
    {
      name: 'Oilcake',
      ru: 'Жмых',
      children: [
        {
          name: 'Sunflower cake',
          children: [
            { name: 'Decorticated sunflower cake' },
            { name: 'Undecorticated sunflower cake' },
            { name: 'Cold-pressed sunflower cake' },
          ],
        },
        {
          name: 'Soybean cake',
          children: [{ name: 'Expeller soybean cake' }, { name: 'Cold-pressed soybean cake' }],
        },
        {
          name: 'Rapeseed cake',
          children: [{ name: 'Double-zero (00) rapeseed cake' }, { name: 'Cold-pressed rapeseed cake' }],
        },
        {
          name: 'Cottonseed cake',
          children: [{ name: 'Decorticated cottonseed cake' }, { name: 'Undecorticated cottonseed cake' }],
        },
        {
          name: 'Groundnut cake',
          children: [{ name: 'Decorticated groundnut cake' }, { name: 'Undecorticated groundnut cake' }],
        },
        { name: 'Linseed cake' },
        { name: 'Sesame cake' },
        { name: 'Mustard cake' },
        { name: 'Copra cake' },
        { name: 'Palm kernel cake' },
        { name: 'Maize germ cake' },
        { name: 'Safflower cake' },
        { name: 'Camelina cake' },
        { name: 'Hemp seed cake' },
        { name: 'Pumpkin seed cake' },
        { name: 'Milk thistle cake' },
      ],
    },
    {
      name: 'Beet pulp',
      ru: 'Жом',
      children: [
        { name: 'Dried beet pulp pellets' },
        { name: 'Dried beet pulp shreds' },
        { name: 'Molassed beet pulp' },
        { name: 'Unmolassed beet pulp' },
        { name: 'Pressed wet beet pulp' },
        { name: 'Ensiled beet pulp' },
        { name: 'Citrus pulp pellets' },
      ],
    },
    {
      name: 'Milk replacers',
      ru: 'Заменители молока',
      children: [
        {
          name: 'Calf milk replacer',
          children: [
            { name: 'Skim-milk-based calf milk replacer' },
            { name: 'Whey-protein calf milk replacer' },
            { name: 'Vegetable-protein calf milk replacer' },
            { name: 'Acidified calf milk replacer' },
          ],
        },
        {
          name: 'Piglet milk replacer',
          children: [{ name: 'Piglet pre-weaning milk replacer' }, { name: 'Piglet transition milk replacer' }],
        },
        { name: 'Lamb and kid milk replacer' },
        { name: 'Foal milk replacer' },
        { name: 'Colostrum replacer and supplement' },
        { name: 'Fur animal and pet milk replacer' },
      ],
    },
    {
      name: 'Fodder grain',
      ru: 'Зерно фуражное',
      children: [
        {
          name: 'Feed wheat',
          children: [{ name: 'Feed wheat class 5' }, { name: 'Off-grade milling wheat for feed' }],
        },
        {
          name: 'Feed barley',
          children: [{ name: 'Two-row feed barley' }, { name: 'Six-row feed barley' }],
        },
        {
          name: 'Feed maize',
          children: [{ name: 'Yellow dent feed maize' }, { name: 'White feed maize' }, { name: 'High-moisture feed maize' }],
        },
        { name: 'Feed oats' },
        { name: 'Feed rye' },
        { name: 'Feed triticale' },
        {
          name: 'Feed sorghum',
          children: [{ name: 'Red feed sorghum' }, { name: 'White feed sorghum' }],
        },
        { name: 'Feed peas' },
        { name: 'Feed millet' },
        { name: 'Feed lupin' },
        { name: 'Feed vetch' },
        { name: 'Broken rice for feed' },
      ],
    },
    {
      name: 'Compound feed',
      ru: 'Комбикорма',
      children: [
        {
          name: 'Poultry compound feed',
          children: [
            {
              name: 'Broiler feed',
              children: [
                { name: 'Broiler pre-starter' },
                { name: 'Broiler starter' },
                { name: 'Broiler grower' },
                { name: 'Broiler finisher' },
                { name: 'Broiler withdrawal feed' },
              ],
            },
            {
              name: 'Layer feed',
              children: [
                { name: 'Chick starter mash' },
                { name: 'Pullet grower feed' },
                { name: 'Pre-lay feed' },
                { name: 'Layer phase 1' },
                { name: 'Layer phase 2' },
              ],
            },
            {
              name: 'Breeder feed',
              children: [{ name: 'Broiler breeder rearing feed' }, { name: 'Broiler breeder layer feed' }, { name: 'Male breeder feed' }],
            },
            {
              name: 'Turkey feed',
              children: [{ name: 'Turkey starter' }, { name: 'Turkey grower' }, { name: 'Turkey finisher' }],
            },
            { name: 'Duck and goose feed', children: [{ name: 'Duck starter' }, { name: 'Duck grower-finisher' }, { name: 'Goose fattening feed' }] },
            { name: 'Quail feed' },
          ],
        },
        {
          name: 'Swine compound feed',
          children: [
            { name: 'Piglet pre-starter (creep feed)' },
            { name: 'Piglet starter' },
            { name: 'Swine grower feed' },
            { name: 'Swine finisher feed' },
            { name: 'Gestating sow feed' },
            { name: 'Lactating sow feed' },
            { name: 'Boar feed' },
          ],
        },
        {
          name: 'Cattle compound feed',
          children: [
            {
              name: 'Dairy cattle feed',
              children: [
                { name: 'High-yield dairy concentrate' },
                { name: 'Mid-lactation dairy feed' },
                { name: 'Dry-cow feed' },
                { name: 'Transition cow feed' },
              ],
            },
            {
              name: 'Beef cattle feed',
              children: [{ name: 'Backgrounding feed' }, { name: 'Feedlot growing feed' }, { name: 'Feedlot finishing feed' }],
            },
            {
              name: 'Calf and heifer feed',
              children: [{ name: 'Calf starter pellets' }, { name: 'Calf muesli feed' }, { name: 'Heifer rearing feed' }],
            },
            { name: 'Total mixed ration (TMR) concentrate' },
          ],
        },
        {
          name: 'Sheep and goat feed',
          children: [
            { name: 'Lamb creep feed' },
            { name: 'Lamb fattening feed' },
            { name: 'Ewe feed' },
            { name: 'Dairy goat feed' },
          ],
        },
        {
          name: 'Aqua feed',
          children: [
            { name: 'Carp feed', children: [{ name: 'Carp fry crumble' }, { name: 'Carp grower pellets' }] },
            { name: 'Trout feed', children: [{ name: 'Trout fry crumble' }, { name: 'Trout fingerling pellets' }, { name: 'Trout grower pellets' }] },
            { name: 'Tilapia feed', children: [{ name: 'Tilapia floating pellets' }, { name: 'Tilapia sinking pellets' }] },
            { name: 'Shrimp feed', children: [{ name: 'Shrimp starter crumble' }, { name: 'Shrimp grower pellets' }] },
            { name: 'Catfish and pangasius feed' },
            { name: 'Sturgeon feed' },
          ],
        },
        {
          name: 'Equine feed',
          children: [
            { name: 'Foal and youngstock feed' },
            { name: 'Maintenance horse feed' },
            { name: 'Performance horse feed' },
            { name: 'Broodmare feed' },
            { name: 'Horse muesli mix' },
          ],
        },
        {
          name: 'Rabbit and fur animal feed',
          children: [{ name: 'Rabbit grower pellets' }, { name: 'Doe and litter pellets' }, { name: 'Mink and fox feed' }],
        },
      ],
    },
    {
      name: 'Feed meal',
      ru: 'Мука кормовая',
      children: [
        {
          name: 'Fish meal',
          children: [
            { name: 'Anchovy fish meal 65%' },
            { name: 'Low-temperature (LT) fish meal 70%' },
            { name: 'Herring meal' },
            { name: 'Sardine meal' },
            { name: 'Tuna meal' },
            { name: 'Whitefish meal' },
          ],
        },
        {
          name: 'Meat and bone meal',
          children: [{ name: 'Meat and bone meal 45% protein' }, { name: 'Meat and bone meal 50% protein' }, { name: 'Pork meat meal' }],
        },
        {
          name: 'Poultry by-product meal',
          children: [{ name: 'Pet-food grade poultry meal' }, { name: 'Feed-grade poultry by-product meal' }],
        },
        { name: 'Hydrolysed feather meal' },
        { name: 'Blood meal', children: [{ name: 'Spray-dried blood meal' }, { name: 'Haemoglobin powder' }, { name: 'Spray-dried plasma protein' }] },
        { name: 'Bone meal' },
        {
          name: 'Insect meal',
          children: [{ name: 'Black soldier fly larvae meal' }, { name: 'Mealworm meal' }, { name: 'Housefly larvae meal' }],
        },
        { name: 'Krill and shrimp meal' },
        { name: 'Alfalfa meal', children: [{ name: 'Sun-cured alfalfa meal 17%' }, { name: 'Dehydrated alfalfa meal 20%' }] },
        { name: 'Grass meal' },
        { name: 'Seaweed and kelp meal' },
        { name: 'Shell and limestone flour' },
      ],
    },
    {
      name: 'Substandard products',
      ru: 'Некондиционные продукты',
      children: [
        { name: 'Grain screenings and dockage' },
        { name: 'Sprouted grain' },
        { name: 'Fusarium-damaged grain' },
        { name: 'Frost-damaged grain' },
        { name: 'Bakery meal (former foodstuffs)' },
        { name: 'Confectionery by-products' },
        { name: 'Off-grade oilseeds' },
        { name: 'Cull potatoes' },
        { name: 'Cull fruit and vegetables' },
        { name: 'Off-spec milk powder and whey' },
        { name: 'Broken pasta and noodle waste' },
      ],
    },
    {
      name: 'Bran',
      ru: 'Отруби',
      children: [
        {
          name: 'Wheat bran',
          children: [
            { name: 'Coarse wheat bran' },
            { name: 'Fine wheat bran' },
            { name: 'Wheat bran pellets' },
            { name: 'Wheat middlings' },
          ],
        },
        {
          name: 'Rice bran',
          children: [{ name: 'Full-fat rice bran' }, { name: 'Parboiled rice bran' }, { name: 'Stabilised rice bran' }],
        },
        {
          name: 'De-oiled rice bran',
          children: [{ name: 'De-oiled rice bran meal' }, { name: 'De-oiled rice bran pellets' }],
        },
        { name: 'Maize bran' },
        { name: 'Barley bran' },
        { name: 'Rye bran' },
        { name: 'Oat bran and hulls' },
        { name: 'Millet bran' },
        { name: 'Buckwheat husk' },
        { name: 'Soybean hulls' },
        { name: 'Sunflower hulls' },
      ],
    },
    {
      name: 'Premixes',
      ru: 'Премиксы',
      children: [
        {
          name: 'Vitamin premix',
          children: [{ name: 'Poultry vitamin premix' }, { name: 'Swine vitamin premix' }, { name: 'Ruminant vitamin premix' }],
        },
        {
          name: 'Trace mineral premix',
          children: [
            { name: 'Inorganic sulphate trace mineral premix' },
            { name: 'Hydroxy trace mineral premix' },
            { name: 'Chelated (organic) trace mineral premix' },
          ],
        },
        {
          name: 'Vitamin-mineral premix',
          children: [
            { name: 'Broiler premix 1%' },
            { name: 'Layer premix 1%' },
            { name: 'Dairy cow premix' },
            { name: 'Swine premix' },
            { name: 'Aqua premix' },
          ],
        },
        { name: 'Amino acid premix' },
        { name: 'Enzyme premix', children: [{ name: 'Phytase premix' }, { name: 'Xylanase premix' }, { name: 'Multi-enzyme premix' }] },
        { name: 'Medicated premix', children: [{ name: 'Coccidiostat premix' }, { name: 'Anthelmintic premix' }] },
        {
          name: 'Protein-vitamin-mineral concentrate',
          children: [{ name: 'Poultry PVMC 15%' }, { name: 'Swine PVMC 20%' }, { name: 'Cattle PVMC' }],
        },
      ],
    },
    {
      name: 'Probiotics',
      ru: 'Пробиотики',
      children: [
        { name: 'Bacillus-based probiotics', children: [{ name: 'Bacillus subtilis' }, { name: 'Bacillus licheniformis' }, { name: 'Bacillus coagulans' }] },
        { name: 'Lactobacillus-based probiotics', children: [{ name: 'Lactobacillus acidophilus' }, { name: 'Lactobacillus plantarum' }] },
        { name: 'Bifidobacterium probiotics' },
        { name: 'Enterococcus faecium probiotics' },
        {
          name: 'Yeast products',
          children: [{ name: 'Live yeast Saccharomyces cerevisiae' }, { name: 'Yeast culture' }, { name: 'Yeast cell wall (MOS)' }, { name: 'Selenium yeast' }],
        },
        { name: 'Multi-strain direct-fed microbials' },
        { name: 'Silage inoculants', children: [{ name: 'Homofermentative silage inoculant' }, { name: 'Heterofermentative silage inoculant' }] },
        { name: 'Prebiotics', children: [{ name: 'Fructo-oligosaccharides (FOS)' }, { name: 'Galacto-oligosaccharides (GOS)' }, { name: 'Beta-glucans' }] },
      ],
    },
    {
      name: 'Haylage',
      ru: 'Сенаж',
      children: [
        {
          name: 'Alfalfa haylage',
          children: [{ name: 'Wrapped round bale alfalfa haylage' }, { name: 'Wrapped square bale alfalfa haylage' }, { name: 'Clamp alfalfa haylage' }],
        },
        {
          name: 'Grass haylage',
          children: [{ name: 'Wrapped round bale grass haylage' }, { name: 'Wrapped square bale grass haylage' }, { name: 'Clamp grass haylage' }],
        },
        { name: 'Clover haylage' },
        { name: 'Ryegrass haylage' },
        { name: 'Vetch-oat haylage' },
        { name: 'Cereal wholecrop haylage' },
        { name: 'Horse haylage' },
      ],
    },
    {
      name: 'Hay',
      ru: 'Сено',
      children: [
        {
          name: 'Alfalfa hay',
          children: [
            { name: 'Small square alfalfa bales' },
            { name: 'Big square alfalfa bales' },
            { name: 'Round alfalfa bales' },
            { name: 'Sun-cured alfalfa pellets' },
            { name: 'Alfalfa cubes' },
            { name: 'Chopped alfalfa' },
          ],
        },
        {
          name: 'Timothy hay',
          children: [{ name: 'Timothy first cut' }, { name: 'Timothy second cut' }, { name: 'Timothy third cut' }, { name: 'Compressed timothy bales' }],
        },
        {
          name: 'Meadow hay',
          children: [{ name: 'Upland meadow hay' }, { name: 'Floodplain meadow hay' }],
        },
        { name: 'Clover hay' },
        { name: 'Ryegrass hay' },
        { name: 'Orchard grass hay' },
        { name: 'Oat hay' },
        { name: 'Sudan grass hay' },
        { name: 'Rhodes grass hay' },
        { name: 'Bermuda grass hay' },
        { name: 'Vetch hay' },
        { name: 'Esparto and sainfoin hay' },
      ],
    },
    {
      name: 'Silage',
      ru: 'Силос',
      children: [
        {
          name: 'Maize silage',
          children: [
            { name: 'Whole-crop maize silage' },
            { name: 'Corn cob mix (CCM)' },
            { name: 'Ear maize silage (earlage)' },
            { name: 'Snaplage' },
          ],
        },
        {
          name: 'Grass silage',
          children: [{ name: 'Ryegrass silage' }, { name: 'Clover-grass silage' }, { name: 'Meadow grass silage' }],
        },
        { name: 'Alfalfa silage' },
        { name: 'Sorghum silage' },
        { name: 'Cereal wholecrop silage', children: [{ name: 'Wholecrop wheat silage' }, { name: 'Wholecrop barley silage' }, { name: 'Wholecrop triticale silage' }] },
        { name: 'Sunflower silage' },
        { name: 'Beet pulp silage' },
        { name: 'Legume-cereal mix silage' },
      ],
    },
    {
      name: 'Feed salt',
      ru: 'Соль кормовая',
      children: [
        { name: 'Loose feed-grade sodium chloride' },
        { name: 'Iodised feed salt' },
        { name: 'Salt lick blocks' },
        { name: 'Mineralised salt blocks' },
        { name: 'Rock salt lumps' },
        { name: 'Himalayan rock salt licks' },
        { name: 'Sea salt feed grade' },
        { name: 'Mineral lick buckets' },
      ],
    },
    {
      name: 'Meal',
      ru: 'Шрот',
      children: [
        {
          name: 'Soybean meal',
          children: [
            { name: 'Soybean meal 46% protein' },
            { name: 'Soybean meal 48% protein (hi-pro dehulled)' },
            { name: 'Soybean meal 44% protein' },
            { name: 'Toasted full-fat soybean meal' },
          ],
        },
        {
          name: 'Sunflower meal',
          children: [
            { name: 'Sunflower meal 36% protein' },
            { name: 'Sunflower meal 38% protein (high-pro)' },
            { name: 'Sunflower meal 28% protein' },
            { name: 'Sunflower meal pellets' },
          ],
        },
        {
          name: 'Rapeseed and canola meal',
          children: [
            { name: 'Canola meal 36% protein' },
            { name: 'Double-zero (00) rapeseed meal' },
            { name: 'Rapeseed meal pellets' },
          ],
        },
        {
          name: 'Cottonseed meal',
          children: [{ name: 'Cottonseed meal 40% protein' }, { name: 'Decorticated cottonseed meal 45%' }, { name: 'Low-gossypol cottonseed meal' }],
        },
        {
          name: 'Groundnut meal',
          children: [{ name: 'Groundnut meal 45% protein' }, { name: 'Groundnut meal 50% protein' }],
        },
        { name: 'Linseed meal' },
        { name: 'Sesame meal' },
        { name: 'Mustard meal' },
        { name: 'Palm kernel meal' },
        { name: 'Copra meal' },
        { name: 'Maize germ meal' },
        { name: 'Safflower meal' },
        { name: 'Camelina meal' },
        { name: 'Guar korma meal' },
      ],
    },
    {
      name: 'Extruded feed',
      ru: 'Экструдированные корма',
      children: [
        { name: 'Extruded full-fat soybean' },
        { name: 'Extruded flaxseed' },
        { name: 'Extruded maize' },
        { name: 'Extruded peas and lupin' },
        { name: 'Extruded wheat bran' },
        { name: 'Extruded compound pellets' },
        { name: 'Extruded floating aqua feed' },
        { name: 'Extruded pet food kibble' },
        { name: 'Micronised and toasted cereals' },
      ],
    },
  ],
};
