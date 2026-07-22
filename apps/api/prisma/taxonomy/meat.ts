import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Meat is only 9 subcategories wide at level 2, so the depth all sits below it: level 3 is the
 * primal/family tier, level 4 the sub-primal, retail cut or trimming spec (lean/fat ratios, MDM,
 * sausage families), and level 5 is used where a sub-primal genuinely trades as distinct lots
 * (striploin lip-on vs lip-off, PSMO tenderloin, griller weight bands).
 */
export const meat: TaxCategory = {
  name: 'Meat',
  emoji: '🥩',
  tint: TINT.blush,
  children: [
    {
      name: 'Lamb & mutton',
      ru: 'Баранина',
      children: [
        {
          name: 'Lamb carcass',
          children: [
            { name: 'Whole lamb carcass' },
            { name: 'Lamb side' },
            { name: 'Lamb forequarter' },
            { name: 'Lamb hindquarter' },
            { name: 'Six-way cut lamb' },
            { name: 'Milk-fed lamb carcass' },
          ],
        },
        {
          name: 'Mutton carcass',
          children: [
            { name: 'Whole mutton carcass' },
            { name: 'Mutton side' },
            { name: 'Mutton forequarter' },
            { name: 'Mutton hindquarter' },
            { name: 'Ewe mutton carcass' },
          ],
        },
        {
          name: 'Lamb leg',
          children: [
            { name: 'Bone-in leg' },
            { name: 'Boneless leg' },
            { name: 'Chump-on leg' },
            { name: 'Chump-off leg' },
            { name: 'Leg steaks' },
            { name: 'Leg topside' },
            { name: 'Leg silverside' },
          ],
        },
        {
          name: 'Lamb rack & rib',
          children: [
            { name: 'Frenched rack' },
            { name: 'Cap-on rack' },
            { name: 'Rib chops' },
            { name: 'Rib cutlets' },
            { name: 'Crown roast' },
          ],
        },
        {
          name: 'Lamb shoulder',
          children: [
            { name: 'Bone-in shoulder' },
            { name: 'Boneless rolled shoulder' },
            { name: 'Square-cut shoulder' },
            { name: 'Shoulder chops' },
            { name: 'Neck fillet' },
          ],
        },
        {
          name: 'Lamb shank',
          children: [{ name: 'Fore shank' }, { name: 'Hind shank' }, { name: 'Frenched shank' }],
        },
        {
          name: 'Lamb loin',
          children: [
            { name: 'Saddle' },
            { name: 'Short loin' },
            { name: 'Loin chops' },
            { name: 'Boneless loin eye' },
            { name: 'Tenderloin' },
          ],
        },
        {
          name: 'Lamb breast & flank',
          children: [
            { name: 'Bone-in breast' },
            { name: 'Rolled breast' },
            { name: 'Riblets' },
            { name: 'Flank' },
          ],
        },
        {
          name: 'Lamb offal',
          children: [
            { name: 'Liver' },
            { name: 'Kidneys' },
            { name: 'Heart' },
            { name: 'Tongue' },
            { name: 'Sweetbreads' },
            { name: 'Tripe' },
            { name: 'Brains' },
            { name: 'Trotters' },
          ],
        },
        {
          name: 'Lamb trimmings & mince',
          children: [
            { name: '90/10 lamb trimmings' },
            { name: '85/15 lamb trimmings' },
            { name: '80/20 lamb trimmings' },
            { name: 'Lamb mince' },
            { name: 'Diced lamb' },
            { name: 'Fat-tail fat' },
          ],
        },
      ],
    },
    {
      name: 'Beef',
      ru: 'Говядина',
      children: [
        {
          name: 'Carcass & quarters',
          children: [
            { name: 'Whole carcass' },
            { name: 'Beef side' },
            { name: 'Forequarter' },
            { name: 'Hindquarter' },
            { name: 'Pistola hindquarter' },
            { name: 'Compensated quarters' },
          ],
        },
        {
          name: 'Chuck',
          children: [
            {
              name: 'Chuck roll',
              children: [
                { name: 'Chuck eye steak' },
                { name: 'Denver steak' },
                { name: 'Country-style ribs' },
              ],
            },
            { name: 'Chuck eye roll' },
            { name: 'Chuck tender' },
            {
              name: 'Blade',
              children: [
                { name: 'Flat iron steak' },
                { name: 'Top blade steak' },
                { name: 'Ranch steak' },
              ],
            },
            { name: 'Shoulder clod' },
            { name: 'Clod heart' },
            { name: 'Neck' },
            { name: 'Chuck short ribs' },
            { name: 'Chuck flap tail' },
          ],
        },
        {
          name: 'Rib',
          children: [
            { name: 'Bone-in rib primal' },
            {
              name: 'Ribeye roll',
              children: [{ name: 'Ribeye lip-on' }, { name: 'Ribeye lip-off' }],
            },
            {
              name: 'Ribeye steak',
              children: [
                { name: 'Boneless ribeye steak' },
                { name: 'Bone-in ribeye steak' },
                { name: 'Tomahawk steak' },
                { name: 'Cowboy steak' },
              ],
            },
            { name: 'Prime rib roast' },
            { name: 'Rib cap' },
            { name: 'Back ribs' },
            { name: 'Rib short ribs' },
          ],
        },
        {
          name: 'Loin',
          children: [
            { name: 'Short loin' },
            {
              name: 'Striploin',
              children: [
                { name: 'Striploin lip-on' },
                { name: 'Striploin lip-off' },
                { name: 'Bone-in strip loin' },
                { name: 'New York strip steak' },
              ],
            },
            {
              name: 'Tenderloin',
              children: [
                { name: 'PSMO tenderloin' },
                { name: 'Side muscle off tenderloin' },
                { name: 'Filet mignon' },
                { name: 'Chateaubriand' },
                { name: 'Tenderloin tips' },
              ],
            },
            {
              name: 'Top sirloin butt',
              children: [
                { name: 'Picanha' },
                { name: 'Coulotte' },
                { name: 'Center-cut top sirloin steak' },
              ],
            },
            { name: 'Bottom sirloin' },
            { name: 'Tri-tip' },
            { name: 'Bavette' },
            { name: 'Porterhouse steak' },
            { name: 'T-bone steak' },
          ],
        },
        {
          name: 'Round',
          children: [
            {
              name: 'Topside',
              children: [
                { name: 'Topside cap-on' },
                { name: 'Topside cap-off' },
                { name: 'Topside steaks' },
              ],
            },
            {
              name: 'Silverside',
              children: [
                { name: 'Outside flat' },
                { name: 'Silverside cap-off' },
                { name: 'Corned silverside' },
              ],
            },
            {
              name: 'Knuckle',
              children: [
                { name: 'Peeled knuckle' },
                { name: 'Knuckle center' },
                { name: 'Knuckle tip side' },
              ],
            },
            { name: 'Eye of round' },
            { name: 'Rump cap' },
            { name: 'Heel muscle' },
            { name: 'Round steak' },
          ],
        },
        {
          name: 'Brisket',
          children: [
            { name: 'Whole packer brisket' },
            { name: 'Brisket point' },
            { name: 'Brisket flat' },
            { name: 'Boneless trimmed brisket' },
            { name: 'Corned beef brisket' },
          ],
        },
        {
          name: 'Plate',
          children: [
            { name: 'Plate short ribs' },
            { name: 'Outside skirt' },
            { name: 'Inside skirt' },
            { name: 'Navel end plate' },
            { name: 'Hanger steak' },
          ],
        },
        {
          name: 'Flank',
          children: [
            { name: 'Flank steak' },
            { name: 'Bavette flank' },
            { name: 'Flank trimmings' },
          ],
        },
        {
          name: 'Shank',
          children: [
            { name: 'Fore shank' },
            { name: 'Hind shank' },
            { name: 'Cross-cut osso buco' },
            { name: 'Boneless shank meat' },
            { name: 'Shin & heel muscle' },
          ],
        },
        {
          name: 'Beef offal',
          children: [
            { name: 'Liver' },
            { name: 'Kidney' },
            { name: 'Heart' },
            { name: 'Tongue' },
            { name: 'Rumen tripe' },
            { name: 'Honeycomb tripe' },
            { name: 'Omasum tripe' },
            { name: 'Oxtail' },
            { name: 'Cheek meat' },
            { name: 'Sweetbreads' },
            { name: 'Lung' },
            { name: 'Spleen' },
            { name: 'Achilles tendon' },
          ],
        },
        {
          name: 'Beef trimmings & mince',
          children: [
            { name: '50/50 beef trimmings' },
            { name: '65/35 beef trimmings' },
            { name: '75/25 beef trimmings' },
            { name: '80/20 beef trimmings' },
            { name: '85/15 beef trimmings' },
            { name: '90/10 beef trimmings' },
            { name: '95/5 beef trimmings' },
            { name: 'Beef mince' },
            { name: 'Diced beef' },
            { name: 'Beef strips' },
            { name: 'Beef burger patty meat' },
          ],
        },
        {
          name: 'Veal',
          children: [
            { name: 'Veal carcass' },
            { name: 'Veal leg' },
            { name: 'Veal loin' },
            { name: 'Veal rack' },
            { name: 'Veal shoulder' },
            { name: 'Veal shank' },
            { name: 'Veal breast' },
            { name: 'Veal escalope' },
            { name: 'Veal liver' },
          ],
        },
      ],
    },
    {
      name: 'Sausages',
      ru: 'Колбасные изделия',
      children: [
        {
          name: 'Raw sausages',
          children: [
            { name: 'Fresh pork sausage' },
            { name: 'Bratwurst' },
            { name: 'Cumberland sausage' },
            { name: 'Merguez' },
            { name: 'Chorizo fresco' },
            { name: 'Breakfast sausage' },
            { name: 'Raw lula kebab' },
          ],
        },
        {
          name: 'Boiled sausages',
          children: [
            { name: 'Doktorskaya' },
            { name: 'Lyubitelskaya' },
            { name: 'Molochnaya' },
            { name: 'Mortadella' },
            { name: 'Bologna' },
            { name: 'Chicken boiled sausage' },
          ],
        },
        {
          name: 'Semi-smoked sausages',
          children: [
            { name: 'Krakowska' },
            { name: 'Kabanosy' },
            { name: 'Ukrainian semi-smoked' },
            { name: 'Hunter sausages' },
            { name: 'Tallinnskaya' },
          ],
        },
        {
          name: 'Cooked-smoked sausages',
          children: [
            { name: 'Servelat' },
            { name: 'Moskovskaya cooked-smoked' },
            { name: 'Cooked-smoked salami' },
            { name: 'Beef cooked-smoked sausage' },
          ],
        },
        {
          name: 'Raw-smoked sausages',
          children: [
            { name: 'Braunschweiger raw-smoked' },
            { name: 'Moskovskaya raw-smoked' },
            { name: 'Sudzhuk' },
            { name: 'Salami Milano' },
            { name: 'Salami Napoli' },
            { name: 'Soppressata' },
            { name: 'Chorizo curado' },
            { name: 'Fuet' },
          ],
        },
        {
          name: 'Dry-cured whole-muscle products',
          children: [
            { name: 'Jamon serrano' },
            { name: 'Prosciutto crudo' },
            { name: 'Coppa' },
            { name: 'Lardo' },
            { name: 'Pancetta' },
            { name: 'Bresaola' },
            { name: 'Basturma' },
            { name: 'Speck' },
          ],
        },
        {
          name: 'Frankfurters & wieners',
          children: [
            { name: 'Frankfurters' },
            { name: 'Wieners' },
            { name: 'Vienna sausages' },
            { name: 'Hot dog sausages' },
            { name: 'Cheese-filled sausages' },
            { name: 'Chicken frankfurters' },
            { name: 'Sardelki' },
          ],
        },
        {
          name: 'Liver sausages & pates',
          children: [
            { name: 'Liver sausage' },
            { name: 'Liverwurst' },
            { name: 'Pork liver pate' },
            { name: 'Chicken liver pate' },
            { name: 'Foie gras pate' },
          ],
        },
        {
          name: 'Blood sausages',
          children: [
            { name: 'Krovyanka' },
            { name: 'Black pudding' },
            { name: 'Morcilla' },
            { name: 'Boudin noir' },
          ],
        },
        {
          name: 'Brawn & headcheese',
          children: [
            { name: 'Headcheese' },
            { name: 'Zeltz' },
            { name: 'Sulze' },
            { name: 'Pressed meat roll' },
          ],
        },
        {
          name: 'Ham & pressed meat products',
          children: [
            { name: 'Cooked ham' },
            { name: 'Pressed ham' },
            { name: 'Shoulder ham' },
            { name: 'Gammon' },
            { name: 'Turkey ham' },
            { name: 'Chicken ham' },
          ],
        },
        {
          name: 'Snack sticks & salami sticks',
          children: [
            { name: 'Kabanos snack sticks' },
            { name: 'Salami sticks' },
            { name: 'Meat sticks with cheese' },
            { name: 'Jerky sticks' },
          ],
        },
      ],
    },
    {
      name: 'Horse meat',
      ru: 'Конина',
      children: [
        {
          name: 'Carcass & quarters',
          children: [
            { name: 'Whole carcass' },
            { name: 'Half carcass' },
            { name: 'Forequarter' },
            { name: 'Hindquarter' },
          ],
        },
        {
          name: 'Primal cuts',
          children: [
            { name: 'Loin' },
            { name: 'Tenderloin' },
            { name: 'Topside' },
            { name: 'Silverside' },
            { name: 'Knuckle' },
            { name: 'Rump' },
            { name: 'Shoulder' },
            { name: 'Rib' },
            { name: 'Brisket' },
            { name: 'Neck' },
            { name: 'Shank' },
          ],
        },
        {
          name: 'Foal meat',
          children: [
            { name: 'Foal carcass' },
            { name: 'Foal loin' },
            { name: 'Foal leg' },
            { name: 'Foal shoulder' },
          ],
        },
        {
          name: 'Horse offal',
          children: [
            { name: 'Liver' },
            { name: 'Heart' },
            { name: 'Tongue' },
            { name: 'Kidney' },
            { name: 'Intestines' },
          ],
        },
        {
          name: 'Horse trimmings & mince',
          children: [
            { name: '90/10 horse trimmings' },
            { name: '80/20 horse trimmings' },
            { name: 'Horse mince' },
            { name: 'Diced horse meat' },
          ],
        },
        {
          name: 'Cured horse specialties',
          children: [
            { name: 'Kazy' },
            { name: 'Chuchuk' },
            { name: 'Zhal' },
            { name: 'Karta' },
            { name: 'Smoked horse loin' },
            { name: 'Horse basturma' },
          ],
        },
      ],
    },
    {
      name: 'Poultry meat',
      ru: 'Мясо птицы',
      children: [
        {
          name: 'Chicken',
          children: [
            {
              name: 'Whole chicken',
              children: [
                { name: 'Griller 700-900 g' },
                { name: 'Griller 900-1100 g' },
                { name: 'Griller 1100-1300 g' },
                { name: 'Roaster 1300-1600 g' },
                { name: 'Poussin' },
                { name: 'Corn-fed whole chicken' },
              ],
            },
            { name: 'Half chicken' },
            {
              name: 'Leg quarters',
              children: [
                { name: 'Leg quarter back-on' },
                { name: 'Leg quarter back-off' },
                { name: 'Skinless leg quarter' },
              ],
            },
            { name: 'Whole legs' },
            { name: 'Drumsticks' },
            { name: 'Bone-in thighs' },
            { name: 'Boneless skinless thighs' },
            {
              name: 'Breast fillet',
              children: [
                { name: 'Whole breast fillet' },
                { name: 'Butterfly breast fillet' },
                { name: 'Breast strips' },
                { name: 'Breast cubes' },
              ],
            },
            { name: 'Bone-in breast' },
            { name: 'Inner fillet' },
            {
              name: 'Wings',
              children: [
                { name: 'Two-joint wings' },
                { name: 'Three-joint wings' },
                { name: 'Jumbo wings' },
                { name: 'Party wings' },
              ],
            },
            { name: 'Mid-joint wings' },
            { name: 'Drumettes' },
            { name: 'Wing tips' },
            { name: 'Chicken paws' },
            { name: 'Chicken feet' },
            { name: 'Chicken frame' },
          ],
        },
        {
          name: 'Turkey',
          children: [
            { name: 'Whole turkey' },
            { name: 'Turkey breast fillet' },
            { name: 'Bone-in turkey breast' },
            { name: 'Turkey tenderloin' },
            { name: 'Turkey thigh meat' },
            { name: 'Turkey drumstick' },
            { name: 'Turkey wings' },
            { name: 'Turkey neck' },
            { name: 'Turkey mince' },
          ],
        },
        {
          name: 'Duck',
          children: [
            { name: 'Whole duck' },
            { name: 'Duck breast magret' },
            { name: 'Duck leg & thigh' },
            { name: 'Duck wings' },
            { name: 'Duck paws' },
            { name: 'Duck carcass' },
            { name: 'Duck fat' },
            { name: 'Duck foie gras' },
          ],
        },
        {
          name: 'Goose',
          children: [
            { name: 'Whole goose' },
            { name: 'Goose breast' },
            { name: 'Goose leg' },
            { name: 'Goose wings' },
            { name: 'Goose fat' },
            { name: 'Goose foie gras' },
          ],
        },
        {
          name: 'Quail',
          children: [
            { name: 'Whole quail' },
            { name: 'Semi-boneless quail' },
            { name: 'Quail breast fillet' },
            { name: 'Quail legs' },
          ],
        },
        {
          name: 'Guinea fowl',
          children: [
            { name: 'Whole guinea fowl' },
            { name: 'Guinea fowl breast' },
            { name: 'Guinea fowl legs' },
          ],
        },
        {
          name: 'Ostrich',
          children: [
            { name: 'Ostrich fan fillet' },
            { name: 'Ostrich tenderloin' },
            { name: 'Ostrich oyster steak' },
            { name: 'Ostrich neck' },
            { name: 'Ostrich mince' },
          ],
        },
        {
          name: 'Poultry MDM & trimmings',
          children: [
            { name: 'Chicken MDM' },
            { name: 'Turkey MDM' },
            { name: 'Broiler trimmings' },
            { name: 'Breast trimmings' },
            { name: 'Chicken skin' },
            { name: 'Chicken fat' },
          ],
        },
        {
          name: 'Poultry offal',
          children: [
            { name: 'Chicken liver' },
            { name: 'Chicken heart' },
            { name: 'Chicken gizzard' },
            { name: 'Chicken neck' },
            { name: 'Turkey liver' },
            { name: 'Turkey gizzard' },
            { name: 'Duck gizzard' },
            { name: 'Mixed poultry offal' },
          ],
        },
      ],
    },
    {
      name: 'Venison',
      ru: 'Оленина',
      children: [
        {
          name: 'Red deer',
          children: [
            { name: 'Red deer carcass' },
            { name: 'Haunch' },
            { name: 'Saddle' },
            { name: 'Loin' },
            { name: 'Tenderloin' },
            { name: 'Rack' },
            { name: 'Shoulder' },
            { name: 'Neck' },
            { name: 'Shank' },
          ],
        },
        {
          name: 'Roe deer',
          children: [
            { name: 'Roe deer carcass' },
            { name: 'Haunch' },
            { name: 'Saddle' },
            { name: 'Loin' },
            { name: 'Shoulder' },
          ],
        },
        {
          name: 'Fallow deer',
          children: [
            { name: 'Fallow deer carcass' },
            { name: 'Haunch' },
            { name: 'Saddle' },
            { name: 'Shoulder' },
          ],
        },
        {
          name: 'Reindeer',
          children: [
            { name: 'Reindeer carcass' },
            { name: 'Haunch' },
            { name: 'Saddle' },
            { name: 'Loin' },
            { name: 'Shoulder' },
            { name: 'Shank' },
          ],
        },
        {
          name: 'Elk & moose',
          children: [
            { name: 'Elk carcass' },
            { name: 'Haunch' },
            { name: 'Loin' },
            { name: 'Shoulder' },
            { name: 'Shank' },
          ],
        },
        {
          name: 'Wild boar',
          children: [
            { name: 'Wild boar carcass' },
            { name: 'Leg' },
            { name: 'Loin' },
            { name: 'Shoulder' },
            { name: 'Ribs' },
          ],
        },
        {
          name: 'Venison offal',
          children: [{ name: 'Liver' }, { name: 'Heart' }, { name: 'Kidney' }, { name: 'Tongue' }],
        },
        {
          name: 'Venison trimmings & mince',
          children: [
            { name: '90/10 venison trimmings' },
            { name: 'Venison mince' },
            { name: 'Diced venison' },
            { name: 'Venison sausage meat' },
          ],
        },
      ],
    },
    {
      name: 'Semi-finished meat',
      ru: 'Полуфабрикаты',
      children: [
        {
          name: 'Mince & mince blends',
          children: [
            { name: 'Pork mince' },
            { name: 'Beef mince' },
            { name: 'Pork-beef mince' },
            { name: 'Chicken mince' },
            { name: 'Turkey mince' },
            { name: 'Lamb mince' },
          ],
        },
        {
          name: 'Cutlets & patties',
          children: [
            { name: 'Beef burger patty' },
            { name: 'Pork-beef cutlet' },
            { name: 'Chicken Kyiv cutlet' },
            { name: 'Pozharsky cutlet' },
            { name: 'Bitochki' },
            { name: 'Chicken schnitzel patty' },
          ],
        },
        {
          name: 'Dumplings & filled products',
          children: [
            { name: 'Pelmeni' },
            { name: 'Manti' },
            { name: 'Khinkali' },
            { name: 'Chebureki' },
            { name: 'Vareniki with meat' },
            { name: 'Samsa' },
          ],
        },
        {
          name: 'Meatballs & kebabs',
          children: [
            { name: 'Frikadelki' },
            { name: 'Lula kebab' },
            { name: 'Kofta' },
            { name: 'Zrazy' },
            { name: 'Meat rolls' },
          ],
        },
        {
          name: 'Marinated & seasoned cuts',
          children: [
            { name: 'Marinated pork neck' },
            { name: 'Marinated chicken wings' },
            { name: 'Marinated chicken thighs' },
            { name: 'Marinated lamb' },
            { name: 'Marinated beef steak' },
          ],
        },
        {
          name: 'Breaded products',
          children: [
            { name: 'Breaded chicken schnitzel' },
            { name: 'Breaded pork chop' },
            { name: 'Chicken nuggets' },
            { name: 'Chicken strips' },
            { name: 'Cordon bleu' },
          ],
        },
        {
          name: 'Skewers & shashlik',
          children: [
            { name: 'Pork shashlik' },
            { name: 'Chicken shashlik' },
            { name: 'Lamb shashlik' },
            { name: 'Beef shashlik' },
          ],
        },
        {
          name: 'Ready-cut portions',
          children: [
            { name: 'Beef stroganoff strips' },
            { name: 'Goulash cubes' },
            { name: 'Azu strips' },
            { name: 'Soup set' },
            { name: 'Portioned steaks' },
          ],
        },
      ],
    },
    {
      name: 'Lard',
      ru: 'Сало',
      children: [
        {
          name: 'Back fat',
          children: [
            { name: 'Back fat skin-on' },
            { name: 'Back fat skin-off' },
            { name: 'Frozen back fat blocks' },
            { name: 'Back fat cubes' },
          ],
        },
        {
          name: 'Belly fat',
          children: [
            { name: 'Podcherevok skin-on' },
            { name: 'Streaky belly fat' },
            { name: 'Salted belly fat' },
          ],
        },
        {
          name: 'Leaf lard',
          children: [{ name: 'Raw leaf lard' }, { name: 'Rendered leaf lard' }],
        },
        {
          name: 'Rendered lard',
          children: [
            { name: 'Refined lard' },
            { name: 'Extra-grade rendered lard' },
            { name: 'First-grade rendered lard' },
            { name: 'Technical rendered fat' },
          ],
        },
        {
          name: 'Salted lard',
          children: [
            { name: 'Dry-salted salo' },
            { name: 'Brine-salted salo' },
            { name: 'Salo with garlic' },
          ],
        },
        {
          name: 'Smoked lard',
          children: [
            { name: 'Cold-smoked salo' },
            { name: 'Hot-smoked salo' },
            { name: 'Smoked podcherevok' },
          ],
        },
        {
          name: 'Spiced lard',
          children: [
            { name: 'Salo in spices' },
            { name: 'Paprika-coated salo' },
            { name: 'Salo in onion skin' },
          ],
        },
        {
          name: 'Beef fat & suet',
          children: [
            { name: 'Kidney suet' },
            { name: 'Rendered beef tallow' },
            { name: 'Kurdyuk fat-tail fat' },
          ],
        },
        {
          name: 'Poultry fat',
          children: [{ name: 'Chicken fat' }, { name: 'Duck fat' }, { name: 'Goose fat' }],
        },
        {
          name: 'Fat trimmings',
          children: [
            { name: 'Pure fat trimmings' },
            { name: 'Jowl fat' },
            { name: 'Cutting fat blocks' },
          ],
        },
      ],
    },
    {
      name: 'Pork',
      ru: 'Свинина',
      children: [
        {
          name: 'Carcass & sides',
          children: [
            { name: 'Whole carcass' },
            { name: 'Half carcass' },
            { name: 'Pork side skin-on' },
            { name: 'Pork side skin-off' },
            { name: 'Forequarter' },
            { name: 'Hindquarter' },
          ],
        },
        {
          name: 'Shoulder butt',
          children: [
            { name: 'Bone-in Boston butt' },
            { name: 'Boneless Boston butt' },
            { name: 'Collar butt' },
            { name: 'Blade shoulder' },
            { name: 'Coppa muscle' },
            { name: 'Shoulder steaks' },
          ],
        },
        {
          name: 'Picnic shoulder',
          children: [
            { name: 'Bone-in picnic' },
            { name: 'Boneless picnic' },
            { name: 'Skinless picnic' },
            { name: 'Picnic cushion' },
            { name: 'Shoulder hock' },
          ],
        },
        {
          name: 'Loin',
          children: [
            { name: 'Bone-in loin' },
            {
              name: 'Boneless loin',
              children: [
                { name: 'Loin cap-on' },
                { name: 'Loin cap-off' },
                { name: 'Center-cut loin' },
                { name: 'Loin end pieces' },
              ],
            },
            { name: 'Loin eye' },
            { name: 'Tenderloin' },
            { name: 'Rib-end chops' },
            { name: 'Center-cut chops' },
            { name: 'Sirloin end' },
          ],
        },
        {
          name: 'Belly',
          children: [
            { name: 'Belly skin-on bone-in' },
            { name: 'Belly skin-on boneless' },
            { name: 'Belly skinless boneless' },
            { name: 'Belly squares' },
            { name: 'Streaky belly slices' },
            { name: 'Bacon-ready trimmed belly' },
          ],
        },
        {
          name: 'Ham',
          children: [
            { name: 'Bone-in ham' },
            {
              name: 'Boneless ham',
              children: [{ name: '4D ham' }, { name: '3D ham' }, { name: 'Cap-off ham' }],
            },
            { name: 'Inside ham topside' },
            { name: 'Outside ham silverside' },
            { name: 'Ham knuckle' },
            { name: 'Ham shank' },
            { name: 'Ham cushion' },
            { name: 'Gammon rump' },
          ],
        },
        {
          name: 'Ribs',
          children: [
            { name: 'Baby back ribs' },
            { name: 'Spare ribs' },
            { name: 'St. Louis cut ribs' },
            { name: 'Riblets' },
            { name: 'Rib tips' },
            { name: 'Brisket bone' },
            { name: 'Neck bones' },
          ],
        },
        {
          name: 'Head & offal',
          children: [
            { name: 'Pig head' },
            { name: 'Jowl' },
            { name: 'Pig ears' },
            { name: 'Snout' },
            { name: 'Trotters' },
            { name: 'Tail' },
            { name: 'Liver' },
            { name: 'Heart' },
            { name: 'Kidney' },
            { name: 'Lungs' },
            { name: 'Stomach' },
            { name: 'Small intestines' },
            { name: 'Tongue' },
            { name: 'Brains' },
          ],
        },
        {
          name: 'Trimmings & mince',
          children: [
            { name: '50/50 pork trimmings' },
            { name: '60/40 pork trimmings' },
            { name: '70/30 pork trimmings' },
            { name: '80/20 pork trimmings' },
            { name: '90/10 pork trimmings' },
            { name: 'Pork mince' },
            { name: 'Diced pork' },
            { name: 'Sausage meat' },
          ],
        },
        {
          name: 'Fat & skin',
          children: [
            { name: 'Pork rind' },
            { name: 'Frozen rind blocks' },
            { name: 'Back fat' },
            { name: 'Leaf fat' },
            { name: 'Jowl fat' },
          ],
        },
        {
          name: 'Suckling pig',
          children: [
            { name: 'Suckling pig 5-8 kg' },
            { name: 'Suckling pig 8-12 kg' },
            { name: 'Dressed suckling pig carcass' },
          ],
        },
      ],
    },
  ],
};
