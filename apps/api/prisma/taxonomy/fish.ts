import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Fish trades by species x trade form x preservation state, so level 3 is either the species or the
 * preservation family, level 4 is the trade form (whole round, H&G, fillet skin-on/skin-off, steaks,
 * portions, smoked/salted), and level 5 carries the count and weight grades lots are actually quoted
 * on — shrimp counts (16/20, 21/25, 26/30), octopus T-grades, salmon trims, oyster numbers.
 */
export const fish: TaxCategory = {
  name: 'Fish',
  emoji: '🐟',
  tint: TINT.sky,
  children: [
    {
      name: 'Red mullet',
      ru: 'Барабулька',
      children: [
        {
          name: 'Fresh & chilled',
          children: [
            {
              name: 'Whole round',
              children: [
                { name: '40-60 g' },
                { name: '60-100 g' },
                { name: '100-200 g' },
                { name: '200 g and above' },
              ],
            },
            { name: 'Whole gutted' },
            { name: 'Fillet skin-on' },
            { name: 'Fillet skin-off' },
          ],
        },
        {
          name: 'Frozen',
          children: [
            { name: 'IQF whole round' },
            { name: 'Block-frozen whole round' },
            { name: 'Whole gutted frozen' },
            { name: 'Fillet skin-on frozen' },
          ],
        },
        {
          name: 'Smoked',
          children: [{ name: 'Hot-smoked whole' }, { name: 'Cold-smoked fillet' }],
        },
      ],
    },
    {
      name: 'Beluga',
      ru: 'Белуга',
      children: [
        {
          name: 'Live beluga',
          children: [{ name: '5-10 kg' }, { name: '10-20 kg' }, { name: '20 kg and above' }],
        },
        {
          name: 'Fresh & chilled',
          children: [
            { name: 'Whole round' },
            { name: 'Whole gutted' },
            { name: 'Fillet skin-on' },
            { name: 'Fillet skin-off' },
            { name: 'Steaks' },
            { name: 'Belly flap' },
          ],
        },
        {
          name: 'Frozen',
          children: [
            { name: 'Whole gutted frozen' },
            { name: 'Fillet frozen' },
            { name: 'Steaks frozen' },
            { name: 'Portions frozen' },
          ],
        },
        {
          name: 'Smoked & cured',
          children: [
            { name: 'Cold-smoked fillet' },
            { name: 'Hot-smoked steaks' },
            { name: 'Balyk' },
            { name: 'Cured tesha' },
          ],
        },
        {
          name: 'Bester hybrid',
          children: [
            { name: 'Live bester' },
            { name: 'Whole gutted bester' },
            { name: 'Bester fillet' },
          ],
        },
      ],
    },
    {
      name: 'Pink salmon',
      ru: 'Горбуша',
      children: [
        {
          name: 'Fresh & chilled',
          children: [
            { name: 'Whole round' },
            { name: 'Whole gutted head-on' },
            { name: 'Headed & gutted' },
            { name: 'Fillet skin-on' },
          ],
        },
        {
          name: 'Frozen',
          children: [
            { name: 'Whole round frozen' },
            {
              name: 'Headed & gutted frozen',
              children: [
                { name: '0.8-1.2 kg' },
                { name: '1.2-1.8 kg' },
                { name: '1.8 kg and above' },
              ],
            },
            { name: 'Fillet skin-on frozen' },
            { name: 'Fillet skin-off frozen' },
            { name: 'Portions frozen' },
            { name: 'Steaks frozen' },
            { name: 'Belly flaps frozen' },
          ],
        },
        {
          name: 'Salted',
          children: [
            { name: 'Lightly salted fillet' },
            { name: 'Salted whole gutted' },
            { name: 'Salted slices' },
          ],
        },
        {
          name: 'Cold-smoked',
          children: [
            { name: 'Cold-smoked fillet skin-on' },
            { name: 'Cold-smoked slices' },
            { name: 'Cold-smoked loins' },
          ],
        },
        {
          name: 'Hot-smoked',
          children: [
            { name: 'Hot-smoked whole' },
            { name: 'Hot-smoked fillet' },
            { name: 'Hot-smoked steaks' },
          ],
        },
      ],
    },
    {
      name: 'Fish roe',
      ru: 'Икра рыбы',
      children: [
        {
          name: 'Sturgeon caviar',
          children: [
            {
              name: 'Beluga caviar',
              children: [{ name: 'Grade 000' }, { name: 'Grade 00' }, { name: 'Grade 0' }],
            },
            { name: 'Ossetra caviar' },
            { name: 'Sevruga caviar' },
            { name: 'Sterlet caviar' },
            { name: 'Kaluga caviar' },
            { name: 'Bester hybrid caviar' },
          ],
        },
        {
          name: 'Salmon caviar',
          children: [
            {
              name: 'Chum salmon roe',
              children: [
                { name: 'Grade 1 salted' },
                { name: 'Grade 2 salted' },
                { name: 'Frozen chum roe' },
              ],
            },
            { name: 'Pink salmon roe' },
            { name: 'Coho salmon roe' },
            { name: 'Sockeye salmon roe' },
            { name: 'Trout roe' },
          ],
        },
        {
          name: 'Pollock roe',
          children: [
            { name: 'Salted pollock roe' },
            { name: 'Frozen pollock roe' },
            { name: 'Mentaiko spiced roe' },
          ],
        },
        {
          name: 'Capelin roe',
          children: [{ name: 'Frozen capelin roe' }, { name: 'Masago seasoned roe' }],
        },
        {
          name: 'Herring roe',
          children: [
            { name: 'Frozen herring roe' },
            { name: 'Kazunoko salted roe' },
            { name: 'Roe on kelp' },
          ],
        },
        {
          name: 'Flying fish roe',
          children: [
            { name: 'Tobiko orange' },
            { name: 'Tobiko black' },
            { name: 'Tobiko wasabi' },
          ],
        },
        {
          name: 'Whitefish & pike roe',
          children: [
            { name: 'Salted pike roe' },
            { name: 'Whitefish roe' },
            { name: 'Vendace roe' },
            { name: 'Peled roe' },
          ],
        },
        {
          name: 'Cod roe',
          children: [
            { name: 'Salted cod roe' },
            { name: 'Smoked cod roe' },
            { name: 'Frozen cod roe' },
          ],
        },
        {
          name: 'Lumpfish roe',
          children: [{ name: 'Black lumpfish roe' }, { name: 'Red lumpfish roe' }],
        },
        {
          name: 'Carp roe',
          children: [{ name: 'Salted carp roe' }, { name: 'Frozen carp roe' }],
        },
        {
          name: 'Pressed & processed roe',
          children: [
            { name: 'Pressed payusnaya caviar' },
            { name: 'Pasteurised caviar' },
            { name: 'Roe paste' },
            { name: 'Imitation caviar' },
          ],
        },
      ],
    },
    {
      name: 'Carp',
      ru: 'Карп',
      children: [
        {
          name: 'Common carp',
          children: [
            {
              name: 'Live carp',
              children: [
                { name: '0.8-1.5 kg' },
                { name: '1.5-2.5 kg' },
                { name: '2.5 kg and above' },
              ],
            },
            { name: 'Fresh whole round' },
            { name: 'Whole gutted' },
            { name: 'Fillet skin-on' },
            { name: 'Fillet skin-off' },
            { name: 'Whole round frozen' },
            { name: 'Steaks' },
            { name: 'Hot-smoked whole' },
            { name: 'Cold-smoked fillet' },
          ],
        },
        {
          name: 'Mirror carp',
          children: [
            { name: 'Live mirror carp' },
            { name: 'Fresh whole round' },
            { name: 'Whole gutted' },
            { name: 'Fillet skin-on' },
            { name: 'Whole round frozen' },
          ],
        },
        {
          name: 'Grass carp',
          children: [
            { name: 'Live grass carp' },
            { name: 'Fresh whole round' },
            { name: 'Whole gutted' },
            { name: 'Fillet skin-on' },
            { name: 'Steaks frozen' },
          ],
        },
        {
          name: 'Silver carp',
          children: [
            { name: 'Live silver carp' },
            { name: 'Whole gutted' },
            { name: 'Fillet skin-off' },
            { name: 'Headless frozen' },
            { name: 'Silver carp mince' },
          ],
        },
        {
          name: 'Bighead carp',
          children: [
            { name: 'Live bighead carp' },
            { name: 'Whole gutted' },
            { name: 'Frozen heads' },
            { name: 'Fillet skin-off' },
          ],
        },
        {
          name: 'Crucian carp',
          children: [
            { name: 'Live crucian carp' },
            { name: 'Fresh whole round' },
            { name: 'Whole round frozen' },
            { name: 'Dried crucian carp' },
          ],
        },
      ],
    },
    {
      name: 'Chum salmon',
      ru: 'Кета',
      children: [
        {
          name: 'Fresh & chilled',
          children: [
            { name: 'Whole round' },
            { name: 'Whole gutted head-on' },
            { name: 'Headed & gutted' },
          ],
        },
        {
          name: 'Frozen',
          children: [
            { name: 'Whole round frozen' },
            {
              name: 'Headed & gutted frozen',
              children: [
                { name: '1-2 kg' },
                { name: '2-3 kg' },
                { name: '3-4 kg' },
                { name: '4 kg and above' },
              ],
            },
            { name: 'Fillet skin-on frozen' },
            { name: 'Fillet skin-off frozen' },
            { name: 'Portions frozen' },
            { name: 'Steaks frozen' },
            { name: 'Belly flaps frozen' },
            { name: 'Collars frozen' },
          ],
        },
        {
          name: 'Salted',
          children: [
            { name: 'Lightly salted fillet' },
            { name: 'Salted whole gutted' },
            { name: 'Salted slices' },
          ],
        },
        {
          name: 'Cold-smoked',
          children: [
            { name: 'Cold-smoked fillet' },
            { name: 'Cold-smoked slices' },
            { name: 'Balyk' },
          ],
        },
        {
          name: 'Hot-smoked',
          children: [{ name: 'Hot-smoked fillet' }, { name: 'Hot-smoked steaks' }],
        },
        {
          name: 'Dried',
          children: [{ name: 'Yukola' }, { name: 'Salmon jerky strips' }],
        },
      ],
    },
    {
      name: 'Mullet',
      ru: 'Кефаль',
      children: [
        {
          name: 'Fresh & chilled',
          children: [{ name: 'Whole round' }, { name: 'Whole gutted' }, { name: 'Fillet skin-on' }],
        },
        {
          name: 'Frozen',
          children: [
            {
              name: 'Whole round frozen',
              children: [
                { name: '200-300 g' },
                { name: '300-500 g' },
                { name: '500-800 g' },
                { name: '800 g and above' },
              ],
            },
            { name: 'Headed & gutted frozen' },
            { name: 'Fillet skin-on frozen' },
          ],
        },
        {
          name: 'Smoked',
          children: [{ name: 'Hot-smoked whole' }, { name: 'Cold-smoked fillet' }],
        },
        {
          name: 'Salted & dried',
          children: [{ name: 'Salted whole gutted' }, { name: 'Sun-dried mullet' }],
        },
        {
          name: 'Mullet roe',
          children: [{ name: 'Fresh roe sacs' }, { name: 'Bottarga di muggine' }],
        },
      ],
    },
    {
      name: 'Coho salmon',
      ru: 'Кижуч',
      children: [
        {
          name: 'Fresh & chilled',
          children: [
            { name: 'Whole round' },
            { name: 'Whole gutted head-on' },
            { name: 'Headed & gutted' },
            { name: 'Fillet trim C' },
            { name: 'Fillet trim D' },
          ],
        },
        {
          name: 'Frozen',
          children: [
            {
              name: 'Headed & gutted frozen',
              children: [
                { name: '1-2 kg' },
                { name: '2-3 kg' },
                { name: '3-4 kg' },
                { name: '4 kg and above' },
              ],
            },
            { name: 'Fillet skin-on frozen' },
            { name: 'Fillet skin-off frozen' },
            { name: 'Portions frozen' },
            { name: 'Steaks frozen' },
            { name: 'Belly flaps frozen' },
          ],
        },
        {
          name: 'Salted',
          children: [{ name: 'Lightly salted fillet' }, { name: 'Salted slices' }],
        },
        {
          name: 'Cold-smoked',
          children: [
            { name: 'Cold-smoked fillet' },
            { name: 'Cold-smoked slices' },
            { name: 'Cold-smoked loins' },
          ],
        },
        {
          name: 'Hot-smoked',
          children: [{ name: 'Hot-smoked fillet' }, { name: 'Hot-smoked steaks' }],
        },
      ],
    },
    {
      name: 'Molluscs & crustaceans',
      ru: 'Моллюски и ракообразные',
      children: [
        {
          name: 'Shrimp & prawns',
          children: [
            {
              name: 'Vannamei whiteleg shrimp',
              children: [
                { name: 'HOSO 16/20' },
                { name: 'HOSO 21/25' },
                { name: 'HOSO 26/30' },
                { name: 'HLSO 16/20' },
                { name: 'HLSO 21/25' },
                { name: 'HLSO 26/30' },
                { name: 'PD 16/20' },
                { name: 'PD 21/25' },
                { name: 'PD 26/30' },
                { name: 'PDTO 26/30' },
                { name: 'Cooked peeled 100/200' },
              ],
            },
            {
              name: 'Black tiger prawn',
              children: [
                { name: 'HOSO 8/12' },
                { name: 'HOSO 13/15' },
                { name: 'HOSO 16/20' },
                { name: 'HOSO 21/25' },
                { name: 'HLSO 16/20' },
                { name: 'HLSO 21/25' },
                { name: 'PD 16/20' },
                { name: 'PD 21/25' },
              ],
            },
            {
              name: 'Northern cold-water shrimp',
              children: [
                { name: 'Cooked shell-on 60/80' },
                { name: 'Cooked shell-on 80/100' },
                { name: 'Cooked peeled 150/250' },
                { name: 'Raw shell-on 90/120' },
              ],
            },
            {
              name: 'Argentine red shrimp',
              children: [
                { name: 'L1 whole 10/20' },
                { name: 'L2 whole 20/30' },
                { name: 'L3 whole 30/40' },
                { name: 'C1 tails' },
                { name: 'C2 tails' },
              ],
            },
            {
              name: 'King prawn',
              children: [{ name: '16/20' }, { name: '21/25' }, { name: '26/30' }],
            },
            {
              name: 'Freshwater scampi',
              children: [{ name: '8/12' }, { name: '16/20' }, { name: '21/25' }],
            },
          ],
        },
        {
          name: 'Crab',
          children: [
            {
              name: 'King crab',
              children: [
                { name: 'Live king crab' },
                { name: 'Frozen legs & claws' },
                { name: 'Merus sections' },
                { name: 'Leg & claw meat' },
              ],
            },
            {
              name: 'Snow crab',
              children: [
                { name: 'Clusters 5-8 oz' },
                { name: 'Clusters 8-10 oz' },
                { name: 'Whole cooked snow crab' },
                { name: 'Snow crab meat' },
              ],
            },
            {
              name: 'Blue swimming crab',
              children: [
                { name: 'Jumbo lump' },
                { name: 'Lump' },
                { name: 'Backfin' },
                { name: 'Claw meat' },
              ],
            },
            { name: 'Brown crab' },
            { name: 'Dungeness crab' },
            { name: 'Mud crab' },
          ],
        },
        {
          name: 'Lobster',
          children: [
            { name: 'European lobster' },
            { name: 'American lobster' },
            { name: 'Rock lobster' },
            {
              name: 'Lobster tails',
              children: [
                { name: '4-6 oz' },
                { name: '6-8 oz' },
                { name: '8-10 oz' },
                { name: '10-12 oz' },
              ],
            },
            { name: 'Lobster meat' },
          ],
        },
        {
          name: 'Crayfish',
          children: [
            {
              name: 'Live crayfish',
              children: [
                { name: '6-8 cm' },
                { name: '8-10 cm' },
                { name: '10-12 cm' },
                { name: '12 cm and above' },
              ],
            },
            { name: 'Boiled crayfish' },
            { name: 'Crayfish tail meat' },
            { name: 'Whole frozen crayfish' },
          ],
        },
        {
          name: 'Squid',
          children: [
            { name: 'Loligo squid' },
            { name: 'Illex squid' },
            { name: 'Humboldt giant squid' },
            {
              name: 'Squid tubes',
              children: [{ name: 'U3' }, { name: 'U5' }, { name: 'U7' }, { name: 'U10' }],
            },
            { name: 'Squid rings' },
            { name: 'Squid tentacles' },
            { name: 'Whole cleaned squid' },
          ],
        },
        {
          name: 'Octopus',
          children: [
            {
              name: 'Whole octopus',
              children: [
                { name: 'T1 4 kg and above' },
                { name: 'T2 3-4 kg' },
                { name: 'T3 2-3 kg' },
                { name: 'T4 1.5-2 kg' },
                { name: 'T5 1-1.5 kg' },
                { name: 'T6 0.8-1 kg' },
                { name: 'T7 0.5-0.8 kg' },
                { name: 'T8 0.3-0.5 kg' },
              ],
            },
            { name: 'Cleaned octopus' },
            { name: 'Octopus tentacles' },
            { name: 'Baby octopus' },
            { name: 'Cooked octopus' },
          ],
        },
        {
          name: 'Cuttlefish',
          children: [
            { name: 'Whole cuttlefish' },
            { name: 'Cleaned cuttlefish' },
            { name: 'Cuttlefish rings' },
            { name: 'Baby cuttlefish' },
          ],
        },
        {
          name: 'Mussels',
          children: [
            {
              name: 'Blue mussels',
              children: [
                { name: 'Live 40-60 mm' },
                { name: 'Live 60-80 mm' },
                { name: 'Half-shell 30/40' },
                { name: 'Half-shell 40/60' },
                { name: 'Cooked meat 200/300' },
                { name: 'Cooked meat 300/500' },
              ],
            },
            { name: 'Mediterranean mussels' },
            { name: 'Green-lipped mussels' },
            { name: 'Half-shell mussels' },
            { name: 'Mussel meat' },
          ],
        },
        {
          name: 'Oysters',
          children: [
            {
              name: 'Pacific oysters',
              children: [
                { name: 'No. 1 above 120 g' },
                { name: 'No. 2 86-120 g' },
                { name: 'No. 3 66-85 g' },
                { name: 'No. 4 46-65 g' },
                { name: 'No. 5 30-45 g' },
              ],
            },
            { name: 'European flat oysters' },
            { name: 'Rock oysters' },
            { name: 'Shucked oyster meat' },
          ],
        },
        {
          name: 'Scallops',
          children: [
            { name: 'King scallops' },
            { name: 'Bay scallops' },
            {
              name: 'Scallop meat',
              children: [{ name: 'U10' }, { name: '10/20' }, { name: '20/30' }, { name: '30/40' }],
            },
            { name: 'Roe-on scallops' },
            { name: 'Half-shell scallops' },
          ],
        },
        {
          name: 'Clams & cockles',
          children: [
            { name: 'Manila clams' },
            { name: 'Hard clams' },
            { name: 'Razor clams' },
            { name: 'Cockles' },
            { name: 'Surf clam meat' },
          ],
        },
        {
          name: 'Snails',
          children: [
            { name: 'Live Helix aspersa' },
            { name: 'Live Helix pomatia' },
            { name: 'Frozen snail meat' },
            { name: 'Snail caviar' },
          ],
        },
        {
          name: 'Krill',
          children: [
            { name: 'Frozen krill blocks' },
            { name: 'Krill meat' },
            { name: 'Krill meal' },
          ],
        },
      ],
    },
    {
      name: 'Seafood',
      ru: 'Морепродукты',
      children: [
        {
          name: 'Seafood cocktail mixes',
          children: [
            { name: 'Frozen seafood cocktail' },
            { name: 'Marinated seafood salad' },
            { name: 'Paella mix' },
          ],
        },
        {
          name: 'Surimi & imitation products',
          children: [
            { name: 'Surimi blocks grade A' },
            { name: 'Surimi blocks grade AA' },
            { name: 'Crab sticks' },
            { name: 'Imitation crab chunks' },
            { name: 'Imitation shrimp' },
          ],
        },
        {
          name: 'Sea cucumber',
          children: [
            { name: 'Dried sea cucumber' },
            { name: 'Frozen sea cucumber' },
            { name: 'Salted sea cucumber' },
          ],
        },
        {
          name: 'Sea urchin',
          children: [
            { name: 'Live sea urchin' },
            { name: 'Fresh uni roe' },
            { name: 'Frozen uni roe' },
          ],
        },
        {
          name: 'Jellyfish',
          children: [{ name: 'Salted jellyfish' }, { name: 'Ready-to-eat jellyfish strips' }],
        },
        {
          name: 'Seaweed & sea vegetables',
          children: [
            { name: 'Kombu kelp' },
            { name: 'Wakame' },
            { name: 'Nori sheets' },
            { name: 'Sea lettuce' },
            { name: 'Laminaria salad' },
            { name: 'Raw agar-agar' },
          ],
        },
        {
          name: 'Frog legs',
          children: [{ name: 'Frozen 2/4' }, { name: 'Frozen 4/6' }, { name: 'Frozen 6/8' }],
        },
        {
          name: 'Value-added shrimp products',
          children: [
            { name: 'Breaded shrimp' },
            { name: 'Butterfly shrimp' },
            { name: 'Shrimp skewers' },
            { name: 'Nobashi shrimp' },
          ],
        },
        {
          name: 'Dried & seasoned seafood snacks',
          children: [
            { name: 'Dried squid shreds' },
            { name: 'Seasoned dried squid' },
            { name: 'Dried anchovy snack' },
            { name: 'Fish jerky' },
          ],
        },
      ],
    },
    {
      name: 'Sturgeon',
      ru: 'Осётр',
      children: [
        {
          name: 'Russian sturgeon',
          children: [
            { name: 'Live sturgeon' },
            { name: 'Fresh whole gutted' },
            { name: 'Whole gutted frozen' },
            { name: 'Fillet skin-on' },
            { name: 'Steaks' },
            { name: 'Cold-smoked balyk' },
            { name: 'Cured tesha' },
          ],
        },
        {
          name: 'Siberian sturgeon',
          children: [
            { name: 'Live sturgeon' },
            { name: 'Fresh whole gutted' },
            { name: 'Whole gutted frozen' },
            { name: 'Fillet skin-off' },
            { name: 'Hot-smoked steaks' },
          ],
        },
        {
          name: 'Stellate sturgeon',
          children: [
            { name: 'Live sturgeon' },
            { name: 'Fresh whole gutted' },
            { name: 'Whole gutted frozen' },
            { name: 'Cold-smoked balyk' },
          ],
        },
        {
          name: 'Sterlet',
          children: [
            { name: 'Live sterlet' },
            { name: 'Fresh whole gutted' },
            { name: 'Whole round frozen' },
            { name: 'Portion-size sterlet 300-500 g' },
          ],
        },
        {
          name: 'Kaluga',
          children: [
            { name: 'Fresh whole gutted' },
            { name: 'Fillet frozen' },
            { name: 'Steaks frozen' },
          ],
        },
        {
          name: 'Bester hybrid',
          children: [
            { name: 'Live bester' },
            { name: 'Whole gutted bester' },
            { name: 'Bester fillet' },
          ],
        },
      ],
    },
    {
      name: 'Peled',
      ru: 'Пелядь',
      children: [
        {
          name: 'Fresh & chilled',
          children: [{ name: 'Whole round' }, { name: 'Whole gutted' }],
        },
        {
          name: 'Frozen',
          children: [
            {
              name: 'Whole round frozen',
              children: [
                { name: '200-400 g' },
                { name: '400-600 g' },
                { name: '600-800 g' },
                { name: '800 g and above' },
              ],
            },
            { name: 'Whole gutted frozen' },
            { name: 'Fillet skin-on frozen' },
            { name: 'Fillet skin-off frozen' },
          ],
        },
        {
          name: 'Salted',
          children: [{ name: 'Lightly salted whole' }, { name: 'Salted fillet' }],
        },
        {
          name: 'Smoked',
          children: [
            { name: 'Hot-smoked whole' },
            { name: 'Cold-smoked whole' },
            { name: 'Cold-smoked fillet' },
          ],
        },
        {
          name: 'Dried',
          children: [{ name: 'Sun-dried peled' }, { name: 'Yukola-style dried peled' }],
        },
        {
          name: 'Peled roe',
          children: [{ name: 'Salted peled roe' }, { name: 'Frozen peled roe' }],
        },
      ],
    },
    {
      name: 'Fish by-products',
      ru: 'Рыбные субпродукты',
      children: [
        {
          name: 'Fish heads',
          children: [
            { name: 'Salmon heads' },
            { name: 'Cod heads' },
            { name: 'Carp heads' },
            { name: 'Tuna heads' },
          ],
        },
        {
          name: 'Frames & backbones',
          children: [
            { name: 'Salmon frames' },
            { name: 'Cod frames' },
            { name: 'Pollock backbones' },
          ],
        },
        {
          name: 'Fish trimmings',
          children: [
            { name: 'Salmon trimmings grade A' },
            { name: 'Salmon trimmings grade B' },
            { name: 'Whitefish trimmings' },
            { name: 'Tuna saku offcuts' },
          ],
        },
        {
          name: 'Fish skin',
          children: [{ name: 'Salmon skin' }, { name: 'Cod skin' }, { name: 'Tilapia skin' }],
        },
        {
          name: 'Fish liver',
          children: [
            { name: 'Cod liver' },
            { name: 'Pollock liver' },
            { name: 'Burbot liver' },
            { name: 'Monkfish liver' },
          ],
        },
        {
          name: 'Fish milt',
          children: [{ name: 'Herring milt' }, { name: 'Salmon milt' }, { name: 'Cod milt' }],
        },
        {
          name: 'Swim bladders',
          children: [{ name: 'Croaker maw' }, { name: 'Catfish maw' }, { name: 'Sturgeon vesiga' }],
        },
        {
          name: 'Collars & belly flaps',
          children: [
            { name: 'Salmon collars' },
            { name: 'Salmon belly flaps' },
            { name: 'Tuna collars' },
            { name: 'Yellowtail collars' },
          ],
        },
        {
          name: 'Fish scales',
          children: [{ name: 'Tilapia scales' }, { name: 'Carp scales' }],
        },
        {
          name: 'Fish meal & oil raw material',
          children: [
            { name: 'Fish meal 62% protein' },
            { name: 'Fish meal 65% protein' },
            { name: 'Crude fish oil' },
            { name: 'Fish silage' },
          ],
        },
      ],
    },
    {
      name: 'Mackerel',
      ru: 'Скумбрия',
      children: [
        {
          name: 'Atlantic mackerel',
          children: [
            { name: 'Fresh whole round' },
            {
              name: 'Whole round frozen',
              children: [
                { name: '200-300 g' },
                { name: '300-400 g' },
                { name: '400-500 g' },
                { name: '500 g and above' },
              ],
            },
            { name: 'Headed & gutted' },
            {
              name: 'Fillet skin-on',
              children: [{ name: '80-120 g' }, { name: '120-150 g' }, { name: '150 g and above' }],
            },
            { name: 'Fillet skin-off' },
            { name: 'Butterfly fillet' },
            { name: 'Cold-smoked whole' },
            { name: 'Hot-smoked whole' },
            { name: 'Salted mackerel' },
          ],
        },
        {
          name: 'Chub mackerel',
          children: [
            {
              name: 'Whole round frozen',
              children: [{ name: '100-200 g' }, { name: '200-300 g' }, { name: '300-500 g' }],
            },
            { name: 'Headed & gutted frozen' },
            { name: 'Fillet skin-on' },
            { name: 'Salted chub mackerel' },
          ],
        },
        {
          name: 'Spanish mackerel',
          children: [
            { name: 'Whole round frozen' },
            { name: 'Steaks frozen' },
            { name: 'Fillet skin-on' },
          ],
        },
        {
          name: 'King mackerel',
          children: [{ name: 'Whole gutted' }, { name: 'Steaks frozen' }, { name: 'Loins' }],
        },
        {
          name: 'Horse mackerel',
          children: [
            {
              name: 'Whole round frozen',
              children: [{ name: '100-150 g' }, { name: '150-200 g' }, { name: '200-300 g' }],
            },
            { name: 'Headed & gutted frozen' },
            { name: 'Fillet skin-on' },
            { name: 'Dried-salted scad' },
          ],
        },
      ],
    },
    {
      name: 'Fish mince',
      ru: 'Фарш рыбный',
      children: [
        {
          name: 'Pollock mince',
          children: [
            { name: 'Frozen mince blocks' },
            { name: 'IQF mince' },
            { name: 'Washed surimi-grade mince' },
          ],
        },
        {
          name: 'Cod & haddock mince',
          children: [{ name: 'Frozen mince blocks' }, { name: 'IQF mince' }],
        },
        {
          name: 'Hake mince',
          children: [{ name: 'Frozen mince blocks' }, { name: 'Deboned hake mince' }],
        },
        {
          name: 'Salmon mince',
          children: [
            { name: 'Trim A salmon mince' },
            { name: 'Trim B salmon mince' },
            { name: 'Frozen mince blocks' },
          ],
        },
        {
          name: 'Carp mince',
          children: [{ name: 'Frozen carp mince' }, { name: 'Carp cutlet mince' }],
        },
        {
          name: 'Silver carp mince',
          children: [{ name: 'Frozen silver carp mince' }, { name: 'Deboned silver carp mince' }],
        },
        {
          name: 'Herring mince',
          children: [{ name: 'Frozen herring mince' }, { name: 'Herring paste mince' }],
        },
        {
          name: 'Pangasius mince',
          children: [{ name: 'Frozen pangasius mince' }, { name: 'IQF pangasius mince' }],
        },
        {
          name: 'Mixed whitefish mince',
          children: [
            { name: 'Frozen mince blocks' },
            { name: 'Fish burger mince' },
            { name: 'Fish kebab mince' },
          ],
        },
        {
          name: 'Surimi-grade mince',
          children: [
            { name: 'Grade A surimi' },
            { name: 'Grade AA surimi' },
            { name: 'Grade FA surimi' },
          ],
        },
      ],
    },
    {
      name: 'Trout',
      ru: 'Форель',
      children: [
        {
          name: 'Rainbow trout',
          children: [
            { name: 'Live rainbow trout' },
            { name: 'Fresh whole round' },
            {
              name: 'Whole gutted head-on',
              children: [
                { name: '200-300 g' },
                { name: '300-500 g' },
                { name: '1-2 kg' },
                { name: '2-3 kg' },
                { name: '3 kg and above' },
              ],
            },
            { name: 'Headed & gutted' },
            {
              name: 'Fillet skin-on',
              children: [
                { name: 'Trim A' },
                { name: 'Trim B' },
                { name: 'Trim C' },
                { name: 'Trim D' },
                { name: 'Trim E' },
              ],
            },
            { name: 'Fillet skin-off' },
            { name: 'Portions frozen' },
            { name: 'Steaks' },
            { name: 'Cold-smoked fillet' },
            { name: 'Hot-smoked whole' },
            { name: 'Lightly salted fillet' },
          ],
        },
        {
          name: 'Brook trout',
          children: [
            { name: 'Live brook trout' },
            { name: 'Fresh whole round' },
            { name: 'Whole gutted frozen' },
            { name: 'Hot-smoked whole' },
          ],
        },
        {
          name: 'Brown trout',
          children: [
            { name: 'Live brown trout' },
            { name: 'Fresh whole gutted' },
            { name: 'Whole gutted frozen' },
            { name: 'Cold-smoked fillet' },
          ],
        },
        {
          name: 'Sea trout',
          children: [
            { name: 'Fresh whole gutted' },
            { name: 'Headed & gutted frozen' },
            {
              name: 'Fillet skin-on',
              children: [{ name: 'Trim C' }, { name: 'Trim D' }, { name: 'Trim E' }],
            },
            { name: 'Portions frozen' },
            { name: 'Cold-smoked fillet' },
          ],
        },
        {
          name: 'Arctic char',
          children: [
            { name: 'Fresh whole gutted' },
            { name: 'Fillet skin-on frozen' },
            { name: 'Cold-smoked fillet' },
          ],
        },
      ],
    },
  ],
};
