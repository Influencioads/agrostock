import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Berries go 5 levels deep on the seven commodity berries that trade as distinct lots
 * (strawberry, raspberry, blueberry, currant, cranberry, blackberry, sea buckthorn):
 * level 3 splits fresh / IQF-frozen / dried / purée because those are separate contracts,
 * level 4 carries named cultivars and pack grades, level 5 the calibre bands buyers filter on.
 * Wild and long-tail berries keep a single level-3 tier of traded forms.
 */
export const berries: TaxCategory = {
  name: 'Berries',
  emoji: '🫐',
  tint: TINT.sky,
  children: [
    {
      name: 'Barberry',
      ru: 'Барбарис',
      children: [
        { name: 'Fresh barberry' },
        {
          name: 'Dried puffy barberry (Zereshk Poloei)',
          children: [{ name: 'Long-stem puffy barberry' }, { name: 'Destemmed puffy barberry' }],
        },
        {
          name: 'Dried anari barberry (Zereshk Anari)',
          children: [{ name: 'Sun-dried anari barberry' }, { name: 'Shade-dried anari barberry' }],
        },
        { name: 'IQF frozen barberry' },
        { name: 'Barberry juice concentrate' },
        { name: 'Barberry seed' },
      ],
    },
    {
      name: 'Hawthorn',
      ru: 'Боярышник',
      children: [
        { name: 'Fresh hawthorn berry' },
        { name: 'Dried whole hawthorn berry' },
        { name: 'Dried hawthorn slices' },
        { name: 'Dried hawthorn flower & leaf' },
        { name: 'Hawthorn extract powder' },
        { name: 'IQF frozen hawthorn' },
      ],
    },
    {
      name: 'Lingonberry',
      ru: 'Брусника',
      children: [
        {
          name: 'Fresh wild lingonberry',
          children: [{ name: 'Hand-picked lingonberry' }, { name: 'Machine-raked lingonberry' }],
        },
        {
          name: 'Cultivated lingonberry',
          children: [
            { name: 'Koralle' },
            { name: 'Red Pearl' },
            { name: 'Sanna' },
            { name: 'Ida' },
            { name: 'Erntedank' },
          ],
        },
        {
          name: 'IQF frozen lingonberry',
          children: [
            { name: 'IQF whole lingonberry' },
            { name: 'Block-frozen lingonberry' },
            { name: 'Lingonberry crumble' },
          ],
        },
        { name: 'Dried lingonberry' },
        { name: 'Lingonberry juice concentrate' },
        { name: 'Lingonberry purée' },
        { name: 'Lingonberry in own juice (barrels)' },
      ],
    },
    {
      name: 'Elderberry',
      ru: 'Бузина',
      children: [
        {
          name: 'Fresh elderberry',
          children: [
            { name: 'Haschberg' },
            { name: 'Sambu' },
            { name: 'Samdal' },
            { name: 'Samyl' },
            { name: 'Korsør' },
            { name: 'Allesø' },
          ],
        },
        {
          name: 'IQF frozen elderberry',
          children: [
            { name: 'IQF destemmed elderberry' },
            { name: 'Block-frozen elderberry' },
            { name: 'Frozen elderberry on umbel' },
          ],
        },
        { name: 'Dried elderberry' },
        { name: 'Dried elderflower' },
        { name: 'Elderberry juice concentrate' },
        { name: 'Elderberry extract powder' },
      ],
    },
    {
      name: 'Blueberry',
      ru: 'Голубика',
      children: [
        {
          name: 'Fresh northern highbush blueberry',
          children: [
            {
              name: 'Duke',
              children: [
                { name: 'Calibre 12–14 mm' },
                { name: 'Calibre 14–16 mm' },
                { name: 'Jumbo 16 mm+' },
              ],
            },
            {
              name: 'Draper',
              children: [
                { name: 'Calibre 12–14 mm' },
                { name: 'Calibre 14–16 mm' },
                { name: 'Jumbo 16 mm+' },
              ],
            },
            {
              name: 'Bluecrop',
              children: [{ name: 'Calibre 12–14 mm' }, { name: 'Calibre 14–16 mm' }],
            },
            { name: 'Legacy' },
            { name: 'Liberty' },
            { name: 'Elliott' },
            { name: 'Chandler' },
            { name: 'Brigitta' },
            { name: 'Aurora' },
            { name: 'Bluegold' },
            { name: 'Patriot' },
            { name: 'Spartan' },
          ],
        },
        {
          name: 'Fresh southern highbush blueberry',
          children: [
            { name: 'Emerald' },
            { name: 'Jewel' },
            { name: 'Star' },
            { name: 'Snowchaser' },
            { name: 'Ventura' },
            { name: 'Biloxi' },
            { name: "O'Neal" },
            { name: 'Misty' },
          ],
        },
        {
          name: 'Fresh rabbiteye blueberry',
          children: [
            { name: 'Powderblue' },
            { name: 'Brightwell' },
            { name: 'Premier' },
            { name: 'Climax' },
            { name: 'Tifblue' },
          ],
        },
        {
          name: 'Wild lowbush blueberry',
          children: [
            { name: 'Hand-raked wild blueberry' },
            { name: 'Machine-harvested wild blueberry' },
          ],
        },
        {
          name: 'IQF frozen blueberry',
          children: [
            {
              name: 'IQF whole cultivated blueberry',
              children: [
                { name: 'Calibre 8–12 mm' },
                { name: 'Calibre 12–16 mm' },
                { name: 'Calibre 16 mm+' },
              ],
            },
            { name: 'IQF wild lowbush blueberry' },
            { name: 'Block-frozen blueberry' },
            { name: 'Blueberry crumble' },
          ],
        },
        {
          name: 'Dried blueberry',
          children: [
            { name: 'Freeze-dried whole blueberry' },
            { name: 'Sweetened infused dried blueberry' },
            { name: 'Air-dried blueberry' },
            { name: 'Blueberry powder' },
          ],
        },
        {
          name: 'Blueberry purée & juice',
          children: [
            { name: 'Aseptic blueberry purée' },
            { name: 'Blueberry juice concentrate' },
            { name: 'NFC blueberry juice' },
            { name: 'Blueberry pomace' },
          ],
        },
      ],
    },
    {
      name: 'Blackberry',
      ru: 'Ежевика',
      children: [
        {
          name: 'Fresh thornless blackberry',
          children: [
            {
              name: 'Loch Ness',
              children: [{ name: 'Calibre 20–25 mm' }, { name: 'Calibre 25 mm+' }],
            },
            { name: 'Chester Thornless' },
            { name: 'Triple Crown' },
            { name: 'Navaho' },
            { name: 'Ouachita' },
            { name: 'Apache' },
            { name: 'Natchez' },
            { name: 'Loch Tay' },
          ],
        },
        {
          name: 'Fresh thorned blackberry',
          children: [
            { name: 'Karaka Black' },
            { name: 'Kiowa' },
            { name: 'Tupy' },
            { name: 'Brazos' },
            { name: 'Marion' },
          ],
        },
        {
          name: 'Hybrid bramble berry',
          children: [
            { name: 'Tayberry' },
            { name: 'Loganberry' },
            { name: 'Boysenberry' },
            { name: 'Youngberry' },
            { name: 'Silvanberry' },
          ],
        },
        {
          name: 'IQF frozen blackberry',
          children: [
            {
              name: 'IQF whole blackberry',
              children: [
                { name: 'Grade A extra' },
                { name: 'Grade A' },
                { name: 'Grade B processing' },
              ],
            },
            { name: 'Block-frozen blackberry' },
            { name: 'Blackberry crumble' },
          ],
        },
        {
          name: 'Dried blackberry',
          children: [
            { name: 'Freeze-dried whole blackberry' },
            { name: 'Freeze-dried blackberry powder' },
            { name: 'Air-dried blackberry' },
          ],
        },
        {
          name: 'Blackberry purée & juice',
          children: [
            { name: 'Aseptic blackberry purée' },
            { name: 'Seedless blackberry purée' },
            { name: 'Blackberry juice concentrate' },
          ],
        },
      ],
    },
    {
      name: 'Honeysuckle berry',
      ru: 'Жимолость',
      children: [
        {
          name: 'Fresh haskap berry',
          children: [
            { name: 'Wojtek' },
            { name: 'Aurora' },
            { name: 'Indigo Gem' },
            { name: 'Tundra' },
            { name: 'Honey Bee' },
            { name: 'Borealis' },
            { name: 'Bakczarskaja' },
            { name: 'Boreal Beauty' },
          ],
        },
        {
          name: 'IQF frozen haskap',
          children: [{ name: 'IQF whole haskap' }, { name: 'Block-frozen haskap' }],
        },
        { name: 'Dried haskap berry' },
        { name: 'Haskap juice concentrate' },
        { name: 'Haskap purée' },
      ],
    },
    {
      name: 'Wild strawberry',
      ru: 'Земляника',
      children: [
        { name: 'Fresh wild strawberry' },
        {
          name: 'Alpine strawberry',
          children: [
            { name: 'Regina' },
            { name: 'Alexandria' },
            { name: 'Yellow Wonder' },
            { name: 'Mignonette' },
          ],
        },
        { name: 'IQF frozen wild strawberry' },
        { name: 'Freeze-dried wild strawberry' },
        { name: 'Dried wild strawberry leaf' },
        { name: 'Wild strawberry purée' },
      ],
    },
    {
      name: 'Serviceberry',
      ru: 'Ирга',
      children: [
        {
          name: 'Fresh saskatoon berry',
          children: [
            { name: 'Smoky' },
            { name: 'Thiessen' },
            { name: 'Northline' },
            { name: 'Martin' },
            { name: 'Honeywood' },
          ],
        },
        { name: 'IQF frozen saskatoon berry' },
        { name: 'Dried saskatoon berry' },
        { name: 'Saskatoon juice concentrate' },
      ],
    },
    {
      name: 'Viburnum',
      ru: 'Калина',
      children: [
        { name: 'Fresh viburnum berry' },
        { name: 'Frozen viburnum on cluster' },
        { name: 'IQF frozen viburnum berry' },
        { name: 'Dried viburnum berry' },
        { name: 'Viburnum juice & syrup' },
        { name: 'Dried viburnum bark' },
      ],
    },
    {
      name: 'Cornelian cherry',
      ru: 'Кизил',
      children: [
        {
          name: 'Fresh cornelian cherry',
          children: [
            { name: 'Koralovyi' },
            { name: 'Vladimirskiy' },
            { name: 'Elegantnyi' },
            { name: 'Svetlyachok' },
            { name: 'Yantarnyi' },
            { name: 'Lukyanovskiy' },
          ],
        },
        { name: 'IQF frozen cornelian cherry' },
        { name: 'Dried cornelian cherry (with stone)' },
        { name: 'Dried pitted cornelian cherry' },
        { name: 'Cornelian cherry purée' },
        { name: 'Cornelian cherry juice concentrate' },
      ],
    },
    {
      name: 'Strawberry',
      ru: 'Клубника',
      children: [
        {
          name: 'Fresh dessert strawberry',
          children: [
            {
              name: 'Albion',
              children: [
                { name: 'Calibre 22–28 mm' },
                { name: 'Calibre 28–35 mm' },
                { name: 'Calibre 35 mm+' },
              ],
            },
            {
              name: 'Elsanta',
              children: [
                { name: 'Calibre 22–28 mm' },
                { name: 'Calibre 28–35 mm' },
                { name: 'Calibre 35 mm+' },
              ],
            },
            {
              name: 'Camarosa',
              children: [
                { name: 'Calibre 25–35 mm' },
                { name: 'Calibre 35–45 mm' },
                { name: 'Calibre 45 mm+' },
              ],
            },
            { name: 'Clery' },
            { name: 'Murano' },
            { name: 'Honeoye' },
            { name: 'Sonata' },
            { name: 'San Andreas' },
            { name: 'Malwina' },
            { name: 'Florence' },
            { name: 'Darselect' },
            { name: 'Asia' },
            { name: 'Portola' },
            { name: 'Monterey' },
            { name: 'Sabrina' },
          ],
        },
        {
          name: 'Fresh processing strawberry',
          children: [
            { name: 'Senga Sengana' },
            { name: 'Polka' },
            { name: 'Rumba' },
            { name: 'Marmolada' },
            { name: 'Honeoye' },
          ],
        },
        {
          name: 'IQF frozen strawberry',
          children: [
            {
              name: 'IQF whole strawberry',
              children: [
                { name: 'Grade A calibre 15–25 mm' },
                { name: 'Grade A calibre 25–35 mm' },
                { name: 'Grade A calibre 35 mm+' },
                { name: 'Grade B processing' },
              ],
            },
            { name: 'IQF sliced strawberry' },
            { name: 'IQF diced strawberry' },
            { name: 'Strawberry crumble & broken' },
            { name: 'Block-frozen strawberry' },
            { name: 'Sugar-infused frozen strawberry' },
          ],
        },
        {
          name: 'Dried strawberry',
          children: [
            { name: 'Freeze-dried whole strawberry' },
            { name: 'Freeze-dried strawberry slices' },
            { name: 'Air-dried strawberry slices' },
            { name: 'Infused dried strawberry dices' },
            { name: 'Strawberry powder' },
          ],
        },
        {
          name: 'Strawberry purée & juice',
          children: [
            { name: 'Aseptic strawberry purée' },
            { name: 'Seedless strawberry purée' },
            { name: 'Strawberry juice concentrate' },
            { name: 'NFC strawberry juice' },
          ],
        },
      ],
    },
    {
      name: 'Cranberry',
      ru: 'Клюква',
      children: [
        {
          name: 'Fresh large-fruited cranberry',
          children: [
            { name: 'Stevens' },
            { name: 'Ben Lear' },
            { name: 'Pilgrim' },
            { name: 'Howes' },
            { name: 'Early Black' },
            { name: 'Mullica Queen' },
            { name: 'Crimson Queen' },
          ],
        },
        {
          name: 'Wild small cranberry',
          children: [
            { name: 'Hand-picked wild cranberry' },
            { name: 'Machine-raked wild cranberry' },
          ],
        },
        {
          name: 'IQF frozen cranberry',
          children: [
            { name: 'IQF whole cranberry' },
            { name: 'IQF sliced cranberry' },
            { name: 'Block-frozen cranberry' },
          ],
        },
        {
          name: 'Dried cranberry',
          children: [
            { name: 'Sweetened dried whole cranberry' },
            { name: 'Sweetened dried sliced cranberry' },
            { name: 'Apple-juice-infused dried cranberry' },
            { name: 'Freeze-dried cranberry' },
          ],
        },
        {
          name: 'Cranberry juice & derivatives',
          children: [
            { name: 'Cranberry juice concentrate' },
            { name: 'NFC cranberry juice' },
            { name: 'Cranberry pomace' },
            { name: 'Cranberry seed oil' },
          ],
        },
      ],
    },
    {
      name: 'Arctic raspberry',
      ru: 'Княженика',
      children: [
        { name: 'Fresh wild arctic raspberry' },
        {
          name: 'Cultivated nectar raspberry',
          children: [
            { name: 'Beata' },
            { name: 'Sofia' },
            { name: 'Anna' },
            { name: 'Astra' },
            { name: 'Aura' },
            { name: 'Heija' },
          ],
        },
        { name: 'IQF frozen arctic raspberry' },
        { name: 'Freeze-dried arctic raspberry' },
        { name: 'Arctic raspberry purée' },
      ],
    },
    {
      name: 'Schisandra',
      ru: 'Лимонник',
      children: [
        { name: 'Fresh schisandra berry' },
        { name: 'Dried whole schisandra berry' },
        { name: 'IQF frozen schisandra berry' },
        { name: 'Schisandra seed' },
        { name: 'Schisandra extract powder' },
        { name: 'Dried schisandra vine & leaf' },
      ],
    },
    {
      name: 'Raspberry',
      ru: 'Малина',
      children: [
        {
          name: 'Fresh red raspberry',
          children: [
            {
              name: 'Tulameen',
              children: [
                { name: 'Calibre 18–22 mm' },
                { name: 'Calibre 22–26 mm' },
                { name: 'Calibre 26 mm+' },
              ],
            },
            {
              name: 'Glen Ample',
              children: [{ name: 'Calibre 18–22 mm' }, { name: 'Calibre 22 mm+' }],
            },
            { name: 'Polka' },
            { name: 'Polana' },
            { name: 'Heritage' },
            { name: 'Kwanza' },
            { name: 'Meeker' },
            { name: 'Willamette' },
            { name: 'Himbo Top' },
            { name: 'Joan J' },
            { name: 'Cascade Delight' },
            { name: 'Glen Fyne' },
            { name: 'Enrosadira' },
          ],
        },
        {
          name: 'Fresh yellow raspberry',
          children: [{ name: 'Fall Gold' }, { name: 'Anne' }, { name: 'Golden Everest' }],
        },
        {
          name: 'Fresh black raspberry',
          children: [
            { name: 'Bristol' },
            { name: 'Jewel' },
            { name: 'Cumberland' },
            { name: 'Munger' },
          ],
        },
        {
          name: 'IQF frozen raspberry',
          children: [
            {
              name: 'IQF whole raspberry',
              children: [
                { name: 'Grade A extra' },
                { name: 'Grade A' },
                { name: 'Grade B processing' },
              ],
            },
            { name: 'Raspberry crumble' },
            { name: 'Block-frozen raspberry' },
            { name: 'IQF raspberry grits' },
          ],
        },
        {
          name: 'Dried raspberry',
          children: [
            { name: 'Freeze-dried whole raspberry' },
            { name: 'Freeze-dried raspberry powder' },
            { name: 'Air-dried raspberry' },
            { name: 'Dried raspberry leaf' },
          ],
        },
        {
          name: 'Raspberry purée & derivatives',
          children: [
            { name: 'Aseptic raspberry purée' },
            { name: 'Seedless raspberry purée' },
            { name: 'Raspberry juice concentrate' },
            { name: 'Raspberry seed oil' },
          ],
        },
      ],
    },
    {
      name: 'Juniper berry',
      ru: 'Можжевеловая ягода',
      children: [
        { name: 'Fresh juniper berry' },
        { name: 'Dried whole juniper berry' },
        { name: 'Ground juniper berry' },
        { name: 'Juniper berry essential oil' },
        { name: 'Juniper berry extract' },
      ],
    },
    {
      name: 'Cloudberry',
      ru: 'Морошка',
      children: [
        { name: 'Fresh cloudberry' },
        { name: 'IQF frozen cloudberry' },
        { name: 'Freeze-dried cloudberry' },
        { name: 'Cloudberry purée' },
        { name: 'Cloudberry seed oil' },
      ],
    },
    {
      name: 'Sea buckthorn',
      ru: 'Облепиха',
      children: [
        {
          name: 'Fresh sea buckthorn berry',
          children: [
            { name: 'Chuyskaya' },
            { name: 'Velikan' },
            { name: 'Avgustinka' },
            { name: 'Botanicheskaya Lyubitelskaya' },
            { name: 'Leikora' },
            { name: 'Askola' },
            { name: 'Hergo' },
            { name: 'Frugana' },
            { name: 'Orange Energy' },
          ],
        },
        {
          name: 'IQF frozen sea buckthorn',
          children: [
            { name: 'IQF whole sea buckthorn berry' },
            { name: 'Block-frozen sea buckthorn' },
            { name: 'Frozen branch-harvested sea buckthorn' },
          ],
        },
        {
          name: 'Dried sea buckthorn',
          children: [
            { name: 'Air-dried sea buckthorn berry' },
            { name: 'Freeze-dried sea buckthorn berry' },
            { name: 'Sea buckthorn powder' },
            { name: 'Dried sea buckthorn leaf' },
          ],
        },
        {
          name: 'Sea buckthorn juice & purée',
          children: [
            { name: 'NFC sea buckthorn juice' },
            { name: 'Sea buckthorn juice concentrate' },
            { name: 'Aseptic sea buckthorn purée' },
            { name: 'Sea buckthorn pomace' },
          ],
        },
        {
          name: 'Sea buckthorn oil',
          children: [
            { name: 'Sea buckthorn pulp oil' },
            { name: 'Sea buckthorn seed oil' },
            { name: 'CO2-extracted sea buckthorn oil' },
          ],
        },
      ],
    },
    {
      name: 'Rowan berry',
      ru: 'Рябина',
      children: [
        { name: 'Fresh wild rowan berry' },
        {
          name: 'Sweet rowan cultivars',
          children: [
            { name: 'Nevezhinskaya' },
            { name: 'Titan' },
            { name: 'Granatnaya' },
            { name: 'Burka' },
            { name: 'Likyornaya' },
            { name: 'Moravian sweet rowan' },
          ],
        },
        {
          name: 'Black chokeberry (aronia)',
          children: [
            { name: 'Nero' },
            { name: 'Viking' },
            { name: 'Galicjanka' },
            { name: 'Hugin' },
            { name: 'Aron' },
          ],
        },
        { name: 'IQF frozen rowan berry' },
        { name: 'Dried rowan berry' },
        { name: 'Rowan juice concentrate' },
      ],
    },
    {
      name: 'Currant',
      ru: 'Смородина',
      children: [
        {
          name: 'Blackcurrant',
          children: [
            { name: 'Ben Lomond' },
            { name: 'Ben Alder' },
            { name: 'Ben Hope' },
            { name: 'Titania' },
            { name: 'Öjebyn' },
            { name: 'Tiben' },
            { name: 'Tisel' },
            { name: 'Ruben' },
            { name: 'Bona' },
            { name: 'Polares' },
          ],
        },
        {
          name: 'Redcurrant',
          children: [
            { name: 'Jonkheer van Tets' },
            { name: 'Rovada' },
            { name: 'Rondom' },
            { name: 'Junifer' },
            { name: 'Red Lake' },
            { name: 'Detvan' },
          ],
        },
        {
          name: 'White currant',
          children: [{ name: 'Blanka' }, { name: 'White Versailles' }, { name: 'Primus' }],
        },
        {
          name: 'Pink currant',
          children: [{ name: 'Gloire des Sablons' }, { name: 'Pink Champagne' }],
        },
        {
          name: 'IQF frozen currant',
          children: [
            { name: 'IQF destemmed blackcurrant' },
            { name: 'IQF destemmed redcurrant' },
            { name: 'Frozen currant on strig' },
            { name: 'Block-frozen blackcurrant' },
          ],
        },
        {
          name: 'Dried currant',
          children: [
            { name: 'Air-dried blackcurrant' },
            { name: 'Freeze-dried blackcurrant' },
            { name: 'Blackcurrant powder' },
          ],
        },
        {
          name: 'Currant juice & derivatives',
          children: [
            { name: 'Blackcurrant juice concentrate' },
            { name: 'Redcurrant juice concentrate' },
            { name: 'Blackcurrant pomace' },
            { name: 'Blackcurrant seed oil' },
            { name: 'Dried blackcurrant leaf' },
          ],
        },
      ],
    },
    {
      name: 'Blackthorn',
      ru: 'Терновник',
      children: [
        { name: 'Fresh sloe berry' },
        { name: 'IQF frozen sloe berry' },
        { name: 'Dried sloe berry' },
        { name: 'Sloe purée' },
        { name: 'Dried blackthorn flower' },
      ],
    },
    {
      name: 'Bilberry',
      ru: 'Черника',
      children: [
        {
          name: 'Fresh wild bilberry',
          children: [{ name: 'Hand-picked bilberry' }, { name: 'Rake-harvested bilberry' }],
        },
        {
          name: 'IQF frozen bilberry',
          children: [
            { name: 'IQF whole bilberry' },
            { name: 'Block-frozen bilberry' },
            { name: 'Bilberry crumble' },
          ],
        },
        { name: 'Dried bilberry' },
        { name: 'Bilberry extract powder' },
        { name: 'Bilberry juice concentrate' },
        { name: 'Dried bilberry leaf' },
      ],
    },
    {
      name: 'Bird cherry',
      ru: 'Черёмуха',
      children: [
        { name: 'Fresh bird cherry' },
        { name: 'Dried bird cherry berry' },
        { name: 'Bird cherry flour' },
        { name: 'IQF frozen bird cherry' },
      ],
    },
    {
      name: 'Mulberry',
      ru: 'Шелковица',
      children: [
        {
          name: 'White mulberry',
          children: [
            { name: 'Fresh white mulberry' },
            { name: 'Dried white mulberry' },
            { name: 'White mulberry molasses (pekmez)' },
          ],
        },
        {
          name: 'Black mulberry',
          children: [
            { name: 'Fresh black mulberry' },
            { name: 'Dried black mulberry' },
            { name: 'Black mulberry juice concentrate' },
          ],
        },
        { name: 'Red mulberry' },
        { name: 'IQF frozen mulberry' },
        { name: 'Dried mulberry leaf' },
      ],
    },
    {
      name: 'Rosehip',
      ru: 'Шиповник',
      children: [
        {
          name: 'Dried whole rosehip',
          children: [{ name: 'Rosa canina' }, { name: 'Rosa rugosa' }, { name: 'Rosa majalis' }],
        },
        { name: 'Fresh rosehip' },
        { name: 'Dried deseeded rosehip shells' },
        { name: 'Rosehip seed' },
        { name: 'Rosehip powder' },
        { name: 'Rosehip seed oil' },
        { name: 'IQF frozen rosehip' },
        { name: 'Rosehip purée' },
      ],
    },
  ],
};
