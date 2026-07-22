import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Mushrooms go 5 levels deep on the six commodity species (champignon, oyster, shiitake,
 * porcini, chanterelle, truffle): level 3 splits species/colour variant or traded form,
 * level 4 the processing form and pack grade, level 5 the cap-size, slice and weight
 * grades that dried and fresh lots are actually priced on. Wild-foraged long-tail species
 * keep one level-3 tier covering the forms they trade in (fresh, salted, marinated, dried, IQF).
 */
export const mushrooms: TaxCategory = {
  name: 'Mushrooms',
  emoji: '🍄',
  tint: TINT.stone,
  children: [
    {
      name: 'Porcini',
      ru: 'Белые грибы',
      children: [
        {
          name: 'King bolete (Boletus edulis)',
          children: [
            { name: 'Fresh wild king bolete' },
            { name: 'IQF frozen king bolete' },
            { name: 'Dried king bolete slices' },
          ],
        },
        {
          name: 'Pine bolete (Boletus pinophilus)',
          children: [
            { name: 'Fresh wild pine bolete' },
            { name: 'IQF frozen pine bolete' },
            { name: 'Dried pine bolete slices' },
          ],
        },
        {
          name: 'Bronze bolete (Boletus aereus)',
          children: [{ name: 'Fresh wild bronze bolete' }, { name: 'Dried bronze bolete slices' }],
        },
        {
          name: 'Summer bolete (Boletus reticulatus)',
          children: [{ name: 'Fresh wild summer bolete' }, { name: 'Dried summer bolete slices' }],
        },
        {
          name: 'Dried porcini',
          children: [
            {
              name: 'Extra grade white slices',
              children: [{ name: 'Caps only' }, { name: 'Cap-and-stem slices' }],
            },
            {
              name: 'Grade A slices',
              children: [{ name: 'Slice 2–4 mm' }, { name: 'Slice 4–8 mm' }],
            },
            { name: 'Grade B slices' },
            { name: 'Grade C dark slices' },
            { name: 'Porcini pieces & broken' },
            { name: 'Porcini powder' },
          ],
        },
        {
          name: 'IQF frozen porcini',
          children: [
            {
              name: 'IQF whole porcini',
              children: [
                { name: 'Caps 20–40 mm' },
                { name: 'Caps 40–60 mm' },
                { name: 'Caps 60 mm+' },
              ],
            },
            { name: 'IQF sliced porcini' },
            { name: 'IQF porcini caps' },
            { name: 'Block-frozen porcini' },
          ],
        },
        {
          name: 'Salted & marinated porcini',
          children: [
            { name: 'Salted porcini in brine (drums)' },
            { name: 'Marinated porcini' },
            { name: 'First-boil porcini in brine' },
          ],
        },
        {
          name: 'Porcini seasoning & extract',
          children: [{ name: 'Porcini seasoning powder' }, { name: 'Porcini extract' }],
        },
      ],
    },
    {
      name: 'Stinkhorn',
      ru: 'Весёлка',
      children: [
        { name: 'Fresh stinkhorn eggs' },
        { name: 'Frozen stinkhorn eggs' },
        { name: 'Dried stinkhorn eggs' },
        { name: 'Stinkhorn extract powder' },
        { name: 'Dried bamboo fungus (Dictyophora)' },
      ],
    },
    {
      name: 'Oyster mushroom',
      ru: 'Вешенка',
      children: [
        {
          name: 'Grey oyster (Pleurotus ostreatus)',
          children: [
            {
              name: 'Fresh whole clusters',
              children: [
                { name: 'Caps 40–60 mm' },
                { name: 'Caps 60–90 mm' },
                { name: 'Caps 90 mm+' },
              ],
            },
            { name: 'Fresh single-cut caps' },
            { name: 'IQF frozen grey oyster' },
            { name: 'Dried grey oyster slices' },
          ],
        },
        {
          name: 'Pearl white oyster (Pleurotus florida)',
          children: [
            { name: 'Fresh whole clusters' },
            { name: 'Fresh single-cut caps' },
            { name: 'IQF frozen pearl oyster' },
            { name: 'Dried pearl oyster slices' },
          ],
        },
        {
          name: 'King oyster (Pleurotus eryngii)',
          children: [
            {
              name: 'Fresh whole king oyster',
              children: [
                { name: 'Grade A 100 g+' },
                { name: 'Grade B 60–100 g' },
                { name: 'Grade C under 60 g' },
              ],
            },
            { name: 'Sliced fresh king oyster' },
            { name: 'IQF frozen king oyster' },
            { name: 'Dried king oyster slices' },
          ],
        },
        {
          name: 'Pink oyster (Pleurotus djamor)',
          children: [{ name: 'Fresh pink oyster clusters' }, { name: 'Dried pink oyster slices' }],
        },
        {
          name: 'Golden oyster (Pleurotus citrinopileatus)',
          children: [
            { name: 'Fresh golden oyster clusters' },
            { name: 'Dried golden oyster slices' },
          ],
        },
        {
          name: 'Blue oyster (Pleurotus columbinus)',
          children: [{ name: 'Fresh blue oyster clusters' }, { name: 'IQF frozen blue oyster' }],
        },
        {
          name: 'Phoenix oyster (Pleurotus pulmonarius)',
          children: [
            { name: 'Fresh phoenix oyster clusters' },
            { name: 'Dried phoenix oyster slices' },
          ],
        },
        {
          name: 'Oyster spawn & substrate',
          children: [
            { name: 'Grain spawn' },
            { name: 'Sawdust spawn' },
            { name: 'Ready-to-fruit substrate blocks' },
            { name: 'Pasteurised straw substrate' },
          ],
        },
      ],
    },
    {
      name: 'Woolly milkcap',
      ru: 'Волнушка',
      children: [
        {
          name: 'Pink woolly milkcap (Lactarius torminosus)',
          children: [
            { name: 'Fresh pink woolly milkcap' },
            { name: 'Salted pink woolly milkcap in brine' },
            { name: 'Marinated pink woolly milkcap' },
          ],
        },
        {
          name: 'White woolly milkcap (Lactarius pubescens)',
          children: [
            { name: 'Fresh white woolly milkcap' },
            { name: 'Salted white woolly milkcap in brine' },
          ],
        },
        { name: 'IQF frozen woolly milkcap' },
        { name: 'Dried woolly milkcap' },
      ],
    },
    {
      name: 'Parasol mushroom',
      ru: 'Гриб зонтик',
      children: [
        { name: 'Fresh parasol caps (Macrolepiota procera)' },
        { name: 'Fresh shaggy parasol (Chlorophyllum rhacodes)' },
        { name: 'Dried parasol slices' },
        { name: 'IQF frozen parasol' },
        { name: 'Parasol powder' },
      ],
    },
    {
      name: 'Milk mushroom',
      ru: 'Груздь',
      children: [
        {
          name: 'White milk cap (Lactarius resimus)',
          children: [
            { name: 'Fresh white milk cap' },
            { name: 'Salted white milk cap in brine' },
            { name: 'Marinated white milk cap' },
            { name: 'IQF frozen white milk cap' },
          ],
        },
        {
          name: 'Black milk cap (Lactarius necator)',
          children: [
            { name: 'Fresh black milk cap' },
            { name: 'Salted black milk cap in brine' },
            { name: 'Marinated black milk cap' },
          ],
        },
        { name: 'Yellow milk cap (Lactarius scrobiculatus)' },
        { name: 'Aspen milk cap (Lactarius controversus)' },
        { name: 'Peppery milk cap (Lactarius piperatus)' },
        { name: 'Dried milk mushroom' },
      ],
    },
    {
      name: 'Lurid bolete',
      ru: 'Дубовик',
      children: [
        { name: 'Fresh lurid bolete (Suillellus luridus)' },
        { name: 'Fresh scarletina bolete (Neoboletus luridiformis)' },
        { name: 'IQF frozen lurid bolete' },
        { name: 'Dried lurid bolete slices' },
        { name: 'Marinated lurid bolete' },
      ],
    },
    {
      name: 'Hedgehog mushroom',
      ru: 'Ежовик',
      children: [
        {
          name: 'Yellow hedgehog (Hydnum repandum)',
          children: [
            { name: 'Fresh yellow hedgehog' },
            { name: 'IQF frozen yellow hedgehog' },
            { name: 'Dried yellow hedgehog slices' },
          ],
        },
        { name: 'Terracotta hedgehog (Hydnum rufescens)' },
        {
          name: "Lion's mane (Hericium erinaceus)",
          children: [
            { name: "Fresh lion's mane clusters" },
            { name: "Dried lion's mane slices" },
            { name: "Lion's mane extract powder" },
            { name: "Lion's mane grain spawn" },
          ],
        },
      ],
    },
    {
      name: 'Chanterelle',
      ru: 'Лисичка',
      children: [
        {
          name: 'Golden chanterelle (Cantharellus cibarius)',
          children: [
            {
              name: 'Fresh wild golden chanterelle',
              children: [
                { name: 'Calibre 20–40 mm' },
                { name: 'Calibre 40–60 mm' },
                { name: 'Calibre 60 mm+' },
              ],
            },
            { name: 'IQF frozen golden chanterelle' },
            { name: 'Salted golden chanterelle in brine' },
            { name: 'Dried golden chanterelle' },
          ],
        },
        {
          name: 'Pale chanterelle (Cantharellus pallens)',
          children: [{ name: 'Fresh pale chanterelle' }, { name: 'IQF frozen pale chanterelle' }],
        },
        {
          name: 'Amethyst chanterelle (Cantharellus amethysteus)',
          children: [{ name: 'Fresh amethyst chanterelle' }],
        },
        {
          name: 'Yellowfoot chanterelle (Craterellus tubaeformis)',
          children: [
            { name: 'Fresh yellowfoot chanterelle' },
            { name: 'IQF frozen yellowfoot chanterelle' },
            { name: 'Dried yellowfoot chanterelle' },
          ],
        },
        {
          name: 'Black trumpet (Craterellus cornucopioides)',
          children: [
            { name: 'Fresh black trumpet' },
            { name: 'Dried black trumpet' },
            { name: 'Black trumpet powder' },
          ],
        },
        {
          name: 'Dried chanterelle',
          children: [
            { name: 'Dried whole chanterelle' },
            { name: 'Dried chanterelle slices' },
            { name: 'Chanterelle powder' },
          ],
        },
        {
          name: 'IQF frozen chanterelle',
          children: [
            { name: 'IQF whole chanterelle' },
            { name: 'IQF blanched chanterelle' },
            { name: 'Block-frozen chanterelle' },
          ],
        },
        {
          name: 'Salted & marinated chanterelle',
          children: [
            { name: 'Salted chanterelle in brine (drums)' },
            { name: 'Marinated chanterelle' },
          ],
        },
      ],
    },
    {
      name: 'Slippery jack',
      ru: 'Маслёнок',
      children: [
        { name: 'Fresh slippery jack (Suillus luteus)' },
        { name: 'Fresh larch bolete (Suillus grevillei)' },
        { name: 'Fresh granulated bolete (Suillus granulatus)' },
        { name: 'IQF frozen slippery jack' },
        { name: 'Dried slippery jack slices' },
        { name: 'Marinated slippery jack' },
        { name: 'Salted slippery jack in brine' },
      ],
    },
    {
      name: 'Bay bolete',
      ru: 'Моховик',
      children: [
        { name: 'Fresh bay bolete (Imleria badia)' },
        { name: 'Fresh red cracking bolete (Xerocomellus chrysenteron)' },
        { name: 'Fresh velvet bolete (Xerocomus subtomentosus)' },
        { name: 'IQF frozen bay bolete' },
        { name: 'Dried bay bolete slices' },
        { name: 'Marinated bay bolete' },
      ],
    },
    {
      name: 'Honey fungus',
      ru: 'Опёнок',
      children: [
        {
          name: 'Autumn honey fungus (Armillaria mellea)',
          children: [
            { name: 'Fresh autumn honey fungus' },
            { name: 'IQF frozen autumn honey fungus' },
            { name: 'Marinated autumn honey fungus' },
            { name: 'Dried autumn honey fungus' },
          ],
        },
        {
          name: 'Summer honey fungus (Kuehneromyces mutabilis)',
          children: [
            { name: 'Fresh summer honey fungus' },
            { name: 'IQF frozen summer honey fungus' },
          ],
        },
        {
          name: 'Cultivated enoki (Flammulina velutipes)',
          children: [
            { name: 'Fresh white enoki bunches' },
            { name: 'Fresh golden enoki bunches' },
            { name: 'Enoki grain spawn' },
          ],
        },
        { name: 'Salted honey fungus in brine' },
      ],
    },
    {
      name: 'Birch bolete',
      ru: 'Подберёзовик',
      children: [
        { name: 'Fresh common birch bolete (Leccinum scabrum)' },
        { name: 'Fresh marsh birch bolete (Leccinum holopus)' },
        { name: 'IQF frozen birch bolete' },
        { name: 'Dried birch bolete slices' },
        { name: 'Marinated birch bolete' },
      ],
    },
    {
      name: 'Aspen bolete',
      ru: 'Подосиновик',
      children: [
        { name: 'Fresh red-capped aspen bolete (Leccinum aurantiacum)' },
        { name: 'Fresh orange birch bolete (Leccinum versipelle)' },
        { name: 'IQF frozen aspen bolete' },
        { name: 'Dried aspen bolete slices' },
        { name: 'Marinated aspen bolete' },
      ],
    },
    {
      name: 'Half-cep bolete',
      ru: 'Полубелый гриб',
      children: [
        { name: 'Fresh half-cep bolete (Hemileccinum impolitum)' },
        { name: 'IQF frozen half-cep bolete' },
        { name: 'Dried half-cep bolete slices' },
        { name: 'Marinated half-cep bolete' },
      ],
    },
    {
      name: 'Reishi',
      ru: 'Рейши',
      children: [
        {
          name: 'Red reishi (Ganoderma lucidum)',
          children: [
            { name: 'Whole dried red reishi caps' },
            { name: 'Dried red reishi slices' },
            { name: 'Red reishi extract powder' },
          ],
        },
        {
          name: 'Black reishi (Ganoderma sinense)',
          children: [
            { name: 'Whole dried black reishi caps' },
            { name: 'Dried black reishi slices' },
          ],
        },
        { name: 'Antler reishi' },
        {
          name: 'Reishi spore powder',
          children: [
            { name: 'Raw reishi spore powder' },
            { name: 'Cracked-shell reishi spore powder' },
            { name: 'Reishi spore oil' },
          ],
        },
        { name: 'Reishi grain spawn' },
      ],
    },
    {
      name: 'Saffron milk cap',
      ru: 'Рыжик',
      children: [
        {
          name: 'Pine saffron milk cap (Lactarius deliciosus)',
          children: [
            { name: 'Fresh pine saffron milk cap' },
            { name: 'Salted pine saffron milk cap in brine' },
            { name: 'Marinated pine saffron milk cap' },
          ],
        },
        {
          name: 'Spruce saffron milk cap (Lactarius deterrimus)',
          children: [
            { name: 'Fresh spruce saffron milk cap' },
            { name: 'Salted spruce saffron milk cap in brine' },
          ],
        },
        { name: 'IQF frozen saffron milk cap' },
        { name: 'Dried saffron milk cap' },
      ],
    },
    {
      name: 'Morel',
      ru: 'Сморчок',
      children: [
        {
          name: 'Black morel (Morchella conica)',
          children: [
            { name: 'Fresh black morel' },
            { name: 'IQF frozen black morel' },
            { name: 'Dried black morel caps' },
          ],
        },
        {
          name: 'Yellow morel (Morchella esculenta)',
          children: [
            { name: 'Fresh yellow morel' },
            { name: 'IQF frozen yellow morel' },
            { name: 'Dried yellow morel caps' },
          ],
        },
        { name: 'Half-free morel (Morchella semilibera)' },
        {
          name: 'Dried morel grades',
          children: [
            { name: 'Whole caps 30–50 mm' },
            { name: 'Whole caps 50–80 mm' },
            { name: 'Cut morel halves' },
            { name: 'Morel pieces & broken' },
            { name: 'Morel powder' },
          ],
        },
        { name: 'Morel grain spawn' },
      ],
    },
    {
      name: 'Russula',
      ru: 'Сыроежка',
      children: [
        { name: 'Fresh green russula (Russula aeruginea)' },
        { name: 'Fresh yellow russula (Russula claroflava)' },
        { name: 'Fresh food russula (Russula vesca)' },
        { name: 'Salted russula in brine' },
        { name: 'IQF frozen russula' },
        { name: 'Dried russula' },
      ],
    },
    {
      name: 'Bracket fungus',
      ru: 'Трутовик',
      children: [
        {
          name: 'Maitake (Grifola frondosa)',
          children: [
            { name: 'Fresh maitake clusters' },
            { name: 'Dried maitake slices' },
            { name: 'Maitake extract powder' },
            { name: 'Maitake grain spawn' },
          ],
        },
        {
          name: 'Chicken of the woods (Laetiporus sulphureus)',
          children: [
            { name: 'Fresh chicken of the woods' },
            { name: 'Dried chicken of the woods' },
          ],
        },
        {
          name: 'Turkey tail (Trametes versicolor)',
          children: [{ name: 'Dried whole turkey tail' }, { name: 'Turkey tail extract powder' }],
        },
        { name: 'Birch polypore (Fomitopsis betulina)' },
        { name: 'Tinder fungus (Fomes fomentarius)' },
        { name: 'Agarikon (Fomitopsis officinalis)' },
      ],
    },
    {
      name: 'Truffle',
      ru: 'Трюфель',
      children: [
        {
          name: 'White Alba truffle (Tuber magnatum)',
          children: [
            { name: 'Extra grade whole 50 g+' },
            { name: 'Grade A whole 20–50 g' },
            { name: 'Grade B whole 10–20 g' },
            { name: 'Truffle pieces & broken' },
          ],
        },
        {
          name: 'Black winter truffle (Tuber melanosporum)',
          children: [
            {
              name: 'Fresh whole black winter truffle',
              children: [
                { name: 'Extra grade 30 g+' },
                { name: 'Grade A 15–30 g' },
                { name: 'Grade B irregular' },
              ],
            },
            { name: 'Frozen whole black winter truffle' },
            { name: 'Preserved black winter truffle in brine' },
            { name: 'Black winter truffle peelings' },
          ],
        },
        {
          name: 'Black summer truffle (Tuber aestivum)',
          children: [
            {
              name: 'Fresh whole summer truffle',
              children: [
                { name: 'Grade Extra 20 g+' },
                { name: 'Grade A 10–20 g' },
                { name: 'Grade B under 10 g' },
              ],
            },
            { name: 'Frozen summer truffle' },
            { name: 'Summer truffle carpaccio slices' },
            { name: 'Summer truffle juice' },
          ],
        },
        {
          name: 'Burgundy truffle (Tuber uncinatum)',
          children: [{ name: 'Fresh whole burgundy truffle' }, { name: 'Frozen burgundy truffle' }],
        },
        {
          name: 'Bianchetto truffle (Tuber borchii)',
          children: [
            { name: 'Fresh whole bianchetto truffle' },
            { name: 'Frozen bianchetto truffle' },
          ],
        },
        {
          name: 'Chinese black truffle (Tuber indicum)',
          children: [
            { name: 'Fresh whole Chinese black truffle' },
            { name: 'Frozen Chinese black truffle' },
            { name: 'Dried Chinese black truffle slices' },
          ],
        },
        {
          name: 'Truffle products',
          children: [
            { name: 'Truffle purée' },
            { name: 'Minced truffle (tartufata)' },
            { name: 'Dried truffle slices' },
            { name: 'Truffle powder' },
          ],
        },
        {
          name: 'Truffle plantation stock',
          children: [
            { name: 'Mycorrhized oak saplings' },
            { name: 'Mycorrhized hazel saplings' },
            { name: 'Truffle spore inoculum' },
          ],
        },
      ],
    },
    {
      name: "Caesar's mushroom",
      ru: 'Цезарский гриб',
      children: [
        { name: "Fresh Caesar's mushroom eggs" },
        { name: "Fresh open-cap Caesar's mushroom" },
        { name: "Dried Caesar's mushroom slices" },
        { name: "IQF frozen Caesar's mushroom" },
      ],
    },
    {
      name: 'Chaga',
      ru: 'Чага',
      children: [
        { name: 'Dried chaga chunks' },
        { name: 'Cut & sifted chaga tea' },
        { name: 'Ground chaga powder' },
        { name: 'Chaga dual-extract powder' },
        { name: 'Chaga sclerotium (whole conk)' },
      ],
    },
    {
      name: 'Champignon',
      ru: 'Шампиньоны',
      children: [
        {
          name: 'Fresh white button mushroom',
          children: [
            { name: 'Extra small buttons 20–30 mm' },
            { name: 'Small buttons 30–40 mm' },
            { name: 'Medium cups 40–55 mm' },
            { name: 'Large flats 55–70 mm' },
            { name: 'Jumbo flats 70 mm+' },
          ],
        },
        {
          name: 'Fresh brown chestnut mushroom',
          children: [
            { name: 'Cremini buttons 25–40 mm' },
            { name: 'Cremini cups 40–55 mm' },
            { name: 'Baby portobello 55–80 mm' },
            { name: 'Portobello 80–120 mm' },
          ],
        },
        {
          name: 'Fresh cut champignon',
          children: [
            { name: 'Whole-cap slices 3–5 mm' },
            { name: 'Quartered champignon' },
            { name: 'Champignon stems & pieces' },
          ],
        },
        {
          name: 'Canned & marinated champignon',
          children: [
            {
              name: 'Whole canned champignon',
              children: [
                { name: 'Count 20–30 per 400 g' },
                { name: 'Count 30–40 per 400 g' },
                { name: 'Count 40–60 per 400 g' },
              ],
            },
            { name: 'Sliced canned champignon' },
            { name: 'Pieces & stems canned' },
            { name: 'Marinated champignon in brine' },
            { name: 'First-boil champignon in brine (drums)' },
          ],
        },
        {
          name: 'IQF frozen champignon',
          children: [
            { name: 'IQF whole champignon' },
            { name: 'IQF sliced champignon' },
            { name: 'IQF quartered champignon' },
            { name: 'Blanched block-frozen champignon' },
          ],
        },
        {
          name: 'Dried champignon',
          children: [
            { name: 'Dried champignon slices' },
            { name: 'Dried champignon granules' },
            { name: 'Champignon powder' },
          ],
        },
        {
          name: 'Champignon spawn & compost',
          children: [
            { name: 'White hybrid grain spawn' },
            { name: 'Brown cremini grain spawn' },
            { name: 'Phase III compost blocks' },
            { name: 'Peat casing soil' },
          ],
        },
      ],
    },
    {
      name: 'Verpa',
      ru: 'Шапочка',
      children: [
        { name: 'Fresh verpa (Verpa bohemica)' },
        { name: 'Dried verpa' },
        { name: 'IQF frozen verpa' },
      ],
    },
    {
      name: 'Shiitake',
      ru: 'Шиитаке',
      children: [
        {
          name: 'Fresh shiitake',
          children: [
            { name: 'Baby shiitake 30–40 mm' },
            { name: 'Standard-cap shiitake 40–60 mm' },
            { name: 'Large-cap shiitake 60 mm+' },
          ],
        },
        {
          name: 'Dried shiitake',
          children: [
            {
              name: 'Donko (thick cracked cap)',
              children: [
                { name: 'Tea flower donko (Chahua)' },
                { name: 'White flower donko (Bai Hua Gu)' },
                { name: 'Thick donko 30–40 mm' },
                { name: 'Thick donko 40–60 mm' },
              ],
            },
            {
              name: 'Koshin (thin flat cap)',
              children: [
                { name: 'Koshin 20–30 mm' },
                { name: 'Koshin 30–40 mm' },
                { name: 'Koshin 40–60 mm' },
              ],
            },
            { name: 'Sliced dried shiitake' },
            { name: 'Dried shiitake stems' },
            { name: 'Shiitake powder' },
          ],
        },
        {
          name: 'IQF frozen shiitake',
          children: [
            { name: 'IQF whole shiitake' },
            { name: 'IQF sliced shiitake' },
            { name: 'IQF shiitake stems' },
          ],
        },
        {
          name: 'Shiitake spawn & logs',
          children: [
            { name: 'Sawdust spawn' },
            { name: 'Plug spawn dowels' },
            { name: 'Inoculated sawdust blocks' },
            { name: 'Inoculated hardwood logs' },
          ],
        },
        {
          name: 'Shiitake extract',
          children: [{ name: 'Lentinan extract powder' }, { name: 'Shiitake mycelium powder' }],
        },
      ],
    },
  ],
};
