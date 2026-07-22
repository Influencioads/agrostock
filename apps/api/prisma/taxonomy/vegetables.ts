import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Vegetables — the deepest category in the tree. High-volume commodities (potato, tomato,
 * garlic, carrot, cabbage, peppers, cucumber, beetroot, pumpkin, olives, asparagus) go to
 * level 4 cultivars and level 5 calibre/grade bands, because that is how lots actually trade.
 * Long-tail roots and gourds (yacon, chayote, tiger nut, bur gherkin) stop at a thin level 3.
 */
export const vegetables: TaxCategory = {
  name: 'Vegetables',
  emoji: '🥦',
  tint: TINT.green,
  children: [
    {
      name: 'Bur gherkin',
      ru: 'Ангурия',
      children: [
        { name: 'Fresh bur gherkin' },
        { name: 'Pickling-grade bur gherkin' },
        { name: 'West Indian gherkin' },
      ],
    },
    {
      name: 'Artichoke',
      ru: 'Артишок',
      children: [
        {
          name: 'Green globe artichoke',
          children: [
            { name: 'Green Globe' },
            { name: 'Imperial Star' },
            { name: 'Camus de Bretagne' },
            { name: 'Blanca de Tudela' },
            { name: 'Castel' },
          ],
        },
        {
          name: 'Purple artichoke',
          children: [
            { name: 'Violetto di Chioggia' },
            { name: 'Violet de Provence' },
            { name: 'Spinoso Sardo' },
            { name: 'Romanesco' },
            { name: 'Opal' },
          ],
        },
        {
          name: 'Baby artichoke',
          children: [{ name: 'Carciofini' }, { name: 'Poivrade' }],
        },
        {
          name: 'Artichoke hearts',
          children: [{ name: 'Whole hearts' }, { name: 'Quartered hearts' }, { name: 'Bottoms' }],
        },
        { name: 'Jerusalem-type ornamental heads' },
      ],
    },
    {
      name: 'Eggplant',
      ru: 'Баклажаны',
      children: [
        {
          name: 'Long purple eggplant',
          children: [
            { name: 'Long Purple' },
            { name: 'Ping Tung Long' },
            { name: 'Pusa Purple Long' },
            { name: 'Millionaire F1' },
            { name: 'Machiaw F1' },
          ],
        },
        {
          name: 'Globe eggplant',
          children: [
            { name: 'Black Beauty' },
            { name: 'Nadia F1' },
            { name: 'Barbarella F1' },
            { name: 'Classic F1' },
            { name: 'Angela F1' },
          ],
        },
        {
          name: 'Striped eggplant',
          children: [
            { name: 'Listada de Gandia' },
            { name: 'Graffiti F1' },
            { name: 'Fairy Tale F1' },
            { name: 'Rosa Bianca' },
            { name: 'Zebra F1' },
          ],
        },
        {
          name: 'White eggplant',
          children: [{ name: 'Casper' }, { name: 'Clara F1' }, { name: 'Snowy F1' }],
        },
        {
          name: 'Indian round eggplant',
          children: [
            { name: 'Pusa Kranti' },
            { name: 'Arka Shirish' },
            { name: 'Mattu Gulla' },
            { name: 'Udumalpet' },
          ],
        },
        {
          name: 'Thai eggplant',
          children: [{ name: 'Kermit F1' }, { name: 'Thai Green Pea' }, { name: 'Turkish Orange' }],
        },
        { name: 'Japanese long eggplant', children: [{ name: 'Ichiban F1' }, { name: 'Senryo Nigou' }] },
      ],
    },
    {
      name: 'Sweet potato',
      ru: 'Батат',
      children: [
        {
          name: 'Orange-flesh sweet potato',
          children: [
            {
              name: 'Beauregard',
              children: [
                { name: 'US No.1 grade' },
                { name: 'Jumbo grade' },
                { name: 'Petite grade' },
                { name: 'Canner grade' },
              ],
            },
            {
              name: 'Covington',
              children: [{ name: 'US No.1 grade' }, { name: 'Jumbo grade' }, { name: 'Petite grade' }],
            },
            { name: 'Evangeline' },
            { name: 'Bellevue' },
            { name: 'Orleans' },
          ],
        },
        {
          name: 'White-flesh sweet potato',
          children: [{ name: 'Bonita' }, { name: "O'Henry" }, { name: 'Hannah' }, { name: 'Murasaki' }],
        },
        {
          name: 'Purple-flesh sweet potato',
          children: [
            { name: 'Okinawa purple' },
            { name: 'Stokes Purple' },
            { name: 'Molokai Purple' },
            { name: 'Ayamurasaki' },
          ],
        },
        {
          name: 'Yellow-flesh sweet potato',
          children: [{ name: 'Jewel' }, { name: 'Georgia Jet' }, { name: 'Carolina Ruby' }],
        },
        { name: 'Sweet potato for starch processing' },
      ],
    },
    {
      name: 'Broccoli',
      ru: 'Брокколи',
      children: [
        {
          name: 'Calabrese broccoli',
          children: [
            { name: 'Marathon F1' },
            { name: 'Ironman F1' },
            { name: 'Parthenon F1' },
            { name: 'Monaco F1' },
            { name: 'Belstar F1' },
            { name: 'Green Magic F1' },
          ],
        },
        {
          name: 'Sprouting broccoli',
          children: [{ name: 'Purple Sprouting' }, { name: 'Claret F1' }, { name: 'Rudolph' }],
        },
        {
          name: 'Broccolini',
          children: [{ name: 'Tenderstem' }, { name: 'Aspabroc F1' }],
        },
        {
          name: 'Romanesco broccoli',
          children: [{ name: 'Natalino' }, { name: 'Veronica F1' }],
        },
        {
          name: 'Broccoli florets for processing',
          children: [{ name: 'IQF-grade florets' }, { name: 'Cut-and-stem florets' }],
        },
      ],
    },
    {
      name: 'Ginger',
      ru: 'Имбирь',
      children: [
        {
          name: 'Fresh ginger',
          children: [
            { name: 'Nadia' },
            { name: 'Varada' },
            { name: 'Maran' },
            { name: 'Rio de Janeiro' },
            { name: 'Chinese Yellow' },
            { name: 'Bentong' },
            { name: 'Suprabha' },
          ],
        },
        {
          name: 'Dry ginger',
          children: [
            { name: 'Cochin ginger' },
            { name: 'Calicut ginger' },
            { name: 'Bleached ginger' },
            { name: 'Nigerian split ginger' },
            { name: 'Unbleached rough ginger' },
          ],
        },
        {
          name: 'Processed ginger',
          children: [
            { name: 'Ginger powder' },
            { name: 'Ginger flakes' },
            { name: 'Ginger paste' },
            { name: 'Pickled sushi ginger' },
            { name: 'Candied ginger' },
          ],
        },
        { name: 'Baby ginger' },
      ],
    },
    {
      name: 'Zucchini',
      ru: 'Кабачки',
      children: [
        {
          name: 'Green zucchini',
          children: [
            { name: 'Black Beauty' },
            { name: 'Cora F1' },
            { name: 'Dunja F1' },
            { name: 'Partenon F1' },
            { name: 'Tosca F1' },
          ],
        },
        {
          name: 'Yellow zucchini',
          children: [{ name: 'Gold Rush F1' }, { name: 'Soleil F1' }, { name: 'Golden Glory F1' }],
        },
        {
          name: 'Light-green Lebanese zucchini',
          children: [{ name: 'Magda F1' }, { name: 'Clarita F1' }, { name: 'Alexandria F1' }],
        },
        {
          name: 'Round zucchini',
          children: [{ name: 'Eight Ball F1' }, { name: 'Tonda di Nizza' }, { name: 'Ronde de Nice' }],
        },
        { name: 'Baby courgette' },
        { name: 'Courgette flowers' },
      ],
    },
    {
      name: 'Cabbage',
      ru: 'Капуста',
      children: [
        {
          name: 'Early white cabbage',
          children: [
            { name: 'Parel F1' },
            { name: 'Gloria F1' },
            { name: 'Golden Acre' },
            { name: 'Rinda F1' },
            { name: 'Copenhagen Market' },
          ],
        },
        {
          name: 'Storage white cabbage',
          children: [
            {
              name: 'Megaton F1',
              children: [{ name: '1–2 kg heads' }, { name: '2–3 kg heads' }, { name: '3–5 kg heads' }],
            },
            {
              name: 'Bronco F1',
              children: [{ name: '1–2 kg heads' }, { name: '2–3 kg heads' }],
            },
            { name: 'Lennox F1' },
            { name: 'Kilaton F1' },
            { name: 'Amager' },
            { name: 'Slava 1305' },
          ],
        },
        {
          name: 'Kraut & processing cabbage',
          children: [
            { name: 'Novator F1' },
            { name: 'Krautman F1' },
            { name: 'Atria F1' },
            { name: 'Bartolo F1' },
          ],
        },
        {
          name: 'Red cabbage',
          children: [
            { name: 'Rodima F1' },
            { name: 'Primero F1' },
            { name: 'Integro F1' },
            { name: 'Red Acre' },
            { name: 'Kalibos' },
          ],
        },
        {
          name: 'Pointed cabbage',
          children: [
            { name: 'Caraflex F1' },
            { name: 'Hispi F1' },
            { name: 'Duncan F1' },
            { name: 'Filderkraut' },
          ],
        },
        {
          name: 'Flat Dutch cabbage',
          children: [{ name: 'Late Flat Dutch' }, { name: 'Brunswick' }],
        },
        { name: 'Shredded cabbage for processing' },
      ],
    },
    {
      name: 'Brussels sprouts',
      ru: 'Капуста брюссельская',
      children: [
        {
          name: 'Green Brussels sprouts',
          children: [
            {
              name: 'Brilliant F1',
              children: [{ name: '20–30 mm' }, { name: '30–40 mm' }, { name: '40 mm+' }],
            },
            { name: 'Diablo F1' },
            { name: 'Doric F1' },
            { name: 'Nautic F1' },
            { name: 'Igor F1' },
          ],
        },
        {
          name: 'Red Brussels sprouts',
          children: [{ name: 'Rubine' }, { name: 'Redarling F1' }],
        },
        { name: 'Sprout tops' },
        { name: 'Halved sprouts for freezing' },
      ],
    },
    {
      name: 'Napa cabbage',
      ru: 'Капуста пекинская',
      children: [
        {
          name: 'Barrel-type napa cabbage',
          children: [
            { name: 'Bilko F1' },
            { name: 'Blues F1' },
            { name: 'Rubicon F1' },
            { name: 'Kaboko F1' },
            { name: 'Wong Bok' },
          ],
        },
        {
          name: 'Michihili napa cabbage',
          children: [{ name: 'Michihili' }, { name: 'Jade Pagoda F1' }],
        },
        { name: 'Baby napa cabbage' },
        { name: 'Kimchi-grade napa cabbage' },
      ],
    },
    {
      name: 'Savoy cabbage',
      ru: 'Капуста савойская',
      children: [
        {
          name: 'Early savoy cabbage',
          children: [{ name: 'Melissa F1' }, { name: 'Alaska F1' }, { name: 'Golden Acre Savoy' }],
        },
        {
          name: 'Storage savoy cabbage',
          children: [{ name: 'Vertus' }, { name: 'Wirosa F1' }, { name: 'Winterfürst' }],
        },
        { name: 'Baby savoy cabbage' },
      ],
    },
    {
      name: 'Cauliflower',
      ru: 'Капуста цветная',
      children: [
        {
          name: 'White cauliflower',
          children: [
            {
              name: 'Snowball',
              children: [{ name: '11–13 cm heads' }, { name: '13–15 cm heads' }, { name: '15 cm+ heads' }],
            },
            { name: 'Clapton F1' },
            { name: 'Fremont F1' },
            { name: 'Skywalker F1' },
            { name: 'Amazing' },
            { name: 'Pusa Snowball K-1' },
          ],
        },
        {
          name: 'Orange cauliflower',
          children: [{ name: 'Cheddar F1' }, { name: 'Sunset F1' }],
        },
        {
          name: 'Purple cauliflower',
          children: [{ name: 'Graffiti F1' }, { name: 'Purple of Sicily' }],
        },
        {
          name: 'Green cauliflower',
          children: [{ name: 'Vitaverde F1' }, { name: 'Alverda' }],
        },
        {
          name: 'Romanesco cauliflower',
          children: [{ name: 'Navona F1' }, { name: 'Puntoverde F1' }],
        },
        {
          name: 'Cauliflower florets for processing',
          children: [{ name: 'IQF-grade florets' }, { name: 'Rice-cut cauliflower' }],
        },
      ],
    },
    {
      name: 'Potato',
      ru: 'Картофель',
      children: [
        {
          name: 'Yellow-flesh table potato',
          children: [
            {
              name: 'Agria',
              children: [
                { name: '35–45 mm' },
                { name: '45–55 mm' },
                { name: '55–65 mm' },
                { name: '65 mm+' },
              ],
            },
            {
              name: 'Gala',
              children: [{ name: '35–45 mm' }, { name: '45–55 mm' }, { name: '55–65 mm' }],
            },
            { name: 'Marabel' },
            { name: 'Nicola' },
            { name: 'Annabelle' },
            { name: 'Charlotte' },
            { name: 'Bintje' },
            { name: 'Soraya' },
          ],
        },
        {
          name: 'White-flesh table potato',
          children: [
            { name: 'Kufri Chandramukhi' },
            { name: 'Kufri Pukhraj' },
            { name: 'Kufri Bahar' },
            { name: 'Santé' },
            { name: 'Colomba' },
            { name: 'Riviera' },
            { name: 'Impala' },
            { name: 'Arizona' },
          ],
        },
        {
          name: 'Red-skin potato',
          children: [
            {
              name: 'Desiree',
              children: [{ name: '35–55 mm' }, { name: '55–70 mm' }, { name: '70 mm+' }],
            },
            { name: 'Laura' },
            { name: 'Red Scarlett' },
            { name: 'Rosara' },
            { name: 'Cherie' },
            { name: 'Bellarosa' },
            { name: 'Kufri Sindhuri' },
          ],
        },
        {
          name: 'Crisping potato',
          children: [
            {
              name: 'Atlantic',
              children: [{ name: '40–55 mm' }, { name: '55–70 mm' }],
            },
            { name: 'Lady Claire' },
            { name: 'Lady Rosetta' },
            { name: 'Hermes' },
            { name: 'Saturna' },
            { name: 'Kufri Chipsona-1' },
            { name: 'Kufri Chipsona-3' },
          ],
        },
        {
          name: 'French-fry potato',
          children: [
            {
              name: 'Russet Burbank',
              children: [{ name: '50–70 mm' }, { name: '70–90 mm' }, { name: '90 mm+' }],
            },
            { name: 'Innovator' },
            { name: 'Markies' },
            { name: 'Fontane' },
            { name: 'Shepody' },
            { name: 'Challenger' },
            { name: 'Kufri Frysona' },
          ],
        },
        {
          name: 'Starch potato',
          children: [{ name: 'Kuras' }, { name: 'Seresta' }, { name: 'Avarna' }, { name: 'Novano' }],
        },
        {
          name: 'Salad & baby potato',
          children: [
            { name: 'Ratte' },
            { name: 'Amandine' },
            { name: 'Belle de Fontenay' },
            { name: 'Pink Fir Apple' },
            { name: 'Jersey Royal' },
            { name: 'Linzer Delikatess' },
          ],
        },
        {
          name: 'Coloured-flesh potato',
          children: [
            { name: 'Vitelotte' },
            { name: 'Blue Congo' },
            { name: 'Highland Burgundy Red' },
            { name: 'Purple Majesty' },
            { name: 'Salad Blue' },
          ],
        },
      ],
    },
    {
      name: 'Kohlrabi',
      ru: 'Кольраби',
      children: [
        {
          name: 'Green kohlrabi',
          children: [
            { name: 'Korist F1' },
            { name: 'White Vienna' },
            { name: 'Winner F1' },
            { name: 'Terek F1' },
          ],
        },
        {
          name: 'Purple kohlrabi',
          children: [{ name: 'Kolibri F1' }, { name: 'Azur Star' }, { name: 'Purple Vienna' }],
        },
        {
          name: 'Storage kohlrabi',
          children: [{ name: 'Superschmelz' }, { name: 'Gigant' }],
        },
      ],
    },
    {
      name: 'Bottle gourd',
      ru: 'Лагенария',
      children: [
        {
          name: 'Long bottle gourd',
          children: [
            { name: 'Pusa Naveen' },
            { name: 'Pusa Summer Prolific Long' },
            { name: 'Punjab Komal' },
            { name: 'Kashi Ganga' },
          ],
        },
        {
          name: 'Round bottle gourd',
          children: [{ name: 'Pusa Summer Prolific Round' }, { name: 'Arka Bahar' }],
        },
        { name: 'Bottle gourd for calabash craft' },
      ],
    },
    {
      name: 'Carrot',
      ru: 'Морковь',
      children: [
        {
          name: 'Nantes-type carrot',
          children: [
            {
              name: 'Bolero F1',
              children: [{ name: '18–25 mm' }, { name: '25–40 mm' }, { name: '40–60 mm' }],
            },
            {
              name: 'Nantes 2',
              children: [{ name: '18–25 mm' }, { name: '25–40 mm' }],
            },
            { name: 'Napoli F1' },
            { name: 'Nelson F1' },
            { name: 'Maestro F1' },
            { name: 'Nerac F1' },
          ],
        },
        {
          name: 'Imperator-type carrot',
          children: [{ name: 'Imperator 58' }, { name: 'Sugarsnax 54' }, { name: 'Apache F1' }],
        },
        {
          name: 'Chantenay-type carrot',
          children: [
            { name: 'Chantenay Red Cored' },
            { name: 'Royal Chantenay' },
            { name: 'Carson F1' },
          ],
        },
        {
          name: 'Danvers-type carrot',
          children: [{ name: 'Danvers 126' }, { name: 'Danvers Half Long' }],
        },
        {
          name: 'Berlicum-type carrot',
          children: [{ name: 'Berlicum 2' }, { name: 'Bangor F1' }, { name: 'Cortina F1' }],
        },
        {
          name: 'Flakkee-type carrot',
          children: [{ name: 'Karotan' }, { name: 'Rothild' }, { name: 'Flakkeese 2' }],
        },
        {
          name: 'Baby carrot',
          children: [{ name: 'Whole baby carrot' }, { name: 'Cut-and-peel carrot' }, { name: 'Amsterdam Forcing' }],
        },
        {
          name: 'Coloured carrot',
          children: [
            { name: 'Purple Haze F1' },
            { name: 'Cosmic Purple' },
            { name: 'Yellowstone' },
            { name: 'White Satin F1' },
            { name: 'Atomic Red' },
          ],
        },
        {
          name: 'Fodder carrot',
          children: [{ name: 'Vita Longa' }, { name: 'White Belgian' }, { name: 'Lobbericher Gelbe' }],
        },
      ],
    },
    {
      name: 'Cucumber',
      ru: 'Огурцы',
      children: [
        {
          name: 'Long Dutch cucumber',
          children: [
            { name: 'Proloog F1' },
            { name: 'Verdon F1' },
            { name: 'Hi-Power F1' },
            { name: 'Bonanza F1' },
          ],
        },
        {
          name: 'Beit Alpha cucumber',
          children: [{ name: 'Katrina F1' }, { name: 'Manar F1' }, { name: 'Beit Alpha' }],
        },
        {
          name: 'Slicing cucumber',
          children: [
            { name: 'Marketmore 76' },
            { name: 'Ashley' },
            { name: 'Dasher II F1' },
            { name: 'Poinsett 76' },
          ],
        },
        {
          name: 'Pickling cucumber',
          children: [
            { name: 'Extra fine 3–6 cm' },
            { name: 'Fine 6–9 cm' },
            { name: 'Medium 9–12 cm' },
            { name: 'Large 12 cm+' },
            { name: 'Parisienne Cornichon' },
            { name: 'Vlaspik F1' },
            { name: 'Nezhinsky' },
          ],
        },
        {
          name: 'Mini snack cucumber',
          children: [{ name: 'Picolino F1' }, { name: 'Iznik F1' }, { name: 'Quirk F1' }],
        },
        {
          name: 'Persian cucumber',
          children: [{ name: 'Green Fingers F1' }, { name: 'Socrates F1' }],
        },
        {
          name: 'Japanese cucumber',
          children: [{ name: 'Suyo Long' }, { name: 'Tasty Green F1' }],
        },
        { name: 'Armenian cucumber' },
      ],
    },
    {
      name: 'Olives',
      ru: 'Оливы',
      children: [
        {
          name: 'Green table olives',
          children: [
            {
              name: 'Manzanilla',
              children: [
                { name: '181–200 count/kg' },
                { name: '201–230 count/kg' },
                { name: '231–260 count/kg' },
                { name: '261–290 count/kg' },
              ],
            },
            { name: 'Gordal Sevillana' },
            { name: 'Halkidiki' },
            { name: 'Nocellara del Belice' },
            { name: 'Cerignola' },
          ],
        },
        {
          name: 'Black table olives',
          children: [
            {
              name: 'Kalamata',
              children: [
                { name: '121–140 count/kg' },
                { name: '141–160 count/kg' },
                { name: '161–180 count/kg' },
                { name: '181–200 count/kg' },
              ],
            },
            { name: 'Gaeta' },
            { name: 'Amfissa' },
            { name: 'Beldi' },
            { name: 'Thassos' },
          ],
        },
        {
          name: 'Oil olives',
          children: [
            { name: 'Picual' },
            { name: 'Arbequina' },
            { name: 'Koroneiki' },
            { name: 'Frantoio' },
            { name: 'Leccino' },
            { name: 'Hojiblanca' },
            { name: 'Coratina' },
          ],
        },
        {
          name: 'Processed olives',
          children: [
            { name: 'Pitted olives' },
            { name: 'Sliced olives' },
            { name: 'Stuffed olives' },
            { name: 'Olive paste' },
          ],
        },
      ],
    },
    {
      name: 'Pattypan squash',
      ru: 'Патиссоны',
      children: [
        {
          name: 'White pattypan squash',
          children: [{ name: 'Custard White' }, { name: 'Early White Bush' }, { name: 'Polo F1' }],
        },
        {
          name: 'Yellow pattypan squash',
          children: [{ name: 'Sunburst F1' }, { name: 'Golden Custard' }],
        },
        {
          name: 'Green pattypan squash',
          children: [{ name: "Benning's Green Tint" }, { name: 'Scallopini F1' }],
        },
        { name: 'Baby pattypan squash' },
      ],
    },
    {
      name: 'Bell pepper',
      ru: 'Перец болгарский',
      children: [
        {
          name: 'Red blocky bell pepper',
          children: [
            {
              name: 'Maratos F1',
              children: [{ name: '70–80 mm' }, { name: '80–90 mm' }, { name: '90–110 mm' }],
            },
            { name: 'Sven F1' },
            { name: 'Bachata F1' },
            { name: 'Yolo Wonder' },
            { name: 'California Wonder' },
          ],
        },
        {
          name: 'Yellow blocky bell pepper',
          children: [{ name: 'Bianca F1' }, { name: 'Sunny F1' }, { name: 'Golden California Wonder' }],
        },
        {
          name: 'Orange blocky bell pepper',
          children: [{ name: 'Magno F1' }, { name: 'Orangery F1' }],
        },
        {
          name: 'Green blocky bell pepper',
          children: [{ name: 'Emerald Giant' }, { name: 'Keystone Resistant Giant' }],
        },
        {
          name: 'Lamuyo pepper',
          children: [{ name: 'Lamuyo' }, { name: 'Almuden F1' }, { name: 'Nikita F1' }],
        },
        {
          name: 'Kapia pepper',
          children: [{ name: 'Kapia' }, { name: 'Marconi Rosso' }, { name: 'Corno di Toro' }],
        },
        {
          name: 'Mini sweet pepper',
          children: [{ name: 'Snack pepper' }, { name: 'Lunchbox pepper' }, { name: 'Sweet Bite F1' }],
        },
        {
          name: 'Paprika pepper for drying',
          children: [
            { name: 'Szegedi paprika' },
            { name: 'Pimentón de la Vera' },
            { name: 'Bhaskar paprika' },
            { name: 'Papri Kolhapuri' },
          ],
        },
      ],
    },
    {
      name: 'Chili pepper',
      ru: 'Перец горький',
      children: [
        {
          name: 'Fresh green chilli',
          children: [
            { name: 'Jwala' },
            { name: 'G4' },
            { name: 'Serrano' },
            { name: 'Jalapeño' },
            { name: 'Anaheim' },
            { name: 'Hungarian Wax' },
            { name: 'Padrón' },
            { name: 'Shishito' },
          ],
        },
        {
          name: 'Dry red chilli',
          children: [
            {
              name: 'Guntur Sannam S4',
              children: [{ name: 'With stem' }, { name: 'Stemless' }, { name: 'Broken chilli' }],
            },
            {
              name: 'Teja S17',
              children: [{ name: 'With stem' }, { name: 'Stemless' }],
            },
            { name: 'Byadgi Kaddi' },
            { name: 'Byadgi Dabbi' },
            { name: 'Kashmiri chilli' },
            { name: 'Wonder Hot 273' },
            { name: 'Ramnad Mundu' },
            { name: 'Sankeshwari 334' },
          ],
        },
        {
          name: "Bird's eye chilli",
          children: [{ name: "Thai Bird's Eye" }, { name: 'Piri piri' }, { name: 'Dhani' }],
        },
        {
          name: 'Superhot chilli',
          children: [
            { name: 'Habanero' },
            { name: 'Scotch Bonnet' },
            { name: 'Bhut Jolokia' },
            { name: 'Naga Morich' },
            { name: 'Carolina Reaper' },
            { name: 'Trinidad Scorpion' },
          ],
        },
        {
          name: 'Mexican dried chilli',
          children: [
            { name: 'Ancho' },
            { name: 'Guajillo' },
            { name: 'Pasilla' },
            { name: 'Chipotle' },
            { name: 'Chile de Árbol' },
            { name: 'Mulato' },
          ],
        },
        {
          name: 'Ground & processed chilli',
          children: [
            { name: 'Chilli powder' },
            { name: 'Crushed chilli flakes' },
            { name: 'Chilli seeds' },
            { name: 'Oleoresin capsicum' },
            { name: 'Chilli paste' },
          ],
        },
      ],
    },
    {
      name: 'Tsitsak pepper',
      ru: 'Перец цицак',
      children: [
        { name: 'Fresh tsitsak pepper' },
        { name: 'Brined tsitsak pepper' },
        { name: 'Dried tsitsak pepper' },
      ],
    },
    {
      name: 'Tomato',
      ru: 'Помидоры',
      children: [
        {
          name: 'Round salad tomato',
          children: [
            {
              name: 'Daniela',
              children: [
                { name: 'Calibre 47–57 mm' },
                { name: 'Calibre 57–67 mm' },
                { name: 'Calibre 67–82 mm' },
              ],
            },
            {
              name: 'Tomimaru Muchoo',
              children: [{ name: 'Calibre 57–67 mm' }, { name: 'Calibre 67–82 mm' }],
            },
            { name: 'Pink Paradise' },
            { name: 'Money Maker' },
            { name: 'Marglobe' },
          ],
        },
        {
          name: 'Beefsteak tomato',
          children: [
            {
              name: 'Marmande',
              children: [{ name: 'Calibre 82–102 mm' }, { name: 'Calibre 102 mm+' }],
            },
            { name: "Bull's Heart" },
            { name: 'Brandywine' },
            { name: 'Costoluto Genovese' },
            { name: 'Ponderosa' },
            { name: 'Big Beef F1' },
          ],
        },
        {
          name: 'Cherry tomato',
          children: [
            { name: 'Sungold F1' },
            { name: 'Sweet Million F1' },
            { name: 'Conchita F1' },
            { name: 'Juanita F1' },
            { name: 'Tomatoberry' },
            { name: 'Black Cherry' },
            { name: 'Yellow Pear' },
          ],
        },
        {
          name: 'Plum tomato',
          children: [
            { name: 'San Marzano' },
            { name: 'Roma VF' },
            { name: 'Rio Grande' },
            { name: 'Napoli' },
            { name: 'Amish Paste' },
          ],
        },
        {
          name: 'Vine tomato',
          children: [{ name: 'Round truss' }, { name: 'Cocktail truss' }, { name: 'Cherry truss' }],
        },
        {
          name: 'Heirloom & coloured tomato',
          children: [
            { name: 'Black Krim' },
            { name: 'Cherokee Purple' },
            { name: 'Green Zebra' },
            { name: 'Kumato' },
            { name: 'Pineapple' },
            { name: 'Yellow Brandywine' },
          ],
        },
        {
          name: 'Processing tomato',
          children: [
            { name: 'Paste grade' },
            { name: 'Peeled-whole grade' },
            { name: 'Dicing grade' },
            { name: 'Heinz 1015' },
            { name: 'Heinz 1370' },
          ],
        },
        { name: 'Green tomato' },
      ],
    },
    {
      name: 'Radish',
      ru: 'Редис',
      children: [
        {
          name: 'Round red radish',
          children: [
            { name: 'Cherry Belle' },
            { name: 'Sora F1' },
            { name: 'Donar F1' },
            { name: 'Rondar F1' },
            { name: 'Saxa 2' },
            { name: 'Diego F1' },
          ],
        },
        {
          name: 'French breakfast radish',
          children: [{ name: 'French Breakfast 3' }, { name: 'Flamboyant' }],
        },
        {
          name: 'White icicle radish',
          children: [{ name: 'White Icicle' }, { name: 'Hailstone' }],
        },
        {
          name: 'Watermelon radish',
          children: [{ name: 'Red Meat' }, { name: 'Misato Rose' }],
        },
        {
          name: 'Daikon radish',
          children: [
            { name: 'Minowase' },
            { name: 'Miyashige' },
            { name: 'April Cross F1' },
            { name: 'Mino Early' },
          ],
        },
      ],
    },
    {
      name: 'Black radish',
      ru: 'Редька',
      children: [
        {
          name: 'Round black radish',
          children: [{ name: 'Round Black Spanish' }, { name: "Noir Gros Rond d'Hiver" }, { name: 'Zimnyaya Kruglaya Chernaya' }],
        },
        {
          name: 'Long black radish',
          children: [{ name: 'Long Black Spanish' }, { name: 'Nochka' }],
        },
        {
          name: 'Green-flesh radish',
          children: [{ name: 'Margelanskaya' }, { name: 'Misato Green' }],
        },
      ],
    },
    {
      name: 'Turnip',
      ru: 'Репа',
      children: [
        {
          name: 'White turnip',
          children: [{ name: 'Tokyo Cross F1' }, { name: 'Hakurei F1' }, { name: 'Snowball' }],
        },
        {
          name: 'Purple-top turnip',
          children: [{ name: 'Purple Top White Globe' }, { name: 'Milan Purple Top' }],
        },
        {
          name: 'Golden turnip',
          children: [{ name: 'Golden Ball' }, { name: 'Petrovskaya 1' }],
        },
        { name: 'Baby turnip' },
        {
          name: 'Fodder turnip',
          children: [{ name: 'Green Globe' }, { name: 'Barkant' }],
        },
      ],
    },
    {
      name: 'Beetroot',
      ru: 'Свекла',
      children: [
        {
          name: 'Round red beetroot',
          children: [
            {
              name: 'Pablo F1',
              children: [{ name: '30–60 mm' }, { name: '60–90 mm' }, { name: '90–120 mm' }],
            },
            {
              name: 'Detroit Dark Red',
              children: [{ name: '30–60 mm' }, { name: '60–90 mm' }, { name: '90–120 mm' }],
            },
            { name: 'Boro F1' },
            { name: 'Bolivar' },
            { name: 'Red Ace F1' },
            { name: 'Bordo 237' },
            { name: 'Action F1' },
          ],
        },
        {
          name: 'Cylindrical beetroot',
          children: [{ name: 'Cylindra' }, { name: 'Formanova' }, { name: 'Rocket' }],
        },
        {
          name: 'Golden beetroot',
          children: [{ name: "Burpee's Golden" }, { name: 'Boldor F1' }],
        },
        {
          name: 'Chioggia beetroot',
          children: [{ name: 'Chioggia' }, { name: 'Bassano' }],
        },
        {
          name: 'White beetroot',
          children: [{ name: 'Albina Vereduna' }, { name: 'Blankoma' }],
        },
        { name: 'Baby beetroot' },
        {
          name: 'Beetroot for processing',
          children: [{ name: 'Beetroot juice grade' }, { name: 'Pickling grade' }, { name: 'Betanin colour grade' }],
        },
      ],
    },
    {
      name: 'Fodder beet',
      ru: 'Свекла кормовая',
      children: [
        {
          name: 'Half-sugar fodder beet',
          children: [{ name: 'Ursus Poly' }, { name: 'Rekord Poly' }, { name: 'Poltavskaya Polusakharnaya' }],
        },
        {
          name: 'Yellow fodder beet',
          children: [{ name: 'Eckendorf Yellow' }, { name: 'Lada' }],
        },
        {
          name: 'Red fodder beet',
          children: [{ name: 'Vermon' }, { name: 'Jamon' }],
        },
        { name: 'White fodder beet' },
      ],
    },
    {
      name: 'Sugar beet',
      ru: 'Свекла сахарная',
      children: [
        { name: 'Normal (N) type sugar beet' },
        { name: 'Normal-sugar (NZ) type sugar beet' },
        { name: 'High-sugar (Z) type sugar beet' },
        { name: 'High-yield (E) type sugar beet' },
        { name: 'Rhizomania-tolerant sugar beet' },
        { name: 'Cercospora-tolerant sugar beet' },
      ],
    },
    {
      name: 'Asparagus',
      ru: 'Спаржа',
      children: [
        {
          name: 'White asparagus',
          children: [
            {
              name: 'Backlim',
              children: [
                { name: '10–16 mm' },
                { name: '16–22 mm' },
                { name: '22–28 mm' },
                { name: '28 mm+' },
              ],
            },
            {
              name: 'Gijnlim',
              children: [{ name: '16–22 mm' }, { name: '22–28 mm' }, { name: '28 mm+' }],
            },
            { name: 'Thielim' },
            { name: 'Ravel' },
          ],
        },
        {
          name: 'Green asparagus',
          children: [
            {
              name: 'Grolim',
              children: [{ name: '10–16 mm' }, { name: '16–22 mm' }, { name: '22 mm+' }],
            },
            { name: 'UC 157' },
            { name: 'Mary Washington' },
            { name: 'Jersey Giant' },
          ],
        },
        {
          name: 'Purple asparagus',
          children: [{ name: 'Purple Passion' }, { name: 'Pacific Purple' }],
        },
        { name: 'Wild asparagus' },
        { name: 'Asparagus tips for processing' },
      ],
    },
    {
      name: 'Jerusalem artichoke',
      ru: 'Топинамбур',
      children: [
        {
          name: 'White-skin Jerusalem artichoke',
          children: [{ name: 'Fuseau' }, { name: 'Skorospelka' }, { name: 'Stampede' }],
        },
        {
          name: 'Red-skin Jerusalem artichoke',
          children: [{ name: 'Interes' }, { name: 'Nadezhda' }, { name: 'Vadim' }],
        },
        {
          name: 'Jerusalem artichoke for inulin processing',
          children: [{ name: 'Inulin-grade tubers' }, { name: 'Dried tuber chips' }, { name: 'Jerusalem artichoke flour' }],
        },
      ],
    },
    {
      name: 'Pumpkin',
      ru: 'Тыква',
      children: [
        {
          name: 'Butternut squash',
          children: [
            {
              name: 'Waltham Butternut',
              children: [{ name: '0.5–1 kg' }, { name: '1–1.5 kg' }, { name: '1.5–2.5 kg' }],
            },
            { name: 'Hunter F1' },
            { name: 'Barbara F1' },
            { name: 'Butterbush' },
          ],
        },
        {
          name: 'Kabocha squash',
          children: [
            { name: 'Delica F1' },
            { name: 'Ebisu F1' },
            { name: 'Kurijiman F1' },
            { name: 'Tetsukabuto F1' },
          ],
        },
        {
          name: 'Hokkaido squash',
          children: [{ name: 'Uchiki Kuri' }, { name: 'Solor F1' }, { name: 'Orange Summer F1' }],
        },
        {
          name: 'Field pumpkin',
          children: [
            { name: 'Connecticut Field' },
            { name: 'Howden' },
            { name: "Jack O'Lantern" },
            { name: "Rouge Vif d'Étampes" },
          ],
        },
        {
          name: 'Hubbard squash',
          children: [{ name: 'Blue Hubbard' }, { name: 'Golden Hubbard' }],
        },
        {
          name: 'Muscade squash',
          children: [{ name: 'Musquée de Provence' }, { name: 'Rugosa Violina Gioia' }],
        },
        {
          name: 'Spaghetti squash',
          children: [{ name: 'Vegetable Spaghetti' }, { name: 'Small Wonder' }],
        },
        {
          name: 'Acorn squash',
          children: [{ name: 'Table Queen' }, { name: 'Honey Bear F1' }],
        },
        {
          name: 'Hulless seed pumpkin',
          children: [{ name: 'Styrian Hulless' }, { name: 'Lady Godiva' }, { name: 'Kakai' }],
        },
        {
          name: 'Fodder pumpkin',
          children: [{ name: 'Big Max' }, { name: 'Stofuntovaya' }],
        },
      ],
    },
    {
      name: 'Horseradish',
      ru: 'Хрен',
      children: [
        {
          name: 'Fresh horseradish root',
          children: [
            { name: 'Atlant' },
            { name: 'Tolpukhovsky' },
            { name: 'Suzdalsky' },
            { name: 'Maliner Kren' },
            { name: 'Big Top Western' },
          ],
        },
        { name: 'Peeled horseradish root' },
        {
          name: 'Dried horseradish',
          children: [{ name: 'Horseradish flakes' }, { name: 'Horseradish powder' }],
        },
        { name: 'Grated horseradish' },
      ],
    },
    {
      name: 'Chayote',
      ru: 'Чайот',
      children: [{ name: 'Green chayote' }, { name: 'Ivory chayote' }, { name: 'Spiny chayote' }],
    },
    {
      name: 'Garlic',
      ru: 'Чеснок',
      children: [
        {
          name: 'Softneck garlic',
          children: [
            {
              name: 'Jinxiang Pure White',
              children: [
                { name: '4.5–5.0 cm' },
                { name: '5.0–5.5 cm' },
                { name: '5.5–6.0 cm' },
                { name: '6.0 cm+' },
              ],
            },
            {
              name: 'Normal White',
              children: [{ name: '4.5–5.0 cm' }, { name: '5.0–5.5 cm' }, { name: '5.5–6.0 cm' }],
            },
            { name: 'California Early' },
            { name: 'California Late' },
            { name: 'Silverskin' },
            { name: 'Egyptian Balady' },
          ],
        },
        {
          name: 'Hardneck garlic',
          children: [
            { name: 'Rocambole' },
            { name: 'Porcelain' },
            { name: 'Purple Stripe' },
            { name: 'Music' },
            { name: 'German Red' },
            { name: 'Spanish Roja' },
            { name: 'Lyubasha' },
          ],
        },
        {
          name: 'Purple garlic',
          children: [
            { name: 'Morado de Las Pedroñeras' },
            { name: 'Ajo Morado' },
            { name: 'Chinese Purple' },
          ],
        },
        { name: 'Elephant garlic' },
        {
          name: 'Black garlic',
          children: [{ name: 'Whole bulb black garlic' }, { name: 'Peeled black garlic cloves' }],
        },
        {
          name: 'Peeled garlic',
          children: [{ name: 'Whole peeled cloves' }, { name: 'Frozen garlic cloves' }],
        },
        {
          name: 'Dehydrated garlic',
          children: [
            { name: 'Garlic flakes' },
            { name: 'Garlic granules' },
            { name: 'Garlic powder' },
            { name: 'Minced dried garlic' },
          ],
        },
      ],
    },
    {
      name: 'Tiger nut',
      ru: 'Чуфа',
      children: [
        { name: 'Brown tiger nut' },
        { name: 'Yellow tiger nut' },
        { name: 'Black tiger nut' },
        { name: 'Peeled tiger nut' },
        { name: 'Tiger nut flour' },
      ],
    },
    {
      name: 'Yacon',
      ru: 'Якон',
      children: [{ name: 'Fresh yacon root' }, { name: 'Yacon syrup' }, { name: 'Dried yacon slices' }],
    },
    {
      name: 'Yam',
      ru: 'Ямс',
      children: [
        {
          name: 'White yam',
          children: [
            { name: 'Pona' },
            { name: 'Dente' },
            { name: 'Laribako' },
            { name: 'Asana' },
            { name: 'Puna' },
          ],
        },
        {
          name: 'Yellow yam',
          children: [{ name: 'Yellow Guinea yam' }, { name: 'Ekpe' }],
        },
        {
          name: 'Water yam',
          children: [{ name: 'Matches' }, { name: 'Florido' }, { name: 'Purple water yam' }],
        },
        {
          name: 'Chinese yam',
          children: [{ name: 'Nagaimo' }, { name: 'Ichoimo' }, { name: 'Tsukuneimo' }],
        },
        { name: 'Aerial yam' },
        {
          name: 'Processed yam',
          children: [{ name: 'Yam flour' }, { name: 'Yam chips' }, { name: 'Pounded yam flour' }],
        },
      ],
    },
  ],
};
