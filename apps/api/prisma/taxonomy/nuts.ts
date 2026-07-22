import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Nuts is a grade-code category: the six high-volume kernels (cashew, almond, pistachio,
 * walnut, hazelnut, peanut) go to level 4 and level 5 on the grade codes lots actually
 * trade under — W240, Nonpareil 23/25, 21/25 inshell counts, LHP colour grades, 11–13 mm
 * calibre, HPS Java. Long-tail nuts (acorn, coco de mer, paradise nut) stop at level 3.
 */
export const nuts: TaxCategory = {
  name: 'Nuts',
  emoji: '🥜',
  tint: TINT.stone,
  children: [
    {
      name: 'Peanut',
      ru: 'Арахис',
      children: [
        {
          name: 'In-shell peanut',
          children: [
            { name: 'Java in-shell' },
            { name: 'Bold in-shell' },
            { name: 'Runner in-shell' },
            { name: 'Virginia Jumbo in-shell' },
            { name: 'Spanish in-shell' },
          ],
        },
        {
          name: 'Raw peanut kernels',
          children: [
            {
              name: 'Java kernels',
              children: [
                { name: 'Counts 50/60' },
                { name: 'Counts 60/70' },
                { name: 'Counts 70/80' },
                { name: 'Counts 80/90' },
              ],
            },
            {
              name: 'Bold kernels',
              children: [{ name: 'Counts 35/40' }, { name: 'Counts 40/50' }, { name: 'Counts 50/60' }],
            },
            {
              name: 'Runner kernels',
              children: [
                { name: 'Counts 38/42' },
                { name: 'Counts 40/50' },
                { name: 'Counts 50/60' },
                { name: 'Counts 60/70' },
                { name: 'Counts 80/100' },
              ],
            },
            {
              name: 'Spanish kernels',
              children: [{ name: 'Counts 40/50' }, { name: 'Counts 50/60' }, { name: 'Counts 60/70' }],
            },
            {
              name: 'Virginia kernels',
              children: [{ name: 'Counts 30/40' }, { name: 'Counts 40/50' }, { name: 'Counts 50/60' }],
            },
            { name: 'TJ (Tuffy Java) kernels' },
          ],
        },
        {
          name: 'HPS peanut kernels',
          children: [
            { name: 'HPS Java kernels' },
            { name: 'HPS Bold kernels' },
            { name: 'HPS Runner kernels' },
            { name: 'HPS Virginia kernels' },
          ],
        },
        {
          name: 'Blanched peanut kernels',
          children: [
            { name: 'Blanched Java kernels' },
            { name: 'Blanched Bold kernels' },
            { name: 'Blanched Runner kernels' },
            { name: 'Blanched Spanish kernels' },
          ],
        },
        {
          name: 'Peanut splits & pieces',
          children: [
            { name: 'Raw splits' },
            { name: 'Blanched splits' },
            { name: 'Peanut halves' },
            { name: 'Peanut granules' },
            { name: 'Peanut butter grade kernels' },
          ],
        },
        {
          name: 'Roasted peanut',
          children: [
            { name: 'Roasted in-shell peanut' },
            { name: 'Dry-roasted kernels' },
            { name: 'Roasted & salted kernels' },
            { name: 'Coated & flavoured peanut' },
          ],
        },
        {
          name: 'Crushing & feed grade peanut',
          children: [{ name: 'Oil-grade kernels' }, { name: 'Bird-feed grade peanut' }, { name: 'Peanut hulls' }],
        },
      ],
    },
    {
      name: 'Brazil nut',
      ru: 'Бразильский орех',
      children: [
        {
          name: 'In-shell Brazil nut',
          children: [
            { name: 'Large in-shell' },
            { name: 'Medium in-shell' },
            { name: 'Small in-shell' },
          ],
        },
        {
          name: 'Shelled Brazil nut kernels',
          children: [
            { name: 'Jumbo kernels' },
            { name: 'Extra Large kernels' },
            { name: 'Large kernels' },
            { name: 'Medium kernels' },
            { name: 'Small kernels' },
            { name: 'Midget kernels' },
          ],
        },
        {
          name: 'Brazil nut brokens',
          children: [{ name: 'Chipped & broken kernels' }, { name: 'Brazil nut pieces' }],
        },
        { name: 'Roasted Brazil nut kernels' },
      ],
    },
    {
      name: 'Water caltrop',
      ru: 'Водяной орех',
      children: [
        { name: 'Fresh water caltrop' },
        { name: 'Dried water caltrop kernels' },
        { name: 'Boiled & peeled water caltrop' },
        { name: 'Singhara flour' },
      ],
    },
    {
      name: 'Walnut',
      ru: 'Грецкий орех',
      children: [
        {
          name: 'In-shell walnut',
          children: [
            {
              name: 'Chandler in-shell',
              children: [
                { name: 'Calibre 30–32 mm' },
                { name: 'Calibre 32–34 mm' },
                { name: 'Calibre 34 mm and above' },
              ],
            },
            {
              name: 'Hartley in-shell',
              children: [{ name: 'Calibre 30–32 mm' }, { name: 'Calibre 32–34 mm' }],
            },
            { name: 'Howard in-shell' },
            { name: 'Franquette in-shell' },
            { name: 'Serr in-shell' },
            { name: 'Tulare in-shell' },
            { name: 'Vina in-shell' },
            { name: 'Ideal (Kashmiri) in-shell' },
          ],
        },
        {
          name: 'Walnut kernel halves',
          children: [
            { name: 'Extra Light Halves (ELH)' },
            { name: 'Light Halves (LH)' },
            { name: 'Light Amber Halves (LAH)' },
            { name: 'Amber Halves (AH)' },
          ],
        },
        {
          name: 'Walnut kernel quarters',
          children: [
            { name: 'Light Quarters (LQ)' },
            { name: 'Light Amber Quarters (LAQ)' },
            { name: 'Amber Quarters (AQ)' },
          ],
        },
        {
          name: 'Walnut kernel halves & pieces',
          children: [
            { name: 'Light Halves & Pieces (LHP)' },
            { name: 'Light Amber Halves & Pieces (LAHP)' },
            { name: 'Amber Halves & Pieces (AHP)' },
          ],
        },
        {
          name: 'Walnut kernel pieces',
          children: [
            { name: 'Light Pieces (LP)' },
            { name: 'Light Amber Pieces (LAP)' },
            { name: 'Amber Pieces (AP)' },
            { name: 'Walnut granules' },
            { name: 'Walnut meal' },
          ],
        },
        {
          name: 'Roasted & processed walnut',
          children: [
            { name: 'Roasted walnut kernels' },
            { name: 'Caramelised walnut kernels' },
            { name: 'Blanched walnut kernels' },
          ],
        },
        {
          name: 'Walnut shells & by-products',
          children: [{ name: 'Walnut shell granules' }, { name: 'Walnut shell powder' }, { name: 'Walnut septum' }],
        },
      ],
    },
    {
      name: 'Acorn',
      ru: 'Жёлудь',
      children: [
        { name: 'Fresh acorn' },
        { name: 'Dried acorn kernels' },
        { name: 'Roasted acorn (coffee substitute)' },
        { name: 'Acorn flour' },
      ],
    },
    {
      name: 'Chestnut',
      ru: 'Каштан',
      children: [
        {
          name: 'Fresh chestnut',
          children: [
            {
              name: 'Marrone',
              children: [
                { name: 'Calibre 40/50 pcs per kg' },
                { name: 'Calibre 50/60 pcs per kg' },
                { name: 'Calibre 60/70 pcs per kg' },
              ],
            },
            { name: 'Marigoule' },
            { name: 'Bouche de Bétizac' },
            { name: 'Bournette' },
            { name: 'Chinese chestnut (Dandong)' },
            { name: 'Japanese chestnut (Tanzawa)' },
          ],
        },
        {
          name: 'Peeled chestnut kernels',
          children: [
            { name: 'Whole peeled kernels' },
            { name: 'Broken peeled kernels' },
            { name: 'Vacuum-packed peeled chestnut' },
          ],
        },
        { name: 'Frozen chestnut kernels' },
        { name: 'Roasted chestnut' },
        { name: 'Dried chestnut' },
        { name: 'Chestnut flour' },
        { name: 'Horse chestnut (Aesculus) seed' },
      ],
    },
    {
      name: 'Pine nut',
      ru: 'Кедровый орех',
      children: [
        {
          name: 'In-shell pine nut',
          children: [
            { name: 'Siberian pine (Pinus sibirica) in-shell' },
            { name: 'Korean pine (Pinus koraiensis) in-shell' },
            { name: 'Chilgoza (Pinus gerardiana) in-shell' },
            { name: 'Italian stone pine (Pinus pinea) in-shell' },
          ],
        },
        {
          name: 'Pine nut kernels',
          children: [
            { name: 'Siberian pine nut kernels' },
            { name: 'Korean pine nut kernels' },
            { name: 'Chinese pine nut kernels' },
            { name: 'Chilgoza kernels' },
            { name: 'Pinoli (Mediterranean) kernels' },
          ],
        },
        { name: 'Broken pine nut kernels' },
        { name: 'Roasted pine nut kernels' },
        { name: 'Whole pine cones' },
        { name: 'Pine nut shells' },
      ],
    },
    {
      name: 'Cashew',
      ru: 'Кешью',
      children: [
        {
          name: 'Raw cashew nuts in shell (RCN)',
          children: [
            { name: 'Outturn 46–48 lbs' },
            { name: 'Outturn 48–50 lbs' },
            { name: 'Outturn 50–52 lbs' },
            { name: 'Outturn 52 lbs and above' },
          ],
        },
        {
          name: 'White whole kernels',
          children: [
            { name: 'W180' },
            { name: 'W210' },
            { name: 'W240' },
            { name: 'W320' },
            { name: 'W400' },
            { name: 'W450' },
            { name: 'W500' },
          ],
        },
        {
          name: 'Scorched whole kernels',
          children: [
            { name: 'SW180' },
            { name: 'SW210' },
            { name: 'SW240' },
            { name: 'SW320' },
            { name: 'SW450' },
            { name: 'Scorched Wholes Seconds (SSW)' },
          ],
        },
        {
          name: 'Dessert whole kernels',
          children: [{ name: 'Dessert Wholes (DW)' }, { name: 'Dessert Wholes Seconds (DW2)' }],
        },
        {
          name: 'Butts & splits',
          children: [
            { name: 'White Butts (B)' },
            { name: 'White Splits (S)' },
            { name: 'Scorched Butts (SB)' },
            { name: 'Scorched Splits (SS)' },
            { name: 'Dessert Butts (DB)' },
            { name: 'Dessert Splits (DS)' },
          ],
        },
        {
          name: 'Cashew pieces',
          children: [
            { name: 'Large White Pieces (LWP)' },
            { name: 'Small White Pieces (SWP)' },
            { name: 'Baby Bits (BB)' },
            { name: 'Scorched Pieces (SP)' },
            { name: 'Scorched Small Pieces (SSP)' },
            { name: 'Dessert Pieces (DP)' },
            { name: 'Cashew granules' },
          ],
        },
        {
          name: 'Roasted & flavoured cashew',
          children: [
            { name: 'Roasted & salted W320' },
            { name: 'Dry-roasted unsalted kernels' },
            { name: 'Honey-roasted cashew' },
            { name: 'Masala cashew' },
            { name: 'Peri-peri cashew' },
          ],
        },
        {
          name: 'Cashew nut shell liquid (CNSL)',
          children: [{ name: 'Raw CNSL' }, { name: 'Distilled CNSL' }, { name: 'Cardanol' }],
        },
        {
          name: 'Cashew by-products',
          children: [{ name: 'Cashew testa' }, { name: 'Cashew shell cake' }],
        },
      ],
    },
    {
      name: 'Macadamia',
      ru: 'Макадамия',
      children: [
        {
          name: 'In-shell macadamia',
          children: [
            { name: 'Calibre 18–20 mm' },
            { name: 'Calibre 20–22 mm' },
            { name: 'Calibre 22–25 mm' },
            { name: 'Calibre 25 mm and above' },
          ],
        },
        {
          name: 'Premium grade kernels (Grade 1)',
          children: [
            { name: 'Style 0' },
            { name: 'Style 1' },
            { name: 'Style 1L' },
            { name: 'Style 2 (halves)' },
            { name: 'Style 4L' },
            { name: 'Style 4R' },
            { name: 'Style 5' },
            { name: 'Style 6' },
            { name: 'Style 7' },
            { name: 'Style 8' },
          ],
        },
        {
          name: 'Commercial grade kernels (Grade 2)',
          children: [
            { name: 'Style 4' },
            { name: 'Style 5' },
            { name: 'Style 6' },
            { name: 'Style 7' },
            { name: 'Style 8' },
          ],
        },
        {
          name: 'Roasted macadamia',
          children: [
            { name: 'Dry-roasted kernels' },
            { name: 'Roasted & salted kernels' },
            { name: 'Roasted in-shell macadamia' },
          ],
        },
        { name: 'Macadamia shells' },
      ],
    },
    {
      name: 'Manchurian walnut',
      ru: 'Маньчжурский орех',
      children: [
        { name: 'In-shell Manchurian walnut' },
        { name: 'Manchurian walnut kernels' },
        { name: 'Manchurian walnut shells' },
        { name: 'Green Manchurian walnut (for preserves)' },
      ],
    },
    {
      name: 'Almond',
      ru: 'Миндаль',
      children: [
        {
          name: 'In-shell almond',
          children: [
            {
              name: 'Nonpareil in-shell',
              children: [{ name: 'Size 30/32 mm' }, { name: 'Size 32/34 mm' }, { name: 'Size 34 mm and above' }],
            },
            { name: 'Carmel in-shell' },
            { name: 'Independence in-shell' },
            { name: 'Monterey in-shell' },
            { name: 'Sonora in-shell' },
            { name: 'Mamra in-shell' },
            { name: 'Gurbandi in-shell' },
            { name: 'Ferragnes in-shell' },
            { name: 'Soft-shell (paper shell) almond' },
          ],
        },
        {
          name: 'Natural almond kernels',
          children: [
            {
              name: 'Nonpareil kernels',
              children: [
                { name: 'Count 18/20 per oz' },
                { name: 'Count 20/22 per oz' },
                { name: 'Count 23/25 per oz' },
                { name: 'Count 25/27 per oz' },
                { name: 'Count 27/30 per oz' },
                { name: 'Count 30/32 per oz' },
              ],
            },
            {
              name: 'Carmel kernels',
              children: [
                { name: 'Count 23/25 per oz' },
                { name: 'Count 27/30 per oz' },
                { name: 'Count 30/32 per oz' },
                { name: 'Count 32/34 per oz' },
              ],
            },
            {
              name: 'Independence kernels',
              children: [{ name: 'Count 23/25 per oz' }, { name: 'Count 27/30 per oz' }, { name: 'Count 30/32 per oz' }],
            },
            {
              name: 'Monterey kernels',
              children: [{ name: 'Count 23/25 per oz' }, { name: 'Count 27/30 per oz' }, { name: 'Count 32/34 per oz' }],
            },
            { name: 'Butte & Padre kernels' },
            { name: 'Fritz kernels' },
            { name: 'Sonora kernels' },
            { name: 'Mission (Texas) kernels' },
            { name: 'Mamra kernels' },
            { name: 'Gurbandi kernels' },
            { name: 'Ferragnes & Ferraduel kernels' },
          ],
        },
        {
          name: 'Blanched almond kernels',
          children: [{ name: 'Blanched whole kernels' }, { name: 'Blanched splits' }, { name: 'Blanched halves' }],
        },
        {
          name: 'Sliced, slivered & diced almond',
          children: [
            { name: 'Natural sliced almond' },
            { name: 'Blanched sliced almond' },
            { name: 'Natural slivered almond' },
            { name: 'Blanched slivered almond' },
            { name: 'Almond dices' },
          ],
        },
        {
          name: 'Almond flour & meal',
          children: [{ name: 'Blanched almond flour' }, { name: 'Natural almond meal' }],
        },
        {
          name: 'Roasted almond',
          children: [
            { name: 'Dry-roasted whole kernels' },
            { name: 'Roasted & salted kernels' },
            { name: 'Roasted sliced almond' },
            { name: 'Smoked almond' },
          ],
        },
        {
          name: 'Almond brokens & pieces',
          children: [
            { name: 'Almond halves' },
            { name: 'Broken kernels' },
            { name: 'Chipped & scratched kernels' },
            { name: 'Almond bits' },
          ],
        },
        { name: 'Bitter almond kernels' },
        {
          name: 'Almond hulls & shells',
          children: [{ name: 'Almond hulls' }, { name: 'Almond shells' }],
        },
      ],
    },
    {
      name: 'Nutmeg',
      ru: 'Мускатный орех',
      children: [
        {
          name: 'Nutmeg in shell',
          children: [{ name: 'ABCD in-shell nutmeg' }, { name: 'Shrivelled in-shell nutmeg' }],
        },
        {
          name: 'Shelled nutmeg',
          children: [
            {
              name: 'ABCD grade nutmeg',
              children: [{ name: '80 pcs per lb' }, { name: '110 pcs per lb' }, { name: '130 pcs per lb' }],
            },
            { name: 'Sound Shrivelled (SS)' },
            { name: 'Broken Wormy Punky (BWP)' },
            { name: 'Nutmeg siftings' },
          ],
        },
        {
          name: 'Mace (nutmeg aril)',
          children: [{ name: 'Whole mace blades' }, { name: 'Broken mace' }, { name: 'Ground mace' }],
        },
        { name: 'Ground nutmeg' },
        {
          name: 'Nutmeg extracts',
          children: [{ name: 'Nutmeg essential oil' }, { name: 'Nutmeg oleoresin' }, { name: 'Nutmeg butter' }],
        },
      ],
    },
    {
      name: 'Paradise nut',
      ru: 'Райский орех',
      children: [
        { name: 'In-shell paradise nut' },
        { name: 'Paradise nut kernels' },
        { name: 'Paradise nut pods (sapucaia)' },
      ],
    },
    {
      name: 'Coco de mer',
      ru: 'Сейшельский орех',
      children: [
        { name: 'Whole coco de mer nut' },
        { name: 'Coco de mer kernel' },
        { name: 'Carved coco de mer shell' },
      ],
    },
    {
      name: 'Turkish hazelnut',
      ru: 'Турецкий орех',
      children: [
        { name: 'In-shell Turkish hazelnut' },
        { name: 'Turkish hazelnut kernels' },
        { name: 'Turkish hazelnut rootstock seed' },
      ],
    },
    {
      name: 'Pistachio',
      ru: 'Фисташки',
      children: [
        {
          name: 'In-shell pistachio',
          children: [
            {
              name: 'Kerman',
              children: [
                { name: 'Count 18/20 per oz' },
                { name: 'Count 20/22 per oz' },
                { name: 'Count 21/25 per oz' },
                { name: 'Count 25/30 per oz' },
              ],
            },
            {
              name: 'Akbari (Super Long)',
              children: [
                { name: 'Count 18/20 per oz' },
                { name: 'Count 20/22 per oz' },
                { name: 'Count 22/24 per oz' },
              ],
            },
            {
              name: 'Ahmad Aghaei (Long)',
              children: [
                { name: 'Count 20/22 per oz' },
                { name: 'Count 22/24 per oz' },
                { name: 'Count 24/26 per oz' },
                { name: 'Count 26/28 per oz' },
              ],
            },
            {
              name: 'Kaleh Ghouchi (Jumbo)',
              children: [
                { name: 'Count 20/22 per oz' },
                { name: 'Count 22/24 per oz' },
                { name: 'Count 24/26 per oz' },
              ],
            },
            {
              name: 'Fandoghi (Round)',
              children: [
                { name: 'Count 26/28 per oz' },
                { name: 'Count 28/30 per oz' },
                { name: 'Count 30/32 per oz' },
                { name: 'Count 32/34 per oz' },
              ],
            },
            { name: 'Badami (Almond-shaped)' },
            { name: 'Sirora' },
            { name: 'Aegina (Greek) pistachio' },
            { name: 'Bronte pistachio' },
          ],
        },
        {
          name: 'Closed-shell pistachio',
          children: [
            { name: 'Round type closed shell' },
            { name: 'Long type closed shell' },
            { name: 'Mechanically opened pistachio' },
          ],
        },
        {
          name: 'Pistachio kernels',
          children: [
            { name: 'Natural whole kernels' },
            { name: 'Green peeled kernels' },
            { name: 'Broken kernels' },
            { name: 'Slivered kernels' },
            { name: 'Pistachio powder' },
          ],
        },
        {
          name: 'Roasted & flavoured pistachio',
          children: [
            { name: 'Roasted & salted in-shell' },
            { name: 'Lemon-flavoured pistachio' },
            { name: 'Saffron-flavoured pistachio' },
            { name: 'Dry-roasted kernels' },
          ],
        },
        { name: 'Pistachio shells' },
      ],
    },
    {
      name: 'Hazelnut',
      ru: 'Фундук',
      children: [
        {
          name: 'In-shell hazelnut',
          children: [
            {
              name: 'Tombul in-shell',
              children: [
                { name: 'Calibre 13–15 mm' },
                { name: 'Calibre 15–17 mm' },
                { name: 'Calibre 17–19 mm' },
                { name: 'Calibre 19–21 mm' },
              ],
            },
            {
              name: 'Barcelona in-shell',
              children: [{ name: 'Calibre 15–17 mm' }, { name: 'Calibre 17–19 mm' }, { name: 'Calibre 19–21 mm' }],
            },
            { name: 'Palaz in-shell' },
            { name: 'Çakıldak in-shell' },
            { name: 'Sivri in-shell' },
            { name: 'Ennis in-shell' },
            { name: 'Tonda Gentile Romana in-shell' },
            { name: 'Tonda di Giffoni in-shell' },
          ],
        },
        {
          name: 'Natural hazelnut kernels',
          children: [
            { name: 'Calibre 9–11 mm' },
            { name: 'Calibre 11–13 mm' },
            { name: 'Calibre 13–15 mm' },
            { name: 'Calibre 15–17 mm' },
            { name: 'Calibre 17–19 mm' },
          ],
        },
        {
          name: 'Blanched hazelnut kernels',
          children: [
            { name: 'Calibre 9–11 mm' },
            { name: 'Calibre 11–13 mm' },
            { name: 'Calibre 13–15 mm' },
            { name: 'Calibre 15–17 mm' },
          ],
        },
        {
          name: 'Roasted hazelnut kernels',
          children: [
            { name: 'Roasted whole kernels' },
            { name: 'Roasted & salted kernels' },
            { name: 'Roasted diced hazelnut' },
          ],
        },
        {
          name: 'Hazelnut pieces & meal',
          children: [
            { name: 'Diced hazelnut 2–4 mm' },
            { name: 'Diced hazelnut 4–6 mm' },
            { name: 'Sliced hazelnut' },
            { name: 'Hazelnut flour' },
            { name: 'Hazelnut paste' },
          ],
        },
        { name: 'Hazelnut shells' },
      ],
    },
  ],
};
