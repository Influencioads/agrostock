import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Live stock trades on two axes at once: breed group (dairy vs beef vs fibre) and production class
 * (calf, heifer, bull, cull), so both appear at level 3 with the named breeds and classes at level 4.
 * Poultry and fish fry go to level 5 where lots genuinely trade by commercial hybrid line.
 */
export const liveAnimalsPoultry: TaxCategory = {
  name: 'Live animals & poultry',
  emoji: '🐄',
  tint: TINT.green,
  children: [
    {
      name: 'Goats',
      ru: 'Козы',
      children: [
        {
          name: 'Dairy goat breeds',
          children: [
            { name: 'Saanen' },
            { name: 'Alpine' },
            { name: 'Toggenburg' },
            { name: 'Anglo-Nubian' },
            { name: 'LaMancha' },
            { name: 'Damascus (Shami)' },
            { name: 'Beetal' },
            { name: 'Zaanen-cross dairy goats' },
          ],
        },
        {
          name: 'Meat goat breeds',
          children: [
            { name: 'Boer' },
            { name: 'Kalahari Red' },
            { name: 'Black Bengal' },
            { name: 'Sirohi' },
            { name: 'Osmanabadi' },
            { name: 'Jamnapari' },
            { name: 'Barbari' },
            { name: 'Totapari' },
          ],
        },
        {
          name: 'Fibre goat breeds',
          children: [
            { name: 'Angora goat' },
            { name: 'Cashmere goat' },
            { name: 'Orenburg goat' },
          ],
        },
        {
          name: 'Breeding goats',
          children: [
            { name: 'Breeding bucks' },
            { name: 'Breeding does' },
            { name: 'In-kid does' },
            { name: 'Doelings' },
          ],
        },
        {
          name: 'Kids',
          children: [
            { name: 'Suckling kids' },
            { name: 'Weaned kids' },
            { name: 'Male kids for fattening' },
          ],
        },
        {
          name: 'Cull goats',
          children: [
            { name: 'Cull does' },
            { name: 'Cull bucks' },
          ],
        },
      ],
    },
    {
      name: 'Cattle',
      ru: 'Крупный рогатый скот',
      children: [
        {
          name: 'Dairy breeds',
          children: [
            { name: 'Holstein-Friesian' },
            { name: 'Jersey' },
            { name: 'Brown Swiss' },
            { name: 'Ayrshire' },
            { name: 'Guernsey' },
            { name: 'Sahiwal' },
            { name: 'Gir' },
            { name: 'Red Dane' },
          ],
        },
        {
          name: 'Beef breeds',
          children: [
            { name: 'Angus' },
            { name: 'Hereford' },
            { name: 'Simmental' },
            { name: 'Brahman' },
            { name: 'Charolais' },
            { name: 'Limousin' },
            { name: 'Wagyu' },
            { name: 'Nelore' },
            { name: 'Kazakh White-Headed' },
          ],
        },
        {
          name: 'Dual-purpose breeds',
          children: [
            { name: 'Fleckvieh' },
            { name: 'Montbéliarde' },
            { name: 'Red Poll' },
            { name: 'Tharparkar' },
            { name: 'Simmental dual-purpose' },
          ],
        },
        {
          name: 'Buffalo',
          children: [
            { name: 'Murrah' },
            { name: 'Nili-Ravi' },
            { name: 'Jaffarabadi' },
            { name: 'Surti' },
            { name: 'Mediterranean buffalo' },
            { name: 'Swamp buffalo' },
          ],
        },
        {
          name: 'Calves',
          children: [
            { name: 'Day-old calves' },
            { name: 'Bull calves' },
            { name: 'Heifer calves' },
            { name: 'Veal calves' },
            { name: 'Weaned calves' },
          ],
        },
        {
          name: 'Heifers',
          children: [
            { name: 'Weaned heifers' },
            { name: 'Bred heifers' },
            { name: 'In-calf heifers' },
            { name: 'Springing heifers' },
          ],
        },
        {
          name: 'Bulls',
          children: [
            { name: 'Stud bulls' },
            { name: 'Young bulls' },
            { name: 'Feedlot bulls' },
            { name: 'Draught bullocks' },
          ],
        },
        {
          name: 'Milking cows',
          children: [
            { name: 'First-lactation cows' },
            { name: 'Multiparous cows' },
            { name: 'Fresh in-milk cows' },
            { name: 'Dry cows' },
          ],
        },
        {
          name: 'Steers & feeders',
          children: [
            { name: 'Feeder steers' },
            { name: 'Backgrounder steers' },
            { name: 'Finished steers' },
          ],
        },
        {
          name: 'Cull cattle',
          children: [
            { name: 'Cull dairy cows' },
            { name: 'Cull beef cows' },
            { name: 'Cull bulls' },
          ],
        },
      ],
    },
    {
      name: 'Rabbits',
      ru: 'Кролики',
      children: [
        {
          name: 'Meat rabbit breeds',
          children: [
            { name: 'New Zealand White' },
            { name: 'Californian' },
            { name: 'Flemish Giant' },
            { name: 'Hyla hybrid' },
            { name: 'Hyplus hybrid' },
            { name: 'Soviet Chinchilla' },
          ],
        },
        {
          name: 'Fur rabbit breeds',
          children: [
            { name: 'Rex' },
            { name: 'Chinchilla rabbit' },
            { name: 'Silver Fox' },
          ],
        },
        {
          name: 'Wool rabbit breeds',
          children: [
            { name: 'English Angora' },
            { name: 'German Angora' },
            { name: 'French Angora' },
          ],
        },
        {
          name: 'Breeding rabbits',
          children: [
            { name: 'Breeding bucks' },
            { name: 'Breeding does' },
            { name: 'Pregnant does' },
          ],
        },
        {
          name: 'Young rabbits',
          children: [
            { name: 'Weaned kits' },
            { name: 'Fryers' },
            { name: 'Roasters' },
          ],
        },
      ],
    },
    {
      name: 'Horses',
      ru: 'Лошади',
      children: [
        {
          name: 'Draft horses',
          children: [
            { name: 'Percheron' },
            { name: 'Belgian Draft' },
            { name: 'Clydesdale' },
            { name: 'Shire' },
            { name: 'Vladimir Heavy Draft' },
            { name: 'Soviet Heavy Draft' },
          ],
        },
        {
          name: 'Riding & sport horses',
          children: [
            { name: 'Arabian' },
            { name: 'Thoroughbred' },
            { name: 'Akhal-Teke' },
            { name: 'Hanoverian' },
            { name: 'Trakehner' },
            { name: 'Andalusian' },
          ],
        },
        {
          name: 'Working & ranch horses',
          children: [
            { name: 'Quarter Horse' },
            { name: 'Criollo' },
            { name: 'Kabarda' },
            { name: 'Marwari' },
          ],
        },
        {
          name: 'Ponies & miniatures',
          children: [
            { name: 'Shetland pony' },
            { name: 'Welsh pony' },
            { name: 'Miniature horse' },
            { name: 'Bashkir pony' },
          ],
        },
        {
          name: 'Donkeys & mules',
          children: [
            { name: 'Working donkeys' },
            { name: 'Poitou donkey' },
            { name: 'Mules' },
            { name: 'Hinnies' },
          ],
        },
        {
          name: 'Young horses',
          children: [
            { name: 'Foals' },
            { name: 'Yearlings' },
            { name: 'Weanlings' },
          ],
        },
        {
          name: 'Breeding horses',
          children: [
            { name: 'Broodmares' },
            { name: 'In-foal mares' },
            { name: 'Breeding stallions' },
          ],
        },
        {
          name: 'Geldings',
          children: [
            { name: 'Riding geldings' },
            { name: 'Work geldings' },
          ],
        },
      ],
    },
    {
      name: 'Fish fry',
      ru: 'Мальки',
      children: [
        {
          name: 'Carp fry & fingerlings',
          children: [
            { name: 'Common carp fry' },
            { name: 'Mirror carp fry' },
            { name: 'Grass carp fry' },
            { name: 'Silver carp fry' },
            { name: 'Bighead carp fry' },
          ],
        },
        {
          name: 'Indian major carp seed',
          children: [
            { name: 'Rohu spawn & fry' },
            { name: 'Catla fry' },
            { name: 'Mrigal fry' },
            { name: 'Kalbasu fry' },
          ],
        },
        {
          name: 'Tilapia fingerlings',
          children: [
            { name: 'Nile tilapia fingerlings' },
            { name: 'GIFT tilapia fingerlings' },
            { name: 'Red tilapia fingerlings' },
            { name: 'Mono-sex male tilapia' },
          ],
        },
        {
          name: 'Trout fry',
          children: [
            { name: 'Rainbow trout fry' },
            { name: 'Brown trout fry' },
            { name: 'Eyed trout eggs' },
            { name: 'Trout fingerlings' },
          ],
        },
        {
          name: 'Salmon smolts',
          children: [
            { name: 'Atlantic salmon smolts' },
            { name: 'Coho salmon smolts' },
            { name: 'Salmon parr' },
          ],
        },
        {
          name: 'Catfish fingerlings',
          children: [
            { name: 'African catfish fingerlings' },
            { name: 'Pangasius fingerlings' },
            { name: 'Clarias hybrid fingerlings' },
            { name: 'Channel catfish fingerlings' },
          ],
        },
        {
          name: 'Sturgeon fry',
          children: [
            { name: 'Beluga fry' },
            { name: 'Russian sturgeon fry' },
            { name: 'Siberian sturgeon fry' },
            { name: 'Sterlet fry' },
          ],
        },
        {
          name: 'Shrimp & prawn post-larvae',
          children: [
            { name: 'Vannamei post-larvae' },
            { name: 'Black tiger post-larvae' },
            { name: 'Freshwater prawn post-larvae' },
          ],
        },
        {
          name: 'Sea bass & bream fingerlings',
          children: [
            { name: 'European sea bass fingerlings' },
            { name: 'Gilthead sea bream fingerlings' },
            { name: 'Meagre fingerlings' },
          ],
        },
        {
          name: 'Pike & perch fry',
          children: [
            { name: 'Pikeperch fingerlings' },
            { name: 'Eurasian perch fingerlings' },
            { name: 'Pike fry' },
          ],
        },
      ],
    },
    {
      name: 'Sheep',
      ru: 'Овцы',
      children: [
        {
          name: 'Meat sheep breeds',
          children: [
            { name: 'Dorper' },
            { name: 'Suffolk' },
            { name: 'Texel' },
            { name: 'Hampshire Down' },
            { name: 'Katahdin' },
            { name: 'Romanov' },
          ],
        },
        {
          name: 'Fat-tailed breeds',
          children: [
            { name: 'Awassi' },
            { name: 'Karakul' },
            { name: 'Edilbaev' },
            { name: 'Hissar' },
            { name: 'Damara' },
          ],
        },
        {
          name: 'Wool breeds',
          children: [
            { name: 'Merino' },
            { name: 'Rambouillet' },
            { name: 'Corriedale' },
            { name: 'Lincoln' },
            { name: 'Romney' },
          ],
        },
        {
          name: 'Dairy sheep breeds',
          children: [
            { name: 'East Friesian' },
            { name: 'Lacaune' },
            { name: 'Assaf' },
            { name: 'Chios' },
            { name: 'Sarda' },
          ],
        },
        {
          name: 'Lambs',
          children: [
            { name: 'Suckling lambs' },
            { name: 'Weaned lambs' },
            { name: 'Feeder lambs' },
            { name: 'Finished lambs' },
          ],
        },
        {
          name: 'Ewes',
          children: [
            { name: 'Breeding ewes' },
            { name: 'In-lamb ewes' },
            { name: 'Ewe lambs' },
          ],
        },
        {
          name: 'Rams',
          children: [
            { name: 'Breeding rams' },
            { name: 'Young rams' },
            { name: 'Cull rams' },
          ],
        },
      ],
    },
    {
      name: 'Poultry (live)',
      ru: 'Птицы',
      children: [
        {
          name: 'Chickens',
          children: [
            {
              name: 'Broiler chickens',
              children: [
                { name: 'Cobb 500 broilers' },
                { name: 'Ross 308 broilers' },
                { name: 'Arbor Acres broilers' },
                { name: 'Hubbard broilers' },
                { name: 'Slow-growing coloured broilers' },
              ],
            },
            {
              name: 'Layer hens',
              children: [
                { name: 'Lohmann Brown layers' },
                { name: 'Hy-Line Brown layers' },
                { name: 'ISA Brown layers' },
                { name: 'Hy-Line W-36 layers' },
                { name: 'Dekalb White layers' },
              ],
            },
            {
              name: 'Day-old chicks',
              children: [
                { name: 'Broiler day-old chicks' },
                { name: 'Layer day-old chicks' },
                { name: 'Sexed pullet chicks' },
                { name: 'Straight-run chicks' },
              ],
            },
            {
              name: 'Breeder stock',
              children: [
                { name: 'Broiler parent stock' },
                { name: 'Layer parent stock' },
                { name: 'Grandparent stock' },
              ],
            },
            {
              name: 'Pullets',
              children: [
                { name: 'Point-of-lay pullets' },
                { name: 'Growing pullets' },
              ],
            },
            { name: 'Cockerels' },
            { name: 'Spent hens' },
            {
              name: 'Native & backyard breeds',
              children: [
                { name: 'Kadaknath' },
                { name: 'Aseel' },
                { name: 'Giriraja' },
                { name: 'Rhode Island Red' },
              ],
            },
          ],
        },
        {
          name: 'Turkeys',
          children: [
            {
              name: 'Turkey poults',
              children: [
                { name: 'Day-old turkey poults' },
                { name: 'Started turkey poults' },
              ],
            },
            { name: 'Broad Breasted White turkeys' },
            { name: 'Bronze turkeys' },
            { name: 'Turkey breeder stock' },
          ],
        },
        {
          name: 'Ducks',
          children: [
            {
              name: 'Day-old ducklings',
              children: [
                { name: 'Pekin ducklings' },
                { name: 'Mulard ducklings' },
              ],
            },
            { name: 'Pekin ducks' },
            { name: 'Muscovy ducks' },
            { name: 'Khaki Campbell ducks' },
            { name: 'Indian Runner ducks' },
            { name: 'Duck breeder stock' },
          ],
        },
        {
          name: 'Geese',
          children: [
            {
              name: 'Goslings',
              children: [
                { name: 'Day-old goslings' },
                { name: 'Started goslings' },
              ],
            },
            { name: 'Embden geese' },
            { name: 'Toulouse geese' },
            { name: 'Landes geese' },
            { name: 'Linda geese' },
          ],
        },
        {
          name: 'Quail',
          children: [
            { name: 'Japanese quail' },
            { name: 'Bobwhite quail' },
            { name: 'Layer quail' },
            { name: 'Day-old quail chicks' },
          ],
        },
        {
          name: 'Guinea fowl',
          children: [
            { name: 'Pearl guinea fowl' },
            { name: 'Guinea keets' },
          ],
        },
        {
          name: 'Ostriches & emus',
          children: [
            { name: 'Ostrich chicks' },
            { name: 'Breeder ostriches' },
            { name: 'Emu chicks' },
          ],
        },
        {
          name: 'Pigeons & squab',
          children: [
            { name: 'King pigeons' },
            { name: 'Squab breeders' },
          ],
        },
        {
          name: 'Pheasants & partridge',
          children: [
            { name: 'Ring-necked pheasant' },
            { name: 'Chukar partridge' },
            { name: 'Pheasant chicks' },
          ],
        },
      ],
    },
    {
      name: 'Pigs',
      ru: 'Свиньи',
      children: [
        {
          name: 'Pure breeds',
          children: [
            { name: 'Landrace' },
            { name: 'Large White (Yorkshire)' },
            { name: 'Duroc' },
            { name: 'Hampshire' },
            { name: 'Pietrain' },
            { name: 'Berkshire' },
            { name: 'Mangalitsa' },
            { name: 'Large Black' },
          ],
        },
        {
          name: 'Hybrid & crossbred pigs',
          children: [
            { name: 'F1 Landrace × Large White gilts' },
            { name: 'Terminal-cross piglets' },
            { name: 'PIC hybrid pigs' },
            { name: 'Topigs Norsvin hybrids' },
            { name: 'Duroc-cross finishers' },
          ],
        },
        {
          name: 'Piglets',
          children: [
            { name: 'Suckling piglets' },
            { name: 'Weaner piglets' },
            { name: 'Nursery piglets' },
          ],
        },
        {
          name: 'Growers & finishers',
          children: [
            { name: 'Grower pigs' },
            { name: 'Finisher pigs' },
            { name: 'Feeder pigs' },
          ],
        },
        {
          name: 'Breeding stock',
          children: [
            { name: 'Replacement gilts' },
            { name: 'In-pig sows' },
            { name: 'Breeding boars' },
            { name: 'AI boars' },
          ],
        },
        {
          name: 'Cull pigs',
          children: [
            { name: 'Cull sows' },
            { name: 'Cull boars' },
          ],
        },
      ],
    },
  ],
};
