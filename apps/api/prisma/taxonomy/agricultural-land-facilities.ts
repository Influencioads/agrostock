import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Real-estate style listings: land splits by use (L3) then tenure (L4) then area band
 * (L5, arable only); facilities split by facility type (L3) then construction or
 * enterprise class (L4), which is how a buyer of a barn, elevator or pond actually filters.
 */
export const agriculturalLandFacilities: TaxCategory = {
  name: 'Agricultural land & facilities',
  emoji: '🏞️',
  tint: TINT.green,
  children: [
    {
      name: 'Agricultural land plots',
      ru: 'Земельные участки с/х назначения',
      children: [
        {
          name: 'Arable land',
          children: [
            {
              name: 'Freehold arable',
              children: [{ name: 'Up to 50 ha' }, { name: '50-200 ha' }, { name: '200-1000 ha' }, { name: 'Above 1000 ha' }],
            },
            {
              name: 'Leasehold arable',
              children: [{ name: 'Up to 50 ha' }, { name: '50-200 ha' }, { name: '200-1000 ha' }, { name: 'Above 1000 ha' }],
            },
            { name: 'Land share (pai)' },
            { name: 'Long-term lease rights' },
          ],
        },
        {
          name: 'Irrigated land',
          children: [
            { name: 'Freehold irrigated land' },
            { name: 'Leasehold irrigated land' },
            { name: 'Pivot-equipped land' },
            { name: 'Drip-equipped land' },
            { name: 'Flood-irrigated land' },
          ],
        },
        {
          name: 'Pasture & hayland',
          children: [{ name: 'Freehold pasture' }, { name: 'Leasehold pasture' }, { name: 'Improved grassland' }, { name: 'Natural hayfields' }, { name: 'Grazing rights' }],
        },
        {
          name: 'Orchard land',
          children: [{ name: 'Freehold orchard land' }, { name: 'Leasehold orchard land' }, { name: 'Planted orchards' }, { name: 'Land prepared for planting' }],
        },
        {
          name: 'Vineyard land',
          children: [{ name: 'Freehold vineyard land' }, { name: 'Leasehold vineyard land' }, { name: 'Planted vineyards' }, { name: 'Appellation-registered plots' }],
        },
        {
          name: 'Plantation land',
          children: [{ name: 'Tea plantation land' }, { name: 'Coffee plantation land' }, { name: 'Oil palm plantation land' }, { name: 'Sugarcane plantation land' }, { name: 'Rubber plantation land' }],
        },
        {
          name: 'Rice paddy land',
          children: [{ name: 'Freehold paddy land' }, { name: 'Leasehold paddy land' }, { name: 'Canal-irrigated paddy' }],
        },
        {
          name: 'Land for greenhouses',
          children: [{ name: 'Serviced greenhouse plots' }, { name: 'Unserviced greenhouse plots' }, { name: 'Plots with existing structures' }],
        },
        {
          name: 'Forest & woodland',
          children: [{ name: 'Commercial timber woodland' }, { name: 'Shelterbelt woodland' }, { name: 'Agroforestry plots' }, { name: 'Forest lease plots' }],
        },
        {
          name: 'Land with development consent',
          children: [{ name: 'Livestock building consent' }, { name: 'Processing plant consent' }, { name: 'Solar & wind lease plots' }, { name: 'Change-of-use plots' }],
        },
        {
          name: 'Degraded & reclamation land',
          children: [{ name: 'Fallow land' }, { name: 'Saline & alkaline land' }, { name: 'Reclamation projects' }, { name: 'Peatland' }],
        },
      ],
    },
    {
      name: 'Processing facilities',
      ru: 'Перерабатывающие предприятия',
      children: [
        {
          name: 'Grain processing plants',
          children: [{ name: 'Flour mills' }, { name: 'Rice mills' }, { name: 'Groat & flake plants' }, { name: 'Malting plants' }, { name: 'Seed processing plants' }],
        },
        {
          name: 'Oilseed processing plants',
          children: [{ name: 'Crushing plants' }, { name: 'Cold press facilities' }, { name: 'Refineries' }, { name: 'Biodiesel plants' }],
        },
        {
          name: 'Dairy plants',
          children: [{ name: 'Liquid milk plants' }, { name: 'Cheese factories' }, { name: 'Butter plants' }, { name: 'Milk powder plants' }, { name: 'Artisan creameries' }],
        },
        {
          name: 'Meat processing plants',
          children: [{ name: 'Abattoirs' }, { name: 'Cutting plants' }, { name: 'Sausage factories' }, { name: 'Ready-meal plants' }, { name: 'Rendering plants' }],
        },
        {
          name: 'Poultry processing plants',
          children: [{ name: 'Broiler slaughter plants' }, { name: 'Cut-up & deboning plants' }, { name: 'Egg grading & packing plants' }, { name: 'Egg product plants' }],
        },
        {
          name: 'Fruit & vegetable processing plants',
          children: [{ name: 'Juice plants' }, { name: 'Purée & paste plants' }, { name: 'Freezing plants' }, { name: 'Drying plants' }, { name: 'Canning plants' }, { name: 'Pack houses' }],
        },
        {
          name: 'Fish processing plants',
          children: [{ name: 'Filleting plants' }, { name: 'Smoking & curing plants' }, { name: 'Fish freezing plants' }, { name: 'Fishmeal plants' }],
        },
        {
          name: 'Sugar & starch plants',
          children: [{ name: 'Sugar mills' }, { name: 'Sugar refineries' }, { name: 'Starch plants' }, { name: 'Glucose syrup plants' }],
        },
        {
          name: 'Feed mills',
          children: [{ name: 'Compound feed mills' }, { name: 'Premix plants' }, { name: 'Aquafeed plants' }, { name: 'Pet food plants' }],
        },
        {
          name: 'Beverage plants',
          children: [{ name: 'Breweries' }, { name: 'Wineries' }, { name: 'Distilleries' }, { name: 'Soft drink & water plants' }],
        },
      ],
    },
    {
      name: 'Greenhouses',
      ru: 'Теплицы',
      children: [
        {
          name: 'Glass greenhouses',
          children: [
            { name: 'Venlo glasshouses' },
            { name: 'Wide-span glasshouses' },
            { name: 'Diffuse-glass glasshouses' },
            { name: 'Semi-closed glasshouses' },
          ],
        },
        {
          name: 'Polyhouses',
          children: [
            { name: 'Single-span polyhouses' },
            { name: 'Multi-span polyhouses' },
            { name: 'Tunnel polyhouses' },
            { name: 'Gothic arch polyhouses' },
            { name: 'Naturally ventilated polyhouses' },
            { name: 'Fan-and-pad polyhouses' },
          ],
        },
        {
          name: 'Polycarbonate greenhouses',
          children: [{ name: 'Arched polycarbonate greenhouses' }, { name: 'Gable polycarbonate greenhouses' }, { name: 'Winter-grade polycarbonate greenhouses' }],
        },
        {
          name: 'Shade-net houses',
          children: [{ name: 'Flat-roof shade houses' }, { name: 'Dome shade houses' }, { name: 'Insect-proof net houses' }, { name: 'Retractable shade systems' }],
        },
        {
          name: 'Hydroponic facilities',
          children: [{ name: 'NFT systems' }, { name: 'Deep water culture systems' }, { name: 'Substrate (rockwool/coco) systems' }, { name: 'Aeroponic systems' }, { name: 'Vertical farms' }, { name: 'Container farms' }],
        },
        {
          name: 'Greenhouses by crop',
          children: [{ name: 'Tomato greenhouses' }, { name: 'Cucumber greenhouses' }, { name: 'Pepper greenhouses' }, { name: 'Leafy green greenhouses' }, { name: 'Flower greenhouses' }, { name: 'Berry greenhouses' }, { name: 'Nursery greenhouses' }],
        },
        {
          name: 'Greenhouses by scale',
          children: [{ name: 'Up to 0.5 ha' }, { name: '0.5-2 ha' }, { name: '2-10 ha' }, { name: 'Above 10 ha' }],
        },
        {
          name: 'Greenhouse systems',
          children: [{ name: 'Heating systems' }, { name: 'Screening systems' }, { name: 'CO2 dosing systems' }, { name: 'Grow light installations' }, { name: 'Climate computers' }, { name: 'Irrigation & fertigation units' }],
        },
        {
          name: 'Mushroom growing facilities',
          children: [{ name: 'Champignon growing rooms' }, { name: 'Oyster mushroom houses' }, { name: 'Compost & substrate units' }],
        },
      ],
    },
    {
      name: 'Farmsteads',
      ru: 'Хозяйства',
      children: [
        {
          name: 'Mixed farmsteads',
          children: [{ name: 'Freehold mixed farmsteads' }, { name: 'Leasehold mixed farmsteads' }, { name: 'Family farm holdings' }, { name: 'Farm estates with residence' }],
        },
        {
          name: 'Arable farmsteads',
          children: [{ name: 'Grain farmsteads' }, { name: 'Oilseed farmsteads' }, { name: 'Root crop farmsteads' }, { name: 'Farmsteads with machinery included' }],
        },
        {
          name: 'Livestock farmsteads',
          children: [{ name: 'Cattle farmsteads' }, { name: 'Sheep & goat farmsteads' }, { name: 'Pig farmsteads' }, { name: 'Horse farmsteads' }],
        },
        {
          name: 'Horticultural farmsteads',
          children: [{ name: 'Orchard farmsteads' }, { name: 'Vineyard estates' }, { name: 'Berry farmsteads' }, { name: 'Nursery holdings' }],
        },
        {
          name: 'Farmsteads by scale',
          children: [{ name: 'Smallholdings up to 20 ha' }, { name: '20-100 ha holdings' }, { name: '100-500 ha holdings' }, { name: 'Above 500 ha holdings' }],
        },
        {
          name: 'Farmstead buildings',
          children: [{ name: 'Farmhouses' }, { name: 'Machinery sheds' }, { name: 'Workshops' }, { name: 'Grain stores' }, { name: 'Barns & steadings' }],
        },
        {
          name: 'Agritourism holdings',
          children: [{ name: 'Farm stays & guesthouses' }, { name: 'Equestrian centres' }, { name: 'Pick-your-own farms' }, { name: 'Farm shops' }],
        },
        {
          name: 'Turnkey business sales',
          children: [{ name: 'Going-concern farm businesses' }, { name: 'Farms with contracts in place' }, { name: 'Share & partnership stakes' }],
        },
      ],
    },
    {
      name: 'Production facilities',
      ru: 'Производственные предприятия',
      children: [
        {
          name: 'Livestock production complexes',
          children: [{ name: 'Dairy complexes' }, { name: 'Beef feedlots' }, { name: 'Pig complexes' }, { name: 'Sheep complexes' }, { name: 'Rabbit units' }],
        },
        {
          name: 'Poultry production complexes',
          children: [{ name: 'Broiler houses' }, { name: 'Layer houses' }, { name: 'Breeder farms' }, { name: 'Hatcheries' }, { name: 'Turkey & duck units' }],
        },
        {
          name: 'Nurseries & propagation units',
          children: [{ name: 'Tree nurseries' }, { name: 'Seedling plug nurseries' }, { name: 'Tissue culture labs' }, { name: 'Ornamental nurseries' }],
        },
        {
          name: 'Seed production plants',
          children: [{ name: 'Seed conditioning plants' }, { name: 'Seed coating facilities' }, { name: 'Seed testing labs' }],
        },
        {
          name: 'Fertiliser & agrochemical plants',
          children: [{ name: 'Blending plants' }, { name: 'Organic fertiliser plants' }, { name: 'Compost production sites' }, { name: 'Formulation & packing units' }],
        },
        {
          name: 'Bioenergy plants',
          children: [{ name: 'Biogas plants' }, { name: 'Biomass pellet plants' }, { name: 'Bioethanol plants' }, { name: 'Solar farm sites' }],
        },
        {
          name: 'Beekeeping enterprises',
          children: [{ name: 'Commercial apiaries' }, { name: 'Honey extraction facilities' }, { name: 'Queen rearing units' }],
        },
        {
          name: 'Insect & alternative protein units',
          children: [{ name: 'Black soldier fly units' }, { name: 'Mealworm production units' }, { name: 'Algae production units' }],
        },
        {
          name: 'Workshops & service bases',
          children: [{ name: 'Machinery workshops' }, { name: 'Machinery yards' }, { name: 'Fuel depots' }, { name: 'Veterinary facilities' }],
        },
      ],
    },
    {
      name: 'Warehouses & elevators',
      ru: 'Склады, хранилища, элеваторы',
      children: [
        {
          name: 'Grain elevators',
          children: [
            { name: 'Concrete silo elevators' },
            { name: 'Steel silo elevators' },
            { name: 'Port terminal elevators' },
            { name: 'Rail-served elevators' },
            { name: 'Farm-scale elevators' },
          ],
        },
        {
          name: 'Flat grain stores',
          children: [{ name: 'Ventilated flat stores' }, { name: 'Non-ventilated flat stores' }, { name: 'Bunker stores' }],
        },
        {
          name: 'Cold stores',
          children: [{ name: 'Chilled cold stores' }, { name: 'Frozen cold stores' }, { name: 'Multi-chamber cold stores' }, { name: 'Blast freezing facilities' }],
        },
        {
          name: 'Controlled atmosphere stores',
          children: [{ name: 'CA apple stores' }, { name: 'ULO stores' }, { name: 'Dynamic CA stores' }],
        },
        {
          name: 'Root crop stores',
          children: [{ name: 'Potato stores' }, { name: 'Onion stores' }, { name: 'Carrot & root stores' }, { name: 'Box stores' }, { name: 'Bulk stores' }],
        },
        {
          name: 'Dry goods warehouses',
          children: [{ name: 'Dry ambient warehouses' }, { name: 'Bonded warehouses' }, { name: 'Fertiliser stores' }, { name: 'Feed stores' }, { name: 'Packaging stores' }],
        },
        {
          name: 'Logistics terminals',
          children: [{ name: 'Cross-dock terminals' }, { name: 'Container yards' }, { name: 'Port storage terminals' }, { name: 'Rail transhipment terminals' }],
        },
        {
          name: 'Tank farms',
          children: [{ name: 'Vegetable oil tank farms' }, { name: 'Molasses storage' }, { name: 'Liquid fertiliser tank farms' }, { name: 'Fuel storage depots' }],
        },
        {
          name: 'Warehouses by scale',
          children: [{ name: 'Up to 1000 m2' }, { name: '1000-5000 m2' }, { name: '5000-20000 m2' }, { name: 'Above 20000 m2' }],
        },
        {
          name: 'Warehouses by tenure',
          children: [{ name: 'Freehold warehouses' }, { name: 'Leasehold warehouses' }, { name: 'Build-to-suit projects' }, { name: 'Storage capacity rental' }],
        },
      ],
    },
    {
      name: 'Farms',
      ru: 'Фермы',
      children: [
        {
          name: 'Dairy farms',
          children: [
            { name: 'Tie-stall dairy farms' },
            { name: 'Free-stall dairy farms' },
            { name: 'Robotic milking farms' },
            { name: 'Grazing dairy farms' },
            { name: 'Goat dairy farms' },
            { name: 'Sheep dairy farms' },
          ],
        },
        {
          name: 'Beef & cattle farms',
          children: [{ name: 'Cow-calf operations' }, { name: 'Feedlots' }, { name: 'Stocker operations' }, { name: 'Pedigree breeding farms' }],
        },
        {
          name: 'Poultry farms',
          children: [{ name: 'Broiler farms' }, { name: 'Layer farms' }, { name: 'Free-range poultry farms' }, { name: 'Turkey farms' }, { name: 'Duck & goose farms' }, { name: 'Quail farms' }],
        },
        {
          name: 'Piggeries',
          children: [{ name: 'Farrow-to-finish units' }, { name: 'Breeding units' }, { name: 'Finishing units' }, { name: 'Outdoor pig units' }],
        },
        {
          name: 'Sheep & goat farms',
          children: [{ name: 'Meat sheep farms' }, { name: 'Wool sheep farms' }, { name: 'Meat goat farms' }, { name: 'Mixed small ruminant farms' }],
        },
        {
          name: 'Orchards',
          children: [{ name: 'Apple orchards' }, { name: 'Stone fruit orchards' }, { name: 'Citrus orchards' }, { name: 'Nut orchards' }, { name: 'Olive groves' }, { name: 'Tropical fruit orchards' }],
        },
        {
          name: 'Vineyards',
          children: [{ name: 'Wine grape vineyards' }, { name: 'Table grape vineyards' }, { name: 'Vineyards with winery' }, { name: 'Young plantings' }],
        },
        {
          name: 'Berry farms',
          children: [{ name: 'Strawberry farms' }, { name: 'Blueberry farms' }, { name: 'Raspberry farms' }, { name: 'Currant & gooseberry farms' }],
        },
        {
          name: 'Horse farms',
          children: [{ name: 'Stud farms' }, { name: 'Livery yards' }, { name: 'Training centres' }],
        },
        {
          name: 'Specialty animal farms',
          children: [{ name: 'Rabbit farms' }, { name: 'Deer farms' }, { name: 'Ostrich farms' }, { name: 'Fur farms' }, { name: 'Camel farms' }],
        },
        {
          name: 'Farms by tenure',
          children: [{ name: 'Freehold farms' }, { name: 'Leasehold farms' }, { name: 'Contract-managed farms' }, { name: 'Sale-and-leaseback offers' }],
        },
      ],
    },
    {
      name: 'Fish farms & ponds',
      ru: 'Рыбоводческие хозяйства, водоемы',
      children: [
        {
          name: 'Pond aquaculture',
          children: [{ name: 'Earthen ponds' }, { name: 'Lined ponds' }, { name: 'Nursery ponds' }, { name: 'Polyculture pond farms' }, { name: 'Wintering ponds' }],
        },
        {
          name: 'Recirculating systems (RAS)',
          children: [{ name: 'Trout RAS units' }, { name: 'Salmon RAS units' }, { name: 'Sturgeon RAS units' }, { name: 'Tilapia RAS units' }, { name: 'Shrimp RAS units' }],
        },
        {
          name: 'Cage farming',
          children: [{ name: 'Freshwater cage farms' }, { name: 'Marine cage farms' }, { name: 'Submersible cage systems' }],
        },
        {
          name: 'Raceway farms',
          children: [{ name: 'Concrete raceways' }, { name: 'Spring-fed raceways' }, { name: 'Trout raceway farms' }],
        },
        {
          name: 'Hatcheries & nurseries',
          children: [{ name: 'Fish hatcheries' }, { name: 'Fry rearing units' }, { name: 'Broodstock facilities' }, { name: 'Shrimp hatcheries' }],
        },
        {
          name: 'Shellfish & mollusc farms',
          children: [{ name: 'Mussel farms' }, { name: 'Oyster farms' }, { name: 'Clam beds' }, { name: 'Crayfish farms' }],
        },
        {
          name: 'Aquaponic facilities',
          children: [{ name: 'Media-bed aquaponics' }, { name: 'NFT aquaponics' }, { name: 'Commercial aquaponic farms' }],
        },
        {
          name: 'Water bodies',
          children: [{ name: 'Lakes' }, { name: 'Reservoirs' }, { name: 'Irrigation reservoirs' }, { name: 'River sections with fishing rights' }, { name: 'Recreational fishing ponds' }],
        },
        {
          name: 'Aquaculture facilities by tenure',
          children: [{ name: 'Freehold aquaculture sites' }, { name: 'Leasehold aquaculture sites' }, { name: 'Water-use concessions' }, { name: 'Aquaculture licences' }],
        },
      ],
    },
  ],
};
