import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * The broadest processed-food category: 21 frozen level-2 nodes, each opened up to the form a
 * trader actually contracts on. Oils, tea/coffee/cocoa, sugar, canned goods, dried fruit and
 * tomato paste run to level 5 (IV numbers, leaf grades, screen sizes, ICUMSA, count bands, Brix).
 */
export const processedProducts: TaxCategory = {
  name: 'Processed products',
  emoji: '🏭',
  tint: TINT.stone,
  children: [
    {
      name: 'Frozen mushrooms',
      ru: 'Замороженные грибы',
      children: [
        {
          name: 'Champignon (frozen)',
          children: [
            { name: 'Whole IQF champignon' },
            { name: 'Sliced IQF champignon' },
            { name: 'Quartered champignon' },
            { name: 'Champignon stems & pieces' },
          ],
        },
        {
          name: 'Porcini (frozen)',
          children: [
            { name: 'Whole porcini IQF' },
            { name: 'Sliced porcini IQF' },
            { name: 'Porcini cubes' },
            { name: 'Porcini caps only' },
          ],
        },
        {
          name: 'Oyster mushroom (frozen)',
          children: [
            { name: 'Whole oyster mushroom IQF' },
            { name: 'Sliced oyster mushroom IQF' },
          ],
        },
        { name: 'Chanterelle (frozen)' },
        { name: 'Shiitake (frozen)' },
        { name: 'Honey fungus (frozen)' },
        { name: 'Boletus mix (frozen)' },
        { name: 'Morel (frozen)' },
        { name: 'Wild forest mushroom mix (frozen)' },
      ],
    },
    {
      name: 'Frozen fruits & vegetables',
      ru: 'Замороженные фрукты и овощи',
      children: [
        {
          name: 'Frozen berries',
          children: [
            {
              name: 'Strawberry IQF',
              children: [
                { name: 'Whole strawberry IQF' },
                { name: 'Strawberry halves IQF' },
                { name: 'Strawberry crumble & pieces' },
                { name: 'Block-frozen strawberry' },
              ],
            },
            {
              name: 'Raspberry IQF',
              children: [
                { name: 'Whole raspberry IQF' },
                { name: 'Raspberry crumble' },
                { name: 'Block-frozen raspberry' },
              ],
            },
            { name: 'Blackcurrant IQF' },
            { name: 'Redcurrant IQF' },
            { name: 'Blueberry IQF' },
            { name: 'Sour cherry IQF (pitted)' },
            { name: 'Cranberry IQF' },
            { name: 'Blackberry IQF' },
            { name: 'Sea buckthorn IQF' },
            { name: 'Lingonberry IQF' },
          ],
        },
        {
          name: 'Frozen fruits',
          children: [
            { name: 'Mango chunks IQF' },
            { name: 'Pineapple chunks IQF' },
            { name: 'Peach slices IQF' },
            { name: 'Apricot halves IQF' },
            { name: 'Plum halves IQF' },
            { name: 'Apple cubes IQF' },
            { name: 'Banana slices IQF' },
            { name: 'Avocado pulp (frozen)' },
            { name: 'Sweet cherry IQF' },
          ],
        },
        {
          name: 'Frozen vegetables',
          children: [
            {
              name: 'Green peas IQF',
              children: [
                { name: 'Fine peas 7.5–8.75 mm' },
                { name: 'Standard peas 8.75–10.2 mm' },
                { name: 'Large peas above 10.2 mm' },
              ],
            },
            {
              name: 'Sweet corn IQF',
              children: [
                { name: 'Sweet corn kernels IQF' },
                { name: 'Corn on the cob (frozen)' },
                { name: 'Baby corn IQF' },
              ],
            },
            { name: 'Green beans IQF' },
            { name: 'Broccoli florets IQF' },
            { name: 'Cauliflower florets IQF' },
            { name: 'Carrot dice IQF' },
            { name: 'Spinach leaf & portions (frozen)' },
            { name: 'Okra IQF' },
            { name: 'Bell pepper strips IQF' },
            { name: 'Onion dice IQF' },
            { name: 'Brussels sprouts IQF' },
            { name: 'Green chilli IQF' },
            { name: 'Edamame IQF' },
          ],
        },
        {
          name: 'Frozen potato products',
          children: [
            { name: 'French fries 7×7 mm' },
            { name: 'French fries 9×9 mm' },
            { name: 'French fries 10×10 mm' },
            { name: 'Crinkle-cut fries' },
            { name: 'Potato wedges' },
            { name: 'Hash browns' },
            { name: 'Potato dices' },
            { name: 'Steam-peeled whole potatoes' },
          ],
        },
        {
          name: 'Frozen vegetable mixes',
          children: [
            { name: 'Mexican mix' },
            { name: 'Hawaiian mix' },
            { name: 'Soup vegetable mix' },
            { name: 'Stir-fry mix' },
            { name: 'Ratatouille mix' },
            { name: 'Paella mix' },
          ],
        },
        {
          name: 'Frozen herbs',
          children: [
            { name: 'Frozen dill' },
            { name: 'Frozen parsley' },
            { name: 'Frozen cilantro' },
            { name: 'Frozen herb cubes' },
          ],
        },
      ],
    },
    {
      name: 'Protein isolates',
      ru: 'Изоляты',
      children: [
        {
          name: 'Soy protein isolate',
          children: [
            { name: 'SPI 90% gel type' },
            { name: 'SPI 90% emulsion type' },
            { name: 'SPI injection grade' },
            { name: 'SPI dispersible grade' },
          ],
        },
        {
          name: 'Pea protein isolate',
          children: [
            { name: 'Pea protein isolate 80%' },
            { name: 'Pea protein isolate 85%' },
            { name: 'Hydrolysed pea protein isolate' },
          ],
        },
        {
          name: 'Whey protein isolate',
          children: [
            { name: 'WPI 90% instantised' },
            { name: 'WPI 90% regular' },
            { name: 'Ion-exchange WPI' },
            { name: 'Microfiltered WPI' },
          ],
        },
        { name: 'Rice protein isolate' },
        { name: 'Potato protein isolate' },
        { name: 'Rapeseed / canola protein isolate' },
        { name: 'Sunflower protein isolate' },
        { name: 'Faba bean protein isolate' },
        { name: 'Mung bean protein isolate' },
        {
          name: 'Casein & caseinates',
          children: [
            { name: 'Acid casein' },
            { name: 'Rennet casein' },
            { name: 'Sodium caseinate' },
            { name: 'Calcium caseinate' },
            { name: 'Micellar casein isolate' },
          ],
        },
        { name: 'Egg white protein isolate' },
        { name: 'Collagen peptide isolate' },
      ],
    },
    {
      name: 'Ketchup',
      ru: 'Кетчуп',
      children: [
        {
          name: 'Classic tomato ketchup',
          children: [
            { name: 'Ketchup with 25% tomato content' },
            { name: 'Ketchup with 30% tomato content' },
            { name: 'Ketchup with 40%+ tomato content' },
          ],
        },
        { name: 'Hot & spicy ketchup' },
        { name: 'Garlic ketchup' },
        { name: 'Curry ketchup' },
        { name: 'Barbecue-style ketchup' },
        { name: 'No-added-sugar ketchup' },
        { name: 'Bulk industrial ketchup (aseptic)' },
      ],
    },
    {
      name: 'Confectionery',
      ru: 'Кондитерские изделия',
      children: [
        {
          name: 'Chocolate & chocolate products',
          children: [
            {
              name: 'Dark chocolate',
              children: [
                { name: 'Dark chocolate 55% cocoa' },
                { name: 'Dark chocolate 70% cocoa' },
                { name: 'Dark chocolate 85% cocoa' },
              ],
            },
            { name: 'Milk chocolate' },
            { name: 'White chocolate' },
            { name: 'Compound chocolate' },
            {
              name: 'Couverture chocolate',
              children: [
                { name: 'Dark couverture 60/40' },
                { name: 'Milk couverture' },
                { name: 'Chocolate callets & pistoles' },
              ],
            },
            { name: 'Filled chocolate bars' },
            { name: 'Chocolate chips & drops' },
            { name: 'Pralines & truffles' },
            { name: 'Chocolate-coated dragées' },
          ],
        },
        {
          name: 'Sugar confectionery',
          children: [
            { name: 'Hard-boiled candy' },
            { name: 'Toffee & fudge' },
            { name: 'Caramel (chewy)' },
            { name: 'Lollipops' },
            { name: 'Jelly & gummy sweets' },
            { name: 'Liquorice' },
            { name: 'Sugar dragées' },
            { name: 'Nougat' },
            { name: 'Mints & lozenges' },
          ],
        },
        {
          name: 'Flour confectionery',
          children: [
            {
              name: 'Biscuits & cookies',
              children: [
                { name: 'Glucose biscuits' },
                { name: 'Marie biscuits' },
                { name: 'Digestive biscuits' },
                { name: 'Cream-filled sandwich biscuits' },
                { name: 'Shortbread cookies' },
                { name: 'Butter cookies' },
              ],
            },
            { name: 'Wafers & wafer rolls' },
            { name: 'Crackers' },
            { name: 'Cakes & pastries' },
            { name: 'Gingerbread (pryaniki)' },
            { name: 'Rusks & croutons' },
            { name: 'Muffins & cupcakes' },
          ],
        },
        {
          name: 'Halva & sesame sweets',
          children: [
            { name: 'Sunflower halva' },
            { name: 'Sesame (tahini) halva' },
            { name: 'Peanut halva' },
            { name: 'Sesame snaps & bars' },
            { name: 'Pistachio halva' },
          ],
        },
        {
          name: 'Oriental sweets',
          children: [
            { name: 'Turkish delight (lokum)' },
            { name: 'Baklava' },
            { name: 'Churchkhela' },
            { name: 'Kozinaki' },
            { name: 'Sherbet blocks' },
          ],
        },
        {
          name: 'Marshmallow & pastille',
          children: [
            { name: 'Zefir' },
            { name: 'Marshmallow' },
            { name: 'Pastila' },
            { name: 'Fruit marmalade jellies' },
          ],
        },
        {
          name: 'Chewing gum',
          children: [
            { name: 'Sugar-free chewing gum' },
            { name: 'Bubble gum' },
            { name: 'Coated pellet gum' },
          ],
        },
        {
          name: 'Cereal & nut bars',
          children: [
            { name: 'Muesli & granola bars' },
            { name: 'Protein bars' },
            { name: 'Fruit & nut bars' },
            { name: 'Date bars' },
          ],
        },
      ],
    },
    {
      name: 'Canned goods',
      ru: 'Консервированные продукты',
      children: [
        {
          name: 'Canned vegetables',
          children: [
            { name: 'Canned sweet corn' },
            { name: 'Canned green peas' },
            {
              name: 'Canned tomatoes',
              children: [
                { name: 'Whole peeled tomatoes' },
                { name: 'Chopped / diced tomatoes' },
                { name: 'Cherry tomatoes canned' },
                { name: 'Tomatoes in own juice' },
              ],
            },
            { name: 'Baked beans in tomato sauce' },
            { name: 'Canned mixed vegetables' },
            { name: 'Canned olives' },
            { name: 'Canned bamboo shoots' },
            { name: 'Canned water chestnuts' },
            { name: 'Canned asparagus' },
          ],
        },
        {
          name: 'Canned fruits',
          children: [
            {
              name: 'Canned pineapple',
              children: [
                { name: 'Pineapple slices' },
                { name: 'Pineapple chunks' },
                { name: 'Pineapple tidbits' },
                { name: 'Crushed pineapple' },
              ],
            },
            { name: 'Canned peaches' },
            { name: 'Canned mandarin segments' },
            { name: 'Canned pears' },
            { name: 'Canned lychee' },
            { name: 'Canned fruit cocktail' },
            { name: 'Canned mango slices' },
            { name: 'Canned apricot halves' },
          ],
        },
        {
          name: 'Canned fish & seafood',
          children: [
            {
              name: 'Canned tuna',
              children: [
                { name: 'Tuna chunks in oil' },
                { name: 'Tuna chunks in brine' },
                { name: 'Tuna solid pack' },
                { name: 'Tuna flakes' },
                { name: 'Shredded tuna' },
              ],
            },
            { name: 'Canned sardines' },
            { name: 'Canned mackerel' },
            { name: 'Canned sprats' },
            { name: 'Canned salmon' },
            { name: 'Canned squid' },
            { name: 'Canned mussels' },
            { name: 'Canned anchovies' },
          ],
        },
        {
          name: 'Canned meat',
          children: [
            { name: 'Corned beef' },
            { name: 'Canned stewed beef (tushonka)' },
            { name: 'Canned stewed pork' },
            { name: 'Canned chicken' },
            { name: 'Luncheon meat' },
            { name: 'Canned pâté & liver spread' },
          ],
        },
        {
          name: 'Canned legumes',
          children: [
            { name: 'Canned chickpeas' },
            { name: 'Canned red kidney beans' },
            { name: 'Canned white beans' },
            { name: 'Canned black beans' },
            { name: 'Canned lentils' },
          ],
        },
        {
          name: 'Canned mushrooms',
          children: [
            { name: 'Canned champignons whole' },
            { name: 'Canned champignons sliced' },
            { name: 'Canned straw mushrooms' },
            { name: 'Canned porcini' },
            { name: 'Marinated honey fungus' },
          ],
        },
        {
          name: 'Pickled & marinated products',
          children: [
            {
              name: 'Pickled gherkins & cucumbers',
              children: [
                { name: 'Gherkins 3–6 cm' },
                { name: 'Gherkins 6–9 cm' },
                { name: 'Gherkins 9–12 cm' },
                { name: 'Sliced pickle chips' },
              ],
            },
            { name: 'Pickled tomatoes' },
            { name: 'Sauerkraut' },
            { name: 'Pickled peppers' },
            { name: 'Pickled jalapeños' },
            { name: 'Marinated garlic' },
            { name: 'Mixed pickles (giardiniera)' },
            { name: 'Pickled beetroot' },
          ],
        },
        {
          name: 'Jams, preserves & compotes',
          children: [
            { name: 'Fruit jam' },
            { name: 'Fruit preserve (konfitura)' },
            { name: 'Fruit jelly' },
            { name: 'Citrus marmalade' },
            { name: 'Bake-stable fruit filling' },
            { name: 'Fruit compote in syrup' },
          ],
        },
      ],
    },
    {
      name: 'Concentrates',
      ru: 'Концентраты',
      children: [
        {
          name: 'Fruit juice concentrates',
          children: [
            {
              name: 'Apple juice concentrate',
              children: [
                { name: 'Clear AJC 70 Brix' },
                { name: 'Cloudy AJC 70 Brix' },
                { name: 'AJC 65 Brix' },
              ],
            },
            {
              name: 'Orange juice concentrate',
              children: [
                { name: 'FCOJ 65 Brix' },
                { name: 'Orange juice concentrate with pulp' },
              ],
            },
            { name: 'Grape juice concentrate' },
            { name: 'Pineapple juice concentrate' },
            { name: 'Mango juice concentrate' },
            { name: 'Pear juice concentrate' },
            { name: 'Lemon juice concentrate' },
            { name: 'Pomegranate juice concentrate' },
            { name: 'Peach juice concentrate' },
          ],
        },
        {
          name: 'Berry juice concentrates',
          children: [
            { name: 'Blackcurrant concentrate' },
            { name: 'Sour cherry concentrate' },
            { name: 'Strawberry concentrate' },
            { name: 'Cranberry concentrate' },
            { name: 'Aronia (chokeberry) concentrate' },
            { name: 'Sea buckthorn concentrate' },
            { name: 'Elderberry concentrate' },
          ],
        },
        {
          name: 'Vegetable juice concentrates',
          children: [
            { name: 'Carrot juice concentrate' },
            { name: 'Beetroot juice concentrate' },
            { name: 'Celery juice concentrate' },
            { name: 'Pumpkin juice concentrate' },
          ],
        },
        {
          name: 'Protein concentrates',
          children: [
            { name: 'Soy protein concentrate 65%' },
            { name: 'Whey protein concentrate 80%' },
            { name: 'Whey protein concentrate 34%' },
            { name: 'Pea protein concentrate' },
            { name: 'Rapeseed protein concentrate' },
            { name: 'Milk protein concentrate 70%' },
          ],
        },
        {
          name: 'Aroma & extract concentrates',
          children: [
            { name: 'Natural fruit aroma (water phase)' },
            { name: 'Essential oil concentrate' },
            { name: 'Vanilla extract concentrate' },
            { name: 'Coffee extract concentrate' },
            { name: 'Malt extract' },
            { name: 'Liquorice root extract' },
          ],
        },
        {
          name: 'Beverage base concentrates',
          children: [
            { name: 'Cola base concentrate' },
            { name: 'Fruit drink base concentrate' },
            { name: 'Iced tea base concentrate' },
            { name: 'Squash & cordial base' },
          ],
        },
      ],
    },
    {
      name: 'Starch & syrup products',
      ru: 'Крахмало-паточная продукция',
      children: [
        {
          name: 'Native starches',
          children: [
            { name: 'Corn (maize) starch' },
            { name: 'Potato starch' },
            { name: 'Tapioca (cassava) starch' },
            { name: 'Wheat starch' },
            { name: 'Rice starch' },
            { name: 'Pea starch' },
            { name: 'Sago starch' },
            { name: 'Waxy maize starch' },
          ],
        },
        {
          name: 'Modified starches',
          children: [
            { name: 'Pregelatinised starch' },
            { name: 'Acetylated distarch adipate (E1422)' },
            { name: 'Hydroxypropyl distarch phosphate (E1442)' },
            { name: 'Octenyl succinic anhydride (OSA) starch (E1450)' },
            { name: 'Oxidised starch (E1404)' },
            { name: 'Distarch phosphate (E1412)' },
            { name: 'Cationic starch (industrial)' },
          ],
        },
        {
          name: 'Glucose & syrups',
          children: [
            { name: 'Glucose syrup 42 DE' },
            { name: 'Glucose syrup 63 DE' },
            { name: 'High-fructose corn syrup 42' },
            { name: 'High-fructose corn syrup 55' },
            { name: 'Dextrose monohydrate' },
            { name: 'Dextrose anhydrous' },
            { name: 'Glucose powder' },
            { name: 'Maltose syrup' },
            { name: 'Caramel colour & syrup' },
          ],
        },
        {
          name: 'Dextrins & maltodextrins',
          children: [
            { name: 'Maltodextrin DE 10' },
            { name: 'Maltodextrin DE 15' },
            { name: 'Maltodextrin DE 20' },
            { name: 'White dextrin' },
            { name: 'Yellow dextrin' },
            { name: 'Cyclodextrin' },
          ],
        },
        {
          name: 'Sweeteners & polyols',
          children: [
            { name: 'Sorbitol syrup 70%' },
            { name: 'Sorbitol powder' },
            { name: 'Maltitol syrup' },
            { name: 'Xylitol' },
            { name: 'Erythritol' },
            { name: 'Isomalt' },
            { name: 'Mannitol' },
            { name: 'Steviol glycosides (RA 97)' },
          ],
        },
        {
          name: 'Starch by-products',
          children: [
            { name: 'Corn gluten meal 60%' },
            { name: 'Corn gluten feed' },
            { name: 'Vital wheat gluten' },
            { name: 'Corn steep liquor' },
            { name: 'Corn germ' },
          ],
        },
      ],
    },
    {
      name: 'Groats',
      ru: 'Крупа',
      children: [
        {
          name: 'Buckwheat groats',
          children: [
            { name: 'Whole kernel buckwheat (yadritsa)' },
            { name: 'Split buckwheat (prodel)' },
            { name: 'Green (unroasted) buckwheat' },
            { name: 'Roasted buckwheat' },
            { name: 'Buckwheat flakes' },
          ],
        },
        {
          name: 'Rice groats',
          children: [
            {
              name: 'Long-grain milled rice',
              children: [
                { name: 'Long-grain rice 5% broken' },
                { name: 'Long-grain rice 15% broken' },
                { name: 'Long-grain rice 25% broken' },
              ],
            },
            { name: 'Medium-grain milled rice' },
            { name: 'Round-grain milled rice' },
            { name: 'Parboiled rice' },
            { name: 'Brown rice' },
            { name: 'Broken rice (100%)' },
            { name: 'Steamed rice groats' },
            { name: 'Wild rice' },
            { name: 'Rice flakes (poha)' },
          ],
        },
        {
          name: 'Wheat groats',
          children: [
            {
              name: 'Semolina',
              children: [
                { name: 'Semolina grade T (durum)' },
                { name: 'Semolina grade M (soft wheat)' },
                { name: 'Fine rava (chiroti)' },
                { name: 'Coarse sooji' },
              ],
            },
            {
              name: 'Bulgur',
              children: [
                { name: 'Fine bulgur (#1)' },
                { name: 'Medium bulgur (#2)' },
                { name: 'Coarse bulgur (#3)' },
                { name: 'Pilavlik bulgur' },
              ],
            },
            { name: 'Poltavskaya groats' },
            { name: 'Artek groats' },
            { name: 'Cracked wheat (dalia)' },
            { name: 'Couscous' },
            { name: 'Freekeh' },
          ],
        },
        {
          name: 'Oat products',
          children: [
            { name: 'Whole oat groats' },
            { name: 'Steel-cut oats' },
            { name: 'Rolled oats (Gerkules)' },
            { name: 'Quick-cooking oat flakes' },
            { name: 'Instant oat flakes' },
            { name: 'Oat bran' },
          ],
        },
        {
          name: 'Barley groats',
          children: [
            {
              name: 'Pearl barley',
              children: [
                { name: 'Pearl barley No.1' },
                { name: 'Pearl barley No.2' },
                { name: 'Pearl barley No.3' },
              ],
            },
            { name: 'Barley grits (yachnevaya)' },
            { name: 'Pot barley' },
            { name: 'Barley flakes' },
          ],
        },
        {
          name: 'Millet groats',
          children: [
            { name: 'Polished millet (proso)' },
            { name: 'Foxtail millet' },
            { name: 'Pearl millet (bajra)' },
            { name: 'Finger millet (ragi)' },
            { name: 'Kodo millet' },
            { name: 'Little millet' },
            { name: 'Barnyard millet' },
          ],
        },
        {
          name: 'Corn groats',
          children: [
            { name: 'Corn grits (polenta)' },
            { name: 'Fine corn grits' },
            { name: 'Corn semolina' },
            { name: 'Hominy' },
            { name: 'Corn flakes (unsweetened)' },
          ],
        },
        {
          name: 'Pulse groats & dals',
          children: [
            { name: 'Split yellow peas' },
            { name: 'Split green peas' },
            { name: 'Split red lentils (masoor dal)' },
            { name: 'Chana dal' },
            { name: 'Toor / arhar dal' },
            { name: 'Urad dal' },
            { name: 'Moong dal' },
          ],
        },
        {
          name: 'Specialty groats',
          children: [
            { name: 'White quinoa' },
            { name: 'Red quinoa' },
            { name: 'Black quinoa' },
            { name: 'Amaranth grain' },
            { name: 'Sorghum grits' },
            { name: 'Teff grain' },
            { name: 'Spelt groats' },
          ],
        },
      ],
    },
    {
      name: 'Mayonnaise',
      ru: 'Майонез',
      children: [
        {
          name: 'Classic mayonnaise',
          children: [
            { name: 'Mayonnaise 67% fat' },
            { name: 'Mayonnaise 50% fat' },
            { name: 'Mayonnaise 30% fat (light)' },
          ],
        },
        { name: 'Eggless mayonnaise' },
        {
          name: 'Flavoured mayonnaise',
          children: [
            { name: 'Garlic mayonnaise (aioli)' },
            { name: 'Chipotle mayonnaise' },
            { name: 'Mustard mayonnaise' },
            { name: 'Herb mayonnaise' },
            { name: 'Tandoori mayonnaise' },
          ],
        },
        {
          name: 'Mayonnaise-based sauces',
          children: [
            { name: 'Tartare sauce' },
            { name: 'Thousand island dressing' },
            { name: 'Caesar dressing' },
            { name: 'Burger & sandwich sauce' },
          ],
        },
        { name: 'Bulk industrial mayonnaise' },
      ],
    },
    {
      name: 'Pasta',
      ru: 'Макаронные изделия',
      children: [
        {
          name: 'Long-cut pasta',
          children: [
            {
              name: 'Spaghetti',
              children: [
                { name: 'Spaghetti No.3' },
                { name: 'Spaghetti No.5' },
                { name: 'Spaghetti No.7' },
              ],
            },
            { name: 'Spaghettini' },
            { name: 'Linguine' },
            { name: 'Fettuccine' },
            { name: 'Tagliatelle' },
            { name: 'Bucatini' },
            { name: 'Capellini' },
            { name: 'Vermicelli' },
          ],
        },
        {
          name: 'Short-cut pasta',
          children: [
            { name: 'Penne rigate' },
            { name: 'Penne lisce' },
            { name: 'Fusilli' },
            { name: 'Rigatoni' },
            { name: 'Macaroni elbows' },
            { name: 'Farfalle' },
            { name: 'Conchiglie' },
            { name: 'Ditalini' },
            { name: 'Orzo' },
            { name: 'Rotini' },
          ],
        },
        {
          name: 'Egg pasta',
          children: [
            { name: 'Broad egg noodles' },
            { name: 'Egg tagliatelle nests' },
            { name: 'Egg vermicelli' },
            { name: 'Egg lasagne sheets' },
          ],
        },
        {
          name: 'Filled & stuffed pasta',
          children: [
            { name: 'Ravioli' },
            { name: 'Tortellini' },
            { name: 'Pelmeni' },
            { name: 'Vareniki' },
            { name: 'Cannelloni' },
          ],
        },
        {
          name: 'Asian noodles',
          children: [
            { name: 'Wheat noodles (udon)' },
            { name: 'Rice noodles & vermicelli' },
            { name: 'Egg noodles (chow mein)' },
            { name: 'Soba (buckwheat noodles)' },
            { name: 'Glass noodles (mung bean)' },
            { name: 'Ramen noodle blocks' },
          ],
        },
        {
          name: 'Alternative-flour pasta',
          children: [
            { name: 'Corn pasta' },
            { name: 'Rice pasta' },
            { name: 'Buckwheat pasta' },
            { name: 'Chickpea pasta' },
            { name: 'Lentil pasta' },
            { name: 'Whole-wheat pasta' },
            { name: 'Spelt pasta' },
          ],
        },
        {
          name: 'Sheet & baked pasta',
          children: [
            { name: 'Lasagne sheets' },
            { name: 'Cannelloni tubes' },
            { name: 'Pasta bake mixes' },
          ],
        },
      ],
    },
    {
      name: 'Oils & fats',
      ru: 'Масложировая продукция',
      children: [
        {
          name: 'Sunflower oil',
          children: [
            { name: 'Crude sunflower oil' },
            {
              name: 'Refined sunflower oil',
              children: [
                { name: 'Refined winterised deodorised sunflower oil' },
                { name: 'Refined non-winterised sunflower oil' },
                { name: 'RBD sunflower oil' },
              ],
            },
            { name: 'Cold-pressed sunflower oil' },
            {
              name: 'High-oleic sunflower oil',
              children: [
                { name: 'High-oleic sunflower oil 80%+' },
                { name: 'Mid-oleic sunflower oil 55–75%' },
              ],
            },
          ],
        },
        {
          name: 'Palm oil',
          children: [
            { name: 'Crude palm oil (CPO)' },
            { name: 'RBD palm oil' },
            {
              name: 'RBD palm olein',
              children: [
                { name: 'Palm olein IV 56' },
                { name: 'Palm olein IV 60' },
                { name: 'Super olein IV 64' },
              ],
            },
            {
              name: 'RBD palm stearin',
              children: [
                { name: 'Palm stearin IV 32' },
                { name: 'Palm stearin IV 40' },
              ],
            },
            { name: 'Palm kernel oil' },
            { name: 'Palm mid fraction' },
            { name: 'Red palm oil' },
          ],
        },
        {
          name: 'Soybean oil',
          children: [
            { name: 'Crude degummed soybean oil' },
            {
              name: 'Refined soybean oil',
              children: [
                { name: 'RBD soybean oil' },
                { name: 'Winterised soybean oil' },
              ],
            },
            { name: 'Cold-pressed soybean oil' },
            { name: 'Soybean lecithin' },
          ],
        },
        {
          name: 'Rapeseed & canola oil',
          children: [
            { name: 'Crude rapeseed oil' },
            { name: 'Refined rapeseed oil' },
            { name: 'Cold-pressed rapeseed oil' },
            { name: 'Low-erucic canola oil' },
            { name: 'High-erucic rapeseed oil (industrial)' },
          ],
        },
        {
          name: 'Mustard oil',
          children: [
            { name: 'Kachi ghani mustard oil' },
            { name: 'Refined mustard oil' },
            { name: 'Cold-pressed mustard oil' },
          ],
        },
        {
          name: 'Olive oil',
          children: [
            {
              name: 'Extra virgin olive oil',
              children: [
                { name: 'Early-harvest extra virgin olive oil' },
                { name: 'Filtered extra virgin olive oil' },
                { name: 'Unfiltered extra virgin olive oil' },
              ],
            },
            { name: 'Virgin olive oil' },
            { name: 'Refined olive oil' },
            { name: 'Lampante olive oil' },
            { name: 'Olive pomace oil' },
          ],
        },
        {
          name: 'Coconut oil',
          children: [
            { name: 'Crude coconut oil' },
            { name: 'RBD coconut oil' },
            {
              name: 'Virgin coconut oil',
              children: [
                { name: 'Cold-pressed virgin coconut oil' },
                { name: 'Centrifuged virgin coconut oil' },
                { name: 'Fermented virgin coconut oil' },
              ],
            },
            { name: 'Fractionated coconut oil (MCT)' },
          ],
        },
        {
          name: 'Groundnut oil',
          children: [
            { name: 'Crude groundnut oil' },
            { name: 'Refined groundnut oil' },
            { name: 'Cold-pressed filtered groundnut oil' },
            { name: 'Roasted groundnut oil' },
          ],
        },
        {
          name: 'Sesame oil',
          children: [
            { name: 'Crude sesame oil' },
            { name: 'Refined sesame oil' },
            { name: 'Cold-pressed sesame oil' },
            { name: 'Toasted (dark) sesame oil' },
          ],
        },
        {
          name: 'Corn oil',
          children: [
            { name: 'Crude corn oil' },
            { name: 'Refined corn oil' },
            { name: 'Cold-pressed corn oil' },
          ],
        },
        {
          name: 'Cottonseed oil',
          children: [
            { name: 'Crude cottonseed oil' },
            { name: 'Refined cottonseed oil' },
            { name: 'Winterised cottonseed oil' },
          ],
        },
        {
          name: 'Rice bran oil',
          children: [
            { name: 'Crude rice bran oil' },
            { name: 'Refined rice bran oil' },
            { name: 'Physically refined rice bran oil' },
            { name: 'High-oryzanol rice bran oil' },
          ],
        },
        {
          name: 'Safflower oil',
          children: [
            { name: 'Refined safflower oil' },
            { name: 'High-oleic safflower oil' },
            { name: 'Cold-pressed safflower oil' },
          ],
        },
        {
          name: 'Flaxseed & linseed oil',
          children: [
            { name: 'Cold-pressed flaxseed oil' },
            { name: 'Refined linseed oil' },
            { name: 'Boiled linseed oil (industrial)' },
          ],
        },
        {
          name: 'Specialty seed & nut oils',
          children: [
            { name: 'Grapeseed oil' },
            { name: 'Pumpkin seed oil' },
            { name: 'Black cumin (nigella) oil' },
            { name: 'Walnut oil' },
            { name: 'Almond oil' },
            { name: 'Avocado oil' },
            { name: 'Hemp seed oil' },
            { name: 'Camelina oil' },
            { name: 'Argan oil' },
            { name: 'Milk thistle oil' },
          ],
        },
        {
          name: 'Margarine & spreads',
          children: [
            { name: 'Table margarine' },
            {
              name: 'Bakery margarine',
              children: [
                { name: 'Bakery margarine 80% fat' },
                { name: 'Roll-in (puff pastry) margarine' },
                { name: 'Croissant margarine' },
              ],
            },
            { name: 'Cake & cream margarine' },
            { name: 'Fat spreads' },
            { name: 'Shortening' },
          ],
        },
        {
          name: 'Vanaspati & hydrogenated fats',
          children: [
            { name: 'Vanaspati ghee' },
            { name: 'Partially hydrogenated vegetable fat' },
            { name: 'Fully hydrogenated hardstock' },
            { name: 'Interesterified fat' },
          ],
        },
        {
          name: 'Specialty industrial fats',
          children: [
            { name: 'Cocoa butter equivalent (CBE)' },
            { name: 'Cocoa butter substitute (CBS)' },
            { name: 'Confectionery filling fat' },
            { name: 'Ice cream coating fat' },
            { name: 'Non-dairy creamer fat' },
            { name: 'Frying fat' },
          ],
        },
        {
          name: 'Animal fats',
          children: [
            { name: 'Edible beef tallow' },
            { name: 'Technical tallow' },
            { name: 'Lard (rendered pork fat)' },
            { name: 'Poultry fat' },
            { name: 'Duck fat' },
            { name: 'Edible fish oil' },
          ],
        },
        {
          name: 'Oleochemicals',
          children: [
            { name: 'Distilled fatty acids' },
            { name: 'Stearic acid' },
            { name: 'Oleic acid' },
            { name: 'Fatty alcohols' },
            {
              name: 'Glycerine',
              children: [
                { name: 'USP-grade glycerine 99.7%' },
                { name: 'Technical-grade glycerine 99.5%' },
                { name: 'Crude glycerine 80%' },
              ],
            },
            { name: 'Soap noodles' },
            { name: 'Fatty acid methyl esters (biodiesel)' },
            { name: 'Lecithin (liquid & powder)' },
          ],
        },
      ],
    },
    {
      name: 'Flour',
      ru: 'Мука',
      children: [
        {
          name: 'Wheat flour',
          children: [
            {
              name: 'Maida (refined wheat flour)',
              children: [
                { name: 'Bakery maida' },
                { name: 'Biscuit maida' },
                { name: 'Noodle maida' },
              ],
            },
            { name: 'Atta (whole wheat flour)' },
            { name: 'Chakki atta' },
            { name: 'Bread flour (high gluten)' },
            { name: 'Cake & soft wheat flour' },
            { name: 'Durum semolina flour' },
            { name: 'Wheat flour higher grade' },
            { name: 'Wheat flour grade 1' },
            { name: 'Wheat flour grade 2' },
          ],
        },
        {
          name: 'Corn flour',
          children: [
            { name: 'Fine maize flour' },
            { name: 'Corn meal (coarse)' },
            { name: 'Masa harina (nixtamalised)' },
          ],
        },
        {
          name: 'Rice flour',
          children: [
            { name: 'White rice flour' },
            { name: 'Brown rice flour' },
            { name: 'Glutinous rice flour' },
            { name: 'Parboiled rice flour' },
            { name: 'Idli rava (rice semolina)' },
          ],
        },
        {
          name: 'Gram & pulse flour',
          children: [
            { name: 'Besan (gram flour)' },
            { name: 'Chana sattu' },
            { name: 'Full-fat soy flour' },
            { name: 'Defatted soy flour' },
            { name: 'Lentil flour' },
            { name: 'Pea flour' },
            { name: 'Urad dal flour' },
            { name: 'Moong flour' },
            { name: 'Faba bean flour' },
          ],
        },
        {
          name: 'Millet & sorghum flour',
          children: [
            { name: 'Jowar (sorghum) flour' },
            { name: 'Bajra (pearl millet) flour' },
            { name: 'Ragi (finger millet) flour' },
            { name: 'Foxtail millet flour' },
            { name: 'Buckwheat flour' },
            { name: 'Amaranth flour' },
            { name: 'Quinoa flour' },
          ],
        },
        {
          name: 'Oat, barley & rye flour',
          children: [
            { name: 'Oat flour' },
            { name: 'Barley flour' },
            { name: 'Rye flour' },
            { name: 'Malted barley flour' },
          ],
        },
        {
          name: 'Root & tuber flour',
          children: [
            { name: 'Cassava (tapioca) flour' },
            { name: 'Potato flour' },
            { name: 'Sweet potato flour' },
            { name: 'Plantain / banana flour' },
            { name: 'Yam flour' },
          ],
        },
        {
          name: 'Nut & seed flour',
          children: [
            { name: 'Almond flour' },
            { name: 'Coconut flour' },
            { name: 'Peanut flour' },
            { name: 'Sesame flour' },
            { name: 'Flaxseed meal' },
            { name: 'Chestnut flour' },
          ],
        },
        {
          name: 'Bakery premixes & composite flours',
          children: [
            { name: 'Bread premix' },
            { name: 'Cake premix' },
            { name: 'Pizza flour blend' },
            { name: 'Gluten-free flour blend' },
            { name: 'Doughnut premix' },
            { name: 'Vital wheat gluten blend' },
          ],
        },
      ],
    },
    {
      name: 'Beverages',
      ru: 'Напитки',
      children: [
        {
          name: 'Juices & nectars',
          children: [
            {
              name: 'Apple juice',
              children: [
                { name: 'NFC apple juice' },
                { name: 'Apple juice from concentrate' },
                { name: 'Cloudy apple juice' },
                { name: 'Clarified apple juice' },
              ],
            },
            {
              name: 'Orange juice',
              children: [
                { name: 'NFC orange juice' },
                { name: 'Orange juice from concentrate' },
                { name: 'Orange juice with pulp' },
              ],
            },
            { name: 'Mango juice & nectar' },
            { name: 'Pineapple juice' },
            { name: 'Grape juice' },
            { name: 'Tomato juice' },
            { name: 'Multifruit juice' },
            { name: 'Pomegranate juice' },
            { name: 'Cranberry juice' },
            { name: 'Cold-pressed vegetable juice' },
          ],
        },
        {
          name: 'Carbonated soft drinks',
          children: [
            { name: 'Cola' },
            { name: 'Lemon-lime soda' },
            { name: 'Orange soda' },
            { name: 'Ginger ale' },
            { name: 'Tonic water' },
            { name: 'Club soda' },
            { name: 'Fruit-flavoured carbonates' },
            { name: 'Sugar-free carbonates' },
          ],
        },
        {
          name: 'Water',
          children: [
            { name: 'Natural mineral water' },
            { name: 'Spring water' },
            { name: 'Purified drinking water' },
            { name: 'Sparkling water' },
            { name: 'Flavoured water' },
            { name: 'Alkaline water' },
          ],
        },
        {
          name: 'Energy & sports drinks',
          children: [
            { name: 'Energy drinks' },
            { name: 'Isotonic sports drinks' },
            { name: 'Electrolyte concentrates' },
          ],
        },
        {
          name: 'Ready-to-drink tea & coffee',
          children: [
            { name: 'Iced tea (lemon)' },
            { name: 'Iced tea (peach)' },
            { name: 'RTD green tea' },
            { name: 'RTD cold brew coffee' },
            { name: 'RTD latte' },
          ],
        },
        {
          name: 'Syrups & cordials',
          children: [
            { name: 'Fruit squash' },
            { name: 'Fruit cordial' },
            { name: 'Grenadine syrup' },
            { name: 'Coffee flavouring syrup' },
            { name: 'Cocktail mixer syrup' },
            { name: 'Sugarcane syrup' },
          ],
        },
        {
          name: 'Plant-based drinks',
          children: [
            { name: 'Soy milk' },
            { name: 'Almond milk' },
            { name: 'Oat milk' },
            { name: 'Coconut milk drink' },
            { name: 'Rice milk' },
            { name: 'Cashew milk' },
          ],
        },
        {
          name: 'Fermented & traditional drinks',
          children: [
            { name: 'Kvass' },
            { name: 'Kombucha' },
            { name: 'Coconut water' },
            { name: 'Sugarcane juice' },
            { name: 'Aloe vera drink' },
          ],
        },
        {
          name: 'Alcoholic beverages',
          children: [
            {
              name: 'Beer',
              children: [
                { name: 'Lager' },
                { name: 'Ale' },
                { name: 'Stout' },
                { name: 'Wheat beer' },
                { name: 'IPA' },
              ],
            },
            {
              name: 'Wine',
              children: [
                { name: 'Red wine' },
                { name: 'White wine' },
                { name: 'Rosé wine' },
                { name: 'Sparkling wine' },
                { name: 'Fortified wine' },
              ],
            },
            { name: 'Cider' },
            { name: 'Vodka & neutral spirits' },
            { name: 'Fruit brandy' },
            { name: 'Liqueurs' },
          ],
        },
      ],
    },
    {
      name: 'Pastes & purées',
      ru: 'Пасты, пюре',
      children: [
        {
          name: 'Tomato paste & purée',
          children: [
            {
              name: 'Hot break tomato paste',
              children: [
                { name: 'Hot break paste 28–30% Brix' },
                { name: 'Hot break paste 30–32% Brix' },
                { name: 'Hot break paste 36–38% Brix' },
              ],
            },
            {
              name: 'Cold break tomato paste',
              children: [
                { name: 'Cold break paste 28–30% Brix' },
                { name: 'Cold break paste 36–38% Brix' },
              ],
            },
            { name: 'Tomato purée' },
            { name: 'Tomato pulp & pizza sauce' },
            { name: 'Tomato powder' },
          ],
        },
        {
          name: 'Fruit purées',
          children: [
            {
              name: 'Mango pulp',
              children: [
                { name: 'Alphonso mango pulp' },
                { name: 'Totapuri mango pulp' },
                { name: 'Kesar mango pulp' },
                { name: 'Sweetened mango pulp' },
              ],
            },
            { name: 'Guava pulp' },
            { name: 'Banana purée' },
            { name: 'Apple purée' },
            { name: 'Peach purée' },
            { name: 'Apricot purée' },
            { name: 'Strawberry purée' },
            { name: 'Papaya pulp' },
            { name: 'Pear purée' },
          ],
        },
        {
          name: 'Vegetable purées',
          children: [
            { name: 'Pumpkin purée' },
            { name: 'Carrot purée' },
            { name: 'Beetroot purée' },
            { name: 'Spinach purée' },
            { name: 'Sweet potato purée' },
            { name: 'Onion paste' },
            { name: 'Green pea purée' },
          ],
        },
        {
          name: 'Nut & seed pastes',
          children: [
            {
              name: 'Peanut butter',
              children: [
                { name: 'Smooth peanut butter' },
                { name: 'Crunchy peanut butter' },
                { name: 'Natural no-stir peanut butter' },
                { name: 'Industrial peanut paste' },
              ],
            },
            { name: 'Tahini (sesame paste)' },
            { name: 'Almond butter' },
            { name: 'Cashew paste' },
            { name: 'Hazelnut paste' },
            { name: 'Pistachio paste' },
            { name: 'Sunflower seed butter' },
            { name: 'Chocolate-hazelnut spread' },
          ],
        },
        {
          name: 'Chilli & spice pastes',
          children: [
            { name: 'Red chilli paste' },
            { name: 'Harissa' },
            { name: 'Gochujang' },
            { name: 'Sambal oelek' },
            { name: 'Curry paste' },
            { name: 'Tamarind paste' },
            { name: 'Ginger-garlic paste' },
            { name: 'Wasabi paste' },
          ],
        },
        {
          name: 'Legume pastes',
          children: [
            { name: 'Hummus (chickpea paste)' },
            { name: 'Miso' },
            { name: 'Red bean paste' },
            { name: 'Lentil paste' },
          ],
        },
      ],
    },
    {
      name: 'Instant foods',
      ru: 'Продукты быстрого приготовления',
      children: [
        {
          name: 'Instant noodles & pasta',
          children: [
            { name: 'Cup noodles' },
            { name: 'Packet instant noodles' },
            { name: 'Instant rice noodles' },
            { name: 'Instant vermicelli (sevai)' },
            { name: 'Instant pasta cups' },
          ],
        },
        {
          name: 'Instant soups & broths',
          children: [
            { name: 'Powdered soup mix' },
            { name: 'Cup soup' },
            { name: 'Bouillon cubes' },
            { name: 'Broth & stock powder' },
            { name: 'Instant miso soup' },
          ],
        },
        {
          name: 'Instant cereals & porridge',
          children: [
            { name: 'Instant oat porridge' },
            { name: 'Instant semolina porridge' },
            { name: 'Instant multigrain porridge' },
            { name: 'Infant cereal' },
            { name: 'Instant upma & poha mixes' },
          ],
        },
        {
          name: 'Instant beverage powders',
          children: [
            { name: 'Instant coffee 3-in-1 mix' },
            { name: 'Instant milk tea premix' },
            { name: 'Instant lemon tea powder' },
            { name: 'Drinking chocolate & cocoa mix' },
            { name: 'Instant fruit drink powder' },
          ],
        },
        {
          name: 'Ready-to-eat meals',
          children: [
            { name: 'Retort pouch curries' },
            { name: 'Ready-to-eat rice bowls' },
            { name: 'Ready-to-eat dal' },
            { name: 'Ready meal trays' },
          ],
        },
        {
          name: 'Seasoning & spice blends',
          children: [
            {
              name: 'Ground single spices',
              children: [
                { name: 'Turmeric powder' },
                { name: 'Red chilli powder' },
                { name: 'Coriander powder' },
                { name: 'Cumin powder' },
                { name: 'Black pepper powder' },
                { name: 'Cinnamon powder' },
                { name: 'Cardamom powder' },
              ],
            },
            { name: 'Curry powder' },
            { name: 'Garam masala' },
            { name: 'Tandoori masala' },
            { name: 'Chaat masala' },
            { name: 'Biryani masala' },
            { name: 'Chinese five-spice powder' },
            { name: 'BBQ seasoning rub' },
            { name: 'Italian herb seasoning' },
          ],
        },
        {
          name: 'Instant dessert & bakery mixes',
          children: [
            { name: 'Instant pudding mix' },
            { name: 'Jelly & dessert mix' },
            { name: 'Pancake mix' },
            { name: 'Cake mix' },
            { name: 'Idli & dosa batter mix' },
            { name: 'Custard powder' },
          ],
        },
        {
          name: 'Freeze-dried & dehydrated foods',
          children: [
            { name: 'Freeze-dried fruit pieces' },
            { name: 'Freeze-dried vegetables' },
            {
              name: 'Dehydrated onion',
              children: [
                { name: 'Onion kibbled flakes' },
                { name: 'Onion granules' },
                { name: 'Onion powder' },
                { name: 'Toasted onion' },
              ],
            },
            {
              name: 'Dehydrated garlic',
              children: [
                { name: 'Garlic flakes' },
                { name: 'Garlic granules' },
                { name: 'Garlic powder' },
              ],
            },
            { name: 'Dehydrated potato flakes' },
            { name: 'Dehydrated tomato flakes' },
          ],
        },
      ],
    },
    {
      name: 'Sugar',
      ru: 'Сахар',
      children: [
        {
          name: 'Raw sugar',
          children: [
            { name: 'VHP raw sugar (99.2 pol)' },
            { name: 'Raw cane sugar ICUMSA 600–1200' },
            { name: 'Raw cane sugar ICUMSA 1200+' },
            { name: 'Demerara raw sugar' },
          ],
        },
        {
          name: 'Refined sugar',
          children: [
            { name: 'Refined white sugar ICUMSA 45' },
            { name: 'Refined sugar ICUMSA 100' },
            { name: 'Refined sugar ICUMSA 150' },
            { name: 'EEC Grade 1 refined sugar' },
            { name: 'EEC Grade 2 refined sugar' },
          ],
        },
        {
          name: 'White crystal sugar',
          children: [
            { name: 'Plantation white sugar S30' },
            { name: 'Plantation white sugar M30' },
            { name: 'Mill white sugar ICUMSA 100–150' },
            { name: 'Sulphur-free crystal sugar' },
            { name: 'Sugar cubes' },
          ],
        },
        {
          name: 'Brown sugar',
          children: [
            { name: 'Light brown sugar' },
            { name: 'Dark brown sugar' },
            { name: 'Demerara sugar' },
            { name: 'Turbinado sugar' },
            { name: 'Muscovado sugar' },
          ],
        },
        {
          name: 'Jaggery & unrefined cane sugar',
          children: [
            { name: 'Cane jaggery blocks' },
            { name: 'Jaggery powder' },
            { name: 'Palm jaggery' },
            { name: 'Date palm jaggery' },
            { name: 'Coconut sugar' },
            { name: 'Panela / piloncillo' },
          ],
        },
        {
          name: 'Icing & specialty sugars',
          children: [
            { name: 'Icing sugar 6X' },
            { name: 'Icing sugar 10X' },
            { name: 'Caster (superfine) sugar' },
            { name: 'Pearl & nib sugar' },
            { name: 'Rock candy sugar' },
            { name: 'Fondant sugar' },
            { name: 'Sanding sugar' },
          ],
        },
        {
          name: 'Liquid sugar & molasses',
          children: [
            { name: 'Liquid invert sugar' },
            { name: 'Liquid sucrose 67 Brix' },
            { name: 'Golden syrup' },
            { name: 'Cane molasses' },
            { name: 'Beet molasses' },
            { name: 'Black treacle' },
          ],
        },
      ],
    },
    {
      name: 'Dried fruits & berries',
      ru: 'Сушёные фрукты и ягоды',
      children: [
        {
          name: 'Dried vine fruits',
          children: [
            {
              name: 'Golden raisins (sultana)',
              children: [
                { name: 'Jumbo golden raisins' },
                { name: 'Standard golden raisins' },
              ],
            },
            { name: 'Thompson seedless raisins' },
            { name: 'Black raisins' },
            { name: 'Zante currants' },
            { name: 'Munakka (large seeded raisin)' },
            { name: 'Green kishmish raisins' },
          ],
        },
        {
          name: 'Dates',
          children: [
            {
              name: 'Medjool dates',
              children: [
                { name: 'Jumbo Medjool dates' },
                { name: 'Large Medjool dates' },
                { name: 'Medium Medjool dates' },
              ],
            },
            { name: 'Deglet Nour dates' },
            { name: 'Ajwa dates' },
            { name: 'Sukkari dates' },
            { name: 'Safawi dates' },
            { name: 'Khudri dates' },
            { name: 'Zahidi dates' },
            { name: 'Barhi dates' },
            { name: 'Pitted dates' },
            { name: 'Date paste' },
          ],
        },
        {
          name: 'Dried stone fruits',
          children: [
            {
              name: 'Prunes (dried plums)',
              children: [
                { name: 'Prunes 30/40 count' },
                { name: 'Prunes 40/50 count' },
                { name: 'Prunes 60/70 count' },
                { name: 'Prunes 80/90 count' },
              ],
            },
            { name: 'Dried apricots (whole)' },
            { name: 'Dried apricot halves' },
            { name: 'Dried peaches' },
            { name: 'Dried cherries' },
          ],
        },
        {
          name: 'Dried tropical fruits',
          children: [
            { name: 'Dried mango slices' },
            { name: 'Dried pineapple rings' },
            { name: 'Dried papaya' },
            { name: 'Banana chips' },
            {
              name: 'Desiccated coconut',
              children: [
                { name: 'Fine grade desiccated coconut' },
                { name: 'Medium grade desiccated coconut' },
                { name: 'Coarse & chip grade desiccated coconut' },
                { name: 'High-fat desiccated coconut' },
              ],
            },
            { name: 'Dried jackfruit' },
            { name: 'Dried kiwi' },
          ],
        },
        {
          name: 'Dried berries',
          children: [
            { name: 'Dried cranberries' },
            { name: 'Dried blueberries' },
            { name: 'Dried goji berries' },
            { name: 'Dried sea buckthorn' },
            { name: 'Dried barberry' },
            { name: 'Dried mulberry' },
            { name: 'Dried rosehip' },
            { name: 'Dried strawberry' },
          ],
        },
        {
          name: 'Dried apple & pear',
          children: [
            { name: 'Dried apple rings' },
            { name: 'Dried apple dices' },
            { name: 'Dried pear halves' },
            { name: 'Apple chips' },
          ],
        },
        {
          name: 'Freeze-dried fruit',
          children: [
            { name: 'Freeze-dried strawberry' },
            { name: 'Freeze-dried raspberry' },
            { name: 'Freeze-dried mango' },
            { name: 'Freeze-dried banana' },
            { name: 'Freeze-dried apple' },
          ],
        },
        {
          name: 'Candied & glacé fruits',
          children: [
            { name: 'Candied orange peel' },
            { name: 'Candied cherries' },
            { name: 'Candied pineapple' },
            { name: 'Candied ginger' },
            { name: 'Mixed candied peel' },
          ],
        },
      ],
    },
    {
      name: 'Texturates',
      ru: 'Текстураты',
      children: [
        {
          name: 'Textured soy protein',
          children: [
            {
              name: 'TVP granules',
              children: [
                { name: 'Fine TVP granules 2–4 mm' },
                { name: 'Medium TVP granules 4–8 mm' },
                { name: 'Coarse TVP granules 8–12 mm' },
              ],
            },
            { name: 'TVP chunks' },
            { name: 'TVP flakes' },
            { name: 'TVP mince' },
            { name: 'Textured soy protein concentrate (TSPC)' },
            { name: 'Soy nuggets (badi)' },
          ],
        },
        {
          name: 'Textured pea protein',
          children: [
            { name: 'Pea protein chunks' },
            { name: 'Pea protein granules' },
            { name: 'Pea protein strips' },
            { name: 'Pea protein mince' },
          ],
        },
        {
          name: 'Textured wheat protein',
          children: [
            { name: 'Seitan blocks' },
            { name: 'Wheat protein strips' },
            { name: 'Textured wheat granules' },
          ],
        },
        {
          name: 'High-moisture texturates',
          children: [
            { name: 'High-moisture soy texturate' },
            { name: 'High-moisture pea texturate' },
            { name: 'Whole-cut fibre texturate' },
          ],
        },
        {
          name: 'Fungal & mycoprotein texturates',
          children: [
            { name: 'Mycoprotein mince' },
            { name: 'Mycoprotein chunks' },
            { name: 'Fungal biomass powder' },
          ],
        },
        {
          name: 'Meat analogue bases',
          children: [
            { name: 'Burger patty base' },
            { name: 'Sausage analogue base' },
            { name: 'Nugget analogue base' },
            { name: 'Kebab & mince analogue base' },
          ],
        },
      ],
    },
    {
      name: 'Tea, coffee & cocoa',
      ru: 'Чай, кофе, какао-порошок и др.',
      children: [
        {
          name: 'Black tea',
          children: [
            {
              name: 'CTC black tea',
              children: [
                { name: 'BP (Broken Pekoe)' },
                { name: 'PF (Pekoe Fannings)' },
                { name: 'PD (Pekoe Dust)' },
                { name: 'OF (Orange Fannings)' },
                { name: 'Dust grades' },
              ],
            },
            {
              name: 'Orthodox black tea',
              children: [
                { name: 'PEKOE' },
                { name: 'OP (Orange Pekoe)' },
                { name: 'BOP (Broken Orange Pekoe)' },
                { name: 'FBOP (Flowery Broken Orange Pekoe)' },
                { name: 'BOPF (Broken Orange Pekoe Fannings)' },
                { name: 'FTGFOP' },
                { name: 'Souchong' },
              ],
            },
            { name: 'Flavoured black tea' },
            { name: 'Tea bag fannings blend' },
          ],
        },
        {
          name: 'Green tea',
          children: [
            { name: 'Steamed green tea (sencha)' },
            { name: 'Pan-fired green tea' },
            { name: 'Gunpowder green tea' },
            { name: 'Matcha powder' },
            { name: 'Jasmine green tea' },
            { name: 'Green tea fannings' },
          ],
        },
        {
          name: 'Oolong tea',
          children: [
            { name: 'Light-oxidation oolong' },
            { name: 'Dark-oxidation oolong' },
            { name: 'Rolled ball oolong' },
            { name: 'Strip-style oolong' },
          ],
        },
        {
          name: 'White & dark tea',
          children: [
            { name: 'Silver Needle white tea' },
            { name: 'White Peony (Bai Mu Dan)' },
            { name: 'Ripe pu-erh (shou)' },
            { name: 'Raw pu-erh (sheng)' },
            { name: 'Compressed tea cakes & bricks' },
          ],
        },
        {
          name: 'Herbal & fruit infusions',
          children: [
            { name: 'Chamomile infusion' },
            { name: 'Hibiscus infusion' },
            { name: 'Peppermint infusion' },
            { name: 'Rooibos' },
            { name: 'Lemongrass infusion' },
            { name: 'Fireweed tea (ivan-chai)' },
            { name: 'Fruit blend infusion' },
            { name: 'Ginger-lemon infusion' },
          ],
        },
        {
          name: 'Instant tea',
          children: [
            { name: 'Instant black tea powder' },
            { name: 'Instant green tea powder' },
            { name: 'Liquid tea extract' },
            { name: 'Cold-water soluble tea' },
          ],
        },
        {
          name: 'Green (unroasted) coffee',
          children: [
            {
              name: 'Arabica green coffee',
              children: [
                { name: 'Washed arabica AA (screen 17/18)' },
                { name: 'Washed arabica A (screen 16)' },
                { name: 'Natural dry-process arabica' },
                { name: 'Honey-processed arabica' },
                { name: 'Monsooned arabica' },
              ],
            },
            {
              name: 'Robusta green coffee',
              children: [
                { name: 'Robusta screen 18' },
                { name: 'Robusta screen 17' },
                { name: 'Robusta screen 16' },
                { name: 'Robusta cherry AB' },
                { name: 'Washed robusta (parchment)' },
              ],
            },
            { name: 'Liberica green coffee' },
            { name: 'Coffee triage & broken beans' },
          ],
        },
        {
          name: 'Roasted coffee',
          children: [
            { name: 'Light roast whole bean' },
            { name: 'Medium roast whole bean' },
            { name: 'Dark roast whole bean' },
            { name: 'Espresso roast blend' },
            { name: 'Ground coffee (filter grind)' },
            { name: 'Ground coffee (espresso grind)' },
            { name: 'Coffee capsules & pods' },
            { name: 'Decaffeinated roasted coffee' },
          ],
        },
        {
          name: 'Instant coffee',
          children: [
            { name: 'Spray-dried instant coffee' },
            { name: 'Freeze-dried instant coffee' },
            { name: 'Agglomerated granulated coffee' },
            { name: 'Liquid coffee extract' },
            { name: 'Decaffeinated instant coffee' },
          ],
        },
        {
          name: 'Cocoa products',
          children: [
            {
              name: 'Cocoa beans',
              children: [
                { name: 'Fermented cocoa beans' },
                { name: 'Unfermented cocoa beans' },
                { name: 'Criollo fine-flavour beans' },
                { name: 'Forastero bulk beans' },
                { name: 'Trinitario beans' },
              ],
            },
            {
              name: 'Cocoa butter',
              children: [
                { name: 'Natural pressed cocoa butter' },
                { name: 'Deodorised cocoa butter' },
              ],
            },
            {
              name: 'Cocoa powder',
              children: [
                { name: 'Natural cocoa powder 10/12% fat' },
                { name: 'Alkalised (Dutch) cocoa powder 10/12% fat' },
                { name: 'Low-fat cocoa powder 0/8% fat' },
                { name: 'High-fat cocoa powder 20/22% fat' },
                { name: 'Black cocoa powder' },
              ],
            },
            { name: 'Cocoa liquor (mass)' },
            { name: 'Cocoa nibs' },
            { name: 'Cocoa cake' },
            { name: 'Cocoa shell & husk' },
          ],
        },
        {
          name: 'Coffee substitutes',
          children: [
            { name: 'Roasted chicory root' },
            { name: 'Chicory extract' },
            { name: 'Barley coffee' },
            { name: 'Acorn coffee' },
            { name: 'Dandelion root coffee' },
          ],
        },
      ],
    },
    {
      name: 'Egg products',
      ru: 'Яичные продукты',
      children: [
        {
          name: 'Liquid egg products',
          children: [
            { name: 'Liquid whole egg (pasteurised)' },
            { name: 'Liquid egg white' },
            { name: 'Liquid egg yolk' },
            { name: 'Salted liquid egg yolk' },
            { name: 'Sugared liquid egg yolk' },
          ],
        },
        {
          name: 'Dried egg products',
          children: [
            { name: 'Whole egg powder' },
            {
              name: 'Egg white powder (albumen)',
              children: [
                { name: 'Spray-dried albumen' },
                { name: 'Pan-dried albumen' },
                { name: 'High-gel albumen' },
                { name: 'High-whip albumen' },
              ],
            },
            { name: 'Egg yolk powder' },
            { name: 'Egg powder blends' },
          ],
        },
        {
          name: 'Frozen egg products',
          children: [
            { name: 'Frozen whole egg' },
            { name: 'Frozen egg white' },
            { name: 'Frozen egg yolk' },
            { name: 'Frozen salted yolk' },
          ],
        },
        {
          name: 'Cooked & processed eggs',
          children: [
            { name: 'Hard-boiled peeled eggs' },
            { name: 'Egg loaf (long egg)' },
            { name: 'Omelette & scrambled egg mix' },
            { name: 'Marinated & pickled eggs' },
            { name: 'Century (preserved) eggs' },
          ],
        },
        {
          name: 'Egg shell derivatives',
          children: [
            { name: 'Egg shell calcium powder' },
            { name: 'Egg shell membrane powder' },
            { name: 'Lysozyme' },
          ],
        },
      ],
    },
  ],
};
