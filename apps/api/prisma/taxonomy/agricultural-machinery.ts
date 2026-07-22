import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Machine class (L3) → configuration or working-width/format class (L4), with a fifth
 * level only where lots genuinely split further (combine class, baler chamber type,
 * tractor power band). Tillage, tractors and sprayers sit under `Other agricultural
 * machinery`, the only frozen level-2 that covers them.
 */
export const agriculturalMachinery: TaxCategory = {
  name: 'Agricultural machinery',
  emoji: '🚜',
  tint: TINT.mint,
  children: [
    {
      name: 'Agricultural trucks',
      ru: 'Грузовой с/х транспорт',
      children: [
        {
          name: 'Grain trucks',
          children: [{ name: 'Rigid grain tippers' }, { name: 'Grain tractor units' }, { name: 'Bulk blower trucks' }],
        },
        {
          name: 'Tipper trucks',
          children: [{ name: 'Rear tippers' }, { name: 'Three-way tippers' }, { name: 'Half-pipe tippers' }],
        },
        {
          name: 'Livestock trucks',
          children: [{ name: 'Cattle transporters' }, { name: 'Pig transporters' }, { name: 'Poultry crate trucks' }, { name: 'Double-deck livestock bodies' }],
        },
        {
          name: 'Refrigerated trucks',
          children: [{ name: 'Chilled produce bodies' }, { name: 'Frozen bodies' }, { name: 'Multi-temperature bodies' }],
        },
        {
          name: 'Milk tankers',
          children: [{ name: 'Insulated collection tankers' }, { name: 'Rigid milk tankers' }, { name: 'Tanker semi-trailers' }],
        },
        {
          name: 'Fuel & water tankers',
          children: [{ name: 'Diesel bowsers' }, { name: 'Water bowsers' }, { name: 'Slurry tankers' }],
        },
        {
          name: 'Flatbed & curtainside trucks',
          children: [{ name: 'Flatbed bodies' }, { name: 'Curtainside bodies' }, { name: 'Truck-mounted crane bodies' }],
        },
        {
          name: 'Pickups & field utility vehicles',
          children: [{ name: 'Single-cab pickups' }, { name: 'Double-cab pickups' }, { name: 'Farm UTVs' }, { name: 'ATVs' }],
        },
      ],
    },
    {
      name: 'Forage machinery',
      ru: 'Кормозаготовительная техника',
      children: [
        {
          name: 'Mowers',
          children: [
            { name: 'Disc mowers' },
            { name: 'Drum mowers' },
            { name: 'Mower conditioners' },
            { name: 'Butterfly mower combinations' },
            { name: 'Flail mowers' },
            { name: 'Sickle bar mowers' },
          ],
        },
        {
          name: 'Tedders',
          children: [{ name: 'Mounted rotary tedders' }, { name: 'Trailed rotary tedders' }, { name: 'Belt tedders' }],
        },
        {
          name: 'Rakes',
          children: [{ name: 'Single-rotor rakes' }, { name: 'Twin-rotor rakes' }, { name: 'Four-rotor rakes' }, { name: 'Belt mergers' }, { name: 'Wheel rakes' }],
        },
        {
          name: 'Balers',
          children: [
            {
              name: 'Round balers',
              children: [{ name: 'Fixed chamber' }, { name: 'Variable chamber' }, { name: 'Baler-wrapper combinations' }],
            },
            {
              name: 'Square balers',
              children: [{ name: 'Small square balers' }, { name: 'Large square balers' }, { name: 'High-density square balers' }],
            },
            { name: 'Silage balers' },
            { name: 'Straw & mini balers' },
          ],
        },
        {
          name: 'Bale wrappers',
          children: [{ name: 'Round bale wrappers' }, { name: 'Square bale wrappers' }, { name: 'Inline tube wrappers' }, { name: 'Self-loading wrappers' }],
        },
        {
          name: 'Forage harvesters',
          children: [
            { name: 'Self-propelled forage harvesters' },
            { name: 'Trailed forage harvesters' },
            { name: 'Maize headers' },
            { name: 'Grass pickup headers' },
            { name: 'Whole-crop headers' },
          ],
        },
        {
          name: 'Forage wagons',
          children: [{ name: 'Self-loading forage wagons' }, { name: 'Dual-purpose silage wagons' }, { name: 'Chopper wagons' }],
        },
        {
          name: 'Bale handling',
          children: [{ name: 'Bale grabs' }, { name: 'Bale spikes' }, { name: 'Bale trailers' }, { name: 'Bale stackers' }, { name: 'Bale shredders' }],
        },
        {
          name: 'Silage handling',
          children: [{ name: 'Silage block cutters' }, { name: 'Silage buckets' }, { name: 'Silage compactors' }, { name: 'Bag silage machines' }],
        },
        {
          name: 'Hay preservation',
          children: [{ name: 'Hay dryers' }, { name: 'Applicator systems' }, { name: 'Moisture testers' }],
        },
      ],
    },
    {
      name: 'Mini machinery',
      ru: 'Мини-техника',
      children: [
        {
          name: 'Power tillers',
          children: [{ name: 'Petrol power tillers' }, { name: 'Diesel power tillers' }, { name: 'Electric power tillers' }],
        },
        {
          name: 'Walk-behind tractors',
          children: [{ name: 'Single-axle walk-behind tractors' }, { name: 'Reversible-handlebar models' }, { name: 'Walk-behind tractor implements' }],
        },
        {
          name: 'Mini tractors',
          children: [
            { name: 'Sub-compact tractors (up to 25 hp)' },
            { name: 'Compact tractors (25-45 hp)' },
            { name: 'Orchard & vineyard mini tractors' },
            { name: 'Crawler mini tractors' },
          ],
        },
        {
          name: 'Mini loaders',
          children: [{ name: 'Mini skid-steer loaders' }, { name: 'Mini articulated loaders' }, { name: 'Mini excavators' }],
        },
        {
          name: 'Garden & lawn machinery',
          children: [{ name: 'Ride-on mowers' }, { name: 'Lawn tractors' }, { name: 'Push mowers' }, { name: 'Brush cutters' }, { name: 'Robotic mowers' }],
        },
        {
          name: 'Motoblock implements',
          children: [{ name: 'Mini ploughs' }, { name: 'Mini rotavators' }, { name: 'Mini potato diggers' }, { name: 'Mini seeders' }, { name: 'Snow blades' }],
        },
        {
          name: 'Handheld powered tools',
          children: [{ name: 'Chainsaws' }, { name: 'Hedge trimmers' }, { name: 'Backpack sprayers' }, { name: 'Blowers' }, { name: 'Earth augers' }],
        },
        {
          name: 'Greenhouse mini machinery',
          children: [{ name: 'Bed formers' }, { name: 'Soil steamers' }, { name: 'Greenhouse transplanters' }, { name: 'Mini trolleys' }],
        },
      ],
    },
    {
      name: 'Seeding machinery',
      ru: 'Посевная техника',
      children: [
        {
          name: 'Seed drills',
          children: [
            { name: 'Mechanical seed drills' },
            { name: 'Pneumatic seed drills' },
            { name: 'Disc seed drills' },
            { name: 'Tine seed drills' },
            { name: 'Direct (no-till) drills' },
            { name: 'Combination drills' },
          ],
        },
        {
          name: 'Precision planters',
          children: [
            { name: 'Vacuum precision planters' },
            { name: 'Mechanical precision planters' },
            { name: 'Maize planters' },
            { name: 'Sunflower planters' },
            { name: 'Sugar beet planters' },
            { name: 'Cotton planters' },
            { name: 'Strip-till planters' },
          ],
        },
        {
          name: 'Air seeders',
          children: [{ name: 'Trailed air seeders' }, { name: 'Front-tank air seeders' }, { name: 'Air carts' }, { name: 'Air booms' }],
        },
        {
          name: 'Transplanters',
          children: [
            { name: 'Vegetable transplanters' },
            { name: 'Rice transplanters' },
            { name: 'Tobacco transplanters' },
            { name: 'Automatic tray transplanters' },
          ],
        },
        {
          name: 'Broadcast seeders',
          children: [{ name: 'Mounted broadcast seeders' }, { name: 'Pneumatic broadcast seeders' }, { name: 'Grass & cover crop seeders' }, { name: 'ATV broadcast seeders' }],
        },
        {
          name: 'Potato planters',
          children: [{ name: 'Cup-belt potato planters' }, { name: 'Automatic potato planters' }, { name: 'Bed potato planters' }],
        },
        {
          name: 'Seedbed preparation',
          children: [{ name: 'Seedbed cultivators' }, { name: 'Rollers & packers' }, { name: 'Bed formers' }, { name: 'Mulch layers' }],
        },
        {
          name: 'Seeding precision systems',
          children: [{ name: 'Section control units' }, { name: 'Variable-rate controllers' }, { name: 'Seed monitors' }, { name: 'GPS guidance kits' }],
        },
      ],
    },
    {
      name: 'Trailers & semi-trailers',
      ru: 'Прицепы и полуприцепы',
      children: [
        {
          name: 'Tipping trailers',
          children: [{ name: 'Rear tipping trailers' }, { name: 'Three-way tipping trailers' }, { name: 'Half-pipe tipping trailers' }, { name: 'Dumper trailers' }],
        },
        {
          name: 'Grain trailers',
          children: [{ name: 'Grain tipping trailers' }, { name: 'Chaser bins' }, { name: 'Grain semi-trailers' }, { name: 'Walking-floor trailers' }],
        },
        {
          name: 'Livestock trailers',
          children: [{ name: 'Cattle trailers' }, { name: 'Sheep trailers' }, { name: 'Pig trailers' }, { name: 'Horse trailers' }],
        },
        {
          name: 'Low-bed trailers',
          children: [{ name: 'Machinery low-loaders' }, { name: 'Drop-deck trailers' }, { name: 'Extendable low-beds' }, { name: 'Plant trailers' }],
        },
        {
          name: 'Tanker trailers',
          children: [{ name: 'Slurry tankers' }, { name: 'Water tankers' }, { name: 'Fuel tanker trailers' }, { name: 'Milk tanker trailers' }],
        },
        {
          name: 'Flatbed & bale trailers',
          children: [{ name: 'Flatbed trailers' }, { name: 'Bale trailers' }, { name: 'Extendable bale trailers' }, { name: 'Silage side trailers' }],
        },
        {
          name: 'Refrigerated semi-trailers',
          children: [{ name: 'Single-temperature reefers' }, { name: 'Multi-temperature reefers' }, { name: 'Insulated box trailers' }],
        },
        {
          name: 'Container & curtainside trailers',
          children: [{ name: 'Container chassis' }, { name: 'Curtainside semi-trailers' }, { name: 'Box semi-trailers' }],
        },
      ],
    },
    {
      name: 'Other agricultural machinery',
      ru: 'Прочая сельскохозяйственная техника',
      children: [
        {
          name: 'Tractors',
          children: [
            {
              name: 'Wheeled tractors',
              children: [
                { name: 'Up to 80 hp' },
                { name: '80-150 hp' },
                { name: '150-250 hp' },
                { name: '250-400 hp' },
                { name: 'Above 400 hp' },
              ],
            },
            { name: 'Crawler tractors' },
            { name: 'Articulated tractors' },
            { name: 'Orchard & vineyard tractors' },
            { name: 'Utility tractors' },
            { name: 'Systems & tool-carrier tractors' },
          ],
        },
        {
          name: 'Ploughs',
          children: [
            { name: 'Mounted reversible ploughs' },
            { name: 'Semi-mounted reversible ploughs' },
            { name: 'Conventional mounted ploughs' },
            { name: 'Disc ploughs' },
            { name: 'Chisel ploughs' },
          ],
        },
        {
          name: 'Disc harrows',
          children: [{ name: 'Mounted disc harrows' }, { name: 'Trailed disc harrows' }, { name: 'Compact short discs' }, { name: 'Offset disc harrows' }],
        },
        {
          name: 'Cultivators',
          children: [{ name: 'Stubble cultivators' }, { name: 'Field cultivators' }, { name: 'Row-crop cultivators' }, { name: 'Inter-row hoes' }, { name: 'Spring-tine cultivators' }],
        },
        {
          name: 'Rotavators',
          children: [{ name: 'Mounted rotavators' }, { name: 'Heavy-duty rotavators' }, { name: 'Reverse-tine rotavators' }, { name: 'Orchard rotavators' }],
        },
        {
          name: 'Power harrows',
          children: [{ name: 'Rigid power harrows' }, { name: 'Folding power harrows' }, { name: 'Power harrow drill combinations' }],
        },
        {
          name: 'Subsoilers',
          children: [{ name: 'Mounted subsoilers' }, { name: 'Trailed subsoilers' }, { name: 'Mole ploughs' }, { name: 'Pan busters' }],
        },
        {
          name: 'Rollers & packers',
          children: [{ name: 'Cambridge rollers' }, { name: 'Crosskill rollers' }, { name: 'Flat rollers' }, { name: 'Silage rollers' }],
        },
        {
          name: 'Sprayers',
          children: [
            { name: 'Mounted field sprayers' },
            { name: 'Trailed field sprayers' },
            { name: 'Self-propelled sprayers' },
            { name: 'Orchard & vineyard sprayers' },
            { name: 'Mist blowers' },
            { name: 'Agricultural drones' },
          ],
        },
        {
          name: 'Loaders & telehandlers',
          children: [{ name: 'Front loaders' }, { name: 'Telehandlers' }, { name: 'Wheel loaders' }, { name: 'Skid-steer loaders' }, { name: 'Backhoe loaders' }],
        },
        {
          name: 'Orchard & vineyard machinery',
          children: [{ name: 'Pruning machines' }, { name: 'Vine pre-pruners' }, { name: 'Orchard platforms' }, { name: 'Tree shakers' }, { name: 'Leaf removers' }],
        },
        {
          name: 'Land improvement machinery',
          children: [{ name: 'Land levellers' }, { name: 'Laser levellers' }, { name: 'Stone pickers' }, { name: 'Stone burriers' }, { name: 'Ditchers' }, { name: 'Drainage ploughs' }],
        },
        {
          name: 'Precision farming systems',
          children: [{ name: 'GPS guidance systems' }, { name: 'Autosteer kits' }, { name: 'Yield mapping systems' }, { name: 'Soil sampling rigs' }, { name: 'Telematics units' }],
        },
      ],
    },
    {
      name: 'Fertilizer spreaders',
      ru: 'Техника для внесения удобрения',
      children: [
        {
          name: 'Broadcast spreaders',
          children: [
            { name: 'Single-disc broadcast spreaders' },
            { name: 'Twin-disc broadcast spreaders' },
            { name: 'Trailed broadcast spreaders' },
            { name: 'Weighing broadcast spreaders' },
          ],
        },
        {
          name: 'Pneumatic spreaders',
          children: [{ name: 'Mounted pneumatic spreaders' }, { name: 'Trailed pneumatic spreaders' }, { name: 'Boom spreaders' }],
        },
        {
          name: 'Liquid fertiliser applicators',
          children: [{ name: 'Dribble bar applicators' }, { name: 'Injection applicators' }, { name: 'UAN applicator booms' }, { name: 'Fertigation units' }],
        },
        {
          name: 'Manure spreaders',
          children: [{ name: 'Rear-discharge manure spreaders' }, { name: 'Side-discharge manure spreaders' }, { name: 'Vertical-beater spreaders' }, { name: 'Horizontal-beater spreaders' }],
        },
        {
          name: 'Slurry equipment',
          children: [{ name: 'Slurry tankers' }, { name: 'Trailing shoe applicators' }, { name: 'Disc injectors' }, { name: 'Umbilical systems' }, { name: 'Slurry mixers' }],
        },
        {
          name: 'Lime spreaders',
          children: [{ name: 'Trailed lime spreaders' }, { name: 'Belt lime spreaders' }, { name: 'Bulk lime bodies' }],
        },
        {
          name: 'Row-applied fertiliser units',
          children: [{ name: 'Starter fertiliser units' }, { name: 'Side-dress applicators' }, { name: 'Anhydrous ammonia applicators' }],
        },
        {
          name: 'Spreader control systems',
          children: [{ name: 'Weigh cell systems' }, { name: 'Variable-rate controllers' }, { name: 'Section control units' }, { name: 'Spread pattern testers' }],
        },
      ],
    },
    {
      name: 'Livestock machinery',
      ru: 'Техника для животноводства',
      children: [
        {
          name: 'Milking parlours',
          children: [
            { name: 'Herringbone parlours' },
            { name: 'Parallel (side-by-side) parlours' },
            { name: 'Rotary parlours' },
            { name: 'Tandem parlours' },
            { name: 'Robotic milking units' },
            { name: 'Mobile milking machines' },
          ],
        },
        {
          name: 'Milk cooling & storage',
          children: [{ name: 'Bulk milk coolers' }, { name: 'Direct expansion tanks' }, { name: 'Ice bank chillers' }, { name: 'Plate coolers' }],
        },
        {
          name: 'Feed mixers',
          children: [
            { name: 'Vertical auger TMR mixers' },
            { name: 'Horizontal auger TMR mixers' },
            { name: 'Paddle mixers' },
            { name: 'Self-propelled feed mixers' },
            { name: 'Self-loading mixer wagons' },
          ],
        },
        {
          name: 'Feeding systems',
          children: [{ name: 'Automatic feeding robots' }, { name: 'Feed pushers' }, { name: 'Feed conveyors' }, { name: 'Calf feeders' }, { name: 'Concentrate dispensers' }],
        },
        {
          name: 'Manure handling',
          children: [
            { name: 'Alley scrapers' },
            { name: 'Slurry pumps' },
            { name: 'Slurry separators' },
            { name: 'Manure conveyors' },
            { name: 'Bedding spreaders' },
            { name: 'Manure robots' },
          ],
        },
        {
          name: 'Barn equipment',
          children: [{ name: 'Cubicle systems' }, { name: 'Feed barriers' }, { name: 'Cow mattresses' }, { name: 'Cow brushes' }, { name: 'Drinking troughs' }],
        },
        {
          name: 'Animal handling',
          children: [{ name: 'Cattle crushes' }, { name: 'Race & gate systems' }, { name: 'Livestock weigh scales' }, { name: 'Hoof trimming crushes' }, { name: 'Loading ramps' }],
        },
        {
          name: 'Herd monitoring',
          children: [{ name: 'Activity collars' }, { name: 'Rumination sensors' }, { name: 'RFID ear tag readers' }, { name: 'Herd management software' }],
        },
        {
          name: 'Climate & ventilation',
          children: [{ name: 'Barn fans' }, { name: 'Misting & cooling systems' }, { name: 'Curtain systems' }, { name: 'Heat exchangers' }],
        },
        {
          name: 'Shearing & grooming',
          children: [{ name: 'Sheep shearing machines' }, { name: 'Clipper sets' }, { name: 'Wool presses' }],
        },
      ],
    },
    {
      name: 'Irrigation machinery',
      ru: 'Техника для полива и орошения',
      children: [
        {
          name: 'Centre pivot systems',
          children: [{ name: 'Fixed centre pivots' }, { name: 'Towable centre pivots' }, { name: 'Corner-arm pivots' }, { name: 'Pivot span & tower sets' }],
        },
        {
          name: 'Linear move systems',
          children: [{ name: 'Hose-fed linear systems' }, { name: 'Ditch-fed linear systems' }, { name: 'Universal linear-pivot units' }],
        },
        {
          name: 'Travelling gun irrigators',
          children: [{ name: 'Hose reel irrigators' }, { name: 'Boom-fitted hose reels' }, { name: 'Cable-drawn travelling guns' }],
        },
        {
          name: 'Sprinkler irrigation',
          children: [{ name: 'Impact sprinklers' }, { name: 'Rotor sprinklers' }, { name: 'Micro sprinklers' }, { name: 'Portable sprinkler sets' }, { name: 'Solid-set systems' }],
        },
        {
          name: 'Drip irrigation',
          children: [{ name: 'Drip tape systems' }, { name: 'Inline dripper lines' }, { name: 'Online dripper systems' }, { name: 'Subsurface drip systems' }, { name: 'Greenhouse drip kits' }],
        },
        {
          name: 'Pumps & pumping stations',
          children: [
            { name: 'Centrifugal pumps' },
            { name: 'Submersible pumps' },
            { name: 'Diesel pump units' },
            { name: 'Solar pump systems' },
            { name: 'Booster pumping stations' },
            { name: 'Floating pontoon pumps' },
          ],
        },
        {
          name: 'Filtration & fertigation',
          children: [{ name: 'Sand media filters' }, { name: 'Disc filters' }, { name: 'Screen filters' }, { name: 'Fertigation injectors' }, { name: 'Dosing pumps' }],
        },
        {
          name: 'Pipes & fittings',
          children: [{ name: 'Aluminium irrigation pipes' }, { name: 'PVC & HDPE pipes' }, { name: 'Lay-flat hoses' }, { name: 'Quick couplers' }, { name: 'Valves & hydrants' }],
        },
        {
          name: 'Irrigation control',
          children: [{ name: 'Irrigation controllers' }, { name: 'Soil moisture sensors' }, { name: 'Weather stations' }, { name: 'Remote telemetry units' }, { name: 'Variable-rate irrigation kits' }],
        },
        {
          name: 'Drainage equipment',
          children: [{ name: 'Drainage pumps' }, { name: 'Trenchers' }, { name: 'Drainage pipe layers' }, { name: 'Water control gates' }],
        },
      ],
    },
    {
      name: 'Harvesting machinery',
      ru: 'Уборочная техника',
      children: [
        {
          name: 'Combine harvesters',
          children: [
            {
              name: 'Self-propelled combines',
              children: [{ name: 'Straw walker combines' }, { name: 'Single rotor combines' }, { name: 'Twin rotor combines' }, { name: 'Hybrid combines' }, { name: 'Track-equipped combines' }],
            },
            { name: 'Trailed combines' },
            { name: 'Rice combines' },
            { name: 'Mini & plot combines' },
          ],
        },
        {
          name: 'Headers & platforms',
          children: [
            { name: 'Grain (auger) headers' },
            { name: 'Draper headers' },
            { name: 'Maize headers' },
            { name: 'Sunflower headers' },
            { name: 'Pickup headers' },
            { name: 'Rapeseed extension kits' },
            { name: 'Header trailers' },
          ],
        },
        {
          name: 'Forage harvesters',
          children: [{ name: 'Self-propelled forage harvesters' }, { name: 'Trailed forage harvesters' }, { name: 'Mounted forage harvesters' }],
        },
        {
          name: 'Potato harvesters',
          children: [{ name: 'Self-propelled potato harvesters' }, { name: 'Trailed potato harvesters' }, { name: 'Two-row potato harvesters' }, { name: 'Four-row potato harvesters' }, { name: 'Potato diggers' }],
        },
        {
          name: 'Beet harvesters',
          children: [{ name: 'Self-propelled beet harvesters' }, { name: 'Trailed beet harvesters' }, { name: 'Beet toppers' }, { name: 'Beet cleaner loaders' }],
        },
        {
          name: 'Sugarcane harvesters',
          children: [{ name: 'Single-row cane harvesters' }, { name: 'Two-row cane harvesters' }, { name: 'Track cane harvesters' }, { name: 'Cane loaders' }],
        },
        {
          name: 'Cotton pickers',
          children: [{ name: 'Spindle cotton pickers' }, { name: 'Cotton strippers' }, { name: 'Round-module builders' }, { name: 'Module haulers' }],
        },
        {
          name: 'Vegetable harvesters',
          children: [{ name: 'Carrot harvesters' }, { name: 'Onion harvesters' }, { name: 'Cabbage harvesters' }, { name: 'Pea & bean harvesters' }, { name: 'Leafy green harvesters' }, { name: 'Harvest aid platforms' }],
        },
        {
          name: 'Fruit & nut harvesters',
          children: [{ name: 'Grape harvesters' }, { name: 'Olive harvesters' }, { name: 'Nut shakers & sweepers' }, { name: 'Berry harvesters' }, { name: 'Orchard picking platforms' }],
        },
        {
          name: 'Threshers & reapers',
          children: [{ name: 'Multi-crop threshers' }, { name: 'Maize shellers' }, { name: 'Reaper binders' }, { name: 'Self-propelled reapers' }],
        },
        {
          name: 'Field grain handling',
          children: [{ name: 'Grain carts' }, { name: 'Field grain augers' }, { name: 'Bagging machines' }, { name: 'Grain vacs' }],
        },
      ],
    },
  ],
};
