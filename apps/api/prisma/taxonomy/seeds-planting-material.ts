import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Seeds & planting material. Goes 4 levels deep almost everywhere and 5 on the crops that
 * genuinely trade that way (seed potato, onion sets, corn, sunflower, wheat, apple saplings):
 * seed lots are quoted by generation/class (breeder → foundation → registered → certified →
 * truthfully-labelled) crossed with hybrid/OP/treated status and a named variety, while nursery
 * stock is quoted by cultivar and then by rootstock, propagation form or tree grade.
 */
export const seedsPlantingMaterial: TaxCategory = {
  name: 'Seeds & planting material',
  emoji: '🌱',
  tint: TINT.mint,
  children: [
    {
      name: 'Seed potato',
      ru: 'Картофель семенной',
      children: [
        {
          name: 'Pre-basic seed (G0–G1)',
          children: [
            { name: 'In-vitro plantlets' },
            { name: 'Microtubers' },
            { name: 'Minitubers' },
            { name: 'First field generation G1' },
          ],
        },
        {
          name: 'Basic seed (G2–G3)',
          children: [
            { name: 'Super Super Elite (SSE)' },
            { name: 'Super Elite (SE)' },
            { name: 'Elite (E)' },
          ],
        },
        {
          name: 'Certified seed (G4–G5)',
          children: [
            { name: 'Certified class A' },
            { name: 'Certified class B' },
            { name: 'First reproduction' },
            { name: 'Second reproduction' },
          ],
        },
        {
          name: 'Processing varieties',
          children: [
            { name: 'Russet Burbank' },
            { name: 'Innovator' },
            { name: 'Shepody' },
            { name: 'Markies' },
            { name: 'Lady Claire' },
            { name: 'Lady Rosetta' },
            { name: 'Hermes' },
            { name: 'Atlantic' },
            { name: 'Saturna' },
            { name: 'Fontane' },
          ],
        },
        {
          name: 'Table varieties',
          children: [
            { name: 'Agria' },
            { name: 'Gala' },
            { name: 'Marfona' },
            { name: 'Spunta' },
            { name: 'Picasso' },
            { name: 'Arizona' },
            { name: 'Colomba' },
            { name: 'Queen Anne' },
            { name: 'Riviera' },
            { name: 'Impala' },
            { name: 'Bellarosa' },
            { name: 'Red Scarlett' },
            { name: 'Rosara' },
            { name: 'Nevsky' },
            { name: 'Zhukovsky ranny' },
            { name: 'Udacha' },
          ],
        },
        {
          name: 'Starch varieties',
          children: [{ name: 'Kuras' }, { name: 'Aventra' }, { name: 'Seresta' }, { name: 'Elkana' }],
        },
        {
          name: 'Seed tuber calibre grades',
          children: [
            { name: '25–35 mm' },
            { name: '28–35 mm' },
            { name: '35–45 mm' },
            { name: '45–55 mm' },
            { name: '55–60 mm' },
          ],
        },
        {
          name: 'Maturity groups',
          children: [
            { name: 'Very early (60–70 days)' },
            { name: 'Early (70–80 days)' },
            { name: 'Mid-early (80–95 days)' },
            { name: 'Mid-season (95–110 days)' },
            { name: 'Late (110+ days)' },
          ],
        },
        {
          name: 'Sprouting condition',
          children: [
            { name: 'Dormant tubers' },
            { name: 'Chitted (pre-sprouted) tubers' },
            { name: 'Cold-stored tubers' },
          ],
        },
      ],
    },
    {
      name: 'Onion picks',
      ru: 'Лук-выборок',
      children: [
        {
          name: 'Yellow onion picks',
          children: [
            { name: 'Stuttgarter Riesen' },
            { name: 'Sturon' },
            { name: 'Centurion F1' },
            { name: 'Hercules F1' },
            { name: 'Setton' },
            { name: 'Strigunovsky' },
          ],
        },
        {
          name: 'Red onion picks',
          children: [
            { name: 'Red Baron' },
            { name: 'Karmen' },
            { name: 'Red Sun' },
            { name: 'Kamal' },
          ],
        },
        {
          name: 'White onion picks',
          children: [{ name: 'Snowball' }, { name: 'Sterling F1' }, { name: 'Albion F1' }],
        },
        {
          name: 'Shallot picks',
          children: [{ name: 'Golden Gourmet' }, { name: 'Longor' }, { name: 'Kuban yellow' }],
        },
        {
          name: 'Pick calibre grades',
          children: [{ name: '24–30 mm' }, { name: '30–40 mm' }, { name: '40 mm and over' }],
        },
        {
          name: 'Planting stock classes',
          children: [
            { name: 'Elite planting stock' },
            { name: 'First reproduction' },
            { name: 'Certified planting stock' },
          ],
        },
      ],
    },
    {
      name: 'Onion sets',
      ru: 'Лук-севок',
      children: [
        {
          name: 'Yellow onion sets',
          children: [
            {
              name: 'Stuttgarter Riesen',
              children: [
                { name: '8/21 mm' },
                { name: '10/21 mm' },
                { name: '14/21 mm' },
                { name: '21/24 mm' },
                { name: '24/40 mm' },
              ],
            },
            {
              name: 'Sturon',
              children: [{ name: '10/21 mm' }, { name: '14/21 mm' }, { name: '21/24 mm' }],
            },
            {
              name: 'Centurion F1',
              children: [{ name: '10/21 mm' }, { name: '14/21 mm' }, { name: '21/24 mm' }],
            },
            { name: 'Hercules F1' },
            { name: 'Setton' },
            { name: 'Golden Ball' },
            { name: 'Strigunovsky' },
            { name: 'Bessonovsky' },
          ],
        },
        {
          name: 'Red onion sets',
          children: [
            {
              name: 'Red Baron',
              children: [{ name: '10/21 mm' }, { name: '14/21 mm' }, { name: '21/24 mm' }],
            },
            { name: 'Karmen' },
            { name: 'Red Sun' },
            { name: 'Kamal' },
          ],
        },
        {
          name: 'White onion sets',
          children: [{ name: 'Snowball' }, { name: 'Sterling F1' }, { name: 'Albion F1' }],
        },
        {
          name: 'Shallot sets',
          children: [{ name: 'Golden Gourmet' }, { name: 'Red Sun' }, { name: 'Longor' }],
        },
        {
          name: 'Heat-treated sets',
          children: [
            { name: 'Heat-treated yellow sets' },
            { name: 'Heat-treated red sets' },
            { name: 'Jet-set (bolting-resistant) sets' },
          ],
        },
        {
          name: 'Set size fractions',
          children: [
            { name: '8/14 mm' },
            { name: '14/21 mm' },
            { name: '21/24 mm' },
            { name: '24/30 mm' },
            { name: '30 mm and over' },
          ],
        },
      ],
    },
    {
      name: 'Jerusalem artichoke tubers',
      ru: 'Посадочный материал топинамбура',
      children: [
        { name: 'Interes' },
        { name: 'Skorospelka' },
        { name: 'Nadezhda' },
        { name: 'Vadim' },
        { name: 'Solnechny' },
        { name: 'Fuseau' },
        { name: 'Violet de Rennes' },
        { name: 'Stampede' },
        { name: 'Passko Red' },
        { name: 'Kyivsky bily' },
        {
          name: 'Tuber calibre grades',
          children: [{ name: '20–40 g' }, { name: '40–60 g' }, { name: '60 g and over' }],
        },
        {
          name: 'Planting stock classes',
          children: [
            { name: 'Elite planting stock' },
            { name: 'First reproduction' },
            { name: 'Certified planting stock' },
          ],
        },
      ],
    },
    {
      name: 'Perennial planting stock',
      ru: 'Посадочный материал травянистых многолетников',
      children: [
        {
          name: 'Hosta',
          children: [
            { name: 'Sum and Substance' },
            { name: 'Halcyon' },
            { name: 'Patriot' },
            { name: 'Francee' },
            { name: 'June' },
            { name: 'Blue Angel' },
          ],
        },
        {
          name: 'Daylily (Hemerocallis)',
          children: [
            { name: 'Stella de Oro' },
            { name: 'Pardon Me' },
            { name: 'Hyperion' },
            { name: 'Happy Returns' },
            { name: 'Frans Hals' },
          ],
        },
        {
          name: 'Peony (Paeonia)',
          children: [
            { name: 'Sarah Bernhardt' },
            { name: 'Karl Rosenfield' },
            { name: 'Bowl of Beauty' },
            { name: 'Duchesse de Nemours' },
            { name: 'Festiva Maxima' },
            { name: 'Coral Charm' },
          ],
        },
        {
          name: 'Iris',
          children: [
            { name: 'Bearded iris' },
            { name: 'Siberian iris' },
            { name: 'Japanese iris' },
            { name: 'Dutch bulbous iris' },
          ],
        },
        {
          name: 'Garden phlox (Phlox paniculata)',
          children: [{ name: 'Nicky' }, { name: 'David' }, { name: 'Blue Paradise' }, { name: 'Starfire' }],
        },
        {
          name: 'Astilbe',
          children: [{ name: 'Fanal' }, { name: 'Deutschland' }, { name: 'Vision in Red' }, { name: 'Bressingham Beauty' }],
        },
        {
          name: 'Heuchera',
          children: [{ name: 'Palace Purple' }, { name: 'Caramel' }, { name: 'Lime Marmalade' }, { name: 'Obsidian' }],
        },
        {
          name: 'Sedum & sempervivum',
          children: [{ name: 'Sedum Herbstfreude' }, { name: 'Sedum spurium' }, { name: 'Sempervivum tectorum' }],
        },
        {
          name: 'Echinacea',
          children: [{ name: 'Purpurea Magnus' }, { name: 'White Swan' }, { name: 'Sombrero series' }],
        },
        {
          name: 'Lavender',
          children: [{ name: 'Hidcote' }, { name: 'Munstead' }, { name: 'Grosso' }, { name: 'Provence' }],
        },
        {
          name: 'Ornamental grasses',
          children: [
            { name: 'Miscanthus sinensis' },
            { name: 'Calamagrostis Karl Foerster' },
            { name: 'Pennisetum alopecuroides' },
            { name: 'Festuca glauca' },
          ],
        },
        {
          name: 'Delphinium & aquilegia',
          children: [{ name: 'Delphinium Pacific Giants' }, { name: 'Delphinium Magic Fountains' }, { name: 'Aquilegia vulgaris' }],
        },
        {
          name: 'Plant forms & grades',
          children: [
            { name: 'Bare-root divisions' },
            { name: 'Plug plants (P9)' },
            { name: 'Container-grown 1 L' },
            { name: 'Container-grown 2 L' },
            { name: 'Tissue-culture liners' },
          ],
        },
      ],
    },
    {
      name: 'Wild strawberry seedlings',
      ru: 'Рассада земляники',
      children: [
        {
          name: 'Alpine everbearing cultivars',
          children: [
            { name: 'Alexandria' },
            { name: 'Ruegen' },
            { name: 'Baron Solemacher' },
            { name: 'Mignonette' },
            { name: 'Regina' },
          ],
        },
        {
          name: 'White & yellow-fruited cultivars',
          children: [{ name: 'Yellow Wonder' }, { name: 'White Soul' }, { name: 'Pineapple Crush' }],
        },
        {
          name: 'Runnering woodland types',
          children: [{ name: 'Ali Baba' }, { name: 'Lesnaya skazka' }],
        },
        {
          name: 'Plant grades',
          children: [
            { name: 'Frigo A+' },
            { name: 'Frigo A' },
            { name: 'Plug plants (P9)' },
            { name: 'Bare-root seedlings' },
            { name: 'Seed-raised tray seedlings' },
          ],
        },
      ],
    },
    {
      name: 'Strawberry seedlings',
      ru: 'Рассада клубники',
      children: [
        {
          name: 'June-bearing (short-day) cultivars',
          children: [
            { name: 'Elsanta' },
            { name: 'Honeoye' },
            { name: 'Clery' },
            { name: 'Sonata' },
            { name: 'Darselect' },
            { name: 'Asia' },
            { name: 'Marmolada' },
            { name: 'Korona' },
            { name: 'Polka' },
            { name: 'Zefir' },
            { name: 'Chandler' },
            { name: 'Camarosa' },
            { name: 'Sweet Charlie' },
            { name: 'Vima Kimberly' },
          ],
        },
        {
          name: 'Everbearing / day-neutral cultivars',
          children: [
            { name: 'Albion' },
            { name: 'San Andreas' },
            { name: 'Portola' },
            { name: 'Monterey' },
            { name: 'Seascape' },
            { name: 'Aromas' },
            { name: 'Selva' },
            { name: 'Mara des Bois' },
            { name: 'Evie 2' },
            { name: 'Furore' },
          ],
        },
        {
          name: 'Propagation classes',
          children: [
            { name: 'Nuclear stock' },
            { name: 'Pre-basic plants' },
            { name: 'Basic plants' },
            { name: 'Certified A plants' },
          ],
        },
        {
          name: 'Plant grades',
          children: [
            { name: 'Frigo A+ (12–15 mm)' },
            { name: 'Frigo A (9–12 mm)' },
            { name: 'Frigo A- (6–9 mm)' },
            { name: 'Waiting-bed (WB) plants' },
            { name: 'Tray plants' },
            { name: 'Plug plants' },
            { name: 'Fresh runner tips' },
          ],
        },
      ],
    },
    {
      name: 'Flower seedlings',
      ru: 'Рассада цветочных культур',
      children: [
        {
          name: 'Petunia',
          children: [
            { name: 'Grandiflora' },
            { name: 'Multiflora' },
            { name: 'Milliflora' },
            { name: 'Surfinia trailing' },
            { name: 'Calibrachoa' },
          ],
        },
        {
          name: 'Marigold (Tagetes)',
          children: [{ name: 'French marigold' }, { name: 'African marigold' }, { name: 'Signet marigold' }],
        },
        {
          name: 'Begonia',
          children: [{ name: 'Semperflorens' }, { name: 'Tuberous begonia' }, { name: 'Elatior begonia' }, { name: 'Boliviensis' }],
        },
        {
          name: 'Pelargonium',
          children: [{ name: 'Zonal pelargonium' }, { name: 'Ivy-leaved pelargonium' }, { name: 'Regal pelargonium' }],
        },
        {
          name: 'Impatiens',
          children: [{ name: 'Impatiens walleriana' }, { name: 'New Guinea impatiens' }, { name: 'SunPatiens' }],
        },
        {
          name: 'Viola & pansy',
          children: [{ name: 'Large-flowered pansy' }, { name: 'Viola cornuta' }, { name: 'Trailing viola' }],
        },
        {
          name: 'Chrysanthemum',
          children: [{ name: 'Pot mums' }, { name: 'Cut-flower spray mums' }, { name: 'Garden korean mums' }],
        },
        {
          name: 'Aster (Callistephus)',
          children: [{ name: 'Princess type' }, { name: 'Pompon type' }, { name: 'Needle type' }],
        },
        { name: 'Salvia' },
        { name: 'Zinnia' },
        { name: 'Lobelia' },
        { name: 'Verbena' },
        { name: 'Celosia' },
        { name: 'Coleus' },
        { name: 'Gazania' },
        { name: 'Alyssum' },
        { name: 'Cyclamen' },
        { name: 'Primula' },
        { name: 'Snapdragon (Antirrhinum)' },
        { name: 'Dahlia' },
        {
          name: 'Plug & liner grades',
          children: [
            { name: 'Plug tray 288-cell' },
            { name: 'Plug tray 144-cell' },
            { name: 'Plug tray 104-cell' },
            { name: 'Potted liner P9' },
            { name: 'Hanging-basket ready plants' },
            { name: 'Finished pot plants' },
          ],
        },
      ],
    },
    {
      name: 'Apricot saplings',
      ru: 'Саженцы абрикоса',
      children: [
        {
          name: 'Bergeron',
          children: [
            { name: 'Myrobalan seedling rootstock' },
            { name: 'Torinel rootstock' },
            { name: 'Wavit rootstock' },
            { name: 'GF 677 rootstock' },
          ],
        },
        {
          name: 'Bulida',
          children: [
            { name: 'Myrobalan seedling rootstock' },
            { name: 'GF 677 rootstock' },
            { name: 'Apricot seedling rootstock' },
          ],
        },
        {
          name: 'Canino',
          children: [
            { name: 'Myrobalan seedling rootstock' },
            { name: 'GF 677 rootstock' },
            { name: 'Marianna GF 8-1 rootstock' },
          ],
        },
        {
          name: 'Ninfa',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Torinel rootstock' }, { name: 'GF 677 rootstock' }],
        },
        {
          name: 'Orange Red',
          children: [{ name: 'Myrobalan 29C rootstock' }, { name: 'Torinel rootstock' }, { name: 'GF 677 rootstock' }],
        },
        {
          name: 'Farbaly',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Wavit rootstock' }],
        },
        {
          name: 'Goldrich',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Saint Julien A rootstock' }],
        },
        {
          name: 'Harcot',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Wavit rootstock' }],
        },
        {
          name: 'Krasnoshchyoky',
          children: [{ name: 'Apricot seedling rootstock' }, { name: 'Myrobalan seedling rootstock' }, { name: 'Blackthorn rootstock' }],
        },
        {
          name: 'Shalakh',
          children: [{ name: 'Apricot seedling rootstock' }, { name: 'Myrobalan seedling rootstock' }],
        },
        {
          name: 'Lasgerdi',
          children: [{ name: 'Apricot seedling rootstock' }, { name: 'GF 677 rootstock' }],
        },
        {
          name: 'Tsarsky',
          children: [{ name: 'Apricot seedling rootstock' }, { name: 'Myrobalan seedling rootstock' }],
        },
        {
          name: 'Tree grades & forms',
          children: [
            { name: 'Bare-root 1-year whip' },
            { name: 'Bare-root 2-year branched' },
            { name: 'Container-grown C7.5' },
            { name: 'Container-grown C15' },
            { name: 'Half-standard form' },
            { name: 'Columnar form' },
          ],
        },
      ],
    },
    {
      name: 'Blueberry saplings',
      ru: 'Саженцы голубики',
      children: [
        {
          name: 'Northern highbush cultivars',
          children: [
            { name: 'Duke' },
            { name: 'Bluecrop' },
            { name: 'Bluegold' },
            { name: 'Draper' },
            { name: 'Liberty' },
            { name: 'Elliott' },
            { name: 'Patriot' },
            { name: 'Spartan' },
            { name: 'Chandler' },
            { name: 'Aurora' },
            { name: 'Toro' },
            { name: 'Nelson' },
            { name: 'Brigitta Blue' },
            { name: 'Reka' },
          ],
        },
        {
          name: 'Southern highbush cultivars',
          children: [
            { name: 'Emerald' },
            { name: 'Star' },
            { name: 'Biloxi' },
            { name: 'Misty' },
            { name: 'Snowchaser' },
            { name: 'Sunshine Blue' },
            { name: 'Legacy' },
          ],
        },
        {
          name: 'Rabbiteye cultivars',
          children: [{ name: 'Powderblue' }, { name: 'Brightwell' }, { name: 'Premier' }, { name: 'Climax' }],
        },
        {
          name: 'Half-high & lowbush cultivars',
          children: [{ name: 'Northland' }, { name: 'Northblue' }, { name: 'Top Hat' }, { name: 'Polaris' }],
        },
        {
          name: 'Plant grades',
          children: [
            { name: 'Micropropagated plug' },
            { name: 'Container C1' },
            { name: 'Container C2' },
            { name: 'Container C5' },
            { name: 'Container C10' },
            { name: 'Bare-root 2-year' },
          ],
        },
        {
          name: 'Propagation type',
          children: [
            { name: 'Tissue-culture (in-vitro) plants' },
            { name: 'Softwood cutting plants' },
            { name: 'Hardwood cutting plants' },
          ],
        },
      ],
    },
    {
      name: 'Ornamental saplings',
      ru: 'Саженцы декоративных культур',
      children: [
        {
          name: 'Deciduous shade trees',
          children: [
            { name: 'Acer platanoides' },
            { name: 'Tilia cordata' },
            { name: 'Betula pendula' },
            { name: 'Quercus robur' },
            { name: 'Fraxinus excelsior' },
            { name: 'Aesculus hippocastanum' },
            { name: 'Sorbus aucuparia' },
            { name: 'Catalpa bignonioides' },
            { name: 'Platanus acerifolia' },
          ],
        },
        {
          name: 'Flowering ornamental trees',
          children: [
            { name: 'Prunus serrulata Kanzan' },
            { name: 'Malus Royalty' },
            { name: 'Malus Rudolph' },
            { name: 'Crataegus laevigata Rubra Plena' },
            { name: 'Cercis canadensis' },
            { name: 'Magnolia soulangeana' },
          ],
        },
        {
          name: 'Conifers',
          children: [
            { name: 'Thuja occidentalis Smaragd' },
            { name: 'Thuja occidentalis Brabant' },
            { name: 'Picea pungens Glauca' },
            { name: 'Picea abies' },
            { name: 'Juniperus horizontalis' },
            { name: 'Juniperus scopulorum Skyrocket' },
            { name: 'Pinus mugo' },
            { name: 'Abies concolor' },
            { name: 'Larix decidua' },
          ],
        },
        {
          name: 'Ornamental shrubs',
          children: [
            { name: 'Hydrangea paniculata' },
            { name: 'Hydrangea macrophylla' },
            { name: 'Spiraea japonica' },
            { name: 'Weigela florida' },
            { name: 'Forsythia intermedia' },
            { name: 'Philadelphus coronarius' },
            { name: 'Berberis thunbergii' },
            { name: 'Cornus alba' },
            { name: 'Viburnum opulus' },
            { name: 'Syringa vulgaris' },
            { name: 'Physocarpus opulifolius' },
          ],
        },
        {
          name: 'Garden roses',
          children: [
            { name: 'Hybrid tea roses' },
            { name: 'Floribunda roses' },
            { name: 'Climbing roses' },
            { name: 'Shrub & English roses' },
            { name: 'Ground-cover roses' },
            { name: 'Standard (tree) roses' },
          ],
        },
        {
          name: 'Hedging plants',
          children: [
            { name: 'Thuja occidentalis hedging' },
            { name: 'Ligustrum vulgare' },
            { name: 'Carpinus betulus' },
            { name: 'Buxus sempervirens' },
            { name: 'Cotoneaster lucidus' },
            { name: 'Fagus sylvatica' },
          ],
        },
        {
          name: 'Climbers',
          children: [
            { name: 'Clematis' },
            { name: 'Parthenocissus quinquefolia' },
            { name: 'Wisteria sinensis' },
            { name: 'Campsis radicans' },
            { name: 'Lonicera caprifolium' },
          ],
        },
        {
          name: 'Plant grades & forms',
          children: [
            { name: 'Bare-root whips' },
            { name: 'Root-balled (B&B)' },
            { name: 'Container C3' },
            { name: 'Container C10' },
            { name: 'Container C25' },
            { name: 'Multi-stem form' },
            { name: 'Standard with clear stem' },
            { name: 'Topiary & shaped forms' },
          ],
        },
      ],
    },
    {
      name: 'Raspberry saplings',
      ru: 'Саженцы малины',
      children: [
        {
          name: 'Summer-fruiting (floricane) cultivars',
          children: [
            { name: 'Tulameen' },
            { name: 'Glen Ample' },
            { name: 'Meeker' },
            { name: 'Willamette' },
            { name: 'Cascade Delight' },
            { name: 'Octavia' },
            { name: 'Laszka' },
            { name: 'Radziejowa' },
            { name: 'Sokolica' },
            { name: 'Malling Jewel' },
          ],
        },
        {
          name: 'Autumn-fruiting (primocane) cultivars',
          children: [
            { name: 'Polka' },
            { name: 'Polana' },
            { name: 'Heritage' },
            { name: 'Autumn Bliss' },
            { name: 'Himbo Top' },
            { name: 'Joan J' },
            { name: 'Kwanza' },
            { name: 'Enrosadira' },
            { name: 'Imara' },
            { name: 'Delniwa' },
          ],
        },
        {
          name: 'Black & purple raspberry cultivars',
          children: [{ name: 'Cumberland' }, { name: 'Jewel' }, { name: 'Bristol' }, { name: 'Royalty' }],
        },
        {
          name: 'Yellow raspberry cultivars',
          children: [{ name: 'Fallgold' }, { name: 'Anne' }, { name: 'Zheltyi Gigant' }, { name: 'Golden Bliss' }],
        },
        {
          name: 'Plant grades',
          children: [
            { name: 'Bare-root canes' },
            { name: 'Long canes' },
            { name: 'Tissue-culture plugs' },
            { name: 'Container C2' },
            { name: 'Root cuttings' },
          ],
        },
      ],
    },
    {
      name: 'Sea buckthorn saplings',
      ru: 'Саженцы облепихи',
      children: [
        {
          name: 'Female fruiting cultivars',
          children: [
            { name: 'Chuyskaya' },
            { name: 'Botanicheskaya' },
            { name: 'Velikan' },
            { name: 'Avgustinka' },
            { name: 'Elizaveta' },
            { name: 'Zhemchuzhnitsa' },
            { name: 'Otradnaya' },
            { name: 'Moskvichka' },
            { name: 'Leikora' },
            { name: 'Hergo' },
            { name: 'Askola' },
            { name: 'Frugana' },
          ],
        },
        {
          name: 'Male pollinator cultivars',
          children: [{ name: 'Alei' }, { name: 'Gnom' }, { name: 'Pollmix' }, { name: 'Hikul' }],
        },
        {
          name: 'Thornless selections',
          children: [{ name: 'Chuyskaya' }, { name: 'Velikan' }, { name: 'Botanicheskaya lyubitelskaya' }],
        },
        {
          name: 'Propagation type & grades',
          children: [
            { name: 'Own-root green cuttings' },
            { name: 'Hardwood cutting plants' },
            { name: 'Grafted 2-year trees' },
            { name: 'Bare-root 1-year' },
            { name: 'Container C3' },
          ],
        },
      ],
    },
    {
      name: 'Peach saplings',
      ru: 'Саженцы персика',
      children: [
        {
          name: 'Redhaven',
          children: [
            { name: 'GF 677 rootstock' },
            { name: 'Peach seedling rootstock' },
            { name: 'Nemaguard rootstock' },
            { name: 'Rootpac-R rootstock' },
          ],
        },
        {
          name: 'Cresthaven',
          children: [{ name: 'GF 677 rootstock' }, { name: 'Peach seedling rootstock' }, { name: 'Nemaguard rootstock' }],
        },
        {
          name: 'Elberta',
          children: [{ name: 'Peach seedling rootstock' }, { name: 'Nemaguard rootstock' }],
        },
        {
          name: 'Royal Glory',
          children: [{ name: 'GF 677 rootstock' }, { name: 'Rootpac-R rootstock' }, { name: 'Saint Julien A rootstock' }],
        },
        {
          name: 'Springcrest',
          children: [{ name: 'GF 677 rootstock' }, { name: 'Peach seedling rootstock' }],
        },
        {
          name: 'Suncrest',
          children: [{ name: 'GF 677 rootstock' }, { name: 'Peach seedling rootstock' }],
        },
        {
          name: 'Kievsky ranny',
          children: [{ name: 'Peach seedling rootstock' }, { name: 'Myrobalan seedling rootstock' }],
        },
        {
          name: 'Belyi Lebed',
          children: [{ name: 'Peach seedling rootstock' }, { name: 'Almond-peach hybrid rootstock' }],
        },
        {
          name: 'Flat (donut) peaches',
          children: [{ name: 'Saturn' }, { name: 'UFO-3' }, { name: 'Sweet Cap' }, { name: 'Platicarpa' }],
        },
        {
          name: 'Nectarine cultivars',
          children: [
            { name: 'Big Top' },
            { name: 'Fantasia' },
            { name: 'Nectared 4' },
            { name: 'Independence' },
            { name: 'Stark Red Gold' },
          ],
        },
        {
          name: 'Tree grades & forms',
          children: [
            { name: 'Bare-root 1-year whip' },
            { name: 'Bare-root 2-year branched' },
            { name: 'Container-grown C7.5' },
            { name: 'Container-grown C15' },
            { name: 'Bush form' },
            { name: 'Half-standard form' },
          ],
        },
      ],
    },
    {
      name: 'Plum saplings',
      ru: 'Саженцы сливы',
      children: [
        {
          name: 'Stanley',
          children: [
            { name: 'Myrobalan seedling rootstock' },
            { name: 'Saint Julien A rootstock' },
            { name: 'VVA-1 rootstock' },
            { name: 'Wavit rootstock' },
          ],
        },
        {
          name: 'President',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Saint Julien A rootstock' }, { name: 'Pixy rootstock' }],
        },
        {
          name: 'Cacanska Lepotica',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Wavit rootstock' }, { name: 'VVA-1 rootstock' }],
        },
        {
          name: 'Cacanska Rodna',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Saint Julien A rootstock' }],
        },
        {
          name: 'Victoria',
          children: [{ name: 'Saint Julien A rootstock' }, { name: 'Pixy rootstock' }, { name: 'Myrobalan seedling rootstock' }],
        },
        {
          name: 'Opal',
          children: [{ name: 'Saint Julien A rootstock' }, { name: 'Pixy rootstock' }],
        },
        {
          name: 'Jojo',
          children: [{ name: 'Wavit rootstock' }, { name: 'Saint Julien A rootstock' }],
        },
        {
          name: 'Top Hit',
          children: [{ name: 'Wavit rootstock' }, { name: 'VVA-1 rootstock' }],
        },
        {
          name: 'Hungarian domestic plum',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Plum seedling rootstock' }, { name: 'VVA-1 rootstock' }],
        },
        {
          name: 'Anna Spath',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Saint Julien A rootstock' }],
        },
        {
          name: 'Renklod Altana',
          children: [{ name: 'Myrobalan seedling rootstock' }, { name: 'Plum seedling rootstock' }],
        },
        {
          name: 'Mirabelle de Nancy',
          children: [{ name: 'Saint Julien A rootstock' }, { name: 'Myrobalan seedling rootstock' }],
        },
        {
          name: 'Japanese plum cultivars',
          children: [
            { name: 'Santa Rosa' },
            { name: 'Black Amber' },
            { name: 'Angeleno' },
            { name: 'Fortune' },
            { name: 'Friar' },
          ],
        },
        {
          name: 'Damson & bullace',
          children: [{ name: 'Merryweather Damson' }, { name: 'Shropshire Prune' }],
        },
        {
          name: 'Tree grades & forms',
          children: [
            { name: 'Bare-root 1-year whip' },
            { name: 'Bare-root 2-year branched' },
            { name: 'Container-grown C7.5' },
            { name: 'Container-grown C15' },
            { name: 'Half-standard form' },
            { name: 'Columnar form' },
          ],
        },
      ],
    },
    {
      name: 'Apple saplings',
      ru: 'Саженцы яблони',
      children: [
        {
          name: 'Gala',
          children: [
            { name: 'M9 rootstock' },
            { name: 'M26 rootstock' },
            { name: 'MM106 rootstock' },
            { name: 'B9 (Budagovsky) rootstock' },
            { name: 'Seedling (Antonovka) rootstock' },
          ],
        },
        {
          name: 'Fuji',
          children: [
            { name: 'M9 rootstock' },
            { name: 'M26 rootstock' },
            { name: 'MM106 rootstock' },
            { name: 'M7 rootstock' },
          ],
        },
        {
          name: 'Golden Delicious',
          children: [
            { name: 'M9 rootstock' },
            { name: 'M26 rootstock' },
            { name: 'MM106 rootstock' },
            { name: 'MM111 rootstock' },
            { name: 'Seedling (Antonovka) rootstock' },
          ],
        },
        {
          name: 'Red Delicious',
          children: [{ name: 'M9 rootstock' }, { name: 'MM106 rootstock' }, { name: 'MM111 rootstock' }],
        },
        {
          name: 'Granny Smith',
          children: [{ name: 'M9 rootstock' }, { name: 'M26 rootstock' }, { name: 'MM106 rootstock' }],
        },
        {
          name: 'Braeburn',
          children: [{ name: 'M9 rootstock' }, { name: 'M26 rootstock' }, { name: 'MM106 rootstock' }],
        },
        {
          name: 'Honeycrisp',
          children: [
            { name: 'M9 rootstock' },
            { name: 'G.11 rootstock' },
            { name: 'G.41 rootstock' },
            { name: 'MM106 rootstock' },
          ],
        },
        {
          name: 'Jonagold',
          children: [{ name: 'M9 rootstock' }, { name: 'M26 rootstock' }, { name: 'MM106 rootstock' }],
        },
        {
          name: 'Idared',
          children: [
            { name: 'M9 rootstock' },
            { name: 'M26 rootstock' },
            { name: '54-118 rootstock' },
            { name: 'Seedling (Antonovka) rootstock' },
          ],
        },
        {
          name: 'Elstar',
          children: [{ name: 'M9 rootstock' }, { name: 'M26 rootstock' }, { name: 'MM106 rootstock' }],
        },
        {
          name: 'Cripps Pink',
          children: [{ name: 'M9 rootstock' }, { name: 'MM106 rootstock' }, { name: 'M26 rootstock' }],
        },
        {
          name: 'Ligol',
          children: [{ name: 'M9 rootstock' }, { name: 'M26 rootstock' }, { name: '62-396 rootstock' }],
        },
        {
          name: 'Champion',
          children: [{ name: 'M9 rootstock' }, { name: 'M26 rootstock' }, { name: '62-396 rootstock' }],
        },
        {
          name: 'Gloster',
          children: [{ name: 'M9 rootstock' }, { name: 'MM106 rootstock' }],
        },
        {
          name: 'Mutsu',
          children: [{ name: 'M9 rootstock' }, { name: 'MM106 rootstock' }, { name: 'MM111 rootstock' }],
        },
        {
          name: 'Antonovka',
          children: [
            { name: 'Seedling (Antonovka) rootstock' },
            { name: '54-118 rootstock' },
            { name: '62-396 rootstock' },
            { name: 'B9 (Budagovsky) rootstock' },
          ],
        },
        {
          name: 'Renet Simirenko',
          children: [{ name: 'M9 rootstock' }, { name: 'MM106 rootstock' }, { name: '54-118 rootstock' }],
        },
        {
          name: 'Melba',
          children: [{ name: 'Seedling (Antonovka) rootstock' }, { name: '54-118 rootstock' }, { name: 'M26 rootstock' }],
        },
        {
          name: 'Sinap Orlovsky',
          children: [{ name: 'Seedling (Antonovka) rootstock' }, { name: '62-396 rootstock' }, { name: '54-118 rootstock' }],
        },
        {
          name: 'Zhigulevskoye',
          children: [{ name: 'Seedling (Antonovka) rootstock' }, { name: '54-118 rootstock' }],
        },
        {
          name: 'Bogatyr',
          children: [{ name: 'Seedling (Antonovka) rootstock' }, { name: '62-396 rootstock' }],
        },
        {
          name: 'Florina',
          children: [{ name: 'M9 rootstock' }, { name: 'MM106 rootstock' }],
        },
        {
          name: 'Crab apple pollinators',
          children: [{ name: 'Malus Evereste' }, { name: 'Malus Golden Hornet' }, { name: 'Malus Professor Sprenger' }],
        },
        {
          name: 'Tree grades & forms',
          children: [
            { name: 'Bare-root 1-year whip' },
            { name: 'Bare-root 2-year feathered' },
            { name: 'Knip-boom trees' },
            { name: 'Container-grown C7.5' },
            { name: 'Container-grown C15' },
            { name: 'Columnar (ballerina) form' },
            { name: 'Half-standard form' },
            { name: 'Espalier & trained forms' },
          ],
        },
        {
          name: 'Rootstock liners',
          children: [
            { name: 'M9 stoolbed liners' },
            { name: 'M26 stoolbed liners' },
            { name: 'MM106 stoolbed liners' },
            { name: 'B9 stoolbed liners' },
            { name: 'Antonovka seedling liners' },
          ],
        },
      ],
    },
    {
      name: 'Vetch seeds',
      ru: 'Семена вики',
      children: [
        {
          name: 'Common vetch (Vicia sativa) varieties',
          children: [
            { name: 'Lgovskaya 22' },
            { name: 'Lugovskaya 425' },
            { name: 'Nemchinovskaya 72' },
            { name: 'Orlovskaya 96' },
            { name: 'Uzunovskaya' },
          ],
        },
        {
          name: 'Hairy (winter) vetch (Vicia villosa) varieties',
          children: [
            { name: 'Glinkovskaya' },
            { name: 'Lugovskaya 2' },
            { name: 'Luna' },
            { name: 'Villana' },
          ],
        },
        { name: 'Hungarian vetch (Vicia pannonica) varieties' },
        { name: 'Vetch–oat mixture seed' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated & inoculated seed',
          children: [
            { name: 'Rhizobium-inoculated seed' },
            { name: 'Fungicide-dressed seed' },
            { name: 'Untreated seed' },
          ],
        },
      ],
    },
    {
      name: 'Pea seeds',
      ru: 'Семена гороха',
      children: [
        {
          name: 'Field (fodder) pea varieties',
          children: [
            { name: 'Rokey' },
            { name: 'Astronaut' },
            { name: 'Salamanca' },
            { name: 'Rocket' },
            { name: 'Aksaysky usaty 55' },
            { name: 'Nemchinovsky 100' },
            { name: 'Amior' },
          ],
        },
        {
          name: 'Shelling (green) pea varieties',
          children: [
            { name: 'Alfa' },
            { name: 'Vera' },
            { name: 'Premium' },
            { name: 'Avola' },
            { name: 'Ambrosia' },
            { name: 'Little Marvel' },
            { name: 'Onward' },
          ],
        },
        {
          name: 'Snap & snow pea varieties',
          children: [
            { name: 'Sugar Ann' },
            { name: 'Sugar Snap' },
            { name: 'Oregon Sugar Pod II' },
            { name: 'Zhegalova 112' },
          ],
        },
        {
          name: 'Marrowfat pea varieties',
          children: [{ name: 'Maro' }, { name: 'Sakura' }],
        },
        { name: 'Winter (autumn-sown) pea varieties' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated & inoculated seed',
          children: [
            { name: 'Rhizobium-inoculated seed' },
            { name: 'Fungicide-dressed seed' },
            { name: 'Insecticide-treated seed' },
            { name: 'Untreated seed' },
          ],
        },
      ],
    },
    {
      name: 'Mustard seeds',
      ru: 'Семена горчицы',
      children: [
        {
          name: 'White mustard (Sinapis alba) varieties',
          children: [
            { name: 'Raduga' },
            { name: 'Luchistaya' },
            { name: 'Rapsodiya' },
            { name: 'Belgiyskaya' },
          ],
        },
        {
          name: 'Sarepta (brown) mustard (Brassica juncea) varieties',
          children: [
            { name: 'Slavyanka' },
            { name: 'Rossiyanka' },
            { name: 'Yuzhanka 15' },
            { name: 'Donskaya 8' },
            { name: 'Ruslana' },
          ],
        },
        { name: 'Black mustard (Brassica nigra) varieties' },
        { name: 'Green-manure cover-crop mustard' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
      ],
    },
    {
      name: 'Coriander seeds',
      ru: 'Семена кориандра',
      children: [
        {
          name: 'Grain (spice) coriander varieties',
          children: [
            { name: 'Alekseevsky 190' },
            { name: 'Yantar' },
            { name: 'Silach' },
            { name: 'Medun' },
            { name: 'Nektar' },
            { name: 'Luch' },
          ],
        },
        {
          name: 'Leaf (cilantro) varieties',
          children: [
            { name: 'Santo' },
            { name: 'Slowbolt' },
            { name: 'Calypso' },
            { name: 'Karibe' },
            { name: 'Borodinsky' },
          ],
        },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Seed preparation',
          children: [{ name: 'Whole (split) planting seed' }, { name: 'Primed seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Corn seeds',
      ru: 'Семена кукурузы',
      children: [
        {
          name: 'Single-cross grain hybrids',
          children: [
            { name: 'Pioneer P7524' },
            { name: 'Pioneer P8521' },
            { name: 'Pioneer P9074' },
            { name: 'DKC 3151' },
            { name: 'DKC 3969' },
            { name: 'DKC 4014' },
            { name: 'NK Falkone' },
            { name: 'SY Talisman' },
            { name: 'LG 30179' },
            { name: 'LG 31207' },
            { name: 'Krasnodarsky 194 MV' },
            { name: 'Ross 199 MV' },
          ],
        },
        {
          name: 'Three-way & double-cross hybrids',
          children: [
            { name: 'Krasnodarsky 385 MV' },
            { name: 'Kubansky 247 MV' },
            { name: 'Mashuk 220 MV' },
            { name: 'Mashuk 185 MV' },
          ],
        },
        {
          name: 'Open-pollinated & population varieties',
          children: [{ name: 'Voronezhskaya 76' }, { name: 'Bemo 182 SV' }, { name: 'Belozernaya 1' }],
        },
        {
          name: 'Silage hybrids by FAO maturity',
          children: [
            { name: 'FAO 150–200' },
            { name: 'FAO 200–300' },
            { name: 'FAO 300–400' },
            { name: 'FAO 400–500' },
          ],
        },
        {
          name: 'Grain hybrids by FAO maturity',
          children: [
            { name: 'FAO 150–200' },
            { name: 'FAO 200–300' },
            { name: 'FAO 300–400' },
            { name: 'FAO 400–500' },
            { name: 'FAO 500 and over' },
          ],
        },
        {
          name: 'Sweet corn',
          children: [
            {
              name: 'Normal sugary (su)',
              children: [{ name: 'Lakomka 121' }, { name: 'Zolotoy pochatok' }, { name: 'Early Xtra Sweet' }],
            },
            {
              name: 'Sugary enhanced (se)',
              children: [{ name: 'Bonus F1' }, { name: 'Spirit F1' }, { name: 'Trophy F1' }],
            },
            {
              name: 'Supersweet (sh2)',
              children: [{ name: 'Overland F1' }, { name: 'Megaton F1' }, { name: 'Challenger F1' }, { name: 'GH 2547 F1' }],
            },
          ],
        },
        {
          name: 'Popcorn hybrids',
          children: [{ name: 'Ping-pong' }, { name: 'Vulkan' }, { name: 'Zeya' }],
        },
        { name: 'Waxy corn hybrids' },
        { name: 'High-lysine (opaque-2) hybrids' },
        {
          name: 'Parent lines & inbreds',
          children: [{ name: 'Male sterile analogue lines' }, { name: 'Restorer lines' }, { name: 'Inbred female lines' }],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated (dressed) seed',
          children: [
            { name: 'Fungicide-dressed seed' },
            { name: 'Insecticide-treated seed' },
            { name: 'Film-coated seed' },
            { name: 'Untreated seed' },
          ],
        },
        {
          name: 'Seed size grades',
          children: [
            { name: 'Flat large' },
            { name: 'Flat medium' },
            { name: 'Flat small' },
            { name: 'Round large' },
            { name: 'Round medium' },
          ],
        },
      ],
    },
    {
      name: 'Onion seeds',
      ru: 'Семена лука',
      children: [
        {
          name: 'Long-day hybrids (F1)',
          children: [
            { name: 'Centurion F1' },
            { name: 'Hercules F1' },
            { name: 'Talon F1' },
            { name: 'Bonus F1' },
            { name: 'Spirit F1' },
          ],
        },
        {
          name: 'Intermediate-day hybrids (F1)',
          children: [{ name: 'Bennito F1' }, { name: 'Manas F1' }, { name: 'Poseidon F1' }],
        },
        {
          name: 'Short-day varieties',
          children: [{ name: 'Texas Early Grano 502' }, { name: 'Granex 33' }, { name: 'Red Creole' }],
        },
        {
          name: 'Open-pollinated yellow varieties',
          children: [
            { name: 'Stuttgarter Riesen' },
            { name: 'Strigunovsky' },
            { name: 'Bessonovsky' },
            { name: 'Khalcedon' },
            { name: 'Myachkovsky 300' },
            { name: 'Danilovsky 301' },
          ],
        },
        {
          name: 'Red onion varieties',
          children: [{ name: 'Red Baron' }, { name: 'Karmen' }, { name: 'Bombay Red' }, { name: 'Retro F1' }],
        },
        {
          name: 'Bunching onion (Allium fistulosum)',
          children: [{ name: 'Performer' }, { name: 'Parade' }, { name: 'Ishikura' }, { name: 'Baikal' }],
        },
        {
          name: 'Leek seed',
          children: [{ name: 'Columbus' }, { name: 'Kilima' }, { name: 'Bandit' }, { name: 'Carentan' }],
        },
        {
          name: 'Shallot seed',
          children: [{ name: 'Ambition F1' }, { name: 'Matador F1' }, { name: 'Conservor F1' }],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Seed preparation',
          children: [
            { name: 'Pelleted seed' },
            { name: 'Primed seed' },
            { name: 'Film-coated seed' },
            { name: 'Raw graded seed' },
          ],
        },
      ],
    },
    {
      name: 'Flax seeds',
      ru: 'Семена льна',
      children: [
        {
          name: 'Oil flax (linseed) varieties',
          children: [
            { name: 'VNIIMK 620' },
            { name: 'Severny' },
            { name: 'Uralsky' },
            { name: 'Lirina' },
            { name: 'Flanders' },
            { name: 'Recital' },
          ],
        },
        {
          name: 'Golden (yellow-seeded) linseed varieties',
          children: [{ name: 'Solnechny' }, { name: 'Zolotisty' }],
        },
        {
          name: 'Fibre flax varieties',
          children: [
            { name: 'Alexim' },
            { name: 'Tomsky 18' },
            { name: 'Mogilevsky 2' },
            { name: 'Antey' },
          ],
        },
        { name: 'Dual-purpose flax varieties' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated seed',
          children: [{ name: 'Fungicide-dressed seed' }, { name: 'Film-coated seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Mung bean seeds',
      ru: 'Семена маша',
      children: [
        {
          name: 'Green gram varieties',
          children: [
            { name: 'Pusa Vishal' },
            { name: 'IPM 02-14' },
            { name: 'SML 668' },
            { name: 'Samrat' },
            { name: 'TARM-1' },
          ],
        },
        { name: 'Sprouting-grade planting seed' },
        { name: 'Green-manure & fodder mung' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated & inoculated seed',
          children: [{ name: 'Rhizobium-inoculated seed' }, { name: 'Fungicide-dressed seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Oat seeds',
      ru: 'Семена овса',
      children: [
        {
          name: 'Husked (covered) spring oat varieties',
          children: [
            { name: 'Skakun' },
            { name: 'Krechet' },
            { name: 'Konkur' },
            { name: 'Lev' },
            { name: 'Bulany' },
            { name: 'Rysak' },
            { name: 'Argamak' },
            { name: 'Borrus' },
          ],
        },
        {
          name: 'Naked (hulless) oat varieties',
          children: [{ name: 'Vyatsky' }, { name: 'Tyumensky golozerny' }, { name: 'Nemchinovsky 61' }],
        },
        { name: 'Winter oat varieties' },
        { name: 'Fodder & green-mass oat varieties' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated seed',
          children: [{ name: 'Fungicide-dressed seed' }, { name: 'Insecticide-treated seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Parsley seeds',
      ru: 'Семена петрушки',
      children: [
        {
          name: 'Curled leaf parsley varieties',
          children: [
            { name: 'Moss Curled' },
            { name: 'Astra' },
            { name: 'Kudryavets' },
            { name: 'Bravo' },
            { name: 'Esmeralda' },
          ],
        },
        {
          name: 'Flat-leaf (Italian) parsley varieties',
          children: [
            { name: 'Gigante di Napoli' },
            { name: 'Bogatyr' },
            { name: 'Titan' },
            { name: 'Karnaval' },
          ],
        },
        {
          name: 'Root parsley varieties',
          children: [
            { name: 'Sakharnaya' },
            { name: 'Urozhaynaya' },
            { name: 'Alba' },
            { name: 'Berlinskaya' },
            { name: 'Final' },
            { name: 'Eagle' },
          ],
        },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Seed preparation',
          children: [{ name: 'Pelleted seed' }, { name: 'Primed seed' }, { name: 'Raw graded seed' }],
        },
      ],
    },
    {
      name: 'Sunflower seeds',
      ru: 'Семена подсолнечника',
      children: [
        {
          name: 'Conventional (classic) hybrids',
          children: [
            { name: 'NK Brio' },
            { name: 'NK Kondi' },
            { name: 'LG 5580' },
            { name: 'ES Biba' },
            { name: 'Bosfora' },
            { name: 'Sanay MR' },
          ],
        },
        {
          name: 'Clearfield (imidazolinone-tolerant) hybrids',
          children: [
            { name: 'NK Neoma' },
            { name: 'LG 5542 CL' },
            { name: 'Estrada CL' },
            { name: 'LG 5661 CL' },
            { name: 'Tunca CL' },
          ],
        },
        {
          name: 'Express (tribenuron-tolerant) hybrids',
          children: [{ name: 'Pioneer P64LE25' }, { name: 'Pioneer P64LE99' }, { name: 'Sumiko HTS' }],
        },
        {
          name: 'High-oleic hybrids',
          children: [{ name: 'Pioneer P64HE118' }, { name: 'LG 50635' }, { name: 'NK Ferti' }, { name: 'Tutti' }],
        },
        {
          name: 'Confectionery (striped) varieties',
          children: [
            { name: 'Lakomka' },
            { name: 'SPK' },
            { name: 'Belochka' },
            { name: 'Posejdon 625' },
            { name: 'Oreshek' },
            { name: 'Shchelkunchik' },
          ],
        },
        {
          name: 'Open-pollinated oilseed varieties',
          children: [
            { name: 'Rodnik' },
            { name: 'Buzuluk' },
            { name: 'Master' },
            { name: 'Flagman' },
            { name: 'Peresvet' },
          ],
        },
        {
          name: 'Maturity groups',
          children: [
            { name: 'Very early (under 95 days)' },
            { name: 'Early (95–105 days)' },
            { name: 'Mid-early (105–115 days)' },
            { name: 'Mid-season (115 days and over)' },
          ],
        },
        {
          name: 'Parent lines & sterile analogues',
          children: [{ name: 'CMS female lines' }, { name: 'Restorer (Rf) lines' }, { name: 'Maintainer lines' }],
        },
        { name: 'Ornamental sunflower seed' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated (dressed) seed',
          children: [
            { name: 'Fungicide-dressed seed' },
            { name: 'Insecticide-treated seed' },
            { name: 'Film-coated & calibrated seed' },
            { name: 'Untreated seed' },
          ],
        },
      ],
    },
    {
      name: 'Wheat seeds',
      ru: 'Семена пшеницы',
      children: [
        {
          name: 'Winter bread wheat varieties',
          children: [
            { name: 'Bezostaya 100' },
            { name: 'Bezostaya 1' },
            { name: 'Grom' },
            { name: 'Alekseich' },
            { name: 'Tanya' },
            { name: 'Skipetr' },
            { name: 'Moskovskaya 56' },
            { name: 'Nemchinovskaya 85' },
            { name: 'Ermak' },
            { name: 'Ilias' },
            { name: 'Yuka' },
            { name: 'Bagrat' },
            { name: 'Ahmat' },
            { name: 'Antonina' },
          ],
        },
        {
          name: 'Spring bread wheat varieties',
          children: [
            { name: 'Darya' },
            { name: 'Zlata' },
            { name: 'Irgina' },
            { name: 'Novosibirskaya 31' },
            { name: 'Ekada 70' },
            { name: 'Tobolskaya' },
            { name: 'Likamero' },
            { name: 'Granny' },
            { name: 'Sudarynya' },
          ],
        },
        {
          name: 'Durum wheat varieties',
          children: [
            { name: 'Bezenchukskaya 210' },
            { name: 'Kharkovskaya 39' },
            { name: 'Meridiano' },
            { name: 'Svevo' },
            { name: 'Saragolla' },
            { name: 'Donskaya elegiya' },
            { name: 'Odesskaya yubileynaya' },
          ],
        },
        {
          name: 'Spelt, emmer & einkorn seed',
          children: [{ name: 'Spelt (Triticum spelta)' }, { name: 'Emmer (Triticum dicoccum)' }, { name: 'Einkorn (Triticum monococcum)' }],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        {
          name: 'Certified seed',
          children: [{ name: 'Certified C1' }, { name: 'Certified C2' }],
        },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated (dressed) seed',
          children: [
            { name: 'Fungicide-dressed seed' },
            { name: 'Insecticide-treated seed' },
            { name: 'Film-coated seed' },
            { name: 'Bio-inoculant treated seed' },
            { name: 'Untreated seed' },
          ],
        },
      ],
    },
    {
      name: 'Rapeseed seeds',
      ru: 'Семена рапса',
      children: [
        {
          name: 'Winter rapeseed hybrids',
          children: [
            { name: 'DK Exception' },
            { name: 'DK Exstorm' },
            { name: 'PT 271' },
            { name: 'Mercedes' },
            { name: 'Kuga' },
          ],
        },
        {
          name: 'Spring rapeseed hybrids',
          children: [
            { name: 'Mirakl' },
            { name: 'Kalibr' },
            { name: 'Smilla' },
            { name: 'Ozorno' },
            { name: 'Kultus' },
          ],
        },
        {
          name: 'Open-pollinated rapeseed varieties',
          children: [
            { name: 'Ratnik' },
            { name: 'Podmoskovny' },
            { name: 'Vikros' },
            { name: 'Nadezhny 92' },
          ],
        },
        {
          name: 'Clearfield rapeseed hybrids',
          children: [{ name: 'DK Impression CL' }, { name: 'Solar CL' }, { name: 'Veritas CL' }],
        },
        {
          name: 'Oil quality types',
          children: [
            { name: '00 (canola-quality) seed' },
            { name: 'High-erucic industrial rapeseed' },
            { name: 'High-oleic rapeseed' },
          ],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated (dressed) seed',
          children: [
            { name: 'Fungicide-dressed seed' },
            { name: 'Insecticide-treated seed' },
            { name: 'Film-coated seed' },
            { name: 'Untreated seed' },
          ],
        },
      ],
    },
    {
      name: 'Milk thistle seeds',
      ru: 'Семена расторопши',
      children: [
        {
          name: 'Silymarin-type varieties',
          children: [{ name: 'Debyut' }, { name: 'Amulet' }, { name: 'Panteon' }],
        },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        { name: 'Untreated pharmaceutical-grade planting seed' },
      ],
    },
    {
      name: 'Radish seeds',
      ru: 'Семена редиса',
      children: [
        {
          name: 'Round red varieties',
          children: [
            { name: '18 dney' },
            { name: 'Zhara' },
            { name: 'Rudolf F1' },
            { name: 'Cherriet F1' },
            { name: 'Diego F1' },
            { name: 'Donar F1' },
            { name: 'Sora' },
          ],
        },
        {
          name: 'Long & cylindrical varieties',
          children: [
            { name: 'French Breakfast' },
            { name: 'Dabel F1' },
            { name: 'Ledyanaya sosulka' },
            { name: 'Duro' },
          ],
        },
        {
          name: 'White, yellow & bicolour varieties',
          children: [{ name: 'Belyi klyk' }, { name: 'Zlata' }, { name: 'Mokhovsky' }],
        },
        {
          name: 'Daikon & winter radish varieties',
          children: [
            { name: 'Minowase Summer Cross' },
            { name: 'Sasha' },
            { name: 'Dubinushka' },
            { name: 'Misato Red' },
          ],
        },
        { name: 'Sprouting & microgreen radish seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Seed preparation',
          children: [
            { name: 'Pelleted seed' },
            { name: 'Primed seed' },
            { name: 'Calibrated raw seed' },
          ],
        },
      ],
    },
    {
      name: 'Rye seeds',
      ru: 'Семена ржи',
      children: [
        {
          name: 'Winter rye population varieties',
          children: [
            { name: 'Saratovskaya 7' },
            { name: 'Tatarskaya 1' },
            { name: 'Falyonskaya 4' },
            { name: 'Alfa' },
            { name: 'Chulpan 7' },
            { name: 'Bezenchukskaya 87' },
          ],
        },
        {
          name: 'Winter rye hybrids',
          children: [
            { name: 'KWS Bono' },
            { name: 'KWS Serafino' },
            { name: 'KWS Progas' },
            { name: 'SU Performer' },
          ],
        },
        {
          name: 'Spring rye varieties',
          children: [{ name: 'Onokhoyskaya' }],
        },
        { name: 'Green-manure & fodder rye seed' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated seed',
          children: [{ name: 'Fungicide-dressed seed' }, { name: 'Film-coated seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Camelina seeds',
      ru: 'Семена рыжика посевного',
      children: [
        {
          name: 'Spring camelina varieties',
          children: [{ name: 'Yubilyar' }, { name: 'Kozyr' }, { name: 'Penzyak' }],
        },
        {
          name: 'Winter camelina varieties',
          children: [{ name: 'Karat' }],
        },
        { name: 'Green-manure camelina seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
      ],
    },
    {
      name: 'Fodder beet seeds',
      ru: 'Семена свеклы кормовой',
      children: [
        {
          name: 'Monogerm (single-germ) hybrids',
          children: [
            { name: 'Rekord Poly' },
            { name: 'Jamon' },
            { name: 'Lada' },
            { name: 'Milana' },
            { name: 'Ursus Poly' },
            { name: 'Starmon' },
            { name: 'Centaur Poly' },
            { name: 'Voevoda' },
          ],
        },
        {
          name: 'Multigerm varieties',
          children: [
            { name: 'Eckendorfskaya zheltaya' },
            { name: 'Poltavskaya belaya' },
            { name: 'Sakharnaya okruglaya' },
          ],
        },
        {
          name: 'Half-sugar fodder beet varieties',
          children: [{ name: 'Poltavskaya polusakharnaya' }, { name: 'Umanskaya polusakharnaya' }],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Seed preparation',
          children: [
            { name: 'Pelleted (encrusted) seed' },
            { name: 'Calibrated raw seed' },
            { name: 'Polished (rubbed) seed' },
          ],
        },
      ],
    },
    {
      name: 'Soybean seeds',
      ru: 'Семена сои',
      children: [
        {
          name: 'Very early varieties (000–00)',
          children: [
            { name: 'Kassidi' },
            { name: 'Merlin' },
            { name: 'Sultana' },
            { name: 'Pripyat' },
            { name: 'Annushka' },
          ],
        },
        {
          name: 'Mid-early varieties (0–I)',
          children: [
            { name: 'Bara' },
            { name: 'Mavka' },
            { name: 'Lissabon' },
            { name: 'ES Mentor' },
            { name: 'Asuka' },
            { name: 'Opus' },
          ],
        },
        {
          name: 'Mid-season varieties (II–III)',
          children: [
            { name: 'Vilana' },
            { name: 'Selecta 302' },
            { name: 'Arleta' },
            { name: 'Slavia' },
            { name: 'Bilyavka' },
          ],
        },
        {
          name: 'High-protein food-grade varieties',
          children: [{ name: 'Sonata' }, { name: 'Lira' }, { name: 'Duar' }],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        {
          name: 'Certified seed',
          children: [{ name: 'Certified C1' }, { name: 'Certified C2' }],
        },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated & inoculated seed',
          children: [
            { name: 'Rhizobium-inoculated seed' },
            { name: 'Fungicide + inoculant treated seed' },
            { name: 'Molybdenum-treated seed' },
            { name: 'Untreated seed' },
          ],
        },
      ],
    },
    {
      name: 'Lawn grass seeds',
      ru: 'Семена травосмеси газонной',
      children: [
        {
          name: 'Single-species seed',
          children: [
            { name: 'Perennial ryegrass (Lolium perenne)' },
            { name: 'Kentucky bluegrass (Poa pratensis)' },
            { name: 'Red fescue (Festuca rubra)' },
            { name: 'Chewings fescue (Festuca rubra commutata)' },
            { name: 'Tall fescue (Festuca arundinacea)' },
            { name: 'Sheep fescue (Festuca ovina)' },
            { name: 'Creeping bentgrass (Agrostis stolonifera)' },
            { name: 'Bermudagrass (Cynodon dactylon)' },
            { name: 'Microclover (Trifolium repens)' },
          ],
        },
        {
          name: 'Sport & stadium mixtures',
          children: [
            { name: 'Pure ryegrass sport mix' },
            { name: 'Ryegrass + bluegrass sport mix' },
            { name: 'Golf green & fairway mix' },
          ],
        },
        { name: 'Universal utility lawn mixtures' },
        { name: 'Shade-tolerant mixtures' },
        { name: 'Drought-resistant mixtures' },
        { name: 'Low-maintenance & dwarf mixtures' },
        { name: 'Overseeding & repair mixtures' },
        { name: 'Erosion-control & roadside mixtures' },
        {
          name: 'Seed preparation',
          children: [{ name: 'Coated seed' }, { name: 'Pre-germinated seed' }, { name: 'Raw cleaned seed' }],
        },
      ],
    },
    {
      name: 'Triticale seeds',
      ru: 'Семена тритикале',
      children: [
        {
          name: 'Winter triticale varieties',
          children: [
            { name: 'Valentin 90' },
            { name: 'Konsul' },
            { name: 'Nemchinovsky 56' },
            { name: 'Amur' },
            { name: 'Trimaran' },
          ],
        },
        {
          name: 'Spring triticale varieties',
          children: [
            { name: 'Ukro' },
            { name: 'Zolotoy greben' },
            { name: 'Rovnya' },
            { name: 'Solovey' },
          ],
        },
        { name: 'Fodder & green-mass triticale varieties' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated seed',
          children: [{ name: 'Fungicide-dressed seed' }, { name: 'Film-coated seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Dill seeds',
      ru: 'Семена укропа',
      children: [
        {
          name: 'Bush (late-bolting) varieties',
          children: [
            { name: 'Kibray' },
            { name: 'Salyut' },
            { name: 'Alligator' },
            { name: 'Buyan' },
            { name: 'Amazon' },
          ],
        },
        {
          name: 'Early leaf varieties',
          children: [{ name: 'Gribovsky' }, { name: 'Dalny' }, { name: 'Zonik' }, { name: 'Rannee chudo' }],
        },
        {
          name: 'Umbrella (spice) varieties',
          children: [{ name: 'Anna' }, { name: 'Tetra' }, { name: 'Superdukat' }, { name: 'Mammoth' }],
        },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Seed preparation',
          children: [{ name: 'Pelleted seed' }, { name: 'Primed seed' }, { name: 'Raw graded seed' }],
        },
      ],
    },
    {
      name: 'Bean seeds',
      ru: 'Семена фасоли',
      children: [
        {
          name: 'White navy & haricot varieties',
          children: [{ name: 'Nerussa' }, { name: 'Belozernaya 361' }, { name: 'Sacha' }, { name: 'Aeron' }],
        },
        {
          name: 'Red kidney varieties',
          children: [{ name: 'Kentavr' }, { name: 'Rubin' }, { name: 'Red Hawk' }, { name: 'Krasnaya shapochka' }],
        },
        {
          name: 'Pinto & cranberry varieties',
          children: [{ name: 'Borlotto Lingua di Fuoco' }, { name: 'Pinto Saltillo' }],
        },
        {
          name: 'Black bean varieties',
          children: [{ name: 'Preto' }, { name: 'Black Turtle' }],
        },
        {
          name: 'French (snap) bean varieties',
          children: [
            { name: 'Zhuravushka' },
            { name: 'Serengeti' },
            { name: 'Paulista' },
            { name: 'Maxidor' },
            { name: 'Purple Teepee' },
            { name: 'Nagano' },
          ],
        },
        {
          name: 'Runner bean (Phaseolus coccineus) varieties',
          children: [{ name: 'Scarlet Emperor' }, { name: 'Ognenno-krasnaya' }],
        },
        { name: 'Yardlong & asparagus bean varieties' },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated & inoculated seed',
          children: [{ name: 'Rhizobium-inoculated seed' }, { name: 'Fungicide-dressed seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Lentil seeds',
      ru: 'Семена чечевицы',
      children: [
        {
          name: 'Large-seeded (macrosperma) varieties',
          children: [
            { name: 'Anfiya' },
            { name: 'Rauza' },
            { name: 'Petrovskaya 4/105' },
            { name: 'Laird' },
            { name: 'Nugget' },
          ],
        },
        {
          name: 'Small-seeded (microsperma) varieties',
          children: [{ name: 'Pardina' }, { name: 'Eston' }, { name: 'Oktava' }],
        },
        {
          name: 'Red lentil varieties',
          children: [{ name: 'Crimson' }, { name: 'Redberry' }, { name: 'Shagane' }],
        },
        {
          name: 'Green lentil varieties',
          children: [{ name: 'Richlea' }, { name: 'Nadezhda' }],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated & inoculated seed',
          children: [{ name: 'Rhizobium-inoculated seed' }, { name: 'Fungicide-dressed seed' }, { name: 'Untreated seed' }],
        },
      ],
    },
    {
      name: 'Sorrel seeds',
      ru: 'Семена щавеля',
      children: [
        {
          name: 'Garden sorrel varieties',
          children: [
            { name: 'Belvilsky' },
            { name: 'Krupnolistny' },
            { name: 'Malakhit' },
            { name: 'Izumrudny sneg' },
            { name: 'Nikolsky' },
            { name: 'Sanguine (blood-veined)' },
          ],
        },
        {
          name: 'Spinach dock (Rumex patientia) varieties',
          children: [{ name: 'Shpinatny' }],
        },
        { name: 'Foundation seed' },
        { name: 'Certified seed' },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Seed preparation',
          children: [{ name: 'Pelleted seed' }, { name: 'Raw graded seed' }],
        },
      ],
    },
    {
      name: 'Barley seeds',
      ru: 'Семена ячменя',
      children: [
        {
          name: 'Spring two-row malting varieties',
          children: [
            { name: 'Grace' },
            { name: 'Explorer' },
            { name: 'Quench' },
            { name: 'Despina' },
            { name: 'Signet' },
            { name: 'Salome' },
            { name: 'Overture' },
          ],
        },
        {
          name: 'Spring feed barley varieties',
          children: [
            { name: 'Vakula' },
            { name: 'Prerija' },
            { name: 'Odessky 22' },
            { name: 'Priazovsky 9' },
            { name: 'Nutans 553' },
            { name: 'Ratnik' },
            { name: 'Fox 1' },
          ],
        },
        {
          name: 'Winter barley varieties',
          children: [
            { name: 'Vivat' },
            { name: 'Mikhaylo' },
            { name: 'Kondrat' },
            { name: 'Rosava' },
            { name: 'Espada' },
          ],
        },
        {
          name: 'Six-row barley varieties',
          children: [{ name: 'Zernogradsky 813' }, { name: 'Sever 1' }],
        },
        {
          name: 'Hulless (naked) barley varieties',
          children: [{ name: 'Omsky golozerny 1' }, { name: 'Nudum 95' }],
        },
        { name: 'Breeder seed' },
        { name: 'Foundation seed' },
        { name: 'Registered seed' },
        {
          name: 'Certified seed',
          children: [{ name: 'Certified C1' }, { name: 'Certified C2' }],
        },
        { name: 'Truthfully-labelled seed' },
        {
          name: 'Treated (dressed) seed',
          children: [
            { name: 'Fungicide-dressed seed' },
            { name: 'Insecticide-treated seed' },
            { name: 'Film-coated seed' },
            { name: 'Untreated seed' },
          ],
        },
      ],
    },
    {
      name: 'Seed garlic',
      ru: 'Чеснок семенной',
      children: [
        {
          name: 'Winter (hardneck) varieties',
          children: [
            { name: 'Lyubasha' },
            { name: 'Dobrynya' },
            { name: 'Komsomolets' },
            { name: 'Gribovsky yubileiny' },
            { name: 'Messidor' },
            { name: 'Sofievsky' },
            { name: 'Harnas' },
            { name: 'Alcor' },
            { name: 'Petrovsky' },
          ],
        },
        {
          name: 'Spring (softneck) varieties',
          children: [
            { name: 'Sochi 56' },
            { name: 'Elenovsky' },
            { name: 'Viktorio' },
            { name: 'Aleyskiy' },
            { name: 'Ershovsky' },
            { name: 'Kledor' },
            { name: 'Thermidrome' },
          ],
        },
        {
          name: 'Planting material forms',
          children: [
            { name: 'Cloves (zubki)' },
            { name: 'Whole bulbs' },
            { name: 'Bulbils (air bulbs)' },
            { name: 'Single-clove bulbs (odnozubka)' },
          ],
        },
        {
          name: 'Bulb calibre grades',
          children: [
            { name: '25–30 mm' },
            { name: '30–40 mm' },
            { name: '40–50 mm' },
            { name: '50–60 mm' },
            { name: '60 mm and over' },
          ],
        },
        { name: 'Elite (super-elite) planting stock' },
        { name: 'First-reproduction planting stock' },
        { name: 'Certified planting stock' },
        {
          name: 'Treatment',
          children: [{ name: 'Fungicide-treated cloves' }, { name: 'Untreated cloves' }],
        },
      ],
    },
  ],
};
