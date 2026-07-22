import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Four levels throughout: machine family (L2, frozen) → system (L3: engine, driveline,
 * hydraulics, electrics, wear parts…) → named component (L4), which is how a parts buyer
 * actually narrows a search before matching by OEM number in the attribute schema.
 */
export const sparePartsForMachinery: TaxCategory = {
  name: 'Spare parts for machinery',
  emoji: '🔧',
  tint: TINT.stone,
  children: [
    {
      name: 'Loader & excavator parts',
      ru: 'Запчасти для погрузчиков и экскаваторов',
      children: [
        {
          name: 'Engine parts',
          children: [
            { name: 'Cylinder heads' },
            { name: 'Piston & liner kits' },
            { name: 'Crankshafts' },
            { name: 'Turbochargers' },
            { name: 'Injection pumps' },
            { name: 'Injectors' },
            { name: 'Water pumps' },
            { name: 'Radiators & oil coolers' },
            { name: 'Gasket sets' },
          ],
        },
        {
          name: 'Hydraulics',
          children: [
            { name: 'Main hydraulic pumps' },
            { name: 'Travel motors' },
            { name: 'Swing motors' },
            { name: 'Boom cylinders' },
            { name: 'Arm & bucket cylinders' },
            { name: 'Control valves' },
            { name: 'Cylinder seal kits' },
            { name: 'Hydraulic hoses & fittings' },
          ],
        },
        {
          name: 'Undercarriage',
          children: [
            { name: 'Track chains' },
            { name: 'Track shoes' },
            { name: 'Track rollers' },
            { name: 'Carrier rollers' },
            { name: 'Idlers' },
            { name: 'Sprockets' },
            { name: 'Track adjusters' },
          ],
        },
        {
          name: 'Transmission & driveline',
          children: [
            { name: 'Gearboxes' },
            { name: 'Torque converters' },
            { name: 'Axles & differentials' },
            { name: 'Final drives' },
            { name: 'Driveshafts' },
            { name: 'Clutch packs' },
          ],
        },
        {
          name: 'Ground-engaging tools',
          children: [
            { name: 'Bucket teeth' },
            { name: 'Tooth adapters' },
            { name: 'Cutting edges' },
            { name: 'Side cutters' },
            { name: 'Wear plates' },
            { name: 'Bucket pins & bushings' },
          ],
        },
        {
          name: 'Tyres & wheels',
          children: [{ name: 'Loader tyres' }, { name: 'Solid tyres' }, { name: 'Rims' }, { name: 'Wheel hubs' }],
        },
        {
          name: 'Filters',
          children: [
            { name: 'Engine oil filters' },
            { name: 'Fuel filters' },
            { name: 'Hydraulic filters' },
            { name: 'Air filters' },
            { name: 'Cabin filters' },
          ],
        },
        {
          name: 'Electrical parts',
          children: [
            { name: 'Starters' },
            { name: 'Alternators' },
            { name: 'Batteries' },
            { name: 'Wiring harnesses' },
            { name: 'Sensors & senders' },
            { name: 'Monitors & display panels' },
            { name: 'Work lights' },
          ],
        },
        {
          name: 'Bearings & seals',
          children: [{ name: 'Roller bearings' }, { name: 'Ball bearings' }, { name: 'Oil seals' }, { name: 'O-ring & seal kits' }],
        },
        {
          name: 'Cab & bodywork',
          children: [{ name: 'Cab glass' }, { name: 'Operator seats' }, { name: 'Mirrors' }, { name: 'Door & panel sets' }],
        },
      ],
    },
    {
      name: 'Other machinery parts',
      ru: 'Запчасти для прочих с/х машин',
      children: [
        {
          name: 'Sprayer parts',
          children: [
            { name: 'Diaphragm pumps' },
            { name: 'Spray nozzles' },
            { name: 'Nozzle bodies' },
            { name: 'Boom sections' },
            { name: 'Spray tanks' },
            { name: 'Pressure regulators' },
            { name: 'Rate controllers' },
          ],
        },
        {
          name: 'Tillage wear parts',
          children: [
            { name: 'Plough shares' },
            { name: 'Mouldboards' },
            { name: 'Disc blades' },
            { name: 'Cultivator tines' },
            { name: 'Cultivator points' },
            { name: 'Rotavator blades' },
            { name: 'Subsoiler legs' },
            { name: 'Packer rings' },
          ],
        },
        {
          name: 'Irrigation parts',
          children: [
            { name: 'Pivot gearboxes' },
            { name: 'Pivot drive motors' },
            { name: 'Sprinkler heads' },
            { name: 'Drip emitters' },
            { name: 'Pump impellers' },
            { name: 'Mechanical seals' },
            { name: 'Pipe couplings' },
          ],
        },
        {
          name: 'Livestock equipment parts',
          children: [
            { name: 'Milking liners' },
            { name: 'Milking clusters' },
            { name: 'Vacuum pumps' },
            { name: 'Pulsators' },
            { name: 'Feed mixer knives' },
            { name: 'Manure scraper parts' },
            { name: 'Ventilation fan motors' },
          ],
        },
        {
          name: 'Grain-handling parts',
          children: [
            { name: 'Elevator belts' },
            { name: 'Elevator buckets' },
            { name: 'Auger flighting' },
            { name: 'Conveyor chains' },
            { name: 'Cleaner sieves' },
            { name: 'Dryer burners' },
          ],
        },
        {
          name: 'PTO & driveline',
          children: [{ name: 'PTO shafts' }, { name: 'Universal joints' }, { name: 'Shear bolt clutches' }, { name: 'Slip clutches' }, { name: 'PTO guards' }],
        },
        {
          name: 'Hydraulics',
          children: [{ name: 'Gear pumps' }, { name: 'Hydraulic cylinders' }, { name: 'Spool valves' }, { name: 'Hoses & quick couplers' }],
        },
        {
          name: 'Bearings & seals',
          children: [{ name: 'Agricultural hub bearings' }, { name: 'Flange bearing units' }, { name: 'Oil seals' }, { name: 'Bushings' }],
        },
        {
          name: 'Filters',
          children: [{ name: 'Oil filters' }, { name: 'Fuel filters' }, { name: 'Air filters' }, { name: 'Hydraulic filters' }],
        },
        {
          name: 'Tyres & wheels',
          children: [{ name: 'Implement tyres' }, { name: 'Flotation tyres' }, { name: 'Rims' }, { name: 'Inner tubes' }],
        },
        {
          name: 'Electrical parts',
          children: [{ name: 'Wiring harnesses' }, { name: 'Lighting kits' }, { name: 'Sensors' }, { name: 'Control terminals' }],
        },
      ],
    },
    {
      name: 'Forage machinery parts',
      ru: 'Запчасти для кормозаготовительной техники',
      children: [
        {
          name: 'Mower parts',
          children: [
            { name: 'Disc mower blades' },
            { name: 'Mower discs' },
            { name: 'Cutter bars' },
            { name: 'Mower gearboxes' },
            { name: 'Conditioner rollers' },
            { name: 'Conditioner tines' },
            { name: 'Sickle sections' },
          ],
        },
        {
          name: 'Rake & tedder parts',
          children: [
            { name: 'Rake tines' },
            { name: 'Tedder tines' },
            { name: 'Tine arms' },
            { name: 'Rotor gearboxes' },
            { name: 'Cam tracks' },
          ],
        },
        {
          name: 'Baler parts',
          children: [
            { name: 'Pickup tines' },
            { name: 'Baler knives' },
            { name: 'Knotters' },
            { name: 'Needles' },
            { name: 'Baler belts' },
            { name: 'Baler chains' },
            { name: 'Net wrap rollers' },
            { name: 'Plunger bearings' },
            { name: 'Rotor teeth' },
          ],
        },
        {
          name: 'Wrapper parts',
          children: [{ name: 'Film stretchers' }, { name: 'Wrapping arms' }, { name: 'Film cutters' }, { name: 'Wrapper rollers' }],
        },
        {
          name: 'Forage harvester parts',
          children: [
            { name: 'Chopper drum knives' },
            { name: 'Shear bars' },
            { name: 'Cracker rollers' },
            { name: 'Feed rollers' },
            { name: 'Blowers & accelerators' },
            { name: 'Spout parts' },
            { name: 'Row-crop header parts' },
          ],
        },
        {
          name: 'Driveline',
          children: [{ name: 'PTO shafts' }, { name: 'Universal joints' }, { name: 'Slip clutches' }, { name: 'Drive belts' }, { name: 'Roller chains' }],
        },
        {
          name: 'Hydraulics',
          children: [{ name: 'Lift cylinders' }, { name: 'Hydraulic valves' }, { name: 'Hoses & couplers' }, { name: 'Seal kits' }],
        },
        {
          name: 'Bearings & seals',
          children: [{ name: 'Rotor bearings' }, { name: 'Tine bar bearings' }, { name: 'Oil seals' }, { name: 'Bushings' }],
        },
        {
          name: 'Tyres & wheels',
          children: [{ name: 'Implement tyres' }, { name: 'Gauge wheels' }, { name: 'Rims' }],
        },
        {
          name: 'Electrical parts',
          children: [{ name: 'Bale monitors' }, { name: 'Sensors' }, { name: 'Wiring harnesses' }, { name: 'Control boxes' }],
        },
      ],
    },
    {
      name: 'Combine parts',
      ru: 'Запчасти для комбайнов',
      children: [
        {
          name: 'Threshing & separation',
          children: [
            { name: 'Threshing drums' },
            { name: 'Rasp bars' },
            { name: 'Concaves' },
            { name: 'Straw walkers' },
            { name: 'Rotor bars' },
            { name: 'Separator grates' },
            { name: 'Beater drums' },
          ],
        },
        {
          name: 'Cleaning system',
          children: [
            { name: 'Upper sieves' },
            { name: 'Lower sieves' },
            { name: 'Chaffers' },
            { name: 'Cleaning fans' },
            { name: 'Grain pans' },
            { name: 'Return augers' },
          ],
        },
        {
          name: 'Header parts',
          children: [
            { name: 'Knife sections' },
            { name: 'Knife guards' },
            { name: 'Knife drive heads' },
            { name: 'Reel tines' },
            { name: 'Reel bats' },
            { name: 'Feed augers' },
            { name: 'Header auger fingers' },
            { name: 'Skid plates' },
          ],
        },
        {
          name: 'Feeder house',
          children: [{ name: 'Feeder chains' }, { name: 'Feeder slats' }, { name: 'Feeder sprockets' }, { name: 'Stone traps' }],
        },
        {
          name: 'Straw chopper & spreader',
          children: [{ name: 'Chopper knives' }, { name: 'Counter knives' }, { name: 'Chopper rotors' }, { name: 'Chaff spreader discs' }],
        },
        {
          name: 'Engine parts',
          children: [
            { name: 'Cylinder heads' },
            { name: 'Piston kits' },
            { name: 'Turbochargers' },
            { name: 'Injectors' },
            { name: 'Injection pumps' },
            { name: 'Radiators' },
            { name: 'Water pumps' },
          ],
        },
        {
          name: 'Transmission & driveline',
          children: [
            { name: 'Variator pulleys' },
            { name: 'Hydrostatic pumps' },
            { name: 'Hydrostatic motors' },
            { name: 'Final drives' },
            { name: 'Drive belts' },
            { name: 'Roller chains' },
            { name: 'Gearboxes' },
          ],
        },
        {
          name: 'Hydraulics',
          children: [{ name: 'Header lift cylinders' }, { name: 'Steering cylinders' }, { name: 'Hydraulic pumps' }, { name: 'Valve blocks' }, { name: 'Seal kits' }],
        },
        {
          name: 'Filters',
          children: [{ name: 'Engine oil filters' }, { name: 'Fuel filters' }, { name: 'Hydraulic filters' }, { name: 'Air filters' }, { name: 'Cabin filters' }],
        },
        {
          name: 'Bearings & seals',
          children: [{ name: 'Drum bearings' }, { name: 'Straw walker bearings' }, { name: 'Wobble box bearings' }, { name: 'Oil seals' }],
        },
        {
          name: 'Tyres & wheels',
          children: [{ name: 'Drive wheel tyres' }, { name: 'Steering axle tyres' }, { name: 'Rims' }, { name: 'Track kits' }],
        },
        {
          name: 'Electrical parts',
          children: [
            { name: 'Yield monitors' },
            { name: 'Moisture sensors' },
            { name: 'Speed sensors' },
            { name: 'Wiring harnesses' },
            { name: 'Alternators' },
            { name: 'Starters' },
          ],
        },
      ],
    },
    {
      name: 'Harvester parts',
      ru: 'Запчасти для уборочной техники',
      children: [
        {
          name: 'Potato harvester parts',
          children: [
            { name: 'Digging shares' },
            { name: 'Web belts' },
            { name: 'Web rollers' },
            { name: 'Haulm rollers' },
            { name: 'Star rollers' },
            { name: 'Picking table belts' },
          ],
        },
        {
          name: 'Beet harvester parts',
          children: [
            { name: 'Lifting shares' },
            { name: 'Scalping knives' },
            { name: 'Topper flails' },
            { name: 'Cleaning turbines' },
            { name: 'Sieve stars' },
          ],
        },
        {
          name: 'Sugarcane harvester parts',
          children: [
            { name: 'Base cutter blades' },
            { name: 'Chopper drum blades' },
            { name: 'Topper discs' },
            { name: 'Extractor fans' },
            { name: 'Crop dividers' },
            { name: 'Butt lifter rollers' },
          ],
        },
        {
          name: 'Cotton picker parts',
          children: [{ name: 'Picker spindles' }, { name: 'Moistener pads' }, { name: 'Doffer columns' }, { name: 'Picker bars' }, { name: 'Cam tracks' }],
        },
        {
          name: 'Vegetable harvester parts',
          children: [{ name: 'Lifting belts' }, { name: 'Trimming knives' }, { name: 'Topping units' }, { name: 'Elevator chains' }],
        },
        {
          name: 'Grape & orchard harvester parts',
          children: [{ name: 'Shaker rods' }, { name: 'Catcher plates' }, { name: 'Destemmer rollers' }, { name: 'Conveyor buckets' }],
        },
        {
          name: 'Cutting & wear parts',
          children: [{ name: 'Knife sections' }, { name: 'Knife guards' }, { name: 'Wear strips' }, { name: 'Skid shoes' }, { name: 'Sieve segments' }],
        },
        {
          name: 'Hydraulics',
          children: [{ name: 'Hydraulic pumps' }, { name: 'Hydraulic motors' }, { name: 'Cylinders' }, { name: 'Valve blocks' }, { name: 'Hoses & couplers' }],
        },
        {
          name: 'Transmission & driveline',
          children: [{ name: 'Gearboxes' }, { name: 'Drive chains' }, { name: 'Drive belts' }, { name: 'PTO shafts' }, { name: 'Final drives' }],
        },
        {
          name: 'Bearings & seals',
          children: [{ name: 'Roller bearings' }, { name: 'Flange units' }, { name: 'Oil seals' }, { name: 'Bushings' }],
        },
        {
          name: 'Filters',
          children: [{ name: 'Hydraulic filters' }, { name: 'Fuel filters' }, { name: 'Air filters' }, { name: 'Oil filters' }],
        },
        {
          name: 'Electrical parts',
          children: [{ name: 'Sensors' }, { name: 'Control terminals' }, { name: 'Wiring harnesses' }, { name: 'Work lights' }],
        },
      ],
    },
    {
      name: 'Tractor parts',
      ru: 'Запчасти для тракторов',
      children: [
        {
          name: 'Engine parts',
          children: [
            { name: 'Cylinder heads' },
            { name: 'Piston & liner kits' },
            { name: 'Crankshafts' },
            { name: 'Camshafts' },
            { name: 'Connecting rods' },
            { name: 'Turbochargers' },
            { name: 'Injection pumps' },
            { name: 'Injectors' },
            { name: 'Water pumps' },
            { name: 'Radiators' },
            { name: 'Gasket sets' },
            { name: 'Engine mounts' },
          ],
        },
        {
          name: 'Transmission & driveline',
          children: [
            { name: 'Gearboxes' },
            { name: 'Clutch discs' },
            { name: 'Clutch pressure plates' },
            { name: 'Release bearings' },
            { name: 'Front axles' },
            { name: 'Differentials' },
            { name: 'Final drives' },
            { name: 'Driveshafts' },
            { name: 'PTO shafts' },
            { name: 'Synchroniser rings' },
          ],
        },
        {
          name: 'Hydraulics',
          children: [
            { name: 'Hydraulic pumps' },
            { name: 'Lift cylinders' },
            { name: 'Steering cylinders' },
            { name: 'Control valves' },
            { name: 'Lift arms' },
            { name: 'Top links' },
            { name: 'Hoses & quick couplers' },
            { name: 'Seal kits' },
          ],
        },
        {
          name: 'Brakes & steering',
          children: [
            { name: 'Brake discs' },
            { name: 'Brake pads & linings' },
            { name: 'Brake master cylinders' },
            { name: 'Steering pumps' },
            { name: 'Tie rods' },
            { name: 'King pins' },
          ],
        },
        {
          name: 'Tyres & wheels',
          children: [
            { name: 'Radial tractor tyres' },
            { name: 'Bias-ply tractor tyres' },
            { name: 'Row-crop tyres' },
            { name: 'Rims' },
            { name: 'Wheel weights' },
            { name: 'Inner tubes' },
          ],
        },
        {
          name: 'Filters',
          children: [
            { name: 'Engine oil filters' },
            { name: 'Fuel filters' },
            { name: 'Water separators' },
            { name: 'Hydraulic filters' },
            { name: 'Transmission filters' },
            { name: 'Air filters' },
            { name: 'Cabin filters' },
          ],
        },
        {
          name: 'Electrical parts',
          children: [
            { name: 'Starters' },
            { name: 'Alternators' },
            { name: 'Batteries' },
            { name: 'Ignition switches' },
            { name: 'Instrument clusters' },
            { name: 'Wiring harnesses' },
            { name: 'Sensors & senders' },
            { name: 'Work lights' },
            { name: 'Glow plugs' },
          ],
        },
        {
          name: 'Bearings & seals',
          children: [{ name: 'Wheel hub bearings' }, { name: 'Gearbox bearings' }, { name: 'Crankshaft seals' }, { name: 'O-ring kits' }],
        },
        {
          name: 'Cab & bodywork',
          children: [
            { name: 'Cab glass' },
            { name: 'Operator seats' },
            { name: 'Bonnets & panels' },
            { name: 'Mudguards' },
            { name: 'Mirrors' },
            { name: 'Air-conditioning parts' },
          ],
        },
        {
          name: 'Linkage & hitch',
          children: [{ name: 'Three-point linkage kits' }, { name: 'Drawbars' }, { name: 'Pick-up hitches' }, { name: 'Ballast weights' }],
        },
      ],
    },
    {
      name: 'Seeder parts',
      ru: 'Запчасти для посевной техники',
      children: [
        {
          name: 'Metering system',
          children: [
            { name: 'Seed discs' },
            { name: 'Metering rollers' },
            { name: 'Vacuum fans' },
            { name: 'Singulators' },
            { name: 'Seed ejectors' },
            { name: 'Fertiliser metering units' },
          ],
        },
        {
          name: 'Opener assemblies',
          children: [
            { name: 'Double-disc openers' },
            { name: 'Single-disc openers' },
            { name: 'Hoe openers' },
            { name: 'Opener boots' },
            { name: 'Seed tubes' },
            { name: 'Scrapers' },
          ],
        },
        {
          name: 'Closing & press wheels',
          children: [{ name: 'Press wheels' }, { name: 'Closing wheels' }, { name: 'Gauge wheels' }, { name: 'Wheel tyres' }, { name: 'Wheel arms' }],
        },
        {
          name: 'Row units',
          children: [{ name: 'Parallel linkages' }, { name: 'Row unit bushings' }, { name: 'Down-force springs' }, { name: 'Row cleaners' }, { name: 'Coulters' }],
        },
        {
          name: 'Seed & fertiliser distribution',
          children: [{ name: 'Distribution heads' }, { name: 'Seed hoses' }, { name: 'Air seeder fans' }, { name: 'Tank lids & screens' }, { name: 'Augers' }],
        },
        {
          name: 'Driveline',
          children: [{ name: 'Drive chains' }, { name: 'Sprockets' }, { name: 'Hex shafts' }, { name: 'Gearboxes' }, { name: 'PTO shafts' }],
        },
        {
          name: 'Hydraulics',
          children: [{ name: 'Fold cylinders' }, { name: 'Down-pressure cylinders' }, { name: 'Hydraulic motors' }, { name: 'Hoses & couplers' }, { name: 'Seal kits' }],
        },
        {
          name: 'Electrical & monitoring',
          children: [{ name: 'Seed sensors' }, { name: 'Monitor consoles' }, { name: 'Section control modules' }, { name: 'Wiring harnesses' }, { name: 'Electric drive motors' }],
        },
        {
          name: 'Bearings & seals',
          children: [{ name: 'Disc bearings' }, { name: 'Flange bearing units' }, { name: 'Oil seals' }, { name: 'Bushings' }],
        },
        {
          name: 'Wear parts',
          children: [{ name: 'Opener blades' }, { name: 'Tine points' }, { name: 'Furrow shoes' }, { name: 'Wear guards' }],
        },
      ],
    },
  ],
};
