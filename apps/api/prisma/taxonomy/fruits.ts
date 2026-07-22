import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Fruits. Goes 5 levels deep on the high-volume export commodities (apple, banana, grapes,
 * mango, citrus, pear, peach, melon, pomegranate, avocado, pineapple) where lots trade by
 * cultivar → clone/strain → calibre or count; long-tail tropicals stop at a single cultivar tier.
 */
export const fruits: TaxCategory = {
  name: 'Fruits',
  emoji: '🍎',
  tint: TINT.sand,
  children: [
    {
      name: 'Apricot',
      ru: 'Абрикосы',
      children: [
        {
          name: 'Fresh-market apricot',
          children: [
            {
              name: 'Bergeron',
              children: [
                { name: '35-40 mm' },
                { name: '40-45 mm' },
                { name: '45-50 mm' },
                { name: '50 mm and above' },
              ],
            },
            { name: 'Bulida' },
            { name: 'Canino' },
            { name: 'Moniqui' },
            { name: 'Ninfa' },
            { name: 'Pinkcot' },
            { name: 'Orange Red (Bhart)' },
            { name: 'Farbaly' },
            { name: 'Kioto' },
            { name: 'Tsunami' },
            { name: 'Krasnoshchyoky' },
            { name: 'Shalakh (Ordubadi)' },
          ],
        },
        {
          name: 'Drying-grade apricot',
          children: [
            { name: 'Isfarak' },
            { name: 'Subhoni' },
            { name: 'Mirsanjali' },
            { name: 'Kandak' },
            { name: 'Khurmoi' },
            { name: 'Malayer' },
          ],
        },
        {
          name: 'Canning-grade apricot',
          children: [{ name: 'Tilton' }, { name: 'Patterson' }, { name: 'Castlebrite' }, { name: 'Hungarian Best' }],
        },
      ],
    },
    {
      name: 'Avocado',
      ru: 'Авокадо',
      children: [
        {
          name: 'Hass',
          children: [
            { name: 'Count 12' },
            { name: 'Count 14' },
            { name: 'Count 16' },
            { name: 'Count 18' },
            { name: 'Count 20' },
            { name: 'Count 22' },
            { name: 'Count 24' },
            { name: 'Count 26' },
            { name: 'Count 28' },
            { name: 'Count 30' },
          ],
        },
        { name: 'Maluma Hass' },
        { name: 'Lamb Hass' },
        { name: 'Carmen Hass' },
        {
          name: 'Fuerte',
          children: [
            { name: 'Count 14' },
            { name: 'Count 16' },
            { name: 'Count 18' },
            { name: 'Count 20' },
            { name: 'Count 22' },
            { name: 'Count 24' },
          ],
        },
        { name: 'Ettinger' },
        { name: 'Pinkerton' },
        { name: 'Reed' },
        { name: 'Bacon' },
        { name: 'Zutano' },
        { name: 'Gwen' },
        { name: 'Shepard' },
        { name: 'Nabal' },
        { name: 'Semil 34' },
        { name: 'Choquette' },
        { name: 'Booth 7' },
        { name: 'Hall' },
        { name: 'Pollock' },
      ],
    },
    {
      name: 'Pawpaw',
      ru: 'Азимина',
      children: [
        { name: 'Sunflower' },
        { name: 'Shenandoah' },
        { name: 'Susquehanna' },
        { name: 'Overleese' },
        { name: 'NC-1' },
        { name: 'Allegheny' },
        { name: 'Wells' },
        { name: 'Mango pawpaw' },
      ],
    },
    {
      name: 'Quince',
      ru: 'Айва',
      children: [
        { name: 'Vranja' },
        { name: 'Champion' },
        { name: 'Smyrna' },
        { name: 'Portugal' },
        { name: 'Ekmek' },
        { name: 'Isfahan' },
        { name: 'Bereczki' },
        { name: 'Pineapple quince' },
        { name: 'Aromatnaya' },
        { name: 'Anzherskaya' },
      ],
    },
    {
      name: 'Ackee',
      ru: 'Аки',
      children: [{ name: 'Butter ackee' }, { name: 'Cheese ackee' }],
    },
    {
      name: 'Cherry plum',
      ru: 'Алыча',
      children: [
        {
          name: 'Yellow cherry plum',
          children: [{ name: 'Zlato Skifov' }, { name: 'Zhemchuzhina' }, { name: 'Podarok Sankt-Peterburgu' }],
        },
        {
          name: 'Red cherry plum',
          children: [
            { name: 'Kubanskaya Kometa' },
            { name: 'Puteshestvennitsa' },
            { name: 'Tsarskaya' },
            { name: 'Sonya' },
          ],
        },
        {
          name: 'Dark-purple cherry plum',
          children: [{ name: 'Gek' }, { name: 'Nesmeyana' }, { name: 'Mara' }, { name: 'Chernaya Pozdnyaya' }],
        },
        { name: 'Sauce-grade cherry plum (tkemali)' },
      ],
    },
    {
      name: 'Pineapple',
      ru: 'Ананасы',
      children: [
        {
          name: 'MD-2 (Extra Sweet)',
          children: [
            { name: 'Count 5' },
            { name: 'Count 6' },
            { name: 'Count 7' },
            { name: 'Count 8' },
            { name: 'Count 9' },
            { name: 'Count 10' },
            { name: 'Count 12' },
          ],
        },
        {
          name: 'Smooth Cayenne',
          children: [
            { name: 'Count 6' },
            { name: 'Count 8' },
            { name: 'Count 10' },
            { name: 'Count 12' },
            { name: 'Cannery grade' },
          ],
        },
        { name: 'Queen (Mauritius)' },
        { name: 'Red Spanish' },
        { name: 'Pérola (Abacaxi)' },
        { name: 'Kew' },
        { name: 'Sugarloaf' },
        { name: 'Josapine' },
        { name: 'Phulae (Phuket)' },
      ],
    },
    {
      name: 'Orange',
      ru: 'Апельсины',
      children: [
        {
          name: 'Navel orange',
          children: [
            {
              name: 'Washington Navel',
              children: [
                { name: 'Size 48' },
                { name: 'Size 56' },
                { name: 'Size 64' },
                { name: 'Size 72' },
                { name: 'Size 88' },
                { name: 'Size 113' },
              ],
            },
            { name: 'Navelina' },
            { name: 'Newhall' },
            { name: 'Lane Late' },
            { name: 'Navelate' },
            { name: 'Powell Summer Navel' },
            { name: 'Chislett Summer Navel' },
            { name: 'Cara Cara' },
            { name: 'Fukumoto' },
            { name: 'Barnfield' },
          ],
        },
        {
          name: 'Valencia orange',
          children: [
            {
              name: 'Valencia Late',
              children: [
                { name: 'Size 56' },
                { name: 'Size 64' },
                { name: 'Size 72' },
                { name: 'Size 88' },
                { name: 'Size 113' },
              ],
            },
            { name: 'Midknight Valencia' },
            { name: 'Delta Seedless' },
            { name: 'Olinda Valencia' },
            { name: 'Barberina' },
          ],
        },
        {
          name: 'Blonde (common) orange',
          children: [
            { name: 'Salustiana' },
            { name: 'Shamouti (Jaffa)' },
            { name: 'Hamlin' },
            { name: 'Pera' },
            { name: 'Sathgudi' },
            { name: 'Malta (Blood Red)' },
            { name: 'Jincheng' },
          ],
        },
        {
          name: 'Juice-processing orange',
          children: [{ name: 'Pera Rio' }, { name: 'Natal' }, { name: 'Westin' }, { name: 'Rubi' }],
        },
        {
          name: 'Bitter orange',
          children: [{ name: 'Seville (Bigarade)' }, { name: 'Chinotto' }, { name: 'Bouquet de Fleurs' }],
        },
      ],
    },
    {
      name: 'Blood orange',
      ru: 'Апельсины красные',
      children: [
        {
          name: 'Tarocco',
          children: [
            { name: 'Tarocco Ippolito' },
            { name: 'Tarocco Gallo' },
            { name: 'Tarocco Rosso' },
            { name: 'Tarocco Meli' },
            { name: "Tarocco Sant'Alfio" },
          ],
        },
        { name: 'Moro' },
        { name: 'Sanguinello' },
        { name: 'Sanguinelli' },
        { name: 'Maltese blood orange' },
        { name: 'Vainiglia Sanguigno' },
      ],
    },
    {
      name: 'Watermelon',
      ru: 'Арбузы',
      children: [
        {
          name: 'Seeded watermelon',
          children: [
            {
              name: 'Crimson Sweet',
              children: [{ name: '3-5 kg' }, { name: '5-8 kg' }, { name: '8-12 kg' }, { name: '12 kg and above' }],
            },
            { name: 'Sugar Baby' },
            { name: 'Charleston Gray' },
            { name: 'Black Diamond' },
            { name: 'Jubilee' },
            { name: 'Allsweet' },
            { name: 'Klondike' },
            { name: 'Kholodok' },
            { name: 'Astrakhansky' },
            { name: 'Arka Manik' },
          ],
        },
        {
          name: 'Seedless (triploid) watermelon',
          children: [
            {
              name: 'Boston',
              children: [{ name: '3-5 kg' }, { name: '5-8 kg' }, { name: '8-12 kg' }],
            },
            { name: 'Crisby' },
            { name: 'Bengala' },
            { name: 'Fashion' },
            { name: 'Style' },
            { name: 'Reina de Corazones' },
            { name: 'Farao' },
          ],
        },
        {
          name: 'Mini (personal) watermelon',
          children: [{ name: 'Extazy' }, { name: 'Bibo' }, { name: 'Petite Perfection' }, { name: 'Mini Love' }],
        },
        {
          name: 'Yellow-flesh watermelon',
          children: [{ name: 'Yellow Crimson' }, { name: 'Janosik' }, { name: 'Amarillo' }],
        },
      ],
    },
    {
      name: 'Banana',
      ru: 'Бананы',
      children: [
        {
          name: 'Cavendish',
          children: [
            {
              name: 'Grand Naine (G9)',
              children: [
                { name: 'Finger length 6 in' },
                { name: 'Finger length 7 in' },
                { name: 'Finger length 8 in' },
                { name: 'Finger length 9 in' },
              ],
            },
            { name: 'Williams' },
            { name: 'Robusta' },
            { name: 'Dwarf Cavendish' },
            { name: 'Giant Cavendish' },
            { name: 'Valery' },
          ],
        },
        {
          name: 'Plantain (cooking banana)',
          children: [
            { name: 'French plantain' },
            { name: 'Horn plantain' },
            { name: 'Nendran' },
            { name: 'Monthan' },
            { name: 'Bluggoe' },
          ],
        },
        {
          name: 'Lady Finger (Sucrier)',
          children: [{ name: 'Pisang Mas' }, { name: 'Ney Poovan (Elaichi)' }, { name: 'Kluai Khai' }],
        },
        {
          name: 'Red banana',
          children: [{ name: 'Red Dacca' }, { name: 'Chenkadali' }],
        },
        { name: 'Gros Michel' },
        { name: 'Apple banana (Manzano)' },
        { name: 'Burro (Orinoco)' },
        { name: 'Poovan' },
        { name: 'Rasthali' },
        { name: 'Baby banana' },
        { name: 'Green banana for chips' },
      ],
    },
    {
      name: 'Grapes',
      ru: 'Виноград',
      children: [
        {
          name: 'Table grapes',
          children: [
            {
              name: 'Thompson Seedless (Sultanina)',
              children: [
                { name: 'Berry 16-18 mm' },
                { name: 'Berry 18-20 mm' },
                { name: 'Berry 20-22 mm' },
                { name: 'Berry 22 mm and above' },
              ],
            },
            {
              name: 'Crimson Seedless',
              children: [{ name: 'Berry 16-18 mm' }, { name: 'Berry 18-20 mm' }, { name: 'Berry 20-22 mm' }],
            },
            {
              name: 'Red Globe',
              children: [{ name: 'Berry 22-24 mm' }, { name: 'Berry 24-26 mm' }, { name: 'Berry 26 mm and above' }],
            },
            { name: 'Flame Seedless' },
            { name: 'Sugraone (Superior Seedless)' },
            { name: 'Autumn Royal' },
            { name: 'Sweet Globe' },
            { name: 'Timco' },
            { name: 'Ivory' },
            { name: 'Arra 15' },
            { name: 'Black Magic' },
            { name: 'Muscat Hamburg' },
            { name: 'Italia' },
            { name: 'Victoria' },
            { name: 'Cardinal' },
            { name: 'Sonaka' },
            { name: 'Anab-e-Shahi' },
            { name: 'Husseine (Damskiye Palchiki)' },
            { name: 'Kishmish Chorny' },
            { name: 'Moldova' },
          ],
        },
        {
          name: 'Wine grapes',
          children: [
            { name: 'Cabernet Sauvignon' },
            { name: 'Merlot' },
            { name: 'Chardonnay' },
            { name: 'Sauvignon Blanc' },
            { name: 'Pinot Noir' },
            { name: 'Syrah (Shiraz)' },
            { name: 'Riesling' },
            { name: 'Tempranillo' },
            { name: 'Sangiovese' },
            { name: 'Rkatsiteli' },
            { name: 'Saperavi' },
            { name: 'Aligoté' },
            { name: 'Muscat Blanc' },
            { name: 'Bianca' },
          ],
        },
        {
          name: 'Raisin (drying) grapes',
          children: [
            { name: 'Sultana (drying grade)' },
            { name: 'Black Corinth (Zante currant)' },
            { name: 'Muscat of Alexandria' },
            { name: 'Fiesta' },
            { name: 'Selma Pete' },
            { name: 'Kishmish Soyaki' },
          ],
        },
        {
          name: 'Juice & concentrate grapes',
          children: [
            { name: 'Concord' },
            { name: 'Niagara' },
            { name: 'Isabella' },
            { name: 'Bangalore Blue' },
            { name: 'Lidia' },
          ],
        },
      ],
    },
    {
      name: 'Sour cherry',
      ru: 'Вишня',
      children: [
        {
          name: 'Fresh-market sour cherry',
          children: [
            { name: 'Vladimirskaya' },
            { name: 'Lyubskaya' },
            { name: 'Turgenevka' },
            { name: 'Zhukovskaya' },
            { name: 'Morozovka' },
            { name: 'Shubinka' },
            { name: 'Kelleris 16' },
            { name: 'Újfehértói Fürtös' },
          ],
        },
        {
          name: 'Processing sour cherry',
          children: [
            { name: 'Montmorency' },
            { name: 'Oblačinska' },
            { name: 'Schattenmorelle (Lotovka)' },
            { name: 'Érdi Bőtermő' },
            { name: 'Marasca' },
          ],
        },
      ],
    },
    {
      name: 'Pomegranate',
      ru: 'Гранат',
      children: [
        {
          name: 'Wonderful',
          children: [
            { name: '70-80 mm' },
            { name: '80-90 mm' },
            { name: '90-100 mm' },
            { name: '100 mm and above' },
          ],
        },
        {
          name: 'Bhagwa (Sindhuri)',
          children: [{ name: '250-350 g' }, { name: '350-500 g' }, { name: '500 g and above' }],
        },
        { name: 'Ganesh' },
        { name: 'Arakta' },
        { name: 'Mridula' },
        { name: 'Kandhari' },
        { name: 'Acco' },
        { name: 'Herskawitz' },
        { name: 'Mollar de Elche' },
        { name: 'Hicaznar' },
        { name: 'Gulosha Azerbaijani' },
        { name: 'Parfianka' },
        { name: 'Juice & aril grade pomegranate' },
      ],
    },
    {
      name: 'Grapefruit',
      ru: 'Грейпфрут',
      children: [
        {
          name: 'Red & pink grapefruit',
          children: [
            {
              name: 'Star Ruby',
              children: [
                { name: 'Size 27' },
                { name: 'Size 32' },
                { name: 'Size 36' },
                { name: 'Size 40' },
                { name: 'Size 45' },
                { name: 'Size 48' },
              ],
            },
            { name: 'Rio Red' },
            { name: 'Ruby Red' },
            { name: 'Flame' },
            { name: 'Henderson' },
          ],
        },
        {
          name: 'White grapefruit',
          children: [{ name: 'Marsh Seedless' }, { name: 'Duncan' }, { name: 'Oroblanco (white)' }],
        },
        { name: 'Juice-grade grapefruit' },
      ],
    },
    {
      name: 'Pear',
      ru: 'Груши',
      children: [
        {
          name: 'European pear',
          children: [
            {
              name: 'Conference',
              children: [
                { name: '55-60 mm' },
                { name: '60-65 mm' },
                { name: '65-70 mm' },
                { name: '70-75 mm' },
                { name: '75 mm and above' },
              ],
            },
            {
              name: 'Williams (Bartlett)',
              children: [{ name: '60-65 mm' }, { name: '65-70 mm' }, { name: '70-75 mm' }, { name: '75 mm and above' }],
            },
            { name: 'Red Bartlett' },
            { name: 'Abate Fetel' },
            { name: "Packham's Triumph" },
            { name: 'Beurré Bosc (Kaiser)' },
            { name: 'Doyenné du Comice' },
            { name: 'Forelle' },
            { name: 'Rocha' },
            { name: 'Santa Maria' },
            { name: 'Coscia' },
            { name: 'Green Anjou' },
            { name: 'Red Anjou' },
            { name: 'Blanquilla' },
            { name: 'Guyot' },
            { name: 'Concorde' },
            { name: 'General Leclerc' },
            { name: 'Carmen' },
            { name: 'Lyubimitsa Klappa' },
          ],
        },
        {
          name: 'Asian pear (Nashi)',
          children: [
            { name: 'Nijisseiki (20th Century)' },
            { name: 'Hosui' },
            { name: 'Kosui' },
            { name: 'Shinseiki' },
            { name: 'Chojuro' },
            { name: 'Niitaka (Shingo)' },
            { name: 'Ya Li' },
            { name: 'Whangkeum' },
          ],
        },
        {
          name: 'Perry pear',
          children: [{ name: 'Blakeney Red' }, { name: 'Yellow Huffcap' }, { name: 'Thorn' }, { name: 'Dabinett pear' }],
        },
        {
          name: 'Processing pear',
          children: [{ name: 'Canning-grade Williams' }, { name: 'Juice-grade pear' }, { name: 'Purée-grade pear' }],
        },
      ],
    },
    {
      name: 'Guava',
      ru: 'Гуава',
      children: [
        {
          name: 'White-flesh guava',
          children: [
            { name: 'Allahabad Safeda' },
            { name: 'Lucknow-49 (Sardar)' },
            { name: 'Chittidar' },
            { name: 'Thai White' },
          ],
        },
        {
          name: 'Pink-flesh guava',
          children: [
            { name: 'Lalit' },
            { name: 'Arka Kiran' },
            { name: 'Ruby Supreme' },
            { name: 'Hong Kong Pink' },
            { name: 'Beaumont' },
          ],
        },
        { name: 'Seedless guava' },
        { name: 'Pulp-grade guava' },
      ],
    },
    {
      name: 'Jackfruit',
      ru: 'Джекфрут',
      children: [
        {
          name: 'Firm-flesh (Varikka) jackfruit',
          children: [
            { name: 'Muttom Varikka' },
            { name: 'Sindoor' },
            { name: 'J-33' },
            { name: 'Black Gold' },
            { name: 'Siddu' },
          ],
        },
        {
          name: 'Soft-flesh (Koozha) jackfruit',
          children: [{ name: 'Koozha jackfruit' }, { name: 'Gumless Jack' }],
        },
        { name: 'Green jackfruit (vegetable grade)' },
        { name: 'Jackfruit bulbs (deseeded)' },
      ],
    },
    {
      name: 'Durian',
      ru: 'Дуриан',
      children: [
        { name: 'Monthong' },
        { name: 'Chanee' },
        { name: 'Kan Yao' },
        { name: 'Puang Manee' },
        { name: 'Kradum Thong' },
        { name: 'Musang King (Mao Shan Wang)' },
        { name: 'D24 Sultan' },
        { name: 'Black Thorn' },
        { name: 'Red Prawn (Ang Heh)' },
        { name: 'XO' },
        { name: 'Ri6' },
      ],
    },
    {
      name: 'Melon',
      ru: 'Дыни',
      children: [
        {
          name: 'Cantaloupe',
          children: [
            { name: 'Charentais' },
            { name: 'Athena' },
            { name: 'Harper' },
            { name: 'Magenta' },
            { name: 'Western Shipper' },
          ],
        },
        {
          name: 'Galia',
          children: [{ name: 'Arava' }, { name: 'Ricura' }, { name: 'Gallicum' }],
        },
        {
          name: 'Honeydew',
          children: [{ name: 'Green Flesh Honeydew' }, { name: 'Golden Honeydew' }, { name: 'Honey Orange' }],
        },
        {
          name: 'Piel de Sapo',
          children: [{ name: 'Sancho' }, { name: 'Trujillo' }, { name: 'Vulcano' }],
        },
        {
          name: 'Yellow Canary',
          children: [{ name: 'Amarillo Oro' }, { name: 'Canary Yellow' }],
        },
        {
          name: 'Central Asian winter melon',
          children: [
            { name: 'Torpeda (Mirzachul)' },
            { name: 'Gulyabi' },
            { name: 'Ich-Kzyl' },
            { name: 'Kassaba' },
            { name: 'Kolkhoznitsa' },
          ],
        },
        {
          name: 'Indian muskmelon',
          children: [{ name: 'Hara Madhu' }, { name: 'Punjab Sunehri' }, { name: 'Arka Rajhans' }],
        },
        { name: 'Japanese netted melon (Earl’s Favourite)' },
      ],
    },
    {
      name: 'Fig',
      ru: 'Инжир',
      children: [
        {
          name: 'Fresh fig',
          children: [
            { name: 'Bursa Siyahi' },
            { name: 'Brown Turkey' },
            { name: 'Black Mission' },
            { name: 'Kadota' },
            { name: 'Dottato' },
            { name: 'Adriatic' },
            { name: 'Petrelli' },
            { name: 'Colar Elche' },
          ],
        },
        {
          name: 'Drying-grade fig',
          children: [{ name: 'Sarılop (Smyrna)' }, { name: 'Bardakçı' }, { name: 'Calimyrna' }, { name: 'Lerida' }],
        },
      ],
    },
    {
      name: 'Horned melon',
      ru: 'Кивано',
      children: [{ name: '150-200 g' }, { name: '200-250 g' }, { name: '250 g and above' }],
    },
    {
      name: 'Kiwi',
      ru: 'Киви',
      children: [
        {
          name: 'Green kiwifruit',
          children: [
            {
              name: 'Hayward',
              children: [
                { name: 'Count 25' },
                { name: 'Count 27' },
                { name: 'Count 30' },
                { name: 'Count 33' },
                { name: 'Count 36' },
                { name: 'Count 39' },
              ],
            },
            { name: 'Bruno' },
            { name: 'Monty' },
            { name: 'Abbott' },
            { name: 'Summer 3373' },
          ],
        },
        {
          name: 'Gold kiwifruit',
          children: [
            { name: 'SunGold (G3)' },
            { name: 'Jintao' },
            { name: 'Soreli' },
            { name: 'Dori' },
            { name: 'Hort16A' },
          ],
        },
        {
          name: 'Red kiwifruit',
          children: [{ name: 'Hongyang' }, { name: 'Red Sun' }, { name: 'Oriental Red' }],
        },
        {
          name: 'Kiwiberry (Actinidia arguta)',
          children: [{ name: 'Weiki' }, { name: 'Issai' }, { name: 'Ananasnaya' }, { name: 'Ken’s Red' }],
        },
      ],
    },
    {
      name: 'Clementine',
      ru: 'Клементин',
      children: [
        {
          name: 'Clemenules (Nules)',
          children: [
            { name: '35-45 mm' },
            { name: '45-54 mm' },
            { name: '54-64 mm' },
            { name: '64-74 mm' },
          ],
        },
        { name: 'Oronules' },
        { name: 'Marisol' },
        { name: 'Clemenrubí' },
        { name: 'Arrufatina' },
        { name: 'Hernandina' },
        { name: 'Loretina' },
        { name: 'Fina' },
        { name: 'Orogros' },
        { name: 'Clemenpons' },
        { name: 'Esbal' },
        { name: 'Algerian clementine' },
      ],
    },
    {
      name: 'Coconut',
      ru: 'Кокосы',
      children: [
        {
          name: 'Tender (drinking) coconut',
          children: [
            { name: 'Nam Hom aromatic' },
            { name: 'Chowghat Orange Dwarf' },
            { name: 'Malayan Yellow Dwarf' },
            { name: 'Diamond-cut polished coconut' },
          ],
        },
        {
          name: 'Mature husked coconut',
          children: [
            { name: 'West Coast Tall' },
            { name: 'East Coast Tall' },
            { name: 'Hybrid D×T' },
            { name: 'Semi-husked coconut' },
          ],
        },
        {
          name: 'Copra-grade coconut',
          children: [{ name: 'Milling copra' }, { name: 'Edible ball copra' }, { name: 'Cup copra' }],
        },
      ],
    },
    {
      name: 'Kumquat',
      ru: 'Кумкват',
      children: [
        { name: 'Nagami (oval)' },
        { name: 'Marumi (round)' },
        { name: 'Meiwa (sweet)' },
        { name: 'Fukushu' },
        { name: 'Limequat' },
        { name: 'Calamondin' },
      ],
    },
    {
      name: 'Lime',
      ru: 'Лайм',
      children: [
        {
          name: 'Persian lime (Tahiti)',
          children: [
            { name: 'Size 110' },
            { name: 'Size 150' },
            { name: 'Size 175' },
            { name: 'Size 200' },
            { name: 'Size 230' },
            { name: 'Size 250' },
          ],
        },
        { name: 'Key lime (Mexican)' },
        { name: 'Kagzi lime' },
        { name: 'Kaffir lime' },
        { name: 'Sweet lime (Mosambi)' },
        { name: 'Rangpur lime' },
        { name: 'Finger lime' },
      ],
    },
    {
      name: 'Lemon',
      ru: 'Лимоны',
      children: [
        {
          name: 'Eureka',
          children: [
            { name: 'Size 75' },
            { name: 'Size 95' },
            { name: 'Size 115' },
            { name: 'Size 140' },
            { name: 'Size 165' },
            { name: 'Size 200' },
          ],
        },
        {
          name: 'Lisbon',
          children: [{ name: 'Size 95' }, { name: 'Size 115' }, { name: 'Size 140' }, { name: 'Size 165' }],
        },
        {
          name: 'Femminello',
          children: [
            { name: 'Femminello Siracusano' },
            { name: 'Femminello Zagara Bianca' },
            { name: 'Femminello Santa Teresa' },
          ],
        },
        { name: 'Verna' },
        { name: 'Fino (Primofiori)' },
        { name: 'Interdonato' },
        { name: 'Meyer' },
        { name: 'Genoa' },
        { name: 'Villafranca' },
        { name: 'Rough lemon (Jambhiri)' },
        { name: 'Ponderosa' },
        { name: 'Assam lemon' },
        { name: 'Juice-grade lemon' },
      ],
    },
    {
      name: 'Lychee',
      ru: 'Личи',
      children: [
        {
          name: 'Indian lychee',
          children: [
            { name: 'Shahi' },
            { name: 'China (Bedana)' },
            { name: 'Bombai' },
            { name: 'Late Large Red' },
            { name: 'Rose Scented' },
            { name: 'Calcuttia' },
          ],
        },
        {
          name: 'Chinese lychee',
          children: [
            { name: 'Feizixiao' },
            { name: 'Guiwei' },
            { name: 'Nuomici' },
            { name: 'Heiye' },
            { name: 'Baitangying' },
          ],
        },
        {
          name: 'Southeast Asian & Australian lychee',
          children: [
            { name: 'Mauritius' },
            { name: 'Tai So' },
            { name: 'Kwai May Pink' },
            { name: 'Wai Chee' },
            { name: 'Salathiel' },
            { name: "McLean's Red" },
          ],
        },
      ],
    },
    {
      name: 'Longan',
      ru: 'Лонган',
      children: [
        { name: 'Daw (E-Daw)' },
        { name: 'Biew Kiew' },
        { name: 'Sri Chompoo' },
        { name: 'Shixia' },
        { name: 'Fuyan' },
        { name: 'Dahongpao' },
        { name: 'Kohala' },
      ],
    },
    {
      name: 'Mango',
      ru: 'Манго',
      children: [
        {
          name: 'Indian mango',
          children: [
            {
              name: 'Alphonso',
              children: [
                { name: 'Count 6-8 per box' },
                { name: 'Count 8-10 per box' },
                { name: 'Count 10-12 per box' },
                { name: 'Count 12-14 per box' },
              ],
            },
            { name: 'Kesar' },
            { name: 'Banganapalli (Benishan)' },
            { name: 'Totapuri' },
            { name: 'Dasheri' },
            { name: 'Langra' },
            { name: 'Chausa' },
            { name: 'Himsagar' },
            { name: 'Neelam' },
            { name: 'Mallika' },
            { name: 'Amrapali' },
            { name: 'Raspuri' },
            { name: 'Badami' },
          ],
        },
        {
          name: 'Pakistani mango',
          children: [
            { name: 'Sindhri' },
            { name: 'Chaunsa' },
            { name: 'Anwar Ratol' },
            { name: 'Dusehri' },
            { name: 'Fajri' },
            { name: 'Langra Pakistani' },
          ],
        },
        {
          name: 'Florida-type mango',
          children: [
            {
              name: 'Kent',
              children: [
                { name: 'Count 6' },
                { name: 'Count 7' },
                { name: 'Count 8' },
                { name: 'Count 9' },
                { name: 'Count 10' },
                { name: 'Count 12' },
                { name: 'Count 14' },
              ],
            },
            {
              name: 'Keitt',
              children: [
                { name: 'Count 6' },
                { name: 'Count 7' },
                { name: 'Count 8' },
                { name: 'Count 9' },
                { name: 'Count 10' },
              ],
            },
            {
              name: 'Tommy Atkins',
              children: [{ name: 'Count 8' }, { name: 'Count 9' }, { name: 'Count 10' }, { name: 'Count 12' }],
            },
            { name: 'Haden' },
            { name: 'Palmer' },
            { name: 'Osteen' },
            { name: 'Ataulfo (Honey)' },
            { name: 'Francis' },
          ],
        },
        {
          name: 'Southeast Asian mango',
          children: [
            { name: 'Nam Dok Mai' },
            { name: 'Mahachanok' },
            { name: 'Carabao' },
            { name: 'Harum Manis' },
            { name: 'Chok Anan' },
            { name: 'Okrong' },
            { name: 'Cat Hoa Loc' },
          ],
        },
        {
          name: 'African mango',
          children: [{ name: 'Amelie' }, { name: 'Julie' }, { name: 'Ngowe' }, { name: 'Apple mango' }, { name: 'Zill' }],
        },
        {
          name: 'Australian mango',
          children: [
            { name: 'Kensington Pride' },
            { name: 'R2E2' },
            { name: 'Calypso' },
            { name: 'Honey Gold' },
          ],
        },
        {
          name: 'Processing mango',
          children: [
            { name: 'Pulp-grade Totapuri' },
            { name: 'Pulp-grade Alphonso' },
            { name: 'Raw green mango (pickling)' },
            { name: 'Raw green mango (amchur)' },
          ],
        },
      ],
    },
    {
      name: 'Mangosteen',
      ru: 'Мангостин',
      children: [
        { name: 'Extra large (7-8 pcs/kg)' },
        { name: 'Large (9-10 pcs/kg)' },
        { name: 'Medium (11-13 pcs/kg)' },
        { name: 'Small (14 pcs/kg and above)' },
      ],
    },
    {
      name: 'Mandarin',
      ru: 'Мандарины',
      children: [
        {
          name: 'Satsuma',
          children: [
            { name: 'Owari' },
            { name: 'Okitsu' },
            { name: 'Miyagawa' },
            { name: 'Clausellina' },
            { name: 'Iwasaki' },
          ],
        },
        {
          name: 'Common mandarin',
          children: [
            { name: 'Ponkan' },
            { name: 'Nagpur Santra' },
            { name: 'Kinnow' },
            { name: 'Coorg mandarin' },
            { name: 'Dancy' },
            { name: 'Fortune' },
            { name: 'Fremont' },
          ],
        },
        {
          name: 'Late seedless hybrid',
          children: [
            {
              name: 'Nadorcott (Afourer)',
              children: [{ name: '45-54 mm' }, { name: '54-63 mm' }, { name: '63-74 mm' }],
            },
            { name: 'Tango' },
            { name: 'Orri' },
            { name: 'Or' },
            { name: 'Leanri' },
            { name: 'Gold Nugget' },
          ],
        },
        {
          name: 'Tangor',
          children: [{ name: 'Murcott' }, { name: 'Ortanique' }, { name: 'Temple' }, { name: 'Ellendale' }],
        },
        {
          name: 'Tangelo',
          children: [{ name: 'Minneola' }, { name: 'Orlando' }, { name: 'Seminole' }, { name: 'Ugli' }],
        },
      ],
    },
    {
      name: 'Passion fruit',
      ru: 'Маракуйя',
      children: [
        {
          name: 'Purple passion fruit',
          children: [{ name: 'Frederick' }, { name: 'Ester' }, { name: 'Kaveri' }],
        },
        {
          name: 'Yellow passion fruit',
          children: [{ name: 'Panama Gold' }, { name: 'Panama Red' }, { name: 'Maracujá Amarelo' }],
        },
        { name: 'Sweet granadilla' },
        { name: 'Giant granadilla' },
        { name: 'Banana passionfruit' },
        { name: 'Juice & pulp grade passion fruit' },
      ],
    },
    {
      name: 'Nectarine',
      ru: 'Нектарин',
      children: [
        {
          name: 'Yellow-flesh nectarine',
          children: [
            {
              name: 'Big Top',
              children: [
                { name: 'Calibre A (61-67 mm)' },
                { name: 'Calibre AA (67-73 mm)' },
                { name: 'Calibre AAA (73-80 mm)' },
                { name: 'Calibre AAAA (80 mm and above)' },
              ],
            },
            { name: 'Nectaross' },
            { name: 'Venus' },
            { name: 'Honey Royale' },
            { name: 'Diamond Ray' },
            { name: 'August Red' },
          ],
        },
        {
          name: 'White-flesh nectarine',
          children: [
            { name: 'Caldesi 2000' },
            { name: 'Snow Queen' },
            { name: 'Silver Rome' },
            { name: 'Maria Aurelia' },
          ],
        },
        {
          name: 'Flat nectarine (Platerina)',
          children: [{ name: 'Mesembrine' }, { name: 'Sweet Zee' }],
        },
        { name: 'Red-flesh nectarine (Nectavigne)' },
      ],
    },
    {
      name: 'Papaya',
      ru: 'Папайя',
      children: [
        {
          name: 'Solo-type papaya',
          children: [
            { name: 'Sunrise Solo' },
            { name: 'Sunset Solo' },
            { name: 'Kapoho Solo' },
            { name: 'Rainbow' },
          ],
        },
        {
          name: 'Large-fruited papaya',
          children: [
            { name: 'Maradol' },
            { name: 'Formosa' },
            { name: 'Tainung No.1' },
            { name: 'Golden' },
            { name: 'Red Lady 786' },
          ],
        },
        {
          name: 'Indian papaya',
          children: [
            { name: 'Coorg Honey Dew' },
            { name: 'Pusa Delicious' },
            { name: 'Pusa Dwarf' },
            { name: 'Arka Prabhath' },
            { name: 'Washington' },
          ],
        },
        { name: 'Green papaya (papain & processing)' },
      ],
    },
    {
      name: 'Peach',
      ru: 'Персики',
      children: [
        {
          name: 'Yellow-flesh peach',
          children: [
            {
              name: 'Royal Glory',
              children: [
                { name: 'Calibre A (61-67 mm)' },
                { name: 'Calibre AA (67-73 mm)' },
                { name: 'Calibre AAA (73-80 mm)' },
                { name: 'Calibre AAAA (80 mm and above)' },
              ],
            },
            { name: 'Redhaven' },
            { name: 'Elegant Lady' },
            { name: "O'Henry" },
            { name: 'Cresthaven' },
            { name: 'Rich Lady' },
            { name: 'Suncrest' },
            { name: 'Sweet Dream' },
          ],
        },
        {
          name: 'White-flesh peach',
          children: [
            { name: 'Snow King' },
            { name: 'Ghiaccio' },
            { name: 'Tendresse' },
            { name: 'White Lady' },
            { name: 'Maria Bianca' },
          ],
        },
        {
          name: 'Flat peach (Paraguayo)',
          children: [{ name: 'UFO' }, { name: 'Platibelle' }, { name: 'Sweetcap' }, { name: 'Saturn' }],
        },
        {
          name: 'Clingstone canning peach',
          children: [
            { name: 'Andross' },
            { name: 'Babygold 7' },
            { name: 'Carson' },
            { name: 'Klamt' },
            { name: 'Loadel' },
            { name: 'Everts' },
          ],
        },
      ],
    },
    {
      name: 'Dragon fruit',
      ru: 'Питайя',
      children: [
        {
          name: 'White-flesh dragon fruit',
          children: [{ name: 'Binh Thuan White' }, { name: 'Vietnam White' }, { name: 'David Bowie' }],
        },
        {
          name: 'Red-flesh dragon fruit',
          children: [
            { name: 'Long Dinh 1' },
            { name: 'Jaina Red' },
            { name: 'American Beauty' },
            { name: 'Red Jaina' },
          ],
        },
        {
          name: 'Yellow dragon fruit',
          children: [{ name: 'Palora Yellow' }, { name: 'Israeli Yellow' }],
        },
      ],
    },
    {
      name: 'Pomelo',
      ru: 'Помело',
      children: [
        { name: 'Guanxi Honey Pomelo' },
        { name: 'Khao Nam Phueng' },
        { name: 'Khao Tong Dee' },
        { name: 'Tabtim Siam' },
        { name: 'Chandler' },
        { name: 'Nam Roi' },
        { name: 'Banpeiyu' },
        { name: 'Reinking' },
      ],
    },
    {
      name: 'Sweetie',
      ru: 'Свити',
      children: [{ name: 'Oroblanco' }, { name: 'Melogold' }, { name: 'Sweetie (Israeli selection)' }],
    },
    {
      name: 'Feijoa',
      ru: 'Фейхоа',
      children: [
        { name: 'Apollo' },
        { name: 'Unique' },
        { name: 'Mammoth' },
        { name: 'Triumph' },
        { name: 'Coolidge' },
        { name: 'Nikitskaya Aromatnaya' },
        { name: 'Superba' },
        { name: 'Bugristaya' },
      ],
    },
    {
      name: 'Persimmon',
      ru: 'Хурма',
      children: [
        {
          name: 'Astringent persimmon',
          children: [
            {
              name: 'Rojo Brillante',
              children: [
                { name: '61-67 mm' },
                { name: '67-73 mm' },
                { name: '73-80 mm' },
                { name: '80 mm and above' },
              ],
            },
            { name: 'Hachiya' },
            { name: 'Tanenashi' },
            { name: 'Tamopan' },
            { name: 'Nikitskaya Bordovaya' },
          ],
        },
        {
          name: 'Non-astringent persimmon',
          children: [
            { name: 'Fuyu' },
            { name: 'Jiro' },
            { name: 'Sharon fruit' },
            { name: 'Triumph persimmon' },
            { name: 'Izu' },
            { name: "O'Gosho" },
          ],
        },
        {
          name: 'Chocolate persimmon',
          children: [{ name: 'Korolek (Hyakume)' }, { name: 'Zenji Maru' }, { name: 'Tsurunoko' }],
        },
        {
          name: 'Drying-grade persimmon',
          children: [{ name: 'Hoshigaki-grade Hachiya' }, { name: 'Xichu' }],
        },
      ],
    },
    {
      name: 'Sweet cherry',
      ru: 'Черешня',
      children: [
        {
          name: 'Dark sweet cherry',
          children: [
            {
              name: 'Regina',
              children: [
                { name: '24-26 mm' },
                { name: '26-28 mm' },
                { name: '28-30 mm' },
                { name: '30 mm and above' },
              ],
            },
            {
              name: 'Kordia',
              children: [{ name: '24-26 mm' }, { name: '26-28 mm' }, { name: '28-30 mm' }],
            },
            {
              name: 'Bing',
              children: [{ name: '22-24 mm' }, { name: '24-26 mm' }, { name: '26-28 mm' }],
            },
            { name: 'Lapins' },
            { name: 'Sweetheart' },
            { name: 'Skeena' },
            { name: 'Santina' },
            { name: 'Burlat' },
            { name: 'Ferrovia' },
            { name: 'Summit' },
            { name: 'Van' },
            { name: 'Sunburst' },
            { name: 'Staccato' },
            { name: 'Sam' },
            { name: 'Early Lory' },
          ],
        },
        {
          name: 'Light (bicolour) sweet cherry',
          children: [
            { name: 'Rainier' },
            { name: 'Napoleon (Bigarreau)' },
            { name: 'Coral Champagne' },
            { name: 'Chelan' },
          ],
        },
        {
          name: 'Processing sweet cherry',
          children: [{ name: 'Brining-grade Napoleon' }, { name: 'Juice-grade sweet cherry' }],
        },
      ],
    },
    {
      name: 'Cherimoya',
      ru: 'Черимойя',
      children: [
        { name: 'Fino de Jete' },
        { name: 'Campas' },
        { name: 'Bronceada' },
        { name: 'Pacita' },
        { name: 'Booth' },
      ],
    },
    {
      name: 'Rose apple',
      ru: 'Чомпу',
      children: [
        { name: 'Chompoo Thabthim Chan' },
        { name: 'Chompoo Phetsaikhao' },
        { name: 'Chompoo Thongsamsi' },
        { name: 'Green wax apple' },
        { name: 'Java apple' },
      ],
    },
    {
      name: 'Apple',
      ru: 'Яблоки',
      children: [
        {
          name: 'Gala',
          children: [
            {
              name: 'Royal Gala',
              children: [
                { name: '60-65 mm' },
                { name: '65-70 mm' },
                { name: '70-75 mm' },
                { name: '75-80 mm' },
                { name: '80 mm and above' },
              ],
            },
            { name: 'Brookfield Gala' },
            { name: 'Buckeye Gala' },
            { name: 'Galaval' },
            { name: 'Schniga Gala' },
          ],
        },
        {
          name: 'Red Delicious',
          children: [
            {
              name: 'Red Chief',
              children: [
                { name: '65-70 mm' },
                { name: '70-75 mm' },
                { name: '75-80 mm' },
                { name: '80 mm and above' },
              ],
            },
            { name: 'Starkrimson' },
            { name: 'Scarlet Spur' },
            { name: 'Early Red One' },
            { name: 'Jeromine' },
          ],
        },
        {
          name: 'Golden Delicious',
          children: [
            { name: 'Golden Reinders' },
            { name: 'Golden Smoothee' },
            { name: 'Golden Delicious Clone B' },
          ],
        },
        {
          name: 'Fuji',
          children: [
            { name: 'Kiku 8 Fuji' },
            { name: 'Zhen Aztec Fuji' },
            { name: 'Nagafu 12' },
            { name: 'Raku Raku Fuji' },
          ],
        },
        {
          name: 'Granny Smith',
          children: [
            { name: '65-70 mm' },
            { name: '70-75 mm' },
            { name: '75-80 mm' },
            { name: '80 mm and above' },
          ],
        },
        {
          name: 'Cripps Pink (Pink Lady)',
          children: [{ name: 'Rosy Glow' }, { name: 'Lady in Red' }, { name: 'Pink Kiss' }],
        },
        {
          name: 'Braeburn',
          children: [{ name: 'Hillwell Braeburn' }, { name: 'Mariri Red' }, { name: 'Royal Braeburn' }],
        },
        {
          name: 'Jonagold',
          children: [{ name: 'Jonagored' }, { name: 'Red Jonaprince' }, { name: 'Jonagold Decosta' }],
        },
        {
          name: 'Elstar',
          children: [{ name: 'Elshof' }, { name: 'Red Elstar' }],
        },
        {
          name: 'Idared',
          children: [
            { name: '65-70 mm' },
            { name: '70-75 mm' },
            { name: '75-80 mm' },
            { name: '80 mm and above' },
          ],
        },
        {
          name: 'Honeycrisp',
          children: [{ name: '70-75 mm' }, { name: '75-80 mm' }, { name: '80 mm and above' }],
        },
        { name: 'Ambrosia' },
        { name: 'Jazz (Scifresh)' },
        { name: 'Envy (Scilate)' },
        { name: 'Modi' },
        { name: 'Mutsu (Crispin)' },
        { name: 'Shampion' },
        { name: 'Gloster' },
        { name: 'Ligol' },
        { name: 'Pinova' },
        { name: 'McIntosh' },
        { name: 'Sinap Orlovsky' },
        { name: 'Antonovka' },
        { name: 'Renet Simirenko' },
        { name: 'Ambri Kashmiri' },
        {
          name: 'Cider apple',
          children: [
            { name: 'Dabinett' },
            { name: 'Kingston Black' },
            { name: 'Michelin' },
            { name: 'Yarlington Mill' },
          ],
        },
        { name: 'Juice & concentrate grade apple' },
      ],
    },
  ],
};
