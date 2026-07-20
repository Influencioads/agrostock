import { AdminPermission, PrismaClient, type CommunityGroupKind, type KycDocType, type OrderStatus, type Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { seedAllLabelTranslations } from './seed-translations';

/** A tiny but valid PDF used as a placeholder KYC document in demo data. */
const SAMPLE_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 320 140]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 58>>stream
BT /F1 14 Tf 24 70 Td (AgroTraders KYC sample) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`,
  'latin1',
);

/** Writes a placeholder file into the private KYC store and returns its key. */
function writeSampleKycFile(): string {
  const dir = join(process.cwd(), process.env.PRIVATE_UPLOAD_DIR || 'private-uploads', 'kyc');
  mkdirSync(dir, { recursive: true });
  const filename = `${randomUUID()}.pdf`;
  writeFileSync(join(dir, filename), SAMPLE_PDF);
  return `kyc/${filename}`;
}

const prisma = new PrismaClient();

/**
 * Recomputes denormalized rating aggregates (`ratingAvg`/`ratingCount`, plus the
 * legacy `Product.rating` string) for every user and product from their visible
 * reviews. Mirrors ReviewsService.recomputeAggregates but in bulk for seeding.
 */
async function recomputeAllRatingAggregates() {
  const byUser = await prisma.review.groupBy({
    by: ['revieweeId'], where: { status: 'visible' }, _avg: { stars: true }, _count: { _all: true },
  });
  await Promise.all(
    byUser.map((g) =>
      prisma.user.update({
        where: { id: g.revieweeId },
        data: { ratingAvg: g._avg.stars ?? null, ratingCount: g._count._all },
      }),
    ),
  );
  const byProduct = await prisma.review.groupBy({
    by: ['productId'], where: { status: 'visible', revieweeRole: 'product', productId: { not: null } }, _avg: { stars: true }, _count: { _all: true },
  });
  await Promise.all(
    byProduct.map((g) =>
      prisma.product.update({
        where: { id: g.productId! },
        data: {
          ratingAvg: g._avg.stars ?? null,
          ratingCount: g._count._all,
          rating: g._avg.stars ? g._avg.stars.toFixed(1) : undefined,
        },
      }),
    ),
  );
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Full product taxonomy mirrored from agrobazar.ru — 24 top-level categories,
 * each with its complete subcategory set (~420 total). English is the canonical
 * `name` on the base row; the Russian label rides alongside as `[en, ru]` sub
 * tuples (seeded into SubcategoryTranslation inline below). Category-level Russian
 * names live in `packages/i18n/locales/ru/db-labels.json`, applied by
 * `seedAllLabelTranslations` after this seed. Admins can edit more from the panel.
 */


const A = '#DFF3E4', B = '#EDF7EF', C = '#FBF4E4', D = '#FBE9E6', E = '#E6F0F4', F = '#F0EFEA';
// subs are [english, russian] — english is the base-row name, russian a translation.
const categories: { name: string; emoji: string; tint: string; subs: [string, string][] }[] = [
  { name: 'Vegetables', emoji: '🥦', tint: A, subs: [['Bur gherkin', 'Ангурия'], ['Artichoke', 'Артишок'], ['Eggplant', 'Баклажаны'], ['Sweet potato', 'Батат'], ['Broccoli', 'Брокколи'], ['Ginger', 'Имбирь'], ['Zucchini', 'Кабачки'], ['Cabbage', 'Капуста'], ['Brussels sprouts', 'Капуста брюссельская'], ['Napa cabbage', 'Капуста пекинская'], ['Savoy cabbage', 'Капуста савойская'], ['Cauliflower', 'Капуста цветная'], ['Potato', 'Картофель'], ['Kohlrabi', 'Кольраби'], ['Bottle gourd', 'Лагенария'], ['Carrot', 'Морковь'], ['Cucumber', 'Огурцы'], ['Olives', 'Оливы'], ['Pattypan squash', 'Патиссоны'], ['Bell pepper', 'Перец болгарский'], ['Chili pepper', 'Перец горький'], ['Tsitsak pepper', 'Перец цицак'], ['Tomato', 'Помидоры'], ['Radish', 'Редис'], ['Black radish', 'Редька'], ['Turnip', 'Репа'], ['Beetroot', 'Свекла'], ['Fodder beet', 'Свекла кормовая'], ['Sugar beet', 'Свекла сахарная'], ['Asparagus', 'Спаржа'], ['Jerusalem artichoke', 'Топинамбур'], ['Pumpkin', 'Тыква'], ['Horseradish', 'Хрен'], ['Chayote', 'Чайот'], ['Garlic', 'Чеснок'], ['Tiger nut', 'Чуфа'], ['Yacon', 'Якон'], ['Yam', 'Ямс']] },
  { name: 'Fruits', emoji: '🍎', tint: C, subs: [['Apricot', 'Абрикосы'], ['Avocado', 'Авокадо'], ['Pawpaw', 'Азимина'], ['Quince', 'Айва'], ['Ackee', 'Аки'], ['Cherry plum', 'Алыча'], ['Pineapple', 'Ананасы'], ['Orange', 'Апельсины'], ['Blood orange', 'Апельсины красные'], ['Watermelon', 'Арбузы'], ['Banana', 'Бананы'], ['Grapes', 'Виноград'], ['Sour cherry', 'Вишня'], ['Pomegranate', 'Гранат'], ['Grapefruit', 'Грейпфрут'], ['Pear', 'Груши'], ['Guava', 'Гуава'], ['Jackfruit', 'Джекфрут'], ['Durian', 'Дуриан'], ['Melon', 'Дыни'], ['Fig', 'Инжир'], ['Horned melon', 'Кивано'], ['Kiwi', 'Киви'], ['Clementine', 'Клементин'], ['Coconut', 'Кокосы'], ['Kumquat', 'Кумкват'], ['Lime', 'Лайм'], ['Lemon', 'Лимоны'], ['Lychee', 'Личи'], ['Longan', 'Лонган'], ['Mango', 'Манго'], ['Mangosteen', 'Мангостин'], ['Mandarin', 'Мандарины'], ['Passion fruit', 'Маракуйя'], ['Nectarine', 'Нектарин'], ['Papaya', 'Папайя'], ['Peach', 'Персики'], ['Dragon fruit', 'Питайя'], ['Pomelo', 'Помело'], ['Sweetie', 'Свити'], ['Feijoa', 'Фейхоа'], ['Persimmon', 'Хурма'], ['Sweet cherry', 'Черешня'], ['Cherimoya', 'Черимойя'], ['Rose apple', 'Чомпу'], ['Apple', 'Яблоки']] },
  { name: 'Berries', emoji: '🫐', tint: E, subs: [['Barberry', 'Барбарис'], ['Hawthorn', 'Боярышник'], ['Lingonberry', 'Брусника'], ['Elderberry', 'Бузина'], ['Blueberry', 'Голубика'], ['Blackberry', 'Ежевика'], ['Honeysuckle berry', 'Жимолость'], ['Wild strawberry', 'Земляника'], ['Serviceberry', 'Ирга'], ['Viburnum', 'Калина'], ['Cornelian cherry', 'Кизил'], ['Strawberry', 'Клубника'], ['Cranberry', 'Клюква'], ['Arctic raspberry', 'Княженика'], ['Schisandra', 'Лимонник'], ['Raspberry', 'Малина'], ['Juniper berry', 'Можжевеловая ягода'], ['Cloudberry', 'Морошка'], ['Sea buckthorn', 'Облепиха'], ['Rowan berry', 'Рябина'], ['Currant', 'Смородина'], ['Blackthorn', 'Терновник'], ['Bilberry', 'Черника'], ['Bird cherry', 'Черёмуха'], ['Mulberry', 'Шелковица'], ['Rosehip', 'Шиповник']] },
  { name: 'Herbs & greens', emoji: '🥬', tint: A, subs: [['Basil', 'Базилик'], ['Oregano', 'Душица'], ['Fireweed tea', 'Иван-чай'], ['Cilantro', 'Кинза'], ['Coriander', 'Кориандр'], ['Garden cress', 'Кресс-салат'], ['Butterhead lettuce', 'Латук'], ['Beet greens', 'Лист свёклы'], ['Green onion', 'Лук зелёный'], ['Leek', 'Лук-порей'], ['Lovage', 'Любисток'], ['Marjoram', 'Майоран'], ['Chard', 'Мангольд'], ['Lemon balm', 'Мелисса'], ['Mint', 'Мята'], ['Fern', 'Папоротник'], ['Parsley', 'Петрушка'], ['Rhubarb', 'Ревень'], ['Rosemary', 'Розмарин'], ['Arugula', 'Руккола'], ['Iceberg lettuce', 'Салат Айсберг'], ['Baby-mix salad', 'Салат Бэби-микс'], ['Oakleaf lettuce', 'Салат Дуболистный'], ['Lollo Rosso lettuce', 'Салат Лолло Россо'], ['Radicchio', 'Салат Радиччио'], ['Romaine lettuce', 'Салат Романо'], ['Tatsoi', 'Салат Тат-сой'], ['Frisée lettuce', 'Салат Фриссе'], ['Celery', 'Сельдерей'], ['Thyme', 'Тимьян'], ['Dill', 'Укроп'], ['Salad chicory', 'Цикорий салатный'], ['Ramson', 'Черемша'], ['Sage', 'Шалфей'], ['Chives', 'Шнитт-лук'], ['Spinach', 'Шпинат'], ['Sorrel', 'Щавель'], ['Tarragon', 'Эстрагон']] },
  { name: 'Mushrooms', emoji: '🍄', tint: F, subs: [['Porcini', 'Белые грибы'], ['Stinkhorn', 'Весёлка'], ['Oyster mushroom', 'Вешенка'], ['Woolly milkcap', 'Волнушка'], ['Parasol mushroom', 'Гриб зонтик'], ['Milk mushroom', 'Груздь'], ['Lurid bolete', 'Дубовик'], ['Hedgehog mushroom', 'Ежовик'], ['Chanterelle', 'Лисичка'], ['Slippery jack', 'Маслёнок'], ['Bay bolete', 'Моховик'], ['Honey fungus', 'Опёнок'], ['Birch bolete', 'Подберёзовик'], ['Aspen bolete', 'Подосиновик'], ['Half-cep bolete', 'Полубелый гриб'], ['Reishi', 'Рейши'], ['Saffron milk cap', 'Рыжик'], ['Morel', 'Сморчок'], ['Russula', 'Сыроежка'], ['Bracket fungus', 'Трутовик'], ['Truffle', 'Трюфель'], ["Caesar's mushroom", 'Цезарский гриб'], ['Chaga', 'Чага'], ['Champignon', 'Шампиньоны'], ['Verpa', 'Шапочка'], ['Shiitake', 'Шиитаке']] },
  { name: 'Grain', emoji: '🌾', tint: C, subs: [['Broad beans', 'Бобы'], ['Peas', 'Горох'], ['Buckwheat', 'Гречиха'], ['Oilcake', 'Жмых'], ['Castor bean', 'Клещевина'], ['Corn', 'Кукуруза'], ['Sesame', 'Кунжут'], ['Lupine', 'Люпин'], ['Flax', 'Лён'], ['Flour', 'Мука'], ['Chickpea', 'Нут'], ['Oats', 'Овёс'], ['Sunflower', 'Подсолнечник'], ['Millet', 'Просо'], ['Wheat', 'Пшеница'], ['Rapeseed', 'Рапс'], ['Rice', 'Рис'], ['Rye', 'Рожь'], ['Sorghum', 'Сорго'], ['Soybean', 'Соя'], ['Triticale', 'Тритикале'], ['Beans', 'Фасоль'], ['Fodder', 'Фураж'], ['Lentil', 'Чечевица'], ['Meal', 'Шрот'], ['Barley', 'Ячмень']] },
  { name: 'Nuts', emoji: '🥜', tint: F, subs: [['Peanut', 'Арахис'], ['Brazil nut', 'Бразильский орех'], ['Water caltrop', 'Водяной орех'], ['Walnut', 'Грецкий орех'], ['Acorn', 'Жёлудь'], ['Chestnut', 'Каштан'], ['Pine nut', 'Кедровый орех'], ['Cashew', 'Кешью'], ['Macadamia', 'Макадамия'], ['Manchurian walnut', 'Маньчжурский орех'], ['Almond', 'Миндаль'], ['Nutmeg', 'Мускатный орех'], ['Paradise nut', 'Райский орех'], ['Coco de mer', 'Сейшельский орех'], ['Turkish hazelnut', 'Турецкий орех'], ['Pistachio', 'Фисташки'], ['Hazelnut', 'Фундук']] },
  { name: 'Packaging', emoji: '📦', tint: F, subs: [['Banana boxes', 'Банановые коробки'], ['Barrels', 'Бочки'], ['Paper', 'Бумага'], ['Cardboard', 'Картон'], ['Containers', 'Контейнеры'], ['Boxes', 'Коробки'], ['Trays', 'Лотки'], ['Bag-closing thread', 'Нитки мешкозашивочные'], ['Bags', 'Пакеты'], ['Film', 'Плёнка'], ['Pallets', 'Поддоны'], ['Net bags', 'Сетка'], ['Adhesive tape', 'Скотч'], ['Glass containers', 'Стеклотара'], ['Textile packaging', 'Текстильная тара'], ['Crates', 'Ящики']] },
  { name: 'Animal feed', emoji: '🧺', tint: A, subs: [['Amino acids', 'Аминокислоты'], ['Distillers grains', 'Барда'], ['Vitamins', 'Витамины'], ['Liquid feed', 'Жидкие корма'], ['Oilcake', 'Жмых'], ['Beet pulp', 'Жом'], ['Milk replacers', 'Заменители молока'], ['Fodder grain', 'Зерно фуражное'], ['Compound feed', 'Комбикорма'], ['Feed meal', 'Мука кормовая'], ['Substandard products', 'Некондиционные продукты'], ['Bran', 'Отруби'], ['Premixes', 'Премиксы'], ['Probiotics', 'Пробиотики'], ['Haylage', 'Сенаж'], ['Hay', 'Сено'], ['Silage', 'Силос'], ['Feed salt', 'Соль кормовая'], ['Meal', 'Шрот'], ['Extruded feed', 'Экструдированные корма']] },
  { name: 'Meat', emoji: '🥩', tint: D, subs: [['Lamb & mutton', 'Баранина'], ['Beef', 'Говядина'], ['Sausages', 'Колбасные изделия'], ['Horse meat', 'Конина'], ['Poultry meat', 'Мясо птицы'], ['Venison', 'Оленина'], ['Semi-finished meat', 'Полуфабрикаты'], ['Lard', 'Сало'], ['Pork', 'Свинина']] },
  { name: 'Fish', emoji: '🐟', tint: E, subs: [['Red mullet', 'Барабулька'], ['Beluga', 'Белуга'], ['Pink salmon', 'Горбуша'], ['Fish roe', 'Икра рыбы'], ['Carp', 'Карп'], ['Chum salmon', 'Кета'], ['Mullet', 'Кефаль'], ['Coho salmon', 'Кижуч'], ['Molluscs & crustaceans', 'Моллюски и ракообразные'], ['Seafood', 'Морепродукты'], ['Sturgeon', 'Осётр'], ['Peled', 'Пелядь'], ['Fish by-products', 'Рыбные субпродукты'], ['Mackerel', 'Скумбрия'], ['Fish mince', 'Фарш рыбный'], ['Trout', 'Форель']] },
  { name: 'Dairy products', emoji: '🥛', tint: B, subs: [['Yogurt', 'Йогурт'], ['Milk', 'Молоко'], ['Powdered milk', 'Молоко сухое'], ['Milk fat', 'Молочный жир'], ['Ice cream', 'Мороженое'], ['Condensed milk', 'Сгущённое молоко'], ['Cream', 'Сливки'], ['Sour cream', 'Сметана'], ['Dry whey', 'Сыворотка сухая'], ['Cheese', 'Сыры']] },
  { name: 'Live animals & poultry', emoji: '🐄', tint: A, subs: [['Goats', 'Козы'], ['Cattle', 'Крупный рогатый скот'], ['Rabbits', 'Кролики'], ['Horses', 'Лошади'], ['Fish fry', 'Мальки'], ['Sheep', 'Овцы'], ['Poultry (live)', 'Птицы'], ['Pigs', 'Свиньи']] },
  { name: 'Eggs', emoji: '🥚', tint: C, subs: [['Goose eggs', 'Гусиное яйцо'], ['Hatching eggs', 'Инкубационное яйцо'], ['Turkey eggs', 'Индюшиное яйцо'], ['Chicken eggs', 'Куриное яйцо'], ['Quail eggs', 'Перепелиное яйцо'], ['Ostrich eggs', 'Страусиное яйцо'], ['Duck eggs', 'Утиное яйцо'], ['Guinea fowl eggs', 'Цесарское яйцо']] },
  { name: 'Seeds & planting material', emoji: '🌱', tint: B, subs: [['Seed potato', 'Картофель семенной'], ['Onion picks', 'Лук-выборок'], ['Onion sets', 'Лук-севок'], ['Jerusalem artichoke tubers', 'Посадочный материал топинамбура'], ['Perennial planting stock', 'Посадочный материал травянистых многолетников'], ['Wild strawberry seedlings', 'Рассада земляники'], ['Strawberry seedlings', 'Рассада клубники'], ['Flower seedlings', 'Рассада цветочных культур'], ['Apricot saplings', 'Саженцы абрикоса'], ['Blueberry saplings', 'Саженцы голубики'], ['Ornamental saplings', 'Саженцы декоративных культур'], ['Raspberry saplings', 'Саженцы малины'], ['Sea buckthorn saplings', 'Саженцы облепихи'], ['Peach saplings', 'Саженцы персика'], ['Plum saplings', 'Саженцы сливы'], ['Apple saplings', 'Саженцы яблони'], ['Vetch seeds', 'Семена вики'], ['Pea seeds', 'Семена гороха'], ['Mustard seeds', 'Семена горчицы'], ['Coriander seeds', 'Семена кориандра'], ['Corn seeds', 'Семена кукурузы'], ['Onion seeds', 'Семена лука'], ['Flax seeds', 'Семена льна'], ['Mung bean seeds', 'Семена маша'], ['Oat seeds', 'Семена овса'], ['Parsley seeds', 'Семена петрушки'], ['Sunflower seeds', 'Семена подсолнечника'], ['Wheat seeds', 'Семена пшеницы'], ['Rapeseed seeds', 'Семена рапса'], ['Milk thistle seeds', 'Семена расторопши'], ['Radish seeds', 'Семена редиса'], ['Rye seeds', 'Семена ржи'], ['Camelina seeds', 'Семена рыжика посевного'], ['Fodder beet seeds', 'Семена свеклы кормовой'], ['Soybean seeds', 'Семена сои'], ['Lawn grass seeds', 'Семена травосмеси газонной'], ['Triticale seeds', 'Семена тритикале'], ['Dill seeds', 'Семена укропа'], ['Bean seeds', 'Семена фасоли'], ['Lentil seeds', 'Семена чечевицы'], ['Sorrel seeds', 'Семена щавеля'], ['Barley seeds', 'Семена ячменя'], ['Seed garlic', 'Чеснок семенной']] },
  { name: 'Agrochemicals', emoji: '🧪', tint: E, subs: [['Biological agents', 'Биопрепараты'], ['Mineral fertilizers', 'Минеральные удобрения'], ['Cleaning & disinfectants', 'Моющие и дезинфицирующие средства'], ['Organic fertilizers', 'Органические удобрения'], ['Growth regulators', 'Регуляторы роста'], ['Plant protection products', 'Средства защиты растений']] },
  { name: 'Processed products', emoji: '🏭', tint: F, subs: [['Frozen mushrooms', 'Замороженные грибы'], ['Frozen fruits & vegetables', 'Замороженные фрукты и овощи'], ['Protein isolates', 'Изоляты'], ['Ketchup', 'Кетчуп'], ['Confectionery', 'Кондитерские изделия'], ['Canned goods', 'Консервированные продукты'], ['Concentrates', 'Концентраты'], ['Starch & syrup products', 'Крахмало-паточная продукция'], ['Groats', 'Крупа'], ['Mayonnaise', 'Майонез'], ['Pasta', 'Макаронные изделия'], ['Oils & fats', 'Масложировая продукция'], ['Flour', 'Мука'], ['Beverages', 'Напитки'], ['Pastes & purées', 'Пасты, пюре'], ['Instant foods', 'Продукты быстрого приготовления'], ['Sugar', 'Сахар'], ['Dried fruits & berries', 'Сушёные фрукты и ягоды'], ['Texturates', 'Текстураты'], ['Tea, coffee & cocoa', 'Чай, кофе, какао-порошок и др.'], ['Egg products', 'Яичные продукты']] },
  { name: 'Technical raw materials', emoji: '🧵', tint: E, subs: [['Fur', 'Мех'], ['Natural casings', 'Натуральные оболочки'], ['Feathers & down', 'Перо, пух'], ['Horns', 'Рога'], ['Wool', 'Шерсть'], ['Hides', 'Шкуры']] },
  { name: 'Beekeeping products', emoji: '🍯', tint: C, subs: [['Honey', 'Мёд'], ['Beeswax', 'Воск'], ['Bee bread', 'Перга'], ['Propolis', 'Прополис'], ['Pollen', 'Пыльца'], ['Foundation', 'Вощина'], ['Dead bees', 'Пчелиный подмор']] },
  { name: 'Ornamental plants', emoji: '🌸', tint: D, subs: [['Succulents', 'Суккуленты'], ['Conifers', 'Хвойные деревья'], ['Fresh-cut flowers', 'Цветы свежесрезанные']] },
  { name: 'Spare parts for machinery', emoji: '🔧', tint: F, subs: [['Loader & excavator parts', 'Запчасти для погрузчиков и экскаваторов'], ['Other machinery parts', 'Запчасти для прочих с/х машин'], ['Forage machinery parts', 'Запчасти для кормозаготовительной техники'], ['Combine parts', 'Запчасти для комбайнов'], ['Harvester parts', 'Запчасти для уборочной техники'], ['Tractor parts', 'Запчасти для тракторов'], ['Seeder parts', 'Запчасти для посевной техники']] },
  { name: 'Agricultural machinery', emoji: '🚜', tint: B, subs: [['Agricultural trucks', 'Грузовой с/х транспорт'], ['Forage machinery', 'Кормозаготовительная техника'], ['Mini machinery', 'Мини-техника'], ['Seeding machinery', 'Посевная техника'], ['Trailers & semi-trailers', 'Прицепы и полуприцепы'], ['Other agricultural machinery', 'Прочая сельскохозяйственная техника'], ['Fertilizer spreaders', 'Техника для внесения удобрения'], ['Livestock machinery', 'Техника для животноводства'], ['Irrigation machinery', 'Техника для полива и орошения'], ['Harvesting machinery', 'Уборочная техника']] },
  { name: 'Equipment', emoji: '⚙️', tint: E, subs: [['Tank equipment', 'Ёмкостное оборудование'], ['Grain-processing equipment', 'Зерноперерабатывающее оборудование'], ['Meat-processing equipment', 'Мясоперерабатывающее оборудование'], ['Dairy equipment', 'Оборудование для молочной промышленности'], ['Agri-waste processing equipment', 'Оборудование для переработки с/х отходов'], ['Feed production equipment', 'Оборудование для производства кормов'], ['Food production equipment', 'Оборудование для производства продуктов питания'], ['Poultry equipment', 'Оборудование для птицеводства'], ['Warehouse equipment', 'Оборудование для складов и хранилищ']] },
  { name: 'Agricultural land & facilities', emoji: '🏞️', tint: A, subs: [['Agricultural land plots', 'Земельные участки с/х назначения'], ['Processing facilities', 'Перерабатывающие предприятия'], ['Greenhouses', 'Теплицы'], ['Farmsteads', 'Хозяйства'], ['Production facilities', 'Производственные предприятия'], ['Warehouses & elevators', 'Склады, хранилища, элеваторы'], ['Farms', 'Фермы'], ['Fish farms & ponds', 'Рыбоводческие хозяйства, водоемы']] },
];

// Physical trade markets / mandis sellers attach to (buyers filter by these).
const markets: { name: string; city: string; country: string; flag: string; region?: string }[] = [
  { name: 'Azadpur Mandi', city: 'Delhi', country: '🇮🇳 India', flag: '🇮🇳', region: 'South Asia' },
  { name: 'Vashi APMC', city: 'Mumbai', country: '🇮🇳 India', flag: '🇮🇳', region: 'South Asia' },
  { name: 'Al Aweer Central Market', city: 'Dubai', country: '🇦🇪 UAE', flag: '🇦🇪', region: 'Middle East' },
  { name: 'Mersin Wholesale Market', city: 'Mersin', country: '🇹🇷 Türkiye', flag: '🇹🇷', region: 'Levant' },
  { name: 'Odesa Grain Exchange', city: 'Odesa', country: '🇺🇦 Ukraine', flag: '🇺🇦', region: 'Black Sea' },
  { name: 'Novorossiysk Grain Terminal', city: 'Novorossiysk', country: '🇷🇺 Russia', flag: '🇷🇺', region: 'Black Sea' },
  { name: 'Almaty Dry Port Market', city: 'Almaty', country: '🇰🇿 Kazakhstan', flag: '🇰🇿', region: 'Central Asia' },
  { name: 'Rungis International', city: 'Paris', country: '🇫🇷 France', flag: '🇫🇷', region: 'Europe' },
  { name: 'Rotterdam Agri Hub', city: 'Rotterdam', country: '🇳🇱 Netherlands', flag: '🇳🇱', region: 'Europe' },
  { name: 'Santos Trade Terminal', city: 'Santos', country: '🇧🇷 Brazil', flag: '🇧🇷', region: 'South America' },
  { name: 'Karachi Sabzi Mandi', city: 'Karachi', country: '🇵🇰 Pakistan', flag: '🇵🇰', region: 'South Asia' },
  { name: 'Ho Chi Minh Agri Market', city: 'Ho Chi Minh City', country: '🇻🇳 Vietnam', flag: '🇻🇳', region: 'Southeast Asia' },
];

const offices = [
  { flag: '🇦🇪', name: 'AgroTraders HQ', type: 'Head Office', city: 'Dubai, UAE', mgr: 'Omar Al-Farsi', tz: 'GMT+4', langs: 'EN · AR · RU', staff: 48 },
  { flag: '🇷🇺', name: 'AgroTraders CIS', type: 'Regional Office', city: 'Moscow, Russia', mgr: 'Irina Volkova', tz: 'GMT+3', langs: 'RU · EN', staff: 22 },
  { flag: '🇰🇿', name: 'Central Asia', type: 'Country Office', city: 'Almaty, Kazakhstan', mgr: 'Aigerim N.', tz: 'GMT+6', langs: 'KK · RU · EN', staff: 14 },
  { flag: '🇮🇳', name: 'South Asia', type: 'Country Office', city: 'Mumbai, India', mgr: 'Rahul Mehta', tz: 'GMT+5:30', langs: 'EN · HI', staff: 31 },
  { flag: '🇹🇷', name: 'Türkiye & Levant', type: 'Sales Office', city: 'Istanbul, Türkiye', mgr: 'Mehmet Demir', tz: 'GMT+3', langs: 'TR · EN · RU', staff: 9 },
  { flag: '🇺🇦', name: 'Black Sea Hub', type: 'Warehouse', city: 'Odesa, Ukraine', mgr: 'Olena Koval', tz: 'GMT+2', langs: 'UK · RU · EN', staff: 18 },
];

// Real product photos (Unsplash — verified reachable, 600px optimized).
const uns = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

/**
 * Resolve a product's cover image to a locally-hosted copy. Photos live under
 * `prisma/seed-images/<slug>.jpg` (committed) and are copied into the public
 * `uploads/products` dir at seed time, so the app serves them over its own HTTP
 * origin. That matters on mobile: external HTTPS hotlinks (Unsplash) can fail
 * TLS validation on some devices/emulators and fall back to the emoji, whereas
 * the API's own `/uploads` path loads reliably. Falls back to the remote URL
 * when the local asset is missing.
 */
const productImage = (name: string, fallbackUrl: string): string => {
  const s = slug(name);
  const src = join(process.cwd(), 'prisma', 'seed-images', `${s}.jpg`);
  if (!existsSync(src)) return fallbackUrl;
  const destDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'products');
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, join(destDir, `seed-${s}.jpg`));
  return `/uploads/products/seed-${s}.jpg`;
};

const products = [
  { name: 'Premium Basmati Rice 1121', emoji: '🌾', img: uns('1586201375761-83865001e31c'), grade: 'Grade A', flag: '🇮🇳', seller: 'Punjab Agro Exports', qty: '500 MT', moq: '25 MT', price: '$840', rating: '4.9', verified: true, safe: true, offer: true, auction: false, delivery: 'Ready', category: 'Grain', sub: 'Rice', market: 'Azadpur Mandi' },
  { name: 'Golden Durum Wheat', emoji: '🌾', img: uns('1574323347407-f5e1ad6d020b'), grade: 'Milling', flag: '🇷🇺', seller: 'Kuban Grain Co.', qty: '2,400 MT', moq: '100 MT', price: '$268', rating: '4.8', verified: true, safe: true, offer: false, auction: false, delivery: '7 days', category: 'Grain', sub: 'Wheat', market: 'Novorossiysk Grain Terminal' },
  { name: 'Crude Sunflower Oil', emoji: '🛢️', img: uns('1626197031507-c17099753214'), grade: 'Crude', flag: '🇺🇦', seller: 'Black Sea Oils', qty: '180 MT', moq: '22 MT', price: '$920', rating: '4.7', verified: true, safe: true, offer: false, auction: true, delivery: 'Ready', category: 'Processed products', sub: 'Oils & fats', market: 'Odesa Grain Exchange' },
  { name: 'Kabuli Chickpeas 9mm', emoji: '🫘', img: uns('1515543237350-b3eea1ec8082'), grade: 'Premium', flag: '🇦🇺', seller: 'Outback Pulses', qty: '600 MT', moq: '25 MT', price: '$1,180', rating: '5.0', verified: true, safe: true, offer: false, auction: false, delivery: '14 days', category: 'Grain', sub: 'Chickpea', market: 'Rotterdam Agri Hub' },
  { name: 'Robusta Green Coffee', emoji: '☕', img: uns('1447933601403-0c6688de566e'), grade: 'Screen 18', flag: '🇻🇳', seller: 'Highland Estates', qty: '320 MT', moq: '18 MT', price: '$2,140', rating: '4.9', verified: true, safe: true, offer: true, auction: false, delivery: 'Ready', category: 'Processed products', sub: 'Tea, coffee & cocoa', market: 'Ho Chi Minh Agri Market' },
  { name: 'Yellow Maize Feed Grade', emoji: '🌽', img: uns('1551754655-cd27e38d2076'), grade: 'Feed', flag: '🇦🇷', seller: 'Pampas Trading', qty: '5,000 MT', moq: '200 MT', price: '$224', rating: '4.6', verified: false, safe: true, offer: false, auction: true, delivery: '10 days', category: 'Animal feed', sub: 'Fodder grain', market: 'Santos Trade Terminal' },
  { name: 'Organic Red Lentils', emoji: '🫘', img: uns('1596797038530-2c107229654b'), grade: 'Organic', flag: '🇹🇷', seller: 'Anatolia Pulses', qty: '400 MT', moq: '20 MT', price: '$1,020', rating: '4.8', verified: true, safe: true, offer: true, auction: false, delivery: 'Ready', category: 'Grain', sub: 'Lentil', market: 'Mersin Wholesale Market' },
  { name: 'White Sugar ICUMSA 45', emoji: '🍬', img: uns('1610450949065-1f2841536c88'), grade: 'Refined', flag: '🇹🇭', seller: 'Siam Sugar Mills', qty: '8,000 MT', moq: '500 MT', price: '$615', rating: '4.7', verified: true, safe: false, offer: false, auction: false, delivery: '21 days', category: 'Processed products', sub: 'Sugar', market: 'Al Aweer Central Market' },
  { name: 'Raw California Almonds', emoji: '🥜', img: uns('1508061253366-f7da158b6d46'), grade: 'Nonpareil', flag: '🇺🇸', seller: 'California Nut Growers', qty: '260 MT', moq: '15 MT', price: '$6,400', rating: '4.9', verified: true, safe: true, offer: true, auction: false, delivery: 'Ready', category: 'Nuts', sub: 'Almond', market: 'Rotterdam Agri Hub' },
  { name: 'Fresh Roma Tomatoes', emoji: '🍅', img: uns('1592841200221-a6898f307baa'), grade: 'Class I', flag: '🇪🇸', seller: 'Andalusia Fresh', qty: '120 MT', moq: '5 MT', price: '$480', rating: '4.6', verified: true, safe: true, offer: false, auction: false, delivery: '3 days', category: 'Vegetables', sub: 'Tomato', market: 'Rungis International' },
];

/** "$1,180" → 118000 cents (null when unparseable, e.g. "POA"). */
const parseCents = (price: string): number | null => {
  const n = parseFloat(price.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

/** "50 MT" → { qtyValue: 50, qtyUnit: 'MT' }. */
const parseQty = (qty?: string | null): { qtyValue: number | null; qtyUnit: string } => {
  if (!qty) return { qtyValue: null, qtyUnit: 'MT' };
  const n = parseFloat(qty.replace(/[,\s]/g, ''));
  const unit = qty.replace(/[0-9.,]/g, '').trim();
  return { qtyValue: Number.isFinite(n) ? n : null, qtyUnit: unit || 'MT' };
};

const demoUsers: { email: string; name: string; role: Role; country: string; kyc: 'verified' | 'pending' | 'rejected' }[] = [
  { email: 'buyer@agrotraders.org', name: 'Karim Trading', role: 'buyer', country: '🇦🇪 UAE', kyc: 'verified' },
  { email: 'seller@agrotraders.org', name: 'Punjab Agro Exports', role: 'seller', country: '🇮🇳 India', kyc: 'verified' },
  { email: 'transporter@agrotraders.org', name: 'SwiftHaul Logistics', role: 'transporter', country: '🇦🇪 UAE', kyc: 'pending' },
  { email: 'loaderco@agrotraders.org', name: 'PortForce Crews', role: 'loaderco', country: '🇮🇳 India', kyc: 'verified' },
  { email: 'worker@agrotraders.org', name: 'Imran Sheikh', role: 'worker', country: '🇮🇳 India', kyc: 'verified' },
  { email: 'admin@agrotraders.org', name: 'Platform Admin', role: 'admin', country: '🌍', kyc: 'verified' },
];

const orders = [
  { reference: 'AG-7741', buyer: 'Karim Trading', seller: 'Punjab Agro Exports', amount: '$42,000', qty: '50 MT', status: 'in_transit' as OrderStatus },
  { reference: 'AG-7740', buyer: 'Berlin Grain GmbH', seller: 'Kuban Grain Co.', amount: '$32,160', qty: '120 MT', status: 'processing' as OrderStatus },
  { reference: 'AG-7738', buyer: 'Astana Co', seller: 'California Nut Growers', amount: '$21,000', qty: '25 MT', status: 'paid' as OrderStatus },
  { reference: 'AG-7732', buyer: 'Al Noor Foods', seller: 'Anatolia Pulses', amount: '$20,400', qty: '40 MT', status: 'delivered' as OrderStatus },
  { reference: 'AG-7729', buyer: 'Cairo Foods', seller: 'Black Sea Oils', amount: '$18,400', qty: '22 MT', status: 'dispute' as OrderStatus },
];

// 10 transport companies (role: transporter). Each gets a vehicle + a route below.
const transporters: { name: string; country: string; kyc: 'verified' | 'pending' | 'rejected'; vehicle: string; plate: string; capacity: string; from: string; to: string; km: number }[] = [
  { name: 'SwiftHaul Logistics', country: '🇦🇪 UAE', kyc: 'pending', vehicle: '40ft Reefer', plate: 'DXB-01-AB-1234', capacity: '28', from: 'Mundra', to: 'Dubai', km: 1900 },
  { name: 'Steppe Freight Lines', country: '🇰🇿 Kazakhstan', kyc: 'verified', vehicle: 'Bulk Tipper', plate: 'KZ-04-CD-5678', capacity: '40', from: 'Almaty', to: 'Tashkent', km: 870 },
  { name: 'Volga Cargo Movers', country: '🇷🇺 Russia', kyc: 'verified', vehicle: 'Grain Hopper', plate: 'RU-77-EF-9012', capacity: '45', from: 'Rostov', to: 'Novorossiysk', km: 420 },
  { name: 'Bosphorus Transit', country: '🇹🇷 Türkiye', kyc: 'verified', vehicle: 'Curtain-side', plate: 'TR-34-GH-3456', capacity: '24', from: 'Istanbul', to: 'Mersin', km: 920 },
  { name: 'Indus Roadways', country: '🇮🇳 India', kyc: 'verified', vehicle: 'Container Trailer', plate: 'GJ-01-IJ-7788', capacity: '30', from: 'Kandla', to: 'Delhi', km: 1150 },
  { name: 'Pampas Express', country: '🇦🇷 Argentina', kyc: 'pending', vehicle: 'Bulk Tipper', plate: 'AR-11-KL-2211', capacity: '42', from: 'Rosario', to: 'Buenos Aires', km: 300 },
  { name: 'Nile Valley Transport', country: '🇪🇬 Egypt', kyc: 'verified', vehicle: '40ft Reefer', plate: 'EG-02-MN-4455', capacity: '26', from: 'Alexandria', to: 'Cairo', km: 220 },
  { name: 'Baltic Haulage', country: '🇱🇹 Lithuania', kyc: 'verified', vehicle: 'Curtain-side', plate: 'LT-05-OP-6677', capacity: '24', from: 'Klaipeda', to: 'Vilnius', km: 310 },
  { name: 'Mekong Movers', country: '🇻🇳 Vietnam', kyc: 'pending', vehicle: 'Container Trailer', plate: 'VN-29-QR-8899', capacity: '28', from: 'Hai Phong', to: 'Hanoi', km: 120 },
  { name: 'Andes Freight', country: '🇵🇪 Peru', kyc: 'verified', vehicle: 'Grain Hopper', plate: 'PE-07-ST-1010', capacity: '38', from: 'Callao', to: 'Arequipa', km: 1000 },
];

// 10 loading companies (role: loaderco). Each gets 2 teams + a job below.
const loaderCompanies: { name: string; country: string; kyc: 'verified' | 'pending' | 'rejected'; location: string }[] = [
  { name: 'PortForce Crews', country: '🇮🇳 India', kyc: 'verified', location: 'Mundra Terminal 4' },
  { name: 'DockHands United', country: '🇦🇪 UAE', kyc: 'verified', location: 'Jebel Ali Port' },
  { name: 'CargoLift Teams', country: '🇹🇷 Türkiye', kyc: 'pending', location: 'Mersin Terminal 2' },
  { name: 'Black Sea Stevedores', country: '🇺🇦 Ukraine', kyc: 'verified', location: 'Odesa Grain Berth' },
  { name: 'Steppe Loaders Co.', country: '🇰🇿 Kazakhstan', kyc: 'verified', location: 'Almaty Dry Port' },
  { name: 'Delta Handling', country: '🇪🇬 Egypt', kyc: 'pending', location: 'Alexandria Silo 3' },
  { name: 'Harbor Muscle', country: '🇷🇺 Russia', kyc: 'verified', location: 'Novorossiysk Berth 9' },
  { name: 'Saigon Loading Group', country: '🇻🇳 Vietnam', kyc: 'verified', location: 'Hai Phong Wharf' },
  { name: 'Pampas Crews', country: '🇦🇷 Argentina', kyc: 'pending', location: 'Rosario Elevator 12' },
  { name: 'Levant Stevedores', country: '🇱🇧 Lebanon', kyc: 'verified', location: 'Beirut Port Zone B' },
];

// 10 loaders/workers (role: worker). Assigned across the loading companies above.
const loaders: { name: string; country: string; rating: string; status: 'available' | 'on_site' | 'off'; company: string }[] = [
  { name: 'Imran Sheikh', country: '🇮🇳 India', rating: '4.8', status: 'on_site', company: 'PortForce Crews' },
  { name: 'Ravi Kumar', country: '🇮🇳 India', rating: '4.9', status: 'on_site', company: 'PortForce Crews' },
  { name: 'Dmitri Petrov', country: '🇷🇺 Russia', rating: '4.7', status: 'available', company: 'Harbor Muscle' },
  { name: 'Arman Serik', country: '🇰🇿 Kazakhstan', rating: '4.6', status: 'available', company: 'Steppe Loaders Co.' },
  { name: 'Mehmet Yilmaz', country: '🇹🇷 Türkiye', rating: '4.8', status: 'on_site', company: 'CargoLift Teams' },
  { name: 'Oleksandr Kovalenko', country: '🇺🇦 Ukraine', rating: '4.9', status: 'available', company: 'Black Sea Stevedores' },
  { name: 'Ahmed Farouk', country: '🇪🇬 Egypt', rating: '4.5', status: 'off', company: 'Delta Handling' },
  { name: 'Nguyen Van Minh', country: '🇻🇳 Vietnam', rating: '4.7', status: 'on_site', company: 'Saigon Loading Group' },
  { name: 'Rashid Al Amin', country: '🇦🇪 UAE', rating: '4.8', status: 'available', company: 'DockHands United' },
  { name: 'Diego Morales', country: '🇦🇷 Argentina', rating: '4.6', status: 'off', company: 'Pampas Crews' },
];

const communityChannels: { name: string; kind: CommunityGroupKind; emoji: string }[] = [
  { name: 'General Agriculture', kind: 'channel', emoji: '🌱' },
  { name: 'Buyer Requirements', kind: 'buyer_requirement', emoji: '📋' },
  { name: 'Seller Offers', kind: 'seller_offer', emoji: '🏷️' },
  { name: 'Wheat Trading', kind: 'crop', emoji: '🌾' },
  { name: 'Rice Trading', kind: 'crop', emoji: '🍚' },
  { name: 'Pulses Trading', kind: 'crop', emoji: '🫘' },
  { name: 'Fruits & Vegetables', kind: 'crop', emoji: '🥦' },
  { name: 'Spices & Herbs', kind: 'crop', emoji: '🌶️' },
  { name: 'Seeds & Fertilizers', kind: 'crop', emoji: '🌱' },
  { name: 'Import & Export', kind: 'international', emoji: '🚢' },
  { name: 'Transport Requests', kind: 'transport', emoji: '🚚' },
  { name: 'Loader Services', kind: 'loader', emoji: '💪' },
  { name: 'Warehousing', kind: 'warehousing', emoji: '🏬' },
  { name: 'Market Prices', kind: 'market_prices', emoji: '📈' },
  { name: 'Russia Marketplace', kind: 'regional', emoji: '🇷🇺' },
  { name: 'International Trade', kind: 'international', emoji: '🌍' },
  { name: 'Regional City Groups', kind: 'regional', emoji: '📍' },
];

async function main() {
  console.log('🌱 Seeding AgroTraders…');
  // clean (dependency order) — chat systems first (they FK to users/products)
  await prisma.chatAttachment.deleteMany();
  await prisma.communityMessageReaction.deleteMany();
  await prisma.communityMessage.deleteMany();
  await prisma.communityRequirementResponse.deleteMany();
  await prisma.communityTradeRequirement.deleteMany();
  await prisma.communitySavedPost.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.communityGroupMember.deleteMany();
  await prisma.communityDirectThread.deleteMany();
  await prisma.communityGroup.deleteMany();
  await prisma.communityReport.deleteMany();
  await prisma.communityUserBlock.deleteMany();
  await prisma.supportRating.deleteMany();
  await prisma.supportTicketTag.deleteMany();
  await prisma.supportTag.deleteMany();
  await prisma.supportInternalNote.deleteMany();
  await prisma.supportTicketAssignment.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportConversation.deleteMany();
  await prisma.supportSLA.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.supportAgent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  // Unified reviews FK into users/orders/trips/jobs/products — clear before them.
  await prisma.review.deleteMany();
  // invoicing + order lifecycle + buyer bids (all FK into orders/trips/jobs/users below)
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.sellerBid.deleteMany();
  await prisma.buyerBid.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.adCampaign.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.crewAvailability.deleteMany();
  await prisma.cmsPage.deleteMany();
  await prisma.hireRequest.deleteMany();
  await prisma.loaderReview.deleteMany();
  await prisma.loaderRate.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.jobAssignment.deleteMany();
  await prisma.loaderJob.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.team.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.transportQuote.deleteMany();
  await prisma.transportRequest.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.route.deleteMany();
  await prisma.auctionBid.deleteMany();
  await prisma.walletTx.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.order.deleteMany();
  await prisma.kycRecord.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.office.deleteMany();
  await prisma.roleRequest.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.market.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // categories + subcategories
  const catMap = new Map<string, string>();
  const subMap = new Map<string, string>(); // key: `${category}|${sub}`
  let ci = 0;
  for (const c of categories) {
    const cat = await prisma.category.create({
      data: { name: c.name, slug: slug(c.name), emoji: c.emoji, tint: c.tint, sort: ci++ },
    });
    catMap.set(c.name, cat.id);
    let si = 0;
    for (const [subName, subRu] of c.subs) {
      const sub = await prisma.subcategory.create({
        data: {
          name: subName,
          slug: `${slug(c.name)}-${slug(subName)}`,
          categoryId: cat.id,
          sort: si++,
          translations: { create: [{ locale: 'ru', name: subRu }] },
        },
      });
      subMap.set(`${c.name}|${subName}`, sub.id);
    }
  }

  // offices
  await prisma.office.createMany({ data: offices });

  // markets
  const marketMap = new Map<string, string>(); // name → id
  let mi = 0;
  for (const m of markets) {
    const rec = await prisma.market.create({
      data: { slug: slug(m.name), name: m.name, city: m.city, country: m.country, flag: m.flag, region: m.region, sort: mi++ },
    });
    marketMap.set(m.name, rec.id);
  }

  // demo + seller + buyer users
  const userMap = new Map<string, string>();
  const upsertUser = async (name: string, role: Role, country: string, kyc: 'verified' | 'pending' | 'rejected', email?: string) => {
    if (userMap.has(name)) return userMap.get(name)!;
    const user = await prisma.user.create({
      data: {
        email: email ?? `${slug(name)}@sellers.agrotraders.org`,
        passwordHash,
        name,
        role,
        country,
        kycStatus: kyc,
        // A seeded admin is a full super-admin (holds every permission); without
        // this the PermissionsGuard would 403 them on every gated route.
        adminPermissions: role === 'admin' ? Object.values(AdminPermission) : [],
      },
    });
    if (kyc === 'pending') {
      const record = await prisma.kycRecord.create({ data: { userId: user.id, status: 'pending' } });
      // The primary demo pending account carries real files so the admin doc
      // viewer has something to open; other demo accounts stay document-free.
      if (email === 'transporter@agrotraders.org') {
        const types: KycDocType[] = ['trade_license', 'government_id'];
        for (const type of types) {
          await prisma.kycDocument.create({
            data: {
              recordId: record.id,
              type,
              storageKey: writeSampleKycFile(),
              originalName: `${type}.pdf`,
              mime: 'application/pdf',
              sizeBytes: SAMPLE_PDF.length,
            },
          });
        }
        await prisma.kycRecord.update({ where: { id: record.id }, data: { docs: types.length } });
      }
    }
    userMap.set(name, user.id);
    return user.id;
  };

  for (const u of demoUsers) await upsertUser(u.name, u.role, u.country, u.kyc, u.email);

  // Scoped sub-admins to demo the per-module access-control system. Each holds
  // only a slice of AdminPermission, so the console hides modules they can't use
  // and the API 403s out-of-scope routes.
  const scopedAdmins: { name: string; email: string; perms: AdminPermission[] }[] = [
    { name: 'Finance Admin', email: 'finance@agrotraders.org', perms: ['finance_manage', 'reports_view'] },
    { name: 'Support Moderator', email: 'moderator@agrotraders.org', perms: ['support_agent', 'community_moderate', 'kyc_review'] },
  ];
  for (const sa of scopedAdmins) {
    if (userMap.has(sa.name)) continue;
    const u = await prisma.user.create({
      data: { email: sa.email, passwordHash, name: sa.name, role: 'admin', country: '🌍', kycStatus: 'verified', adminPermissions: sa.perms },
    });
    userMap.set(sa.name, u.id);
  }

  // products (create seller user per unique seller)
  for (const p of products) {
    const sellerId = await upsertUser(p.seller, 'seller', p.flag, Math.random() > 0.6 ? 'pending' : 'verified');
    await prisma.product.create({
      data: {
        slug: slug(p.name),
        name: p.name,
        emoji: p.emoji,
        imageUrl: productImage(p.name, p.img),
        grade: p.grade,
        flag: p.flag,
        origin: p.flag,
        qty: p.qty,
        moq: p.moq,
        price: p.price,
        priceCents: parseCents(p.price),
        rating: p.rating,
        verified: p.verified,
        safeDeal: p.safe,
        isOffer: p.offer,
        isAuction: p.auction,
        delivery: p.delivery,
        categoryId: catMap.get(p.category)!,
        subcategoryId: p.sub ? subMap.get(`${p.category}|${p.sub}`) ?? null : null,
        sellerId,
        marketId: marketMap.get(p.market) ?? null,
      },
    });
    // Seller profile pinned to the same market so directory filters line up.
    await prisma.profile.upsert({
      where: { userId: sellerId },
      update: {},
      create: { userId: sellerId, marketId: marketMap.get(p.market) ?? null, location: p.flag },
    });
  }

  // orders — display strings AND the numeric columns stay in lockstep.
  for (const o of orders) {
    const buyerId = await upsertUser(o.buyer, 'buyer', '🌍', 'verified');
    const sellerId = await upsertUser(o.seller, 'seller', '🌍', 'verified');
    const amountCents = parseCents(o.amount);
    const { qtyValue, qtyUnit } = parseQty(o.qty);
    await prisma.order.create({
      data: {
        reference: o.reference,
        amount: o.amount,
        qty: o.qty,
        status: o.status,
        buyerId,
        sellerId,
        amountCents,
        qtyValue,
        qtyUnit,
        unitPriceCents: amountCents && qtyValue ? Math.round(amountCents / qtyValue) : null,
      },
    });
  }

  // ── demo user ids ──────────────────────────────────────────────
  const buyerId = userMap.get('Karim Trading')!;
  const buyer2Id = userMap.get('Berlin Grain GmbH')!;
  const transporterId = userMap.get('SwiftHaul Logistics')!;
  const loadercoId = userMap.get('PortForce Crews')!;
  const workerUserId = userMap.get('Imran Sheikh')!;
  const sellerId = userMap.get('Punjab Agro Exports')!;

  // ── buyer bids (one static-quote, one reverse auction) ────────
  const day = 24 * 60 * 60 * 1000;
  const bidQuote = await prisma.buyerBid.create({
    data: {
      reference: 'BID-1001',
      mode: 'quote',
      title: 'Basmati rice — 100 MT for Jebel Ali',
      productName: 'Basmati Rice 1121',
      qtyValue: 100,
      qtyUnit: 'MT',
      targetPriceCents: 82000,
      deliveryPlace: 'Jebel Ali Port, Dubai',
      destinationCountry: '🇦🇪 UAE',
      deadline: new Date(Date.now() + 7 * day),
      notes: 'Sortex-cleaned, 2% broken max. Need phytosanitary certificate.',
      categoryId: catMap.get('Grain') ?? null,
      buyerId,
    },
  });
  const bidAuction = await prisma.buyerBid.create({
    data: {
      reference: 'BID-1002',
      mode: 'auction',
      title: 'Yellow lentils — 60 MT, lowest landed price wins',
      productName: 'Yellow Lentils',
      qtyValue: 60,
      qtyUnit: 'MT',
      targetPriceCents: 65000,
      deliveryPlace: 'Mundra Port, India',
      destinationCountry: '🇮🇳 India',
      auctionEndsAt: new Date(Date.now() + 2 * day),
      notes: 'Reverse auction — sellers underbid. Best price at close wins.',
      categoryId: catMap.get('Grain') ?? null,
      buyerId,
    },
  });
  await prisma.sellerBid.create({
    data: { buyerBidId: bidQuote.id, sellerId, priceCents: 84500, qtyValue: 100, etaDays: 12, message: 'Can ship from Amritsar within 12 days.' },
  });
  await prisma.sellerBid.create({
    data: { buyerBidId: bidAuction.id, sellerId, priceCents: 63000, qtyValue: 60, etaDays: 9, message: 'Opening bid.' },
  });

  // ── a demo invoice against the delivered-in-transit order ──────
  const invoicedOrder = await prisma.order.findUnique({ where: { reference: 'AG-7741' } });
  if (invoicedOrder?.amountCents) {
    await prisma.counter.upsert({ where: { key: `invoice-${new Date().getFullYear()}` }, create: { key: `invoice-${new Date().getFullYear()}`, value: 1 }, update: { value: 1 } });
    await prisma.invoice.create({
      data: {
        number: `INV-${new Date().getFullYear()}-000001`,
        kind: 'order',
        status: 'issued',
        subtotalCents: invoicedOrder.amountCents,
        taxCents: 0,
        totalCents: invoicedOrder.amountCents,
        issuerId: invoicedOrder.sellerId,
        recipientId: invoicedOrder.buyerId,
        orderId: invoicedOrder.id,
        dueAt: new Date(Date.now() + 30 * day),
        lines: {
          create: [{
            description: `Order ${invoicedOrder.reference}`,
            qty: invoicedOrder.qtyValue ?? 1,
            unit: invoicedOrder.qtyUnit,
            unitPriceCents: invoicedOrder.unitPriceCents ?? invoicedOrder.amountCents,
            amountCents: invoicedOrder.amountCents,
          }],
        },
      },
    });
  }

  // profiles for the demo accounts (private contact + public timings/market)
  const demoProfiles: { name: string; phone: string; whatsapp?: string; location: string; from: string; to: string; tz: string; langs: string; market?: string; emoji: string; bio: string; listed?: boolean }[] = [
    { name: 'Karim Trading', phone: '+971 50 214 8867', whatsapp: '+971 50 214 8867', location: 'Dubai, UAE', from: '08:00', to: '20:00', tz: 'GMT+4', langs: 'EN · AR', emoji: '🏢', bio: 'Bulk buyer of grains and pulses for GCC distribution.' },
    { name: 'Punjab Agro Exports', phone: '+91 98 7654 3210', whatsapp: '+91 98 7654 3210', location: 'Amritsar, India', from: '09:00', to: '19:00', tz: 'GMT+5:30', langs: 'EN · HI · PA', market: 'Azadpur Mandi', emoji: '🌾', bio: 'Premium basmati and grain exporter since 1998.' },
    { name: 'SwiftHaul Logistics', phone: '+971 55 902 4411', location: 'Jebel Ali, UAE', from: '06:00', to: '22:00', tz: 'GMT+4', langs: 'EN · UR', emoji: '🚚', bio: 'Reefer and bulk freight across GCC–South Asia lanes.', listed: true },
    { name: 'PortForce Crews', phone: '+91 90 1122 3344', location: 'Mundra, India', from: '05:00', to: '23:00', tz: 'GMT+5:30', langs: 'EN · HI · GU', emoji: '💪', bio: 'Port and warehouse loading crews with attendance proof.', listed: true },
    { name: 'Imran Sheikh', phone: '+91 88 5566 7788', location: 'Mundra, India', from: '06:00', to: '18:00', tz: 'GMT+5:30', langs: 'HI · GU', emoji: '👷', bio: 'Senior loader — 8 years port experience, forklift certified.' },
  ];
  for (const p of demoProfiles) {
    const uid = userMap.get(p.name);
    if (!uid) continue;
    await prisma.profile.upsert({
      where: { userId: uid },
      update: {
        phone: p.phone, whatsapp: p.whatsapp, contactEmail: `${slug(p.name)}@contact.agrotraders.org`,
        location: p.location, availableFrom: p.from, availableTo: p.to, timezone: p.tz,
        languages: p.langs, marketId: p.market ? marketMap.get(p.market) : undefined, avatarEmoji: p.emoji, bio: p.bio,
        listApproved: p.listed ?? false,
      },
      create: {
        userId: uid, phone: p.phone, whatsapp: p.whatsapp, contactEmail: `${slug(p.name)}@contact.agrotraders.org`,
        location: p.location, availableFrom: p.from, availableTo: p.to, timezone: p.tz,
        languages: p.langs, marketId: p.market ? marketMap.get(p.market) : null, avatarEmoji: p.emoji, bio: p.bio,
        listApproved: p.listed ?? false,
      },
    });
  }

  // wallets
  const wallets: [string, number][] = [
    [buyerId, 12600000],
    [userMap.get('Punjab Agro Exports')!, 8420000],
    [transporterId, 3840000],
    [loadercoId, 2280000],
    [workerUserId, 28400],
  ];
  for (const [uid, bal] of wallets) {
    const w = await prisma.wallet.create({ data: { userId: uid, balanceCents: bal } });
    await prisma.walletTx.create({ data: { walletId: w.id, amountCents: bal, type: 'topup', note: 'Opening balance' } });
  }

  // auctions + bids — open ascending: [slug, start, endIn, increment, reserve]
  const auctionSeed: [string, number, number, number, number][] = [
    ['crude-sunflower-oil', 1600000, 2 * 3600e3, 20000, 1700000],
    ['yellow-maize-feed-grade', 1050000, 23 * 60e3, 15000, 1100000],
  ];
  for (const [s, startCents, endIn, incCents, reserveCents] of auctionSeed) {
    const prod = await prisma.product.findFirst({ where: { slug: { startsWith: s.slice(0, 12) } } });
    if (!prod) continue;
    await prisma.product.update({
      where: { id: prod.id },
      data: {
        isAuction: true,
        startBidCents: startCents,
        bidIncrementCents: incCents,
        reserveCents,
        auctionEndsAt: new Date(Date.now() + endIn),
      },
    });
    // A short public ladder so the masked history + "current highest bid" render.
    let amt = startCents;
    for (const bidder of [buyer2Id, buyerId, buyer2Id, buyerId]) {
      amt += incCents;
      await prisma.auctionBid.create({ data: { productId: prod.id, bidderId: bidder, amountCents: amt } });
    }
  }

  // transport: buyer requests + 10 transporter companies (each a vehicle + a route)
  await prisma.transportRequest.createMany({
    data: [
      { reference: 'RQ-201', fromCity: 'Mundra', toCity: 'Dubai', cargo: 'Rice 50MT', weightMt: '50', createdById: buyerId, status: 'open' },
      { reference: 'RQ-202', fromCity: 'Odesa', toCity: 'Istanbul', cargo: 'Oil 22MT', weightMt: '22', createdById: buyerId, status: 'open' },
    ],
  });
  for (const t of transporters) {
    const tid = await upsertUser(t.name, 'transporter', t.country, t.kyc);
    await prisma.vehicle.create({ data: { type: t.vehicle, plate: t.plate, capacityMt: t.capacity, ownerId: tid } });
    await prisma.route.create({ data: { name: `${t.from} → ${t.to}`, fromCity: t.from, toCity: t.to, distanceKm: t.km, ownerId: tid } });
  }

  // loaders: 10 loading companies (each 2 teams) + 10 workers assigned across them
  const loadercoMap = new Map<string, string>();  // company name → user id
  const firstTeamOf = new Map<string, string>();   // company name → first team id
  for (const lc of loaderCompanies) {
    const lid = await upsertUser(lc.name, 'loaderco', lc.country, lc.kyc);
    loadercoMap.set(lc.name, lid);
    let firstTeam = '';
    for (const letter of ['Alpha', 'Bravo']) {
      const team = await prisma.team.create({ data: { name: `Team ${letter}`, loadercoId: lid } });
      if (!firstTeam) firstTeam = team.id;
    }
    firstTeamOf.set(lc.name, firstTeam);
  }

  const WORKER_SKILLS = ['Bagging', 'Forklift', 'Container stuffing', 'Bulk loading', 'Crane rigging'];
  const workerRecId = new Map<string, string>();   // worker name → Worker record id
  let widx = 0;
  for (const w of loaders) {
    const lid = loadercoMap.get(w.company)!;
    const uid = await upsertUser(w.name, 'worker', w.country, 'verified');
    const rec = await prisma.worker.create({
      data: {
        name: w.name, loadercoId: lid, teamId: firstTeamOf.get(w.company)!, userId: uid, rating: w.rating, status: w.status,
        skill: WORKER_SKILLS[widx % WORKER_SKILLS.length],
        phone: `+9199${String(100000 + widx * 137).slice(-6)}`,
        dailyWageCents: 1800 + (widx % 5) * 200,
      },
    });
    workerRecId.set(w.name, rec.id);
    widx++;
  }

  // sample jobs for the demo loading company (PortForce) + an open job.
  // Link the active job to one of the buyer's orders so its detail view shows
  // the order/product context, not just a location.
  const sourceOrder = await prisma.order.findFirst({ where: { buyerId }, select: { id: true, qty: true } });
  const job = await prisma.loaderJob.create({
    data: {
      reference: 'LD-220', location: 'Mundra Terminal 4', workersNeeded: 8, payCents: 4800, otp: '4821',
      cargo: 'Basmati Rice · 50 MT', neededDate: new Date(Date.now() + 2 * 864e5), notes: 'Unload and bag before the reefer arrives.',
      orderId: sourceOrder?.id, createdById: buyerId, loadercoId, status: 'in_progress',
    },
  });
  const imranId = workerRecId.get('Imran Sheikh')!;
  await prisma.jobAssignment.create({ data: { jobId: job.id, workerId: imranId, status: 'checked_in' } });
  await prisma.attendance.create({ data: { jobId: job.id, workerId: imranId, checkInAt: new Date(Date.now() - 3 * 3600e3), recordedById: loadercoId } });
  await prisma.loaderJob.create({
    data: {
      reference: 'LD-221', location: 'Dubai Warehouse', workersNeeded: 6, payCents: 3600, createdById: buyer2Id, status: 'open',
      cargo: 'Bagged Wheat · 30 MT', neededDate: new Date(Date.now() + 5 * 864e5),
    },
  });

  // a completed job (so the buyer can leave a review) + a completed assignment
  const doneJob = await prisma.loaderJob.create({
    data: {
      reference: 'LD-210', location: 'Mundra Terminal 2', workersNeeded: 5, payCents: 3000, otp: '1290',
      cargo: 'Container stuffing · 20 MT', createdById: buyerId, loadercoId, status: 'completed',
    },
  });
  const doneAsg = await prisma.jobAssignment.create({
    data: { jobId: doneJob.id, workerId: imranId, status: 'completed' },
  });
  await prisma.loaderRate.createMany({
    data: [
      { loadercoId, service: 'Bagged loading', rateCents: 450 },
      { loadercoId, service: 'Bulk loading', rateCents: 320 },
      { loadercoId, service: 'Container stuffing', rateCents: 600 },
      { loadercoId, service: 'Unloading', rateCents: 380 },
    ],
  });

  // ── unified two-way reviews across completed services ──────────
  // (LoaderReview is retired; every star review now lives in Review.)
  const deliveredOrder = await prisma.order.findUnique({ where: { reference: 'AG-7732' } });
  // Ensure the delivered order is linked to a product so the demo can showcase a
  // buyer→product review (bulk-seeded orders carry no product otherwise).
  if (deliveredOrder && !deliveredOrder.productId) {
    const prod =
      (await prisma.product.findFirst({ where: { sellerId: deliveredOrder.sellerId } })) ??
      (await prisma.product.findFirst());
    if (prod) {
      await prisma.order.update({ where: { id: deliveredOrder.id }, data: { productId: prod.id } });
      deliveredOrder.productId = prod.id;
    }
  }
  const reviewRows: import('@prisma/client').Prisma.ReviewCreateManyInput[] = [
    // client → loader company (was LoaderReview)
    { kind: 'loaderjob', revieweeRole: 'loaderco', subjectId: doneJob.id, loaderJobId: doneJob.id, raterId: buyerId, revieweeId: loadercoId, stars: 5, text: 'Loaded a 28MT reefer in under two hours. Spotless.' },
    // client → individual worker (per-assignment)
    { kind: 'assignment', revieweeRole: 'worker', subjectId: doneAsg.id, jobAssignmentId: doneAsg.id, loaderJobId: doneJob.id, raterId: buyerId, revieweeId: workerUserId, stars: 5, text: 'Fast, careful and punctual on site.' },
  ];
  if (deliveredOrder) {
    reviewRows.push(
      // buyer → seller
      { kind: 'order', revieweeRole: 'seller', subjectId: deliveredOrder.id, orderId: deliveredOrder.id, raterId: deliveredOrder.buyerId, revieweeId: deliveredOrder.sellerId, stars: 5, text: 'Exactly as described, shipped on schedule. Will buy again.' },
      // seller → buyer (two-way)
      { kind: 'order', revieweeRole: 'buyer', subjectId: deliveredOrder.id, orderId: deliveredOrder.id, raterId: deliveredOrder.sellerId, revieweeId: deliveredOrder.buyerId, stars: 5, text: 'Smooth communication and prompt payment.' },
    );
    if (deliveredOrder.productId) {
      // buyer → product
      reviewRows.push({ kind: 'order', revieweeRole: 'product', subjectId: deliveredOrder.id, orderId: deliveredOrder.id, productId: deliveredOrder.productId, raterId: deliveredOrder.buyerId, revieweeId: deliveredOrder.sellerId, stars: 4, text: 'Good quality grain, minor moisture variance.' });
    }
  }
  await prisma.review.createMany({ data: reviewRows });
  await recomputeAllRatingAggregates();

  // self-registered worker (no loader company) — exercises worker self-signup
  const worker2Id = await upsertUser('Sanjay Patel', 'worker', '🇮🇳 India', 'verified', 'worker2@agrotraders.org');
  const worker2Rec = await prisma.worker.create({
    data: { name: 'Sanjay Patel', userId: worker2Id, rating: '4.7', status: 'available' },
  });
  await prisma.profile.create({
    data: {
      userId: worker2Id, phone: '+91 77 3344 5566', location: 'Kandla, India',
      availableFrom: '07:00', availableTo: '19:00', timezone: 'GMT+5:30', languages: 'HI · EN',
      avatarEmoji: '👷', bio: 'Independent loader available for port and warehouse shifts.',
    },
  });

  // direct hire requests in various states
  await prisma.hireRequest.create({
    data: {
      reference: 'HR-1001', targetType: 'transporter', status: 'pending',
      message: 'Need a reefer for 50MT rice, Mundra to Dubai next week.',
      fromCity: 'Mundra', toCity: 'Dubai', cargo: 'Basmati Rice 50MT', budgetCents: 420000,
      neededDate: new Date(Date.now() + 7 * 864e5), requesterId: buyerId, targetUserId: transporterId,
    },
  });
  await prisma.hireRequest.create({
    data: {
      reference: 'HR-1002', targetType: 'loaderco', status: 'accepted', decidedAt: new Date(),
      message: 'Unloading crew for Mundra Terminal 4.', location: 'Mundra Terminal 4',
      workersNeeded: 8, requesterId: buyerId, targetUserId: loadercoId, loaderJobId: job.id,
    },
  });
  await prisma.hireRequest.create({
    data: {
      reference: 'HR-1003', targetType: 'worker', status: 'pending',
      message: 'Need an experienced loader for a 2-day warehouse job.',
      location: 'Dubai Warehouse', workersNeeded: 1, budgetCents: 9600,
      requesterId: buyer2Id, targetUserId: worker2Id, workerId: worker2Rec.id,
    },
  });
  await prisma.hireRequest.create({
    data: {
      reference: 'HR-1004', targetType: 'transporter', status: 'declined', decidedAt: new Date(),
      message: 'Lentils 40MT, Mersin to Beirut.', fromCity: 'Mersin', toCity: 'Beirut', cargo: 'Red Lentils 40MT',
      requesterId: userMap.get('Anatolia Pulses')!, targetUserId: userMap.get('Bosphorus Transit')!,
    },
  });

  // ── Money flow: escrow holds + earnings ────────────────────────
  // Credit a wallet for completed work (payout/escrow_release). This is what
  // the read-only Earnings screens show — kept distinct from top-ups.
  const creditEarning = async (uid: string, cents: number, note: string) => {
    const w = await prisma.wallet.findUnique({ where: { userId: uid } });
    if (!w) return;
    await prisma.walletTx.create({ data: { walletId: w.id, amountCents: cents, type: 'escrow_release', note } });
    await prisma.wallet.update({ where: { id: w.id }, data: { balanceCents: { increment: cents } } });
  };
  // Worker earns from completed shifts; loader company + transporter from jobs/deliveries.
  await creditEarning(workerUserId, 4800, 'Job LD-210 completed — payout');
  await creditEarning(workerUserId, 3600, 'Warehouse shift completed — payout');
  await creditEarning(loadercoId, 228000, 'Unloading crew — payout');
  await creditEarning(loadercoId, 184000, 'Container stuffing — payout');
  await creditEarning(transporterId, 420000, 'Delivery Mundra→Dubai — payout');

  // A pending budgeted hire holds the requester's funds in escrow up front.
  const buyerWallet = await prisma.wallet.findUnique({ where: { userId: buyerId } });
  if (buyerWallet) {
    await prisma.walletTx.create({ data: { walletId: buyerWallet.id, amountCents: -420000, type: 'escrow_hold', note: 'Hire budget held in escrow' } });
    await prisma.wallet.update({ where: { id: buyerWallet.id }, data: { balanceCents: { decrement: 420000 } } });
    await prisma.hireRequest.update({ where: { reference: 'HR-1001' }, data: { escrowState: 'held' } });
  }

  // ── Community: default channels (public, no owner) ─────────────
  const adminId = userMap.get('Platform Admin')!;
  let buyerReqGroupId: string | null = null;
  for (const ch of communityChannels) {
    const group = await prisma.communityGroup.create({
      data: {
        slug: slug(ch.name),
        name: ch.name,
        kind: ch.kind,
        emoji: ch.emoji,
        visibility: 'public',
        isDefault: true,
      },
    });
    // Auto-join demo users to just a couple of channels so "My Chats" reflects
    // a real member's joined list — not every channel. All other channels stay
    // discoverable and joinable from the Groups tab. (Real signups are never
    // auto-joined; membership is always an explicit action.)
    if (ch.name === 'General Agriculture' || ch.name === 'Buyer Requirements') {
      await prisma.communityGroupMember.createMany({
        data: [
          { groupId: group.id, userId: buyerId, role: 'member' },
          { groupId: group.id, userId: userMap.get('Punjab Agro Exports')!, role: 'member' },
        ],
        skipDuplicates: true,
      });
    }
    if (ch.name === 'Buyer Requirements') buyerReqGroupId = group.id;
  }

  // ── Community requirements board: buyer posts + seller responses ─
  const requirements: {
    author: string; title: string; category: string; product: string; qty: string; unit: string;
    grade?: string; budget?: string; location?: string; dest?: string; body: string;
    responses: { by: string; body: string; price: string; qty?: string }[];
  }[] = [
    {
      author: 'Karim Trading', title: 'Need 500 tons of Durum Wheat', category: 'Grain', product: 'Durum Wheat',
      qty: '500', unit: 'MT', grade: 'Milling', budget: '$270/MT', location: 'Dubai, UAE', dest: '🇦🇪 UAE',
      body: 'Looking for milling-grade durum wheat, CIF Jebel Ali, delivery within 30 days. Safe Deal only.',
      responses: [
        { by: 'Kuban Grain Co.', body: 'Can supply full 500MT from Novorossiysk, 14-day transit.', price: '$268/MT', qty: '500 MT' },
        { by: 'Punjab Agro Exports', body: 'We can cover 300MT immediately, balance in 3 weeks.', price: '$275/MT', qty: '300 MT' },
      ],
    },
    {
      author: 'Berlin Grain GmbH', title: '1,000 MT Yellow Maize monthly contract', category: 'Animal feed', product: 'Yellow Maize',
      qty: '1,000', unit: 'MT/month', grade: 'Feed', budget: '$230/MT', location: 'Hamburg, Germany', dest: '🇩🇪 Germany',
      body: '12-month rolling contract, feed grade, moisture max 14%.',
      responses: [
        { by: 'Pampas Trading', body: 'Santos loading, can commit 1,000MT monthly.', price: '$224/MT', qty: '1,000 MT' },
      ],
    },
    {
      author: 'Al Noor Foods', title: '200 MT Organic Red Lentils CIF Dubai', category: 'Grain', product: 'Red Lentils',
      qty: '200', unit: 'MT', grade: 'Organic', budget: '$1,050/MT', location: 'Dubai, UAE', dest: '🇦🇪 UAE',
      body: 'Certified organic only, split shipments accepted.',
      responses: [
        { by: 'Anatolia Pulses', body: 'EU-certified organic, Mersin loading within 10 days.', price: '$1,020/MT', qty: '200 MT' },
      ],
    },
    {
      author: 'Karim Trading', title: '50 MT Premium Basmati for Ramadan season', category: 'Grain', product: 'Basmati Rice',
      qty: '50', unit: 'MT', grade: 'Grade A', location: 'Dubai, UAE', dest: '🇦🇪 UAE',
      body: '1121 steam preferred, need before end of month.',
      responses: [],
    },
  ];
  for (const r of requirements) {
    const authorId = userMap.get(r.author) ?? buyerId;
    const post = await prisma.communityPost.create({
      data: { groupId: buyerReqGroupId, authorId, type: 'trade_requirement', title: r.title, body: r.body },
    });
    const req = await prisma.communityTradeRequirement.create({
      data: {
        postId: post.id, authorId, title: r.title, productCategory: r.category, productName: r.product,
        quantity: r.qty, unit: r.unit, grade: r.grade, budget: r.budget,
        buyerLocation: r.location, destinationCountry: r.dest,
        neededDate: new Date(Date.now() + 21 * 864e5),
      },
    });
    for (const resp of r.responses) {
      await prisma.communityRequirementResponse.create({
        data: {
          requirementId: req.id, responderId: userMap.get(resp.by) ?? adminId,
          kind: 'offer', body: resp.body, priceText: resp.price, quantityText: resp.qty,
        },
      });
    }
  }

  // Register the admin as a Support agent so Live Support has a staff member.
  await prisma.supportAgent.create({ data: { userId: adminId, availability: 'online' } });

  // ── Dashboard feature data (ads / drivers / crew availability / CMS) ──
  const demoSellerId = userMap.get('Punjab Agro Exports')!;
  const sellerProducts = await prisma.product.findMany({ where: { sellerId: demoSellerId }, take: 3, select: { id: true } });
  for (const [i, prod] of sellerProducts.entries()) {
    await prisma.adCampaign.create({
      data: { sellerId: demoSellerId, productId: prod.id, dailyBudgetCents: (5 + i * 3) * 100, active: i !== 2 },
    });
  }

  // Drivers for the demo transporter.
  await prisma.driver.createMany({
    data: [
      { ownerId: transporterId, name: 'Ravi Kumar', vehicle: 'TR-441', ratingPct: 96, onTimePct: 95, status: 'active' },
      { ownerId: transporterId, name: 'Ahmed Ali', vehicle: 'TR-118', ratingPct: 92, onTimePct: 88, status: 'active' },
      { ownerId: transporterId, name: 'Deepak Rao', vehicle: 'TR-207', ratingPct: 90, onTimePct: 84, status: 'off' },
    ],
  });

  // Crew availability grid for the demo loader company (Mon–Fri, three slots).
  const slots = ['morning', 'afternoon', 'evening'];
  const availabilityRows = [] as { loadercoId: string; weekday: number; slot: string; available: boolean }[];
  for (let weekday = 1; weekday <= 5; weekday++) {
    for (const slot of slots) {
      availabilityRows.push({ loadercoId, weekday, slot, available: !(weekday === 5 && slot === 'evening') });
    }
  }
  await prisma.crewAvailability.createMany({ data: availabilityRows });

  // Editable public site pages for the admin CMS + footer legal links.
  await prisma.cmsPage.createMany({
    data: [
      { slug: 'terms', title: 'Terms of Service', published: true, body: 'AgroTraders Terms of Service. Replace with your legal copy.' },
      { slug: 'privacy', title: 'Privacy Policy', published: true, body: 'AgroTraders Privacy Policy. Replace with your legal copy.' },
      { slug: 'cookies', title: 'Cookie Policy', published: true, body: 'AgroTraders Cookie Policy. Replace with your legal copy.' },
      { slug: 'about', title: 'About AgroTraders', published: true, body: 'The global agriculture trading platform.' },
      { slug: 'seller-handbook', title: 'Seller Handbook', published: false, body: 'Draft: how to sell on AgroTraders.' },
    ],
  });

  console.log('🌐 Label translations:', await seedAllLabelTranslations(prisma));

  const counts = {
    users: await prisma.user.count(),
    sellers: await prisma.user.count({ where: { role: 'seller' } }),
    transporters: await prisma.user.count({ where: { role: 'transporter' } }),
    loaderCompanies: await prisma.user.count({ where: { role: 'loaderco' } }),
    workerAccounts: await prisma.user.count({ where: { role: 'worker' } }),
    communityGroups: await prisma.communityGroup.count(),
    supportAgents: await prisma.supportAgent.count(),
    categories: await prisma.category.count(),
    subcategories: await prisma.subcategory.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    bids: await prisma.auctionBid.count(),
    auctions: await prisma.product.count({ where: { isAuction: true } }),
    vehicles: await prisma.vehicle.count(),
    workers: await prisma.worker.count(),
    jobs: await prisma.loaderJob.count(),
    wallets: await prisma.wallet.count(),
    markets: await prisma.market.count(),
    profiles: await prisma.profile.count(),
    hireRequests: await prisma.hireRequest.count(),
    tradeRequirements: await prisma.communityTradeRequirement.count(),
  };
  console.log('✅ Seed complete:', counts);
  console.log('🔑 Demo logins (password: password123):');
  demoUsers.forEach((u) => console.log(`   ${u.role.padEnd(12)} ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
