import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Only three level-2 nodes, so depth carries the weight: succulents and conifers go to
 * genus (L3) then named species/cultivar (L4); cut flowers go type (L3) → colour/flower
 * class (L4) → stem-length grade (L5), which is how cut-flower lots actually trade.
 */
export const ornamentalPlants: TaxCategory = {
  name: 'Ornamental plants',
  emoji: '🌸',
  tint: TINT.blush,
  children: [
    {
      name: 'Succulents',
      ru: 'Суккуленты',
      children: [
        {
          name: 'Echeveria',
          children: [
            { name: 'Echeveria elegans' },
            { name: 'Echeveria agavoides' },
            { name: 'Echeveria pulvinata' },
            { name: 'Echeveria lilacina' },
            { name: 'Echeveria Perle von Nurnberg' },
            { name: 'Echeveria Black Prince' },
          ],
        },
        {
          name: 'Haworthia',
          children: [
            { name: 'Haworthia fasciata' },
            { name: 'Haworthia attenuata' },
            { name: 'Haworthia cooperi' },
            { name: 'Haworthia retusa' },
            { name: 'Haworthia truncata' },
          ],
        },
        {
          name: 'Aloe',
          children: [
            { name: 'Aloe vera' },
            { name: 'Aloe aristata' },
            { name: 'Aloe juvenna' },
            { name: 'Aloe polyphylla' },
            { name: 'Aloe variegata' },
          ],
        },
        {
          name: 'Crassula',
          children: [
            { name: 'Crassula ovata' },
            { name: 'Crassula arborescens' },
            { name: 'Crassula perforata' },
            { name: 'Crassula muscosa' },
            { name: 'Crassula Gollum' },
          ],
        },
        {
          name: 'Sedum',
          children: [
            { name: 'Sedum morganianum' },
            { name: 'Sedum rubrotinctum' },
            { name: 'Sedum spurium' },
            { name: 'Sedum acre' },
            { name: 'Sedum adolphii' },
          ],
        },
        {
          name: 'Sempervivum',
          children: [
            { name: 'Sempervivum tectorum' },
            { name: 'Sempervivum arachnoideum' },
            { name: 'Sempervivum calcareum' },
          ],
        },
        {
          name: 'Kalanchoe',
          children: [
            { name: 'Kalanchoe blossfeldiana' },
            { name: 'Kalanchoe tomentosa' },
            { name: 'Kalanchoe daigremontiana' },
            { name: 'Kalanchoe thyrsiflora' },
          ],
        },
        {
          name: 'Euphorbia',
          children: [
            { name: 'Euphorbia trigona' },
            { name: 'Euphorbia milii' },
            { name: 'Euphorbia obesa' },
            { name: 'Euphorbia tirucalli' },
          ],
        },
        {
          name: 'Agave',
          children: [
            { name: 'Agave americana' },
            { name: 'Agave victoriae-reginae' },
            { name: 'Agave attenuata' },
            { name: 'Agave parryi' },
          ],
        },
        {
          name: 'Sansevieria',
          children: [
            { name: 'Sansevieria trifasciata' },
            { name: 'Sansevieria cylindrica' },
            { name: 'Sansevieria Hahnii' },
            { name: 'Sansevieria Moonshine' },
          ],
        },
        {
          name: 'Lithops',
          children: [{ name: 'Lithops karasmontana' }, { name: 'Lithops optica' }, { name: 'Lithops aucampiae' }],
        },
        {
          name: 'Cacti',
          children: [
            { name: 'Mammillaria' },
            { name: 'Astrophytum' },
            { name: 'Opuntia' },
            { name: 'Gymnocalycium' },
            { name: 'Cereus peruvianus' },
            { name: 'Echinocactus grusonii' },
            { name: 'Rebutia' },
            { name: 'Schlumbergera' },
          ],
        },
        {
          name: 'Adenium',
          children: [{ name: 'Adenium obesum' }, { name: 'Adenium arabicum' }, { name: 'Adenium somalense' }],
        },
        {
          name: 'Gasteria',
          children: [{ name: 'Gasteria bicolor' }, { name: 'Gasteria glomerata' }, { name: 'Gasteria armstrongii' }],
        },
        {
          name: 'Graptopetalum',
          children: [{ name: 'Graptopetalum paraguayense' }, { name: 'Graptoveria Debbie' }],
        },
        {
          name: 'Senecio',
          children: [{ name: 'Senecio rowleyanus' }, { name: 'Senecio serpens' }, { name: 'Senecio haworthii' }],
        },
        {
          name: 'Succulent arrangements',
          children: [{ name: 'Mixed bowls' }, { name: 'Terrarium sets' }, { name: 'Living wall panels' }],
        },
        {
          name: 'Succulent propagation material',
          children: [{ name: 'Rooted cuttings' }, { name: 'Unrooted cuttings' }, { name: 'Leaf offsets' }, { name: 'Plug trays' }],
        },
      ],
    },
    {
      name: 'Conifers',
      ru: 'Хвойные деревья',
      children: [
        {
          name: 'Spruce (Picea)',
          children: [
            { name: 'Picea abies' },
            { name: 'Picea pungens Glauca' },
            { name: 'Picea glauca Conica' },
            { name: 'Picea omorika' },
            { name: 'Picea pungens Hoopsii' },
            { name: 'Picea abies Nidiformis' },
          ],
        },
        {
          name: 'Pine (Pinus)',
          children: [
            { name: 'Pinus sylvestris' },
            { name: 'Pinus mugo' },
            { name: 'Pinus nigra' },
            { name: 'Pinus strobus' },
            { name: 'Pinus cembra' },
            { name: 'Pinus parviflora' },
          ],
        },
        {
          name: 'Thuja',
          children: [
            { name: 'Thuja occidentalis Smaragd' },
            { name: 'Thuja occidentalis Brabant' },
            { name: 'Thuja occidentalis Danica' },
            { name: 'Thuja occidentalis Golden Globe' },
            { name: 'Thuja plicata Atrovirens' },
          ],
        },
        {
          name: 'Juniper (Juniperus)',
          children: [
            { name: 'Juniperus horizontalis' },
            { name: 'Juniperus chinensis Blue Alps' },
            { name: 'Juniperus squamata Blue Star' },
            { name: 'Juniperus communis Hibernica' },
            { name: 'Juniperus sabina Tamariscifolia' },
            { name: 'Juniperus scopulorum Skyrocket' },
          ],
        },
        {
          name: 'Fir (Abies)',
          children: [
            { name: 'Abies nordmanniana' },
            { name: 'Abies concolor' },
            { name: 'Abies koreana' },
            { name: 'Abies balsamea Nana' },
          ],
        },
        {
          name: 'False cypress (Chamaecyparis)',
          children: [
            { name: 'Chamaecyparis lawsoniana Columnaris' },
            { name: 'Chamaecyparis pisifera Filifera Aurea' },
            { name: 'Chamaecyparis obtusa Nana Gracilis' },
          ],
        },
        {
          name: 'Cypress (Cupressus)',
          children: [{ name: 'Cupressus sempervirens' }, { name: 'Cupressus macrocarpa Goldcrest' }, { name: 'Cupressocyparis leylandii' }],
        },
        {
          name: 'Larch (Larix)',
          children: [{ name: 'Larix decidua' }, { name: 'Larix decidua Pendula' }, { name: 'Larix kaempferi' }],
        },
        {
          name: 'Yew (Taxus)',
          children: [{ name: 'Taxus baccata' }, { name: 'Taxus baccata Fastigiata' }, { name: 'Taxus media Hicksii' }],
        },
        {
          name: 'Cedar (Cedrus)',
          children: [{ name: 'Cedrus atlantica Glauca' }, { name: 'Cedrus deodara' }, { name: 'Cedrus libani' }],
        },
        {
          name: 'Hemlock (Tsuga)',
          children: [{ name: 'Tsuga canadensis' }, { name: 'Tsuga canadensis Pendula' }],
        },
        {
          name: 'Douglas fir (Pseudotsuga)',
          children: [{ name: 'Pseudotsuga menziesii' }, { name: 'Pseudotsuga menziesii Glauca' }],
        },
        {
          name: 'Cryptomeria',
          children: [{ name: 'Cryptomeria japonica' }, { name: 'Cryptomeria japonica Globosa Nana' }],
        },
        {
          name: 'Metasequoia',
          children: [{ name: 'Metasequoia glyptostroboides' }, { name: 'Metasequoia Gold Rush' }],
        },
        {
          name: 'Christmas trees',
          children: [
            { name: 'Cut Nordmann fir' },
            { name: 'Cut Norway spruce' },
            { name: 'Cut blue spruce' },
            { name: 'Potted Christmas trees' },
          ],
        },
        {
          name: 'Conifer planting stock',
          children: [
            { name: 'Bare-root seedlings' },
            { name: 'Container-grown liners' },
            { name: 'Root-balled specimens' },
            { name: 'Grafted topiary forms' },
          ],
        },
      ],
    },
    {
      name: 'Fresh-cut flowers',
      ru: 'Цветы свежесрезанные',
      children: [
        {
          name: 'Roses',
          children: [
            {
              name: 'Red large-headed roses',
              children: [
                { name: '40 cm stems' },
                { name: '50 cm stems' },
                { name: '60 cm stems' },
                { name: '70 cm stems' },
                { name: '80 cm stems' },
                { name: '90 cm stems' },
              ],
            },
            {
              name: 'White large-headed roses',
              children: [{ name: '40 cm stems' }, { name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }, { name: '80 cm stems' }],
            },
            {
              name: 'Pink large-headed roses',
              children: [{ name: '40 cm stems' }, { name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }, { name: '80 cm stems' }],
            },
            {
              name: 'Yellow & orange roses',
              children: [{ name: '40 cm stems' }, { name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }],
            },
            {
              name: 'Bicolour roses',
              children: [{ name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }],
            },
            {
              name: 'Spray roses',
              children: [{ name: '40 cm stems' }, { name: '50 cm stems' }, { name: '60 cm stems' }],
            },
            {
              name: 'Garden roses',
              children: [{ name: '40 cm stems' }, { name: '50 cm stems' }, { name: '60 cm stems' }],
            },
            {
              name: 'Preserved & tinted roses',
              children: [{ name: '40 cm stems' }, { name: '50 cm stems' }, { name: '60 cm stems' }],
            },
          ],
        },
        {
          name: 'Chrysanthemums',
          children: [
            { name: 'Disbud chrysanthemum', children: [{ name: '60 cm stems' }, { name: '70 cm stems' }, { name: '80 cm stems' }] },
            { name: 'Spray chrysanthemum', children: [{ name: '55 cm stems' }, { name: '65 cm stems' }, { name: '75 cm stems' }] },
            { name: 'Santini chrysanthemum', children: [{ name: '50 cm stems' }, { name: '60 cm stems' }] },
            { name: 'Anastasia chrysanthemum' },
            { name: 'Pompon chrysanthemum' },
          ],
        },
        {
          name: 'Carnations',
          children: [
            { name: 'Standard carnation', children: [{ name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }] },
            { name: 'Spray carnation', children: [{ name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }] },
            { name: 'Dianthus barbatus' },
          ],
        },
        {
          name: 'Tulips',
          children: [
            { name: 'Single late tulip', children: [{ name: '35 cm stems' }, { name: '40 cm stems' }, { name: '45 cm stems' }] },
            { name: 'Double tulip', children: [{ name: '35 cm stems' }, { name: '40 cm stems' }] },
            { name: 'French tulip', children: [{ name: '50 cm stems' }, { name: '60 cm stems' }] },
            { name: 'Parrot tulip' },
            { name: 'Fringed tulip' },
          ],
        },
        {
          name: 'Gerberas',
          children: [
            { name: 'Standard gerbera', children: [{ name: '45 cm stems' }, { name: '50 cm stems' }, { name: '60 cm stems' }] },
            { name: 'Mini gerbera (Germini)', children: [{ name: '45 cm stems' }, { name: '50 cm stems' }] },
            { name: 'Spider gerbera' },
          ],
        },
        {
          name: 'Lilies',
          children: [
            { name: 'Oriental lily', children: [{ name: '70 cm stems' }, { name: '80 cm stems' }, { name: '90 cm stems' }] },
            { name: 'Asiatic lily', children: [{ name: '60 cm stems' }, { name: '70 cm stems' }, { name: '80 cm stems' }] },
            { name: 'LA hybrid lily', children: [{ name: '70 cm stems' }, { name: '80 cm stems' }] },
            { name: 'Longiflorum lily' },
            { name: 'Calla lily' },
          ],
        },
        {
          name: 'Alstroemeria',
          children: [
            { name: 'Standard alstroemeria', children: [{ name: '60 cm stems' }, { name: '70 cm stems' }, { name: '80 cm stems' }] },
            { name: 'Florinca alstroemeria' },
          ],
        },
        {
          name: 'Gypsophila',
          children: [
            { name: 'Gypsophila Million Stars', children: [{ name: '60 cm stems' }, { name: '70 cm stems' }] },
            { name: 'Gypsophila Xlence' },
            { name: 'Tinted gypsophila' },
          ],
        },
        {
          name: 'Hydrangea',
          children: [
            { name: 'Hydrangea macrophylla', children: [{ name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }] },
            { name: 'Hydrangea paniculata' },
            { name: 'Antique hydrangea' },
          ],
        },
        {
          name: 'Peonies',
          children: [
            { name: 'Sarah Bernhardt', children: [{ name: '50 cm stems' }, { name: '60 cm stems' }, { name: '70 cm stems' }] },
            { name: 'Red Charm' },
            { name: 'Duchesse de Nemours' },
            { name: 'Coral Charm' },
          ],
        },
        {
          name: 'Eustoma (Lisianthus)',
          children: [
            { name: 'Double eustoma', children: [{ name: '60 cm stems' }, { name: '70 cm stems' }, { name: '80 cm stems' }] },
            { name: 'Single eustoma' },
          ],
        },
        {
          name: 'Orchids (cut)',
          children: [{ name: 'Cymbidium sprays' }, { name: 'Dendrobium sprays' }, { name: 'Phalaenopsis sprays' }, { name: 'Oncidium sprays' }],
        },
        {
          name: 'Anthurium',
          children: [{ name: 'Large-flowered anthurium' }, { name: 'Mini anthurium' }, { name: 'Tropical anthurium' }],
        },
        {
          name: 'Freesia',
          children: [{ name: 'Single freesia' }, { name: 'Double freesia' }],
        },
        {
          name: 'Iris & bulb flowers',
          children: [{ name: 'Dutch iris' }, { name: 'Hyacinth' }, { name: 'Narcissus' }, { name: 'Muscari' }, { name: 'Gladiolus' }],
        },
        {
          name: 'Ranunculus & anemone',
          children: [{ name: 'Ranunculus Clooney' }, { name: 'Ranunculus Hanoi' }, { name: 'Anemone coronaria' }],
        },
        {
          name: 'Cut sunflowers',
          children: [{ name: 'Sunrich sunflower' }, { name: 'Vincent sunflower' }, { name: 'Teddy Bear sunflower' }],
        },
        {
          name: 'Filler flowers',
          children: [
            { name: 'Limonium (Statice)' },
            { name: 'Solidago' },
            { name: 'Waxflower' },
            { name: 'Astrantia' },
            { name: 'Veronica' },
            { name: 'Craspedia' },
          ],
        },
        {
          name: 'Cut foliage & greens',
          children: [
            { name: 'Eucalyptus cinerea' },
            { name: 'Eucalyptus parvifolia' },
            { name: 'Ruscus' },
            { name: 'Pittosporum' },
            { name: 'Salal' },
            { name: 'Leatherleaf fern' },
            { name: 'Monstera leaves' },
          ],
        },
        {
          name: 'Dried & preserved flowers',
          children: [{ name: 'Dried lavender' }, { name: 'Preserved eucalyptus' }, { name: 'Dried pampas grass' }, { name: 'Bleached ruscus' }],
        },
      ],
    },
  ],
};
