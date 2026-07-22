import type { TaxCategory } from './types';
import { TINT } from './types';

/**
 * Only 6 level-2 nodes, but agro-inputs trade at the level of a named active ingredient and its
 * formulation strength, so this category runs 5 levels deep: chemical class (L3) → active or
 * nutrient grade (L4) → formulation / analysis (L5).
 */
export const agrochemicals: TaxCategory = {
  name: 'Agrochemicals',
  emoji: '🧪',
  tint: TINT.sky,
  children: [
    {
      name: 'Biological agents',
      ru: 'Биопрепараты',
      children: [
        {
          name: 'Biofungicides',
          children: [
            {
              name: 'Trichoderma',
              children: [
                { name: 'Trichoderma harzianum 1% WP' },
                { name: 'Trichoderma viride 1% WP' },
                { name: 'Trichoderma asperellum liquid' },
                { name: 'Trichoderma harzianum talc-based' },
              ],
            },
            {
              name: 'Bacillus subtilis',
              children: [
                { name: 'Bacillus subtilis 1% WP' },
                { name: 'Bacillus subtilis liquid 2×10⁸ CFU/ml' },
                { name: 'Bacillus amyloliquefaciens formulation' },
              ],
            },
            {
              name: 'Pseudomonas fluorescens',
              children: [
                { name: 'Pseudomonas fluorescens 1% WP' },
                { name: 'Pseudomonas fluorescens liquid' },
                { name: 'Pseudomonas putida formulation' },
              ],
            },
            { name: 'Ampelomyces quisqualis' },
            { name: 'Coniothyrium minitans' },
            { name: 'Chaetomium globosum' },
          ],
        },
        {
          name: 'Bioinsecticides',
          children: [
            {
              name: 'Bacillus thuringiensis (Bt)',
              children: [
                { name: 'Bt var. kurstaki 5% WP' },
                { name: 'Bt var. kurstaki 0.5% SC' },
                { name: 'Bt var. israelensis' },
                { name: 'Bt var. galleriae' },
              ],
            },
            {
              name: 'Entomopathogenic fungi',
              children: [
                { name: 'Beauveria bassiana 1% WP' },
                { name: 'Metarhizium anisopliae 1% WP' },
                { name: 'Lecanicillium (Verticillium) lecanii 1% WP' },
                { name: 'Nomuraea rileyi' },
              ],
            },
            {
              name: 'Nucleopolyhedrovirus (NPV)',
              children: [
                { name: 'HaNPV (Helicoverpa armigera) 0.5% AS' },
                { name: 'SlNPV (Spodoptera litura) 0.5% AS' },
                { name: 'Granulovirus (Cydia pomonella)' },
              ],
            },
            { name: 'Spinosad-producing actinomycete cultures' },
          ],
        },
        {
          name: 'Bionematicides',
          children: [
            { name: 'Purpureocillium lilacinum (Paecilomyces)' },
            { name: 'Pochonia chlamydosporia' },
            { name: 'Bacillus firmus' },
            { name: 'Trichoderma-based nematicide' },
          ],
        },
        {
          name: 'Nitrogen-fixing inoculants',
          children: [
            {
              name: 'Rhizobium',
              children: [
                { name: 'Rhizobium for soybean' },
                { name: 'Rhizobium for chickpea' },
                { name: 'Rhizobium for groundnut' },
                { name: 'Bradyrhizobium japonicum liquid' },
              ],
            },
            {
              name: 'Azotobacter',
              children: [
                { name: 'Azotobacter chroococcum carrier-based' },
                { name: 'Azotobacter liquid 1×10⁹ CFU/ml' },
              ],
            },
            { name: 'Azospirillum brasilense' },
            { name: 'Acetobacter diazotrophicus' },
            { name: 'Azolla biofertilizer' },
            { name: 'Blue-green algae (Anabaena) inoculant' },
          ],
        },
        {
          name: 'Nutrient-solubilising inoculants',
          children: [
            { name: 'Phosphate-solubilising bacteria (Bacillus megaterium)' },
            { name: 'Pseudomonas striata phosphobacteria' },
            { name: 'Potash-mobilising bacteria (Frateuria aurantia)' },
            { name: 'Zinc-solubilising bacteria' },
            { name: 'Sulphur-oxidising bacteria (Thiobacillus)' },
            { name: 'Mycorrhiza (VAM / Glomus) inoculant' },
          ],
        },
        {
          name: 'Microbial consortia',
          children: [
            { name: 'NPK consortia liquid' },
            { name: 'Carrier-based microbial consortia' },
            { name: 'Compost & decomposer cultures' },
            { name: 'Waste decomposer concentrate' },
          ],
        },
        {
          name: 'Macrobials (predators & parasitoids)',
          children: [
            { name: 'Trichogramma chilonis cards' },
            { name: 'Trichogramma japonicum cards' },
            { name: 'Chrysoperla carnea larvae' },
            { name: 'Cryptolaemus montrouzieri beetles' },
            { name: 'Phytoseiulus persimilis predatory mites' },
            { name: 'Encarsia formosa parasitoid' },
            { name: 'Amblyseius swirskii predatory mites' },
          ],
        },
        {
          name: 'Pheromones, lures & traps',
          children: [
            { name: 'Helicoverpa armigera lure' },
            { name: 'Spodoptera litura lure' },
            { name: 'Pectinophora gossypiella (PBW) lure' },
            { name: 'Bactrocera fruit fly lure (methyl eugenol)' },
            { name: 'Tuta absoluta lure' },
            { name: 'Rhynchophorus ferrugineus lure' },
            { name: 'Yellow sticky traps' },
            { name: 'Blue sticky traps' },
            { name: 'Delta & funnel trap bodies' },
          ],
        },
      ],
    },
    {
      name: 'Mineral fertilizers',
      ru: 'Минеральные удобрения',
      children: [
        {
          name: 'Nitrogen',
          children: [
            {
              name: 'Urea 46%',
              children: [
                { name: 'Prilled urea 46%' },
                { name: 'Granular urea 46%' },
                { name: 'Neem-coated urea' },
                { name: 'Technical-grade urea 46%' },
              ],
            },
            {
              name: 'Calcium ammonium nitrate (CAN)',
              children: [
                { name: 'CAN 26% N granular' },
                { name: 'CAN 27% N granular' },
              ],
            },
            {
              name: 'Ammonium nitrate',
              children: [
                { name: 'Ammonium nitrate 34.5% prilled' },
                { name: 'Ammonium nitrate 34.5% granular' },
                { name: 'Porous prilled ammonium nitrate' },
              ],
            },
            {
              name: 'Ammonium sulphate',
              children: [
                { name: 'Caprolactam-grade ammonium sulphate 21%' },
                { name: 'Steel-grade crystalline ammonium sulphate' },
                { name: 'Granular ammonium sulphate 21%' },
              ],
            },
            {
              name: 'UAN solution',
              children: [
                { name: 'UAN 32' },
                { name: 'UAN 30' },
                { name: 'UAN 28' },
              ],
            },
            { name: 'Ammonium chloride 25%' },
            { name: 'Anhydrous ammonia' },
            { name: 'Ammonia water (aqueous ammonia)' },
          ],
        },
        {
          name: 'Phosphate',
          children: [
            {
              name: 'DAP (diammonium phosphate)',
              children: [
                { name: 'DAP 18-46-0 granular' },
                { name: 'DAP 16-44-0' },
              ],
            },
            {
              name: 'MAP (monoammonium phosphate)',
              children: [
                { name: 'MAP 11-52-0 granular' },
                { name: 'MAP 12-61-0 water-soluble' },
              ],
            },
            { name: 'TSP (triple superphosphate) 0-46-0' },
            {
              name: 'SSP (single superphosphate)',
              children: [
                { name: 'Powdered SSP 0-16-0' },
                { name: 'Granulated SSP 0-16-0' },
                { name: 'Boronated SSP' },
                { name: 'Zincated SSP' },
              ],
            },
            {
              name: 'Rock phosphate',
              children: [
                { name: 'Rock phosphate 68–72% BPL' },
                { name: 'Rock phosphate 60–64% BPL' },
                { name: 'Ground rock phosphate (soft)' },
              ],
            },
            { name: 'Phosphoric acid (fertilizer grade)' },
            { name: 'Bone phosphate (steamed)' },
          ],
        },
        {
          name: 'Potash',
          children: [
            {
              name: 'MOP (muriate of potash)',
              children: [
                { name: 'Standard-grade MOP 60% K₂O' },
                { name: 'Granular MOP 60% K₂O' },
                { name: 'White soluble MOP 62% K₂O' },
              ],
            },
            {
              name: 'SOP (sulphate of potash)',
              children: [
                { name: 'Powder SOP 0-0-50' },
                { name: 'Granular SOP 0-0-50' },
              ],
            },
            {
              name: 'Potassium nitrate 13-0-45',
              children: [
                { name: 'Prilled potassium nitrate' },
                { name: 'Crystalline potassium nitrate (greenhouse grade)' },
              ],
            },
            { name: 'Potassium magnesium sulphate (langbeinite)' },
            { name: 'Potassium thiosulphate 0-0-25-17S' },
          ],
        },
        {
          name: 'NPK complex',
          children: [
            { name: 'NPK 10-26-26' },
            { name: 'NPK 12-32-16' },
            { name: 'NPK 20-20-0' },
            { name: 'NPK 15-15-15' },
            { name: 'NPK 14-35-14' },
            { name: 'NPK 17-17-17' },
            { name: 'NPK 16-20-0-13S' },
            { name: 'NPK 28-28-0' },
            { name: 'NPK 19-19-19 granular' },
            { name: 'Bulk-blended NPK' },
          ],
        },
        {
          name: 'Micronutrients',
          children: [
            {
              name: 'Zinc',
              children: [
                { name: 'Zinc sulphate heptahydrate 21%' },
                { name: 'Zinc sulphate monohydrate 33%' },
                { name: 'Zinc EDTA 12%' },
                { name: 'Zinc oxide 70% (suspension grade)' },
              ],
            },
            {
              name: 'Boron',
              children: [
                { name: 'Borax decahydrate 10.5% B' },
                { name: 'Boric acid 17% B' },
                { name: 'Disodium octaborate tetrahydrate 20% B' },
                { name: 'Boron ethanolamine liquid' },
              ],
            },
            {
              name: 'Iron',
              children: [
                { name: 'Fe-EDTA 12%' },
                { name: 'Fe-EDDHA 6% (ortho-ortho 4.8%)' },
                { name: 'Ferrous sulphate heptahydrate 19%' },
              ],
            },
            { name: 'Manganese sulphate 30.5%' },
            { name: 'Copper sulphate pentahydrate 24%' },
            { name: 'Ammonium molybdate 52%' },
            { name: 'Sodium molybdate 39%' },
            { name: 'Chelated micronutrient mixture (EDTA)' },
            { name: 'Multi-micronutrient grade mixtures' },
          ],
        },
        {
          name: 'Water-soluble & foliar',
          children: [
            { name: 'WSF 19-19-19' },
            { name: 'WSF 13-40-13' },
            { name: 'WSF 12-61-0 (MAP)' },
            { name: 'WSF 0-52-34 (MKP)' },
            { name: 'WSF 13-0-45 (potassium nitrate)' },
            { name: 'WSF 0-0-50 (SOP soluble)' },
            { name: 'Calcium nitrate 15.5-0-0 (greenhouse grade)' },
            { name: 'Urea phosphate 17-44-0' },
            { name: 'Magnesium sulphate heptahydrate (soluble)' },
            { name: 'Urea ammonium sulphate soluble' },
            { name: 'Fertigation blend concentrates' },
          ],
        },
        {
          name: 'Secondary nutrients & sulphur',
          children: [
            { name: 'Bentonite sulphur 90% granular' },
            { name: 'Elemental sulphur 80% WDG' },
            { name: 'Agricultural gypsum (calcium sulphate)' },
            { name: 'Calcium nitrate granular' },
            { name: 'Magnesium sulphate heptahydrate' },
            { name: 'Kieserite (magnesium sulphate monohydrate)' },
            { name: 'Dolomite (calcium magnesium carbonate)' },
            { name: 'Agricultural lime' },
          ],
        },
        {
          name: 'Slow & controlled-release fertilizers',
          children: [
            { name: 'Polymer-coated urea' },
            { name: 'Sulphur-coated urea' },
            { name: 'Polymer-coated NPK' },
            { name: 'Urea with nitrification inhibitor (DMPP)' },
            { name: 'Urea with urease inhibitor (NBPT)' },
            { name: 'Isobutylidene diurea (IBDU)' },
          ],
        },
      ],
    },
    {
      name: 'Cleaning & disinfectants',
      ru: 'Моющие и дезинфицирующие средства',
      children: [
        {
          name: 'Dairy & milking hygiene',
          children: [
            { name: 'Alkaline CIP detergent' },
            { name: 'Acid CIP descaler' },
            { name: 'Chlorinated alkaline cleaner' },
            { name: 'Pre-milking teat dip (iodine)' },
            { name: 'Post-milking barrier teat dip' },
            { name: 'Udder wipes & towels' },
            { name: 'Milk line acid rinse' },
          ],
        },
        {
          name: 'Livestock & poultry house disinfectants',
          children: [
            { name: 'Glutaraldehyde–QAC blend' },
            { name: 'Quaternary ammonium disinfectant' },
            { name: 'Peracetic acid disinfectant' },
            { name: 'Iodophor disinfectant' },
            { name: 'Phenolic disinfectant' },
            { name: 'Hydrogen peroxide–silver disinfectant' },
            { name: 'Slaked lime & lime wash' },
          ],
        },
        {
          name: 'Hatchery & egg hygiene',
          children: [
            { name: 'Formaldehyde fumigant' },
            { name: 'Hydrogen peroxide fogging solution' },
            { name: 'Egg shell sanitiser' },
            { name: 'Setter & hatcher cleaner' },
          ],
        },
        {
          name: 'Grain store & warehouse hygiene',
          children: [
            { name: 'Aluminium phosphide fumigation tablets' },
            { name: 'Magnesium phosphide plates' },
            { name: 'Sulphuryl fluoride fumigant' },
            { name: 'Empty-bin spray (deltamethrin)' },
            { name: 'Diatomaceous earth grain protectant' },
          ],
        },
        {
          name: 'Water sanitation',
          children: [
            { name: 'Chlorine dioxide' },
            { name: 'Sodium hypochlorite' },
            { name: 'Calcium hypochlorite (bleaching powder)' },
            { name: 'Peracetic acid water-line cleaner' },
            { name: 'Drinking-line acidifier' },
            { name: 'Biofilm removal descaler' },
          ],
        },
        {
          name: 'Food plant & CIP chemicals',
          children: [
            { name: 'Caustic soda CIP concentrate' },
            { name: 'Nitric acid CIP concentrate' },
            { name: 'Foam cleaner concentrate' },
            { name: 'No-rinse food-contact sanitiser' },
            { name: 'Conveyor lubricant' },
            { name: 'Enzymatic membrane cleaner' },
          ],
        },
        {
          name: 'Personal & biosecurity hygiene',
          children: [
            { name: 'Alcohol hand sanitiser' },
            { name: 'Foam hand soap' },
            { name: 'Footbath disinfectant concentrate' },
            { name: 'Boot & wheel wash concentrate' },
            { name: 'Vehicle disinfection spray' },
          ],
        },
      ],
    },
    {
      name: 'Organic fertilizers',
      ru: 'Органические удобрения',
      children: [
        {
          name: 'Animal manures',
          children: [
            {
              name: 'Farmyard manure (FYM)',
              children: [
                { name: 'Fresh farmyard manure' },
                { name: 'Well-rotted farmyard manure' },
                { name: 'Dried FYM granules' },
              ],
            },
            {
              name: 'Poultry manure',
              children: [
                { name: 'Raw poultry litter' },
                { name: 'Dried poultry manure pellets' },
                { name: 'Composted poultry manure' },
              ],
            },
            { name: 'Cattle dung manure' },
            { name: 'Sheep & goat manure' },
            { name: 'Pig slurry & solids' },
            { name: 'Horse manure' },
            { name: 'Bat guano' },
          ],
        },
        {
          name: 'Composts & vermicompost',
          children: [
            {
              name: 'Vermicompost',
              children: [
                { name: 'Sieved vermicompost' },
                { name: 'Granular vermicompost' },
                { name: 'Neem-enriched vermicompost' },
                { name: 'Vermiwash liquid' },
              ],
            },
            { name: 'Press mud compost' },
            { name: 'Green waste compost' },
            { name: 'Spent mushroom compost' },
            { name: 'City / municipal compost' },
            { name: 'Coir pith compost' },
          ],
        },
        {
          name: 'Oilseed cakes & meals',
          children: [
            { name: 'Neem cake' },
            { name: 'Castor cake' },
            { name: 'Mustard cake' },
            { name: 'Groundnut cake' },
            { name: 'Karanja (pongamia) cake' },
            { name: 'Bone meal' },
            { name: 'Steamed bone meal' },
            { name: 'Fish meal (fertilizer grade)' },
            { name: 'Blood meal' },
            { name: 'Horn & hoof meal' },
            { name: 'Feather meal' },
          ],
        },
        {
          name: 'Marine & seaweed products',
          children: [
            { name: 'Ascophyllum nodosum extract powder' },
            { name: 'Seaweed extract liquid' },
            { name: 'Kappaphycus alvarezii sap' },
            { name: 'Sargassum extract' },
            { name: 'Fish amino acid liquid' },
            { name: 'Fish emulsion' },
          ],
        },
        {
          name: 'Humic substances',
          children: [
            { name: 'Potassium humate 95% flakes' },
            { name: 'Humic acid granules' },
            { name: 'Humic acid liquid 12%' },
            { name: 'Fulvic acid powder 95%' },
            { name: 'Leonardite (raw)' },
            { name: 'Humic–fulvic blend' },
          ],
        },
        {
          name: 'Organic soil amendments',
          children: [
            { name: 'Cocopeat blocks' },
            { name: 'Biochar' },
            { name: 'Peat moss' },
            { name: 'Rice husk & husk ash' },
            { name: 'Bagasse & press mud (raw)' },
            { name: 'Sugarcane trash mulch' },
          ],
        },
      ],
    },
    {
      name: 'Growth regulators',
      ru: 'Регуляторы роста',
      children: [
        {
          name: 'Auxins',
          children: [
            { name: 'IBA (indole-3-butyric acid)' },
            { name: 'NAA (naphthalene acetic acid) 4.5% SL' },
            { name: 'NAA 0.45% SL' },
            { name: 'Sodium NAA / sodium NAD blend' },
            { name: '4-CPA (para-chlorophenoxyacetic acid)' },
            { name: 'Rooting hormone powders' },
          ],
        },
        {
          name: 'Gibberellins',
          children: [
            { name: 'Gibberellic acid 90% TC' },
            { name: 'Gibberellic acid 0.001% L' },
            { name: 'Gibberellic acid 40% WSG' },
            { name: 'GA₄+₇ formulation' },
          ],
        },
        {
          name: 'Cytokinins',
          children: [
            { name: '6-BAP (6-benzylaminopurine)' },
            { name: 'Kinetin 0.009% L' },
            { name: 'Forchlorfenuron (CPPU) 0.1% L' },
            { name: 'Thidiazuron 50% WP' },
            { name: 'Zeatin' },
          ],
        },
        {
          name: 'Ethylene releasers & ripeners',
          children: [
            { name: 'Ethephon 39% SL' },
            { name: 'Ethephon 10% SL' },
            { name: 'Ethylene gas generator sachets' },
            { name: '1-MCP (1-methylcyclopropene)' },
          ],
        },
        {
          name: 'Growth retardants',
          children: [
            { name: 'Paclobutrazol 23% SC' },
            { name: 'Chlormequat chloride (CCC) 50% SL' },
            { name: 'Mepiquat chloride 5% AS' },
            { name: 'Trinexapac-ethyl 25% EC' },
            { name: 'Daminozide 85% SP' },
            { name: 'Prohexadione calcium' },
          ],
        },
        {
          name: 'Biostimulants',
          children: [
            { name: 'Amino acid liquid 40%' },
            { name: 'Seaweed-based biostimulant' },
            { name: 'Humic-based biostimulant' },
            { name: 'Triacontanol 0.1% EW' },
            { name: 'Homobrassinolide 0.04% EC' },
            { name: 'Nitrobenzene 20% flowering stimulant' },
            { name: 'Protein hydrolysate biostimulant' },
            { name: 'Mycorrhiza-based biostimulant' },
          ],
        },
        {
          name: 'Anti-stress & anti-transpirants',
          children: [
            { name: 'Kaolin particle film' },
            { name: 'S-abscisic acid (S-ABA)' },
            { name: 'Salicylic acid formulation' },
            { name: 'Potassium silicate liquid' },
            { name: 'Wax-based anti-transpirant' },
          ],
        },
        {
          name: 'Defoliants & desiccants',
          children: [
            { name: 'Thidiazuron + diuron' },
            { name: 'Sodium chlorate defoliant' },
            { name: 'Diquat dibromide 20% SL' },
            { name: 'Tribufos' },
          ],
        },
      ],
    },
    {
      name: 'Plant protection products',
      ru: 'Средства защиты растений',
      children: [
        {
          name: 'Herbicides',
          children: [
            {
              name: 'Glyphosate',
              children: [
                { name: 'Glyphosate 41% SL (IPA salt)' },
                { name: 'Glyphosate 71% SG (ammonium salt)' },
                { name: 'Glyphosate potassium salt 50.2% SL' },
                { name: 'Glyphosate 95% TC' },
              ],
            },
            {
              name: '2,4-D',
              children: [
                { name: '2,4-D amine salt 58% SL' },
                { name: '2,4-D ethyl ester 38% EC' },
                { name: '2,4-D sodium salt 80% WP' },
              ],
            },
            {
              name: 'Atrazine',
              children: [
                { name: 'Atrazine 50% WP' },
                { name: 'Atrazine 80% WG' },
                { name: 'Atrazine 97% TC' },
              ],
            },
            {
              name: 'Paraquat dichloride',
              children: [
                { name: 'Paraquat dichloride 24% SL' },
                { name: 'Paraquat dichloride 13.5% SL' },
              ],
            },
            {
              name: 'Pendimethalin',
              children: [
                { name: 'Pendimethalin 30% EC' },
                { name: 'Pendimethalin 38.7% CS' },
              ],
            },
            { name: 'Glufosinate ammonium 13.5% SL' },
            { name: 'Metribuzin 70% WP' },
            { name: 'Imazethapyr 10% SL' },
            { name: 'Bispyribac-sodium 10% SC' },
            { name: 'Sulfosulfuron 75% WG' },
            { name: 'Clodinafop-propargyl 15% WP' },
            { name: 'Fenoxaprop-p-ethyl 9% EC' },
            { name: 'Oxyfluorfen 23.5% EC' },
            { name: 'Butachlor 50% EC' },
            { name: 'Pretilachlor 50% EC' },
            { name: 'Metsulfuron-methyl 20% WP' },
            { name: 'Nicosulfuron 4% SC' },
            { name: 'Topramezone 33.6% SC' },
            { name: 'Halosulfuron-methyl 75% WG' },
            { name: 'Quizalofop-ethyl 5% EC' },
            { name: 'Propaquizafop 10% EC' },
            { name: 'Isoproturon 75% WP' },
            { name: 'Ametryn 80% WP' },
            { name: 'Diuron 80% WP' },
          ],
        },
        {
          name: 'Insecticides',
          children: [
            {
              name: 'Neonicotinoids',
              children: [
                { name: 'Imidacloprid 17.8% SL' },
                { name: 'Imidacloprid 70% WG' },
                { name: 'Thiamethoxam 25% WG' },
                { name: 'Acetamiprid 20% SP' },
                { name: 'Clothianidin 50% WDG' },
                { name: 'Dinotefuran 20% SG' },
                { name: 'Thiacloprid 21.7% SC' },
              ],
            },
            {
              name: 'Pyrethroids',
              children: [
                { name: 'Cypermethrin 25% EC' },
                { name: 'Alpha-cypermethrin 10% EC' },
                { name: 'Lambda-cyhalothrin 5% EC' },
                { name: 'Deltamethrin 2.8% EC' },
                { name: 'Bifenthrin 10% EC' },
                { name: 'Fenvalerate 20% EC' },
                { name: 'Permethrin 25% EC' },
              ],
            },
            {
              name: 'Organophosphates',
              children: [
                { name: 'Chlorpyrifos 20% EC' },
                { name: 'Chlorpyrifos 50% + cypermethrin 5% EC' },
                { name: 'Profenofos 50% EC' },
                { name: 'Quinalphos 25% EC' },
                { name: 'Dimethoate 30% EC' },
                { name: 'Acephate 75% SP' },
                { name: 'Triazophos 40% EC' },
                { name: 'Malathion 50% EC' },
              ],
            },
            {
              name: 'Carbamates',
              children: [
                { name: 'Carbaryl 50% WP' },
                { name: 'Carbosulfan 25% EC' },
                { name: 'Thiodicarb 75% WP' },
                { name: 'Methomyl 40% SP' },
              ],
            },
            {
              name: 'Insect growth regulators (IGRs)',
              children: [
                { name: 'Buprofezin 25% SC' },
                { name: 'Lufenuron 5.4% EC' },
                { name: 'Novaluron 10% EC' },
                { name: 'Pyriproxyfen 10% EC' },
                { name: 'Diafenthiuron 50% WP' },
                { name: 'Chromafenozide 5% SC' },
              ],
            },
            {
              name: 'Diamides',
              children: [
                { name: 'Chlorantraniliprole 18.5% SC' },
                { name: 'Flubendiamide 39.35% SC' },
                { name: 'Cyantraniliprole 10.26% OD' },
                { name: 'Tetraniliprole 18.18% SC' },
              ],
            },
            {
              name: 'Spinosyns & avermectins',
              children: [
                { name: 'Spinosad 45% SC' },
                { name: 'Spinetoram 11.7% SC' },
                { name: 'Emamectin benzoate 5% SG' },
                { name: 'Abamectin 1.9% EC' },
              ],
            },
            {
              name: 'Botanical insecticides',
              children: [
                { name: 'Azadirachtin 0.03% EC (300 ppm)' },
                { name: 'Azadirachtin 1% EC (10000 ppm)' },
                { name: 'Neem oil 1500 ppm' },
                { name: 'Karanja oil formulation' },
                { name: 'Pyrethrum extract 2% EW' },
              ],
            },
            {
              name: 'Stored-grain fumigant insecticides',
              children: [
                { name: 'Aluminium phosphide 56% tablets' },
                { name: 'Magnesium phosphide plates' },
                { name: 'Sulphuryl fluoride' },
                { name: 'Malathion grain protectant dust' },
              ],
            },
          ],
        },
        {
          name: 'Fungicides',
          children: [
            {
              name: 'Triazoles',
              children: [
                { name: 'Tebuconazole 25.9% EC' },
                { name: 'Propiconazole 25% EC' },
                { name: 'Hexaconazole 5% SC' },
                { name: 'Difenoconazole 25% EC' },
                { name: 'Epoxiconazole 8.3% SC' },
                { name: 'Metconazole 9% SC' },
                { name: 'Flusilazole 40% EC' },
              ],
            },
            {
              name: 'Strobilurins (QoI)',
              children: [
                { name: 'Azoxystrobin 23% SC' },
                { name: 'Pyraclostrobin 20% WG' },
                { name: 'Kresoxim-methyl 44.3% SC' },
                { name: 'Trifloxystrobin 25% WG' },
                { name: 'Picoxystrobin 22.52% SC' },
              ],
            },
            {
              name: 'Dithiocarbamates',
              children: [
                { name: 'Mancozeb 75% WP' },
                { name: 'Mancozeb 75% WG' },
                { name: 'Propineb 70% WP' },
                { name: 'Zineb 75% WP' },
                { name: 'Ziram 27% SC' },
                { name: 'Thiram 75% WS' },
              ],
            },
            {
              name: 'Copper fungicides',
              children: [
                { name: 'Copper oxychloride 50% WP' },
                { name: 'Copper hydroxide 77% WP' },
                { name: 'Cuprous oxide 53.8% WG' },
                { name: 'Bordeaux mixture (copper sulphate + lime)' },
              ],
            },
            {
              name: 'Sulphur fungicides',
              children: [
                { name: 'Sulphur 80% WP' },
                { name: 'Sulphur 80% WG' },
                { name: 'Micronised wettable sulphur' },
                { name: 'Lime sulphur solution' },
              ],
            },
            {
              name: 'Benzimidazoles',
              children: [
                { name: 'Carbendazim 50% WP' },
                { name: 'Thiophanate-methyl 70% WP' },
                { name: 'Carbendazim 12% + mancozeb 63% WP' },
              ],
            },
            {
              name: 'Phenylamides & anti-oomycetes',
              children: [
                { name: 'Metalaxyl 8% + mancozeb 64% WP' },
                { name: 'Metalaxyl-M 4% + mancozeb 64% WP' },
                { name: 'Cymoxanil 8% + mancozeb 64% WP' },
                { name: 'Fosetyl-aluminium 80% WP' },
                { name: 'Dimethomorph 50% WP' },
                { name: 'Fluopicolide + propamocarb SC' },
              ],
            },
            {
              name: 'SDHI fungicides',
              children: [
                { name: 'Fluxapyroxad 62.5 g/l SC' },
                { name: 'Fluopyram 17.7% + tebuconazole 17.7% SC' },
                { name: 'Boscalid 50% WG' },
                { name: 'Penflufen 240 FS (seed treatment)' },
                { name: 'Isopyrazam 125 g/l SC' },
              ],
            },
            {
              name: 'Seed-treatment fungicides',
              children: [
                { name: 'Carboxin 37.5% + thiram 37.5% DS' },
                { name: 'Captan 50% WP' },
                { name: 'Tebuconazole 2% DS' },
                { name: 'Thiophanate-methyl 45% FS' },
              ],
            },
            {
              name: 'Antibiotic fungicides & bactericides',
              children: [
                { name: 'Streptomycin sulphate 9% + tetracycline 1% SP' },
                { name: 'Kasugamycin 3% SL' },
                { name: 'Validamycin 3% L' },
                { name: 'Oxytetracycline 1.5% + copper sulphate' },
              ],
            },
            { name: 'Tricyclazole 75% WP' },
            { name: 'Chlorothalonil 75% WP' },
            { name: 'Iprodione 25% SC' },
          ],
        },
        {
          name: 'Nematicides',
          children: [
            { name: 'Carbofuran 3% CG' },
            { name: 'Cadusafos 10% CG' },
            { name: 'Fenamiphos 40% EC' },
            { name: 'Oxamyl 24% SL' },
            { name: 'Fluopyram 34.48% SC' },
            { name: 'Fluensulfone 480 EC' },
            { name: 'Metam sodium 42% SL' },
            { name: 'Dazomet 98% GR' },
            { name: '1,3-dichloropropene soil fumigant' },
          ],
        },
        {
          name: 'Rodenticides',
          children: [
            { name: 'Bromadiolone 0.005% ready bait' },
            { name: 'Bromadiolone 0.25% cake concentrate' },
            { name: 'Brodifacoum 0.005% bait blocks' },
            { name: 'Coumatetralyl 0.0375% tracking powder' },
            { name: 'Warfarin 0.025% bait' },
            { name: 'Zinc phosphide 80% TC' },
            { name: 'Difethialone 0.0025% bait' },
          ],
        },
        {
          name: 'Acaricides & miticides',
          children: [
            { name: 'Propargite 57% EC' },
            { name: 'Fenpyroximate 5% EC' },
            { name: 'Spiromesifen 22.9% SC' },
            { name: 'Etoxazole 10% SC' },
            { name: 'Hexythiazox 5.45% EC' },
            { name: 'Fenazaquin 10% EC' },
            { name: 'Dicofol 18.5% EC' },
          ],
        },
        {
          name: 'Molluscicides',
          children: [
            { name: 'Metaldehyde 2.5% pellets' },
            { name: 'Metaldehyde 6% GB' },
            { name: 'Ferric phosphate bait' },
            { name: 'Niclosamide 70% WP' },
          ],
        },
        {
          name: 'Adjuvants & spray additives',
          children: [
            { name: 'Non-ionic surfactant (spreader)' },
            { name: 'Organosilicone super-spreader' },
            { name: 'Sticker-spreader' },
            { name: 'Drift-reduction agent' },
            { name: 'Water conditioner & pH buffer' },
            { name: 'Anti-foam agent' },
            { name: 'Crop oil concentrate / mineral spray oil' },
            { name: 'Ammonium sulphate spray adjuvant' },
          ],
        },
      ],
    },
  ],
};
