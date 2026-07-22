import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Beekeeping goes 4 levels on honey (floral source › physical form, plus real UMF/MGO grades on
 * manuka) and on wax and foundation, where frame standards and wax grades are how lots actually
 * trade; propolis, pollen, bee bread and dead bees stop at a single level-3 tier of forms.
 */
export const beekeepingProducts: TaxCategory = {
  name: 'Beekeeping products',
  emoji: '🍯',
  tint: TINT.sand,
  children: [
    {
      name: 'Honey',
      ru: 'Мёд',
      children: [
        {
          name: 'Acacia honey',
          children: [
            { name: 'Raw unfiltered acacia honey' },
            { name: 'Filtered liquid acacia honey' },
            { name: 'Comb acacia honey' },
          ],
        },
        {
          name: 'Sunflower honey',
          children: [
            { name: 'Raw unfiltered sunflower honey' },
            { name: 'Filtered liquid sunflower honey' },
            { name: 'Creamed sunflower honey' },
          ],
        },
        {
          name: 'Buckwheat honey',
          children: [
            { name: 'Raw unfiltered buckwheat honey' },
            { name: 'Filtered liquid buckwheat honey' },
            { name: 'Creamed buckwheat honey' },
          ],
        },
        {
          name: 'Linden honey',
          children: [
            { name: 'Raw unfiltered linden honey' },
            { name: 'Filtered liquid linden honey' },
            { name: 'Creamed linden honey' },
            { name: 'Comb linden honey' },
          ],
        },
        {
          name: 'Rapeseed honey',
          children: [
            { name: 'Raw unfiltered rapeseed honey' },
            { name: 'Filtered liquid rapeseed honey' },
            { name: 'Creamed rapeseed honey' },
          ],
        },
        {
          name: 'Manuka honey',
          children: [
            { name: 'UMF 5+ manuka honey' },
            { name: 'UMF 10+ manuka honey' },
            { name: 'UMF 15+ manuka honey' },
            { name: 'UMF 20+ manuka honey' },
            { name: 'MGO 100+ manuka honey' },
            { name: 'MGO 250+ manuka honey' },
            { name: 'MGO 400+ manuka honey' },
          ],
        },
        {
          name: 'Multifloral honey',
          children: [
            { name: 'Raw unfiltered multifloral honey' },
            { name: 'Filtered liquid multifloral honey' },
            { name: 'Creamed multifloral honey' },
            { name: 'Comb multifloral honey' },
            { name: 'Chunk multifloral honey' },
          ],
        },
        {
          name: 'Chestnut honey',
          children: [{ name: 'Raw unfiltered chestnut honey' }, { name: 'Filtered liquid chestnut honey' }],
        },
        {
          name: 'Clover honey',
          children: [{ name: 'Raw unfiltered clover honey' }, { name: 'Filtered liquid clover honey' }, { name: 'Creamed clover honey' }],
        },
        {
          name: 'Eucalyptus honey',
          children: [{ name: 'Raw unfiltered eucalyptus honey' }, { name: 'Filtered liquid eucalyptus honey' }],
        },
        {
          name: 'Orange blossom honey',
          children: [{ name: 'Raw unfiltered orange blossom honey' }, { name: 'Filtered liquid orange blossom honey' }],
        },
        {
          name: 'Sidr honey',
          children: [{ name: 'Raw unfiltered sidr honey' }, { name: 'Comb sidr honey' }],
        },
        {
          name: 'Forest honeydew honey',
          children: [{ name: 'Fir honeydew honey' }, { name: 'Oak honeydew honey' }, { name: 'Pine honeydew honey' }],
        },
        { name: 'Heather honey', children: [{ name: 'Raw unfiltered heather honey' }, { name: 'Comb heather honey' }] },
        { name: 'Thyme honey' },
        { name: 'Sainfoin honey' },
        { name: 'Coriander honey' },
        { name: 'Sweet clover honey' },
        { name: 'Fireweed honey' },
        { name: 'Cotton honey' },
        { name: 'Alfalfa honey' },
        { name: 'Honey with royal jelly' },
        { name: 'Baker and industrial honey' },
      ],
    },
    {
      name: 'Beeswax',
      ru: 'Воск',
      children: [
        {
          name: 'Yellow beeswax',
          children: [{ name: 'Grade A filtered yellow beeswax' }, { name: 'Grade B yellow beeswax' }, { name: 'Grade C yellow beeswax' }],
        },
        {
          name: 'White bleached beeswax',
          children: [{ name: 'Filtered white beeswax blocks' }, { name: 'White beeswax pastilles' }],
        },
        { name: 'Cappings wax' },
        { name: 'Crude rendered beeswax' },
        { name: 'Pharmaceutical-grade beeswax (Cera alba)' },
        { name: 'Cosmetic-grade beeswax pellets' },
        { name: 'Wax moth and comb slumgum wax' },
      ],
    },
    {
      name: 'Bee bread',
      ru: 'Перга',
      children: [
        { name: 'Bee bread in comb' },
        { name: 'Granulated bee bread' },
        { name: 'Bee bread powder' },
        { name: 'Bee bread with honey paste' },
        { name: 'Bee bread capsules and tablets' },
      ],
    },
    {
      name: 'Propolis',
      ru: 'Прополис',
      children: [
        { name: 'Raw propolis chunks' },
        { name: 'Propolis granules' },
        { name: 'Propolis powder' },
        { name: 'Wax-free propolis resin' },
        { name: 'Propolis tincture (alcohol extract)' },
        { name: 'Water-soluble propolis extract' },
        { name: 'Brazilian green propolis' },
        { name: 'Brazilian red propolis' },
        { name: 'Brown poplar propolis' },
      ],
    },
    {
      name: 'Pollen',
      ru: 'Пыльца',
      children: [
        {
          name: 'Dried bee pollen granules',
          children: [
            { name: 'Multifloral bee pollen' },
            { name: 'Rapeseed bee pollen' },
            { name: 'Sunflower bee pollen' },
            { name: 'Chestnut bee pollen' },
            { name: 'Almond bee pollen' },
            { name: 'Willow bee pollen' },
          ],
        },
        { name: 'Fresh frozen bee pollen' },
        { name: 'Bee pollen powder' },
        { name: 'Bee pollen with honey' },
        { name: 'Pollen for artificial pollination' },
        { name: 'Pollen substitute patties' },
      ],
    },
    {
      name: 'Foundation',
      ru: 'Вощина',
      children: [
        {
          name: 'Beeswax foundation sheets',
          children: [
            { name: 'Dadant frame foundation' },
            { name: 'Langstroth-Root frame foundation' },
            { name: 'Ukrainian frame foundation' },
            { name: 'Magazine (half-frame) foundation' },
          ],
        },
        { name: 'Wired beeswax foundation' },
        { name: 'Organic beeswax foundation' },
        {
          name: 'Plastic foundation',
          children: [{ name: 'Wax-coated plastic foundation' }, { name: 'Plastic frame with drawn comb' }],
        },
        { name: 'Drone-cell foundation' },
        { name: 'Small-cell foundation' },
        { name: 'Foundation rolling and embossing wax' },
      ],
    },
    {
      name: 'Dead bees',
      ru: 'Пчелиный подмор',
      children: [
        { name: 'Dried whole dead bees' },
        { name: 'Dead bee powder' },
        { name: 'Alcohol extract of dead bees' },
        { name: 'Dead bees with propolis extract' },
      ],
    },
  ],
};
