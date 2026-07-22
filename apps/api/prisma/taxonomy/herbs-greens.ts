import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Herbs & greens goes 4 levels deep on the culinary-herb workhorses (basil, mint, parsley, dill,
 * cilantro/coriander, green onion, leek, spinach, celery, arugula, thyme, rosemary), where lots split
 * first by botanical type or trade form (fresh cut / potted live / dried / IQF) and then by real
 * cultivar or processing cut. The named lettuce level-2s (Iceberg, Lollo Rosso, Romaine, Oakleaf,
 * Frisée, Radicchio, Tatsoi) branch on how the lot is presented — whole head, heart, baby leaf,
 * root-attached living, washed-and-cut — because that, not another variety name, is what a buyer
 * filters on below a variety. Long-tail herbs stop at a single level-3 tier of trade forms.
 */
export const herbsGreens: TaxCategory = {
  name: 'Herbs & greens',
  emoji: '🥬',
  tint: TINT.green,
  children: [
    {
      name: 'Basil',
      ru: 'Базилик',
      children: [
        {
          name: 'Sweet green basil',
          children: [
            { name: 'Genovese' },
            { name: 'Nufar' },
            { name: 'Aroma 2' },
            { name: 'Italian Large Leaf' },
            { name: 'Napoletano lettuce-leaf' },
            { name: 'Emerald Towers' },
            { name: 'Marseillais' },
          ],
        },
        {
          name: 'Purple basil',
          children: [
            { name: 'Dark Opal' },
            { name: 'Red Rubin' },
            { name: 'Purple Ruffles' },
            { name: 'Amethyst Improved' },
            { name: 'Rosie' },
          ],
        },
        {
          name: 'Thai basil',
          children: [
            { name: 'Siam Queen' },
            { name: 'Queenette' },
            { name: 'Thai lemon basil (Maenglak)' },
          ],
        },
        {
          name: 'Holy basil (tulsi)',
          children: [
            { name: 'Rama tulsi' },
            { name: 'Krishna tulsi' },
            { name: 'Vana tulsi' },
            { name: 'Amrita tulsi' },
          ],
        },
        {
          name: 'Lemon & lime basil',
          children: [
            { name: "Mrs. Burns' Lemon" },
            { name: 'Sweet Dani' },
            { name: 'Lime basil' },
          ],
        },
        { name: 'Cinnamon basil' },
        {
          name: 'Greek bush basil',
          children: [{ name: 'Spicy Globe' }, { name: 'Fine Verde' }, { name: 'Minette' }],
        },
        {
          name: 'Fresh cut basil',
          children: [
            { name: 'Bunched basil with stem' },
            { name: 'Loose leaf basil in clamshell' },
            { name: 'Basil tips & tops' },
          ],
        },
        {
          name: 'Potted live basil',
          children: [
            { name: 'Potted Genovese' },
            { name: 'Potted Thai basil' },
            { name: 'Potted purple basil' },
            { name: 'Potted tulsi' },
          ],
        },
        {
          name: 'Dried basil',
          children: [
            { name: 'Rubbed basil leaf' },
            { name: 'Cut & sifted basil' },
            { name: 'Ground basil' },
            { name: 'Freeze-dried basil leaf' },
            { name: 'Dried tulsi leaf' },
          ],
        },
        {
          name: 'Frozen basil',
          children: [
            { name: 'IQF chopped basil' },
            { name: 'IQF whole basil leaf' },
            { name: 'Frozen basil purée blocks' },
            { name: 'Frozen pesto base' },
          ],
        },
      ],
    },
    {
      name: 'Oregano',
      ru: 'Душица',
      children: [
        { name: 'Greek oregano' },
        { name: 'Turkish oregano' },
        { name: 'Italian oregano' },
        { name: 'Common wild marjoram' },
        { name: 'Mexican oregano' },
        { name: 'Syrian oregano (zaatar)' },
        { name: 'Fresh cut oregano' },
        { name: 'Potted live oregano' },
        {
          name: 'Dried oregano',
          children: [
            { name: 'Rubbed oregano leaf' },
            { name: 'Cut & sifted oregano' },
            { name: 'Ground oregano' },
            { name: 'Tea-bag cut oregano' },
          ],
        },
        { name: 'IQF oregano leaf' },
      ],
    },
    {
      name: 'Fireweed tea',
      ru: 'Иван-чай',
      children: [
        {
          name: 'Fermented fireweed tea',
          children: [
            { name: 'Granulated fermented fireweed' },
            { name: 'Large-leaf fermented fireweed' },
            { name: 'Twisted-leaf fermented fireweed' },
            { name: 'Tea-bag cut fireweed' },
          ],
        },
        { name: 'Unfermented dried fireweed leaf' },
        { name: 'Roasted fireweed tea' },
        { name: 'Fireweed flower tea' },
        { name: 'Fresh fireweed leaf for processing' },
        { name: 'Dried fireweed root' },
      ],
    },
    {
      name: 'Cilantro',
      ru: 'Кинза',
      children: [
        {
          name: 'Slow-bolt cilantro',
          children: [
            { name: 'Santo' },
            { name: 'Calypso' },
            { name: 'Cruiser' },
            { name: 'Leisure' },
            { name: 'Marino' },
            { name: 'Slo-Bolt' },
          ],
        },
        {
          name: 'Large-leaf cilantro',
          children: [{ name: 'Jantar' }, { name: 'Confetti' }, { name: 'Karibe' }],
        },
        { name: 'Cilantro with root (Thai coriander root)' },
        { name: 'Sawtooth coriander (culantro)' },
        { name: 'Micro cilantro' },
        {
          name: 'Fresh cut cilantro',
          children: [
            { name: 'Bunched cilantro' },
            { name: 'Washed loose cilantro leaf' },
            { name: 'Cilantro tops trimmed' },
          ],
        },
        { name: 'Potted live cilantro' },
        {
          name: 'Dried cilantro leaf',
          children: [
            { name: 'Cut & sifted cilantro leaf' },
            { name: 'Freeze-dried cilantro' },
            { name: 'Cilantro leaf powder' },
          ],
        },
        {
          name: 'Frozen cilantro',
          children: [
            { name: 'IQF chopped cilantro' },
            { name: 'Frozen cilantro purée cubes' },
          ],
        },
      ],
    },
    {
      name: 'Coriander',
      ru: 'Кориандр',
      children: [
        {
          name: 'Whole coriander seed',
          children: [
            { name: 'Eagle (badami) quality' },
            { name: 'Scooter (green) quality' },
            { name: 'Single parrot quality' },
            { name: 'Double parrot quality' },
            { name: 'Indian bold seed' },
            { name: 'European small seed' },
          ],
        },
        {
          name: 'Indian coriander cultivars',
          children: [
            { name: 'Co-4' },
            { name: 'Sadhana (CS-6)' },
            { name: 'Swathi (CS-2)' },
            { name: 'Sindhu' },
            { name: 'RCr-435' },
            { name: 'GCr-2' },
            { name: 'Rajendra Swati' },
            { name: 'Hisar Sugandh' },
            { name: 'Pant Haritima' },
          ],
        },
        { name: 'Split coriander seed (dal)' },
        { name: 'Roasted coriander seed' },
        {
          name: 'Ground coriander',
          children: [
            { name: '40 mesh coriander powder' },
            { name: '60 mesh coriander powder' },
            { name: '80 mesh coriander powder' },
          ],
        },
        { name: 'Crushed coriander (coarse)' },
      ],
    },
    {
      name: 'Garden cress',
      ru: 'Кресс-салат',
      children: [
        {
          name: 'Curled cress',
          children: [{ name: 'Curled Cress' }, { name: 'Wrinkled Crinkled Crumpled' }],
        },
        {
          name: 'Broadleaf cress',
          children: [{ name: 'Persian Broadleaf' }, { name: 'Bubbles' }, { name: 'Cressida' }],
        },
        { name: 'Upland cress' },
        { name: 'Living cress in punnet' },
        { name: 'Cress microgreen mats' },
        { name: 'Cut loose cress' },
      ],
    },
    {
      name: 'Butterhead lettuce',
      ru: 'Латук',
      children: [
        {
          name: 'Green butterhead (Boston type)',
          children: [
            { name: 'Buttercrunch' },
            { name: 'Rex' },
            { name: 'Adriana' },
            { name: 'Optima' },
            { name: 'Nancy' },
            { name: 'Alkindus' },
            { name: 'Divina' },
          ],
        },
        {
          name: 'Red butterhead',
          children: [{ name: 'Skyphos' }, { name: 'Merlot' }, { name: 'Sanguine Ameliore' }],
        },
        {
          name: 'Bibb & mini butterhead',
          children: [{ name: 'Limestone Bibb' }, { name: 'Summer Bibb' }, { name: 'Tom Thumb' }],
        },
        { name: 'Living root-attached butterhead' },
        { name: 'Greenhouse hydroponic butterhead' },
        { name: 'Washed-and-cut butterhead leaf' },
      ],
    },
    {
      name: 'Beet greens',
      ru: 'Лист свёклы',
      children: [
        { name: 'Beet tops bunched with baby beet' },
        {
          name: 'Loose beet leaf',
          children: [{ name: 'Early Wonder Tall Top' }, { name: 'Lutz Green Leaf' }],
        },
        {
          name: 'Baby-leaf beet',
          children: [{ name: "Bull's Blood" }, { name: 'Red Ace tops' }],
        },
        { name: 'Red-stem beet leaf' },
        { name: 'IQF chopped beet greens' },
        { name: 'Dried beet leaf' },
      ],
    },
    {
      name: 'Green onion',
      ru: 'Лук зелёный',
      children: [
        {
          name: 'Bunching onion (Allium fistulosum)',
          children: [
            { name: 'Evergreen Hardy White' },
            { name: 'Ishikura' },
            { name: 'Nabechan' },
            { name: 'Parade' },
            { name: 'White Lisbon' },
            { name: 'Tokyo Long White' },
            { name: 'Performer' },
            { name: 'Guardsman' },
          ],
        },
        {
          name: 'Red-stem bunching onion',
          children: [{ name: 'Deep Purple' }, { name: 'Red Beard' }, { name: 'Redwing scallion' }],
        },
        {
          name: 'Welsh onion (batun)',
          children: [{ name: 'Aprilsky' }, { name: 'Russkiy Zimniy' }, { name: 'Baiya Verde' }],
        },
        { name: 'Salad onion with bulb' },
        { name: 'Forced green onion tops from sets' },
        { name: 'Baby & micro green onion' },
        {
          name: 'Fresh cut green onion',
          children: [
            { name: 'Bunched with root' },
            { name: 'Trimmed & topped scallion' },
            { name: 'Cleaned green onion in sleeve' },
          ],
        },
        {
          name: 'Frozen green onion',
          children: [{ name: 'IQF chopped green onion' }, { name: 'IQF green onion rings' }],
        },
        {
          name: 'Dried green onion',
          children: [
            { name: 'Dehydrated green onion rings' },
            { name: 'Freeze-dried green onion' },
            { name: 'Green onion flake' },
          ],
        },
      ],
    },
    {
      name: 'Leek',
      ru: 'Лук-порей',
      children: [
        {
          name: 'Summer leek',
          children: [
            { name: 'King Richard' },
            { name: 'Lincoln' },
            { name: 'Pancho' },
            { name: 'Titan' },
            { name: 'Zermatt' },
          ],
        },
        {
          name: 'Autumn leek',
          children: [
            { name: 'Columbus' },
            { name: 'Krypton' },
            { name: 'Autumn Giant (Herfstreuzen)' },
            { name: 'Jolant' },
          ],
        },
        {
          name: 'Winter overwintering leek',
          children: [
            { name: 'Bandit' },
            { name: 'Bleu de Solaise' },
            { name: 'Siegfried Frost' },
            { name: 'Giant Winter' },
            { name: 'Musselburgh' },
            { name: 'Carentan' },
          ],
        },
        { name: 'Baby & pencil leek' },
        {
          name: 'Trimmed fresh-cut leek',
          children: [
            { name: 'Trimmed washed shanks' },
            { name: 'Sliced leek rings' },
            { name: 'Leek flag & greens for processing' },
          ],
        },
        {
          name: 'Frozen leek',
          children: [
            { name: 'IQF sliced leek' },
            { name: 'IQF leek rings' },
            { name: 'Frozen leek & greens mix' },
          ],
        },
        {
          name: 'Dried leek',
          children: [
            { name: 'Dehydrated leek slices' },
            { name: 'Leek powder' },
            { name: 'Freeze-dried leek rings' },
          ],
        },
      ],
    },
    {
      name: 'Lovage',
      ru: 'Любисток',
      children: [
        {
          name: 'Fresh cut lovage leaf',
          children: [{ name: 'Amur' }, { name: 'Udalets' }, { name: 'Don' }],
        },
        { name: 'Potted live lovage' },
        { name: 'Dried lovage leaf' },
        { name: 'Dried lovage root' },
        { name: 'Lovage seed' },
        { name: 'IQF chopped lovage' },
      ],
    },
    {
      name: 'Marjoram',
      ru: 'Майоран',
      children: [
        {
          name: 'Sweet marjoram',
          children: [
            { name: 'Erfo' },
            { name: 'Marcelka' },
            { name: 'Byzantine' },
            { name: 'Tushinsky' },
          ],
        },
        { name: 'Pot marjoram' },
        { name: 'Fresh cut marjoram' },
        { name: 'Potted live marjoram' },
        {
          name: 'Dried marjoram',
          children: [
            { name: 'Rubbed marjoram leaf' },
            { name: 'Cut & sifted marjoram' },
            { name: 'Ground marjoram' },
          ],
        },
        { name: 'IQF marjoram leaf' },
      ],
    },
    {
      name: 'Chard',
      ru: 'Мангольд',
      children: [
        {
          name: 'White-stem green chard',
          children: [{ name: 'Fordhook Giant' }, { name: 'Lucullus' }, { name: 'Barese' }],
        },
        {
          name: 'Rainbow chard',
          children: [{ name: 'Bright Lights' }, { name: 'Five Colour Silverbeet' }],
        },
        {
          name: 'Red-stem chard',
          children: [{ name: 'Ruby Red' }, { name: 'Rhubarb Chard' }, { name: 'Magenta Sunset' }],
        },
        {
          name: 'Yellow & gold chard',
          children: [{ name: 'Bright Yellow' }, { name: 'Canary Yellow' }],
        },
        { name: 'Perpetual spinach chard' },
        { name: 'Baby-leaf chard' },
        { name: 'Fresh-cut washed chard leaf' },
        { name: 'IQF chopped chard' },
      ],
    },
    {
      name: 'Lemon balm',
      ru: 'Мелисса',
      children: [
        {
          name: 'Green lemon balm',
          children: [
            { name: 'Quedlinburger Niederliegende' },
            { name: 'Citronella' },
            { name: 'Lemonella' },
            { name: 'Isabella' },
          ],
        },
        {
          name: 'Variegated lemon balm',
          children: [{ name: 'Aurea' }, { name: 'All Gold' }],
        },
        { name: 'Fresh cut lemon balm' },
        { name: 'Potted live lemon balm' },
        {
          name: 'Dried lemon balm',
          children: [
            { name: 'Cut & sifted lemon balm leaf' },
            { name: 'Tea-bag cut lemon balm' },
            { name: 'Lemon balm powder' },
          ],
        },
        { name: 'IQF lemon balm leaf' },
      ],
    },
    {
      name: 'Mint',
      ru: 'Мята',
      children: [
        {
          name: 'Peppermint',
          children: [
            { name: 'Black Mitcham' },
            { name: 'White Mitcham' },
            { name: "Todd's Mitcham" },
            { name: 'Kukrail' },
            { name: 'CIM-Madhuras' },
            { name: 'CIM-Indus' },
          ],
        },
        {
          name: 'Spearmint',
          children: [
            { name: 'Native spearmint' },
            { name: 'Scotch spearmint' },
            { name: 'Arka' },
            { name: 'Neerkalka' },
            { name: 'MSS-5' },
          ],
        },
        {
          name: 'Menthol mint (Mentha arvensis)',
          children: [
            { name: 'Kosi' },
            { name: 'Himalaya' },
            { name: 'Shivalik' },
            { name: 'Saksham' },
            { name: 'CIM-Kranti' },
            { name: 'Gomti' },
          ],
        },
        {
          name: 'Moroccan mint (Nana)',
          children: [{ name: 'Nana spearmint' }, { name: 'Marrakech mint' }],
        },
        { name: 'Bergamot mint (Kiran)' },
        { name: 'Apple & pineapple mint' },
        { name: 'Chocolate mint' },
        { name: 'Field & wild mint' },
        {
          name: 'Fresh cut mint',
          children: [
            { name: 'Bunched mint' },
            { name: 'Mint tips & tops' },
            { name: 'Washed loose mint leaf' },
          ],
        },
        {
          name: 'Potted live mint',
          children: [
            { name: 'Potted peppermint' },
            { name: 'Potted spearmint' },
            { name: 'Potted Moroccan mint' },
            { name: 'Potted chocolate mint' },
          ],
        },
        {
          name: 'Dried mint',
          children: [
            { name: 'Dried peppermint leaf cut & sifted' },
            { name: 'Dried spearmint leaf' },
            { name: 'Dried Nane (Moroccan) mint' },
            { name: 'Tea-bag cut mint' },
            { name: 'Mint leaf powder' },
          ],
        },
        {
          name: 'Frozen mint',
          children: [
            { name: 'IQF chopped mint' },
            { name: 'IQF whole mint leaf' },
            { name: 'Frozen mint purée' },
          ],
        },
      ],
    },
    {
      name: 'Fern',
      ru: 'Папоротник',
      children: [
        { name: 'Fresh bracken fern shoots' },
        { name: 'Ostrich fern fiddleheads' },
        { name: 'Osmunda (royal fern) shoots' },
        {
          name: 'Barrel-salted bracken',
          children: [
            { name: 'First-salting bracken' },
            { name: 'Second-salting bracken' },
            { name: 'Third-salting finished bracken' },
          ],
        },
        { name: 'Dried bracken stems' },
        { name: 'Blanched fern in brine' },
        { name: 'IQF fern shoots' },
      ],
    },
    {
      name: 'Parsley',
      ru: 'Петрушка',
      children: [
        {
          name: 'Curly-leaf parsley',
          children: [
            { name: 'Moss Curled 2' },
            { name: 'Darki' },
            { name: 'Triple Curled' },
            { name: 'Forest Green' },
            { name: 'Bravour' },
            { name: 'Petra' },
            { name: 'Astra' },
          ],
        },
        {
          name: 'Flat-leaf (Italian) parsley',
          children: [
            { name: "Gigante d'Italia" },
            { name: 'Titan' },
            { name: 'Laura' },
            { name: 'Plain Leaf 2' },
            { name: 'Italian Dark Green' },
            { name: 'Bogatyr' },
          ],
        },
        {
          name: 'Hamburg root parsley',
          children: [
            { name: 'Berliner Halblange' },
            { name: 'Alba' },
            { name: 'Eagle' },
            { name: 'Arat' },
            { name: 'Sakharnaya' },
            { name: 'Urozhaynaya' },
          ],
        },
        { name: 'Baby-leaf parsley' },
        {
          name: 'Fresh cut parsley',
          children: [
            { name: 'Bunched parsley' },
            { name: 'Washed loose parsley leaf' },
            { name: 'Parsley stems for processing' },
          ],
        },
        { name: 'Potted live parsley' },
        {
          name: 'Dried parsley',
          children: [
            {
              name: 'Dehydrated parsley flakes',
              children: [{ name: '3x3 mm cut' }, { name: '6x6 mm cut' }, { name: '10x10 mm cut' }],
            },
            { name: 'Parsley powder' },
            { name: 'Freeze-dried parsley leaf' },
            { name: 'Dried parsley stem granules' },
          ],
        },
        {
          name: 'Frozen parsley',
          children: [
            { name: 'IQF chopped parsley' },
            { name: 'IQF parsley leaf' },
            { name: 'Frozen parsley cubes' },
          ],
        },
      ],
    },
    {
      name: 'Rhubarb',
      ru: 'Ревень',
      children: [
        {
          name: 'Forced (hothouse) rhubarb',
          children: [
            { name: 'Timperley Early' },
            { name: 'Stockbridge Arrow' },
            { name: 'Prince Albert' },
          ],
        },
        {
          name: 'Field-grown red-stalk rhubarb',
          children: [
            { name: 'Victoria' },
            { name: 'Canada Red' },
            { name: 'Crimson Red' },
            { name: 'Valentine' },
            { name: 'MacDonald' },
          ],
        },
        {
          name: 'Field-grown green-stalk rhubarb',
          children: [{ name: "Glaskin's Perpetual" }, { name: 'Krupnochereshkovy' }],
        },
        {
          name: 'Frozen rhubarb',
          children: [
            { name: 'IQF diced rhubarb' },
            { name: 'IQF sliced rhubarb' },
            { name: 'Frozen rhubarb blocks' },
          ],
        },
        { name: 'Rhubarb purée' },
        { name: 'Dried rhubarb stalk' },
      ],
    },
    {
      name: 'Rosemary',
      ru: 'Розмарин',
      children: [
        {
          name: 'Upright rosemary',
          children: [
            { name: 'Tuscan Blue' },
            { name: "Miss Jessopp's Upright" },
            { name: 'Barbeque' },
            { name: 'Gorizia' },
            { name: 'Blue Spires' },
          ],
        },
        {
          name: 'Cold-hardy rosemary',
          children: [
            { name: 'Arp' },
            { name: 'Hill Hardy' },
            { name: 'Madeline Hill' },
            { name: 'Athens Blue Spire' },
          ],
        },
        {
          name: 'Prostrate rosemary',
          children: [
            { name: 'Prostratus' },
            { name: 'Huntington Carpet' },
            { name: 'Irene' },
            { name: 'Santa Barbara' },
          ],
        },
        {
          name: 'Fresh cut rosemary',
          children: [
            { name: 'Bunched rosemary stems' },
            { name: 'Rosemary tips & sprigs' },
            { name: 'Stripped rosemary leaf' },
          ],
        },
        { name: 'Potted live rosemary' },
        {
          name: 'Dried rosemary',
          children: [
            { name: 'Whole dried rosemary leaf' },
            { name: 'Cut & sifted rosemary' },
            { name: 'Ground rosemary' },
            { name: 'Tea-bag cut rosemary' },
          ],
        },
        { name: 'IQF rosemary leaf' },
        { name: 'Rosemary herb bales for distillation' },
      ],
    },
    {
      name: 'Arugula',
      ru: 'Руккола',
      children: [
        {
          name: 'Cultivated salad rocket',
          children: [
            { name: 'Astro' },
            { name: 'Esmee' },
            { name: 'Coltivata' },
            { name: 'Runway' },
            { name: 'Rococo' },
            { name: 'Poker' },
          ],
        },
        {
          name: 'Wild rocket (Diplotaxis)',
          children: [
            { name: 'Sylvetta' },
            { name: 'Dentellata' },
            { name: 'Olivetta' },
            { name: 'Tricia' },
            { name: 'Grazia' },
            { name: 'Frastagliata' },
          ],
        },
        { name: 'Baby-leaf rocket washed ready-to-eat' },
        { name: 'Bunched rocket with root' },
        { name: 'Rocket microgreens' },
        { name: 'Potted live rocket' },
        { name: 'IQF rocket leaf' },
        { name: 'Freeze-dried rocket leaf' },
      ],
    },
    {
      name: 'Iceberg lettuce',
      ru: 'Салат Айсберг',
      children: [
        {
          name: 'Field-packed whole heads',
          children: [
            { name: 'Great Lakes 659' },
            { name: 'Crispino' },
            { name: 'Diamond' },
            { name: 'Ballade' },
            { name: 'Vanguard 75' },
            { name: 'Raider' },
          ],
        },
        { name: 'Cored & film-wrapped heads' },
        { name: 'Mini & baby iceberg' },
        { name: 'Greenhouse hydroponic iceberg' },
        {
          name: 'Fresh-cut iceberg',
          children: [
            { name: 'Shredded iceberg' },
            { name: 'Diced iceberg' },
            { name: 'Iceberg leaf cups' },
          ],
        },
      ],
    },
    {
      name: 'Baby-mix salad',
      ru: 'Салат Бэби-микс',
      children: [
        { name: 'Mesclun mix' },
        { name: 'Baby-leaf lettuce mix' },
        { name: 'Spicy Asian mustard mix' },
        { name: 'Baby spinach & chard mix' },
        { name: 'Red & green oakleaf mix' },
        { name: 'Micro-leaf mix' },
        { name: 'Washed ready-to-eat bagged mix' },
        { name: 'Unwashed bulk baby leaf' },
      ],
    },
    {
      name: 'Oakleaf lettuce',
      ru: 'Салат Дуболистный',
      children: [
        {
          name: 'Green oakleaf heads',
          children: [{ name: 'Salad Bowl' }, { name: 'Panisse' }, { name: 'Kibrille' }],
        },
        {
          name: 'Red oakleaf heads',
          children: [
            { name: 'Red Salad Bowl' },
            { name: 'Oscarde' },
            { name: 'Cocarde' },
            { name: 'Navara' },
          ],
        },
        { name: 'Baby oakleaf leaf' },
        { name: 'Living root-attached oakleaf' },
        { name: 'Washed-and-cut oakleaf leaf' },
      ],
    },
    {
      name: 'Lollo Rosso lettuce',
      ru: 'Салат Лолло Россо',
      children: [
        {
          name: 'Field-grown whole heads',
          children: [
            { name: 'Revolution' },
            { name: 'Nika' },
            { name: 'Solsun' },
            { name: 'Carmesi' },
          ],
        },
        { name: 'Greenhouse hydroponic heads' },
        { name: 'Living root-attached lollo' },
        { name: 'Baby lollo leaf' },
        { name: 'Washed-and-cut lollo leaf' },
      ],
    },
    {
      name: 'Radicchio',
      ru: 'Салат Радиччио',
      children: [
        {
          name: 'Chioggia radicchio',
          children: [
            { name: 'Leonardo' },
            { name: 'Indigo' },
            { name: 'Fiero' },
            { name: 'Rossana' },
          ],
        },
        {
          name: 'Treviso radicchio',
          children: [{ name: 'Treviso Precoce' }, { name: 'Treviso Tardivo' }],
        },
        { name: 'Castelfranco radicchio' },
        { name: 'Verona radicchio' },
        { name: 'Variegato di Lusia' },
        { name: 'Washed-and-cut radicchio leaf' },
      ],
    },
    {
      name: 'Romaine lettuce',
      ru: 'Салат Романо',
      children: [
        {
          name: 'Full-size romaine heads',
          children: [
            { name: 'Parris Island Cos' },
            { name: 'Green Towers' },
            { name: 'Sunbelt' },
            { name: 'Clemente' },
            { name: 'Xanadu' },
          ],
        },
        { name: 'Trimmed romaine hearts' },
        {
          name: 'Baby romaine & Little Gem',
          children: [
            { name: 'Little Gem' },
            { name: 'Winter Density' },
            { name: 'Truchas' },
          ],
        },
        {
          name: 'Red romaine',
          children: [
            { name: "Rouge d'Hiver" },
            { name: 'Cimmaron' },
            { name: 'Breen' },
          ],
        },
        { name: 'Living root-attached romaine' },
        { name: 'Washed-and-chopped romaine' },
      ],
    },
    {
      name: 'Tatsoi',
      ru: 'Салат Тат-сой',
      children: [
        { name: 'Full-rosette tatsoi' },
        { name: 'Baby-leaf tatsoi' },
        { name: 'Red tatsoi' },
        { name: 'Yukina Savoy tatsoi' },
        { name: 'Tatsoi microgreens' },
        { name: 'Greenhouse hydroponic tatsoi' },
        { name: 'Washed-and-cut tatsoi leaf' },
      ],
    },
    {
      name: 'Frisée lettuce',
      ru: 'Салат Фриссе',
      children: [
        {
          name: 'Blanched-heart frisée',
          children: [
            { name: 'Très Fine Maraîchère' },
            { name: 'Fine de Louviers' },
            { name: 'Wallonne' },
            { name: 'Kethel' },
          ],
        },
        { name: 'Unblanched green frisée' },
        { name: 'Baby frisée' },
        {
          name: 'Escarole (broad-leaved endive)',
          children: [{ name: 'Natacha' }, { name: 'Bubikopf' }, { name: 'Grosse Bouclée' }],
        },
        { name: 'Washed-and-cut frisée leaf' },
      ],
    },
    {
      name: 'Celery',
      ru: 'Сельдерей',
      children: [
        {
          name: 'Green stalk celery (Pascal type)',
          children: [
            { name: 'Tall Utah 52-70 Improved' },
            { name: 'Conquistador' },
            { name: 'Green Bay' },
            { name: 'Tango' },
            { name: 'Balada' },
            { name: 'Victoria' },
            { name: 'Darlena' },
          ],
        },
        {
          name: 'Golden self-blanching celery',
          children: [
            { name: 'Golden Self Blanching' },
            { name: 'Lathom Self Blanching' },
            { name: 'Golden Boy' },
          ],
        },
        {
          name: 'Red celery',
          children: [{ name: 'Redventure' }, { name: 'Giant Red' }],
        },
        {
          name: 'Celeriac (root celery)',
          children: [
            { name: 'Giant Prague' },
            { name: 'Monarch' },
            { name: 'Brilliant' },
            { name: 'Diamant' },
            { name: 'Mars' },
            { name: 'Balena' },
          ],
        },
        {
          name: 'Leaf & cutting celery',
          children: [
            { name: 'Amsterdamse Snij' },
            { name: 'Par-Cel' },
            { name: 'Safir' },
            { name: 'Zakhar' },
          ],
        },
        {
          name: 'Fresh-cut celery',
          children: [
            { name: 'Celery hearts' },
            { name: 'Celery sticks & batons' },
            { name: 'Diced celery' },
          ],
        },
        {
          name: 'Frozen celery',
          children: [
            { name: 'IQF diced celery' },
            { name: 'IQF sliced celery' },
            { name: 'Frozen mirepoix celery' },
          ],
        },
        {
          name: 'Dried celery',
          children: [
            { name: 'Celery flakes' },
            { name: 'Celery powder' },
            { name: 'Dried celery leaf' },
          ],
        },
        {
          name: 'Celery seed',
          children: [{ name: 'Whole celery seed' }, { name: 'Ground celery seed' }],
        },
      ],
    },
    {
      name: 'Thyme',
      ru: 'Тимьян',
      children: [
        {
          name: 'Common garden thyme',
          children: [
            { name: 'German Winter' },
            { name: 'English Wild' },
            { name: 'French Summer' },
            { name: 'Varico 3' },
            { name: 'Compactus' },
          ],
        },
        {
          name: 'Lemon thyme',
          children: [
            { name: 'Golden Lemon' },
            { name: 'Silver Queen' },
            { name: 'Doone Valley' },
          ],
        },
        {
          name: 'Creeping wild thyme',
          children: [{ name: 'Bogorodskaya' }, { name: 'Elfin' }],
        },
        { name: 'Caraway thyme' },
        {
          name: 'Fresh cut thyme',
          children: [
            { name: 'Bunched thyme' },
            { name: 'Thyme sprigs & tips' },
            { name: 'Stripped thyme leaf' },
          ],
        },
        { name: 'Potted live thyme' },
        {
          name: 'Dried thyme',
          children: [
            { name: 'Rubbed thyme leaf' },
            { name: 'Cut & sifted thyme' },
            { name: 'Ground thyme' },
            { name: 'Tea-bag cut thyme' },
            { name: 'Thyme riddlings & stems' },
          ],
        },
        { name: 'IQF thyme leaf' },
      ],
    },
    {
      name: 'Dill',
      ru: 'Укроп',
      children: [
        {
          name: 'Bunching leaf dill',
          children: [
            { name: 'Dukat' },
            { name: 'Superdukat' },
            { name: 'Grenadier' },
            { name: 'Alligator' },
            { name: 'Kibray' },
            { name: 'Green Sleeves' },
            { name: 'Hera' },
          ],
        },
        {
          name: 'Pickling dill with umbels',
          children: [
            { name: 'Mammoth' },
            { name: 'Bouquet' },
            { name: 'Vierling' },
            { name: 'Salut' },
          ],
        },
        { name: 'Dwarf & baby dill' },
        { name: 'Micro dill' },
        {
          name: 'Dill seed (spice)',
          children: [
            { name: 'Indian dill seed (sowa)' },
            { name: 'European dill seed' },
            { name: 'Ground dill seed' },
          ],
        },
        { name: 'Potted live dill' },
        {
          name: 'Dried dill weed',
          children: [
            { name: 'Cut & sifted dill weed' },
            { name: 'Dill tips' },
            { name: 'Dill weed powder' },
            { name: 'Freeze-dried dill weed' },
          ],
        },
        {
          name: 'Frozen dill',
          children: [
            { name: 'IQF chopped dill' },
            { name: 'IQF dill sprigs' },
            { name: 'Frozen dill purée cubes' },
          ],
        },
      ],
    },
    {
      name: 'Salad chicory',
      ru: 'Цикорий салатный',
      children: [
        {
          name: 'Witloof (Belgian endive)',
          children: [
            { name: 'White chicon' },
            { name: 'Red-tipped chicon' },
            { name: 'Mini chicon' },
            { name: 'Chicory roots for forcing' },
          ],
        },
        { name: 'Sugarloaf chicory (Pan di Zucchero)' },
        { name: 'Catalogna & puntarelle chicory' },
        { name: 'Grumolo chicory' },
        { name: 'Italiko Rosso dandelion chicory' },
        { name: 'Washed-and-cut chicory leaf' },
      ],
    },
    {
      name: 'Ramson',
      ru: 'Черемша',
      children: [
        { name: 'Fresh wild garlic leaf' },
        { name: 'Wild garlic bulbs' },
        { name: 'Wild garlic buds & flower stems' },
        { name: 'Barrel-salted ramson' },
        { name: 'Marinated ramson' },
        { name: 'IQF chopped ramson' },
        { name: 'Dried ramson leaf & powder' },
        { name: 'Ramson pesto base' },
      ],
    },
    {
      name: 'Sage',
      ru: 'Шалфей',
      children: [
        {
          name: 'Common garden sage',
          children: [
            { name: 'Berggarten' },
            { name: 'Extrakta' },
            { name: 'Broadleaf English' },
            { name: 'Icterina' },
            { name: 'Purpurascens' },
          ],
        },
        { name: 'Dalmatian sage' },
        { name: 'Greek sage' },
        { name: 'Clary sage' },
        { name: 'Pineapple sage' },
        { name: 'Fresh cut sage' },
        { name: 'Potted live sage' },
        {
          name: 'Dried sage',
          children: [
            { name: 'Rubbed sage' },
            { name: 'Cut & sifted sage' },
            { name: 'Ground sage' },
            { name: 'Tea-bag cut sage' },
          ],
        },
        { name: 'IQF sage leaf' },
      ],
    },
    {
      name: 'Chives',
      ru: 'Шнитт-лук',
      children: [
        {
          name: 'Common chives',
          children: [
            { name: 'Staro' },
            { name: 'Nelly' },
            { name: 'Grolau' },
            { name: 'Fine Leaf' },
            { name: 'Medonos' },
          ],
        },
        {
          name: 'Garlic (Chinese) chives',
          children: [
            { name: 'Nira' },
            { name: 'Geisha' },
            { name: 'Kow Choi' },
            { name: 'Blanched yellow garlic chive' },
          ],
        },
        { name: 'Chive flowers & buds' },
        { name: 'Fresh bunched cut chives' },
        { name: 'Potted live chives' },
        {
          name: 'Frozen chives',
          children: [{ name: 'IQF chopped chives' }, { name: 'IQF chive rings' }],
        },
        {
          name: 'Dried chives',
          children: [
            { name: 'Freeze-dried chive rings' },
            { name: 'Air-dried cut chives' },
            { name: 'Chive powder' },
          ],
        },
      ],
    },
    {
      name: 'Spinach',
      ru: 'Шпинат',
      children: [
        {
          name: 'Savoy spinach',
          children: [
            { name: 'Bloomsdale Long Standing' },
            { name: 'Winter Bloomsdale' },
            { name: 'Regiment' },
            { name: 'Samish' },
            { name: 'Butterflay' },
          ],
        },
        {
          name: 'Semi-savoy spinach',
          children: [
            { name: 'Tyee' },
            { name: 'Melody' },
            { name: 'Indian Summer' },
            { name: 'Teton' },
            { name: 'Carmel' },
            { name: 'Crocodile' },
          ],
        },
        {
          name: 'Smooth flat-leaf spinach',
          children: [
            { name: 'Space' },
            { name: 'Corvair' },
            { name: 'Renegade' },
            { name: 'Whale' },
            { name: 'Matador' },
            { name: 'Giant of Viroflay' },
            { name: 'Palco' },
          ],
        },
        {
          name: 'Baby-leaf spinach',
          children: [
            { name: 'Washed ready-to-eat baby leaf' },
            { name: 'Unwashed bulk baby leaf' },
            { name: 'Red-veined baby spinach' },
          ],
        },
        { name: 'Malabar spinach' },
        { name: 'New Zealand spinach' },
        { name: 'Bunched spinach with root' },
        { name: 'Field-run processing spinach' },
        {
          name: 'Frozen spinach',
          children: [
            { name: 'IQF leaf spinach' },
            { name: 'IQF chopped spinach' },
            { name: 'Frozen spinach blocks' },
            { name: 'Frozen spinach portions & nuggets' },
          ],
        },
        {
          name: 'Dried spinach',
          children: [
            { name: 'Spinach powder' },
            { name: 'Dehydrated spinach flakes' },
            { name: 'Freeze-dried spinach leaf' },
          ],
        },
      ],
    },
    {
      name: 'Sorrel',
      ru: 'Щавель',
      children: [
        {
          name: 'Common garden sorrel',
          children: [
            { name: 'Belleville' },
            { name: 'Broad-leaved sorrel' },
            { name: 'Malakhit' },
            { name: 'Izumrud' },
            { name: 'Nikolsky' },
          ],
        },
        { name: 'French buckler-leaf sorrel' },
        { name: 'Red-veined sorrel (bloody dock)' },
        { name: 'Baby-leaf sorrel' },
        {
          name: 'Frozen sorrel',
          children: [
            { name: 'IQF chopped sorrel' },
            { name: 'Frozen sorrel purée blocks' },
          ],
        },
        { name: 'Dried sorrel leaf' },
      ],
    },
    {
      name: 'Tarragon',
      ru: 'Эстрагон',
      children: [
        { name: 'French tarragon' },
        {
          name: 'Russian tarragon',
          children: [
            { name: 'Gribovsky 31' },
            { name: 'Dobrynya' },
            { name: 'Smaragd' },
            { name: 'Goodwin' },
          ],
        },
        { name: 'Mexican tarragon' },
        { name: 'Fresh cut tarragon' },
        { name: 'Potted live tarragon' },
        {
          name: 'Dried tarragon',
          children: [
            { name: 'Rubbed tarragon leaf' },
            { name: 'Cut & sifted tarragon' },
            { name: 'Ground tarragon' },
          ],
        },
        { name: 'IQF tarragon leaf' },
      ],
    },
  ],
};
