import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Post-harvest and processing plant: process stage (L3) → machine type (L4), with a fifth
 * level only where the machine class itself splits the market (dryer type, mill type,
 * cold-room class). Buyers shop by process stage first, which is what L3 encodes.
 */
export const equipment: TaxCategory = {
  name: 'Equipment',
  emoji: '⚙️',
  tint: TINT.sky,
  children: [
    {
      name: 'Tank equipment',
      ru: 'Ёмкостное оборудование',
      children: [
        {
          name: 'Storage tanks',
          children: [
            { name: 'Stainless steel storage tanks' },
            { name: 'Vertical storage tanks' },
            { name: 'Horizontal storage tanks' },
            { name: 'Insulated storage tanks' },
            { name: 'Polyethylene tanks' },
            { name: 'Glass-lined tanks' },
          ],
        },
        {
          name: 'Process vessels',
          children: [
            { name: 'Jacketed mixing vessels' },
            { name: 'Reactors' },
            { name: 'Fermentation tanks' },
            { name: 'Vacuum vessels' },
            { name: 'Pressure vessels' },
          ],
        },
        {
          name: 'Cooling & heating tanks',
          children: [{ name: 'Milk cooling tanks' }, { name: 'Ice water tanks' }, { name: 'Heated jacketed tanks' }, { name: 'Cooling coils' }],
        },
        {
          name: 'Brewing & fermentation tanks',
          children: [{ name: 'Cylindroconical fermenters' }, { name: 'Bright beer tanks' }, { name: 'Wine tanks' }, { name: 'Mash tuns' }],
        },
        {
          name: 'Silos & bins',
          children: [{ name: 'Flour silos' }, { name: 'Powder silos' }, { name: 'Liquid silos' }, { name: 'Sugar bins' }],
        },
        {
          name: 'Transport & IBC tanks',
          children: [{ name: 'IBC containers' }, { name: 'Road tanker barrels' }, { name: 'Portable transport tanks' }],
        },
        {
          name: 'Tank fittings',
          children: [{ name: 'Agitators & mixers' }, { name: 'Manways & hatches' }, { name: 'Level sensors' }, { name: 'Sanitary valves' }, { name: 'CIP spray balls' }],
        },
      ],
    },
    {
      name: 'Grain-processing equipment',
      ru: 'Зерноперерабатывающее оборудование',
      children: [
        {
          name: 'Grain cleaners',
          children: [
            { name: 'Air-screen cleaners' },
            { name: 'Pre-cleaners' },
            { name: 'Fine cleaners' },
            { name: 'Destoners' },
            { name: 'Aspirators' },
            { name: 'Indent cylinder separators' },
          ],
        },
        {
          name: 'Graders & separators',
          children: [
            { name: 'Gravity separators' },
            { name: 'Rotary sieve graders' },
            { name: 'Optical colour sorters' },
            { name: 'Magnetic separators' },
            { name: 'Spiral separators' },
          ],
        },
        {
          name: 'Grain dryers',
          children: [
            { name: 'Continuous flow dryers' },
            { name: 'Batch dryers' },
            { name: 'Mixed-flow dryers' },
            { name: 'Cross-flow dryers' },
            { name: 'Mobile grain dryers' },
            { name: 'Low-temperature in-bin dryers' },
          ],
        },
        {
          name: 'Grain elevators & conveyors',
          children: [
            { name: 'Bucket elevators' },
            { name: 'Belt conveyors' },
            { name: 'Chain conveyors' },
            { name: 'Screw conveyors' },
            { name: 'Pneumatic conveying systems' },
            { name: 'Truck unloading pits' },
          ],
        },
        {
          name: 'Grain silos',
          children: [
            { name: 'Flat-bottom silos' },
            { name: 'Hopper-bottom silos' },
            { name: 'Corrugated steel silos' },
            { name: 'Aeration systems' },
            { name: 'Sweep augers' },
            { name: 'Temperature monitoring systems' },
          ],
        },
        {
          name: 'Flour mills',
          children: [
            { name: 'Roller mills' },
            { name: 'Stone mills' },
            { name: 'Plansifters' },
            { name: 'Purifiers' },
            { name: 'Bran finishers' },
            { name: 'Complete flour mill lines' },
          ],
        },
        {
          name: 'Rice milling equipment',
          children: [{ name: 'Paddy huskers' }, { name: 'Paddy separators' }, { name: 'Rice whiteners' }, { name: 'Silky polishers' }, { name: 'Rice graders' }],
        },
        {
          name: 'Groat & flake equipment',
          children: [{ name: 'Hullers' }, { name: 'Groat cutters' }, { name: 'Flaking mills' }, { name: 'Steam conditioners' }],
        },
        {
          name: 'Seed treatment equipment',
          children: [{ name: 'Seed treaters' }, { name: 'Seed coating drums' }, { name: 'Seed polishers' }, { name: 'Seed counters' }],
        },
        {
          name: 'Grain weighing & bagging',
          children: [{ name: 'Flow scales' }, { name: 'Bagging scales' }, { name: 'Big-bag filling stations' }, { name: 'Bag sewing machines' }, { name: 'Palletisers' }],
        },
        {
          name: 'Grain lab equipment',
          children: [{ name: 'Moisture meters' }, { name: 'Falling number testers' }, { name: 'NIR grain analysers' }, { name: 'Test weight scales' }, { name: 'Gluten washers' }],
        },
      ],
    },
    {
      name: 'Meat-processing equipment',
      ru: 'Мясоперерабатывающее оборудование',
      children: [
        {
          name: 'Slaughter line equipment',
          children: [
            { name: 'Stunning equipment' },
            { name: 'Bleeding rails' },
            { name: 'Dehiding machines' },
            { name: 'Scalding tanks' },
            { name: 'Dehairing machines' },
            { name: 'Carcass splitting saws' },
            { name: 'Overhead rail systems' },
          ],
        },
        {
          name: 'Cutting & deboning',
          children: [{ name: 'Band saws' }, { name: 'Cutting tables' }, { name: 'Deboning conveyors' }, { name: 'Skinning machines' }, { name: 'Membrane skinners' }],
        },
        {
          name: 'Mincers & grinders',
          children: [{ name: 'Table mincers' }, { name: 'Industrial meat grinders' }, { name: 'Frozen block grinders' }, { name: 'Mixer grinders' }],
        },
        {
          name: 'Bowl cutters & emulsifiers',
          children: [{ name: 'Vacuum bowl cutters' }, { name: 'Open bowl cutters' }, { name: 'Emulsifiers' }, { name: 'Colloid mills' }],
        },
        {
          name: 'Mixers & tumblers',
          children: [{ name: 'Paddle meat mixers' }, { name: 'Vacuum tumblers' }, { name: 'Massagers' }, { name: 'Brine injectors' }],
        },
        {
          name: 'Fillers & clippers',
          children: [{ name: 'Vacuum fillers' }, { name: 'Sausage linkers' }, { name: 'Clipping machines' }, { name: 'Portioning fillers' }, { name: 'Casing loaders' }],
        },
        {
          name: 'Smokehouses & thermal',
          children: [{ name: 'Smoking chambers' }, { name: 'Cooking chambers' }, { name: 'Smoke generators' }, { name: 'Climate maturing chambers' }, { name: 'Steam cookers' }],
        },
        {
          name: 'Chilling & freezing',
          children: [{ name: 'Blast freezers' }, { name: 'Spiral freezers' }, { name: 'Plate freezers' }, { name: 'Carcass chilling rooms' }, { name: 'Ice flake machines' }],
        },
        {
          name: 'Slicing & portioning',
          children: [{ name: 'Slicers' }, { name: 'Dicers' }, { name: 'Portion cutters' }, { name: 'Waterjet portioners' }],
        },
        {
          name: 'Meat packaging',
          children: [{ name: 'Vacuum packers' }, { name: 'Thermoforming lines' }, { name: 'Tray sealers' }, { name: 'MAP packaging machines' }, { name: 'Shrink tunnels' }],
        },
        {
          name: 'By-product processing',
          children: [{ name: 'Rendering plants' }, { name: 'Blood processing units' }, { name: 'Casing cleaning lines' }, { name: 'Bone separators' }],
        },
      ],
    },
    {
      name: 'Dairy equipment',
      ru: 'Оборудование для молочной промышленности',
      children: [
        {
          name: 'Pasteurisers',
          children: [{ name: 'Plate pasteurisers' }, { name: 'Tubular pasteurisers' }, { name: 'Batch (vat) pasteurisers' }, { name: 'UHT sterilisers' }],
        },
        {
          name: 'Homogenisers',
          children: [{ name: 'Single-stage homogenisers' }, { name: 'Two-stage homogenisers' }, { name: 'Aseptic homogenisers' }],
        },
        {
          name: 'Separators & clarifiers',
          children: [{ name: 'Cream separators' }, { name: 'Milk clarifiers' }, { name: 'Bactofuges' }, { name: 'Standardisation units' }],
        },
        {
          name: 'Cheese equipment',
          children: [
            { name: 'Cheese vats' },
            { name: 'Curd cutters' },
            { name: 'Cheese presses' },
            { name: 'Moulds & forms' },
            { name: 'Brining systems' },
            { name: 'Cheese ripening chambers' },
            { name: 'Cheese block cutters' },
          ],
        },
        {
          name: 'Butter & spread equipment',
          children: [{ name: 'Butter churns' }, { name: 'Continuous butter makers' }, { name: 'Butter moulding machines' }, { name: 'Spread crystallisers' }],
        },
        {
          name: 'Yogurt & fermented products',
          children: [{ name: 'Fermentation tanks' }, { name: 'Incubation rooms' }, { name: 'Culture dosing units' }, { name: 'Yogurt filling lines' }],
        },
        {
          name: 'Evaporation & drying',
          children: [{ name: 'Falling film evaporators' }, { name: 'Spray dryers' }, { name: 'Milk powder plants' }, { name: 'Whey drying lines' }],
        },
        {
          name: 'Membrane filtration',
          children: [{ name: 'Ultrafiltration units' }, { name: 'Reverse osmosis units' }, { name: 'Microfiltration units' }, { name: 'Nanofiltration units' }],
        },
        {
          name: 'CIP & sanitation',
          children: [{ name: 'CIP stations' }, { name: 'Spray balls & rotary jet heads' }, { name: 'Dosing stations' }, { name: 'Sanitary pumps' }, { name: 'Sanitary valve clusters' }],
        },
        {
          name: 'Ice cream equipment',
          children: [{ name: 'Continuous freezers' }, { name: 'Batch freezers' }, { name: 'Ageing vats' }, { name: 'Extrusion lines' }, { name: 'Hardening tunnels' }],
        },
        {
          name: 'Dairy filling & packing',
          children: [{ name: 'Pouch filling machines' }, { name: 'Carton filling machines' }, { name: 'Bottle filling lines' }, { name: 'Cup filling & sealing machines' }, { name: 'Aseptic fillers' }],
        },
        {
          name: 'Milk reception & lab',
          children: [{ name: 'Milk reception units' }, { name: 'Milk analysers' }, { name: 'Somatic cell counters' }, { name: 'Milk sampling systems' }],
        },
      ],
    },
    {
      name: 'Agri-waste processing equipment',
      ru: 'Оборудование для переработки с/х отходов',
      children: [
        {
          name: 'Biogas plants',
          children: [
            { name: 'Digesters' },
            { name: 'Gas holders' },
            { name: 'CHP units' },
            { name: 'Biogas upgrading units' },
            { name: 'Substrate feeders' },
            { name: 'Digestate separators' },
          ],
        },
        {
          name: 'Composting equipment',
          children: [{ name: 'Windrow turners' }, { name: 'In-vessel composters' }, { name: 'Compost screeners' }, { name: 'Aeration systems' }, { name: 'Compost mixers' }],
        },
        {
          name: 'Briquetting & pelleting',
          children: [{ name: 'Briquette presses' }, { name: 'Biomass pellet mills' }, { name: 'Straw briquette lines' }, { name: 'Sawdust dryers' }],
        },
        {
          name: 'Shredders & grinders',
          children: [{ name: 'Wood chippers' }, { name: 'Straw shredders' }, { name: 'Hammer mills for biomass' }, { name: 'Slow-speed shredders' }],
        },
        {
          name: 'Manure processing',
          children: [{ name: 'Screw press separators' }, { name: 'Belt press separators' }, { name: 'Manure dryers' }, { name: 'Poultry litter processing lines' }],
        },
        {
          name: 'Rendering & by-product plants',
          children: [{ name: 'Rendering cookers' }, { name: 'Meat & bone meal lines' }, { name: 'Fat separation units' }, { name: 'Odour control systems' }],
        },
        {
          name: 'Wastewater treatment',
          children: [{ name: 'DAF units' }, { name: 'Anaerobic reactors' }, { name: 'Aeration tanks' }, { name: 'Sludge dewatering presses' }, { name: 'Screening units' }],
        },
        {
          name: 'Pyrolysis & biochar',
          children: [{ name: 'Pyrolysis reactors' }, { name: 'Biochar kilns' }, { name: 'Gasifiers' }],
        },
      ],
    },
    {
      name: 'Feed production equipment',
      ru: 'Оборудование для производства кормов',
      children: [
        {
          name: 'Grinding equipment',
          children: [{ name: 'Hammer mills' }, { name: 'Roller mills' }, { name: 'Crumblers' }, { name: 'Disc mills' }],
        },
        {
          name: 'Mixing equipment',
          children: [{ name: 'Horizontal ribbon mixers' }, { name: 'Paddle mixers' }, { name: 'Vertical mixers' }, { name: 'Liquid addition systems' }, { name: 'Premix micro-dosing units' }],
        },
        {
          name: 'Pelleting equipment',
          children: [{ name: 'Ring die pellet mills' }, { name: 'Flat die pellet mills' }, { name: 'Conditioners' }, { name: 'Pellet coolers' }, { name: 'Pellet crumblers' }, { name: 'Die & roller sets' }],
        },
        {
          name: 'Extrusion equipment',
          children: [{ name: 'Single-screw extruders' }, { name: 'Twin-screw extruders' }, { name: 'Extruder dryers' }, { name: 'Vacuum coaters' }, { name: 'Aquafeed extrusion lines' }],
        },
        {
          name: 'Expanders & conditioners',
          children: [{ name: 'Expanders' }, { name: 'Steam conditioners' }, { name: 'Retention conditioners' }],
        },
        {
          name: 'Feed dosing & batching',
          children: [{ name: 'Batching scales' }, { name: 'Dosing screws' }, { name: 'Micro-ingredient dispensers' }, { name: 'Batch controllers' }],
        },
        {
          name: 'Feed handling & storage',
          children: [{ name: 'Feed silos' }, { name: 'Bucket elevators' }, { name: 'Chain conveyors' }, { name: 'Rotary distributors' }, { name: 'Sifters' }],
        },
        {
          name: 'Feed packing',
          children: [{ name: 'Bagging scales' }, { name: 'Bag sewing machines' }, { name: 'Big-bag stations' }, { name: 'Bulk loading spouts' }],
        },
        {
          name: 'Mineral & premix equipment',
          children: [{ name: 'Premix plants' }, { name: 'Mineral block presses' }, { name: 'Lick bucket filling lines' }],
        },
      ],
    },
    {
      name: 'Food production equipment',
      ru: 'Оборудование для производства продуктов питания',
      children: [
        {
          name: 'Bakery equipment',
          children: [
            { name: 'Spiral dough mixers' },
            { name: 'Dough dividers' },
            { name: 'Dough sheeters' },
            { name: 'Proofing cabinets' },
            { name: 'Deck ovens' },
            { name: 'Rotary rack ovens' },
            { name: 'Tunnel ovens' },
            { name: 'Bread slicers' },
          ],
        },
        {
          name: 'Pasta & noodle equipment',
          children: [{ name: 'Pasta extruders' }, { name: 'Pasta dryers' }, { name: 'Ravioli machines' }, { name: 'Noodle lines' }],
        },
        {
          name: 'Confectionery equipment',
          children: [{ name: 'Chocolate conches' }, { name: 'Tempering machines' }, { name: 'Enrobing lines' }, { name: 'Depositors' }, { name: 'Cooling tunnels' }, { name: 'Candy cookers' }],
        },
        {
          name: 'Fruit & vegetable processing',
          children: [
            { name: 'Washing & sorting lines' },
            { name: 'Peelers' },
            { name: 'Dicing & slicing machines' },
            { name: 'Blanchers' },
            { name: 'Juice presses' },
            { name: 'Pulpers & finishers' },
            { name: 'Evaporators for purée' },
          ],
        },
        {
          name: 'Drying & dehydration',
          children: [{ name: 'Tray dryers' }, { name: 'Belt dryers' }, { name: 'Freeze dryers' }, { name: 'Fluid bed dryers' }, { name: 'Solar dryers' }],
        },
        {
          name: 'Oil & fat processing',
          children: [{ name: 'Screw oil presses' }, { name: 'Cold press expellers' }, { name: 'Oil filters' }, { name: 'Refining lines' }, { name: 'Deodorisers' }],
        },
        {
          name: 'Canning & retort',
          children: [{ name: 'Can seamers' }, { name: 'Retort autoclaves' }, { name: 'Jar filling lines' }, { name: 'Capping machines' }, { name: 'Exhaust boxes' }],
        },
        {
          name: 'Beverage equipment',
          children: [{ name: 'Juice pasteurisers' }, { name: 'Carbonation units' }, { name: 'Bottling lines' }, { name: 'Water treatment units' }, { name: 'Brewery systems' }, { name: 'Distillation columns' }],
        },
        {
          name: 'Sugar & starch equipment',
          children: [{ name: 'Diffusers' }, { name: 'Crystallisers' }, { name: 'Centrifugals' }, { name: 'Starch separators' }, { name: 'Glucose syrup lines' }],
        },
        {
          name: 'Packaging machinery',
          children: [
            { name: 'Vertical form-fill-seal machines' },
            { name: 'Horizontal flow wrappers' },
            { name: 'Multihead weighers' },
            { name: 'Labelling machines' },
            { name: 'Cartoners' },
            { name: 'Shrink wrappers' },
            { name: 'Case packers' },
          ],
        },
        {
          name: 'Inspection & quality control',
          children: [{ name: 'Metal detectors' }, { name: 'X-ray inspection systems' }, { name: 'Checkweighers' }, { name: 'Vision inspection systems' }, { name: 'Lab analysers' }],
        },
        {
          name: 'Utilities & CIP',
          children: [{ name: 'Steam boilers' }, { name: 'Air compressors' }, { name: 'Chillers' }, { name: 'CIP skids' }, { name: 'Water purification units' }],
        },
      ],
    },
    {
      name: 'Poultry equipment',
      ru: 'Оборудование для птицеводства',
      children: [
        {
          name: 'Cage systems',
          children: [{ name: 'Layer battery cages' }, { name: 'Enriched colony cages' }, { name: 'Broiler cage systems' }, { name: 'Pullet rearing cages' }, { name: 'Breeder cages' }],
        },
        {
          name: 'Floor & aviary systems',
          children: [{ name: 'Aviary systems' }, { name: 'Floor rearing systems' }, { name: 'Nest boxes' }, { name: 'Perch systems' }, { name: 'Slat systems' }],
        },
        {
          name: 'Incubators & hatchery',
          children: [{ name: 'Setter incubators' }, { name: 'Hatcher units' }, { name: 'Single-stage incubators' }, { name: 'Egg candlers' }, { name: 'Chick handling lines' }, { name: 'Vaccination machines' }],
        },
        {
          name: 'Feeders',
          children: [{ name: 'Pan feeding systems' }, { name: 'Chain feeders' }, { name: 'Auger feeders' }, { name: 'Feed hoppers' }, { name: 'Chick feeder trays' }],
        },
        {
          name: 'Drinkers',
          children: [{ name: 'Nipple drinker lines' }, { name: 'Bell drinkers' }, { name: 'Cup drinkers' }, { name: 'Water medicators' }, { name: 'Pressure regulators' }],
        },
        {
          name: 'Climate control',
          children: [{ name: 'Tunnel ventilation fans' }, { name: 'Evaporative cooling pads' }, { name: 'Heaters & brooders' }, { name: 'Air inlets' }, { name: 'Climate controllers' }, { name: 'Fogging systems' }],
        },
        {
          name: 'Egg handling',
          children: [{ name: 'Egg collection belts' }, { name: 'Egg graders' }, { name: 'Egg washers' }, { name: 'Egg packers' }, { name: 'Egg trays & setters' }],
        },
        {
          name: 'Manure removal',
          children: [{ name: 'Manure belt systems' }, { name: 'Scraper systems' }, { name: 'Manure drying tunnels' }, { name: 'Manure conveyors' }],
        },
        {
          name: 'Poultry slaughter equipment',
          children: [{ name: 'Stunners' }, { name: 'Pluckers' }, { name: 'Scalders' }, { name: 'Evisceration lines' }, { name: 'Chilling spirals' }, { name: 'Cut-up lines' }],
        },
        {
          name: 'Lighting & monitoring',
          children: [{ name: 'Dimmable LED systems' }, { name: 'Bird weighing scales' }, { name: 'Farm management controllers' }, { name: 'Alarm systems' }],
        },
      ],
    },
    {
      name: 'Warehouse equipment',
      ru: 'Оборудование для складов и хранилищ',
      children: [
        {
          name: 'Cold rooms',
          children: [
            { name: 'Modular cold rooms' },
            { name: 'Freezer rooms' },
            { name: 'Controlled atmosphere (CA) rooms' },
            { name: 'Blast chillers' },
            { name: 'Ripening rooms' },
          ],
        },
        {
          name: 'Refrigeration units',
          children: [{ name: 'Condensing units' }, { name: 'Air coolers & evaporators' }, { name: 'Compressor racks' }, { name: 'Glycol chillers' }, { name: 'Ammonia refrigeration plants' }],
        },
        {
          name: 'Racking & shelving',
          children: [{ name: 'Pallet racking' }, { name: 'Drive-in racking' }, { name: 'Mobile racking' }, { name: 'Cantilever racking' }, { name: 'Mezzanine floors' }],
        },
        {
          name: 'Forklifts & handling',
          children: [
            { name: 'Counterbalance forklifts' },
            { name: 'Reach trucks' },
            { name: 'Electric pallet trucks' },
            { name: 'Order pickers' },
            { name: 'Stackers' },
            { name: 'Telescopic conveyors' },
          ],
        },
        {
          name: 'Weighbridges & scales',
          children: [{ name: 'Truck weighbridges' }, { name: 'Axle scales' }, { name: 'Platform scales' }, { name: 'Pallet scales' }, { name: 'Weighing indicators' }],
        },
        {
          name: 'Storage ventilation',
          children: [{ name: 'Potato store ventilation' }, { name: 'Onion drying systems' }, { name: 'Humidification systems' }, { name: 'Ethylene scrubbers' }, { name: 'Store control panels' }],
        },
        {
          name: 'Loading dock equipment',
          children: [{ name: 'Dock levellers' }, { name: 'Dock shelters' }, { name: 'Sectional doors' }, { name: 'High-speed doors' }, { name: 'Wheel guides' }],
        },
        {
          name: 'Sorting & packing lines',
          children: [{ name: 'Roller graders' }, { name: 'Optical fruit sorters' }, { name: 'Weight graders' }, { name: 'Box fillers' }, { name: 'Palletising robots' }],
        },
        {
          name: 'Storage containers',
          children: [{ name: 'Plastic pallet bins' }, { name: 'Wooden bulk bins' }, { name: 'Stillages' }, { name: 'Reefer containers' }],
        },
        {
          name: 'Warehouse safety & control',
          children: [{ name: 'Fire suppression systems' }, { name: 'Gas monitoring systems' }, { name: 'Warehouse management terminals' }, { name: 'Barcode & RFID scanners' }],
        },
      ],
    },
  ],
};
