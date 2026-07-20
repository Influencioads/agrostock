// AUTO-GENERATED — do not edit by hand.
// Product attribute schema: per-subcategory field definitions for the "Add product"
// form and buyer filters. Generated from the reviewed attribute catalogue.
// 24 categories, 424 subcategories,
// 2544 category-specific fields.

export type AttrFieldType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';

export interface AttrField {
  /** Stable snake_case key — the JSON storage key under Product.attributes. */
  key: string;
  label: string;
  type: AttrFieldType;
  /** Unit suffix for number fields (e.g. "%", "mm", "kg"). */
  unit?: string;
  /** Choices for select / multiselect fields. */
  options?: string[];
  /** Suggested-required at submission. */
  required?: boolean;
  help?: string;
}

export interface SubcategoryAttrs {
  name: string;
  fields: AttrField[];
}

export interface CategoryAttrs {
  name: string;
  emoji: string;
  slug: string;
  subcategories: SubcategoryAttrs[];
}

/** Field types that make sensible buyer filter facets (discrete choices). */
export const FILTERABLE_TYPES: AttrFieldType[] = ['select', 'multiselect', 'boolean'];

export const ATTRIBUTE_SCHEMA: CategoryAttrs[] = [
  {
    "name": "Vegetables",
    "emoji": "🥦",
    "slug": "veg",
    "subcategories": [
      {
        "name": "Bur gherkin",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Brined",
              "Pickled",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size / count per kg",
            "type": "select",
            "options": [
              "3-6 cm (60-80)",
              "6-9 cm (40-60)",
              "9-12 cm (20-40)",
              ">12 cm"
            ],
            "help": "Cornichon length grades; smaller = premium"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Parisian, Vert Petit de Paris"
          },
          {
            "key": "brix",
            "label": "Firmness / no hollow",
            "type": "boolean",
            "help": "Firm, no hollow centres"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (diameter)",
            "type": "number",
            "unit": "mm"
          }
        ]
      },
      {
        "name": "Artichoke",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Green Globe, Violet de Provence, Romanesco"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Hearts",
              "Bottoms",
              "Quartered",
              "Frozen",
              "Marinated"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color type",
            "type": "select",
            "options": [
              "Green",
              "Purple/Violet"
            ]
          },
          {
            "key": "caliber",
            "label": "Head caliber / count per box",
            "type": "select",
            "options": [
              "6-8",
              "9-12",
              "13-15",
              "16-18",
              "20+"
            ],
            "help": "Heads per standard carton"
          },
          {
            "key": "head_diameter_mm",
            "label": "Head diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "with_stem",
            "label": "With stem",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Eggplant",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Black Beauty, Graffiti, Japanese, Rosa Bianca"
          },
          {
            "key": "color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Deep purple/black",
              "Purple striped",
              "White",
              "Green",
              "Rosa/pink"
            ]
          },
          {
            "key": "shape",
            "label": "Shape",
            "type": "select",
            "options": [
              "Globe/oval",
              "Long/cylindrical",
              "Teardrop",
              "Round/baby"
            ]
          },
          {
            "key": "caliber",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Baby",
              "Small",
              "Medium",
              "Large",
              "Extra large"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen",
              "Dried",
              "Grilled/roasted"
            ],
            "required": true
          },
          {
            "key": "avg_weight_g",
            "label": "Average unit weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Sweet potato",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Beauregard, Covington, Murasaki, Japanese/Satsumaimo"
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Orange",
              "White",
              "Yellow/cream",
              "Purple"
            ],
            "required": true
          },
          {
            "key": "skin_color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Copper/red",
              "Purple",
              "White/tan",
              "Gold"
            ]
          },
          {
            "key": "size_grade",
            "label": "US size grade",
            "type": "select",
            "options": [
              "Petite",
              "No.1 (US #1)",
              "Jumbo",
              "Canner",
              "Cut/process"
            ],
            "help": "US #1 = 5-9 cm dia, 8-23 cm long"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Fresh cut/batons",
              "Frozen fries",
              "Dried",
              "Flour/puree"
            ]
          },
          {
            "key": "count_per_carton",
            "label": "Count per carton (40 lb)",
            "type": "number"
          }
        ]
      },
      {
        "name": "Broccoli",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Calabrese (head)",
              "Sprouting/Broccolini",
              "Romanesco",
              "Purple sprouting"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh crown",
              "Fresh whole head",
              "Florets",
              "Frozen florets",
              "Frozen cuts"
            ],
            "required": true
          },
          {
            "key": "head_diameter_mm",
            "label": "Head diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "count_per_carton",
            "label": "Count per carton",
            "type": "select",
            "options": [
              "12",
              "14",
              "18",
              "20",
              "24"
            ],
            "help": "Crowns/heads per standard carton"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Dark green",
              "Green",
              "Purple",
              "Chartreuse (Romanesco)"
            ]
          }
        ]
      },
      {
        "name": "Ginger",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Dried whole",
              "Split/dried",
              "Powder",
              "Paste",
              "Preserved/candied",
              "Pickled"
            ],
            "required": true
          },
          {
            "key": "type",
            "label": "Curing type",
            "type": "select",
            "options": [
              "Bold/mature",
              "Young/tender (new crop)",
              "Bleached",
              "Unbleached"
            ]
          },
          {
            "key": "variety_origin",
            "label": "Variety / origin type",
            "type": "text",
            "help": "e.g. Nigerian, Cochin, Chinese, Peruvian"
          },
          {
            "key": "size",
            "label": "Size grade",
            "type": "select",
            "options": [
              "A (bold)",
              "B",
              "C",
              "Fingers/broken"
            ]
          },
          {
            "key": "oil_pct",
            "label": "Volatile oil",
            "type": "number",
            "unit": "%",
            "help": "For dried; typ. 1.5-3%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Dried: <10-12%"
          }
        ]
      },
      {
        "name": "Zucchini",
        "fields": [
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green",
              "Dark green",
              "Yellow/gold",
              "Striped",
              "Light green (Lebanese)"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Black Beauty, Cocozelle, Costata Romanesco"
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Baby (<12 cm)",
              "Small (12-16 cm)",
              "Medium (16-21 cm)",
              "Large (>21 cm)"
            ]
          },
          {
            "key": "length_mm",
            "label": "Length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen sliced",
              "Frozen diced",
              "With flower"
            ]
          }
        ]
      },
      {
        "name": "Cabbage",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Green/white",
              "Red",
              "Pointed/Hispi",
              "Flat Dutch",
              "Round"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "head_weight_grade",
            "label": "Head weight grade",
            "type": "select",
            "options": [
              "<1 kg",
              "1-2 kg",
              "2-3 kg",
              "3-5 kg",
              ">5 kg"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Trimmed",
              "Shredded",
              "Sauerkraut/fermented"
            ]
          },
          {
            "key": "avg_head_weight_kg",
            "label": "Average head weight",
            "type": "number",
            "unit": "kg"
          }
        ]
      },
      {
        "name": "Brussels sprouts",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Loose fresh",
              "On stalk",
              "Frozen whole",
              "Frozen halved"
            ],
            "required": true
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (diameter)",
            "type": "select",
            "options": [
              "Baby (<20 mm)",
              "Small (20-30 mm)",
              "Medium (30-40 mm)",
              "Large (>40 mm)"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green",
              "Red/purple"
            ]
          },
          {
            "key": "diameter_mm",
            "label": "Exact diameter",
            "type": "number",
            "unit": "mm"
          }
        ]
      },
      {
        "name": "Napa cabbage",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Michihili, Wong Bok"
          },
          {
            "key": "shape",
            "label": "Head shape",
            "type": "select",
            "options": [
              "Barrel (short)",
              "Cylindrical (tall)"
            ]
          },
          {
            "key": "head_weight_grade",
            "label": "Head weight grade",
            "type": "select",
            "options": [
              "<1 kg",
              "1-2 kg",
              "2-3 kg",
              ">3 kg"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Trimmed",
              "Kimchi-cut/salted"
            ]
          },
          {
            "key": "count_per_carton",
            "label": "Count per carton",
            "type": "number"
          }
        ]
      },
      {
        "name": "Savoy cabbage",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green",
              "Blue-green",
              "Red Savoy"
            ]
          },
          {
            "key": "head_weight_grade",
            "label": "Head weight grade",
            "type": "select",
            "options": [
              "<1 kg",
              "1-1.5 kg",
              "1.5-2.5 kg",
              ">2.5 kg"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Trimmed",
              "Shredded"
            ]
          },
          {
            "key": "avg_head_weight_kg",
            "label": "Average head weight",
            "type": "number",
            "unit": "kg"
          }
        ]
      },
      {
        "name": "Cauliflower",
        "fields": [
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "White",
              "Orange",
              "Purple",
              "Green (broccoflower)",
              "Romanesco"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Trimmed/wrapped",
              "Florets",
              "Frozen florets",
              "Riced/frozen"
            ],
            "required": true
          },
          {
            "key": "head_diameter_mm",
            "label": "Head diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "count_per_carton",
            "label": "Count per carton",
            "type": "select",
            "options": [
              "6",
              "8",
              "9",
              "12",
              "16"
            ]
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          }
        ]
      },
      {
        "name": "Potato",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Russet Burbank, Maris Piper, Agria, Spunta"
          },
          {
            "key": "use_type",
            "label": "End use",
            "type": "select",
            "options": [
              "Table/fresh",
              "French fry/processing",
              "Crisp/chip",
              "Seed potato",
              "Starch"
            ],
            "required": true
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "White",
              "Yellow",
              "Cream",
              "Red",
              "Purple"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (size)",
            "type": "select",
            "options": [
              "25-40 mm (baby/new)",
              "40-55 mm",
              "55-70 mm",
              "70-90 mm",
              ">90 mm"
            ]
          },
          {
            "key": "dry_matter_pct",
            "label": "Dry matter / starch",
            "type": "number",
            "unit": "%",
            "help": "Fry grade typ. >20%"
          },
          {
            "key": "skin_color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Yellow/tan",
              "Red",
              "White",
              "Russet/netted",
              "Purple"
            ]
          }
        ]
      },
      {
        "name": "Kohlrabi",
        "fields": [
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green/white",
              "Purple"
            ],
            "required": true
          },
          {
            "key": "bulb_diameter_mm",
            "label": "Bulb diameter",
            "type": "select",
            "options": [
              "<6 cm (baby)",
              "6-8 cm",
              "8-10 cm",
              ">10 cm"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh with tops",
              "Fresh trimmed",
              "Peeled/cut"
            ]
          },
          {
            "key": "diameter_mm",
            "label": "Exact diameter",
            "type": "number",
            "unit": "mm"
          }
        ]
      },
      {
        "name": "Bottle gourd",
        "fields": [
          {
            "key": "shape",
            "label": "Shape",
            "type": "select",
            "options": [
              "Long/cylindrical",
              "Round",
              "Bottle/pear",
              "Bat/club"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Lauki, Calabash, Opo"
          },
          {
            "key": "length_mm",
            "label": "Length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh tender",
              "Mature/dried shell"
            ]
          },
          {
            "key": "avg_weight_g",
            "label": "Average unit weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Carrot",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Nantes",
              "Imperator",
              "Danvers",
              "Chantenay",
              "Kuroda",
              "Baby/Amsterdam"
            ],
            "help": "Cultivar group"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Orange",
              "Purple",
              "Yellow",
              "White",
              "Red",
              "Rainbow mix"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh with tops",
              "Topped/washed",
              "Baby-cut",
              "Batons/sticks",
              "Frozen diced",
              "Frozen sliced"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "A (extra fine)",
              "B (fine)",
              "Standard",
              "Jumbo",
              "Cut/process"
            ]
          },
          {
            "key": "diameter_mm",
            "label": "Diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "length_mm",
            "label": "Length",
            "type": "number",
            "unit": "mm"
          }
        ]
      },
      {
        "name": "Cucumber",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Slicing (field)",
              "English/Dutch (seedless)",
              "Persian/mini",
              "Pickling (Kirby)",
              "Beit Alpha"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Fresh wrapped",
              "Pickled/brined"
            ],
            "required": true
          },
          {
            "key": "length_grade",
            "label": "Length grade",
            "type": "select",
            "options": [
              "Mini (<15 cm)",
              "Medium (15-25 cm)",
              "Long (25-35 cm)",
              ">35 cm"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (diameter)",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "count_per_carton",
            "label": "Count per carton",
            "type": "number"
          }
        ]
      },
      {
        "name": "Olives",
        "fields": [
          {
            "key": "type",
            "label": "Color type",
            "type": "select",
            "options": [
              "Green",
              "Black (ripe)",
              "Kalamata/purple",
              "Turning color"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Manzanilla, Hojiblanca, Kalamata, Nocellara"
          },
          {
            "key": "form",
            "label": "Preparation",
            "type": "select",
            "options": [
              "Whole with pit",
              "Pitted",
              "Stuffed",
              "Sliced",
              "Halved",
              "Wedges",
              "Paste/tapenade"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per kg)",
            "type": "select",
            "options": [
              "180-200",
              "200-230",
              "240-260",
              "260-290",
              "320-350",
              "380-420"
            ],
            "help": "Lower count = larger olive"
          },
          {
            "key": "cure_style",
            "label": "Cure / process",
            "type": "select",
            "options": [
              "Spanish (lye)",
              "Greek (natural brine)",
              "California (oxidized)",
              "Sicilian",
              "Dry-cured/oil-cured"
            ]
          },
          {
            "key": "packing_medium",
            "label": "Packing medium",
            "type": "select",
            "options": [
              "Brine",
              "Dry",
              "Olive oil",
              "Vinegar",
              "Vacuum"
            ]
          }
        ]
      },
      {
        "name": "Pattypan squash",
        "fields": [
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "White",
              "Yellow",
              "Green",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Baby (<5 cm)",
              "Small (5-8 cm)",
              "Medium (8-12 cm)",
              "Large (>12 cm)"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Sunburst, Bennings Green Tint"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen"
            ]
          },
          {
            "key": "diameter_mm",
            "label": "Diameter",
            "type": "number",
            "unit": "mm"
          }
        ]
      },
      {
        "name": "Bell pepper",
        "fields": [
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green",
              "Red",
              "Yellow",
              "Orange",
              "Purple",
              "Mixed/traffic-light"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen diced",
              "Frozen strips",
              "Roasted",
              "Dried/flakes"
            ],
            "required": true
          },
          {
            "key": "shape",
            "label": "Shape",
            "type": "select",
            "options": [
              "Blocky (4-lobe)",
              "Elongated/Lamuyo",
              "Conical",
              "Mini/snack"
            ]
          },
          {
            "key": "size_grade",
            "label": "Size / count per box",
            "type": "select",
            "options": [
              "Extra large (18-22)",
              "Large (22-30)",
              "Medium (30-40)",
              "Mini/snack"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (diameter)",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "wall_type",
            "label": "Wall thickness",
            "type": "select",
            "options": [
              "Thick (blocky)",
              "Medium",
              "Thin"
            ]
          }
        ]
      },
      {
        "name": "Chili pepper",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Jalapeño, Cayenne, Habanero, Bird's eye, Serrano"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried whole",
              "Crushed/flakes",
              "Powder",
              "Paste",
              "Pickled"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green",
              "Red",
              "Yellow",
              "Orange",
              "Mixed"
            ]
          },
          {
            "key": "shu",
            "label": "Pungency (Scoville)",
            "type": "number",
            "unit": "SHU",
            "help": "e.g. jalapeño 2.5-8k, habanero 100-350k"
          },
          {
            "key": "length_mm",
            "label": "Pod length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%",
            "help": "Dried: <11%"
          }
        ]
      },
      {
        "name": "Tsitsak pepper",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Brined/fermented (tsitsak)",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Light green/yellow",
              "Green",
              "Red"
            ]
          },
          {
            "key": "heat_level",
            "label": "Heat level",
            "type": "select",
            "options": [
              "Mild",
              "Medium",
              "Hot"
            ],
            "help": "Armenian pickling pepper, mildly hot"
          },
          {
            "key": "length_mm",
            "label": "Pod length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "shu",
            "label": "Pungency (Scoville)",
            "type": "number",
            "unit": "SHU"
          }
        ]
      },
      {
        "name": "Tomato",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Round/globe",
              "Beefsteak",
              "Plum/Roma",
              "Cherry",
              "Cocktail",
              "Grape",
              "On-the-vine (TOV)",
              "Oxheart"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Red",
              "Yellow",
              "Orange",
              "Green",
              "Brown/Kumato",
              "Pink",
              "Purple/black",
              "Mixed heirloom"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Sun-dried",
              "Paste/concentrate",
              "Peeled/canned",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (diameter)",
            "type": "select",
            "options": [
              "<35 mm (cherry)",
              "35-47 mm",
              "47-57 mm",
              "57-67 mm",
              "67-82 mm",
              ">82 mm"
            ]
          },
          {
            "key": "brix",
            "label": "Brix (sugar)",
            "type": "number",
            "unit": "°Brix",
            "help": "Higher = sweeter; premium >5"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          }
        ]
      },
      {
        "name": "Radish",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Round red",
              "French breakfast",
              "Daikon/white long",
              "Watermelon",
              "Easter egg mix"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Red",
              "White",
              "Pink",
              "Purple",
              "Bi-color"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh with tops",
              "Topped/bunched",
              "Loose",
              "Pickled"
            ],
            "required": true
          },
          {
            "key": "diameter_mm",
            "label": "Diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "count_per_bunch",
            "label": "Count per bunch",
            "type": "number"
          }
        ]
      },
      {
        "name": "Black radish",
        "fields": [
          {
            "key": "shape",
            "label": "Shape",
            "type": "select",
            "options": [
              "Round",
              "Long/cylindrical"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh with tops",
              "Fresh trimmed",
              "Grated/cut"
            ]
          },
          {
            "key": "diameter_mm",
            "label": "Diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "avg_weight_g",
            "label": "Average unit weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Round Black Spanish, Long Black Spanish"
          }
        ]
      },
      {
        "name": "Turnip",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Purple Top White Globe, Golden Ball, Tokyo/Hakurei"
          },
          {
            "key": "color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Purple-top white",
              "White",
              "Yellow/golden",
              "Red"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh with tops",
              "Topped/washed",
              "Baby/salad",
              "Diced"
            ],
            "required": true
          },
          {
            "key": "diameter_mm",
            "label": "Diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Baby (<5 cm)",
              "Small",
              "Medium",
              "Large"
            ]
          }
        ]
      },
      {
        "name": "Beetroot",
        "fields": [
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Red/purple",
              "Golden/yellow",
              "White",
              "Chioggia (striped)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh with tops",
              "Topped/washed",
              "Cooked/vacuum",
              "Pickled",
              "Diced frozen",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "shape",
            "label": "Shape",
            "type": "select",
            "options": [
              "Globe/round",
              "Cylindrical",
              "Flat"
            ]
          },
          {
            "key": "diameter_mm",
            "label": "Diameter",
            "type": "select",
            "options": [
              "Baby (<40 mm)",
              "40-60 mm",
              "60-90 mm",
              ">90 mm"
            ]
          },
          {
            "key": "brix",
            "label": "Brix (sugar)",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Fodder beet",
        "fields": [
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Cattle feed",
              "Sheep feed",
              "Pig feed",
              "Biogas"
            ],
            "required": true
          },
          {
            "key": "dry_matter_pct",
            "label": "Dry matter",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "Typ. 12-21%"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Brigadier, Feldherr, Jamon"
          },
          {
            "key": "color",
            "label": "Root color",
            "type": "select",
            "options": [
              "White",
              "Yellow",
              "Orange",
              "Red"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Chopped",
              "Ensiled"
            ]
          }
        ]
      },
      {
        "name": "Sugar beet",
        "fields": [
          {
            "key": "sugar_content_pct",
            "label": "Sugar content (polarization)",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "Typ. 16-20% pol"
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Sugar processing",
              "Feed",
              "Biogas/ethanol",
              "Seed"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "tare_pct",
            "label": "Soil tare / dirt",
            "type": "number",
            "unit": "%",
            "help": "Adhering soil, lower is better"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh roots",
              "Sliced/cossettes",
              "Dried pulp"
            ]
          }
        ]
      },
      {
        "name": "Asparagus",
        "fields": [
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green",
              "White",
              "Purple",
              "Wild/sprue"
            ],
            "required": true
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (spear diameter)",
            "type": "select",
            "options": [
              "Sprue (<8 mm)",
              "Small/S (8-12 mm)",
              "Medium/M (12-16 mm)",
              "Large/L (16-20 mm)",
              "Jumbo/XL (>20 mm)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh bunched",
              "Fresh loose",
              "Trimmed/tips",
              "Frozen",
              "Canned/jarred"
            ]
          },
          {
            "key": "length_mm",
            "label": "Spear length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Gijnlim, UC157, Grolim"
          }
        ]
      },
      {
        "name": "Jerusalem artichoke",
        "fields": [
          {
            "key": "color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "White/tan",
              "Red",
              "Purple"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh tubers",
              "Washed",
              "Sliced/dried",
              "Flour/inulin powder"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large",
              "Mixed"
            ]
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Fuseau, Stampede"
          },
          {
            "key": "inulin_pct",
            "label": "Inulin content",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Pumpkin",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Culinary/pie",
              "Hokkaido/Kuri",
              "Butternut",
              "Kabocha",
              "Field/carving",
              "Giant",
              "Naked-seed/oil (Styrian)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Cut/portioned",
              "Puree",
              "Frozen cubes",
              "Dried",
              "Seeds"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Orange",
              "Green",
              "Grey/blue",
              "Tan",
              "White",
              "Striped"
            ]
          },
          {
            "key": "weight_grade_kg",
            "label": "Weight grade",
            "type": "select",
            "options": [
              "<1 kg",
              "1-3 kg",
              "3-6 kg",
              "6-10 kg",
              ">10 kg"
            ]
          },
          {
            "key": "brix",
            "label": "Brix (sugar)",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Horseradish",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh root",
              "Grated",
              "Prepared/creamed",
              "Dried",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "root_diameter_mm",
            "label": "Root diameter",
            "type": "select",
            "options": [
              "<25 mm",
              "25-40 mm",
              "40-60 mm",
              ">60 mm"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Maliner Kren, Bohemian"
          },
          {
            "key": "length_mm",
            "label": "Root length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "pungency",
            "label": "Pungency grade",
            "type": "select",
            "options": [
              "Mild",
              "Medium",
              "Strong/hot"
            ]
          }
        ]
      },
      {
        "name": "Chayote",
        "fields": [
          {
            "key": "color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Light green",
              "Dark green",
              "White/ivory"
            ],
            "required": true
          },
          {
            "key": "skin_type",
            "label": "Skin type",
            "type": "select",
            "options": [
              "Smooth",
              "Spiny/ridged"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Cut/frozen"
            ]
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large"
            ]
          },
          {
            "key": "avg_weight_g",
            "label": "Average unit weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Garlic",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Softneck",
              "Hardneck",
              "Elephant"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "White",
              "Purple/violet striped",
              "Pink/red"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh bulb",
              "Peeled cloves",
              "Minced/paste",
              "Dried flakes",
              "Powder",
              "Granules",
              "Black garlic"
            ],
            "required": true
          },
          {
            "key": "bulb_caliber_mm",
            "label": "Bulb caliber",
            "type": "select",
            "options": [
              "<40 mm",
              "40-45 mm",
              "45-50 mm",
              "50-55 mm",
              "55-60 mm",
              ">60 mm"
            ],
            "required": true,
            "help": "Bulb diameter grade"
          },
          {
            "key": "cloves_per_bulb",
            "label": "Cloves per bulb",
            "type": "number"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Allium, Solo/single-clove, Rocambole"
          }
        ]
      },
      {
        "name": "Tiger nut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole dried",
              "Whole fresh",
              "Peeled",
              "Flour",
              "Sliced"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large",
              "Jumbo"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Brown",
              "Yellow",
              "Black"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Dried: <10%"
          },
          {
            "key": "variety_origin",
            "label": "Variety / origin",
            "type": "text",
            "help": "e.g. Spanish (Valencia), African/Nigerian"
          }
        ]
      },
      {
        "name": "Yacon",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh root",
              "Dried slices",
              "Syrup",
              "Powder/flour"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large"
            ]
          },
          {
            "key": "brix",
            "label": "Brix (sugar)",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "fos_pct",
            "label": "FOS (fructooligosaccharide)",
            "type": "number",
            "unit": "%",
            "help": "Prebiotic sugar content"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          }
        ]
      },
      {
        "name": "Yam",
        "fields": [
          {
            "key": "species",
            "label": "Species / type",
            "type": "select",
            "options": [
              "White (D. rotundata)",
              "Yellow (D. cayenensis)",
              "Water/greater (D. alata)",
              "Chinese/nagaimo (D. polystachya)",
              "Bitter/aerial"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh tuber",
              "Peeled/cut",
              "Flour",
              "Dried chips",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "White",
              "Yellow",
              "Purple",
              "Cream"
            ]
          },
          {
            "key": "size_grade",
            "label": "Size / weight grade",
            "type": "select",
            "options": [
              "<1 kg",
              "1-2 kg",
              "2-4 kg",
              ">4 kg"
            ]
          },
          {
            "key": "avg_weight_kg",
            "label": "Average tuber weight",
            "type": "number",
            "unit": "kg"
          }
        ]
      }
    ]
  },
  {
    "name": "Fruits",
    "emoji": "🍎",
    "slug": "fruits",
    "subcategories": [
      {
        "name": "Apricot",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Bergeron, Bulida, Kioto, Turkish No.10"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried (whole)",
              "Dried (pitted halves)"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count/kg)",
            "type": "select",
            "options": [
              "A (16-18)",
              "AA (14-16)",
              "AAA (12-14)",
              "AAAA (<12)"
            ],
            "help": "Caliber grades by fruits per kg"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "sulphured",
            "label": "Sulphured (SO2 treated)",
            "type": "boolean",
            "help": "Dried only; affects color/shelf life"
          },
          {
            "key": "maturity",
            "label": "Maturity",
            "type": "select",
            "options": [
              "Mature green",
              "Firm ripe",
              "Ripe"
            ]
          }
        ]
      },
      {
        "name": "Avocado",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Hass",
              "Fuerte",
              "Ettinger",
              "Pinkerton",
              "Reed",
              "Bacon",
              "Zutano",
              "Lamb Hass"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "12",
              "14",
              "16",
              "18",
              "20",
              "22",
              "24",
              "26",
              "28",
              "30",
              "32"
            ],
            "help": "Fruits per 4kg carton; lower = larger"
          },
          {
            "key": "dry_matter_pct",
            "label": "Dry matter",
            "type": "number",
            "unit": "%",
            "help": "Oil/maturity indicator; min ~21-23%"
          },
          {
            "key": "ripeness",
            "label": "Ripeness stage",
            "type": "select",
            "options": [
              "Hard (unripe)",
              "Breaking",
              "Ripe (ready to eat)"
            ]
          },
          {
            "key": "fruit_weight_g",
            "label": "Fruit weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Pawpaw",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "text",
            "help": "e.g. Sunrise Solo, Red Lady, Formosa"
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Yellow",
              "Orange",
              "Red/Pink"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "ripeness",
            "label": "Ripeness / color break",
            "type": "select",
            "options": [
              "Green (0%)",
              "Color break (25%)",
              "Half ripe (50%)",
              "Ripe (75-100%)"
            ]
          },
          {
            "key": "fruit_weight_g",
            "label": "Fruit weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Quince",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "text",
            "help": "e.g. Vranja, Champion, Portugal"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Paste"
            ],
            "required": true
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm",
            "help": "Diameter"
          },
          {
            "key": "fruit_weight_g",
            "label": "Fruit weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "maturity",
            "label": "Maturity",
            "type": "select",
            "options": [
              "Green mature",
              "Yellow ripe"
            ]
          }
        ]
      },
      {
        "name": "Ackee",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh (in pod)",
              "Canned in brine",
              "Frozen arils"
            ],
            "required": true
          },
          {
            "key": "aril_color",
            "label": "Aril color",
            "type": "select",
            "options": [
              "Cream/Yellow",
              "Firm cream"
            ]
          },
          {
            "key": "maturity",
            "label": "Pod maturity",
            "type": "select",
            "options": [
              "Naturally opened (safe)",
              "Forced open (unsafe)"
            ],
            "help": "Must be tree-opened to be safe"
          },
          {
            "key": "hypoglycin_tested",
            "label": "Hypoglycin A tested",
            "type": "boolean",
            "help": "Toxin compliance for export"
          }
        ]
      },
      {
        "name": "Cherry plum",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "text",
            "help": "e.g. Myrobalan, Ruby, Golden Sphere"
          },
          {
            "key": "skin_color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Red",
              "Yellow",
              "Purple",
              "Green"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "maturity",
            "label": "Maturity",
            "type": "select",
            "options": [
              "Firm ripe",
              "Ripe"
            ]
          }
        ]
      },
      {
        "name": "Pineapple",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "MD2 / Extra Sweet",
              "Smooth Cayenne",
              "Queen Victoria",
              "Sugarloaf",
              "Red Spanish"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "12",
              "14"
            ],
            "help": "Fruits per standard carton"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "help": "MD2 typically 13-16"
          },
          {
            "key": "crown",
            "label": "Crown",
            "type": "select",
            "options": [
              "With crown",
              "Crownless",
              "Trimmed crown"
            ]
          },
          {
            "key": "ripeness_color",
            "label": "Shell color / ripeness",
            "type": "select",
            "options": [
              "C0 (green)",
              "C1 (0-25% yellow)",
              "C2 (25-50%)",
              "C3 (50-75%)",
              "C4 (75-100%)"
            ]
          }
        ]
      },
      {
        "name": "Orange",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Valencia",
              "Navel",
              "Navelina",
              "Salustiana",
              "Lane Late",
              "Hamlin",
              "Washington Navel"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "48",
              "56",
              "64",
              "72",
              "80",
              "88",
              "100",
              "113",
              "125"
            ],
            "help": "Count per 15kg carton; higher = smaller"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Fresh / table",
              "Juice"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "waxed",
            "label": "Waxed",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Blood orange",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Moro",
              "Tarocco",
              "Sanguinello",
              "Sanguinelli"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "48",
              "56",
              "64",
              "72",
              "80",
              "88",
              "100"
            ],
            "help": "Count per 15kg carton"
          },
          {
            "key": "flesh_pigmentation",
            "label": "Flesh pigmentation",
            "type": "select",
            "options": [
              "Light blush",
              "Medium",
              "Deep red"
            ],
            "help": "Anthocyanin intensity"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "waxed",
            "label": "Waxed",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Watermelon",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Crimson Sweet",
              "Sugar Baby",
              "Charleston Gray",
              "Jubilee",
              "Seedless (triploid)",
              "Yellow flesh",
              "Mini/Personal"
            ],
            "required": true
          },
          {
            "key": "seedless",
            "label": "Seedless",
            "type": "boolean",
            "required": true
          },
          {
            "key": "fruit_weight_kg",
            "label": "Average fruit weight",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Red",
              "Pink",
              "Yellow",
              "Orange"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "help": "Sweetness; target 10-12+"
          }
        ]
      },
      {
        "name": "Banana",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Cavendish",
              "Grand Naine",
              "Gros Michel",
              "Red banana",
              "Lady Finger",
              "Plantain",
              "Apple/Manzano"
            ],
            "required": true
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra / Class I",
              "Class II",
              "US No.1"
            ]
          },
          {
            "key": "finger_length_cm",
            "label": "Finger length",
            "type": "number",
            "unit": "cm",
            "help": "Typically 18-23 cm export"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (grade)",
            "type": "number",
            "unit": "mm",
            "help": "Finger diameter; min ~39mm"
          },
          {
            "key": "ripeness_stage",
            "label": "Ripeness (color index)",
            "type": "select",
            "options": [
              "1 (green)",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7 (yellow/flecked)"
            ]
          }
        ]
      },
      {
        "name": "Grapes",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Thompson Seedless",
              "Crimson Seedless",
              "Red Globe",
              "Flame Seedless",
              "Autumn Royal",
              "Sugraone",
              "Muscat",
              "Sultana"
            ],
            "required": true
          },
          {
            "key": "seedless",
            "label": "Seedless",
            "type": "boolean",
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Green/White",
              "Red",
              "Black/Blue"
            ]
          },
          {
            "key": "berry_size_mm",
            "label": "Berry size",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "help": "Min ~16-17 for export"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh table",
              "Raisin/Dried"
            ]
          }
        ]
      },
      {
        "name": "Sour cherry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Montmorency",
              "Morello",
              "Oblacinska",
              "Schattenmorelle",
              "Balaton"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Pitted",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "pitted",
            "label": "Pitted",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Pomegranate",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Wonderful",
              "Hicaznar",
              "Bhagwa",
              "Acco",
              "Mollar de Elche",
              "Ganesh"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole fresh",
              "Arils (fresh)",
              "Arils (frozen)"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "6",
              "8",
              "10",
              "12",
              "14",
              "16",
              "18",
              "20"
            ],
            "help": "Fruits per carton"
          },
          {
            "key": "aril_color",
            "label": "Aril color",
            "type": "select",
            "options": [
              "Deep red",
              "Red",
              "Pink"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Grapefruit",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Ruby Red",
              "Star Ruby",
              "Rio Red",
              "Marsh (white)",
              "Oro Blanco",
              "Flame"
            ],
            "required": true
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Red",
              "Pink",
              "White"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "23",
              "27",
              "32",
              "36",
              "40",
              "48",
              "56"
            ],
            "help": "Count per carton"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "waxed",
            "label": "Waxed",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Pear",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Williams / Bartlett",
              "Conference",
              "Abate Fetel",
              "Packham",
              "Comice",
              "Anjou",
              "Rocha",
              "Nashi/Asian"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "60",
              "70",
              "80",
              "90",
              "100",
              "110",
              "120",
              "135"
            ],
            "help": "Count per carton"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "firmness",
            "label": "Firmness / maturity",
            "type": "select",
            "options": [
              "Hard (unripe)",
              "Firm ripe",
              "Ready to eat"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Guava",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "text",
            "help": "e.g. Allahabad Safeda, Thai White, Pink Taiwan, Lucknow-49"
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "White",
              "Pink",
              "Red"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen pulp",
              "Dried"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "fruit_weight_g",
            "label": "Fruit weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "maturity",
            "label": "Maturity",
            "type": "select",
            "options": [
              "Mature green",
              "Half ripe",
              "Ripe"
            ]
          }
        ]
      },
      {
        "name": "Jackfruit",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole fresh",
              "Bulbs/pods (fresh)",
              "Frozen bulbs",
              "Young/green (canned)",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "flesh_type",
            "label": "Flesh type",
            "type": "select",
            "options": [
              "Firm (crunchy)",
              "Soft (juicy)"
            ]
          },
          {
            "key": "maturity",
            "label": "Maturity",
            "type": "select",
            "options": [
              "Young/green (culinary)",
              "Ripe (sweet)"
            ]
          },
          {
            "key": "fruit_weight_kg",
            "label": "Fruit weight",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "brix",
            "label": "Brix (ripe)",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Durian",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Monthong",
              "Musang King (Mao Shan Wang)",
              "D24",
              "Kanyao",
              "Chanee",
              "Red Prawn (Ang Heh)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole fresh",
              "Frozen whole",
              "Frozen pulp/paste",
              "De-husked frozen"
            ],
            "required": true
          },
          {
            "key": "fruit_weight_kg",
            "label": "Fruit weight",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "ripeness",
            "label": "Ripeness",
            "type": "select",
            "options": [
              "Unripe/firm",
              "Ripe (ready)",
              "Fully ripe/creamy"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "A",
              "B",
              "C"
            ]
          }
        ]
      },
      {
        "name": "Melon",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / type",
            "type": "select",
            "options": [
              "Cantaloupe",
              "Galia",
              "Honeydew",
              "Charentais",
              "Piel de Sapo",
              "Muskmelon",
              "Ananas"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "12",
              "15"
            ],
            "help": "Fruits per carton"
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Orange",
              "Green",
              "White",
              "Yellow"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "help": "Target 11-14"
          },
          {
            "key": "ripeness",
            "label": "Ripeness / netting",
            "type": "select",
            "options": [
              "Mature green",
              "Half slip",
              "Full slip / ripe"
            ]
          }
        ]
      },
      {
        "name": "Fig",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Black Mission",
              "Brown Turkey",
              "Sarilop/Smyrna",
              "Kadota",
              "Adriatic",
              "Bursa Black"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried (whole)",
              "Dried (lerida/strung)"
            ],
            "required": true
          },
          {
            "key": "skin_color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Black/Purple",
              "Brown",
              "Green",
              "Yellow"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count/kg, dried)",
            "type": "select",
            "options": [
              "Lerida",
              "Protoben",
              "Baglama",
              "Layer",
              "Natural"
            ],
            "help": "Dried fig trade grades"
          },
          {
            "key": "brix",
            "label": "Brix (fresh)",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Horned melon",
        "fields": [
          {
            "key": "skin_color",
            "label": "Skin color / ripeness",
            "type": "select",
            "options": [
              "Green (unripe)",
              "Yellow-orange (ripe)"
            ],
            "required": true
          },
          {
            "key": "fruit_weight_g",
            "label": "Fruit weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (length)",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "count_per_box",
            "label": "Count per box",
            "type": "number",
            "help": "Fruits per carton"
          }
        ]
      },
      {
        "name": "Kiwi",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Hayward (green)",
              "SunGold (gold)",
              "Zespri Gold",
              "Soreli",
              "Jintao",
              "Red kiwi"
            ],
            "required": true
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Green",
              "Gold/Yellow",
              "Red"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per tray)",
            "type": "select",
            "options": [
              "23",
              "25",
              "27",
              "30",
              "33",
              "36",
              "39",
              "42",
              "46"
            ],
            "help": "Count per 3.6kg tray"
          },
          {
            "key": "brix",
            "label": "Brix / maturity",
            "type": "number",
            "unit": "°Brix",
            "help": "Harvest min ~6.2"
          },
          {
            "key": "firmness",
            "label": "Firmness",
            "type": "select",
            "options": [
              "Hard (unripe)",
              "Firm",
              "Ready to eat"
            ]
          }
        ]
      },
      {
        "name": "Clementine",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Clemenules",
              "Oronules",
              "Fina",
              "Marisol",
              "Clemenvilla / Nova",
              "Hernandina"
            ],
            "required": true
          },
          {
            "key": "seedless",
            "label": "Seedless",
            "type": "boolean"
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "1XXX",
              "1XX",
              "1X",
              "1",
              "2",
              "3",
              "4",
              "5"
            ],
            "help": "Caliber count code"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Coconut",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Mature (brown, husked)",
              "Semi-husked",
              "Young (tender/green)",
              "Fresh de-husked white"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form / product",
            "type": "select",
            "options": [
              "Whole",
              "Desiccated",
              "Copra",
              "Coconut water",
              "Milk/cream"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per bag)",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large",
              "Extra large"
            ]
          },
          {
            "key": "husked",
            "label": "Husked",
            "type": "boolean"
          },
          {
            "key": "fruit_weight_g",
            "label": "Nut weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Kumquat",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Nagami (oval)",
              "Marumi (round)",
              "Meiwa (sweet)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Candied/preserved"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Lime",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Persian / Tahiti",
              "Key / Mexican",
              "Kaffir",
              "Seedless",
              "Sweet lime"
            ],
            "required": true
          },
          {
            "key": "seedless",
            "label": "Seedless",
            "type": "boolean"
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "110",
              "150",
              "175",
              "200",
              "230",
              "250"
            ],
            "help": "Count per 40lb / carton"
          },
          {
            "key": "skin_color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Dark green",
              "Green",
              "Light green/yellowing"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Lemon",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Eureka",
              "Lisbon",
              "Primofiori / Fino",
              "Verna",
              "Meyer",
              "Femminello",
              "Interdonato"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "75",
              "95",
              "115",
              "140",
              "165",
              "190",
              "235"
            ],
            "help": "Count per 15kg carton"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "seedless",
            "label": "Seedless",
            "type": "boolean"
          },
          {
            "key": "waxed",
            "label": "Waxed",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Lychee",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Mauritius",
              "Kwai May Pink",
              "Tai So",
              "Wai Chee",
              "Brewster",
              "Feizixiao"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen",
              "Canned",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "skin_color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Bright red",
              "Red-pink",
              "Reddish-brown"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Longan",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Daw",
              "Biew Kiew",
              "Edor",
              "Chompoo",
              "Sri Chompoo"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh (on branch)",
              "Fresh (loose)",
              "Frozen",
              "Dried (whole)",
              "Dried (pulp)"
            ],
            "required": true
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "AAA",
              "AA",
              "A",
              "B"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Mango",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Kent",
              "Keitt",
              "Tommy Atkins",
              "Alphonso",
              "Kesar",
              "Ataulfo / Honey",
              "Palmer",
              "Nam Dok Mai",
              "Osteen",
              "Haden"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF chunks)",
              "Dried",
              "Pulp/puree"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "6",
              "7",
              "8",
              "9",
              "10",
              "12",
              "14",
              "16",
              "18"
            ],
            "help": "Fruits per 4kg carton"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "ripeness",
            "label": "Ripeness",
            "type": "select",
            "options": [
              "Mature green",
              "Breaking",
              "Firm ripe",
              "Ripe"
            ]
          },
          {
            "key": "treatment",
            "label": "Phyto treatment",
            "type": "select",
            "options": [
              "None",
              "Hot water (HWT)",
              "Vapor heat (VHT)",
              "Irradiated"
            ],
            "help": "Fruit-fly quarantine treatment"
          }
        ]
      },
      {
        "name": "Mangosteen",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen whole",
              "Frozen segments"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count/kg)",
            "type": "select",
            "options": [
              "8-10",
              "10-12",
              "12-14",
              "14-16"
            ],
            "help": "Fruits per kg"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra / A",
              "B",
              "C"
            ]
          },
          {
            "key": "skin_condition",
            "label": "Skin condition",
            "type": "select",
            "options": [
              "Soft (fresh, edible)",
              "Firm",
              "Hard (aged)"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Mandarin",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Satsuma",
              "Murcott",
              "Nadorcott",
              "Tango",
              "W. Murcott",
              "Ortanique",
              "Ponkan",
              "Kinnow"
            ],
            "required": true
          },
          {
            "key": "seedless",
            "label": "Seedless",
            "type": "boolean"
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "1XX",
              "1X",
              "1",
              "2",
              "3",
              "4",
              "5"
            ],
            "help": "Caliber count code"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "easy_peel",
            "label": "Easy-peel",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Passion fruit",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Purple (Edulis)",
              "Yellow (Flavicarpa)",
              "Golden / Panama",
              "Sweet granadilla"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen pulp",
              "Juice concentrate"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large"
            ],
            "help": "Or count per kg"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "skin_condition",
            "label": "Skin condition",
            "type": "select",
            "options": [
              "Smooth (fresh)",
              "Slightly wrinkled (ripe)"
            ]
          }
        ]
      },
      {
        "name": "Nectarine",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "text",
            "help": "e.g. Big Top, Nectaross, Honey Blaze"
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Yellow",
              "White"
            ],
            "required": true
          },
          {
            "key": "flesh_type",
            "label": "Flesh type",
            "type": "select",
            "options": [
              "Clingstone",
              "Freestone"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (caliber code)",
            "type": "select",
            "options": [
              "A",
              "AA",
              "AAA",
              "AAAA",
              "AAAAA"
            ],
            "help": "Diameter grade"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Papaya",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Maradol",
              "Formosa",
              "Solo / Sunrise",
              "Red Lady",
              "Tainung",
              "Golden"
            ],
            "required": true
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Red",
              "Orange",
              "Yellow"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "6",
              "8",
              "9",
              "10",
              "12",
              "15"
            ],
            "help": "Fruits per carton"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "ripeness_color",
            "label": "Ripeness (color)",
            "type": "select",
            "options": [
              "Color break (25%)",
              "Half ripe (50%)",
              "Ripe (75%)",
              "Full ripe (100%)"
            ]
          }
        ]
      },
      {
        "name": "Peach",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "text",
            "help": "e.g. Royal Glory, Sweet Dream, Flat/Donut"
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Yellow",
              "White"
            ],
            "required": true
          },
          {
            "key": "flesh_type",
            "label": "Flesh type",
            "type": "select",
            "options": [
              "Clingstone",
              "Freestone"
            ]
          },
          {
            "key": "shape",
            "label": "Shape",
            "type": "select",
            "options": [
              "Round",
              "Flat / Donut (Paraguayo)"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (caliber code)",
            "type": "select",
            "options": [
              "A",
              "AA",
              "AAA",
              "AAAA"
            ],
            "help": "Diameter grade"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Dragon fruit",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / type",
            "type": "select",
            "options": [
              "White flesh (Hylocereus undatus)",
              "Red/Pink flesh (H. costaricensis)",
              "Yellow skin (Selenicereus)"
            ],
            "required": true
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "White",
              "Red",
              "Pink",
              "Purple"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "6",
              "8",
              "9",
              "10",
              "12"
            ],
            "help": "Fruits per carton"
          },
          {
            "key": "fruit_weight_g",
            "label": "Fruit weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Pomelo",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Honey (Thongdi)",
              "Khao Nam Phueng",
              "Chandler",
              "Siam Ruby",
              "Tambun"
            ],
            "required": true
          },
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "White",
              "Pink",
              "Red"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "4",
              "5",
              "6",
              "8",
              "10"
            ],
            "help": "Fruits per carton"
          },
          {
            "key": "fruit_weight_kg",
            "label": "Fruit weight",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Sweetie",
        "fields": [
          {
            "key": "flesh_color",
            "label": "Flesh color",
            "type": "select",
            "options": [
              "Greenish-white",
              "White"
            ],
            "help": "Oroblanco pomelo x grapefruit"
          },
          {
            "key": "size_count",
            "label": "Size (count code)",
            "type": "select",
            "options": [
              "27",
              "32",
              "36",
              "40",
              "48"
            ],
            "help": "Count per carton"
          },
          {
            "key": "seedless",
            "label": "Seedless",
            "type": "boolean"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Feijoa",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Unique",
              "Apollo",
              "Triumph",
              "Mammoth",
              "Den's Choice"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large"
            ]
          },
          {
            "key": "fruit_weight_g",
            "label": "Fruit weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "maturity",
            "label": "Maturity",
            "type": "select",
            "options": [
              "Firm (unripe)",
              "Slightly soft (ripe)"
            ]
          }
        ]
      },
      {
        "name": "Persimmon",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Fuyu (non-astringent)",
              "Sharon / Triumph",
              "Hachiya (astringent)",
              "Rojo Brillante",
              "Jiro"
            ],
            "required": true
          },
          {
            "key": "astringency",
            "label": "Type",
            "type": "select",
            "options": [
              "Non-astringent (crisp)",
              "Astringent (soft-ripe)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried (hoshigaki)"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "12",
              "14",
              "16",
              "18",
              "20",
              "24"
            ],
            "help": "Fruits per carton"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Sweet cherry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Bing",
              "Lapins",
              "Sweetheart",
              "Regina",
              "Skeena",
              "Rainier",
              "Kordia",
              "Santina"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Dark red / Mahogany",
              "Red",
              "Yellow-blush (Rainier)"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Caliber (row size)",
            "type": "select",
            "options": [
              "20-22",
              "22-24",
              "24-26",
              "26-28",
              "28-30",
              "30+"
            ],
            "help": "Diameter in mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "help": "Premium >18"
          },
          {
            "key": "stem",
            "label": "Stem attached",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Cherimoya",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Fino de Jete",
              "Campa",
              "Bronceada",
              "Chaffey",
              "White"
            ],
            "required": true
          },
          {
            "key": "skin_type",
            "label": "Skin type",
            "type": "select",
            "options": [
              "Smooth (Impresa)",
              "Tuberculate (Umbonata)",
              "Mammillate"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "8",
              "10",
              "12",
              "15",
              "18"
            ],
            "help": "Fruits per carton"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "firmness",
            "label": "Firmness",
            "type": "select",
            "options": [
              "Firm (unripe)",
              "Giving (ripe)"
            ]
          }
        ]
      },
      {
        "name": "Rose apple",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / type",
            "type": "select",
            "options": [
              "Wax apple (green)",
              "Wax apple (red)",
              "Thai pink",
              "Black Diamond",
              "Water apple"
            ],
            "required": true
          },
          {
            "key": "skin_color",
            "label": "Skin color",
            "type": "select",
            "options": [
              "Red",
              "Pink",
              "Green",
              "White",
              "Dark purple"
            ]
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Apple",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Gala",
              "Fuji",
              "Golden Delicious",
              "Red Delicious",
              "Granny Smith",
              "Pink Lady / Cripps Pink",
              "Honeycrisp",
              "Braeburn",
              "Jonagold",
              "Envy"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size (count per box)",
            "type": "select",
            "options": [
              "64",
              "72",
              "80",
              "88",
              "100",
              "113",
              "125",
              "138",
              "150",
              "163",
              "175"
            ],
            "help": "Count per US carton / caliber"
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "color_pct",
            "label": "Color coverage",
            "type": "number",
            "unit": "%",
            "help": "Red-blush surface for bicolor varieties"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "storage",
            "label": "Storage method",
            "type": "select",
            "options": [
              "Fresh / new crop",
              "CA (controlled atmosphere)",
              "Regular cold store"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Berries",
    "emoji": "🫐",
    "slug": "berries",
    "subcategories": [
      {
        "name": "Barberry",
        "fields": [
          {
            "key": "species",
            "label": "Species / variety",
            "type": "select",
            "options": [
              "Berberis vulgaris (common)",
              "Berberis integerrima (seedless / zereshk)",
              "Berberis crataegina",
              "Other"
            ],
            "help": "Seedless zereshk commands a premium"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried"
            ],
            "required": true
          },
          {
            "key": "dried_grade",
            "label": "Dried grade (zereshk)",
            "type": "select",
            "options": [
              "Anari (bright red, premium)",
              "Puffy / Pofaki",
              "Standard"
            ],
            "help": "Anari is sun-shade dried, brightest red"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Bright red",
              "Dark red",
              "Black"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Dried target 10–14%"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Hawthorn",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Crataegus pinnatifida (Chinese / shan zha)",
              "Crataegus monogyna",
              "Crataegus laevigata",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried whole",
              "Dried slices",
              "Frozen (IQF)",
              "Powder",
              "Paste / leather"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Deseeded",
              "Cored slices",
              "Sugar-coated (haw flake)"
            ]
          },
          {
            "key": "size_mm",
            "label": "Fruit diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Lingonberry",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree",
              "Juice concentrate"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Wild-harvested",
              "Cultivated"
            ],
            "required": true,
            "help": "Most trade volume is wild-picked"
          },
          {
            "key": "size_mm",
            "label": "Berry diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "iqf_broken_pct",
            "label": "Broken / mushy berries",
            "type": "number",
            "unit": "%",
            "help": "IQF quality spec"
          },
          {
            "key": "added_sugar",
            "label": "Added sugar",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Elderberry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Sambucus nigra (European)",
              "Sambucus canadensis (American)",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried whole",
              "Juice concentrate",
              "Powder / extract"
            ],
            "required": true
          },
          {
            "key": "part",
            "label": "Product part",
            "type": "select",
            "options": [
              "Berry",
              "Flower"
            ],
            "help": "Flowers traded for cordial/tea"
          },
          {
            "key": "destemmed",
            "label": "De-stemmed",
            "type": "boolean",
            "help": "Stems contain toxic compounds"
          },
          {
            "key": "anthocyanin_mg",
            "label": "Anthocyanin content",
            "type": "number",
            "unit": "mg/100g",
            "help": "Key for nutraceutical buyers"
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Wild-harvested",
              "Cultivated"
            ]
          }
        ]
      },
      {
        "name": "Blueberry",
        "fields": [
          {
            "key": "type",
            "label": "Bush type",
            "type": "select",
            "options": [
              "Highbush",
              "Lowbush (wild)",
              "Rabbiteye",
              "Southern highbush"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Duke, Bluecrop, Draper, Legacy"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried"
            ],
            "required": true
          },
          {
            "key": "size_mm",
            "label": "Berry diameter",
            "type": "select",
            "options": [
              "Jumbo (>18mm)",
              "Large (15–18mm)",
              "Medium (12–15mm)",
              "Small (<12mm)"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "punnet_weight_g",
            "label": "Retail punnet weight",
            "type": "number",
            "unit": "g",
            "help": "e.g. 125, 250, 500"
          },
          {
            "key": "added_sugar",
            "label": "Added sugar (dried)",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Blackberry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Tupy, Loch Ness, Navaho, Chester"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree"
            ],
            "required": true
          },
          {
            "key": "thornless",
            "label": "Thornless cultivar",
            "type": "boolean"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "iqf_grade",
            "label": "IQF grade",
            "type": "select",
            "options": [
              "Whole A",
              "Whole B",
              "Broken / crumble",
              "Puree grade"
            ]
          },
          {
            "key": "punnet_weight_g",
            "label": "Retail punnet weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Honeysuckle berry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "Haskap/honeyberry, e.g. Aurora, Wojtek, Boreal Beauty"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree",
              "Juice"
            ],
            "required": true
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "size_mm",
            "label": "Berry length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Cultivated",
              "Wild-harvested"
            ]
          },
          {
            "key": "added_sugar",
            "label": "Added sugar",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Wild strawberry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Fragaria vesca (woodland)",
              "Fragaria viridis",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Preserve / jam"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Wild-harvested",
              "Cultivated (alpine)"
            ],
            "required": true
          },
          {
            "key": "size_mm",
            "label": "Berry length",
            "type": "number",
            "unit": "mm",
            "help": "Typically 8–15mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Serviceberry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Amelanchier alnifolia (Saskatoon)",
              "Amelanchier canadensis",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Smoky, Northline, Thiessen"
          },
          {
            "key": "size_mm",
            "label": "Berry diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Cultivated",
              "Wild-harvested"
            ]
          }
        ]
      },
      {
        "name": "Viburnum",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Viburnum opulus (guelder-rose / kalina)",
              "Viburnum lantana",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh (frost-picked)",
              "Frozen (IQF)",
              "Dried",
              "Juice",
              "Puree"
            ],
            "required": true
          },
          {
            "key": "frost_treated",
            "label": "Frost-treated",
            "type": "boolean",
            "help": "Frost reduces bitterness"
          },
          {
            "key": "destemmed",
            "label": "De-stemmed / de-seeded",
            "type": "boolean"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Cornelian cherry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "Cornus mas, e.g. Elegantny, Vydubetsky"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Paste / lavashak",
              "Juice / syrup"
            ],
            "required": true
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Bright red",
              "Dark red",
              "Yellow",
              "Pink"
            ]
          },
          {
            "key": "pitted",
            "label": "Pitted",
            "type": "boolean"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "size_mm",
            "label": "Fruit length",
            "type": "number",
            "unit": "mm"
          }
        ]
      },
      {
        "name": "Strawberry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Albion, Camarosa, San Andreas, Elsanta"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree",
              "Sliced frozen"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Extra (>35mm)",
              "Class I (25–35mm)",
              "Class II (18–25mm)",
              "Industrial"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "iqf_style",
            "label": "IQF style",
            "type": "select",
            "options": [
              "Whole calyx-off",
              "Whole calyx-on",
              "Halved",
              "Sliced",
              "Diced",
              "Crumble"
            ]
          },
          {
            "key": "punnet_weight_g",
            "label": "Retail punnet weight",
            "type": "number",
            "unit": "g",
            "help": "e.g. 250, 400, 500"
          }
        ]
      },
      {
        "name": "Cranberry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Stevens, Ben Lear, Pilgrim"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried (sweetened, SDC)",
              "Freeze-dried",
              "Juice concentrate",
              "Puree"
            ],
            "required": true
          },
          {
            "key": "dried_cut",
            "label": "Dried cut",
            "type": "select",
            "options": [
              "Whole",
              "Sliced",
              "Diced"
            ],
            "help": "For sweetened dried cranberries"
          },
          {
            "key": "infusion",
            "label": "Infusion sugar",
            "type": "select",
            "options": [
              "Sucrose",
              "Apple juice infused",
              "No added sugar"
            ],
            "help": "SDC processing"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "added_sugar",
            "label": "Added sugar",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Arctic raspberry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Rubus arcticus (arctic bramble)",
              "Rubus arcticus × stellatus (nectar raspberry)"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Freeze-dried",
              "Preserve",
              "Liqueur base"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Wild-harvested",
              "Cultivated"
            ],
            "required": true
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Whole premium",
              "Standard",
              "Broken / industrial"
            ]
          }
        ]
      },
      {
        "name": "Schisandra",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Schisandra chinensis (northern)",
              "Schisandra sphenanthera (southern)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Dried whole",
              "Fresh",
              "Frozen (IQF)",
              "Powder",
              "Extract"
            ],
            "required": true,
            "help": "Traded mainly dried (wu wei zi)"
          },
          {
            "key": "schisandrin_pct",
            "label": "Schisandrin content",
            "type": "number",
            "unit": "%",
            "help": "Key active for extract buyers"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          },
          {
            "key": "sulfur_free",
            "label": "Sulfur-free (unfumigated)",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Raspberry",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Willamette, Meeker, Heritage, Polka"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "select",
            "options": [
              "Red",
              "Black",
              "Golden / yellow",
              "Purple"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree",
              "Crumble / grade B"
            ],
            "required": true
          },
          {
            "key": "iqf_grade",
            "label": "IQF grade",
            "type": "select",
            "options": [
              "Whole A (Grade 1)",
              "Whole B (Grade 2)",
              "Broken",
              "Crumble",
              "Puree grade"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "punnet_weight_g",
            "label": "Retail punnet weight",
            "type": "number",
            "unit": "g",
            "help": "e.g. 125, 150, 250"
          }
        ]
      },
      {
        "name": "Juniper berry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Juniperus communis",
              "Juniperus oxycedrus",
              "Other"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Dried whole",
              "Fresh",
              "Crushed",
              "Powder",
              "Essential oil"
            ],
            "required": true
          },
          {
            "key": "essential_oil_pct",
            "label": "Essential oil content",
            "type": "number",
            "unit": "%",
            "help": "Key for gin distillers; typ. 1–2%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Food / distiller grade",
              "Standard",
              "Spice grade"
            ]
          }
        ]
      },
      {
        "name": "Cloudberry",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Freeze-dried",
              "Puree",
              "Preserve / jam"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Wild-harvested"
            ],
            "required": true,
            "help": "Almost entirely wild-picked"
          },
          {
            "key": "ripeness",
            "label": "Ripeness / color",
            "type": "select",
            "options": [
              "Amber (ripe)",
              "Red (under-ripe, firmer)"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Whole premium",
              "Standard",
              "Puree grade"
            ]
          }
        ]
      },
      {
        "name": "Sea buckthorn",
        "fields": [
          {
            "key": "species",
            "label": "Species / subspecies",
            "type": "select",
            "options": [
              "Hippophae rhamnoides ssp. mongolica",
              "Hippophae rhamnoides ssp. rhamnoides",
              "Hippophae rhamnoides ssp. sinensis",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Juice / puree",
              "Dried",
              "Seed oil",
              "Pulp oil"
            ],
            "required": true
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "For oil-extraction buyers"
          },
          {
            "key": "vitamin_c_mg",
            "label": "Vitamin C",
            "type": "number",
            "unit": "mg/100g"
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Cultivated",
              "Wild-harvested"
            ]
          }
        ]
      },
      {
        "name": "Rowan berry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Sorbus aucuparia (common rowan)",
              "Sorbus aucuparia var. edulis (Moravian, sweet)",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh (frost-picked)",
              "Frozen (IQF)",
              "Dried",
              "Juice",
              "Puree / jelly"
            ],
            "required": true
          },
          {
            "key": "frost_treated",
            "label": "Frost-treated",
            "type": "boolean",
            "help": "Reduces bitterness / parasorbic acid"
          },
          {
            "key": "sweet_cultivar",
            "label": "Sweet (edulis) cultivar",
            "type": "boolean"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Currant",
        "fields": [
          {
            "key": "color",
            "label": "Color / type",
            "type": "select",
            "options": [
              "Blackcurrant",
              "Redcurrant",
              "Whitecurrant",
              "Pinkcurrant"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Ben Lomond, Titania, Rovada, Jonkheer van Tets"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Juice concentrate",
              "Puree"
            ],
            "required": true
          },
          {
            "key": "on_strig",
            "label": "On strig / stalked",
            "type": "select",
            "options": [
              "On strig (bunched)",
              "De-strigged (single berries)"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "punnet_weight_g",
            "label": "Retail punnet weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Blackthorn",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh (frost-picked)",
              "Frozen (IQF)",
              "Dried",
              "Juice",
              "Puree"
            ],
            "required": true,
            "help": "Prunus spinosa / sloe"
          },
          {
            "key": "frost_treated",
            "label": "Frost-treated",
            "type": "boolean",
            "help": "Softens and sweetens sloes"
          },
          {
            "key": "size_mm",
            "label": "Fruit diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "pitted",
            "label": "Pitted",
            "type": "boolean"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Bilberry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Vaccinium myrtillus (European bilberry)",
              "Vaccinium uliginosum (bog bilberry)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree",
              "Extract"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Wild-harvested"
            ],
            "required": true,
            "help": "Bilberry is wild, unlike cultivated blueberry"
          },
          {
            "key": "anthocyanin_pct",
            "label": "Anthocyanin content",
            "type": "number",
            "unit": "%",
            "help": "Key for 25% / 36% extract standardization"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Bird cherry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Prunus padus (European)",
              "Padus avium",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Dried",
              "Frozen (IQF)",
              "Fresh",
              "Flour / powder",
              "Puree"
            ],
            "required": true,
            "help": "Traded mainly as dried fruit / flour"
          },
          {
            "key": "product_style",
            "label": "Product style",
            "type": "select",
            "options": [
              "Whole with stone",
              "Wholemeal flour (stone milled in)",
              "Pitted"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Mulberry",
        "fields": [
          {
            "key": "species",
            "label": "Species / color",
            "type": "select",
            "options": [
              "White (Morus alba)",
              "Black (Morus nigra)",
              "Red (Morus rubra)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Dried",
              "Freeze-dried",
              "Puree",
              "Molasses / pekmez"
            ],
            "required": true
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "size_mm",
            "label": "Fruit length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "added_sugar",
            "label": "Added sugar (dried)",
            "type": "boolean"
          },
          {
            "key": "origin_type",
            "label": "Cultivated vs wild",
            "type": "select",
            "options": [
              "Cultivated",
              "Wild-harvested"
            ]
          }
        ]
      },
      {
        "name": "Rosehip",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Rosa canina (dog rose)",
              "Rosa rugosa",
              "Rosa majalis",
              "Other"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Dried whole (with seed)",
              "Dried shells (deseeded)",
              "Cut / sifted",
              "Powder",
              "Puree",
              "Fresh"
            ],
            "required": true
          },
          {
            "key": "deseeded",
            "label": "Deseeded (shells)",
            "type": "boolean",
            "help": "Tea buyers want deseeded shells"
          },
          {
            "key": "cut_size",
            "label": "Cut size",
            "type": "select",
            "options": [
              "Whole",
              "Coarse cut (tea-bag cut, TBC)",
              "Fine cut",
              "Powder"
            ]
          },
          {
            "key": "vitamin_c_mg",
            "label": "Vitamin C",
            "type": "number",
            "unit": "mg/100g"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "wild_harvested",
            "label": "Wild-harvested",
            "type": "boolean"
          }
        ]
      }
    ]
  },
  {
    "name": "Herbs & greens",
    "emoji": "🥬",
    "slug": "herbs",
    "subcategories": [
      {
        "name": "Basil",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "select",
            "options": [
              "Genovese / Sweet",
              "Thai",
              "Lemon",
              "Purple / Dark Opal",
              "Holy (Tulsi)",
              "Greek / Bush",
              "Cinnamon"
            ],
            "help": "Aromatic type"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Whole leaf",
              "Bunched",
              "Rubbed / crushed",
              "Ground"
            ],
            "help": "For dried product"
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Gram bag",
              "Clamshell / punnet",
              "Live potted",
              "Bulk case"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%",
            "help": "Typically 8-12% for dried"
          }
        ]
      },
      {
        "name": "Oregano",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / type",
            "type": "select",
            "options": [
              "Mediterranean (Origanum vulgare)",
              "Greek",
              "Turkish",
              "Mexican (Lippia graveolens)"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole",
              "Rubbed",
              "Cut & sifted",
              "Ground / powder"
            ],
            "help": "Dried trade cut"
          },
          {
            "key": "leaf_content_pct",
            "label": "Leaf content",
            "type": "number",
            "unit": "%",
            "help": "Leaf vs stem for dried grade"
          },
          {
            "key": "volatile_oil_pct",
            "label": "Volatile oil content",
            "type": "number",
            "unit": "%",
            "help": "Carvacrol-driven aroma spec"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Fireweed tea",
        "fields": [
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Air-dried (green)",
              "Fermented (Ivan-chai)",
              "Fermented & roasted"
            ],
            "required": true,
            "help": "Ivan-chai = fermented"
          },
          {
            "key": "cut",
            "label": "Cut / leaf form",
            "type": "select",
            "options": [
              "Whole leaf",
              "Granulated",
              "Cut",
              "With flowers"
            ]
          },
          {
            "key": "fermentation_grade",
            "label": "Fermentation grade",
            "type": "select",
            "options": [
              "Light",
              "Medium",
              "Deep"
            ]
          },
          {
            "key": "part_used",
            "label": "Plant part",
            "type": "multiselect",
            "options": [
              "Leaf",
              "Flower",
              "Bud"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Cilantro",
        "fields": [
          {
            "key": "part_used",
            "label": "Plant part",
            "type": "select",
            "options": [
              "Leaf (cilantro)",
              "Leaf with root",
              "Root only"
            ],
            "required": true,
            "help": "Leaves; root prized in SE-Asian trade"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Bunched",
              "Whole leaf",
              "Chopped",
              "Freeze-dried"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Gram bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Coriander",
        "fields": [
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Whole seed",
              "Split seed",
              "Ground / powder"
            ],
            "required": true,
            "help": "Coriander = dried seed"
          },
          {
            "key": "seed_type",
            "label": "Seed type",
            "type": "select",
            "options": [
              "Indian (small, round)",
              "European (oval, large)",
              "Eagle / Canadian"
            ]
          },
          {
            "key": "purity_pct",
            "label": "Purity",
            "type": "number",
            "unit": "%",
            "help": "Cleanliness / sortex level"
          },
          {
            "key": "volatile_oil_pct",
            "label": "Volatile oil content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "admixture_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Garden cress",
        "fields": [
          {
            "key": "product_stage",
            "label": "Product stage",
            "type": "select",
            "options": [
              "Microgreen / cress",
              "Baby leaf",
              "Sprouting seed"
            ],
            "required": true
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Soil / substrate",
              "Hydroponic",
              "Living mat"
            ]
          },
          {
            "key": "cut",
            "label": "Harvest form",
            "type": "select",
            "options": [
              "Cut",
              "Living (rooted mat)",
              "Loose leaf"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Punnet / clamshell",
              "Living tray",
              "Gram bag",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Butterhead lettuce",
        "fields": [
          {
            "key": "cultivar",
            "label": "Cultivar type",
            "type": "select",
            "options": [
              "Boston",
              "Bibb",
              "Buttercrunch"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic (NFT/DWC)"
            ],
            "required": true
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head",
              "Living (rooted)",
              "Cored / trimmed",
              "Cut / processed"
            ]
          },
          {
            "key": "head_weight_g",
            "label": "Head weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "heads_per_case",
            "label": "Heads per case",
            "type": "number"
          }
        ]
      },
      {
        "name": "Beet greens",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Beet tops (leaf+stem)",
              "Baby beet leaf",
              "Chard-type leaf"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Bunched with stem",
              "Loose leaf",
              "Chopped"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Bag",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Green onion",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Scallion / spring onion",
              "Bunching onion (Welsh)",
              "Bulbing spring onion"
            ],
            "required": true
          },
          {
            "key": "trim",
            "label": "Trim / preparation",
            "type": "select",
            "options": [
              "Full (with roots)",
              "Topped & tailed",
              "Cut / chopped"
            ]
          },
          {
            "key": "stalk_diameter_mm",
            "label": "Stalk diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "bunch_size",
            "label": "Bunch size",
            "type": "number",
            "help": "Stems per bunch"
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Sleeve",
              "Gram bag",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Leek",
        "fields": [
          {
            "key": "type",
            "label": "Type / season",
            "type": "select",
            "options": [
              "Summer",
              "Autumn",
              "Winter / hardy",
              "Baby leek"
            ]
          },
          {
            "key": "trim",
            "label": "Trim grade",
            "type": "select",
            "options": [
              "Field-trimmed",
              "Ready-to-eat (topped/tailed)",
              "Washed & cut"
            ],
            "required": true
          },
          {
            "key": "shaft_length_cm",
            "label": "White shaft length",
            "type": "number",
            "unit": "cm",
            "help": "Blanched white portion"
          },
          {
            "key": "shaft_diameter_mm",
            "label": "Shaft diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Sleeve",
              "Loose / bulk",
              "Tray"
            ]
          }
        ]
      },
      {
        "name": "Lovage",
        "fields": [
          {
            "key": "part_used",
            "label": "Plant part",
            "type": "select",
            "options": [
              "Leaf",
              "Stem",
              "Root",
              "Seed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Whole leaf",
              "Bunched",
              "Cut & sifted",
              "Ground"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Marjoram",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Sweet marjoram",
              "Pot marjoram",
              "Wild"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole",
              "Rubbed",
              "Cut & sifted",
              "Ground"
            ]
          },
          {
            "key": "leaf_content_pct",
            "label": "Leaf content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "volatile_oil_pct",
            "label": "Volatile oil content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Chard",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / colour",
            "type": "select",
            "options": [
              "Green / Swiss (Fordhook)",
              "Rainbow",
              "Ruby / red",
              "Yellow / golden"
            ]
          },
          {
            "key": "stage",
            "label": "Leaf stage",
            "type": "select",
            "options": [
              "Baby leaf",
              "Mature bunched"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Bunched",
              "Loose leaf",
              "Washed & cut"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Lemon balm",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole leaf",
              "Bunched",
              "Cut & sifted",
              "Tea-cut",
              "Ground"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "intended_use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Culinary",
              "Herbal tea",
              "Extraction / oil"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Mint",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Peppermint",
              "Spearmint",
              "Moroccan",
              "Nana",
              "Apple / Bowles",
              "Chocolate"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole leaf",
              "Bunched",
              "Tea-cut",
              "Cut & sifted",
              "Ground"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "menthol_pct",
            "label": "Menthol / oil content",
            "type": "number",
            "unit": "%",
            "help": "Peppermint oil spec"
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Gram bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Fern",
        "fields": [
          {
            "key": "species",
            "label": "Species / type",
            "type": "select",
            "options": [
              "Fiddlehead (ostrich fern)",
              "Bracken (warabi)",
              "Royal fern (zenmai)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Salted / brined",
              "Dried",
              "Frozen"
            ]
          },
          {
            "key": "part_used",
            "label": "Part / stage",
            "type": "select",
            "options": [
              "Young frond (fiddlehead)",
              "Stem"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Blanched",
              "Par-boiled"
            ],
            "help": "Bracken needs par-boil to detoxify"
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bulk case",
              "Bag",
              "Brine pail"
            ]
          }
        ]
      },
      {
        "name": "Parsley",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Curled / moss",
              "Flat-leaf (Italian)",
              "Root / Hamburg"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Bunched",
              "Whole leaf",
              "Chopped",
              "Rubbed",
              "Cut & sifted"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Gram bag",
              "Clamshell",
              "Bulk case"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Rhubarb",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Forced (indoor)",
              "Field-grown / maincrop"
            ],
            "required": true,
            "help": "Forced = pink, tender"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh stalks",
              "Frozen (IQF)",
              "Diced"
            ]
          },
          {
            "key": "stalk_colour",
            "label": "Stalk colour",
            "type": "select",
            "options": [
              "Deep red",
              "Red-green",
              "Green"
            ]
          },
          {
            "key": "stalk_length_cm",
            "label": "Stalk length",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "trim",
            "label": "Trim",
            "type": "select",
            "options": [
              "Leaf removed (topped)",
              "Topped & tailed",
              "Washed & cut"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Loose / bulk",
              "Tray",
              "IQF bag"
            ]
          }
        ]
      },
      {
        "name": "Rosemary",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole sprig",
              "Whole leaf (needle)",
              "Rubbed",
              "Cut & sifted",
              "Ground"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "volatile_oil_pct",
            "label": "Volatile oil content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch / sprig",
              "Gram bag",
              "Clamshell",
              "Bulk case"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Arugula",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Salad rocket (Eruca)",
              "Wild rocket (Diplotaxis)"
            ],
            "required": true
          },
          {
            "key": "stage",
            "label": "Leaf stage",
            "type": "select",
            "options": [
              "Micro",
              "Baby leaf",
              "Mature / bunched"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "cut",
            "label": "Preparation",
            "type": "select",
            "options": [
              "Bunched",
              "Loose leaf",
              "Washed / RTE"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Iceberg lettuce",
        "fields": [
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head (film-wrapped)",
              "Cored",
              "Cut / shredded",
              "Leaf"
            ],
            "required": true
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "head_diameter_mm",
            "label": "Head diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "head_weight_g",
            "label": "Head weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "heads_per_case",
            "label": "Heads per case",
            "type": "number",
            "help": "Common counts 9/12/18"
          }
        ]
      },
      {
        "name": "Baby-mix salad",
        "fields": [
          {
            "key": "mix_type",
            "label": "Mix type",
            "type": "select",
            "options": [
              "Mesclun",
              "Spring mix",
              "Mild mix",
              "Spicy / bitter mix",
              "Asian mix"
            ],
            "required": true
          },
          {
            "key": "components",
            "label": "Components",
            "type": "multiselect",
            "options": [
              "Baby lettuce",
              "Arugula",
              "Spinach",
              "Chard",
              "Mizuna",
              "Tatsoi",
              "Radicchio",
              "Frisée",
              "Mustard",
              "Beet leaf"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Washed / RTE (triple-washed)",
              "Unwashed"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bag / pillow pack",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Oakleaf lettuce",
        "fields": [
          {
            "key": "colour",
            "label": "Colour",
            "type": "select",
            "options": [
              "Green",
              "Red / bronze",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "stage",
            "label": "Leaf stage",
            "type": "select",
            "options": [
              "Baby leaf",
              "Mature loose-head"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic (NFT/DWC)"
            ]
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head",
              "Living (rooted)",
              "Loose leaf",
              "Washed / RTE"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Head / sleeve",
              "Living tray",
              "Bag",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Lollo Rosso lettuce",
        "fields": [
          {
            "key": "colour",
            "label": "Colour type",
            "type": "select",
            "options": [
              "Lollo Rosso (red)",
              "Lollo Bionda (green)"
            ],
            "required": true
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head",
              "Living (rooted)",
              "Loose leaf",
              "Washed / RTE"
            ]
          },
          {
            "key": "head_weight_g",
            "label": "Head weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Head / sleeve",
              "Living tray",
              "Bag",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Radicchio",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Chioggia (round red)",
              "Treviso (elongated)",
              "Tardivo",
              "Castelfranco (variegated)"
            ],
            "required": true
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Forced / blanched"
            ]
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head",
              "Cored / trimmed",
              "Cut / leaf"
            ]
          },
          {
            "key": "head_weight_g",
            "label": "Head weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "heads_per_case",
            "label": "Heads per case",
            "type": "number"
          }
        ]
      },
      {
        "name": "Romaine lettuce",
        "fields": [
          {
            "key": "size_class",
            "label": "Size class",
            "type": "select",
            "options": [
              "Standard / Cos",
              "Baby / Little Gem",
              "Sweet Gem"
            ],
            "required": true
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head",
              "Hearts",
              "Cored",
              "Chopped / RTE"
            ]
          },
          {
            "key": "head_weight_g",
            "label": "Head weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "heads_per_case",
            "label": "Heads per case",
            "type": "number"
          }
        ]
      },
      {
        "name": "Tatsoi",
        "fields": [
          {
            "key": "stage",
            "label": "Leaf stage",
            "type": "select",
            "options": [
              "Micro",
              "Baby leaf",
              "Mature rosette"
            ],
            "required": true
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "cut",
            "label": "Preparation",
            "type": "select",
            "options": [
              "Whole rosette",
              "Loose leaf",
              "Washed / RTE"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Frisée lettuce",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Frisée (fine curled endive)",
              "Escarole (broad-leaf)"
            ],
            "required": true
          },
          {
            "key": "blanching",
            "label": "Blanching",
            "type": "select",
            "options": [
              "Blanched heart (pale)",
              "Unblanched (green)"
            ],
            "help": "Blanched = milder centre"
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head",
              "Trimmed heart",
              "Cut / RTE"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Head / sleeve",
              "Bag",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Celery",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Pascal / green stalk",
              "Golden / self-blanching",
              "Celeriac (root)",
              "Leaf / cutting celery"
            ],
            "required": true
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole head",
              "Hearts",
              "Sticks / batons",
              "Diced"
            ]
          },
          {
            "key": "stalk_length_cm",
            "label": "Stalk length",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "trim",
            "label": "Trim",
            "type": "select",
            "options": [
              "Field-trimmed",
              "Topped & tailed",
              "Washed / RTE"
            ]
          },
          {
            "key": "heads_per_case",
            "label": "Heads per case",
            "type": "number",
            "help": "Common counts 18/24/30"
          }
        ]
      },
      {
        "name": "Thyme",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Common / French",
              "Lemon",
              "Creeping",
              "Wild (Thymus serpyllum)"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole sprig",
              "Whole leaf",
              "Rubbed",
              "Cut & sifted",
              "Ground"
            ]
          },
          {
            "key": "leaf_content_pct",
            "label": "Leaf content",
            "type": "number",
            "unit": "%",
            "help": "Leaf vs stem for dried"
          },
          {
            "key": "volatile_oil_pct",
            "label": "Volatile oil content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Dill",
        "fields": [
          {
            "key": "part_used",
            "label": "Plant part",
            "type": "select",
            "options": [
              "Leaf / weed",
              "Flowering head (umbel)",
              "Seed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Bunched",
              "Whole leaf",
              "Chopped",
              "Cut & sifted"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Gram bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Salad chicory",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Witloof / Belgian endive",
              "Sugarloaf",
              "Red chicory",
              "Catalogna / puntarelle"
            ],
            "required": true
          },
          {
            "key": "forcing",
            "label": "Forcing / blanching",
            "type": "select",
            "options": [
              "Forced (blanched chicon)",
              "Field-grown"
            ],
            "help": "Witloof is forced in dark"
          },
          {
            "key": "colour",
            "label": "Colour",
            "type": "select",
            "options": [
              "White / pale yellow",
              "Red-tipped",
              "Green"
            ]
          },
          {
            "key": "presentation",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole chicon / head",
              "Trimmed",
              "Loose leaf"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Tray / punnet",
              "Sleeve",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Ramson",
        "fields": [
          {
            "key": "part_used",
            "label": "Plant part",
            "type": "select",
            "options": [
              "Leaf",
              "Bud / flower",
              "Bulb"
            ],
            "required": true,
            "help": "Wild garlic; leaf most traded"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Salted / brined"
            ]
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-harvested",
              "Cultivated"
            ]
          },
          {
            "key": "cut",
            "label": "Preparation",
            "type": "select",
            "options": [
              "Whole leaf",
              "Bunched",
              "Chopped"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Gram bag",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Sage",
        "fields": [
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Common / Dalmatian",
              "Broad-leaf",
              "Purple",
              "Pineapple",
              "Clary"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole leaf",
              "Rubbed",
              "Cut & sifted",
              "Ground"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "volatile_oil_pct",
            "label": "Volatile oil content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Chives",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Common chive",
              "Garlic / Chinese chive",
              "Flowering chive"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried / freeze-dried",
              "Frozen"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / preparation",
            "type": "select",
            "options": [
              "Whole / bunched",
              "Cut (chopped rings)"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Gram bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Spinach",
        "fields": [
          {
            "key": "leaf_type",
            "label": "Leaf type",
            "type": "select",
            "options": [
              "Savoy (crinkled)",
              "Semi-savoy",
              "Flat / smooth"
            ]
          },
          {
            "key": "stage",
            "label": "Leaf stage",
            "type": "select",
            "options": [
              "Baby leaf",
              "Teen",
              "Mature / bunched"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Blanched"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Washed / RTE (triple-washed)",
              "Unwashed / bunched"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Bag / pillow pack",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Sorrel",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Common / garden sorrel",
              "French / buckler-leaf",
              "Red-veined / blood sorrel"
            ],
            "required": true
          },
          {
            "key": "stage",
            "label": "Leaf stage",
            "type": "select",
            "options": [
              "Micro",
              "Baby leaf",
              "Mature / bunched"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse",
              "Hydroponic"
            ]
          },
          {
            "key": "retail_pack",
            "label": "Retail pack format",
            "type": "select",
            "options": [
              "Bunch",
              "Bag",
              "Clamshell",
              "Bulk case"
            ]
          }
        ]
      },
      {
        "name": "Tarragon",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "French",
              "Russian",
              "Mexican"
            ],
            "required": true,
            "help": "French is the culinary premium"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / grade",
            "type": "select",
            "options": [
              "Whole sprig",
              "Whole leaf",
              "Rubbed",
              "Cut & sifted"
            ]
          },
          {
            "key": "growing_method",
            "label": "Growing method",
            "type": "select",
            "options": [
              "Field",
              "Greenhouse"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      }
    ]
  },
  {
    "name": "Mushrooms",
    "emoji": "🍄",
    "slug": "mushrooms",
    "subcategories": [
      {
        "name": "Porcini",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Boletus edulis",
              "Boletus pinophilus",
              "Boletus aereus",
              "Boletus reticulatus",
              "Mixed"
            ],
            "help": "Porcini complex; B. edulis is the trade standard"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Sliced dried",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged",
              "Cultivated"
            ],
            "help": "Porcini is almost always wild-foraged"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra / A",
              "A",
              "B",
              "C",
              "Commercial"
            ],
            "help": "A = pale flesh, no worm holes, closed pores"
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced",
              "Diced",
              "Broken pieces"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%",
            "help": "Typically 10-12% for dried"
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Stinkhorn",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Phallus impudicus",
              "Phallus indusiatus (bamboo fungus)",
              "Dictyophora"
            ],
            "help": "Egg stage edible; indusiatus dried is a delicacy"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh egg stage",
              "Dried",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged",
              "Cultivated"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Culinary",
              "Medicinal / TCM"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Oyster mushroom",
        "fields": [
          {
            "key": "species",
            "label": "Species / colour",
            "type": "select",
            "options": [
              "Pearl (Pleurotus ostreatus)",
              "King oyster (P. eryngii)",
              "Pink (P. djamor)",
              "Yellow/Golden (P. citrinopileatus)",
              "Blue",
              "Phoenix (P. pulmonarius)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Sliced dried",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Cultivated",
              "Wild-foraged"
            ],
            "help": "Oyster is predominantly cultivated"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Grade A",
              "Grade B",
              "Industrial"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap diameter",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "cluster_form",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole cluster",
              "Single caps",
              "Trimmed"
            ]
          }
        ]
      },
      {
        "name": "Woolly milkcap",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Lactarius torminosus / L. pubescens"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Salted / brined",
              "Pickled",
              "Dried",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ],
            "help": "Wild only; requires soaking/salting before use"
          },
          {
            "key": "processing",
            "label": "Processing / prep",
            "type": "select",
            "options": [
              "Raw (must be pre-soaked)",
              "Blanched",
              "Salt-cured",
              "Marinated"
            ],
            "help": "Needs pre-treatment to remove acrid latex"
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Parasol mushroom",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Macrolepiota procera"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged",
              "Cultivated"
            ]
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole caps",
              "Caps (stem removed)",
              "Sliced"
            ],
            "help": "Stems are fibrous; caps are the traded part"
          },
          {
            "key": "cap_size",
            "label": "Cap diameter",
            "type": "number",
            "unit": "cm",
            "help": "Mature caps 10-30 cm"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Milk mushroom",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Lactarius resimus (true milk-cap)",
              "Lactarius pubescens",
              "Lactarius scrobiculatus",
              "Mixed"
            ],
            "help": "Gruzd; prized for salting in Slavic cuisine"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Salted / brined",
              "Pickled",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw (pre-soak required)",
              "Cold-salted",
              "Hot-salted",
              "Marinated"
            ],
            "help": "Bitter latex must be leached before salting"
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Lurid bolete",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Suillellus luridus"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Sliced dried"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw (must be thoroughly cooked)",
              "Par-boiled",
              "Dried"
            ],
            "help": "Toxic raw; requires full cooking"
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Hedgehog mushroom",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Hydnum repandum",
              "Hydnum rufescens"
            ],
            "help": "Pied de mouton; spines instead of gills"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra",
              "Grade 1",
              "Grade 2"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap diameter",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          }
        ]
      },
      {
        "name": "Chanterelle",
        "fields": [
          {
            "key": "species",
            "label": "Species / colour",
            "type": "select",
            "options": [
              "Golden (Cantharellus cibarius)",
              "Yellowfoot (Craterellus tubaeformis)",
              "Black trumpet (Craterellus cornucopioides)",
              "White (Cantharellus subalbidus)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Salted / brined",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "grade",
            "label": "Grade / size",
            "type": "select",
            "options": [
              "Extra (small, uniform)",
              "Grade 1",
              "Grade 2",
              "Broken / pieces"
            ],
            "help": "Smaller uniform caps command premium"
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Slippery jack",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Suillus luteus"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Pickled / marinated"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "cap_peeled",
            "label": "Cap cuticle peeled",
            "type": "boolean",
            "help": "Slimy pellicle usually removed before sale/cooking"
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Bay bolete",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Imleria badia (Boletus badius)"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Sliced dried"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra / A",
              "A",
              "B",
              "C"
            ],
            "help": "A = firm, worm-free, closed pores"
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced",
              "Diced"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Honey fungus",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Armillaria mellea complex"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen",
              "Pickled / marinated",
              "Salted",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged",
              "Cultivated"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw (must be cooked)",
              "Par-boiled",
              "Marinated"
            ],
            "help": "Mildly toxic raw; par-boil discard water"
          },
          {
            "key": "cut",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole (young caps)",
              "Caps only",
              "Mixed size"
            ],
            "help": "Young button caps preferred for pickling"
          }
        ]
      },
      {
        "name": "Birch bolete",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Leccinum scabrum",
              "Leccinum versipelle",
              "Mixed"
            ],
            "help": "Podberyozovik"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Sliced dried"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra / A",
              "A",
              "B",
              "C"
            ]
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Aspen bolete",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Leccinum aurantiacum",
              "Leccinum versipelle",
              "Leccinum albostipitatum",
              "Mixed"
            ],
            "help": "Podosinovik; orange-cap boletes"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Sliced dried"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra / A",
              "A",
              "B",
              "C"
            ]
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Half-cep bolete",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Hemileccinum impolitum (Boletus impolitus)"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Sliced dried"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra / A",
              "A",
              "B",
              "C"
            ]
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Reishi",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Ganoderma lucidum",
              "Ganoderma sinense",
              "Ganoderma tsugae"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole dried fruiting body",
              "Sliced dried",
              "Powder",
              "Extract powder",
              "Dual extract"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Cultivated (log-grown)",
              "Cultivated (substrate)",
              "Wild-foraged"
            ]
          },
          {
            "key": "medicinal_grade",
            "label": "Medicinal grade",
            "type": "select",
            "options": [
              "Pharmaceutical",
              "Nutraceutical / food grade",
              "Standard"
            ],
            "help": "Grade drives price for medicinal mushrooms"
          },
          {
            "key": "polysaccharide_pct",
            "label": "Polysaccharides",
            "type": "number",
            "unit": "%",
            "help": "Key active-compound spec for extracts"
          },
          {
            "key": "triterpene_pct",
            "label": "Triterpenes",
            "type": "number",
            "unit": "%",
            "help": "Bitter active compounds; higher = potent"
          },
          {
            "key": "extract_ratio",
            "label": "Extract ratio",
            "type": "text",
            "help": "e.g. 10:1, 20:1 for extract powders"
          }
        ]
      },
      {
        "name": "Saffron milk cap",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Lactarius deliciosus",
              "Lactarius deterrimus",
              "Lactarius sanguifluus"
            ],
            "help": "Ryzhik / Niscalo; orange latex"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Salted / brined",
              "Pickled / marinated",
              "Frozen",
              "Canned"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Cold-salted",
              "Hot-salted",
              "Marinated",
              "Grilled-ready"
            ],
            "help": "Unlike other milkcaps, edible without pre-soaking"
          },
          {
            "key": "cut",
            "label": "Presentation",
            "type": "select",
            "options": [
              "Whole (young caps)",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Morel",
        "fields": [
          {
            "key": "species",
            "label": "Species / colour",
            "type": "select",
            "options": [
              "Yellow (Morchella esculenta)",
              "Black (Morchella elata/importuna)",
              "Half-free (M. semilibera)",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged",
              "Cultivated"
            ]
          },
          {
            "key": "grade",
            "label": "Grade / size",
            "type": "select",
            "options": [
              "Super (large, uniform)",
              "Grade A",
              "Grade B",
              "Cut / pieces",
              "Legs"
            ],
            "help": "Whole large caps are premium"
          },
          {
            "key": "cap_length",
            "label": "Cap length",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%",
            "help": "Dried morels typically 8-12%"
          },
          {
            "key": "cleaning",
            "label": "Cleaning",
            "type": "select",
            "options": [
              "Field-run",
              "Cleaned / de-sanded",
              "Sponge-clean"
            ]
          }
        ]
      },
      {
        "name": "Russula",
        "fields": [
          {
            "key": "species",
            "label": "Species / colour",
            "type": "select",
            "options": [
              "Russula vesca",
              "Russula cyanoxantha",
              "Russula virescens",
              "Russula aurea",
              "Mixed"
            ],
            "help": "Syroezhka; many edible colour forms"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Salted / brined",
              "Frozen",
              "Dried"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole",
              "Caps only",
              "Sliced"
            ]
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Bracket fungus",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Turkey tail (Trametes versicolor)",
              "Chicken of the woods (Laetiporus)",
              "Maitake / hen of the woods (Grifola frondosa)",
              "Artist's conk (Ganoderma applanatum)",
              "Birch polypore (Fomitopsis betulina)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Sliced dried",
              "Powder",
              "Extract powder"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged",
              "Cultivated"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Culinary",
              "Medicinal / extract",
              "Tea"
            ]
          },
          {
            "key": "polysaccharide_pct",
            "label": "Polysaccharides / beta-glucan",
            "type": "number",
            "unit": "%",
            "help": "Key spec for medicinal brackets"
          },
          {
            "key": "extract_ratio",
            "label": "Extract ratio",
            "type": "text",
            "help": "e.g. 10:1 for extract powders"
          }
        ]
      },
      {
        "name": "Truffle",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "White Alba (Tuber magnatum)",
              "Black Perigord (Tuber melanosporum)",
              "Burgundy (Tuber uncinatum)",
              "Summer (Tuber aestivum)",
              "Bianchetto (Tuber borchii)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh whole",
              "Frozen",
              "Preserved / brined",
              "Truffle oil",
              "Truffle paste",
              "Slices / carpaccio",
              "Powder"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged",
              "Cultivated (truffiere)"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Extra (A)",
              "First (B)",
              "Second (C)",
              "Pieces / brisures"
            ],
            "help": "Grade by shape, firmness, aroma"
          },
          {
            "key": "size_weight",
            "label": "Individual size",
            "type": "number",
            "unit": "g",
            "help": "Larger single truffles command premium/g"
          },
          {
            "key": "maturity",
            "label": "Maturity / ripeness",
            "type": "select",
            "options": [
              "Immature",
              "Ripe",
              "Fully mature"
            ]
          }
        ]
      },
      {
        "name": "Caesar's mushroom",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Amanita caesarea; Ovolo"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh (egg stage)",
              "Fresh (open cap)",
              "Dried",
              "Preserved in oil"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "maturity",
            "label": "Maturity stage",
            "type": "select",
            "options": [
              "Closed egg (ovolo)",
              "Half-open",
              "Fully open cap"
            ],
            "help": "Closed 'egg' stage is most prized"
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Chaga",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "help": "Inonotus obliquus; birch conk"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole chunks",
              "Crushed / granules",
              "Powder",
              "Extract powder",
              "Dual extract",
              "Tea bags"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged (birch)"
            ],
            "help": "Chaga is wild-harvested from living birch"
          },
          {
            "key": "medicinal_grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Premium (sclerotium core)",
              "Standard",
              "Mixed with bark"
            ],
            "help": "Dark inner mass is highest grade"
          },
          {
            "key": "polysaccharide_pct",
            "label": "Polysaccharides",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "beta_glucan_pct",
            "label": "Beta-glucan",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "extract_ratio",
            "label": "Extract ratio",
            "type": "text",
            "help": "e.g. 10:1, 20:1"
          }
        ]
      },
      {
        "name": "Champignon",
        "fields": [
          {
            "key": "species",
            "label": "Species / type",
            "type": "select",
            "options": [
              "White button (Agaricus bisporus)",
              "Cremini / brown",
              "Portobello (mature)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Sliced fresh",
              "Canned",
              "Frozen",
              "Dried",
              "Marinated"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Cultivated"
            ],
            "help": "Commercially cultivated year-round"
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Button (extra small)",
              "Small",
              "Medium",
              "Large",
              "Jumbo / Portobello"
            ],
            "help": "By cap diameter"
          },
          {
            "key": "cap_size",
            "label": "Cap diameter",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "colour",
            "label": "Colour class",
            "type": "select",
            "options": [
              "Snow white",
              "Off-white",
              "Brown"
            ]
          }
        ]
      },
      {
        "name": "Verpa",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Verpa bohemica",
              "Verpa conica"
            ],
            "help": "Early morel / thimble morel"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Wild-foraged"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw (must be thoroughly cooked)",
              "Par-boiled",
              "Dried"
            ],
            "help": "Requires cooking; can be toxic raw / in quantity"
          },
          {
            "key": "cap_size",
            "label": "Cap size",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Shiitake",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh",
              "Dried whole",
              "Dried sliced",
              "Powder",
              "Frozen"
            ],
            "required": true
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Donko (thick, curled cap)",
              "Koshin (thin, flat)",
              "Tea flower / Hua Gu",
              "Standard",
              "Broken / pieces"
            ],
            "help": "Donko / flower-cap grades are premium"
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Cultivated (log-grown)",
              "Cultivated (sawdust block)",
              "Wild-foraged"
            ],
            "help": "Log-grown commands higher price"
          },
          {
            "key": "cap_size",
            "label": "Cap diameter",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture (dried)",
            "type": "number",
            "unit": "%",
            "help": "Dried typically 11-13%"
          },
          {
            "key": "stem_included",
            "label": "Stems included",
            "type": "boolean",
            "help": "Caps-only vs whole with stem"
          }
        ]
      }
    ]
  },
  {
    "name": "Grain",
    "emoji": "🌾",
    "slug": "grain",
    "subcategories": [
      {
        "name": "Broad beans",
        "fields": [
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Human consumption (food)",
              "Feed",
              "Seed"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Vicia faba major, minor, equina"
          },
          {
            "key": "seed_size",
            "label": "Seed size",
            "type": "select",
            "options": [
              "Small (equina)",
              "Medium (minor)",
              "Large (major)"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14%"
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "crop_year",
            "label": "Crop year",
            "type": "text",
            "help": "e.g. 2025"
          }
        ]
      },
      {
        "name": "Peas",
        "fields": [
          {
            "key": "type",
            "label": "Pea type",
            "type": "select",
            "options": [
              "Yellow",
              "Green",
              "Marrowfat",
              "Maple",
              "Dun",
              "Austrian winter (feed)"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole",
              "Split",
              "Splits (football)"
            ]
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Human consumption (food)",
              "Feed",
              "Seed",
              "Fractionation (protein/starch)"
            ]
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%",
            "help": "Typically 20-26%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "bleaching_pct",
            "label": "Bleached / bleaching",
            "type": "number",
            "unit": "%",
            "help": "Weathering discolouration for green peas"
          }
        ]
      },
      {
        "name": "Buckwheat",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Unhulled (with husk)",
              "Hulled groats (kernel)",
              "Roasted (kasha)",
              "Green (raw hulled)"
            ],
            "required": true
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Whole groats",
              "Cut / broken groats",
              "Farinetta / flour grade"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14.5%"
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight",
            "type": "number",
            "unit": "kg/hl"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "broken_pct",
            "label": "Broken kernels",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "crop_year",
            "label": "Crop year",
            "type": "text"
          }
        ]
      },
      {
        "name": "Oilcake",
        "fields": [
          {
            "key": "source",
            "label": "Oilseed source",
            "type": "select",
            "options": [
              "Soybean",
              "Sunflower",
              "Rapeseed / canola",
              "Cottonseed",
              "Groundnut / peanut",
              "Palm kernel",
              "Sesame",
              "Linseed / flax",
              "Copra",
              "Mustard"
            ],
            "required": true
          },
          {
            "key": "extraction",
            "label": "Extraction method",
            "type": "select",
            "options": [
              "Expeller / cold-pressed (cake)",
              "Solvent-extracted (meal)"
            ],
            "help": "Expeller retains more residual oil"
          },
          {
            "key": "protein_pct",
            "label": "Crude protein (dry basis)",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "residual_oil_pct",
            "label": "Residual oil / fat",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "fiber_pct",
            "label": "Crude fibre",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Cake / lumps",
              "Pellets",
              "Meal / ground",
              "Flakes"
            ]
          }
        ]
      },
      {
        "name": "Castor bean",
        "fields": [
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Whole seed",
              "Deoiled cake / meal",
              "Castor oil grade seed"
            ],
            "required": true
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "Seed typically 45-50%"
          },
          {
            "key": "purity_pct",
            "label": "Purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "detoxified",
            "label": "Detoxified (ricin removed)",
            "type": "boolean",
            "help": "Relevant for meal used as fertilizer/feed"
          }
        ]
      },
      {
        "name": "Corn",
        "fields": [
          {
            "key": "type",
            "label": "Corn type",
            "type": "select",
            "options": [
              "Yellow dent (No.2)",
              "White",
              "Flint",
              "Waxy",
              "Popcorn",
              "Sweet corn",
              "Food grade / non-GMO"
            ],
            "required": true
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Feed",
              "Human consumption (food)",
              "Milling",
              "Starch / wet-milling",
              "Ethanol",
              "Seed"
            ],
            "required": true
          },
          {
            "key": "gmo_status",
            "label": "GMO status",
            "type": "select",
            "options": [
              "GMO",
              "Non-GMO",
              "IP Non-GMO certified"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14-15%"
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight",
            "type": "number",
            "unit": "kg/hl",
            "help": "US No.2 ~ 71.4 kg/hl (56 lb/bu)"
          },
          {
            "key": "broken_foreign_pct",
            "label": "Broken corn & foreign material (BCFM)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "aflatoxin_ppb",
            "label": "Aflatoxin",
            "type": "number",
            "unit": "ppb",
            "help": "e.g. max 20 ppb feed / 4 ppb food EU"
          }
        ]
      },
      {
        "name": "Sesame",
        "fields": [
          {
            "key": "color",
            "label": "Seed colour",
            "type": "select",
            "options": [
              "White",
              "Natural / tan",
              "Brown",
              "Red",
              "Black",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Natural (unhulled)",
              "Hulled",
              "Sortex-cleaned",
              "Roasted"
            ]
          },
          {
            "key": "purity_pct",
            "label": "Purity",
            "type": "number",
            "unit": "%",
            "help": "e.g. 99.95% sortex"
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "Typically 48-55%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 6-8%"
          },
          {
            "key": "ffa_pct",
            "label": "Free fatty acids (FFA)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "admixture_pct",
            "label": "Admixture / foreign matter",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Lupine",
        "fields": [
          {
            "key": "species",
            "label": "Species / type",
            "type": "select",
            "options": [
              "White (Lupinus albus)",
              "Blue / narrow-leafed (L. angustifolius)",
              "Yellow (L. luteus)",
              "Andean (L. mutabilis)"
            ],
            "required": true
          },
          {
            "key": "alkaloid",
            "label": "Alkaloid type",
            "type": "select",
            "options": [
              "Sweet (low alkaloid)",
              "Bitter (high alkaloid)"
            ],
            "help": "Sweet for feed/food; bitter needs debittering"
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Feed",
              "Human consumption (food)",
              "Seed"
            ]
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%",
            "help": "Typically 30-40%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Flax",
        "fields": [
          {
            "key": "color",
            "label": "Seed colour",
            "type": "select",
            "options": [
              "Brown",
              "Golden / yellow"
            ],
            "required": true
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Human consumption (food)",
              "Feed",
              "Oil / linseed crushing",
              "Industrial (paint/linoleum)",
              "Seed"
            ]
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "Typically 38-45%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 8-9%"
          },
          {
            "key": "purity_pct",
            "label": "Purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "ffa_pct",
            "label": "Free fatty acids (FFA)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "admixture_pct",
            "label": "Admixture / foreign matter",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Flour",
        "fields": [
          {
            "key": "flour_type",
            "label": "Flour type / grain base",
            "type": "select",
            "options": [
              "Wheat (all-purpose)",
              "Wheat (bread / strong)",
              "Wheat (cake / soft)",
              "Durum / semolina",
              "Whole wheat / wholemeal",
              "Corn / maize",
              "Rice",
              "Rye",
              "Chickpea (besan)",
              "Buckwheat",
              "Soy"
            ],
            "required": true
          },
          {
            "key": "protein_pct",
            "label": "Protein content",
            "type": "number",
            "unit": "%",
            "help": "Bread ~12-14%, cake ~8-9%"
          },
          {
            "key": "ash_content_pct",
            "label": "Ash content",
            "type": "number",
            "unit": "%",
            "help": "Grade indicator e.g. T45/T55/T65"
          },
          {
            "key": "extraction_rate_pct",
            "label": "Extraction rate",
            "type": "number",
            "unit": "%",
            "help": "White ~72-76%, wholemeal 100%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14-15%"
          },
          {
            "key": "grade_code",
            "label": "Milling grade code",
            "type": "text",
            "help": "e.g. T55, Type 550, patent, first clear"
          },
          {
            "key": "falling_number_s",
            "label": "Falling number",
            "type": "number",
            "unit": "s",
            "help": "Enzyme activity; typically 250-350s"
          }
        ]
      },
      {
        "name": "Chickpea",
        "fields": [
          {
            "key": "type",
            "label": "Chickpea type",
            "type": "select",
            "options": [
              "Kabuli (large white)",
              "Desi (small brown)",
              "Green chickpea"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole",
              "Split (chana dal)",
              "Polished"
            ]
          },
          {
            "key": "caliber_count",
            "label": "Calibre / count per oz (Kabuli)",
            "type": "select",
            "options": [
              "6-7 mm",
              "7-8 mm",
              "8-9 mm",
              "9-10 mm",
              "10-11 mm",
              "11-12 mm",
              "12 mm+"
            ],
            "help": "Larger = premium; often quoted as count/oz"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "damaged_pct",
            "label": "Damaged / defective seeds",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Oats",
        "fields": [
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Whole oats (in-husk)",
              "Groats (dehulled)",
              "Rolled / flakes",
              "Steel-cut",
              "Oat flour",
              "Naked / hulless oats"
            ],
            "required": true
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Milling / food",
              "Feed",
              "Seed",
              "Racehorse / equine"
            ]
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight",
            "type": "number",
            "unit": "kg/hl",
            "help": "Milling oats typically 50+ kg/hl"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14%"
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "beta_glucan_pct",
            "label": "Beta-glucan",
            "type": "number",
            "unit": "%",
            "help": "Soluble fibre; food-grade premium"
          },
          {
            "key": "screenings_pct",
            "label": "Screenings / thin oats",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Sunflower",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Oil-type seed (black)",
              "Confectionery / striped seed",
              "Hulled kernels",
              "Bird / feed seed"
            ],
            "required": true
          },
          {
            "key": "oleic_type",
            "label": "Oil profile",
            "type": "select",
            "options": [
              "Linoleic (standard)",
              "High-oleic (HO)",
              "Mid-oleic"
            ],
            "help": "Relevant for oil-type seed"
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "Oil-type typically 42-50%"
          },
          {
            "key": "caliber",
            "label": "Calibre / size (confectionery)",
            "type": "select",
            "options": [
              "18/64\"",
              "20/64\"",
              "22/64\"",
              "24/64\"+"
            ],
            "help": "Screen size for confectionery seed"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 9%"
          },
          {
            "key": "admixture_pct",
            "label": "Admixture / foreign matter",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "ffa_pct",
            "label": "Free fatty acids (FFA)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Millet",
        "fields": [
          {
            "key": "type",
            "label": "Millet type",
            "type": "select",
            "options": [
              "Pearl (bajra)",
              "Foxtail",
              "Proso / white",
              "Finger (ragi)",
              "Little",
              "Kodo",
              "Barnyard",
              "Sorghum-related"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Unhulled / paddy",
              "Hulled",
              "Polished",
              "Flour"
            ]
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Human consumption (food)",
              "Feed / birdseed",
              "Seed"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 12-14%"
          },
          {
            "key": "purity_pct",
            "label": "Purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / admixture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Wheat",
        "fields": [
          {
            "key": "class",
            "label": "Wheat class",
            "type": "select",
            "options": [
              "Hard Red Winter (HRW)",
              "Hard Red Spring (HRS)",
              "Soft Red Winter (SRW)",
              "Hard White",
              "Soft White",
              "Durum",
              "Milling wheat",
              "Feed wheat"
            ],
            "required": true
          },
          {
            "key": "protein_pct",
            "label": "Protein (12% mb)",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "Milling typ. 11-14%; durum 12-14%"
          },
          {
            "key": "gluten_pct",
            "label": "Wet gluten",
            "type": "number",
            "unit": "%",
            "help": "Milling typically 23-30%"
          },
          {
            "key": "falling_number_s",
            "label": "Falling number",
            "type": "number",
            "unit": "s",
            "help": "Sprout damage; milling min ~250-300s"
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight / hectolitre",
            "type": "number",
            "unit": "kg/hl",
            "help": "Milling typically 76-82 kg/hl"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 13.5-14.5%"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / impurities",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Rapeseed",
        "fields": [
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "options": [
              "Canola (double-low 00)",
              "Industrial (HEAR high-erucic)",
              "Winter",
              "Spring"
            ],
            "required": true
          },
          {
            "key": "gmo_status",
            "label": "GMO status",
            "type": "select",
            "options": [
              "GMO",
              "Non-GMO"
            ]
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "Typically 40-45%"
          },
          {
            "key": "erucic_acid_pct",
            "label": "Erucic acid",
            "type": "number",
            "unit": "%",
            "help": "Canola < 2%; HEAR > 45%"
          },
          {
            "key": "glucosinolate_umol",
            "label": "Glucosinolate content",
            "type": "number",
            "unit": "µmol/g",
            "help": "Double-low < 25 µmol/g"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 8-9%"
          },
          {
            "key": "admixture_pct",
            "label": "Admixture / foreign matter",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Rice",
        "fields": [
          {
            "key": "type",
            "label": "Rice type",
            "type": "select",
            "options": [
              "Basmati",
              "Jasmine",
              "Parboiled",
              "White",
              "Brown",
              "Red",
              "Black",
              "Glutinous / sticky",
              "Arborio"
            ],
            "required": true
          },
          {
            "key": "grain_length",
            "label": "Grain length",
            "type": "select",
            "options": [
              "Long grain",
              "Medium grain",
              "Short grain",
              "Extra-long grain"
            ],
            "help": "Long > 6.6mm, medium 5.5-6.6mm, short < 5.5mm"
          },
          {
            "key": "broken_pct",
            "label": "Broken grains",
            "type": "select",
            "unit": "%",
            "options": [
              "5%",
              "10%",
              "15%",
              "25%",
              "100% (broken/brewers)"
            ],
            "required": true,
            "help": "Standard export brokens grade"
          },
          {
            "key": "processing",
            "label": "Milling / processing",
            "type": "select",
            "options": [
              "Paddy / rough",
              "Brown / cargo",
              "Milled white",
              "Parboiled",
              "Sella (parboiled basmati)",
              "Steamed"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14%"
          },
          {
            "key": "purity_pct",
            "label": "Purity / sortexed",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "avg_grain_length_mm",
            "label": "Average milled grain length",
            "type": "number",
            "unit": "mm",
            "help": "Basmati typ. 7.0-8.4mm milled"
          }
        ]
      },
      {
        "name": "Rye",
        "fields": [
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Milling / food",
              "Feed",
              "Distilling",
              "Seed",
              "Cover crop"
            ],
            "required": true
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight",
            "type": "number",
            "unit": "kg/hl",
            "help": "Milling typically 70+ kg/hl"
          },
          {
            "key": "falling_number_s",
            "label": "Falling number",
            "type": "number",
            "unit": "s",
            "help": "Milling rye min ~120-200s"
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14.5%"
          },
          {
            "key": "ergot_pct",
            "label": "Ergot content",
            "type": "number",
            "unit": "%",
            "help": "EU limit low; food-safety critical for rye"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / impurities",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Sorghum",
        "fields": [
          {
            "key": "type",
            "label": "Sorghum type / colour",
            "type": "select",
            "options": [
              "White / food grade",
              "Red",
              "Bronze / mixed",
              "Bird-resistant (tannin)",
              "Sweet sorghum",
              "Broomcorn"
            ],
            "required": true
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Feed",
              "Human consumption (food)",
              "Milling / flour",
              "Brewing / distilling",
              "Seed"
            ],
            "required": true
          },
          {
            "key": "tannin",
            "label": "Tannin",
            "type": "select",
            "options": [
              "Tannin-free (white/food)",
              "Low tannin",
              "High tannin (bird-resistant)"
            ]
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight",
            "type": "number",
            "unit": "kg/hl",
            "help": "US No.2 ~ 72 kg/hl (57 lb/bu)"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 13.5-14%"
          },
          {
            "key": "broken_foreign_pct",
            "label": "Broken kernels & foreign material (BNFM)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "gmo_status",
            "label": "GMO status",
            "type": "select",
            "options": [
              "GMO",
              "Non-GMO"
            ]
          }
        ]
      },
      {
        "name": "Soybean",
        "fields": [
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Crushing / oil",
              "Feed",
              "Human consumption (food grade)",
              "Soymilk / tofu",
              "Seed",
              "Natto (small)"
            ],
            "required": true
          },
          {
            "key": "gmo_status",
            "label": "GMO status",
            "type": "select",
            "options": [
              "GMO",
              "Non-GMO",
              "IP Non-GMO certified"
            ],
            "required": true
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%",
            "help": "Typically 34-40%"
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "Typically 18-21%"
          },
          {
            "key": "seed_color_size",
            "label": "Seed colour / size",
            "type": "select",
            "options": [
              "Yellow standard",
              "Yellow large-seeded (food)",
              "Small-seeded (natto)",
              "Black",
              "Green (edamame type)"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 13-14%"
          },
          {
            "key": "damaged_foreign_pct",
            "label": "Damaged & foreign material",
            "type": "number",
            "unit": "%",
            "help": "Splits, heat/mould damage, FM"
          }
        ]
      },
      {
        "name": "Triticale",
        "fields": [
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Feed",
              "Milling / food",
              "Distilling / ethanol",
              "Forage",
              "Seed"
            ],
            "required": true
          },
          {
            "key": "season",
            "label": "Type",
            "type": "select",
            "options": [
              "Winter",
              "Spring"
            ]
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight",
            "type": "number",
            "unit": "kg/hl"
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14%"
          },
          {
            "key": "falling_number_s",
            "label": "Falling number",
            "type": "number",
            "unit": "s"
          },
          {
            "key": "foreign_matter_pct",
            "label": "Foreign matter / impurities",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Beans",
        "fields": [
          {
            "key": "variety",
            "label": "Bean variety",
            "type": "select",
            "options": [
              "Kidney (red)",
              "Kidney (white/cannellini)",
              "Navy / pea bean",
              "Pinto",
              "Black",
              "Black-eyed",
              "Mung",
              "Adzuki",
              "Cranberry / borlotti",
              "Great northern",
              "Lima / butter"
            ],
            "required": true
          },
          {
            "key": "size_count",
            "label": "Size / count per 100g",
            "type": "number",
            "help": "Seeds per 100g; lower = larger"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14-16%"
          },
          {
            "key": "purity_pct",
            "label": "Purity / sortexed",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "defective_pct",
            "label": "Defective / damaged seeds",
            "type": "number",
            "unit": "%",
            "help": "Split, broken, weevil, discoloured"
          },
          {
            "key": "crop_year",
            "label": "Crop year",
            "type": "text"
          }
        ]
      },
      {
        "name": "Fodder",
        "fields": [
          {
            "key": "fodder_type",
            "label": "Fodder type",
            "type": "select",
            "options": [
              "Alfalfa / lucerne",
              "Timothy hay",
              "Oat hay",
              "Wheat straw",
              "Barley straw",
              "Rhodes grass",
              "Clover",
              "Ryegrass",
              "Maize silage",
              "Bermuda / coastal"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Baled (small square)",
              "Baled (large square)",
              "Round bale",
              "Pellets",
              "Chopped / chaff",
              "Cubes",
              "Silage"
            ],
            "required": true
          },
          {
            "key": "cutting",
            "label": "Cutting",
            "type": "select",
            "options": [
              "1st cut",
              "2nd cut",
              "3rd cut",
              "4th cut+"
            ],
            "help": "Later cuttings often finer/higher protein"
          },
          {
            "key": "protein_pct",
            "label": "Crude protein (dry basis)",
            "type": "number",
            "unit": "%",
            "help": "Alfalfa typ. 15-22%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Hay typically 10-15%"
          },
          {
            "key": "adf_ndf",
            "label": "ADF / NDF fibre",
            "type": "text",
            "help": "e.g. ADF 30% / NDF 40% (feed value)"
          },
          {
            "key": "bale_weight_kg",
            "label": "Bale weight",
            "type": "number",
            "unit": "kg"
          }
        ]
      },
      {
        "name": "Lentil",
        "fields": [
          {
            "key": "type",
            "label": "Lentil type / colour",
            "type": "select",
            "options": [
              "Red (football)",
              "Green (large / Laird)",
              "Green (small / Eston)",
              "Brown",
              "French green (Puy)",
              "Black (beluga)",
              "Yellow"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole",
              "Split",
              "Football (whole hulled)",
              "Decorticated / skinless"
            ]
          },
          {
            "key": "size",
            "label": "Size",
            "type": "select",
            "options": [
              "Small (macrosperma small)",
              "Medium",
              "Large (macrosperma)"
            ],
            "help": "Sieve size often quoted in mm"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 14%"
          },
          {
            "key": "purity_pct",
            "label": "Purity / sortexed",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "defective_pct",
            "label": "Defective / damaged seeds",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Meal",
        "fields": [
          {
            "key": "source",
            "label": "Grain / seed source",
            "type": "select",
            "options": [
              "Soybean meal",
              "Sunflower meal",
              "Rapeseed / canola meal",
              "Cottonseed meal",
              "Corn gluten meal",
              "Maize / cornmeal",
              "Wheat / bran meal",
              "Rice bran",
              "Groundnut meal",
              "Bone / meat & bone meal"
            ],
            "required": true
          },
          {
            "key": "protein_pct",
            "label": "Crude protein (dry basis)",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "e.g. soybean meal 44% or 48%"
          },
          {
            "key": "fiber_pct",
            "label": "Crude fibre",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "fat_pct",
            "label": "Crude fat / oil",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 12%"
          },
          {
            "key": "form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Ground / mash",
              "Pellets",
              "Flakes",
              "Granules"
            ]
          },
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Feed",
              "Human consumption (food)",
              "Fertilizer / organic input"
            ]
          }
        ]
      },
      {
        "name": "Barley",
        "fields": [
          {
            "key": "use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Malting",
              "Feed",
              "Food / pearled",
              "Seed",
              "Distilling"
            ],
            "required": true
          },
          {
            "key": "row_type",
            "label": "Row type",
            "type": "select",
            "options": [
              "2-row",
              "6-row"
            ],
            "help": "2-row favoured for premium malting"
          },
          {
            "key": "protein_pct",
            "label": "Protein (dry basis)",
            "type": "number",
            "unit": "%",
            "help": "Malting ~9.5-11.5%; feed higher"
          },
          {
            "key": "germination_pct",
            "label": "Germination capacity",
            "type": "number",
            "unit": "%",
            "help": "Malting min ~95%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically max 13.5%"
          },
          {
            "key": "test_weight_kg_hl",
            "label": "Test weight",
            "type": "number",
            "unit": "kg/hl"
          },
          {
            "key": "screenings_pct",
            "label": "Screenings (thin grain < 2.2mm)",
            "type": "number",
            "unit": "%",
            "help": "Malting: high plump / low screenings"
          }
        ]
      }
    ]
  },
  {
    "name": "Nuts",
    "emoji": "🥜",
    "slug": "nuts",
    "subcategories": [
      {
        "name": "Peanut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Blanched kernel",
              "Kernel with skin",
              "Splits",
              "Split (halves)"
            ],
            "required": true
          },
          {
            "key": "type",
            "label": "Botanical type",
            "type": "select",
            "options": [
              "Java",
              "Bold",
              "Runner",
              "Spanish",
              "Virginia",
              "Valencia"
            ],
            "help": "Indian trade: Java/Bold; US market types: Runner/Virginia/Spanish/Valencia"
          },
          {
            "key": "count_per_oz",
            "label": "Count per oz",
            "type": "select",
            "options": [
              "35/40",
              "38/42",
              "40/50",
              "50/60",
              "60/70",
              "70/80",
              "80/90"
            ],
            "help": "Kernels per ounce; lower = larger"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Blanched",
              "Roasted",
              "Salted",
              "Roasted & salted"
            ]
          },
          {
            "key": "oil_content_pct",
            "label": "Oil content",
            "type": "number",
            "unit": "%",
            "help": "Typically 44-56% for oil-type"
          },
          {
            "key": "aflatoxin_ppb",
            "label": "Aflatoxin (total)",
            "type": "number",
            "unit": "ppb",
            "help": "EU limit 4 ppb total for direct consumption"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Brazil nut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Shelled kernel",
              "Broken / pieces"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Large (LRG)",
              "Medium (MED)",
              "Small (SML)",
              "Midget",
              "Chipped & broken"
            ],
            "help": "Shelled sizing by count/lb"
          },
          {
            "key": "count_per_lb",
            "label": "Count per lb",
            "type": "number",
            "help": "e.g. Large 90-110, Medium 110-130, Small 130-160"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Dried",
              "Roasted",
              "Salted"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "aflatoxin_ppb",
            "label": "Aflatoxin (total)",
            "type": "number",
            "unit": "ppb"
          }
        ]
      },
      {
        "name": "Water caltrop",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh in-shell",
              "Boiled in-shell",
              "Peeled kernel",
              "Dried",
              "Flour / starch"
            ],
            "required": true
          },
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Trapa natans (two-horn)",
              "Trapa bicornis (buffalo/bull)",
              "Trapa bispinosa (Singhara)"
            ]
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Small",
              "Medium",
              "Large"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Fresh high; dried/flour <12%"
          },
          {
            "key": "starch_content_pct",
            "label": "Starch content",
            "type": "number",
            "unit": "%",
            "help": "Relevant for singhara flour"
          }
        ]
      },
      {
        "name": "Walnut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Kernel (shelled)"
            ],
            "required": true
          },
          {
            "key": "kernel_style",
            "label": "Kernel style",
            "type": "select",
            "options": [
              "Halves",
              "Halves & pieces",
              "Pieces",
              "Quarters",
              "Broken"
            ],
            "help": "Halves grade highest"
          },
          {
            "key": "color_grade",
            "label": "Kernel color grade",
            "type": "select",
            "options": [
              "Extra Light",
              "Light",
              "Light Amber",
              "Amber"
            ],
            "help": "DFA/CDFA color; Extra Light = premium"
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Chandler, Hartley, Franquette, Vina"
          },
          {
            "key": "in_shell_size_mm",
            "label": "In-shell diameter",
            "type": "select",
            "options": [
              "<28mm",
              "28-30mm",
              "30-32mm",
              "32-34mm",
              "34-36mm",
              ">36mm"
            ],
            "help": "For in-shell lots"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Kernel typically <8%"
          }
        ]
      },
      {
        "name": "Acorn",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell whole",
              "Shelled kernel",
              "Leached / dried",
              "Acorn flour / meal"
            ],
            "required": true
          },
          {
            "key": "species",
            "label": "Oak species",
            "type": "text",
            "help": "e.g. Quercus ilex, Q. rotundifolia, Q. robur"
          },
          {
            "key": "tannin_status",
            "label": "Tannin treatment",
            "type": "select",
            "options": [
              "Untreated (raw)",
              "Cold leached",
              "Hot leached"
            ],
            "help": "Leaching removes bitter tannins"
          },
          {
            "key": "intended_use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Human food",
              "Flour milling",
              "Animal / hog feed",
              "Seed / planting"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Chestnut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Fresh in-shell",
              "Dried",
              "Peeled kernel",
              "Frozen",
              "Chestnut flour",
              "Puree"
            ],
            "required": true
          },
          {
            "key": "size_count_per_kg",
            "label": "Size (count per kg)",
            "type": "select",
            "options": [
              "<60",
              "60-70",
              "70-80",
              "80-90",
              "90-100",
              ">100"
            ],
            "help": "Lower count = larger nut"
          },
          {
            "key": "variety",
            "label": "Variety / type",
            "type": "text",
            "help": "e.g. Marrone, Castagna, Dandong, Japanese"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Roasted",
              "Boiled",
              "Candied (marron glacé)"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Fresh ~50%; dried <10%"
          }
        ]
      },
      {
        "name": "Pine nut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Kernel (shelled)"
            ],
            "required": true
          },
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Pinus koraiensis (Korean)",
              "Pinus pinea (Mediterranean/Stone)",
              "Pinus gerardiana (Chilgoza)",
              "Pinus sibirica (Siberian)"
            ]
          },
          {
            "key": "kernel_length_mm",
            "label": "Kernel length",
            "type": "select",
            "options": [
              "<8mm",
              "8-10mm",
              "10-12mm",
              ">12mm"
            ],
            "help": "Mediterranean kernels are longest"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Roasted",
              "Salted"
            ]
          },
          {
            "key": "wholeness_pct",
            "label": "Whole kernels",
            "type": "number",
            "unit": "%",
            "help": "Share of intact vs broken"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Cashew",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell (RCN)",
              "Kernel"
            ],
            "required": true
          },
          {
            "key": "wholeness",
            "label": "Wholeness",
            "type": "select",
            "options": [
              "Whole",
              "Splits (S)",
              "Butts (B)",
              "Large white pieces (LWP)",
              "Small white pieces (SWP)",
              "Baby bits (BB)"
            ]
          },
          {
            "key": "grade",
            "label": "Grade / size code",
            "type": "select",
            "options": [
              "W180",
              "W210",
              "W240",
              "W320",
              "W450",
              "SW",
              "SW240",
              "SW320",
              "LWP",
              "SWP",
              "BB"
            ],
            "required": true,
            "help": "White whole grades: number = nuts per lb, lower = larger; SW=scorched wholes"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Roasted",
              "Salted",
              "Roasted & salted",
              "Blanched",
              "Fried"
            ]
          },
          {
            "key": "outturn_lb_per_80kg",
            "label": "Outturn (for RCN)",
            "type": "number",
            "unit": "lb/80kg",
            "help": "Kernel outturn ratio of raw cashew, e.g. 48-54 lb"
          },
          {
            "key": "count_per_lb",
            "label": "Count per lb",
            "type": "number"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Macadamia",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell (NIS)",
              "Kernel (shelled)"
            ],
            "required": true
          },
          {
            "key": "style",
            "label": "Kernel style",
            "type": "select",
            "options": [
              "Whole (Style 0/1)",
              "Halves (Style 2)",
              "Large pieces (Style 4)",
              "Small pieces (Style 5-6)",
              "Chips / meal"
            ],
            "help": "AMS style codes"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Premium Grade 0",
              "Grade 1",
              "Grade 2",
              "Grade 3",
              "Oil grade"
            ],
            "help": "By color/oil; Grade 0-1 premium"
          },
          {
            "key": "size_count_per_lb",
            "label": "Whole count per lb",
            "type": "select",
            "options": [
              "<180",
              "180-200",
              "200-240",
              "240-320",
              ">320"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Dry roasted",
              "Oil roasted",
              "Salted",
              "Honey roasted"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Kernel typically <1.5%"
          }
        ]
      },
      {
        "name": "Manchurian walnut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Kernel (shelled)"
            ],
            "required": true
          },
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Juglans mandshurica",
              "Juglans hopeiensis"
            ]
          },
          {
            "key": "kernel_style",
            "label": "Kernel style",
            "type": "select",
            "options": [
              "Halves",
              "Halves & pieces",
              "Pieces"
            ]
          },
          {
            "key": "color_grade",
            "label": "Kernel color grade",
            "type": "select",
            "options": [
              "Light",
              "Light Amber",
              "Amber"
            ]
          },
          {
            "key": "intended_use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Food kernel",
              "Oil pressing",
              "Rootstock / seed",
              "Carving / craft shells"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Almond",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Natural kernel",
              "Sliced",
              "Slivered",
              "Blanched",
              "Diced",
              "Flour / meal"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety type",
            "type": "select",
            "options": [
              "Nonpareil",
              "California (mixed)",
              "Carmel",
              "Monterey",
              "Butte/Padre",
              "Independence",
              "Mamra"
            ],
            "help": "Nonpareil = premium flat clean type"
          },
          {
            "key": "count_per_oz",
            "label": "Count per oz",
            "type": "select",
            "options": [
              "18/20",
              "20/22",
              "23/25",
              "25/27",
              "27/30",
              "30/32",
              "32/34",
              "34/36"
            ],
            "required": true,
            "help": "Kernels per ounce; lower = larger"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Roasted",
              "Salted",
              "Roasted & salted",
              "Blanched"
            ]
          },
          {
            "key": "kernel_uniformity",
            "label": "Uniformity / grade",
            "type": "select",
            "options": [
              "US Fancy",
              "US Extra No.1",
              "US No.1 (Supreme)",
              "US Select Sheller Run (SSR)",
              "US Standard Sheller Run (SR)"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically <6%"
          }
        ]
      },
      {
        "name": "Nutmeg",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Shelled nutmeg (whole)",
              "Ground / powder",
              "Mace (aril)",
              "Broken (BWP)"
            ],
            "required": true
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Shrivels",
              "Sound",
              "ABCD",
              "Grade 1 (80s)",
              "Grade 2 (110s)",
              "Grade 3 (130s)",
              "Defective / BWP"
            ],
            "help": "Count-per-lb grades; 80s = ~80 nuts/lb"
          },
          {
            "key": "count_per_lb",
            "label": "Count per lb",
            "type": "select",
            "options": [
              "60-65",
              "80",
              "110",
              "130",
              "150"
            ],
            "help": "Lower count = larger nut"
          },
          {
            "key": "origin_type",
            "label": "Origin type",
            "type": "select",
            "options": [
              "Indonesian (Banda/Siauw)",
              "Grenada / West Indian",
              "Indian",
              "Sri Lankan"
            ]
          },
          {
            "key": "volatile_oil_pct",
            "label": "Volatile oil",
            "type": "number",
            "unit": "%",
            "help": "Typically 6.5-15%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Paradise nut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Shelled kernel",
              "Broken / pieces"
            ],
            "required": true
          },
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Lecythis zabucajo",
              "Lecythis pisonis",
              "Lecythis ollaria"
            ],
            "help": "Sapucaia / monkey pot nut"
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "Large",
              "Medium",
              "Small"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Dried",
              "Roasted",
              "Salted"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Coco de mer",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole nut (in husk)",
              "Polished shell",
              "Kernel / jelly",
              "Half shell"
            ],
            "required": true
          },
          {
            "key": "cites_permit",
            "label": "CITES permit available",
            "type": "boolean",
            "required": true,
            "help": "Lodoicea maldivica is CITES Appendix III / protected; export permit mandatory"
          },
          {
            "key": "intended_use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Ornamental / collector",
              "Culinary kernel",
              "Cosmetic / extract"
            ]
          },
          {
            "key": "weight_kg",
            "label": "Nut weight",
            "type": "number",
            "unit": "kg",
            "help": "World's largest seed, 15-30 kg"
          },
          {
            "key": "authentication",
            "label": "Authentication / provenance",
            "type": "text",
            "help": "Seychelles govt stamp / certificate number"
          }
        ]
      },
      {
        "name": "Turkish hazelnut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Natural kernel",
              "Blanched kernel",
              "Roasted kernel",
              "Diced",
              "Meal / flour",
              "Paste"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Tombul (Giresun)",
              "Levant (Ordu/Trabzon)",
              "Palaz",
              "Foşa",
              "Sivri"
            ],
            "help": "Tombul = round premium type"
          },
          {
            "key": "kernel_size_mm",
            "label": "Kernel diameter",
            "type": "select",
            "options": [
              "9-11mm",
              "11-13mm",
              "13-15mm",
              "15-17mm",
              ">17mm"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Roasted",
              "Blanched",
              "Blanched & roasted"
            ]
          },
          {
            "key": "grade",
            "label": "Quality grade",
            "type": "select",
            "options": [
              "Standard 1",
              "Standard 2",
              "Extra"
            ],
            "help": "Turkish TSE hazelnut standard"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Kernel typically <6%"
          }
        ]
      },
      {
        "name": "Pistachio",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Shelled kernel",
              "Kernel halves / splits"
            ],
            "required": true
          },
          {
            "key": "shell_opening",
            "label": "Shell opening",
            "type": "select",
            "options": [
              "Naturally opened",
              "Closed shell",
              "Mechanically opened"
            ],
            "required": true
          },
          {
            "key": "count_per_oz",
            "label": "In-shell count per oz",
            "type": "select",
            "options": [
              "18/20",
              "20/22",
              "21/25",
              "22/24",
              "24/26",
              "26/28"
            ],
            "help": "Nuts per ounce; lower = larger"
          },
          {
            "key": "variety",
            "label": "Variety",
            "type": "select",
            "options": [
              "Kerman",
              "Akbari",
              "Ahmad Aghaei",
              "Fandoghi (Round)",
              "Kalleh Ghouchi (Jumbo)",
              "Antep (Turkish)"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Roasted",
              "Salted",
              "Roasted & salted",
              "Seasoned"
            ]
          },
          {
            "key": "kernel_color",
            "label": "Kernel color grade",
            "type": "select",
            "options": [
              "Extra green",
              "Green",
              "Yellow-green",
              "Yellow"
            ],
            "help": "Greener kernels command premium"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Typically <5%"
          }
        ]
      },
      {
        "name": "Hazelnut",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "In-shell",
              "Natural kernel",
              "Blanched kernel",
              "Roasted kernel",
              "Diced",
              "Meal / flour",
              "Paste"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Barcelona, Ennis, Tonda Gentile, Corylus"
          },
          {
            "key": "kernel_size_mm",
            "label": "Kernel diameter",
            "type": "select",
            "options": [
              "9-11mm",
              "11-13mm",
              "13-15mm",
              "15-17mm",
              ">17mm"
            ],
            "required": true,
            "help": "Sizing scale by diameter"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Natural",
              "Blanched",
              "Roasted",
              "Blanched & roasted"
            ]
          },
          {
            "key": "grade",
            "label": "Quality grade",
            "type": "select",
            "options": [
              "Extra",
              "Class I",
              "Class II"
            ],
            "help": "UNECE DDP-04 standard for hazelnut kernels"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Kernel typically <6%"
          }
        ]
      }
    ]
  },
  {
    "name": "Packaging",
    "emoji": "📦",
    "slug": "packaging",
    "subcategories": [
      {
        "name": "Banana boxes",
        "fields": [
          {
            "key": "box_type",
            "label": "Box type",
            "type": "select",
            "options": [
              "Telescopic (2-piece lid+tray)",
              "One-piece (RSC)",
              "Vented open-top",
              "Die-cut tray"
            ],
            "required": true,
            "help": "Banana cartons are usually vented telescopic"
          },
          {
            "key": "board_grade",
            "label": "Board / flute",
            "type": "select",
            "options": [
              "Single-wall B-flute",
              "Single-wall C-flute",
              "Double-wall BC",
              "Double-wall EB"
            ],
            "help": "Double-wall for stacking strength in cold chain"
          },
          {
            "key": "dimensions_mm",
            "label": "Internal dimensions L×W×H",
            "type": "text",
            "unit": "mm",
            "help": "e.g. 500×400×250"
          },
          {
            "key": "load_capacity_kg",
            "label": "Load capacity",
            "type": "number",
            "unit": "kg",
            "help": "Typical banana carton 18–20 kg net"
          },
          {
            "key": "wet_strength",
            "label": "Wet-strength / wax coated",
            "type": "boolean",
            "help": "For high-humidity ripening rooms"
          },
          {
            "key": "custom_print",
            "label": "Custom print available",
            "type": "boolean"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Pack",
              "Pallet"
            ],
            "required": true
          }
        ]
      },
      {
        "name": "Barrels",
        "fields": [
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "HDPE plastic",
              "Steel (tight-head)",
              "Steel (open-head)",
              "Stainless steel",
              "Fibre / cardboard",
              "Oak / wood"
            ],
            "required": true
          },
          {
            "key": "capacity_l",
            "label": "Capacity",
            "type": "number",
            "unit": "L",
            "help": "Common sizes 120 / 200 / 220 L"
          },
          {
            "key": "head_type",
            "label": "Head type",
            "type": "select",
            "options": [
              "Open-head (removable lid)",
              "Tight-head (bung/closed)"
            ],
            "help": "Open-head for solids/pastes, tight-head for liquids"
          },
          {
            "key": "un_rating",
            "label": "UN hazardous-goods rating",
            "type": "text",
            "help": "e.g. UN 1H1/Y1.5/150"
          },
          {
            "key": "food_grade",
            "label": "Food-grade",
            "type": "boolean"
          },
          {
            "key": "reuse",
            "label": "Reusable / single-use",
            "type": "select",
            "options": [
              "Single-use",
              "Reusable",
              "Returnable / deposit"
            ]
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Pallet"
            ],
            "required": true
          }
        ]
      },
      {
        "name": "Paper",
        "fields": [
          {
            "key": "paper_type",
            "label": "Paper type",
            "type": "select",
            "options": [
              "Kraft (brown)",
              "Bleached kraft (white)",
              "Greaseproof",
              "Glassine",
              "MG (machine-glazed)",
              "Wrapping / tissue",
              "Wax-coated"
            ],
            "required": true
          },
          {
            "key": "grammage_gsm",
            "label": "Grammage",
            "type": "number",
            "unit": "g/m²",
            "required": true,
            "help": "e.g. 40–120 gsm"
          },
          {
            "key": "format",
            "label": "Format",
            "type": "select",
            "options": [
              "Reel / roll",
              "Sheet",
              "Ream"
            ]
          },
          {
            "key": "width_mm",
            "label": "Roll width / sheet size",
            "type": "text",
            "unit": "mm"
          },
          {
            "key": "food_grade",
            "label": "Food-grade / direct contact",
            "type": "boolean"
          },
          {
            "key": "recycled_content",
            "label": "Recycled content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Roll",
              "Ream",
              "Pallet",
              "kg"
            ]
          }
        ]
      },
      {
        "name": "Cardboard",
        "fields": [
          {
            "key": "board_type",
            "label": "Board type",
            "type": "select",
            "options": [
              "Corrugated (fluted)",
              "Solid / folding boxboard",
              "Greyboard",
              "Honeycomb"
            ],
            "required": true
          },
          {
            "key": "flute_profile",
            "label": "Flute profile",
            "type": "select",
            "options": [
              "A",
              "B",
              "C",
              "E",
              "F",
              "BC (double-wall)",
              "EB (double-wall)"
            ],
            "help": "E/F thin for retail, C/BC for shipping"
          },
          {
            "key": "board_grammage_gsm",
            "label": "Board grammage",
            "type": "number",
            "unit": "g/m²"
          },
          {
            "key": "ect",
            "label": "Edge Crush Test (ECT)",
            "type": "number",
            "unit": "kN/m",
            "help": "Stacking-strength indicator"
          },
          {
            "key": "format",
            "label": "Supplied as",
            "type": "select",
            "options": [
              "Sheet",
              "Reel",
              "Blank / die-cut"
            ]
          },
          {
            "key": "food_grade",
            "label": "Food-grade liner",
            "type": "boolean"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Sheet",
              "Pallet",
              "kg"
            ]
          }
        ]
      },
      {
        "name": "Containers",
        "fields": [
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "PP",
              "PET",
              "HDPE",
              "PS",
              "PLA (bio)",
              "Bagasse / pulp",
              "Aluminium"
            ],
            "required": true
          },
          {
            "key": "capacity_ml",
            "label": "Capacity",
            "type": "number",
            "unit": "ml"
          },
          {
            "key": "lid_type",
            "label": "Lid / closure",
            "type": "select",
            "options": [
              "Snap-on",
              "Hinged (clamshell)",
              "Heat-seal film",
              "Screw cap",
              "None"
            ]
          },
          {
            "key": "compartments",
            "label": "Compartments",
            "type": "number",
            "help": "Number of divided sections"
          },
          {
            "key": "food_grade",
            "label": "Food-grade",
            "type": "boolean",
            "required": true
          },
          {
            "key": "temp_rating",
            "label": "Temperature suitability",
            "type": "multiselect",
            "options": [
              "Freezer",
              "Fridge",
              "Microwave",
              "Ovenable",
              "Hot-fill"
            ]
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Pack",
              "Pallet"
            ]
          }
        ]
      },
      {
        "name": "Boxes",
        "fields": [
          {
            "key": "box_style",
            "label": "Box style",
            "type": "select",
            "options": [
              "RSC (regular slotted)",
              "FEFCO die-cut",
              "Telescopic",
              "Tuck-end folding carton",
              "Bliss box",
              "Tray + lid"
            ],
            "required": true
          },
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "Single-wall corrugated",
              "Double-wall corrugated",
              "Folding boxboard",
              "Rigid / set-up"
            ]
          },
          {
            "key": "dimensions_mm",
            "label": "Internal dimensions L×W×H",
            "type": "text",
            "unit": "mm",
            "required": true
          },
          {
            "key": "load_capacity_kg",
            "label": "Load capacity",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "print",
            "label": "Printing",
            "type": "select",
            "options": [
              "Plain / kraft",
              "1-colour",
              "Flexo multi-colour",
              "Litho-laminated",
              "Digital"
            ]
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Pack",
              "Pallet"
            ]
          }
        ]
      },
      {
        "name": "Trays",
        "fields": [
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "PP",
              "PET / rPET",
              "EPS foam",
              "Moulded pulp",
              "Bagasse",
              "Corrugated",
              "Wood veneer (punnet)"
            ],
            "required": true
          },
          {
            "key": "dimensions_mm",
            "label": "Dimensions L×W×H",
            "type": "text",
            "unit": "mm"
          },
          {
            "key": "capacity",
            "label": "Capacity / count",
            "type": "text",
            "help": "e.g. 500 g, 30-egg, 6-cavity"
          },
          {
            "key": "map_sealable",
            "label": "MAP / heat-seal compatible",
            "type": "boolean",
            "help": "For modified-atmosphere lidding film"
          },
          {
            "key": "food_grade",
            "label": "Food-grade",
            "type": "boolean",
            "required": true
          },
          {
            "key": "reuse",
            "label": "Reusable / single-use",
            "type": "select",
            "options": [
              "Single-use",
              "Reusable"
            ]
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Pack",
              "Pallet"
            ]
          }
        ]
      },
      {
        "name": "Bag-closing thread",
        "fields": [
          {
            "key": "fibre",
            "label": "Fibre / material",
            "type": "select",
            "options": [
              "Cotton",
              "Polyester",
              "Poly-cotton blend",
              "Nylon"
            ],
            "required": true
          },
          {
            "key": "count_ticket",
            "label": "Thread count / ticket",
            "type": "text",
            "help": "e.g. 20s/4, 12s/5, Ticket 20"
          },
          {
            "key": "weight_per_cone_g",
            "label": "Weight per cone",
            "type": "number",
            "unit": "g",
            "help": "e.g. 1000 g cone"
          },
          {
            "key": "colour",
            "label": "Colour",
            "type": "text"
          },
          {
            "key": "food_grade",
            "label": "Food-grade (detectable/clean)",
            "type": "boolean"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Cone",
              "Pack",
              "Carton",
              "kg"
            ]
          }
        ]
      },
      {
        "name": "Bags",
        "fields": [
          {
            "key": "bag_type",
            "label": "Bag type",
            "type": "select",
            "options": [
              "PP woven sack",
              "Jute / hessian",
              "Paper (multi-wall)",
              "LDPE / poly liner",
              "BOPP laminated",
              "Leno / mesh",
              "FIBC (bulk bag)",
              "Vacuum pouch"
            ],
            "required": true
          },
          {
            "key": "capacity_kg",
            "label": "Capacity",
            "type": "number",
            "unit": "kg",
            "help": "e.g. 25 / 50 kg"
          },
          {
            "key": "dimensions_mm",
            "label": "Dimensions W×L",
            "type": "text",
            "unit": "mm"
          },
          {
            "key": "closure",
            "label": "Closure type",
            "type": "select",
            "options": [
              "Open-mouth (sewn)",
              "Valve",
              "Heat-seal",
              "Zip-lock",
              "Drawstring"
            ]
          },
          {
            "key": "liner",
            "label": "Inner liner / lamination",
            "type": "boolean",
            "help": "Moisture barrier liner"
          },
          {
            "key": "food_grade",
            "label": "Food-grade",
            "type": "boolean"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Bale",
              "Pallet"
            ],
            "required": true
          }
        ]
      },
      {
        "name": "Film",
        "fields": [
          {
            "key": "film_type",
            "label": "Film type",
            "type": "select",
            "options": [
              "LDPE stretch",
              "LLDPE stretch",
              "Shrink (POF/PVC)",
              "BOPP",
              "PET",
              "Cling / PVC",
              "Vacuum barrier",
              "Compostable (PLA)"
            ],
            "required": true
          },
          {
            "key": "thickness_micron",
            "label": "Thickness",
            "type": "number",
            "unit": "µm",
            "help": "e.g. 12–50 µm"
          },
          {
            "key": "width_mm",
            "label": "Roll width",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "roll_length_m",
            "label": "Roll length",
            "type": "number",
            "unit": "m"
          },
          {
            "key": "food_grade",
            "label": "Food-grade",
            "type": "boolean"
          },
          {
            "key": "printed",
            "label": "Printed / plain",
            "type": "select",
            "options": [
              "Plain",
              "Printed"
            ]
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Roll",
              "kg",
              "Pallet"
            ]
          }
        ]
      },
      {
        "name": "Pallets",
        "fields": [
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "Wood",
              "Plastic (HDPE)",
              "Pressed wood / moulded",
              "Corrugated",
              "Steel / aluminium"
            ],
            "required": true
          },
          {
            "key": "size_standard",
            "label": "Size standard",
            "type": "select",
            "options": [
              "EUR/EPAL 1200×800",
              "ISO 1200×1000",
              "US 48×40 in",
              "1100×1100",
              "Half-pallet 800×600",
              "Custom"
            ],
            "required": true
          },
          {
            "key": "entry_type",
            "label": "Entry / deck",
            "type": "select",
            "options": [
              "2-way",
              "4-way",
              "Double-deck reversible",
              "Nestable"
            ]
          },
          {
            "key": "dynamic_load_kg",
            "label": "Dynamic load capacity",
            "type": "number",
            "unit": "kg",
            "help": "Load while being moved"
          },
          {
            "key": "ispm15",
            "label": "ISPM-15 heat-treated",
            "type": "boolean",
            "help": "Required for export wood pallets"
          },
          {
            "key": "reuse",
            "label": "Reusable / returnable",
            "type": "select",
            "options": [
              "Single-use / export",
              "Reusable",
              "Pool / returnable"
            ]
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Truckload"
            ]
          }
        ]
      },
      {
        "name": "Net bags",
        "fields": [
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "PP leno mesh",
              "PE knitted",
              "Cotton net",
              "Biodegradable / starch"
            ],
            "required": true
          },
          {
            "key": "capacity_kg",
            "label": "Capacity",
            "type": "number",
            "unit": "kg",
            "help": "e.g. 1 / 2 / 5 / 25 kg"
          },
          {
            "key": "closure",
            "label": "Closure",
            "type": "select",
            "options": [
              "Clip-band top",
              "Drawstring",
              "Heat-seal",
              "Sewn"
            ]
          },
          {
            "key": "mesh_label",
            "label": "Header / label print",
            "type": "boolean",
            "help": "Printed band or header tape"
          },
          {
            "key": "colour",
            "label": "Mesh colour",
            "type": "text",
            "help": "e.g. red for onions, green for cabbage"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Bale",
              "Roll (tubular)"
            ]
          }
        ]
      },
      {
        "name": "Adhesive tape",
        "fields": [
          {
            "key": "tape_type",
            "label": "Tape type",
            "type": "select",
            "options": [
              "BOPP carton-sealing",
              "PVC",
              "Paper / kraft (gummed)",
              "Filament / reinforced",
              "Masking",
              "Double-sided"
            ],
            "required": true
          },
          {
            "key": "adhesive",
            "label": "Adhesive",
            "type": "select",
            "options": [
              "Acrylic (water-based)",
              "Hot-melt",
              "Solvent / natural rubber"
            ]
          },
          {
            "key": "width_mm",
            "label": "Width",
            "type": "number",
            "unit": "mm",
            "help": "e.g. 48 / 72 mm"
          },
          {
            "key": "length_m",
            "label": "Length per roll",
            "type": "number",
            "unit": "m"
          },
          {
            "key": "thickness_micron",
            "label": "Total thickness",
            "type": "number",
            "unit": "µm"
          },
          {
            "key": "printed",
            "label": "Custom printed",
            "type": "boolean"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Roll",
              "Pack",
              "Carton"
            ]
          }
        ]
      },
      {
        "name": "Glass containers",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Jar",
              "Bottle",
              "Vial / phial",
              "Carboy / demijohn"
            ],
            "required": true
          },
          {
            "key": "capacity_ml",
            "label": "Capacity",
            "type": "number",
            "unit": "ml",
            "required": true
          },
          {
            "key": "glass_colour",
            "label": "Glass colour",
            "type": "select",
            "options": [
              "Flint (clear)",
              "Amber",
              "Green",
              "Blue",
              "Opal"
            ]
          },
          {
            "key": "neck_finish",
            "label": "Neck / closure finish",
            "type": "text",
            "help": "e.g. 63 TO twist-off, 38 mm cork, 28 mm PP screw"
          },
          {
            "key": "closure_included",
            "label": "Closure / lid included",
            "type": "boolean"
          },
          {
            "key": "reuse",
            "label": "Reusable / returnable",
            "type": "select",
            "options": [
              "Single-use",
              "Returnable / deposit"
            ]
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Tray",
              "Pallet"
            ]
          }
        ]
      },
      {
        "name": "Textile packaging",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Jute sack",
              "Cotton drawstring bag",
              "Canvas tote",
              "Burlap wrap / roll",
              "Mesh produce bag",
              "Muslin bag"
            ],
            "required": true
          },
          {
            "key": "fabric_weight_gsm",
            "label": "Fabric weight",
            "type": "number",
            "unit": "g/m²",
            "help": "Jute hessian often 300–450 gsm"
          },
          {
            "key": "dimensions_mm",
            "label": "Dimensions W×L",
            "type": "text",
            "unit": "mm"
          },
          {
            "key": "capacity_kg",
            "label": "Capacity",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "food_grade",
            "label": "Food-grade (batching-oil free)",
            "type": "boolean",
            "help": "B-Twill DW food-grade jute"
          },
          {
            "key": "custom_print",
            "label": "Custom print / branding",
            "type": "boolean"
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Bale",
              "Pallet"
            ]
          }
        ]
      },
      {
        "name": "Crates",
        "fields": [
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "HDPE plastic",
              "PP plastic",
              "Wood",
              "Metal / wire",
              "Corrugated"
            ],
            "required": true
          },
          {
            "key": "style",
            "label": "Style",
            "type": "select",
            "options": [
              "Stackable (rigid)",
              "Nestable",
              "Collapsible / folding",
              "Ventilated",
              "Bale arm"
            ],
            "help": "Foldable crates save return-freight"
          },
          {
            "key": "external_dimensions_mm",
            "label": "External dimensions L×W×H",
            "type": "text",
            "unit": "mm",
            "help": "e.g. 600×400×300 (Euro footprint)"
          },
          {
            "key": "load_capacity_kg",
            "label": "Load capacity",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "food_grade",
            "label": "Food-grade",
            "type": "boolean"
          },
          {
            "key": "reuse",
            "label": "Reusable / returnable",
            "type": "select",
            "options": [
              "Single-use",
              "Reusable",
              "Pool / returnable"
            ],
            "required": true
          },
          {
            "key": "order_unit",
            "label": "Order unit",
            "type": "select",
            "options": [
              "Piece",
              "Pallet"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Animal feed",
    "emoji": "🧺",
    "slug": "feed",
    "subcategories": [
      {
        "name": "Amino acids",
        "fields": [
          {
            "key": "amino_acid",
            "label": "Amino acid",
            "type": "select",
            "options": [
              "L-Lysine HCl",
              "L-Lysine sulphate",
              "DL-Methionine",
              "L-Threonine",
              "L-Tryptophan",
              "L-Valine",
              "L-Arginine",
              "Glycine",
              "Betaine"
            ],
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Purity / assay",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "e.g. Lysine HCl min 98.5%"
          },
          {
            "key": "physical_form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Powder",
              "Granule",
              "Crystalline",
              "Liquid"
            ]
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Poultry",
              "Swine",
              "Cattle",
              "Sheep",
              "Fish",
              "Horse"
            ]
          },
          {
            "key": "production_method",
            "label": "Production method",
            "type": "select",
            "options": [
              "Fermentation",
              "Synthetic",
              "Enzymatic"
            ]
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "25 kg bag",
              "500 kg big bag",
              "1000 kg big bag",
              "IBC tote",
              "Bulk"
            ]
          }
        ]
      },
      {
        "name": "Distillers grains",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "DDGS (dried, w/ solubles)",
              "DDG (dried, no solubles)",
              "WDG (wet)",
              "CDS (condensed solubles)"
            ],
            "required": true,
            "help": "Distillers dried grains with solubles etc."
          },
          {
            "key": "grain_source",
            "label": "Grain source",
            "type": "select",
            "options": [
              "Corn",
              "Wheat",
              "Barley",
              "Sorghum",
              "Rye",
              "Blend"
            ]
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%",
            "help": "DM basis, typ. 26-32%"
          },
          {
            "key": "crude_fat_pct",
            "label": "Crude fat",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle",
              "Poultry",
              "Swine",
              "Sheep",
              "Fish"
            ]
          }
        ]
      },
      {
        "name": "Vitamins",
        "fields": [
          {
            "key": "vitamin",
            "label": "Vitamin",
            "type": "select",
            "options": [
              "A",
              "D3",
              "E",
              "K3",
              "B1",
              "B2",
              "B6",
              "B12",
              "Niacin",
              "Biotin",
              "Folic acid",
              "Vitamin C",
              "Choline chloride",
              "Multivitamin blend"
            ],
            "required": true
          },
          {
            "key": "potency",
            "label": "Potency / assay",
            "type": "number",
            "help": "e.g. Vitamin A 500,000 IU/g or E 50%"
          },
          {
            "key": "potency_unit",
            "label": "Potency unit",
            "type": "select",
            "options": [
              "IU/g",
              "%",
              "mg/kg"
            ]
          },
          {
            "key": "physical_form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Powder",
              "Granule",
              "Coated/spray-dried beadlet",
              "Liquid",
              "Oil"
            ]
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Poultry",
              "Swine",
              "Cattle",
              "Sheep",
              "Fish",
              "Horse"
            ]
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "1 kg",
              "5 kg",
              "25 kg drum",
              "25 kg bag",
              "Bulk"
            ]
          }
        ]
      },
      {
        "name": "Liquid feed",
        "fields": [
          {
            "key": "base_type",
            "label": "Base type",
            "type": "select",
            "options": [
              "Molasses",
              "Molasses-urea",
              "Whey",
              "Vegetable oil blend",
              "CMS (condensed molasses solubles)",
              "Propylene glycol"
            ],
            "required": true
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "total_sugars_pct",
            "label": "Total sugars (Brix)",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "energy_me",
            "label": "Energy (ME)",
            "type": "number",
            "unit": "kcal/kg"
          },
          {
            "key": "medicated",
            "label": "Medicated",
            "type": "boolean"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle",
              "Sheep",
              "Swine",
              "Horse",
              "Poultry"
            ]
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "IBC 1000 L tote",
              "200 L drum",
              "Bulk tanker",
              "Flexitank"
            ]
          }
        ]
      },
      {
        "name": "Oilcake",
        "fields": [
          {
            "key": "oilseed_source",
            "label": "Oilseed source",
            "type": "select",
            "options": [
              "Soybean",
              "Rapeseed/Canola",
              "Sunflower",
              "Cottonseed",
              "Groundnut/Peanut",
              "Palm kernel",
              "Sesame",
              "Linseed",
              "Copra",
              "Mustard"
            ],
            "required": true
          },
          {
            "key": "extraction_method",
            "label": "Extraction method",
            "type": "select",
            "options": [
              "Expeller/mechanical pressed",
              "Solvent extracted",
              "Cold pressed"
            ],
            "required": true,
            "help": "Affects residual oil"
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%",
            "help": "e.g. soybean meal 44% or 48%"
          },
          {
            "key": "crude_fiber_pct",
            "label": "Crude fiber",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "residual_oil_pct",
            "label": "Residual oil/fat",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle",
              "Poultry",
              "Swine",
              "Sheep",
              "Fish"
            ]
          }
        ]
      },
      {
        "name": "Beet pulp",
        "fields": [
          {
            "key": "physical_form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Pellet",
              "Shreds/flakes",
              "Meal",
              "Molassed pellet"
            ],
            "required": true
          },
          {
            "key": "molassed",
            "label": "Molassed",
            "type": "boolean",
            "help": "Sugar/molasses added"
          },
          {
            "key": "crude_fiber_pct",
            "label": "Crude fiber",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle",
              "Horse",
              "Sheep"
            ]
          }
        ]
      },
      {
        "name": "Milk replacers",
        "fields": [
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "select",
            "options": [
              "Calf",
              "Lamb",
              "Kid (goat)",
              "Piglet",
              "Foal"
            ],
            "required": true
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%",
            "help": "typ. 20-26%"
          },
          {
            "key": "crude_fat_pct",
            "label": "Crude fat",
            "type": "number",
            "unit": "%",
            "help": "typ. 15-20%"
          },
          {
            "key": "protein_source",
            "label": "Protein source",
            "type": "select",
            "options": [
              "Skimmed milk (all-milk)",
              "Whey-based",
              "Whey + vegetable protein",
              "Soy protein"
            ]
          },
          {
            "key": "medicated",
            "label": "Medicated",
            "type": "boolean"
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "10 kg bag",
              "20 kg bag",
              "25 kg bag",
              "1000 kg big bag"
            ]
          }
        ]
      },
      {
        "name": "Fodder grain",
        "fields": [
          {
            "key": "grain_type",
            "label": "Grain type",
            "type": "select",
            "options": [
              "Feed wheat",
              "Feed barley",
              "Feed corn/maize",
              "Sorghum",
              "Oats",
              "Rye",
              "Triticale",
              "Millet",
              "Peas"
            ],
            "required": true
          },
          {
            "key": "test_weight",
            "label": "Test weight / hectolitre",
            "type": "number",
            "unit": "kg/hl",
            "help": "Bulk density"
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "typ. max 14%"
          },
          {
            "key": "broken_foreign_pct",
            "label": "Broken / foreign matter",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle",
              "Poultry",
              "Swine",
              "Sheep",
              "Horse"
            ]
          }
        ]
      },
      {
        "name": "Compound feed",
        "fields": [
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "select",
            "options": [
              "Poultry (broiler)",
              "Poultry (layer)",
              "Cattle (dairy)",
              "Cattle (beef)",
              "Swine",
              "Sheep",
              "Fish",
              "Horse"
            ],
            "required": true
          },
          {
            "key": "life_stage",
            "label": "Life stage / purpose",
            "type": "select",
            "options": [
              "Starter",
              "Grower",
              "Finisher",
              "Lactation",
              "Gestation",
              "Maintenance"
            ],
            "help": "Feeding phase"
          },
          {
            "key": "physical_form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Pellet",
              "Mash",
              "Crumble",
              "Meal"
            ],
            "required": true
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "energy_me",
            "label": "Energy (ME)",
            "type": "number",
            "unit": "kcal/kg"
          },
          {
            "key": "medicated",
            "label": "Medicated",
            "type": "boolean"
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "25 kg bag",
              "40 kg bag",
              "50 kg bag",
              "1000 kg big bag",
              "Bulk"
            ]
          }
        ]
      },
      {
        "name": "Feed meal",
        "fields": [
          {
            "key": "meal_source",
            "label": "Meal source",
            "type": "select",
            "options": [
              "Fish meal",
              "Meat & bone meal",
              "Blood meal",
              "Feather meal",
              "Poultry by-product meal",
              "Bone meal",
              "Krill meal"
            ],
            "required": true
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "e.g. fish meal 60/65/67%"
          },
          {
            "key": "crude_fat_pct",
            "label": "Crude fat",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "ash_pct",
            "label": "Ash",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Fish",
              "Poultry",
              "Swine",
              "Pet"
            ]
          }
        ]
      },
      {
        "name": "Substandard products",
        "fields": [
          {
            "key": "defect_reason",
            "label": "Defect / reason",
            "type": "select",
            "options": [
              "Off-spec moisture",
              "Mould/spoilage",
              "Broken/fines",
              "Expired/near-expiry",
              "Contamination",
              "Discoloration",
              "Screenings/rejects"
            ],
            "required": true
          },
          {
            "key": "origin_product",
            "label": "Original product type",
            "type": "text",
            "help": "What it was before downgrade"
          },
          {
            "key": "suitable_use",
            "label": "Suitable use",
            "type": "select",
            "options": [
              "Livestock feed",
              "Fish feed",
              "Pet feed",
              "Industrial/biogas",
              "Compost"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "condition_note",
            "label": "Condition note",
            "type": "text",
            "help": "Brief honest description of state"
          }
        ]
      },
      {
        "name": "Bran",
        "fields": [
          {
            "key": "bran_source",
            "label": "Bran source",
            "type": "select",
            "options": [
              "Wheat bran",
              "Rice bran",
              "Corn bran",
              "Oat bran",
              "Barley bran",
              "De-oiled rice bran"
            ],
            "required": true
          },
          {
            "key": "physical_form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Meal/loose",
              "Pellet",
              "Coarse"
            ]
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "crude_fiber_pct",
            "label": "Crude fiber",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "crude_fat_pct",
            "label": "Crude fat / oil",
            "type": "number",
            "unit": "%",
            "help": "Key for rice bran (full-fat vs de-oiled)"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle",
              "Poultry",
              "Swine",
              "Horse",
              "Fish"
            ]
          }
        ]
      },
      {
        "name": "Premixes",
        "fields": [
          {
            "key": "premix_type",
            "label": "Premix type",
            "type": "select",
            "options": [
              "Vitamin premix",
              "Mineral premix",
              "Vitamin-mineral premix",
              "Trace mineral premix",
              "Medicated premix"
            ],
            "required": true
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "select",
            "options": [
              "Poultry",
              "Swine",
              "Cattle (dairy)",
              "Cattle (beef)",
              "Sheep",
              "Fish",
              "Horse"
            ],
            "required": true
          },
          {
            "key": "inclusion_rate",
            "label": "Inclusion rate",
            "type": "number",
            "unit": "%",
            "help": "Recommended % in final feed"
          },
          {
            "key": "carrier",
            "label": "Carrier",
            "type": "select",
            "options": [
              "Calcium carbonate",
              "Wheat bran",
              "Rice husk",
              "Kaolin",
              "Dextrose"
            ]
          },
          {
            "key": "medicated",
            "label": "Medicated",
            "type": "boolean"
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "1 kg",
              "5 kg",
              "25 kg bag",
              "Bulk"
            ]
          }
        ]
      },
      {
        "name": "Probiotics",
        "fields": [
          {
            "key": "strain_type",
            "label": "Strain / type",
            "type": "multiselect",
            "options": [
              "Lactobacillus",
              "Bacillus subtilis",
              "Bacillus licheniformis",
              "Saccharomyces cerevisiae (yeast)",
              "Enterococcus faecium",
              "Bifidobacterium",
              "Multi-strain"
            ],
            "required": true
          },
          {
            "key": "cfu_count",
            "label": "Viable count (CFU)",
            "type": "number",
            "unit": "CFU/g",
            "required": true,
            "help": "e.g. 1×10^10 CFU/g"
          },
          {
            "key": "physical_form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Powder",
              "Granule",
              "Liquid",
              "Encapsulated/coated"
            ]
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Poultry",
              "Swine",
              "Cattle",
              "Sheep",
              "Fish",
              "Horse"
            ]
          },
          {
            "key": "heat_stable",
            "label": "Heat/pelleting stable",
            "type": "boolean",
            "help": "Survives feed pelleting temps"
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "1 kg",
              "5 kg",
              "25 kg bag",
              "20 L drum"
            ]
          }
        ]
      },
      {
        "name": "Haylage",
        "fields": [
          {
            "key": "forage_type",
            "label": "Forage type",
            "type": "select",
            "options": [
              "Ryegrass",
              "Timothy",
              "Alfalfa/Lucerne",
              "Clover",
              "Mixed grass",
              "Meadow"
            ],
            "required": true
          },
          {
            "key": "dry_matter_pct",
            "label": "Dry matter",
            "type": "number",
            "unit": "%",
            "help": "Haylage typ. 55-75% DM"
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "bale_type",
            "label": "Bale type",
            "type": "select",
            "options": [
              "Round wrapped",
              "Square wrapped",
              "Mini/small wrapped bale"
            ]
          },
          {
            "key": "bale_weight",
            "label": "Bale weight",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Horse",
              "Cattle",
              "Sheep",
              "Goat"
            ]
          }
        ]
      },
      {
        "name": "Hay",
        "fields": [
          {
            "key": "hay_type",
            "label": "Hay type",
            "type": "select",
            "options": [
              "Alfalfa/Lucerne",
              "Timothy",
              "Ryegrass",
              "Meadow/Mixed grass",
              "Clover",
              "Oat hay",
              "Bermuda",
              "Fescue"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cutting",
            "type": "select",
            "options": [
              "1st cut",
              "2nd cut",
              "3rd cut",
              "4th cut"
            ],
            "help": "Later cuts usually softer/higher protein"
          },
          {
            "key": "bale_type",
            "label": "Bale type",
            "type": "select",
            "options": [
              "Small square",
              "Large square",
              "Round"
            ]
          },
          {
            "key": "bale_weight",
            "label": "Bale weight",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "typ. max 15%"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Horse",
              "Cattle",
              "Sheep",
              "Goat",
              "Rabbit"
            ]
          }
        ]
      },
      {
        "name": "Silage",
        "fields": [
          {
            "key": "crop_source",
            "label": "Crop source",
            "type": "select",
            "options": [
              "Maize/Corn",
              "Grass",
              "Alfalfa/Lucerne",
              "Sorghum",
              "Whole-crop cereal",
              "Clover"
            ],
            "required": true
          },
          {
            "key": "dry_matter_pct",
            "label": "Dry matter",
            "type": "number",
            "unit": "%",
            "help": "Silage typ. 28-40% DM"
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "ph_value",
            "label": "pH",
            "type": "number",
            "help": "Well-fermented ~3.8-4.2"
          },
          {
            "key": "storage_form",
            "label": "Storage / packaging form",
            "type": "select",
            "options": [
              "Clamp/bunker",
              "Round bale wrapped",
              "Square bale wrapped",
              "Bag/tube"
            ]
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle (dairy)",
              "Cattle (beef)",
              "Sheep",
              "Goat"
            ]
          }
        ]
      },
      {
        "name": "Feed salt",
        "fields": [
          {
            "key": "salt_form",
            "label": "Salt form",
            "type": "select",
            "options": [
              "Loose/granular",
              "Salt block/lick",
              "Compressed lick",
              "Fine powder"
            ],
            "required": true
          },
          {
            "key": "nacl_pct",
            "label": "NaCl purity",
            "type": "number",
            "unit": "%",
            "help": "typ. min 97%"
          },
          {
            "key": "fortified_with",
            "label": "Fortified with",
            "type": "multiselect",
            "options": [
              "Iodine",
              "Selenium",
              "Cobalt",
              "Copper",
              "Zinc",
              "Magnesium",
              "None (plain)"
            ]
          },
          {
            "key": "block_weight",
            "label": "Block weight",
            "type": "number",
            "unit": "kg",
            "help": "If block/lick form"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle",
              "Sheep",
              "Goat",
              "Horse",
              "Swine"
            ]
          }
        ]
      },
      {
        "name": "Meal",
        "fields": [
          {
            "key": "meal_source",
            "label": "Meal source",
            "type": "select",
            "options": [
              "Alfalfa/Lucerne meal",
              "Corn gluten meal",
              "Grass meal",
              "Leaf meal (moringa etc.)",
              "Seaweed/kelp meal",
              "Cassava meal"
            ],
            "required": true
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "crude_fiber_pct",
            "label": "Crude fiber",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "particle_grind",
            "label": "Grind / particle size",
            "type": "select",
            "options": [
              "Fine",
              "Medium",
              "Coarse"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Poultry",
              "Cattle",
              "Swine",
              "Fish",
              "Sheep"
            ]
          }
        ]
      },
      {
        "name": "Extruded feed",
        "fields": [
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "select",
            "options": [
              "Fish",
              "Shrimp",
              "Poultry",
              "Swine",
              "Pet (dog/cat)",
              "Cattle"
            ],
            "required": true
          },
          {
            "key": "buoyancy",
            "label": "Buoyancy (aqua)",
            "type": "select",
            "options": [
              "Floating",
              "Sinking",
              "Slow-sinking",
              "N/A"
            ],
            "help": "For fish/shrimp feed"
          },
          {
            "key": "pellet_diameter",
            "label": "Pellet diameter",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "crude_protein_pct",
            "label": "Crude protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "crude_fat_pct",
            "label": "Crude fat",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "energy_me",
            "label": "Energy (ME)",
            "type": "number",
            "unit": "kcal/kg"
          },
          {
            "key": "packaging",
            "label": "Packaging",
            "type": "select",
            "options": [
              "20 kg bag",
              "25 kg bag",
              "40 kg bag",
              "1000 kg big bag"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Meat",
    "emoji": "🥩",
    "slug": "meat",
    "subcategories": [
      {
        "name": "Lamb & mutton",
        "fields": [
          {
            "key": "animal_age",
            "label": "Animal / age class",
            "type": "select",
            "options": [
              "Milk lamb",
              "Lamb (<12 mo)",
              "Hogget (1-2 yr)",
              "Mutton (>2 yr)"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole carcass",
              "Half carcass",
              "Fore-quarter",
              "Hind-quarter",
              "Leg",
              "Shoulder",
              "Rack / rib",
              "Loin / saddle",
              "Shank",
              "Breast / flap",
              "Neck",
              "Trimmings"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Chilled",
              "Frozen"
            ]
          },
          {
            "key": "bone",
            "label": "Bone",
            "type": "select",
            "options": [
              "Bone-in",
              "Boneless"
            ]
          },
          {
            "key": "fat_class",
            "label": "Conformation / fat grade",
            "type": "select",
            "options": [
              "EUROP - E",
              "EUROP - U",
              "EUROP - R",
              "EUROP - O",
              "EUROP - P"
            ],
            "help": "EU sheep carcass classification"
          },
          {
            "key": "religious",
            "label": "Religious slaughter",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton",
              "Wrapped"
            ]
          }
        ]
      },
      {
        "name": "Beef",
        "fields": [
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole carcass",
              "Compensated quarter",
              "Fore-quarter",
              "Hind-quarter",
              "Chuck / blade",
              "Rib",
              "Striploin",
              "Tenderloin",
              "Ribeye / cube roll",
              "Topside / silverside",
              "Rump",
              "Brisket",
              "Shin / shank",
              "Flank",
              "Trimmings (VL)"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Chilled",
              "Frozen"
            ]
          },
          {
            "key": "bone",
            "label": "Bone",
            "type": "select",
            "options": [
              "Bone-in",
              "Boneless"
            ]
          },
          {
            "key": "grade",
            "label": "Quality grade",
            "type": "select",
            "options": [
              "USDA Prime",
              "USDA Choice",
              "USDA Select",
              "EUROP - E",
              "EUROP - U",
              "EUROP - R",
              "EUROP - O",
              "EUROP - P",
              "AUS-MEAT / MSA",
              "Wagyu BMS 6-8",
              "Wagyu BMS 9-12"
            ],
            "required": true,
            "help": "Marbling / conformation scale"
          },
          {
            "key": "vl_ratio",
            "label": "Visual lean (VL) ratio",
            "type": "number",
            "unit": "%",
            "help": "Lean:fat ratio for trimmings, e.g. 90VL"
          },
          {
            "key": "religious",
            "label": "Religious slaughter",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton",
              "Combo bin"
            ]
          }
        ]
      },
      {
        "name": "Sausages",
        "fields": [
          {
            "key": "sausage_type",
            "label": "Sausage type",
            "type": "select",
            "options": [
              "Fresh (raw)",
              "Cooked / boiled",
              "Semi-smoked",
              "Cold-smoked / dry-cured",
              "Liver / blood",
              "Wieners / frankfurter"
            ],
            "required": true
          },
          {
            "key": "meat_species",
            "label": "Meat species",
            "type": "multiselect",
            "options": [
              "Beef",
              "Pork",
              "Chicken",
              "Turkey",
              "Lamb",
              "Horse"
            ]
          },
          {
            "key": "meat_content_pct",
            "label": "Meat content",
            "type": "number",
            "unit": "%",
            "help": "Declared meat/protein content"
          },
          {
            "key": "casing",
            "label": "Casing",
            "type": "select",
            "options": [
              "Natural",
              "Collagen",
              "Cellulose (peel-off)",
              "Fibrous",
              "Plastic / polyamide"
            ]
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Chilled",
              "Frozen",
              "Ambient (shelf-stable)"
            ]
          },
          {
            "key": "religious",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton",
              "Bulk"
            ]
          }
        ]
      },
      {
        "name": "Horse meat",
        "fields": [
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole carcass",
              "Quarter",
              "Neck / mane fat (kazy)",
              "Shoulder",
              "Loin",
              "Leg / hind",
              "Ribs",
              "Trimmings"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Chilled",
              "Frozen"
            ]
          },
          {
            "key": "bone",
            "label": "Bone",
            "type": "select",
            "options": [
              "Bone-in",
              "Boneless"
            ]
          },
          {
            "key": "fat_trim",
            "label": "Fat trim",
            "type": "select",
            "options": [
              "Untrimmed",
              "Semi-trimmed",
              "Fully trimmed"
            ]
          },
          {
            "key": "religious",
            "label": "Religious slaughter",
            "type": "multiselect",
            "options": [
              "Halal"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton"
            ]
          }
        ]
      },
      {
        "name": "Poultry meat",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Chicken (broiler)",
              "Turkey",
              "Duck",
              "Goose",
              "Guinea fowl",
              "Quail"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole carcass",
              "Breast fillet",
              "Breast on-bone",
              "Leg / thigh",
              "Drumstick",
              "Wing",
              "Leg quarter",
              "Fillet strips",
              "Giblets / offal",
              "MDM (mechanically deboned)"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Chilled",
              "Frozen",
              "IQF"
            ]
          },
          {
            "key": "skin",
            "label": "Skin",
            "type": "select",
            "options": [
              "Skin-on",
              "Skinless"
            ]
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Grade A",
              "Grade B",
              "Industrial"
            ]
          },
          {
            "key": "religious",
            "label": "Religious slaughter",
            "type": "multiselect",
            "options": [
              "Halal",
              "Zabiha hand-slaughter",
              "Kosher"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton",
              "IQF poly bag",
              "CVP / shrink"
            ]
          }
        ]
      },
      {
        "name": "Venison",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Red deer",
              "Roe deer",
              "Fallow deer",
              "Sika",
              "Reindeer",
              "Elk / moose"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild / game-shot",
              "Farmed"
            ]
          },
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole carcass",
              "Saddle",
              "Haunch / leg",
              "Shoulder",
              "Loin / backstrap",
              "Rack",
              "Shank",
              "Trimmings"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Chilled",
              "Frozen"
            ]
          },
          {
            "key": "bone",
            "label": "Bone",
            "type": "select",
            "options": [
              "Bone-in",
              "Boneless"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton"
            ]
          }
        ]
      },
      {
        "name": "Semi-finished meat",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Cutlets / patties",
              "Meatballs",
              "Dumplings (pelmeni)",
              "Manti / khinkali",
              "Kebab / skewer",
              "Schnitzel",
              "Nuggets",
              "Minced / ground",
              "Marinated portions",
              "Rolls / roulade"
            ],
            "required": true
          },
          {
            "key": "meat_species",
            "label": "Meat species",
            "type": "multiselect",
            "options": [
              "Beef",
              "Pork",
              "Chicken",
              "Turkey",
              "Lamb",
              "Horse",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Chilled",
              "Frozen",
              "IQF"
            ]
          },
          {
            "key": "preparation",
            "label": "Preparation",
            "type": "multiselect",
            "options": [
              "Raw",
              "Breaded",
              "Marinated",
              "Pre-cooked",
              "Stuffed"
            ]
          },
          {
            "key": "religious",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton",
              "IQF poly bag",
              "Tray"
            ]
          }
        ]
      },
      {
        "name": "Lard",
        "fields": [
          {
            "key": "lard_type",
            "label": "Lard type",
            "type": "select",
            "options": [
              "Back fat (fatback)",
              "Leaf lard (kidney)",
              "Salo (cured slab)",
              "Rendered lard",
              "Caul fat"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Chilled",
              "Frozen"
            ]
          },
          {
            "key": "treatment",
            "label": "Treatment",
            "type": "multiselect",
            "options": [
              "Raw",
              "Salted",
              "Smoked",
              "Spiced",
              "Rendered"
            ]
          },
          {
            "key": "fat_thickness",
            "label": "Slab thickness",
            "type": "number",
            "unit": "mm",
            "help": "Fat layer thickness"
          },
          {
            "key": "skin",
            "label": "Skin / rind",
            "type": "select",
            "options": [
              "Rind-on",
              "Rindless"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "Carton",
              "Block",
              "Bulk"
            ]
          }
        ]
      },
      {
        "name": "Pork",
        "fields": [
          {
            "key": "cut",
            "label": "Cut",
            "type": "select",
            "options": [
              "Whole carcass",
              "Half carcass",
              "Ham / leg",
              "Shoulder / picnic",
              "Loin",
              "Belly",
              "Ribs / spare ribs",
              "Neck / collar",
              "Tenderloin",
              "Hock / knuckle",
              "Head",
              "Trimmings"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Chilled",
              "Frozen"
            ]
          },
          {
            "key": "bone",
            "label": "Bone",
            "type": "select",
            "options": [
              "Bone-in",
              "Boneless"
            ]
          },
          {
            "key": "skin",
            "label": "Skin / rind",
            "type": "select",
            "options": [
              "Rind-on",
              "Rindless"
            ]
          },
          {
            "key": "fat_thickness",
            "label": "Back-fat thickness",
            "type": "number",
            "unit": "mm",
            "help": "Fat cover depth"
          },
          {
            "key": "grade",
            "label": "Grade / lean class",
            "type": "select",
            "options": [
              "SEUROP - S",
              "SEUROP - E",
              "SEUROP - U",
              "SEUROP - R",
              "SEUROP - O",
              "SEUROP - P"
            ],
            "help": "EU pig carcass lean-meat class"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Vacuum",
              "MAP",
              "Carton",
              "Combo bin"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Fish",
    "emoji": "🐟",
    "slug": "fish",
    "subcategories": [
      {
        "name": "Red mullet",
        "fields": [
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild",
              "Farmed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Smoked",
              "Salted",
              "Dried"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT (headed & gutted)",
              "Fillet",
              "Butterfly"
            ]
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless"
            ]
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "<10 pcs/kg",
              "10-20 pcs/kg",
              "20-30 pcs/kg",
              ">30 pcs/kg"
            ],
            "required": true,
            "help": "Count per kg"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%",
            "help": "Ice glaze on frozen product"
          }
        ]
      },
      {
        "name": "Beluga",
        "fields": [
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Live fish",
              "Whole (round)",
              "HGT",
              "Fillet",
              "Steak",
              "Caviar"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild (CITES)",
              "Farmed / aquaculture"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Salted"
            ]
          },
          {
            "key": "weight_band",
            "label": "Weight band",
            "type": "select",
            "options": [
              "1-3 kg",
              "3-5 kg",
              "5-10 kg",
              "10-20 kg",
              ">20 kg"
            ],
            "help": "Per-fish weight"
          },
          {
            "key": "caviar_grade",
            "label": "Caviar grade (if roe)",
            "type": "select",
            "options": [
              "000 (light)",
              "00",
              "0 (dark)",
              "Pressed (payusnaya)"
            ],
            "help": "Bead colour/size grade"
          },
          {
            "key": "cites_permit",
            "label": "CITES permit available",
            "type": "boolean",
            "help": "Required for sturgeon trade"
          }
        ]
      },
      {
        "name": "Pink salmon",
        "fields": [
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild (Pacific)",
              "Farmed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Hot-smoked",
              "Salted"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "H&G with roe",
              "Fillet",
              "Steak",
              "Loin",
              "Mince"
            ],
            "required": true
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless",
              "Trim C"
            ]
          },
          {
            "key": "size_band",
            "label": "Size band",
            "type": "select",
            "options": [
              "<1 kg",
              "1-1.4 kg",
              "1.4-1.8 kg",
              ">1.8 kg"
            ],
            "help": "Whole-fish weight"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "sustainability",
            "label": "Sustainability cert",
            "type": "multiselect",
            "options": [
              "MSC",
              "ASC"
            ]
          }
        ]
      },
      {
        "name": "Fish roe",
        "fields": [
          {
            "key": "roe_species",
            "label": "Source species",
            "type": "select",
            "options": [
              "Salmon (red / ikra)",
              "Pollock",
              "Capelin (masago)",
              "Flying fish (tobiko)",
              "Herring",
              "Sturgeon (black)",
              "Trout",
              "Cod"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Salted",
              "Frozen",
              "Pasteurised",
              "Marinated / seasoned",
              "Smoked"
            ],
            "required": true
          },
          {
            "key": "grain_state",
            "label": "Grain state",
            "type": "select",
            "options": [
              "Loose grain",
              "In skein / roe sac",
              "Pressed"
            ]
          },
          {
            "key": "salt_pct",
            "label": "Salt content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "1st grade",
              "2nd grade",
              "Premium / select"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging",
            "type": "select",
            "options": [
              "Tin / can",
              "Glass jar",
              "Plastic tub",
              "Vacuum",
              "Bulk drum"
            ]
          }
        ]
      },
      {
        "name": "Carp",
        "fields": [
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Farmed (pond)",
              "Wild"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Smoked",
              "Salted",
              "Dried"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "Fillet",
              "Steak",
              "Mince"
            ],
            "required": true
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless"
            ]
          },
          {
            "key": "size_band",
            "label": "Size band",
            "type": "select",
            "options": [
              "0.5-1 kg",
              "1-2 kg",
              "2-3 kg",
              ">3 kg"
            ],
            "help": "Whole-fish weight"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Chum salmon",
        "fields": [
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild (Pacific)",
              "Farmed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Hot-smoked",
              "Salted"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "H&G with roe",
              "Fillet",
              "Steak",
              "Loin",
              "Mince"
            ],
            "required": true
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless",
              "Trim C"
            ]
          },
          {
            "key": "size_band",
            "label": "Size band",
            "type": "select",
            "options": [
              "1-2 kg",
              "2-3 kg",
              "3-4 kg",
              ">4 kg"
            ],
            "help": "Whole-fish weight"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "sustainability",
            "label": "Sustainability cert",
            "type": "multiselect",
            "options": [
              "MSC",
              "ASC"
            ]
          }
        ]
      },
      {
        "name": "Mullet",
        "fields": [
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild",
              "Farmed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Smoked",
              "Salted",
              "Dried"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "H&G with roe (bottarga)",
              "Fillet",
              "Steak"
            ],
            "required": true
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless"
            ]
          },
          {
            "key": "size_band",
            "label": "Size band",
            "type": "select",
            "options": [
              "<0.3 kg",
              "0.3-0.6 kg",
              "0.6-1 kg",
              ">1 kg"
            ],
            "help": "Whole-fish weight"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Coho salmon",
        "fields": [
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild (Pacific)",
              "Farmed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Hot-smoked",
              "Salted"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "Fillet",
              "Steak",
              "Loin",
              "Mince"
            ],
            "required": true
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless",
              "Trim C"
            ]
          },
          {
            "key": "size_band",
            "label": "Size band",
            "type": "select",
            "options": [
              "1.2-1.8 kg",
              "1.8-2.7 kg",
              "2.7-3.6 kg",
              ">3.6 kg"
            ],
            "help": "Whole-fish weight"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "sustainability",
            "label": "Sustainability cert",
            "type": "multiselect",
            "options": [
              "MSC",
              "ASC"
            ]
          }
        ]
      },
      {
        "name": "Molluscs & crustaceans",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Shrimp / prawn",
              "Squid",
              "Octopus",
              "Mussel",
              "Oyster",
              "Scallop",
              "Crab",
              "Lobster",
              "Crayfish",
              "Clam / vongole",
              "Cuttlefish"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild",
              "Farmed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cooked & frozen",
              "Salted",
              "Dried"
            ]
          },
          {
            "key": "form",
            "label": "Form / dressing",
            "type": "select",
            "options": [
              "Whole",
              "Headless shell-on (HLSO)",
              "Peeled undeveined (PUD)",
              "Peeled deveined (PD)",
              "Peeled deveined tail-on (PDTO)",
              "Meat only",
              "Rings / tubes",
              "Half-shell"
            ]
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "text",
            "help": "Count per kg or US count, e.g. 16/20, 21/25, U/10"
          },
          {
            "key": "cook_state",
            "label": "Cook state",
            "type": "select",
            "options": [
              "Raw",
              "Cooked"
            ]
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Seafood",
        "fields": [
          {
            "key": "product_group",
            "label": "Product group",
            "type": "select",
            "options": [
              "Mixed seafood cocktail",
              "Surimi / crab sticks",
              "Breaded seafood",
              "Seaweed / algae",
              "Sea urchin",
              "Prepared / ready-meal",
              "Other"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild",
              "Farmed"
            ]
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cooked & frozen",
              "Smoked",
              "Salted",
              "Dried",
              "Ambient / canned"
            ]
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole",
              "Fillet",
              "Pieces / cuts",
              "Mince",
              "Breaded",
              "Cooked ready-to-eat"
            ]
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "sustainability",
            "label": "Sustainability cert",
            "type": "multiselect",
            "options": [
              "MSC",
              "ASC"
            ]
          }
        ]
      },
      {
        "name": "Sturgeon",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Russian sturgeon",
              "Siberian sturgeon",
              "Sterlet",
              "Stellate (sevruga)",
              "Beluga",
              "Hybrid (bester)"
            ],
            "required": true
          },
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Live fish",
              "Whole (round)",
              "HGT",
              "Fillet",
              "Steak",
              "Loin",
              "Balyk",
              "Caviar"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild (CITES)",
              "Farmed / aquaculture"
            ]
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Salted"
            ]
          },
          {
            "key": "weight_band",
            "label": "Weight band",
            "type": "select",
            "options": [
              "1-2 kg",
              "2-4 kg",
              "4-8 kg",
              ">8 kg"
            ],
            "help": "Per-fish weight"
          },
          {
            "key": "cites_permit",
            "label": "CITES permit available",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Peled",
        "fields": [
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild",
              "Farmed"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Hot-smoked",
              "Salted",
              "Dried"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "Fillet",
              "Butterfly"
            ],
            "required": true
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless"
            ]
          },
          {
            "key": "size_band",
            "label": "Size band",
            "type": "select",
            "options": [
              "<0.2 kg",
              "0.2-0.4 kg",
              "0.4-0.7 kg",
              ">0.7 kg"
            ],
            "help": "Whole-fish weight"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Fish by-products",
        "fields": [
          {
            "key": "byproduct_type",
            "label": "By-product type",
            "type": "select",
            "options": [
              "Heads",
              "Frames / backbones",
              "Trimmings",
              "Skins",
              "Bellies / flaps",
              "Fishmeal",
              "Fish oil",
              "Roe / milt",
              "Fish protein hydrolysate"
            ],
            "required": true
          },
          {
            "key": "intended_use",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Human consumption",
              "Animal feed",
              "Pet food",
              "Aquafeed",
              "Fertiliser",
              "Industrial / pharma"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (block)",
              "Dried / meal",
              "Ensiled / liquid"
            ]
          },
          {
            "key": "protein_pct",
            "label": "Protein content",
            "type": "number",
            "unit": "%",
            "help": "Dry-basis for meal"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "packaging_format",
            "label": "Packaging",
            "type": "select",
            "options": [
              "Block carton",
              "Bulk bag / FIBC",
              "Poly bag",
              "Drum / IBC"
            ]
          }
        ]
      },
      {
        "name": "Mackerel",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Atlantic mackerel",
              "Pacific / chub mackerel",
              "Horse mackerel (scad)",
              "King mackerel"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Wild",
              "Farmed"
            ]
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Hot-smoked",
              "Salted"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "Fillet",
              "Flaps / butterfly",
              "Steak",
              "Mince"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "100-200 g",
              "200-300 g",
              "300-400 g",
              "400-500 g",
              ">500 g"
            ],
            "help": "Whole-fish weight band"
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "help": "Key spec for pelagic buyers"
          },
          {
            "key": "glaze_pct",
            "label": "Glaze",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Fish mince",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "select",
            "options": [
              "Pollock (surimi)",
              "Hake",
              "Cod",
              "Blue whiting",
              "Tilapia",
              "Mixed white fish",
              "Salmon"
            ],
            "required": true
          },
          {
            "key": "product_grade",
            "label": "Grade",
            "type": "select",
            "options": [
              "Surimi SA",
              "Surimi FA",
              "Surimi RA",
              "Minced fish (mince)",
              "Industrial"
            ],
            "help": "Surimi gel-strength grades"
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Fresh",
              "Frozen (block)",
              "Frozen (IQF)"
            ],
            "required": true
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "additives",
            "label": "Additives",
            "type": "multiselect",
            "options": [
              "None / additive-free",
              "Cryoprotectant (sugar/sorbitol)",
              "Phosphate",
              "Salt"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging",
            "type": "select",
            "options": [
              "Block carton",
              "Poly bag",
              "Bulk / FIBC"
            ]
          }
        ]
      },
      {
        "name": "Trout",
        "fields": [
          {
            "key": "species",
            "label": "Species / type",
            "type": "select",
            "options": [
              "Rainbow trout",
              "Sea trout",
              "Brown trout",
              "Brook trout",
              "Steelhead"
            ],
            "required": true
          },
          {
            "key": "origin_type",
            "label": "Origin",
            "type": "select",
            "options": [
              "Farmed",
              "Wild"
            ],
            "required": true
          },
          {
            "key": "chill_state",
            "label": "Chill state",
            "type": "select",
            "options": [
              "Live",
              "Fresh",
              "Frozen (IQF)",
              "Frozen (block)",
              "Cold-smoked",
              "Hot-smoked",
              "Salted"
            ]
          },
          {
            "key": "cut",
            "label": "Cut / dressing",
            "type": "select",
            "options": [
              "Whole (round)",
              "HGT",
              "Fillet",
              "Steak",
              "Loin",
              "Butterfly",
              "Mince"
            ]
          },
          {
            "key": "skin_bone",
            "label": "Skin / bone",
            "type": "select",
            "options": [
              "PBO (skinless boneless)",
              "PBI (skin-on bone-in)",
              "Skin-on boneless",
              "Trim C"
            ]
          },
          {
            "key": "size_band",
            "label": "Size band",
            "type": "select",
            "options": [
              "<0.3 kg",
              "0.3-1 kg",
              "1-2 kg",
              "2-4 kg",
              ">4 kg"
            ],
            "help": "Whole-fish weight"
          },
          {
            "key": "sustainability",
            "label": "Sustainability cert",
            "type": "multiselect",
            "options": [
              "ASC",
              "MSC"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Dairy products",
    "emoji": "🥛",
    "slug": "dairy",
    "subcategories": [
      {
        "name": "Yogurt",
        "fields": [
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ],
            "required": true
          },
          {
            "key": "style",
            "label": "Style",
            "type": "select",
            "options": [
              "Set",
              "Stirred",
              "Greek / strained",
              "Drinking",
              "Kefir-style"
            ],
            "required": true
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "help": "Milkfat by weight"
          },
          {
            "key": "treatment",
            "label": "Milk treatment",
            "type": "select",
            "options": [
              "Raw",
              "Pasteurized",
              "UHT"
            ]
          },
          {
            "key": "flavor",
            "label": "Flavor",
            "type": "select",
            "options": [
              "Plain / natural",
              "Vanilla",
              "Fruit",
              "Honey",
              "Other"
            ]
          },
          {
            "key": "live_cultures",
            "label": "Live / active cultures",
            "type": "boolean",
            "help": "Contains viable probiotic cultures"
          },
          {
            "key": "religious_cert",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          }
        ]
      },
      {
        "name": "Milk",
        "fields": [
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ],
            "required": true
          },
          {
            "key": "treatment",
            "label": "Treatment",
            "type": "select",
            "options": [
              "Raw",
              "Pasteurized",
              "UHT",
              "ESL"
            ],
            "required": true
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "help": "e.g. 0.5 skim, 1.5, 3.2 whole"
          },
          {
            "key": "homogenized",
            "label": "Homogenized",
            "type": "boolean"
          },
          {
            "key": "snf_pct",
            "label": "Solids-not-fat (SNF)",
            "type": "number",
            "unit": "%",
            "help": "Non-fat milk solids"
          },
          {
            "key": "storage_temp_c",
            "label": "Storage temperature",
            "type": "number",
            "unit": "°C",
            "help": "Recommended hold temperature"
          }
        ]
      },
      {
        "name": "Powdered milk",
        "fields": [
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ],
            "required": true
          },
          {
            "key": "powder_type",
            "label": "Powder type",
            "type": "select",
            "options": [
              "Skimmed (SMP)",
              "Whole (WMP)",
              "Buttermilk (BMP)",
              "Fat-filled (FFMP)",
              "Instant"
            ],
            "required": true
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "help": "e.g. ~26% WMP, ~1% SMP"
          },
          {
            "key": "heat_class",
            "label": "Heat classification",
            "type": "select",
            "options": [
              "Low heat",
              "Medium heat",
              "High heat",
              "High-heat heat-stable"
            ],
            "help": "WPNI-based heat treatment class"
          },
          {
            "key": "solubility_index",
            "label": "Insolubility index",
            "type": "number",
            "unit": "ml",
            "help": "ADPI solubility index"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "religious_cert",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          }
        ]
      },
      {
        "name": "Milk fat",
        "fields": [
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Butter",
              "Anhydrous milk fat (AMF)",
              "Butter oil",
              "Ghee",
              "Butteroil fraction"
            ],
            "required": true
          },
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ]
          },
          {
            "key": "milkfat_pct",
            "label": "Milkfat content",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "e.g. 82% butter, 99.8% AMF"
          },
          {
            "key": "salt",
            "label": "Salted",
            "type": "boolean",
            "help": "Salted vs unsalted"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "religious_cert",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          }
        ]
      },
      {
        "name": "Ice cream",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Ice cream",
              "Gelato",
              "Frozen yogurt",
              "Sorbet",
              "Sherbet",
              "Non-dairy frozen dessert"
            ],
            "required": true
          },
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ]
          },
          {
            "key": "milkfat_pct",
            "label": "Milkfat content",
            "type": "number",
            "unit": "%",
            "help": "Standard ice cream ≥10%"
          },
          {
            "key": "overrun_pct",
            "label": "Overrun",
            "type": "number",
            "unit": "%",
            "help": "Air incorporation by volume"
          },
          {
            "key": "flavor",
            "label": "Flavor",
            "type": "text",
            "help": "e.g. Vanilla, Chocolate, Mango"
          },
          {
            "key": "storage_temp_c",
            "label": "Storage temperature",
            "type": "number",
            "unit": "°C",
            "help": "Typically -18 to -25"
          },
          {
            "key": "religious_cert",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          }
        ]
      },
      {
        "name": "Condensed milk",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Sweetened condensed",
              "Evaporated (unsweetened)"
            ],
            "required": true
          },
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ]
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "help": "Whole vs skimmed base"
          },
          {
            "key": "sugar_pct",
            "label": "Added sugar",
            "type": "number",
            "unit": "%",
            "help": "For sweetened type"
          },
          {
            "key": "total_solids_pct",
            "label": "Total milk solids",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "religious_cert",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          }
        ]
      },
      {
        "name": "Cream",
        "fields": [
          {
            "key": "cream_type",
            "label": "Cream type",
            "type": "select",
            "options": [
              "Half-and-half",
              "Single / light",
              "Whipping",
              "Heavy / double",
              "Clotted",
              "Sterilized"
            ],
            "required": true
          },
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ]
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "e.g. 18% single, 36%+ heavy"
          },
          {
            "key": "treatment",
            "label": "Treatment",
            "type": "select",
            "options": [
              "Raw",
              "Pasteurized",
              "UHT"
            ]
          },
          {
            "key": "storage_temp_c",
            "label": "Storage temperature",
            "type": "number",
            "unit": "°C"
          }
        ]
      },
      {
        "name": "Sour cream",
        "fields": [
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel"
            ],
            "required": true
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "e.g. 10, 15, 20, 30"
          },
          {
            "key": "style",
            "label": "Style",
            "type": "select",
            "options": [
              "Regular",
              "Light / low-fat",
              "Full-fat",
              "Cultured crème fraîche"
            ]
          },
          {
            "key": "treatment",
            "label": "Cream treatment",
            "type": "select",
            "options": [
              "Pasteurized",
              "UHT"
            ]
          },
          {
            "key": "live_cultures",
            "label": "Live cultures",
            "type": "boolean"
          },
          {
            "key": "religious_cert",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          }
        ]
      },
      {
        "name": "Dry whey",
        "fields": [
          {
            "key": "whey_type",
            "label": "Whey type",
            "type": "select",
            "options": [
              "Sweet whey",
              "Acid whey",
              "Whey protein concentrate (WPC)",
              "Whey protein isolate (WPI)",
              "Demineralized whey",
              "Whey permeate"
            ],
            "required": true
          },
          {
            "key": "protein_pct",
            "label": "Protein content",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "e.g. WPC34, WPC80, WPI90"
          },
          {
            "key": "demineralization",
            "label": "Demineralization",
            "type": "select",
            "options": [
              "Non-demin",
              "D40",
              "D50",
              "D70",
              "D90"
            ],
            "help": "Ash-reduction level"
          },
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "lactose_pct",
            "label": "Lactose content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Cheese",
        "fields": [
          {
            "key": "milk_source",
            "label": "Milk source",
            "type": "select",
            "options": [
              "Cow",
              "Buffalo",
              "Goat",
              "Sheep",
              "Camel",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "texture",
            "label": "Texture class",
            "type": "select",
            "options": [
              "Hard",
              "Semi-hard",
              "Soft",
              "Brined",
              "Fresh",
              "Blue-veined"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / type",
            "type": "text",
            "help": "e.g. Cheddar, Mozzarella, Feta, Gouda"
          },
          {
            "key": "age_months",
            "label": "Aging / maturity",
            "type": "number",
            "unit": "months"
          },
          {
            "key": "fat_in_dry_matter_pct",
            "label": "Fat in dry matter (FDM)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "treatment",
            "label": "Milk treatment",
            "type": "select",
            "options": [
              "Raw",
              "Pasteurized"
            ]
          },
          {
            "key": "religious_cert",
            "label": "Religious certification",
            "type": "multiselect",
            "options": [
              "Halal",
              "Kosher"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Live animals & poultry",
    "emoji": "🐄",
    "slug": "live",
    "subcategories": [
      {
        "name": "Goats",
        "fields": [
          {
            "key": "breed",
            "label": "Breed",
            "type": "text",
            "help": "e.g. Boer, Saanen, Nubian, Jamnapari, Black Bengal"
          },
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Breeding",
              "Dairy",
              "Meat / fattening",
              "Draft",
              "Fibre (mohair/cashmere)"
            ],
            "required": true
          },
          {
            "key": "sex",
            "label": "Sex",
            "type": "select",
            "options": [
              "Male",
              "Female",
              "Mixed"
            ]
          },
          {
            "key": "age_months",
            "label": "Age",
            "type": "number",
            "unit": "months"
          },
          {
            "key": "live_weight_kg",
            "label": "Live weight per head",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "health_status",
            "label": "Health / vet status",
            "type": "multiselect",
            "options": [
              "Vaccinated (PPR/FMD)",
              "Dewormed",
              "Vet certificate",
              "Brucellosis-tested",
              "Not certified"
            ]
          }
        ]
      },
      {
        "name": "Cattle",
        "fields": [
          {
            "key": "breed",
            "label": "Breed",
            "type": "text",
            "help": "e.g. Holstein-Friesian, Angus, Brahman, Gir, Sahiwal"
          },
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Breeding",
              "Dairy",
              "Meat / fattening",
              "Draft"
            ],
            "required": true
          },
          {
            "key": "sex",
            "label": "Sex",
            "type": "select",
            "options": [
              "Male (bull/steer)",
              "Female (cow/heifer)",
              "Mixed"
            ]
          },
          {
            "key": "age_months",
            "label": "Age",
            "type": "number",
            "unit": "months"
          },
          {
            "key": "live_weight_kg",
            "label": "Live weight per head",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "pregnancy_status",
            "label": "Pregnancy status",
            "type": "select",
            "options": [
              "Not applicable",
              "Open (not bred)",
              "Bred / in-calf",
              "Fresh (recently calved)"
            ]
          },
          {
            "key": "health_status",
            "label": "Health / vet status",
            "type": "multiselect",
            "options": [
              "Vaccinated (FMD)",
              "Dewormed",
              "Vet certificate",
              "Brucellosis-tested",
              "TB-tested",
              "Not certified"
            ]
          }
        ]
      },
      {
        "name": "Rabbits",
        "fields": [
          {
            "key": "breed",
            "label": "Breed",
            "type": "text",
            "help": "e.g. New Zealand White, Californian, Flemish Giant, Rex"
          },
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Breeding",
              "Meat / fattening",
              "Fur",
              "Laboratory"
            ],
            "required": true
          },
          {
            "key": "sex",
            "label": "Sex",
            "type": "select",
            "options": [
              "Male (buck)",
              "Female (doe)",
              "Mixed"
            ]
          },
          {
            "key": "age_weeks",
            "label": "Age",
            "type": "number",
            "unit": "weeks"
          },
          {
            "key": "live_weight_kg",
            "label": "Live weight per head",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "health_status",
            "label": "Health / vet status",
            "type": "multiselect",
            "options": [
              "Vaccinated (RHD/myxomatosis)",
              "Vet certificate",
              "Not certified"
            ]
          }
        ]
      },
      {
        "name": "Horses",
        "fields": [
          {
            "key": "breed",
            "label": "Breed",
            "type": "text",
            "help": "e.g. Arabian, Thoroughbred, Marwari, Percheron"
          },
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Breeding",
              "Draft / work",
              "Riding / sport",
              "Racing",
              "Meat"
            ],
            "required": true
          },
          {
            "key": "sex",
            "label": "Sex",
            "type": "select",
            "options": [
              "Stallion",
              "Gelding",
              "Mare",
              "Mixed"
            ]
          },
          {
            "key": "age_years",
            "label": "Age",
            "type": "number",
            "unit": "years"
          },
          {
            "key": "height_hands",
            "label": "Height",
            "type": "number",
            "unit": "hands",
            "help": "1 hand = 4 inches (10.16 cm)"
          },
          {
            "key": "training_level",
            "label": "Training level",
            "type": "select",
            "options": [
              "Unbroken",
              "Green-broke",
              "Broke to saddle",
              "Broke to harness",
              "Trained / competition"
            ]
          },
          {
            "key": "health_status",
            "label": "Health / vet status",
            "type": "multiselect",
            "options": [
              "Vaccinated (EIA/tetanus)",
              "Coggins-tested",
              "Vet certificate",
              "Not certified"
            ]
          }
        ]
      },
      {
        "name": "Fish fry",
        "fields": [
          {
            "key": "species",
            "label": "Species",
            "type": "text",
            "required": true,
            "help": "e.g. Tilapia, Rohu, Catla, Pangasius, Common carp, Shrimp PL"
          },
          {
            "key": "stage",
            "label": "Life stage",
            "type": "select",
            "options": [
              "Egg",
              "Hatchling / spawn",
              "Fry",
              "Fingerling",
              "Advanced fingerling",
              "Post-larvae (PL)"
            ],
            "required": true
          },
          {
            "key": "size_mm",
            "label": "Average size / length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "count_per_unit",
            "label": "Count per unit",
            "type": "number",
            "help": "Fry per 1000 / per bag"
          },
          {
            "key": "sex_reversed",
            "label": "Mono-sex / sex-reversed",
            "type": "boolean",
            "help": "e.g. all-male tilapia"
          },
          {
            "key": "health_status",
            "label": "Health / hatchery status",
            "type": "multiselect",
            "options": [
              "SPF (specific-pathogen-free)",
              "Disease-screened",
              "Hatchery-certified",
              "Acclimatised",
              "Not certified"
            ]
          }
        ]
      },
      {
        "name": "Sheep",
        "fields": [
          {
            "key": "breed",
            "label": "Breed",
            "type": "text",
            "help": "e.g. Merino, Dorper, Suffolk, Awassi, Katahdin"
          },
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Breeding",
              "Meat / fattening",
              "Wool",
              "Dairy"
            ],
            "required": true
          },
          {
            "key": "sex",
            "label": "Sex",
            "type": "select",
            "options": [
              "Male (ram/wether)",
              "Female (ewe)",
              "Mixed"
            ]
          },
          {
            "key": "age_months",
            "label": "Age",
            "type": "number",
            "unit": "months"
          },
          {
            "key": "live_weight_kg",
            "label": "Live weight per head",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "wool_micron",
            "label": "Wool fineness",
            "type": "number",
            "unit": "micron",
            "help": "Fibre diameter; lower = finer (Merino ~18-24)"
          },
          {
            "key": "health_status",
            "label": "Health / vet status",
            "type": "multiselect",
            "options": [
              "Vaccinated (PPR/FMD)",
              "Dewormed",
              "Vet certificate",
              "Brucellosis-tested",
              "Not certified"
            ]
          }
        ]
      },
      {
        "name": "Poultry (live)",
        "fields": [
          {
            "key": "species_breed",
            "label": "Species / breed",
            "type": "text",
            "required": true,
            "help": "e.g. Broiler (Cobb 500), Layer (Lohmann), Kadaknath, Turkey, Duck"
          },
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Breeding / parent stock",
              "Laying",
              "Meat / fattening",
              "Dual-purpose"
            ],
            "required": true
          },
          {
            "key": "stage",
            "label": "Life stage",
            "type": "select",
            "options": [
              "Day-old chick (DOC)",
              "Grower / pullet",
              "Point-of-lay",
              "Adult / spent"
            ]
          },
          {
            "key": "sex",
            "label": "Sex",
            "type": "select",
            "options": [
              "Male",
              "Female",
              "Straight-run (unsexed)"
            ]
          },
          {
            "key": "live_weight_kg",
            "label": "Live weight per head",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "health_status",
            "label": "Health / vet status",
            "type": "multiselect",
            "options": [
              "Vaccinated (Newcastle/Marek/IB)",
              "Debeaked",
              "NPIP / vet certificate",
              "Not certified"
            ]
          }
        ]
      },
      {
        "name": "Pigs",
        "fields": [
          {
            "key": "breed",
            "label": "Breed",
            "type": "text",
            "help": "e.g. Large White (Yorkshire), Landrace, Duroc, Hampshire"
          },
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Breeding",
              "Meat / fattening",
              "Weaner / feeder"
            ],
            "required": true
          },
          {
            "key": "sex",
            "label": "Sex",
            "type": "select",
            "options": [
              "Male (boar)",
              "Barrow (castrated)",
              "Female (gilt/sow)",
              "Mixed"
            ]
          },
          {
            "key": "age_weeks",
            "label": "Age",
            "type": "number",
            "unit": "weeks"
          },
          {
            "key": "live_weight_kg",
            "label": "Live weight per head",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "health_status",
            "label": "Health / vet status",
            "type": "multiselect",
            "options": [
              "Vaccinated (CSF/FMD)",
              "Dewormed",
              "ASF-free zone",
              "PRRS-negative",
              "Vet certificate",
              "Not certified"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Eggs",
    "emoji": "🥚",
    "slug": "eggs",
    "subcategories": [
      {
        "name": "Goose eggs",
        "fields": [
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Table / eating",
              "Hatching"
            ],
            "required": true
          },
          {
            "key": "weight_g",
            "label": "Average weight",
            "type": "number",
            "unit": "g",
            "help": "Goose eggs typically 140-200 g"
          },
          {
            "key": "shell_color",
            "label": "Shell color",
            "type": "select",
            "options": [
              "White",
              "Cream",
              "Off-white"
            ]
          },
          {
            "key": "farming_system",
            "label": "Farming system",
            "type": "select",
            "options": [
              "Free-range",
              "Barn",
              "Organic",
              "Cage"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay / production date",
            "type": "date"
          },
          {
            "key": "tray_count",
            "label": "Eggs per tray / pack",
            "type": "number",
            "help": "Count per packaging unit"
          }
        ]
      },
      {
        "name": "Hatching eggs",
        "fields": [
          {
            "key": "species_breed",
            "label": "Species / breed",
            "type": "text",
            "required": true,
            "help": "e.g. Ross 308 broiler, Lohmann layer, Pekin duck"
          },
          {
            "key": "fertility_pct",
            "label": "Fertility rate",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "Guaranteed fertile percentage"
          },
          {
            "key": "hatchability_pct",
            "label": "Hatchability",
            "type": "number",
            "unit": "%",
            "help": "Expected hatch of fertile eggs"
          },
          {
            "key": "flock_age_weeks",
            "label": "Breeder flock age",
            "type": "number",
            "unit": "weeks"
          },
          {
            "key": "spf_status",
            "label": "SPF / health status",
            "type": "select",
            "options": [
              "SPF (specific-pathogen-free)",
              "Vaccinated flock",
              "Standard commercial"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay date",
            "type": "date",
            "help": "Freshness critical for hatch"
          },
          {
            "key": "tray_count",
            "label": "Eggs per setter tray",
            "type": "number"
          }
        ]
      },
      {
        "name": "Turkey eggs",
        "fields": [
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Table / eating",
              "Hatching"
            ],
            "required": true
          },
          {
            "key": "weight_g",
            "label": "Average weight",
            "type": "number",
            "unit": "g",
            "help": "Turkey eggs typically 80-90 g"
          },
          {
            "key": "shell_color",
            "label": "Shell color",
            "type": "select",
            "options": [
              "Cream speckled",
              "Brown speckled",
              "White"
            ]
          },
          {
            "key": "farming_system",
            "label": "Farming system",
            "type": "select",
            "options": [
              "Free-range",
              "Barn",
              "Organic",
              "Cage"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay / production date",
            "type": "date"
          },
          {
            "key": "tray_count",
            "label": "Eggs per tray / pack",
            "type": "number"
          }
        ]
      },
      {
        "name": "Chicken eggs",
        "fields": [
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Table / eating",
              "Hatching"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size grade",
            "type": "select",
            "options": [
              "S (<53 g)",
              "M (53-63 g)",
              "L (63-73 g)",
              "XL (>73 g)"
            ],
            "required": true,
            "help": "EU weight grades"
          },
          {
            "key": "shell_color",
            "label": "Shell color",
            "type": "select",
            "options": [
              "White",
              "Brown"
            ]
          },
          {
            "key": "farming_system",
            "label": "Farming system",
            "type": "select",
            "options": [
              "Cage / enriched cage",
              "Barn",
              "Free-range",
              "Organic"
            ]
          },
          {
            "key": "quality_class",
            "label": "Quality class",
            "type": "select",
            "options": [
              "Class A (fresh)",
              "Class B (industrial)"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay / production date",
            "type": "date"
          },
          {
            "key": "tray_count",
            "label": "Eggs per tray / pack",
            "type": "number",
            "help": "e.g. 30-egg tray"
          }
        ]
      },
      {
        "name": "Quail eggs",
        "fields": [
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Table / eating",
              "Hatching"
            ],
            "required": true
          },
          {
            "key": "weight_g",
            "label": "Average weight",
            "type": "number",
            "unit": "g",
            "help": "Quail eggs typically 9-14 g"
          },
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Fresh in-shell",
              "Boiled peeled (brine/canned)",
              "Pickled"
            ]
          },
          {
            "key": "farming_system",
            "label": "Farming system",
            "type": "select",
            "options": [
              "Cage",
              "Barn",
              "Free-range",
              "Organic"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay / production date",
            "type": "date"
          },
          {
            "key": "tray_count",
            "label": "Eggs per tray / pack",
            "type": "number",
            "help": "Often 18 or 20 per pack"
          }
        ]
      },
      {
        "name": "Ostrich eggs",
        "fields": [
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Table / eating",
              "Hatching",
              "Decorative / craft (blown)"
            ],
            "required": true
          },
          {
            "key": "weight_g",
            "label": "Average weight",
            "type": "number",
            "unit": "g",
            "help": "Ostrich eggs typically 1300-1900 g"
          },
          {
            "key": "shell_color",
            "label": "Shell color",
            "type": "select",
            "options": [
              "Cream",
              "White",
              "Glossy cream"
            ]
          },
          {
            "key": "farming_system",
            "label": "Farming system",
            "type": "select",
            "options": [
              "Free-range",
              "Organic",
              "Barn"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay / production date",
            "type": "date"
          },
          {
            "key": "tray_count",
            "label": "Eggs per pack",
            "type": "number"
          }
        ]
      },
      {
        "name": "Duck eggs",
        "fields": [
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Table / eating",
              "Hatching"
            ],
            "required": true
          },
          {
            "key": "size_grade",
            "label": "Size / weight",
            "type": "number",
            "unit": "g",
            "help": "Duck eggs typically 70-100 g"
          },
          {
            "key": "shell_color",
            "label": "Shell color",
            "type": "select",
            "options": [
              "White",
              "Blue-green",
              "Grey",
              "Cream"
            ]
          },
          {
            "key": "farming_system",
            "label": "Farming system",
            "type": "select",
            "options": [
              "Free-range",
              "Barn",
              "Organic",
              "Cage"
            ]
          },
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Fresh",
              "Salted",
              "Century / preserved (pidan)"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay / production date",
            "type": "date"
          },
          {
            "key": "tray_count",
            "label": "Eggs per tray / pack",
            "type": "number"
          }
        ]
      },
      {
        "name": "Guinea fowl eggs",
        "fields": [
          {
            "key": "purpose",
            "label": "Purpose",
            "type": "select",
            "options": [
              "Table / eating",
              "Hatching"
            ],
            "required": true
          },
          {
            "key": "weight_g",
            "label": "Average weight",
            "type": "number",
            "unit": "g",
            "help": "Guinea fowl eggs typically 40-50 g"
          },
          {
            "key": "shell_color",
            "label": "Shell color",
            "type": "select",
            "options": [
              "Brown speckled",
              "Cream speckled",
              "Light brown"
            ]
          },
          {
            "key": "farming_system",
            "label": "Farming system",
            "type": "select",
            "options": [
              "Free-range",
              "Barn",
              "Organic",
              "Cage"
            ]
          },
          {
            "key": "lay_date",
            "label": "Lay / production date",
            "type": "date"
          },
          {
            "key": "tray_count",
            "label": "Eggs per tray / pack",
            "type": "number"
          }
        ]
      }
    ]
  },
  {
    "name": "Seeds & planting material",
    "emoji": "🌱",
    "slug": "seeds",
    "subcategories": [
      {
        "name": "Seed potato",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Bellarosa, Gala, Riviera, Agata"
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic (PB)",
              "Basic / Super Elite (SE)",
              "Basic / Elite (E)",
              "Certified A (CA)",
              "Certified B (CB)",
              "Standard"
            ],
            "required": true,
            "help": "Certification generation"
          },
          {
            "key": "caliber_mm",
            "label": "Tuber caliber",
            "type": "select",
            "unit": "mm",
            "options": [
              "28–35",
              "35–45",
              "45–55",
              "55+"
            ],
            "help": "Seed-tuber size grade"
          },
          {
            "key": "maturity_group",
            "label": "Maturity group",
            "type": "select",
            "options": [
              "Very early",
              "Early",
              "Mid-early",
              "Mid-late",
              "Late"
            ]
          },
          {
            "key": "sprouting_status",
            "label": "Sprouting status",
            "type": "select",
            "options": [
              "Dormant",
              "Chitted / pre-sprouted",
              "Sprouted"
            ]
          },
          {
            "key": "virus_free_tested",
            "label": "Virus-tested (PVY/PLRV)",
            "type": "boolean",
            "help": "Lab-tested free of seed-borne viruses"
          }
        ]
      },
      {
        "name": "Onion picks",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Stuttgarter, Sturon, Centurion"
          },
          {
            "key": "bulb_size_mm",
            "label": "Pick diameter",
            "type": "select",
            "unit": "mm",
            "options": [
              "7–14",
              "14–21",
              "21–24",
              "24+"
            ],
            "required": true,
            "help": "Diameter grade of planting bulblet"
          },
          {
            "key": "skin_color",
            "label": "Skin colour",
            "type": "select",
            "options": [
              "Yellow / brown",
              "Red",
              "White"
            ]
          },
          {
            "key": "heat_treated",
            "label": "Heat-treated (anti-bolt)",
            "type": "boolean",
            "help": "Thermal treatment to suppress bolting"
          },
          {
            "key": "day_length_type",
            "label": "Day-length type",
            "type": "select",
            "options": [
              "Long-day",
              "Intermediate-day",
              "Short-day"
            ]
          }
        ]
      },
      {
        "name": "Onion sets",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Sturon, Stuttgarter Riesen, Red Baron"
          },
          {
            "key": "set_size_mm",
            "label": "Set diameter",
            "type": "select",
            "unit": "mm",
            "options": [
              "10–14",
              "14–21",
              "21–24",
              "24–35"
            ],
            "required": true,
            "help": "Bulb-set size grade"
          },
          {
            "key": "skin_color",
            "label": "Skin colour",
            "type": "select",
            "options": [
              "Yellow / brown",
              "Red",
              "White"
            ]
          },
          {
            "key": "heat_treated",
            "label": "Heat-treated (anti-bolt)",
            "type": "boolean",
            "help": "Reduces premature flowering"
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Bulb onion",
              "Salad / spring onion",
              "Overwintering"
            ]
          }
        ]
      },
      {
        "name": "Jerusalem artichoke tubers",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Fuseau, Waldspindel, common white"
          },
          {
            "key": "tuber_form",
            "label": "Tuber form",
            "type": "select",
            "options": [
              "Knobbly / round",
              "Smooth / fuseau (elongated)"
            ],
            "help": "Fuseau types are easier to clean"
          },
          {
            "key": "skin_color",
            "label": "Skin colour",
            "type": "select",
            "options": [
              "White / cream",
              "Red",
              "Purple"
            ]
          },
          {
            "key": "caliber_mm",
            "label": "Tuber caliber",
            "type": "select",
            "unit": "mm",
            "options": [
              "<30",
              "30–50",
              "50+"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Seed / planting",
              "Fodder",
              "Culinary"
            ]
          }
        ]
      },
      {
        "name": "Perennial planting stock",
        "fields": [
          {
            "key": "species_variety",
            "label": "Species / variety",
            "type": "text",
            "required": true,
            "help": "e.g. asparagus crowns, rhubarb, hop rhizome, mint"
          },
          {
            "key": "propagule_type",
            "label": "Propagule type",
            "type": "select",
            "options": [
              "Crown / division",
              "Rhizome",
              "Root cutting",
              "Bare-root plant",
              "Plug / container plant"
            ],
            "required": true
          },
          {
            "key": "plant_age_years",
            "label": "Plant age",
            "type": "number",
            "unit": "years",
            "help": "e.g. 1-yr or 2-yr asparagus crown"
          },
          {
            "key": "grade",
            "label": "Grade / size",
            "type": "select",
            "options": [
              "Standard",
              "First grade / heavy",
              "Second grade"
            ],
            "help": "Crown/rhizome vigor grade"
          },
          {
            "key": "root_condition",
            "label": "Root condition",
            "type": "select",
            "options": [
              "Fresh",
              "Cold-stored",
              "Dormant"
            ]
          }
        ]
      },
      {
        "name": "Wild strawberry seedlings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Alexandria, Regina, Baron Solemacher"
          },
          {
            "key": "fruiting_type",
            "label": "Fruiting habit",
            "type": "select",
            "options": [
              "Everbearing / day-neutral",
              "June-bearing"
            ],
            "help": "Alpine types are usually everbearing"
          },
          {
            "key": "plant_form",
            "label": "Plant form",
            "type": "select",
            "options": [
              "Plug seedling",
              "Bare-root",
              "Potted"
            ],
            "required": true
          },
          {
            "key": "runnering",
            "label": "Runner habit",
            "type": "select",
            "options": [
              "Runnerless",
              "Runnering"
            ]
          },
          {
            "key": "plant_age",
            "label": "Plant age / stage",
            "type": "select",
            "options": [
              "Seedling",
              "1-year",
              "2-year"
            ]
          }
        ]
      },
      {
        "name": "Strawberry seedlings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Albion, Elsanta, Clery, San Andreas"
          },
          {
            "key": "fruiting_type",
            "label": "Fruiting type",
            "type": "select",
            "options": [
              "June-bearing (short-day)",
              "Everbearing / day-neutral",
              "Everbearing (long-day)"
            ],
            "required": true
          },
          {
            "key": "plant_type",
            "label": "Plant type",
            "type": "select",
            "options": [
              "Frigo (cold-stored bare-root)",
              "Fresh bare-root",
              "Tray / plug plant",
              "Waiting-bed plant"
            ],
            "help": "Frigo grades sized by crown diameter"
          },
          {
            "key": "crown_grade",
            "label": "Frigo crown grade",
            "type": "select",
            "options": [
              "A- (10–12 mm)",
              "A (12–15 mm)",
              "A+ (15–18 mm)",
              "WB / tray-plant",
              "A+ extra (18–22 mm)"
            ],
            "help": "Larger crown = higher first-year yield"
          },
          {
            "key": "certification",
            "label": "Health certification",
            "type": "select",
            "options": [
              "Certified (virus-tested)",
              "CAC standard",
              "Uncertified"
            ]
          }
        ]
      },
      {
        "name": "Flower seedlings",
        "fields": [
          {
            "key": "species_variety",
            "label": "Species / variety",
            "type": "text",
            "required": true,
            "help": "e.g. petunia Wave, marigold, geranium"
          },
          {
            "key": "life_cycle",
            "label": "Life cycle",
            "type": "select",
            "options": [
              "Annual",
              "Biennial",
              "Perennial"
            ]
          },
          {
            "key": "plant_form",
            "label": "Plant form",
            "type": "select",
            "options": [
              "Plug (unrooted cutting)",
              "Rooted plug",
              "Liner",
              "Potted"
            ],
            "required": true
          },
          {
            "key": "plug_tray_size",
            "label": "Plug tray size",
            "type": "select",
            "options": [
              "512-cell",
              "288-cell",
              "128-cell",
              "84-cell",
              "72-cell"
            ],
            "help": "Cells per tray; fewer = larger plug"
          },
          {
            "key": "flower_color",
            "label": "Flower colour",
            "type": "text",
            "help": "e.g. mixed, red, white, yellow"
          }
        ]
      },
      {
        "name": "Apricot saplings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Bergeron, Ananasnyy, Shalah"
          },
          {
            "key": "rootstock",
            "label": "Rootstock",
            "type": "select",
            "options": [
              "Apricot seedling",
              "Myrobalan (P. cerasifera)",
              "St. Julien A",
              "GF677 (peach×almond)",
              "Wavit",
              "Krymsk 86"
            ],
            "required": true
          },
          {
            "key": "plant_age_years",
            "label": "Sapling age",
            "type": "number",
            "unit": "years",
            "help": "Typically 1–2 yr from graft"
          },
          {
            "key": "root_type",
            "label": "Root type",
            "type": "select",
            "options": [
              "Bare-root",
              "Container (potted)",
              "Root-ball (B&B)"
            ]
          },
          {
            "key": "height_cm",
            "label": "Height",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "graft_form",
            "label": "Tree form",
            "type": "select",
            "options": [
              "Maiden / whip",
              "Feathered maiden",
              "Bush",
              "Half-standard",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Blueberry saplings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Duke, Bluecrop, Legacy, Patriot"
          },
          {
            "key": "bush_type",
            "label": "Bush type",
            "type": "select",
            "options": [
              "Northern highbush",
              "Southern highbush",
              "Rabbiteye",
              "Half-high",
              "Lowbush"
            ],
            "required": true
          },
          {
            "key": "propagation",
            "label": "Propagation",
            "type": "select",
            "options": [
              "Softwood cutting (own-root)",
              "Tissue culture",
              "Layering"
            ],
            "help": "Blueberries are own-root, not grafted"
          },
          {
            "key": "plant_age_years",
            "label": "Plant age",
            "type": "number",
            "unit": "years"
          },
          {
            "key": "container_size_l",
            "label": "Container size",
            "type": "select",
            "unit": "L",
            "options": [
              "P9 (0.5)",
              "1",
              "2",
              "3",
              "5",
              "7.5"
            ],
            "help": "Pot volume in litres"
          },
          {
            "key": "chill_requirement",
            "label": "Chill requirement",
            "type": "select",
            "options": [
              "Low (<400 h)",
              "Medium (400–800 h)",
              "High (>800 h)"
            ]
          }
        ]
      },
      {
        "name": "Ornamental saplings",
        "fields": [
          {
            "key": "species_variety",
            "label": "Species / variety",
            "type": "text",
            "required": true,
            "help": "e.g. Acer palmatum, Thuja Smaragd, rose"
          },
          {
            "key": "plant_group",
            "label": "Plant group",
            "type": "select",
            "options": [
              "Deciduous tree",
              "Conifer",
              "Evergreen shrub",
              "Deciduous shrub",
              "Climber",
              "Rose"
            ]
          },
          {
            "key": "root_type",
            "label": "Root type",
            "type": "select",
            "options": [
              "Bare-root",
              "Container (potted)",
              "Root-ball (B&B)",
              "Air-pot"
            ],
            "required": true
          },
          {
            "key": "size_metric",
            "label": "Size spec",
            "type": "select",
            "options": [
              "Height (cm)",
              "Girth 1 m (cm)",
              "Container size (L)",
              "Age (years)"
            ],
            "help": "Nursery grading metric used"
          },
          {
            "key": "size_value",
            "label": "Size value",
            "type": "number",
            "help": "Value for the chosen size metric"
          },
          {
            "key": "grafted",
            "label": "Grafted / budded",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Raspberry saplings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Polka, Glen Ample, Heritage, Tulameen"
          },
          {
            "key": "fruiting_type",
            "label": "Fruiting type",
            "type": "select",
            "options": [
              "Summer-bearing (floricane)",
              "Autumn-bearing (primocane)"
            ],
            "required": true
          },
          {
            "key": "plant_form",
            "label": "Plant form",
            "type": "select",
            "options": [
              "Bare-root cane",
              "Long cane",
              "Tissue-culture plug",
              "Potted"
            ],
            "help": "Long canes fruit in first season"
          },
          {
            "key": "cane_grade_mm",
            "label": "Cane grade (root diameter)",
            "type": "select",
            "unit": "mm",
            "options": [
              "5–8",
              "8–10",
              "10–12",
              "12+"
            ]
          },
          {
            "key": "fruit_color",
            "label": "Fruit colour",
            "type": "select",
            "options": [
              "Red",
              "Yellow / gold",
              "Purple",
              "Black"
            ]
          },
          {
            "key": "certification",
            "label": "Health certification",
            "type": "select",
            "options": [
              "Certified (virus-tested)",
              "CAC standard",
              "Uncertified"
            ]
          }
        ]
      },
      {
        "name": "Sea buckthorn saplings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Leikora, Askola, Chuyskaya, Botanicheskaya"
          },
          {
            "key": "sex",
            "label": "Plant sex",
            "type": "select",
            "options": [
              "Female (fruiting)",
              "Male (pollinator)",
              "Self-fertile / monoecious"
            ],
            "required": true,
            "help": "Need males for pollination; specify ratio"
          },
          {
            "key": "propagation",
            "label": "Propagation",
            "type": "select",
            "options": [
              "Seedling",
              "Hardwood cutting",
              "Green cutting",
              "Tissue culture",
              "Grafted"
            ],
            "required": true
          },
          {
            "key": "plant_age_years",
            "label": "Plant age",
            "type": "number",
            "unit": "years"
          },
          {
            "key": "root_type",
            "label": "Root type",
            "type": "select",
            "options": [
              "Bare-root",
              "Container (potted)"
            ]
          },
          {
            "key": "thornless",
            "label": "Thornless / low-thorn",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Peach saplings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Redhaven, Cresthaven; note nectarine vs peach"
          },
          {
            "key": "fruit_type",
            "label": "Fruit type",
            "type": "select",
            "options": [
              "Freestone peach",
              "Clingstone peach",
              "Nectarine",
              "Flat / donut peach"
            ]
          },
          {
            "key": "rootstock",
            "label": "Rootstock",
            "type": "select",
            "options": [
              "Peach seedling",
              "GF677 (peach×almond)",
              "Nemaguard",
              "St. Julien A",
              "Krymsk 86",
              "Myrobalan"
            ],
            "required": true
          },
          {
            "key": "plant_age_years",
            "label": "Sapling age",
            "type": "number",
            "unit": "years"
          },
          {
            "key": "root_type",
            "label": "Root type",
            "type": "select",
            "options": [
              "Bare-root",
              "Container (potted)",
              "Root-ball (B&B)"
            ]
          },
          {
            "key": "graft_form",
            "label": "Tree form",
            "type": "select",
            "options": [
              "Maiden / whip",
              "Feathered maiden",
              "Bush",
              "Half-standard"
            ]
          }
        ]
      },
      {
        "name": "Plum saplings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Stanley, Victoria, President, Cacanska"
          },
          {
            "key": "plum_type",
            "label": "Plum type",
            "type": "select",
            "options": [
              "European (P. domestica)",
              "Japanese (P. salicina)",
              "Damson",
              "Mirabelle / gage"
            ]
          },
          {
            "key": "rootstock",
            "label": "Rootstock",
            "type": "select",
            "options": [
              "Myrobalan seedling",
              "St. Julien A",
              "Wavit",
              "Pixy (dwarf)",
              "WeiWa",
              "Krymsk 1"
            ],
            "required": true
          },
          {
            "key": "plant_age_years",
            "label": "Sapling age",
            "type": "number",
            "unit": "years"
          },
          {
            "key": "root_type",
            "label": "Root type",
            "type": "select",
            "options": [
              "Bare-root",
              "Container (potted)",
              "Root-ball (B&B)"
            ]
          },
          {
            "key": "pollination",
            "label": "Pollination",
            "type": "select",
            "options": [
              "Self-fertile",
              "Partly self-fertile",
              "Needs pollinator"
            ]
          }
        ]
      },
      {
        "name": "Apple saplings",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Gala, Golden Delicious, Antonovka, Fuji"
          },
          {
            "key": "rootstock",
            "label": "Rootstock",
            "type": "select",
            "options": [
              "M9 (dwarf)",
              "M26 (semi-dwarf)",
              "MM106 (semi-vigorous)",
              "MM111 (vigorous)",
              "M7",
              "B9 (Budagovsky)",
              "Antonovka seedling"
            ],
            "required": true,
            "help": "Controls tree vigour / size"
          },
          {
            "key": "plant_age_years",
            "label": "Sapling age",
            "type": "number",
            "unit": "years"
          },
          {
            "key": "tree_form",
            "label": "Tree form",
            "type": "select",
            "options": [
              "Maiden / whip",
              "Knip-boom (feathered)",
              "Bush",
              "Half-standard",
              "Standard",
              "Cordon / spindle"
            ]
          },
          {
            "key": "root_type",
            "label": "Root type",
            "type": "select",
            "options": [
              "Bare-root",
              "Container (potted)",
              "Root-ball (B&B)"
            ]
          },
          {
            "key": "pollination_group",
            "label": "Pollination group",
            "type": "select",
            "options": [
              "Group A (early)",
              "Group B",
              "Group C",
              "Group D",
              "Group E (late)",
              "Self-fertile"
            ]
          }
        ]
      },
      {
        "name": "Vetch seeds",
        "fields": [
          {
            "key": "species_variety",
            "label": "Species / variety",
            "type": "text",
            "required": true,
            "help": "e.g. common vetch (V. sativa), hairy vetch (V. villosa)"
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g",
            "help": "Thousand-seed weight"
          },
          {
            "key": "inoculation",
            "label": "Rhizobium inoculation",
            "type": "select",
            "options": [
              "Untreated",
              "Pre-inoculated",
              "Inoculant included"
            ],
            "help": "N-fixing legume"
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Commercial / standard"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Cover crop / green manure",
              "Fodder / forage",
              "Seed production"
            ]
          }
        ]
      },
      {
        "name": "Pea seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Alderman, Ambassador, field pea"
          },
          {
            "key": "pea_type",
            "label": "Pea type",
            "type": "select",
            "options": [
              "Garden / shelling",
              "Snap / mangetout",
              "Marrowfat",
              "Field / dry pea",
              "Fodder pea"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Insecticide-treated",
              "Inoculated (Rhizobium)"
            ]
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Mustard seeds",
        "fields": [
          {
            "key": "species",
            "label": "Species / type",
            "type": "select",
            "options": [
              "White / yellow (Sinapis alba)",
              "Brown (Brassica juncea)",
              "Black (Brassica nigra)"
            ],
            "required": true
          },
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Cover crop / green manure",
              "Condiment / oil",
              "Sowing seed",
              "Fodder"
            ]
          }
        ]
      },
      {
        "name": "Coriander seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Santo, Leisure, Moroccan"
          },
          {
            "key": "fruit_type",
            "label": "Fruit type",
            "type": "select",
            "options": [
              "Split (mericarp)",
              "Whole (schizocarp)"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Primed",
              "Coated / pelleted"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Sowing (leaf / cilantro)",
              "Sowing (seed / spice)",
              "Spice / culinary"
            ]
          }
        ]
      },
      {
        "name": "Corn seeds",
        "fields": [
          {
            "key": "variety_hybrid",
            "label": "Variety / hybrid name",
            "type": "text",
            "required": true,
            "help": "e.g. P8500, DKC3939, or OP variety"
          },
          {
            "key": "corn_type",
            "label": "Corn type",
            "type": "select",
            "options": [
              "Grain / dent",
              "Silage",
              "Sweet corn",
              "Popcorn",
              "Waxy",
              "Flint"
            ]
          },
          {
            "key": "breeding_type",
            "label": "Breeding type",
            "type": "select",
            "options": [
              "Hybrid (F1)",
              "Open-pollinated",
              "GMO",
              "Heirloom"
            ]
          },
          {
            "key": "maturity_fao",
            "label": "Maturity (FAO index)",
            "type": "number",
            "help": "FAO number; lower = earlier"
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Insecticide-treated",
              "Fungicide + insecticide"
            ]
          },
          {
            "key": "seed_size_grade",
            "label": "Seed size grade",
            "type": "select",
            "options": [
              "Flat small",
              "Flat medium",
              "Flat large",
              "Round",
              "Graded (calibrated)"
            ]
          }
        ]
      },
      {
        "name": "Onion seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Sturon, Red Baron, Rijnsburger"
          },
          {
            "key": "breeding_type",
            "label": "Breeding type",
            "type": "select",
            "options": [
              "Hybrid (F1)",
              "Open-pollinated"
            ]
          },
          {
            "key": "day_length_type",
            "label": "Day-length type",
            "type": "select",
            "options": [
              "Long-day",
              "Intermediate-day",
              "Short-day"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Primed",
              "Coated / pelleted",
              "Film-coated"
            ]
          },
          {
            "key": "skin_color",
            "label": "Bulb colour",
            "type": "select",
            "options": [
              "Yellow / brown",
              "Red",
              "White"
            ]
          }
        ]
      },
      {
        "name": "Flax seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "flax_type",
            "label": "Flax type",
            "type": "select",
            "options": [
              "Oil / linseed",
              "Fibre",
              "Dual-purpose"
            ],
            "required": true
          },
          {
            "key": "seed_color",
            "label": "Seed colour",
            "type": "select",
            "options": [
              "Brown",
              "Golden / yellow"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Mung bean seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "inoculation",
            "label": "Rhizobium inoculation",
            "type": "select",
            "options": [
              "Untreated",
              "Pre-inoculated",
              "Inoculant included"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Field sowing",
              "Sprouting",
              "Green manure / cover crop",
              "Fodder"
            ],
            "required": true
          }
        ]
      },
      {
        "name": "Oat seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "oat_type",
            "label": "Oat type",
            "type": "select",
            "options": [
              "Husked / covered",
              "Naked / hull-less",
              "Black oat (A. strigosa)"
            ]
          },
          {
            "key": "season_type",
            "label": "Season type",
            "type": "select",
            "options": [
              "Spring",
              "Winter"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated (dressed)"
            ]
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Parsley seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "parsley_type",
            "label": "Parsley type",
            "type": "select",
            "options": [
              "Curled leaf",
              "Flat / Italian leaf",
              "Root / Hamburg"
            ],
            "required": true
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Primed",
              "Coated / pelleted"
            ]
          }
        ]
      },
      {
        "name": "Sunflower seeds",
        "fields": [
          {
            "key": "variety_hybrid",
            "label": "Variety / hybrid name",
            "type": "text",
            "required": true
          },
          {
            "key": "oil_type",
            "label": "Oil / use type",
            "type": "select",
            "options": [
              "High-oleic oilseed",
              "Linoleic oilseed",
              "Confectionery / striped",
              "Bird feed"
            ]
          },
          {
            "key": "breeding_type",
            "label": "Breeding type",
            "type": "select",
            "options": [
              "Hybrid (F1)",
              "Open-pollinated"
            ]
          },
          {
            "key": "herbicide_trait",
            "label": "Herbicide tolerance",
            "type": "select",
            "options": [
              "Conventional",
              "Clearfield (imazamox)",
              "ExpressSun (tribenuron)"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Insecticide-treated",
              "Fungicide + insecticide"
            ]
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Wheat seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "wheat_class",
            "label": "Wheat class",
            "type": "select",
            "options": [
              "Soft winter",
              "Hard winter",
              "Soft spring",
              "Hard spring",
              "Durum"
            ]
          },
          {
            "key": "season_type",
            "label": "Season type",
            "type": "select",
            "options": [
              "Winter",
              "Spring",
              "Facultative"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated (dressed)",
              "Fungicide + insecticide"
            ]
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Rapeseed seeds",
        "fields": [
          {
            "key": "variety_hybrid",
            "label": "Variety / hybrid name",
            "type": "text",
            "required": true
          },
          {
            "key": "quality_type",
            "label": "Quality type",
            "type": "select",
            "options": [
              "00 / Canola (double-low)",
              "0 (low erucic)",
              "HEAR (high-erucic industrial)"
            ],
            "help": "Erucic acid / glucosinolate profile"
          },
          {
            "key": "season_type",
            "label": "Season type",
            "type": "select",
            "options": [
              "Winter",
              "Spring"
            ]
          },
          {
            "key": "breeding_type",
            "label": "Breeding type",
            "type": "select",
            "options": [
              "Hybrid (F1)",
              "Open-pollinated",
              "GMO"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Insecticide-treated",
              "Fungicide + insecticide"
            ]
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          }
        ]
      },
      {
        "name": "Milk thistle seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "silymarin_pct",
            "label": "Silymarin content",
            "type": "number",
            "unit": "%",
            "help": "Key active for medicinal use"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Field sowing",
              "Medicinal / extract",
              "Fodder"
            ]
          }
        ]
      },
      {
        "name": "Radish seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "radish_type",
            "label": "Radish type",
            "type": "select",
            "options": [
              "Salad / European",
              "Daikon / Asian",
              "Winter / black",
              "Oilseed / fodder radish"
            ],
            "required": true
          },
          {
            "key": "breeding_type",
            "label": "Breeding type",
            "type": "select",
            "options": [
              "Hybrid (F1)",
              "Open-pollinated"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Coated / pelleted"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Vegetable sowing",
              "Cover crop / green manure",
              "Sprouting / microgreens"
            ]
          }
        ]
      },
      {
        "name": "Rye seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "breeding_type",
            "label": "Breeding type",
            "type": "select",
            "options": [
              "Hybrid (F1)",
              "Population / open-pollinated"
            ]
          },
          {
            "key": "season_type",
            "label": "Season type",
            "type": "select",
            "options": [
              "Winter",
              "Spring"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Grain",
              "Cover crop / green manure",
              "Forage / green fodder"
            ]
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Camelina seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "season_type",
            "label": "Season type",
            "type": "select",
            "options": [
              "Spring",
              "Winter"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Oilseed / biofuel",
              "Cover crop",
              "Sowing seed"
            ]
          }
        ]
      },
      {
        "name": "Fodder beet seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "dry_matter_class",
            "label": "Dry-matter class",
            "type": "select",
            "options": [
              "Low DM (high-yield, <15%)",
              "Medium DM (15–19%)",
              "High DM (19%+, sugar-beet type)"
            ],
            "help": "Trades yield vs feed density"
          },
          {
            "key": "seed_form",
            "label": "Seed form",
            "type": "select",
            "options": [
              "Monogerm pelleted",
              "Monogerm precision",
              "Multigerm / rubbed"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Fungicide + insecticide",
              "Film-coated"
            ]
          },
          {
            "key": "root_color",
            "label": "Root colour",
            "type": "select",
            "options": [
              "White",
              "Yellow",
              "Orange",
              "Red"
            ]
          }
        ]
      },
      {
        "name": "Soybean seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "maturity_group",
            "label": "Maturity group",
            "type": "select",
            "options": [
              "000",
              "00",
              "0",
              "I",
              "II",
              "III",
              "IV"
            ],
            "help": "MG index; lower = earlier"
          },
          {
            "key": "breeding_type",
            "label": "Breeding type",
            "type": "select",
            "options": [
              "Conventional (non-GMO)",
              "GMO (Roundup Ready)",
              "GMO (other trait)"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "inoculation",
            "label": "Rhizobium inoculation",
            "type": "select",
            "options": [
              "Untreated",
              "Pre-inoculated",
              "Inoculant included"
            ]
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Fungicide + insecticide"
            ]
          }
        ]
      },
      {
        "name": "Lawn grass seeds",
        "fields": [
          {
            "key": "mixture_name",
            "label": "Mixture / variety",
            "type": "text",
            "help": "e.g. Sport, Shade, Universal"
          },
          {
            "key": "species_mix",
            "label": "Species in mix",
            "type": "multiselect",
            "options": [
              "Perennial ryegrass",
              "Kentucky bluegrass",
              "Red fescue",
              "Tall fescue",
              "Chewings fescue",
              "Bentgrass",
              "Bermudagrass"
            ],
            "required": true
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Ornamental / fine lawn",
              "Sport / hard-wearing",
              "Shade",
              "Overseeding",
              "Erosion / roadside"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "weed_seed_max_pct",
            "label": "Max weed seed",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Triticale seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "season_type",
            "label": "Season type",
            "type": "select",
            "options": [
              "Winter",
              "Spring"
            ],
            "required": true
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated (dressed)"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Grain / feed",
              "Forage / silage",
              "Dual-purpose"
            ]
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Dill seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Bouquet, Mammoth, Dukat"
          },
          {
            "key": "dill_type",
            "label": "Dill type",
            "type": "select",
            "options": [
              "Leaf / dukat (slow-bolt)",
              "Bouquet (for seed/umbels)",
              "Dwarf / pot"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Primed"
            ]
          },
          {
            "key": "use_type",
            "label": "Intended use",
            "type": "select",
            "options": [
              "Sowing (leaf)",
              "Sowing (seed / umbel)",
              "Spice / culinary"
            ]
          }
        ]
      },
      {
        "name": "Bean seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "bean_type",
            "label": "Bean type",
            "type": "select",
            "options": [
              "Bush / dwarf French",
              "Climbing / pole French",
              "Runner bean",
              "Broad / fava",
              "Dry / field bean"
            ],
            "required": true
          },
          {
            "key": "grain_color",
            "label": "Grain colour",
            "type": "select",
            "options": [
              "White",
              "Cream",
              "Red / kidney",
              "Black",
              "Mottled / borlotti",
              "Green (haricot)"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Insecticide-treated",
              "Inoculated (Rhizobium)"
            ]
          }
        ]
      },
      {
        "name": "Lentil seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text"
          },
          {
            "key": "lentil_type",
            "label": "Lentil / seed-coat type",
            "type": "select",
            "options": [
              "Large green (macrosperma)",
              "Small green",
              "Red / football",
              "Brown",
              "Puy / French green",
              "Black / beluga"
            ],
            "required": true
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "inoculation",
            "label": "Rhizobium inoculation",
            "type": "select",
            "options": [
              "Untreated",
              "Pre-inoculated",
              "Inoculant included"
            ]
          }
        ]
      },
      {
        "name": "Sorrel seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "help": "e.g. Broad-leaved, Blood-veined, French"
          },
          {
            "key": "sorrel_type",
            "label": "Sorrel type",
            "type": "select",
            "options": [
              "Common / garden (R. acetosa)",
              "French / buckler (R. scutatus)",
              "Blood-veined"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "purity_pct",
            "label": "Analytical purity",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "treatment",
            "label": "Seed treatment",
            "type": "select",
            "options": [
              "Untreated",
              "Fungicide-treated",
              "Coated / pelleted"
            ]
          }
        ]
      },
      {
        "name": "Barley seeds",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true
          },
          {
            "key": "row_type",
            "label": "Row type",
            "type": "select",
            "options": [
              "Two-row",
              "Six-row"
            ],
            "required": true
          },
          {
            "key": "end_use",
            "label": "End use",
            "type": "select",
            "options": [
              "Malting",
              "Feed",
              "Food / hulless"
            ]
          },
          {
            "key": "season_type",
            "label": "Season type",
            "type": "select",
            "options": [
              "Winter",
              "Spring"
            ]
          },
          {
            "key": "germination_pct",
            "label": "Germination",
            "type": "number",
            "unit": "%",
            "required": true
          },
          {
            "key": "tsw_g",
            "label": "1000-seed weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "seed_class",
            "label": "Seed class",
            "type": "select",
            "options": [
              "Pre-basic",
              "Basic",
              "Certified C1",
              "Certified C2",
              "Standard"
            ]
          }
        ]
      },
      {
        "name": "Seed garlic",
        "fields": [
          {
            "key": "variety",
            "label": "Variety / cultivar",
            "type": "text",
            "required": true,
            "help": "e.g. Lyubasha, Messidor, Solent Wight"
          },
          {
            "key": "garlic_type",
            "label": "Garlic type",
            "type": "select",
            "options": [
              "Hardneck (bolting)",
              "Softneck (non-bolting)"
            ],
            "required": true
          },
          {
            "key": "planting_material",
            "label": "Planting material",
            "type": "select",
            "options": [
              "Cloves (bulb)",
              "Bulbils (aerial)",
              "Single-clove rounds"
            ]
          },
          {
            "key": "bulb_caliber_mm",
            "label": "Bulb caliber",
            "type": "select",
            "unit": "mm",
            "options": [
              "<40",
              "40–50",
              "50–60",
              "60+"
            ],
            "help": "Larger cloves yield larger bulbs"
          },
          {
            "key": "season_type",
            "label": "Planting season",
            "type": "select",
            "options": [
              "Winter (autumn-planted)",
              "Spring"
            ]
          },
          {
            "key": "virus_free_tested",
            "label": "Virus-tested / certified",
            "type": "boolean"
          }
        ]
      }
    ]
  },
  {
    "name": "Agrochemicals",
    "emoji": "🧪",
    "slug": "agrochem",
    "subcategories": [
      {
        "name": "Biological agents",
        "fields": [
          {
            "key": "agent_type",
            "label": "Biological agent type",
            "type": "select",
            "options": [
              "Biofertilizer",
              "Biopesticide",
              "Bioinsecticide",
              "Biofungicide",
              "Bionematicide",
              "Biostimulant",
              "Beneficial insect / predator",
              "Microbial inoculant"
            ],
            "required": true
          },
          {
            "key": "active_organism",
            "label": "Active organism / strain",
            "type": "text",
            "required": true,
            "help": "e.g. Bacillus thuringiensis kurstaki, Trichoderma harzianum, Rhizobium"
          },
          {
            "key": "cfu_count",
            "label": "Viable count (CFU)",
            "type": "number",
            "unit": "CFU/g or CFU/mL",
            "help": "Colony-forming units per gram or mL"
          },
          {
            "key": "formulation",
            "label": "Formulation",
            "type": "select",
            "options": [
              "Wettable powder (WP)",
              "Water-dispersible granules (WG)",
              "Suspension concentrate (SC)",
              "Liquid (SL)",
              "Granular",
              "Peat-based carrier",
              "Freeze-dried / lyophilized"
            ]
          },
          {
            "key": "target",
            "label": "Target pest / crop use",
            "type": "text",
            "help": "e.g. Lepidoptera larvae, soil-borne fungi, legume nodulation"
          },
          {
            "key": "organic_approved",
            "label": "Organic-approved (OMRI/EU organic)",
            "type": "boolean"
          },
          {
            "key": "registration_no",
            "label": "Registration / license no.",
            "type": "text"
          }
        ]
      },
      {
        "name": "Mineral fertilizers",
        "fields": [
          {
            "key": "fertilizer_type",
            "label": "Fertilizer type",
            "type": "select",
            "options": [
              "Nitrogen (N)",
              "Phosphate (P)",
              "Potash (K)",
              "NPK compound",
              "NPK blended",
              "Calcium / calcareous",
              "Magnesium",
              "Sulphur",
              "Micronutrient",
              "Water-soluble (fertigation)"
            ],
            "required": true
          },
          {
            "key": "npk_ratio",
            "label": "NPK ratio",
            "type": "text",
            "required": true,
            "help": "N-P2O5-K2O, e.g. 10-26-26, 46-0-0 (urea), 20-20-20"
          },
          {
            "key": "nutrient_content",
            "label": "Total nutrient content",
            "type": "number",
            "unit": "%",
            "help": "Sum of N+P2O5+K2O by weight"
          },
          {
            "key": "form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Granular",
              "Prilled",
              "Crystalline",
              "Powder",
              "Liquid",
              "Briquette / tablet"
            ]
          },
          {
            "key": "coating",
            "label": "Coating / release",
            "type": "select",
            "options": [
              "Uncoated",
              "Sulphur-coated",
              "Polymer-coated (CRF)",
              "Neem-coated",
              "Inhibitor-treated (SRF)"
            ]
          },
          {
            "key": "micronutrients",
            "label": "Micronutrients present",
            "type": "multiselect",
            "options": [
              "Zn",
              "Fe",
              "Mn",
              "Cu",
              "B",
              "Mo",
              "Ca",
              "Mg",
              "S"
            ]
          }
        ]
      },
      {
        "name": "Cleaning & disinfectants",
        "fields": [
          {
            "key": "product_use",
            "label": "Use / application",
            "type": "select",
            "options": [
              "Farm / barn disinfectant",
              "Dairy / milking equipment sanitizer",
              "Hatchery / poultry disinfectant",
              "Seed / greenhouse sanitizer",
              "CIP (clean-in-place)",
              "Foot dip / biosecurity",
              "Surface cleaner / degreaser"
            ],
            "required": true
          },
          {
            "key": "active_ingredient",
            "label": "Active ingredient",
            "type": "text",
            "required": true,
            "help": "e.g. glutaraldehyde, benzalkonium chloride (QAC), sodium hypochlorite, iodophor"
          },
          {
            "key": "active_concentration",
            "label": "Active concentration",
            "type": "number",
            "unit": "%",
            "help": "% w/w of active in the product"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Liquid concentrate",
              "Ready-to-use liquid",
              "Powder",
              "Tablet / effervescent",
              "Gel",
              "Foam"
            ]
          },
          {
            "key": "dilution_rate",
            "label": "Recommended dilution rate",
            "type": "text",
            "help": "e.g. 1:200, 2% solution"
          },
          {
            "key": "efficacy_spectrum",
            "label": "Efficacy spectrum",
            "type": "multiselect",
            "options": [
              "Bactericidal",
              "Virucidal",
              "Fungicidal",
              "Sporicidal",
              "Algicidal",
              "Food-contact safe"
            ]
          },
          {
            "key": "ghs_hazard_class",
            "label": "Hazard / GHS class",
            "type": "select",
            "options": [
              "Not classified",
              "Irritant",
              "Corrosive",
              "Oxidizer",
              "Toxic",
              "Environmental hazard"
            ]
          }
        ]
      },
      {
        "name": "Organic fertilizers",
        "fields": [
          {
            "key": "source_material",
            "label": "Source material",
            "type": "select",
            "options": [
              "Farmyard manure (FYM)",
              "Poultry manure",
              "Vermicompost",
              "Compost",
              "Seaweed / kelp",
              "Fish / bone meal",
              "Neem cake",
              "Humic / fulvic acid",
              "Biochar",
              "Green manure"
            ],
            "required": true
          },
          {
            "key": "npk_ratio",
            "label": "NPK ratio",
            "type": "text",
            "help": "N-P-K, e.g. 4-3-3; typically lower than mineral"
          },
          {
            "key": "organic_matter",
            "label": "Organic matter content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "form",
            "label": "Physical form",
            "type": "select",
            "options": [
              "Granular",
              "Pellet",
              "Powder",
              "Liquid",
              "Crumb / flake",
              "Bulk loose"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "c_n_ratio",
            "label": "C:N ratio",
            "type": "text",
            "help": "e.g. 15:1 — lower means faster release"
          },
          {
            "key": "organic_certified",
            "label": "Organic-certified (OMRI/EU/NPOP)",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Growth regulators",
        "fields": [
          {
            "key": "pgr_class",
            "label": "Regulator class",
            "type": "select",
            "options": [
              "Auxin",
              "Gibberellin (GA)",
              "Cytokinin",
              "Ethylene / ethephon",
              "Abscisic acid (ABA)",
              "Growth retardant / anti-gibberellin",
              "Rooting hormone",
              "Ripener / defoliant"
            ],
            "required": true
          },
          {
            "key": "active_ingredient",
            "label": "Active ingredient + concentration",
            "type": "text",
            "required": true,
            "help": "e.g. Gibberellic acid 40 g/L, Paclobutrazol 23% SC, IBA 0.1%"
          },
          {
            "key": "concentration_gl",
            "label": "Active concentration",
            "type": "number",
            "unit": "g/L or g/kg"
          },
          {
            "key": "formulation",
            "label": "Formulation",
            "type": "select",
            "options": [
              "Soluble liquid (SL)",
              "Soluble powder (SP)",
              "Suspension concentrate (SC)",
              "Emulsifiable concentrate (EC)",
              "Water-dispersible granules (WG)",
              "Tablet / paste"
            ]
          },
          {
            "key": "target_effect",
            "label": "Target effect",
            "type": "text",
            "help": "e.g. flowering induction, fruit thinning, stem shortening, rooting"
          },
          {
            "key": "application_rate",
            "label": "Application rate",
            "type": "number",
            "unit": "mL or g per ha"
          },
          {
            "key": "registration_no",
            "label": "Registration / license no.",
            "type": "text"
          }
        ]
      },
      {
        "name": "Plant protection products",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Insecticide",
              "Herbicide",
              "Fungicide",
              "Nematicide",
              "Acaricide / miticide",
              "Molluscicide",
              "Rodenticide",
              "Fumigant",
              "Adjuvant / surfactant"
            ],
            "required": true
          },
          {
            "key": "active_ingredient",
            "label": "Active ingredient + concentration",
            "type": "text",
            "required": true,
            "help": "e.g. Imidacloprid 200 g/L, Glyphosate 480 g/L, Mancozeb 75% WP"
          },
          {
            "key": "formulation",
            "label": "Formulation code",
            "type": "select",
            "options": [
              "Wettable powder (WP)",
              "Water-dispersible granules (WG)",
              "Emulsifiable concentrate (EC)",
              "Soluble liquid (SL)",
              "Suspension concentrate (SC)",
              "Suspo-emulsion (SE)",
              "Granular (GR)",
              "Ultra-low volume (ULV)"
            ]
          },
          {
            "key": "target",
            "label": "Target pest / weed / disease",
            "type": "text",
            "help": "e.g. aphids, broadleaf weeds, late blight"
          },
          {
            "key": "application_rate",
            "label": "Application rate",
            "type": "number",
            "unit": "kg or L per ha"
          },
          {
            "key": "phi_days",
            "label": "Pre-harvest interval (PHI)",
            "type": "number",
            "unit": "days",
            "help": "Days between last application and harvest"
          },
          {
            "key": "ghs_hazard_class",
            "label": "Hazard / GHS class (WHO)",
            "type": "select",
            "options": [
              "Ia — extremely hazardous",
              "Ib — highly hazardous",
              "II — moderately hazardous",
              "III — slightly hazardous",
              "U — unlikely hazard"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Processed products",
    "emoji": "🏭",
    "slug": "processed",
    "subcategories": [
      {
        "name": "Frozen mushrooms",
        "fields": [
          {
            "key": "species",
            "label": "Mushroom species",
            "type": "select",
            "options": [
              "Champignon (white button)",
              "Cremini",
              "Portobello",
              "Oyster",
              "Shiitake",
              "Porcini (Boletus)",
              "Chanterelle",
              "Enoki",
              "King oyster",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "cut",
            "label": "Cut / form",
            "type": "select",
            "options": [
              "Whole",
              "Halves",
              "Quarters",
              "Sliced",
              "Diced",
              "Stems & pieces"
            ],
            "required": true
          },
          {
            "key": "freezing_method",
            "label": "Freezing method",
            "type": "select",
            "options": [
              "IQF",
              "Block frozen"
            ],
            "help": "IQF = individually quick frozen"
          },
          {
            "key": "blanched",
            "label": "Blanched before freezing",
            "type": "boolean"
          },
          {
            "key": "caliber_mm",
            "label": "Cap caliber",
            "type": "text",
            "unit": "mm",
            "help": "e.g. 20-40 mm for whole caps"
          },
          {
            "key": "glazing_pct",
            "label": "Glazing / ice coating",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Frozen fruits & vegetables",
        "fields": [
          {
            "key": "produce_type",
            "label": "Produce / variety",
            "type": "text",
            "required": true,
            "help": "e.g. Strawberry, Sweet corn, Green peas, Spinach"
          },
          {
            "key": "cut",
            "label": "Cut / form",
            "type": "select",
            "options": [
              "Whole",
              "Halves",
              "Sliced",
              "Diced",
              "Cubes",
              "Strips",
              "Florets",
              "Kernels",
              "Puree",
              "Crumble"
            ],
            "required": true
          },
          {
            "key": "freezing_method",
            "label": "Freezing method",
            "type": "select",
            "options": [
              "IQF",
              "Block frozen"
            ]
          },
          {
            "key": "blanched",
            "label": "Blanched",
            "type": "boolean"
          },
          {
            "key": "grade",
            "label": "Grade / class",
            "type": "select",
            "options": [
              "Extra / Grade A",
              "Grade B",
              "Industrial"
            ]
          },
          {
            "key": "sugar_added",
            "label": "Sugar added",
            "type": "boolean",
            "help": "Common for berries (e.g. 4+1, sugared)"
          },
          {
            "key": "brix",
            "label": "Brix (fruit)",
            "type": "number",
            "unit": "°Brix"
          }
        ]
      },
      {
        "name": "Protein isolates",
        "fields": [
          {
            "key": "source",
            "label": "Protein source",
            "type": "select",
            "options": [
              "Soy",
              "Pea",
              "Whey",
              "Rice",
              "Wheat",
              "Egg",
              "Casein",
              "Potato",
              "Faba bean",
              "Hemp"
            ],
            "required": true
          },
          {
            "key": "protein_form",
            "label": "Form",
            "type": "select",
            "options": [
              "Isolate",
              "Concentrate",
              "Hydrolysate",
              "Textured"
            ],
            "required": true
          },
          {
            "key": "protein_content_pct",
            "label": "Protein content (dry basis)",
            "type": "number",
            "unit": "%",
            "help": "Isolate typically ≥ 90%"
          },
          {
            "key": "mesh_size",
            "label": "Particle / mesh size",
            "type": "text",
            "help": "e.g. 80 mesh, 100 mesh"
          },
          {
            "key": "solubility",
            "label": "Solubility / functionality",
            "type": "select",
            "options": [
              "High solubility",
              "Emulsifying",
              "Gelling",
              "Water-dispersible",
              "Instantized"
            ]
          },
          {
            "key": "flavor",
            "label": "Flavor",
            "type": "select",
            "options": [
              "Unflavored / neutral",
              "Flavored"
            ]
          }
        ]
      },
      {
        "name": "Ketchup",
        "fields": [
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "help": "Total soluble solids, typ. 25-32"
          },
          {
            "key": "tomato_content_pct",
            "label": "Tomato content",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "grade",
            "label": "Style / grade",
            "type": "select",
            "options": [
              "Fancy",
              "Extra standard",
              "Standard",
              "Hot / spicy",
              "No added sugar",
              "Organic"
            ]
          },
          {
            "key": "net_weight_g",
            "label": "Net weight per unit",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Glass bottle",
              "PET squeeze bottle",
              "Sachet",
              "Pouch",
              "Can",
              "Bag-in-box (bulk)",
              "Aseptic drum"
            ],
            "required": true
          },
          {
            "key": "additives",
            "label": "Additives / preservatives",
            "type": "multiselect",
            "options": [
              "None",
              "Sugar",
              "Salt",
              "Vinegar",
              "Modified starch",
              "Xanthan gum",
              "Sodium benzoate",
              "Potassium sorbate",
              "Citric acid"
            ]
          }
        ]
      },
      {
        "name": "Confectionery",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Chocolate bar",
              "Pralines / bonbons",
              "Hard candy",
              "Toffee / fudge",
              "Gummy / jelly",
              "Marshmallow",
              "Halva",
              "Wafer",
              "Biscuit",
              "Cookie",
              "Nougat",
              "Caramel",
              "Lollipop"
            ],
            "required": true
          },
          {
            "key": "cocoa_pct",
            "label": "Cocoa content (chocolate)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "sugar_free",
            "label": "Sugar-free",
            "type": "boolean"
          },
          {
            "key": "net_weight_g",
            "label": "Net weight per unit",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Flow wrap",
              "Box",
              "Jar",
              "Tin",
              "Bag / pouch",
              "Bulk carton"
            ]
          },
          {
            "key": "allergens",
            "label": "Allergens",
            "type": "multiselect",
            "options": [
              "Milk",
              "Soy",
              "Peanuts",
              "Tree nuts",
              "Gluten",
              "Egg",
              "Sesame"
            ]
          },
          {
            "key": "ingredients",
            "label": "Ingredients / composition",
            "type": "text"
          }
        ]
      },
      {
        "name": "Canned goods",
        "fields": [
          {
            "key": "product",
            "label": "Canned product",
            "type": "text",
            "required": true,
            "help": "e.g. Sweet corn, Green peas, Tuna, Tomatoes, Peaches"
          },
          {
            "key": "pack_medium",
            "label": "Packing medium",
            "type": "select",
            "options": [
              "Brine",
              "Water",
              "Own juice",
              "Oil (sunflower)",
              "Oil (olive)",
              "Light syrup",
              "Heavy syrup",
              "Tomato sauce"
            ]
          },
          {
            "key": "drained_weight_g",
            "label": "Drained weight",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "net_weight_g",
            "label": "Net weight per unit",
            "type": "number",
            "unit": "g",
            "required": true
          },
          {
            "key": "can_format",
            "label": "Can format",
            "type": "select",
            "options": [
              "Easy-open (EOE)",
              "Standard lid",
              "Glass jar",
              "Tin A10 (#10)",
              "Tin 1/1",
              "Tin 1/2",
              "Tin 1/4"
            ]
          },
          {
            "key": "additives",
            "label": "Additives / preservatives",
            "type": "multiselect",
            "options": [
              "None",
              "Salt",
              "Sugar",
              "Citric acid",
              "Ascorbic acid",
              "Calcium chloride"
            ]
          }
        ]
      },
      {
        "name": "Concentrates",
        "fields": [
          {
            "key": "base",
            "label": "Concentrate base",
            "type": "text",
            "required": true,
            "help": "e.g. Apple juice, Tomato, Orange, Grape"
          },
          {
            "key": "concentration_type",
            "label": "Type",
            "type": "select",
            "options": [
              "Fruit juice concentrate (FCJ)",
              "Vegetable concentrate",
              "Clarified",
              "Cloudy",
              "Aseptic"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "required": true,
            "help": "e.g. 65-70 for FCJ"
          },
          {
            "key": "acidity",
            "label": "Acidity",
            "type": "number",
            "unit": "%",
            "help": "As citric/malic acid"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Aseptic bag-in-drum",
              "Aseptic bag-in-box",
              "IBC tote",
              "Frozen drum",
              "Tanker (bulk)"
            ]
          },
          {
            "key": "additives",
            "label": "Additives / preservatives",
            "type": "multiselect",
            "options": [
              "None",
              "Ascorbic acid",
              "Citric acid",
              "SO2"
            ]
          }
        ]
      },
      {
        "name": "Starch & syrup products",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Native starch",
              "Modified starch",
              "Glucose syrup",
              "Fructose syrup (HFCS)",
              "Glucose-fructose syrup",
              "Maltodextrin",
              "Dextrose",
              "Corn syrup solids",
              "Maltose syrup"
            ],
            "required": true
          },
          {
            "key": "botanical_source",
            "label": "Botanical source",
            "type": "select",
            "options": [
              "Maize / corn",
              "Wheat",
              "Potato",
              "Tapioca / cassava",
              "Rice",
              "Pea"
            ]
          },
          {
            "key": "de_value",
            "label": "Dextrose equivalent (DE)",
            "type": "number",
            "help": "Syrups/maltodextrin; e.g. DE 40"
          },
          {
            "key": "dry_solids_pct",
            "label": "Dry solids (syrup)",
            "type": "number",
            "unit": "%",
            "help": "e.g. ~80% for glucose syrup"
          },
          {
            "key": "fructose_pct",
            "label": "Fructose content (HFCS)",
            "type": "number",
            "unit": "%",
            "help": "e.g. 42 or 55"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "25 kg bag",
              "Big bag / FIBC",
              "IBC tote",
              "Drum",
              "Tanker (bulk)"
            ]
          }
        ]
      },
      {
        "name": "Groats",
        "fields": [
          {
            "key": "grain",
            "label": "Grain type",
            "type": "select",
            "options": [
              "Buckwheat",
              "Rice",
              "Oat",
              "Barley (pearl)",
              "Wheat (bulgur)",
              "Semolina",
              "Millet",
              "Corn",
              "Peas (split)",
              "Couscous",
              "Spelt"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form / cut",
            "type": "select",
            "options": [
              "Whole grain",
              "Rolled / flakes",
              "Cut / steel-cut",
              "Polished",
              "Crushed",
              "Pearled",
              "Split"
            ]
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Roasted / kilned",
              "Steamed / quick-cook",
              "Hulled"
            ]
          },
          {
            "key": "grade",
            "label": "Grade / class",
            "type": "select",
            "options": [
              "1st grade",
              "2nd grade",
              "3rd grade",
              "Extra"
            ]
          },
          {
            "key": "protein_pct",
            "label": "Protein",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "impurity_pct",
            "label": "Impurity / broken content",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Mayonnaise",
        "fields": [
          {
            "key": "fat_content_pct",
            "label": "Fat content",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "Full-fat typ. 67-80%; light 30-50%"
          },
          {
            "key": "product_type",
            "label": "Type",
            "type": "select",
            "options": [
              "Classic / full-fat",
              "Light / reduced-fat",
              "Provencal",
              "Egg-free / vegan",
              "Garlic",
              "Organic"
            ]
          },
          {
            "key": "egg_type",
            "label": "Egg base",
            "type": "select",
            "options": [
              "Whole egg",
              "Egg yolk",
              "Egg-free"
            ]
          },
          {
            "key": "net_weight_g",
            "label": "Net weight per unit",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Doypack / pouch",
              "PET jar",
              "Glass jar",
              "Squeeze bottle",
              "Sachet",
              "Bucket (foodservice)",
              "Bag-in-box (bulk)"
            ],
            "required": true
          },
          {
            "key": "additives",
            "label": "Additives / preservatives",
            "type": "multiselect",
            "options": [
              "None",
              "Modified starch",
              "Xanthan gum",
              "EDTA",
              "Sorbic acid",
              "Sodium benzoate",
              "Mustard",
              "Sugar"
            ]
          }
        ]
      },
      {
        "name": "Pasta",
        "fields": [
          {
            "key": "shape",
            "label": "Shape / cut",
            "type": "select",
            "options": [
              "Spaghetti",
              "Penne",
              "Fusilli",
              "Macaroni",
              "Farfalle",
              "Vermicelli",
              "Lasagne",
              "Tagliatelle",
              "Rigatoni",
              "Noodles",
              "Shells (conchiglie)"
            ],
            "required": true
          },
          {
            "key": "flour_type",
            "label": "Flour / raw material",
            "type": "select",
            "options": [
              "Durum semolina (100%)",
              "Durum + soft wheat",
              "Soft wheat",
              "Whole wheat",
              "Gluten-free (rice/corn)",
              "Egg pasta"
            ],
            "required": true
          },
          {
            "key": "protein_pct",
            "label": "Protein",
            "type": "number",
            "unit": "%",
            "help": "Durum typ. 12-14%"
          },
          {
            "key": "cook_type",
            "label": "Cook / process",
            "type": "select",
            "options": [
              "Dried",
              "Fresh",
              "Instant / precooked",
              "Bronze-die",
              "Teflon-die"
            ]
          },
          {
            "key": "net_weight_g",
            "label": "Net weight per unit",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Flow pack",
              "Carton box",
              "Cellophane bag",
              "Bulk sack"
            ]
          }
        ]
      },
      {
        "name": "Oils & fats",
        "fields": [
          {
            "key": "oil_type",
            "label": "Oil type",
            "type": "select",
            "options": [
              "Sunflower",
              "Palm",
              "Palm kernel",
              "Soybean",
              "Olive",
              "Rapeseed / canola",
              "Corn",
              "Coconut",
              "Cottonseed",
              "Groundnut / peanut",
              "Sesame",
              "Rice bran",
              "Flaxseed / linseed"
            ],
            "required": true
          },
          {
            "key": "state",
            "label": "State / refinement",
            "type": "select",
            "options": [
              "Crude",
              "Refined",
              "RBD",
              "Semi-refined",
              "Virgin",
              "Extra virgin",
              "Winterized"
            ],
            "required": true
          },
          {
            "key": "extraction",
            "label": "Extraction method",
            "type": "select",
            "options": [
              "Cold-pressed",
              "Expeller-pressed",
              "Solvent-extracted"
            ]
          },
          {
            "key": "ffa_pct",
            "label": "Acidity (FFA)",
            "type": "number",
            "unit": "%",
            "help": "Free fatty acids, as oleic"
          },
          {
            "key": "iodine_value",
            "label": "Iodine value",
            "type": "number",
            "help": "Degree of unsaturation"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "PET bottle",
              "Glass bottle",
              "Jerry can",
              "Tin",
              "Drum",
              "IBC tote",
              "Flexitank",
              "Bulk tanker"
            ],
            "required": true
          }
        ]
      },
      {
        "name": "Flour",
        "fields": [
          {
            "key": "flour_type",
            "label": "Flour type",
            "type": "select",
            "options": [
              "Wheat",
              "Whole wheat",
              "Durum",
              "Rye",
              "Corn / maize",
              "Rice",
              "Chickpea (gram)",
              "Soy",
              "Buckwheat",
              "Oat",
              "Tapioca"
            ],
            "required": true
          },
          {
            "key": "grade",
            "label": "Grade / class",
            "type": "select",
            "options": [
              "Extra / premium",
              "1st grade",
              "2nd grade",
              "All-purpose",
              "Bread flour",
              "Cake / pastry",
              "Type 550",
              "Type 405",
              "Type 00"
            ]
          },
          {
            "key": "extraction_rate_pct",
            "label": "Extraction rate",
            "type": "number",
            "unit": "%",
            "help": "White ~72%, wholemeal ~100%"
          },
          {
            "key": "protein_pct",
            "label": "Protein",
            "type": "number",
            "unit": "%",
            "help": "Bread flour ~12-14%"
          },
          {
            "key": "ash_content_pct",
            "label": "Ash content",
            "type": "number",
            "unit": "%",
            "help": "Determines type/grade"
          },
          {
            "key": "gluten_pct",
            "label": "Wet gluten",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Beverages",
        "fields": [
          {
            "key": "beverage_type",
            "label": "Beverage type",
            "type": "select",
            "options": [
              "Fruit juice",
              "Nectar",
              "Juice drink",
              "Carbonated soft drink",
              "Still water",
              "Sparkling water",
              "Energy drink",
              "Iced tea",
              "Plant-based drink",
              "Syrup / cordial",
              "Kvass"
            ],
            "required": true
          },
          {
            "key": "juice_content_pct",
            "label": "Juice content",
            "type": "number",
            "unit": "%",
            "help": "e.g. 100% juice, 25% nectar"
          },
          {
            "key": "carbonated",
            "label": "Carbonated",
            "type": "boolean"
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix"
          },
          {
            "key": "net_volume_ml",
            "label": "Net volume per unit",
            "type": "number",
            "unit": "ml"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "PET bottle",
              "Glass bottle",
              "Aluminium can",
              "Tetra Pak / carton",
              "Pouch",
              "Bag-in-box"
            ],
            "required": true
          },
          {
            "key": "additives",
            "label": "Additives / sweeteners",
            "type": "multiselect",
            "options": [
              "None",
              "Sugar",
              "Aspartame",
              "Acesulfame-K",
              "Stevia",
              "Citric acid",
              "Ascorbic acid",
              "Sodium benzoate",
              "CO2"
            ]
          }
        ]
      },
      {
        "name": "Pastes & purées",
        "fields": [
          {
            "key": "base",
            "label": "Base product",
            "type": "text",
            "required": true,
            "help": "e.g. Tomato, Apple, Mango, Garlic, Chilli, Ginger"
          },
          {
            "key": "product_form",
            "label": "Form",
            "type": "select",
            "options": [
              "Paste",
              "Purée",
              "Concentrate",
              "Pulp",
              "Passata"
            ]
          },
          {
            "key": "brix",
            "label": "Brix",
            "type": "number",
            "unit": "°Brix",
            "required": true,
            "help": "Tomato paste typ. 28-30 or 36-38"
          },
          {
            "key": "process",
            "label": "Break process (tomato)",
            "type": "select",
            "options": [
              "Hot break",
              "Cold break",
              "N/A"
            ]
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Aseptic bag-in-drum",
              "Aseptic bag-in-box",
              "Can / tin",
              "Glass jar",
              "Sachet",
              "Tube",
              "IBC tote"
            ]
          },
          {
            "key": "additives",
            "label": "Additives / preservatives",
            "type": "multiselect",
            "options": [
              "None",
              "Salt",
              "Sugar",
              "Citric acid",
              "Ascorbic acid",
              "SO2"
            ]
          }
        ]
      },
      {
        "name": "Instant foods",
        "fields": [
          {
            "key": "product_type",
            "label": "Product type",
            "type": "select",
            "options": [
              "Instant noodles",
              "Instant soup",
              "Instant porridge",
              "Instant coffee mix",
              "Instant mashed potato",
              "Bouillon / cube",
              "Ready meal (retort)",
              "Instant beverage powder",
              "Cup meal"
            ],
            "required": true
          },
          {
            "key": "preparation",
            "label": "Preparation",
            "type": "select",
            "options": [
              "Add hot water",
              "Add boiling water",
              "Microwave",
              "Cook 3-5 min",
              "Ready to eat (retort)"
            ]
          },
          {
            "key": "flavor",
            "label": "Flavor / variety",
            "type": "text",
            "help": "e.g. Chicken, Beef, Vegetable, Curry"
          },
          {
            "key": "net_weight_g",
            "label": "Net weight per unit",
            "type": "number",
            "unit": "g"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Sachet / pillow pack",
              "Cup / bowl",
              "Retort pouch",
              "Carton box",
              "Jar"
            ],
            "required": true
          },
          {
            "key": "additives",
            "label": "Additives / preservatives",
            "type": "multiselect",
            "options": [
              "None",
              "MSG (E621)",
              "Palm oil",
              "Salt",
              "Yeast extract",
              "Flavor enhancers",
              "TBHQ"
            ]
          }
        ]
      },
      {
        "name": "Sugar",
        "fields": [
          {
            "key": "sugar_type",
            "label": "Sugar type",
            "type": "select",
            "options": [
              "White",
              "Refined",
              "Raw",
              "Brown",
              "Icing / powdered",
              "Demerara",
              "Cube",
              "Liquid sugar"
            ],
            "required": true
          },
          {
            "key": "icumsa",
            "label": "ICUMSA",
            "type": "select",
            "options": [
              "45",
              "100",
              "150",
              "600-1200 (raw)"
            ],
            "required": true,
            "help": "Colour grade; 45 = whitest"
          },
          {
            "key": "source",
            "label": "Source",
            "type": "select",
            "options": [
              "Cane",
              "Beet"
            ]
          },
          {
            "key": "crystal_size_mm",
            "label": "Crystal / grain size",
            "type": "select",
            "options": [
              "Fine",
              "Medium",
              "Coarse",
              "Extra fine",
              "Powdered"
            ],
            "help": "Approx grain, e.g. 0.6-1.0 mm medium"
          },
          {
            "key": "polarization_pct",
            "label": "Polarization",
            "type": "number",
            "unit": "%",
            "help": "Sucrose content, e.g. ≥99.8%"
          },
          {
            "key": "packaging",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "1 kg retail",
              "25 kg bag",
              "50 kg bag",
              "Big bag / FIBC",
              "Bulk"
            ]
          }
        ]
      },
      {
        "name": "Dried fruits & berries",
        "fields": [
          {
            "key": "fruit",
            "label": "Fruit / berry",
            "type": "text",
            "required": true,
            "help": "e.g. Raisin, Apricot, Cranberry, Fig, Date, Prune"
          },
          {
            "key": "cut",
            "label": "Cut / form",
            "type": "select",
            "options": [
              "Whole",
              "Halves",
              "Sliced",
              "Diced",
              "Pitted",
              "Unpitted"
            ],
            "required": true
          },
          {
            "key": "sulphured",
            "label": "Sulphuring",
            "type": "select",
            "options": [
              "Sulphured",
              "Unsulphured"
            ],
            "help": "SO2 treatment for colour retention"
          },
          {
            "key": "sugar_added",
            "label": "Added sugar / infused",
            "type": "boolean"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "size_grade",
            "label": "Size / count grade",
            "type": "text",
            "help": "e.g. dates count per 100 g, apricot #1-#5"
          }
        ]
      },
      {
        "name": "Texturates",
        "fields": [
          {
            "key": "source",
            "label": "Protein source",
            "type": "select",
            "options": [
              "Soy (TVP/TSP)",
              "Pea",
              "Wheat gluten",
              "Faba bean",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form / shape",
            "type": "select",
            "options": [
              "Flakes",
              "Granules / mince",
              "Chunks",
              "Strips / fillet",
              "Nuggets"
            ],
            "required": true
          },
          {
            "key": "protein_content_pct",
            "label": "Protein content",
            "type": "number",
            "unit": "%",
            "help": "TVP typ. 50-70%"
          },
          {
            "key": "texturizing",
            "label": "Texturizing process",
            "type": "select",
            "options": [
              "Low-moisture extrusion",
              "High-moisture extrusion (HMMA)"
            ]
          },
          {
            "key": "color",
            "label": "Colour",
            "type": "select",
            "options": [
              "Natural / beige",
              "Caramel",
              "Red (meat-like)"
            ]
          },
          {
            "key": "flavor",
            "label": "Flavour",
            "type": "select",
            "options": [
              "Neutral / unflavored",
              "Beef",
              "Chicken",
              "Bacon",
              "Custom"
            ]
          }
        ]
      },
      {
        "name": "Tea coffee & cocoa",
        "fields": [
          {
            "key": "product",
            "label": "Product",
            "type": "select",
            "options": [
              "Tea",
              "Coffee",
              "Cocoa"
            ],
            "required": true
          },
          {
            "key": "processing_state",
            "label": "Processing / roast state",
            "type": "select",
            "options": [
              "Green (unroasted)",
              "Roasted",
              "Fermented",
              "Unfermented",
              "Fresh leaf",
              "Dried leaf"
            ]
          },
          {
            "key": "variety",
            "label": "Variety / botanical",
            "type": "select",
            "options": [
              "Arabica",
              "Robusta",
              "Black tea",
              "Green tea",
              "Oolong",
              "White tea",
              "Herbal",
              "Cocoa Forastero",
              "Cocoa Criollo",
              "Cocoa Trinitario"
            ]
          },
          {
            "key": "screen_size",
            "label": "Screen size / grade",
            "type": "text",
            "help": "Coffee e.g. Screen 15-18; tea OP/BOP/FTGFOP"
          },
          {
            "key": "roast_level",
            "label": "Roast level (coffee)",
            "type": "select",
            "options": [
              "Light",
              "Medium",
              "Medium-dark",
              "Dark",
              "Espresso",
              "N/A"
            ]
          },
          {
            "key": "grind",
            "label": "Grind / form",
            "type": "select",
            "options": [
              "Whole bean",
              "Ground",
              "Whole leaf",
              "Broken",
              "Powder / cocoa",
              "Nibs",
              "Instant"
            ]
          },
          {
            "key": "defects_per_300g",
            "label": "Defect count (coffee)",
            "type": "number",
            "help": "Green coffee defects per 300 g sample"
          }
        ]
      },
      {
        "name": "Egg products",
        "fields": [
          {
            "key": "product_form",
            "label": "Product form",
            "type": "select",
            "options": [
              "Whole egg powder",
              "Egg white powder / albumen",
              "Egg yolk powder",
              "Liquid whole egg",
              "Liquid egg white",
              "Liquid egg yolk",
              "Frozen egg",
              "Boiled / peeled egg"
            ],
            "required": true
          },
          {
            "key": "egg_source",
            "label": "Egg source",
            "type": "select",
            "options": [
              "Hen",
              "Duck",
              "Quail"
            ]
          },
          {
            "key": "treatment",
            "label": "Treatment",
            "type": "select",
            "options": [
              "Pasteurized",
              "Spray-dried",
              "Salted",
              "Sugared",
              "High-gel / high-whip"
            ]
          },
          {
            "key": "protein_pct",
            "label": "Protein (powder, dry)",
            "type": "number",
            "unit": "%"
          },
          {
            "key": "net_weight",
            "label": "Net weight per unit",
            "type": "text",
            "help": "e.g. 25 kg bag, 1 kg pack, 10 kg BIB"
          },
          {
            "key": "packaging_format",
            "label": "Packaging format",
            "type": "select",
            "options": [
              "Bag (powder)",
              "Bag-in-box (liquid)",
              "Aseptic carton",
              "Bucket / pail",
              "Frozen block",
              "IBC tote"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Technical raw materials",
    "emoji": "🧵",
    "slug": "technical",
    "subcategories": [
      {
        "name": "Fur",
        "fields": [
          {
            "key": "source_animal",
            "label": "Source animal",
            "type": "select",
            "options": [
              "Mink",
              "Fox (red)",
              "Fox (silver)",
              "Fox (blue/arctic)",
              "Sable",
              "Rabbit",
              "Chinchilla",
              "Raccoon dog (finnraccoon)",
              "Karakul/Astrakhan",
              "Muskrat",
              "Sheepskin (shearling)",
              "Other"
            ],
            "required": true
          },
          {
            "key": "treatment",
            "label": "Treatment",
            "type": "select",
            "options": [
              "Raw (green)",
              "Salted",
              "Dried",
              "Pickled",
              "Tanned (dressed)",
              "Dyed"
            ],
            "required": true
          },
          {
            "key": "pelt_grade",
            "label": "Pelt grade",
            "type": "select",
            "options": [
              "Saga Royal",
              "Saga",
              "Quality 1",
              "Quality 2",
              "Quality 3",
              "I",
              "II",
              "III"
            ],
            "help": "Auction / national grading class"
          },
          {
            "key": "size_class",
            "label": "Size class",
            "type": "select",
            "options": [
              "XXL (50)",
              "XL (40)",
              "L (30)",
              "M (20)",
              "S (10)",
              "0",
              "00"
            ],
            "help": "Kopenhagen/Saga size scale"
          },
          {
            "key": "color_type",
            "label": "Color",
            "type": "select",
            "options": [
              "Natural",
              "Dyed"
            ]
          },
          {
            "key": "color_phase",
            "label": "Color phase / shade",
            "type": "text",
            "help": "e.g. Black, Mahogany, Pearl, Silverblue, Pastel"
          },
          {
            "key": "pelt_length_cm",
            "label": "Pelt length",
            "type": "number",
            "unit": "cm"
          }
        ]
      },
      {
        "name": "Natural casings",
        "fields": [
          {
            "key": "source_animal",
            "label": "Source animal",
            "type": "select",
            "options": [
              "Hog",
              "Sheep",
              "Beef (cattle)",
              "Goat"
            ],
            "required": true
          },
          {
            "key": "casing_type",
            "label": "Casing type",
            "type": "select",
            "options": [
              "Small intestine (rounds)",
              "Hog middles",
              "Hog bung",
              "Beef rounds",
              "Beef middles",
              "Beef bung",
              "Beef weasand",
              "Sheep rounds"
            ],
            "required": true
          },
          {
            "key": "caliber_mm",
            "label": "Caliber",
            "type": "text",
            "unit": "mm",
            "help": "Diameter range, e.g. 22/24, 28/30, 32/34"
          },
          {
            "key": "treatment",
            "label": "Treatment / preservation",
            "type": "select",
            "options": [
              "Salted (dry-salted)",
              "Salted in brine",
              "Pre-flushed & tubed",
              "Pre-cut",
              "Netted"
            ]
          },
          {
            "key": "quality_grade",
            "label": "Quality grade",
            "type": "select",
            "options": [
              "A",
              "B",
              "C",
              "AA"
            ],
            "help": "By strength/holes per hank"
          },
          {
            "key": "length_per_hank_m",
            "label": "Length per hank/bundle",
            "type": "number",
            "unit": "m"
          },
          {
            "key": "salt_free",
            "label": "Salt-free / desalted",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Feathers & down",
        "fields": [
          {
            "key": "source_animal",
            "label": "Source bird",
            "type": "select",
            "options": [
              "Goose (white)",
              "Goose (grey)",
              "Duck (white)",
              "Duck (grey)",
              "Mixed goose/duck"
            ],
            "required": true
          },
          {
            "key": "content_ratio",
            "label": "Down / feather ratio",
            "type": "text",
            "help": "e.g. 90/10 down/feather, 30/70, 15/85"
          },
          {
            "key": "fill_power",
            "label": "Fill power",
            "type": "number",
            "unit": "in³/oz",
            "help": "Loft; higher = better insulation (e.g. 600, 700, 800 cuin)"
          },
          {
            "key": "treatment",
            "label": "Treatment",
            "type": "select",
            "options": [
              "Raw (greasy)",
              "Washed",
              "Washed & sterilized",
              "Sterilized only"
            ],
            "required": true
          },
          {
            "key": "cleanliness_turbidity_mm",
            "label": "Turbidity (cleanliness)",
            "type": "number",
            "unit": "mm",
            "help": "Higher = cleaner; std ≥300–500mm"
          },
          {
            "key": "oxygen_number",
            "label": "Oxygen number",
            "type": "number",
            "unit": "mg",
            "help": "Residual organic matter; lower = cleaner"
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Horns",
        "fields": [
          {
            "key": "source_animal",
            "label": "Source animal",
            "type": "select",
            "options": [
              "Cattle (cow/ox)",
              "Buffalo",
              "Sheep",
              "Goat",
              "Deer/Stag (antler)"
            ],
            "required": true
          },
          {
            "key": "item_type",
            "label": "Item type",
            "type": "select",
            "options": [
              "Whole horn",
              "Horn tips",
              "Horn plates/sheets",
              "Horn shavings/meal",
              "Hoof",
              "Antler"
            ],
            "required": true
          },
          {
            "key": "treatment",
            "label": "Treatment",
            "type": "select",
            "options": [
              "Raw",
              "Boiled/cleaned",
              "Bleached",
              "Polished",
              "Cut/split"
            ]
          },
          {
            "key": "color_type",
            "label": "Color",
            "type": "select",
            "options": [
              "Natural (black)",
              "Natural (blonde/white)",
              "Natural (mixed/marbled)",
              "Dyed"
            ]
          },
          {
            "key": "length_cm",
            "label": "Length",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "wall_thickness_mm",
            "label": "Wall thickness",
            "type": "number",
            "unit": "mm"
          }
        ]
      },
      {
        "name": "Wool",
        "fields": [
          {
            "key": "source_animal",
            "label": "Source animal",
            "type": "select",
            "options": [
              "Sheep (Merino)",
              "Sheep (crossbred)",
              "Sheep (coarse/carpet)",
              "Cashmere goat",
              "Mohair (Angora goat)",
              "Alpaca",
              "Camel",
              "Angora rabbit"
            ],
            "required": true
          },
          {
            "key": "micron",
            "label": "Fineness",
            "type": "number",
            "unit": "µm",
            "required": true,
            "help": "Mean fibre diameter; Merino ~17–24µm, carpet >30µm"
          },
          {
            "key": "treatment",
            "label": "Treatment / state",
            "type": "select",
            "options": [
              "Greasy (raw)",
              "Scoured (washed)",
              "Carbonized",
              "Carded (sliver)",
              "Combed (top)"
            ]
          },
          {
            "key": "staple_length_mm",
            "label": "Staple length",
            "type": "number",
            "unit": "mm"
          },
          {
            "key": "yield_pct",
            "label": "Clean yield",
            "type": "number",
            "unit": "%",
            "help": "Clean fibre after scouring"
          },
          {
            "key": "color_type",
            "label": "Color",
            "type": "select",
            "options": [
              "Natural white",
              "Natural coloured",
              "Dyed"
            ]
          },
          {
            "key": "vm_pct",
            "label": "Vegetable matter (VM)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Hides",
        "fields": [
          {
            "key": "source_animal",
            "label": "Source animal",
            "type": "select",
            "options": [
              "Cattle (cow)",
              "Cattle (bull)",
              "Cattle (ox)",
              "Calf",
              "Buffalo",
              "Sheep/lamb skin",
              "Goat skin"
            ],
            "required": true
          },
          {
            "key": "treatment",
            "label": "Treatment / cure",
            "type": "select",
            "options": [
              "Raw (fresh/green)",
              "Wet-salted",
              "Dry-salted",
              "Dried (air-cured)",
              "Wet blue (chrome-tanned)",
              "Crust",
              "Pickled"
            ],
            "required": true
          },
          {
            "key": "hide_grade",
            "label": "Grade (TR classification)",
            "type": "select",
            "options": [
              "TR1",
              "TR2",
              "TR3",
              "TR4",
              "TR5",
              "TR6"
            ],
            "help": "By defects/holes; TR1 = best"
          },
          {
            "key": "weight_class_kg",
            "label": "Weight class",
            "type": "text",
            "unit": "kg",
            "help": "Per hide, e.g. light <20, medium 20–30, heavy >30"
          },
          {
            "key": "area_sqft",
            "label": "Area (for tanned)",
            "type": "number",
            "unit": "ft²",
            "help": "For wet blue/crust, per hide"
          },
          {
            "key": "thickness_mm",
            "label": "Substance / thickness",
            "type": "number",
            "unit": "mm"
          }
        ]
      }
    ]
  },
  {
    "name": "Beekeeping products",
    "emoji": "🍯",
    "slug": "beekeeping",
    "subcategories": [
      {
        "name": "Honey",
        "fields": [
          {
            "key": "floral_source",
            "label": "Floral source",
            "type": "select",
            "options": [
              "Acacia",
              "Wildflower (polyfloral)",
              "Linden",
              "Buckwheat",
              "Sunflower",
              "Rapeseed/Canola",
              "Clover",
              "Chestnut",
              "Manuka",
              "Honeydew (forest)",
              "Other"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Liquid",
              "Creamed (whipped)",
              "Comb honey",
              "Chunk (comb in liquid)",
              "Crystallized",
              "Raw"
            ],
            "required": true
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "required": true,
            "help": "≤18% for premium; ≤20% max"
          },
          {
            "key": "color_grade",
            "label": "Color grade (Pfund)",
            "type": "select",
            "options": [
              "Water white (0–8)",
              "Extra white (9–17)",
              "White (18–34)",
              "Extra light amber (35–50)",
              "Light amber (51–85)",
              "Amber (86–114)",
              "Dark amber (>114)"
            ],
            "help": "USDA/Pfund mm scale"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw (unheated, unfiltered)",
              "Strained",
              "Filtered",
              "Pasteurized",
              "Ultrafiltered"
            ]
          },
          {
            "key": "hmf_mg_kg",
            "label": "HMF",
            "type": "number",
            "unit": "mg/kg",
            "help": "Freshness/heat marker; ≤40 EU, ≤15 premium"
          },
          {
            "key": "diastase_number",
            "label": "Diastase activity",
            "type": "number",
            "unit": "DN",
            "help": "Enzyme activity; ≥8 (Schade)"
          }
        ]
      },
      {
        "name": "Beeswax",
        "fields": [
          {
            "key": "wax_origin",
            "label": "Wax origin",
            "type": "select",
            "options": [
              "Cappings (premium)",
              "Brood comb",
              "Rendered slumgum",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Block/ingot",
              "Pellets/pastilles",
              "Slab",
              "Sheet"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing / refinement",
            "type": "select",
            "options": [
              "Raw (crude)",
              "Filtered",
              "Bleached (natural/sun)",
              "Chemically bleached",
              "Pharmaceutical/cosmetic grade"
            ]
          },
          {
            "key": "color_type",
            "label": "Color",
            "type": "select",
            "options": [
              "Natural yellow",
              "Golden",
              "Dark brown",
              "White (bleached)"
            ]
          },
          {
            "key": "melting_point_c",
            "label": "Melting point",
            "type": "number",
            "unit": "°C",
            "help": "Genuine beeswax ~62–65°C"
          },
          {
            "key": "purity_pct",
            "label": "Purity (no adulteration)",
            "type": "number",
            "unit": "%",
            "help": "Free of paraffin/stearin"
          }
        ]
      },
      {
        "name": "Bee bread",
        "fields": [
          {
            "key": "floral_source",
            "label": "Floral source",
            "type": "select",
            "options": [
              "Polyfloral (wildflower)",
              "Acacia",
              "Linden",
              "Buckwheat",
              "Rapeseed",
              "Willow",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Granules (from comb)",
              "In comb",
              "Ground/powder",
              "Paste (with honey)"
            ],
            "required": true
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Dried to ~14–15% for storage"
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw (freeze-dried)",
              "Air-dried",
              "Extracted from comb",
              "Frozen"
            ]
          },
          {
            "key": "purity_pct",
            "label": "Purity (bee bread content)",
            "type": "number",
            "unit": "%",
            "help": "Free of wax/comb residue"
          }
        ]
      },
      {
        "name": "Propolis",
        "fields": [
          {
            "key": "botanical_source",
            "label": "Botanical source",
            "type": "select",
            "options": [
              "Poplar (temperate)",
              "Birch",
              "Conifer/pine",
              "Green (Baccharis, Brazil)",
              "Red (Brazil)",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Raw (crude lumps)",
              "Powder/ground",
              "Tincture/extract",
              "Pellets",
              "Purified resin"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing",
            "type": "select",
            "options": [
              "Raw",
              "Cleaned (wax removed)",
              "Frozen & ground",
              "Ethanol extract",
              "Water extract"
            ]
          },
          {
            "key": "flavonoid_pct",
            "label": "Flavonoid content",
            "type": "number",
            "unit": "%",
            "help": "Key potency marker; premium >8%"
          },
          {
            "key": "wax_content_pct",
            "label": "Wax content",
            "type": "number",
            "unit": "%",
            "help": "Lower = purer resin"
          },
          {
            "key": "purity_pct",
            "label": "Purity (resin content)",
            "type": "number",
            "unit": "%"
          }
        ]
      },
      {
        "name": "Pollen",
        "fields": [
          {
            "key": "floral_source",
            "label": "Floral source",
            "type": "select",
            "options": [
              "Polyfloral (multiflora)",
              "Rapeseed",
              "Sunflower",
              "Chestnut",
              "Rockrose (cistus)",
              "Almond",
              "Willow",
              "Mixed"
            ],
            "required": true
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Bee pollen granules",
              "Powder (milled)",
              "Frozen",
              "Pellets"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing / drying",
            "type": "select",
            "options": [
              "Raw (fresh/frozen)",
              "Air-dried (<40°C)",
              "Freeze-dried",
              "Oven-dried"
            ]
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Dried ≤6–8%; fresh higher"
          },
          {
            "key": "color_type",
            "label": "Color",
            "type": "select",
            "options": [
              "Mixed/multicolor",
              "Yellow",
              "Orange",
              "Brown",
              "Dark"
            ]
          },
          {
            "key": "purity_pct",
            "label": "Purity (cleaned/sieved)",
            "type": "number",
            "unit": "%",
            "help": "Free of debris/dead bees"
          }
        ]
      },
      {
        "name": "Foundation",
        "fields": [
          {
            "key": "material",
            "label": "Material",
            "type": "select",
            "options": [
              "Pure beeswax",
              "Wax-coated plastic",
              "Plastic",
              "Wax with wire"
            ],
            "required": true
          },
          {
            "key": "cell_type",
            "label": "Cell type",
            "type": "select",
            "options": [
              "Worker cell",
              "Drone cell",
              "Cut comb (thin super)"
            ],
            "required": true
          },
          {
            "key": "cell_size_mm",
            "label": "Cell size",
            "type": "select",
            "options": [
              "5.4 mm (standard)",
              "4.9 mm (small cell)",
              "5.1 mm",
              "6.6 mm (drone)"
            ],
            "help": "Worker foundation typically 5.3–5.5mm"
          },
          {
            "key": "frame_format",
            "label": "Frame format",
            "type": "select",
            "options": [
              "Langstroth deep",
              "Langstroth medium/shallow",
              "Dadant",
              "National (British)",
              "Warré",
              "Custom"
            ]
          },
          {
            "key": "sheet_thickness",
            "label": "Sheet weight/thickness",
            "type": "text",
            "help": "e.g. sheets per kg, or thin/heavy brood"
          },
          {
            "key": "wired",
            "label": "Wired / vertical wired",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Dead bees",
        "fields": [
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Whole dried bees",
              "Powder (ground)",
              "Tincture/extract"
            ],
            "required": true
          },
          {
            "key": "processing",
            "label": "Processing / drying",
            "type": "select",
            "options": [
              "Raw (frozen)",
              "Air-dried",
              "Oven-dried",
              "Freeze-dried"
            ],
            "required": true
          },
          {
            "key": "moisture_pct",
            "label": "Moisture",
            "type": "number",
            "unit": "%",
            "help": "Dried ≤8–10% to prevent mold"
          },
          {
            "key": "purity_pct",
            "label": "Purity (cleaned)",
            "type": "number",
            "unit": "%",
            "help": "Free of wax, debris, hive litter"
          },
          {
            "key": "pesticide_free",
            "label": "Pesticide/treatment-free",
            "type": "boolean",
            "help": "No acaricide/varroa-treatment residue"
          }
        ]
      }
    ]
  },
  {
    "name": "Ornamental plants",
    "emoji": "🌸",
    "slug": "ornamental",
    "subcategories": [
      {
        "name": "Succulents",
        "fields": [
          {
            "key": "species_variety",
            "label": "Species / variety",
            "type": "text",
            "required": true,
            "help": "e.g. Echeveria 'Perle von Nürnberg', Haworthia, Aloe, Sedum"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Potted",
              "Bare-root",
              "Cutting/offset",
              "Rooted plug",
              "Leaf (for propagation)"
            ],
            "required": true
          },
          {
            "key": "pot_size_cm",
            "label": "Pot size (Ø)",
            "type": "number",
            "unit": "cm",
            "help": "Diameter, e.g. 5.5, 7, 10.5, 12"
          },
          {
            "key": "plant_height_cm",
            "label": "Plant height",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "rosette_diameter_cm",
            "label": "Rosette / crown diameter",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "text",
            "help": "e.g. green, blue-grey, variegated, red-tipped"
          },
          {
            "key": "grafted",
            "label": "Grafted",
            "type": "boolean",
            "help": "e.g. Gymnocalycium moon cactus"
          }
        ]
      },
      {
        "name": "Conifers",
        "fields": [
          {
            "key": "species_variety",
            "label": "Species / variety",
            "type": "text",
            "required": true,
            "help": "e.g. Thuja occidentalis 'Smaragd', Picea, Juniperus, Pinus mugo"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Potted (container)",
              "Root-balled (B&B)",
              "Bare-root",
              "Rooted cutting/liner"
            ],
            "required": true
          },
          {
            "key": "height_cm",
            "label": "Height",
            "type": "number",
            "unit": "cm",
            "required": true,
            "help": "Top of plant from soil"
          },
          {
            "key": "pot_size_cm",
            "label": "Pot / container size",
            "type": "text",
            "help": "e.g. C3, C5, C10 (litres) or Ø cm"
          },
          {
            "key": "root_ball_cm",
            "label": "Root ball diameter",
            "type": "number",
            "unit": "cm",
            "help": "For B&B stock"
          },
          {
            "key": "shape_habit",
            "label": "Shape / habit",
            "type": "select",
            "options": [
              "Column/pyramidal",
              "Globe/ball",
              "Spiral (topiary)",
              "Bonsai/niwaki",
              "Ground cover/spreading",
              "Standard (stem)",
              "Weeping"
            ]
          },
          {
            "key": "color",
            "label": "Foliage color",
            "type": "text",
            "help": "e.g. green, blue, golden, variegated"
          }
        ]
      },
      {
        "name": "Fresh-cut flowers",
        "fields": [
          {
            "key": "species_variety",
            "label": "Species / variety",
            "type": "text",
            "required": true,
            "help": "e.g. Rose 'Freedom', Tulip, Chrysanthemum, Gerbera, Lisianthus"
          },
          {
            "key": "form",
            "label": "Form",
            "type": "select",
            "options": [
              "Cut stem (single)",
              "Bunch",
              "Spray/multi-head",
              "Bouquet"
            ],
            "required": true
          },
          {
            "key": "stem_length_cm",
            "label": "Stem length",
            "type": "number",
            "unit": "cm",
            "required": true,
            "help": "Key grading spec, e.g. 40/50/60/70/80/90"
          },
          {
            "key": "color",
            "label": "Color",
            "type": "text",
            "help": "e.g. red, white, pink, bi-color, assorted"
          },
          {
            "key": "maturity_stage",
            "label": "Cut / opening stage",
            "type": "select",
            "options": [
              "Tight bud",
              "Cracking bud (showing color)",
              "Half open",
              "Open/blooming"
            ]
          },
          {
            "key": "vase_life_days",
            "label": "Vase life",
            "type": "number",
            "unit": "days"
          },
          {
            "key": "stems_per_bunch",
            "label": "Stems per bunch",
            "type": "number",
            "help": "e.g. 10, 20, 25"
          }
        ]
      }
    ]
  },
  {
    "name": "Spare parts for machinery",
    "emoji": "🔧",
    "slug": "parts",
    "subcategories": [
      {
        "name": "Loader & excavator parts",
        "fields": [
          {
            "key": "part_group",
            "label": "Part group",
            "type": "select",
            "options": [
              "Bucket / attachment",
              "Bucket teeth & adapters",
              "Cutting edge",
              "Undercarriage (track chain/roller/idler)",
              "Hydraulic cylinder",
              "Hydraulic pump / motor",
              "Boom / arm / stick",
              "Pins & bushings",
              "Final drive / travel motor",
              "Swing bearing",
              "Engine part",
              "Cab / electrics"
            ],
            "required": true
          },
          {
            "key": "compat_make_model",
            "label": "Compatible make / model",
            "type": "text",
            "required": true,
            "help": "e.g. CAT 320D, Komatsu PC200, JCB 3CX"
          },
          {
            "key": "sourcing",
            "label": "OEM / aftermarket / rebuilt",
            "type": "select",
            "options": [
              "OEM",
              "Aftermarket",
              "Rebuilt / remanufactured"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ],
            "required": true
          },
          {
            "key": "part_number",
            "label": "Part / OEM number",
            "type": "text"
          },
          {
            "key": "tooth_pin_size",
            "label": "Tooth / pin size",
            "type": "text",
            "help": "Tip series or pin diameter, e.g. J350, 40mm pin"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Other machinery parts",
        "fields": [
          {
            "key": "part_type",
            "label": "Part type",
            "type": "text",
            "required": true,
            "help": "Describe the component, e.g. gearbox, PTO shaft, bearing"
          },
          {
            "key": "compat_make_model",
            "label": "Compatible make / model",
            "type": "text",
            "required": true
          },
          {
            "key": "machine_category",
            "label": "Machine category",
            "type": "select",
            "options": [
              "Tillage",
              "Sprayer",
              "Irrigation",
              "Grain handling",
              "Hay / forage",
              "Livestock",
              "Other"
            ]
          },
          {
            "key": "sourcing",
            "label": "OEM / aftermarket / rebuilt",
            "type": "select",
            "options": [
              "OEM",
              "Aftermarket",
              "Rebuilt / remanufactured"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "part_number",
            "label": "Part / OEM number",
            "type": "text"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Forage machinery parts",
        "fields": [
          {
            "key": "part_group",
            "label": "Part group",
            "type": "select",
            "options": [
              "Mower blades / discs",
              "Mower drum / disc bed",
              "Rake tines",
              "Tedder tines",
              "Baler knotter",
              "Baler pickup teeth",
              "Baler belts / chains",
              "Net / twine wrap parts",
              "Forage harvester knives / drum",
              "Shear bar",
              "Wagon floor chain"
            ],
            "required": true
          },
          {
            "key": "compat_make_model",
            "label": "Compatible make / model",
            "type": "text",
            "required": true,
            "help": "e.g. Krone, Claas, John Deere, Pöttinger"
          },
          {
            "key": "sourcing",
            "label": "OEM / aftermarket / rebuilt",
            "type": "select",
            "options": [
              "OEM",
              "Aftermarket",
              "Rebuilt / remanufactured"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "part_number",
            "label": "Part / OEM number",
            "type": "text"
          },
          {
            "key": "pack_qty",
            "label": "Pack quantity",
            "type": "number",
            "help": "Pieces per set, e.g. blade set of 25"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Combine parts",
        "fields": [
          {
            "key": "part_group",
            "label": "Part group",
            "type": "select",
            "options": [
              "Header / cutter bar",
              "Sickle sections & guards",
              "Reel",
              "Auger / feeder chain",
              "Threshing drum / rotor",
              "Concave",
              "Sieves / chaffer",
              "Straw walker",
              "Elevator chain",
              "Grain tank / unloading auger",
              "Belts & pulleys",
              "Engine part"
            ],
            "required": true
          },
          {
            "key": "compat_make_model",
            "label": "Compatible make / model",
            "type": "text",
            "required": true,
            "help": "e.g. John Deere S680, Claas Lexion, New Holland CX"
          },
          {
            "key": "sourcing",
            "label": "OEM / aftermarket / rebuilt",
            "type": "select",
            "options": [
              "OEM",
              "Aftermarket",
              "Rebuilt / remanufactured"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "part_number",
            "label": "Part / OEM number",
            "type": "text"
          },
          {
            "key": "header_width_ft",
            "label": "Header width",
            "type": "number",
            "unit": "ft",
            "help": "If header-related"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Harvester parts",
        "fields": [
          {
            "key": "part_group",
            "label": "Part group",
            "type": "select",
            "options": [
              "Digging / lifting share",
              "Elevator web / belt",
              "Picking rollers",
              "Rotor / drum",
              "Sorting table parts",
              "Conveyor chain",
              "Sieve / grid",
              "Blades / knives",
              "Hydraulic part",
              "Bearing / bushing"
            ],
            "required": true
          },
          {
            "key": "crop_type",
            "label": "Crop type",
            "type": "select",
            "options": [
              "Potato",
              "Beet",
              "Sugarcane",
              "Cotton",
              "Grape",
              "Vegetable",
              "Nut / tree",
              "Other"
            ]
          },
          {
            "key": "compat_make_model",
            "label": "Compatible make / model",
            "type": "text",
            "required": true,
            "help": "e.g. Grimme, Ropa, Case IH cotton picker"
          },
          {
            "key": "sourcing",
            "label": "OEM / aftermarket / rebuilt",
            "type": "select",
            "options": [
              "OEM",
              "Aftermarket",
              "Rebuilt / remanufactured"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "part_number",
            "label": "Part / OEM number",
            "type": "text"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Tractor parts",
        "fields": [
          {
            "key": "part_group",
            "label": "Part group",
            "type": "select",
            "options": [
              "Engine",
              "Fuel system / injector",
              "Transmission / gearbox",
              "Clutch",
              "Hydraulics / 3-point linkage",
              "PTO",
              "Front axle / steering",
              "Brakes",
              "Electrical / alternator",
              "Cab / seat",
              "Filters",
              "Tyres / wheels"
            ],
            "required": true
          },
          {
            "key": "compat_make_model",
            "label": "Compatible make / model",
            "type": "text",
            "required": true,
            "help": "e.g. John Deere 5075E, Massey Ferguson 385, Mahindra 575"
          },
          {
            "key": "sourcing",
            "label": "OEM / aftermarket / rebuilt",
            "type": "select",
            "options": [
              "OEM",
              "Aftermarket",
              "Rebuilt / remanufactured"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ],
            "required": true
          },
          {
            "key": "part_number",
            "label": "Part / OEM number",
            "type": "text"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Seeder parts",
        "fields": [
          {
            "key": "part_group",
            "label": "Part group",
            "type": "select",
            "options": [
              "Seed disc / metering plate",
              "Opener / coulter",
              "Coulter disc",
              "Depth / gauge wheel",
              "Press / closing wheel",
              "Seed tube",
              "Seed / fertilizer hopper",
              "Metering unit / roller",
              "Chain & sprocket",
              "Pneumatic fan / hose",
              "Row unit parts"
            ],
            "required": true
          },
          {
            "key": "seeder_type",
            "label": "Seeder type",
            "type": "select",
            "options": [
              "Precision / planter",
              "Pneumatic drill",
              "Mechanical drill",
              "No-till / direct",
              "Air seeder"
            ]
          },
          {
            "key": "compat_make_model",
            "label": "Compatible make / model",
            "type": "text",
            "required": true,
            "help": "e.g. John Deere 1770, Kinze, Amazone, Kuhn"
          },
          {
            "key": "sourcing",
            "label": "OEM / aftermarket / rebuilt",
            "type": "select",
            "options": [
              "OEM",
              "Aftermarket",
              "Rebuilt / remanufactured"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "part_number",
            "label": "Part / OEM number",
            "type": "text"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      }
    ]
  },
  {
    "name": "Agricultural machinery",
    "emoji": "🚜",
    "slug": "machinery",
    "subcategories": [
      {
        "name": "Agricultural trucks",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "required": true,
            "help": "e.g. KAMAZ 65115, MAN TGS, Tata LPT"
          },
          {
            "key": "truck_type",
            "label": "Truck type",
            "type": "select",
            "options": [
              "Grain tipper",
              "Livestock carrier",
              "Milk tanker",
              "Refrigerated / reefer",
              "Flatbed",
              "Water bowser",
              "Feed / bulk"
            ]
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number",
            "required": true
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "engine_hours_km",
            "label": "Odometer",
            "type": "number",
            "unit": "km"
          },
          {
            "key": "power_hp",
            "label": "Engine power",
            "type": "number",
            "unit": "HP"
          },
          {
            "key": "payload_t",
            "label": "Payload capacity",
            "type": "number",
            "unit": "t"
          }
        ]
      },
      {
        "name": "Forage machinery",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "required": true,
            "help": "e.g. Krone BiG X, Claas Jaguar, John Deere baler"
          },
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Disc mower",
              "Drum mower",
              "Mower conditioner",
              "Tedder",
              "Rake",
              "Round baler",
              "Square baler",
              "Baler-wrapper combi",
              "Self-propelled forage harvester",
              "Pull-type forage harvester",
              "Bale wrapper",
              "Loader wagon"
            ],
            "required": true
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "engine_hours",
            "label": "Engine / operating hours",
            "type": "number",
            "unit": "h",
            "help": "For self-propelled units"
          },
          {
            "key": "working_width_m",
            "label": "Working width",
            "type": "number",
            "unit": "m"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Mini machinery",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "required": true,
            "help": "e.g. Kubota B, Yanmar, walk-behind tiller"
          },
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Mini / compact tractor",
              "Two-wheel / walk-behind tractor",
              "Power tiller / rotavator",
              "Mini excavator",
              "Mini loader",
              "Power weeder",
              "Garden / orchard machine"
            ],
            "required": true
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "power_hp",
            "label": "Engine power",
            "type": "number",
            "unit": "HP"
          },
          {
            "key": "fuel",
            "label": "Fuel",
            "type": "select",
            "options": [
              "Diesel",
              "Petrol",
              "Electric"
            ]
          },
          {
            "key": "engine_hours",
            "label": "Operating hours",
            "type": "number",
            "unit": "h"
          }
        ]
      },
      {
        "name": "Seeding machinery",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "required": true,
            "help": "e.g. Amazone, Kuhn, John Deere 1775NT"
          },
          {
            "key": "seeder_type",
            "label": "Seeder type",
            "type": "select",
            "options": [
              "Precision planter",
              "Pneumatic seed drill",
              "Mechanical seed drill",
              "No-till / direct drill",
              "Air seeder",
              "Broadcast seeder",
              "Potato planter",
              "Transplanter"
            ],
            "required": true
          },
          {
            "key": "rows",
            "label": "Number of rows",
            "type": "number"
          },
          {
            "key": "row_spacing_cm",
            "label": "Row spacing",
            "type": "number",
            "unit": "cm"
          },
          {
            "key": "working_width_m",
            "label": "Working width",
            "type": "number",
            "unit": "m"
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Trailers & semi-trailers",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "help": "e.g. Fliegl, Krampe, Bell"
          },
          {
            "key": "trailer_type",
            "label": "Trailer type",
            "type": "select",
            "options": [
              "Tipping trailer",
              "Grain / bulk trailer",
              "Silage trailer",
              "Livestock trailer",
              "Flatbed / platform",
              "Low loader",
              "Bale trailer",
              "Water / slurry tanker"
            ],
            "required": true
          },
          {
            "key": "axles",
            "label": "Number of axles",
            "type": "select",
            "options": [
              "1",
              "2",
              "3",
              "4+"
            ]
          },
          {
            "key": "payload_t",
            "label": "Payload capacity",
            "type": "number",
            "unit": "t",
            "required": true
          },
          {
            "key": "volume_m3",
            "label": "Box volume",
            "type": "number",
            "unit": "m³"
          },
          {
            "key": "tipping",
            "label": "Tipping",
            "type": "select",
            "options": [
              "Rear",
              "Three-way",
              "Non-tipping"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Other agricultural machinery",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "required": true
          },
          {
            "key": "machine_function",
            "label": "Machine function",
            "type": "text",
            "required": true,
            "help": "Describe what it does, e.g. stone picker, mulcher, post driver"
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "power_hp",
            "label": "Power requirement / engine",
            "type": "number",
            "unit": "HP"
          },
          {
            "key": "working_width_m",
            "label": "Working width / capacity",
            "type": "number",
            "unit": "m"
          },
          {
            "key": "warranty_months",
            "label": "Warranty",
            "type": "number",
            "unit": "months"
          }
        ]
      },
      {
        "name": "Fertilizer spreaders",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "help": "e.g. Amazone ZA-M, Kuhn Axis, Bogballe"
          },
          {
            "key": "spreader_type",
            "label": "Spreader type",
            "type": "select",
            "options": [
              "Twin-disc broadcast",
              "Single-disc broadcast",
              "Pendulum / oscillating",
              "Pneumatic boom",
              "Trailed",
              "Mounted",
              "Lime / bulk spreader",
              "Manure / muck spreader",
              "Slurry tanker"
            ],
            "required": true
          },
          {
            "key": "hopper_capacity_l",
            "label": "Hopper capacity",
            "type": "number",
            "unit": "L"
          },
          {
            "key": "working_width_m",
            "label": "Spread / working width",
            "type": "number",
            "unit": "m",
            "required": true
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "gps_rate_control",
            "label": "GPS / variable-rate control",
            "type": "boolean"
          }
        ]
      },
      {
        "name": "Livestock machinery",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "help": "e.g. DeLaval, Kuhn, Trioliet"
          },
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Milking machine / parlour",
              "Milk cooling tank",
              "Feed mixer wagon (TMR)",
              "Feed grinder / mill",
              "Silage cutter / block cutter",
              "Manure scraper / handling",
              "Bedding spreader",
              "Automatic feeder",
              "Cattle crush / handling",
              "Egg handling"
            ],
            "required": true
          },
          {
            "key": "target_animal",
            "label": "Target animal",
            "type": "multiselect",
            "options": [
              "Cattle / dairy",
              "Beef",
              "Pig",
              "Poultry",
              "Sheep / goat",
              "Horse"
            ]
          },
          {
            "key": "capacity",
            "label": "Capacity",
            "type": "number",
            "help": "e.g. mixer m³, tank L, cows/hour — note unit in description"
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Irrigation machinery",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "help": "e.g. Valley, Reinke, Bauer, Netafim"
          },
          {
            "key": "system_type",
            "label": "System type",
            "type": "select",
            "options": [
              "Center pivot",
              "Linear / lateral move",
              "Hose reel / traveler",
              "Drip / micro",
              "Sprinkler set",
              "Pump unit",
              "Pump & filter station",
              "Water reel gun"
            ],
            "required": true
          },
          {
            "key": "flow_rate_m3h",
            "label": "Flow rate",
            "type": "number",
            "unit": "m³/h"
          },
          {
            "key": "coverage_ha",
            "label": "Coverage area",
            "type": "number",
            "unit": "ha"
          },
          {
            "key": "power_source",
            "label": "Power source",
            "type": "select",
            "options": [
              "Electric",
              "Diesel",
              "PTO",
              "Solar",
              "Grid + genset"
            ]
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Harvesting machinery",
        "fields": [
          {
            "key": "make_model",
            "label": "Make / model",
            "type": "text",
            "required": true,
            "help": "e.g. John Deere S780, Claas Lexion, Grimme"
          },
          {
            "key": "harvester_type",
            "label": "Harvester type",
            "type": "select",
            "options": [
              "Combine harvester",
              "Potato harvester",
              "Beet harvester",
              "Sugarcane harvester",
              "Cotton picker",
              "Grape / fruit harvester",
              "Vegetable harvester",
              "Nut harvester",
              "Windrower / swather"
            ],
            "required": true
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "engine_hours",
            "label": "Engine hours",
            "type": "number",
            "unit": "h"
          },
          {
            "key": "power_hp",
            "label": "Engine power",
            "type": "number",
            "unit": "HP"
          },
          {
            "key": "header_width_m",
            "label": "Header / cutting width",
            "type": "number",
            "unit": "m"
          }
        ]
      }
    ]
  },
  {
    "name": "Equipment",
    "emoji": "⚙️",
    "slug": "equipment",
    "subcategories": [
      {
        "name": "Tank equipment",
        "fields": [
          {
            "key": "tank_type",
            "label": "Tank type",
            "type": "select",
            "options": [
              "Storage tank",
              "Mixing / agitator tank",
              "Jacketed / heating tank",
              "Cooling tank",
              "Fermentation tank",
              "CIP tank",
              "Pressure vessel",
              "IBC / transport tank"
            ],
            "required": true
          },
          {
            "key": "capacity_l",
            "label": "Capacity",
            "type": "number",
            "unit": "L",
            "required": true
          },
          {
            "key": "contact_material",
            "label": "Contact material",
            "type": "select",
            "options": [
              "SS304",
              "SS316 / SS316L",
              "Mild steel",
              "Food-grade plastic / HDPE",
              "GRP / fiberglass",
              "Aluminium"
            ]
          },
          {
            "key": "jacket_insulation",
            "label": "Jacket / insulation",
            "type": "select",
            "options": [
              "None",
              "Single jacket",
              "Dimple jacket + insulation",
              "Cooling coil"
            ]
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          }
        ]
      },
      {
        "name": "Grain-processing equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Cleaner / de-stoner",
              "Grader / sizer",
              "Gravity separator",
              "Color sorter",
              "Dryer",
              "Flour / roller mill",
              "Hammer mill",
              "Huller / de-husker",
              "Polisher / whitener",
              "Bagging / packing"
            ],
            "required": true
          },
          {
            "key": "throughput_th",
            "label": "Throughput / capacity",
            "type": "number",
            "unit": "t/h",
            "required": true
          },
          {
            "key": "grain_crop",
            "label": "Grain / crop",
            "type": "multiselect",
            "options": [
              "Wheat",
              "Rice / paddy",
              "Maize / corn",
              "Pulses",
              "Oilseeds",
              "Sorghum / millet",
              "Coffee / cocoa"
            ]
          },
          {
            "key": "power_kw",
            "label": "Motor power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "voltage",
            "label": "Voltage / phase",
            "type": "select",
            "options": [
              "220V single-phase",
              "380V three-phase",
              "415V three-phase",
              "440V three-phase"
            ]
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Meat-processing equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Meat grinder / mincer",
              "Bowl cutter",
              "Mixer / blender",
              "Bandsaw",
              "Slicer",
              "Sausage filler / stuffer",
              "Clipper / linker",
              "Tumbler / massager",
              "Brine injector",
              "Smokehouse / oven",
              "Vacuum packer"
            ],
            "required": true
          },
          {
            "key": "throughput_kgh",
            "label": "Throughput / capacity",
            "type": "number",
            "unit": "kg/h"
          },
          {
            "key": "contact_material",
            "label": "Contact material",
            "type": "select",
            "options": [
              "SS304",
              "SS316 / SS316L",
              "Food-grade plastic"
            ],
            "required": true
          },
          {
            "key": "power_kw",
            "label": "Motor power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "voltage",
            "label": "Voltage / phase",
            "type": "select",
            "options": [
              "220V single-phase",
              "380V three-phase",
              "415V three-phase"
            ]
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Dairy equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Milk reception / weighing",
              "Pasteurizer (HTST)",
              "Homogenizer",
              "Cream separator",
              "Milk cooling tank",
              "Cheese vat",
              "Butter churn",
              "Yogurt / curd line",
              "Milk powder / spray dryer",
              "Filling / packaging",
              "CIP system"
            ],
            "required": true
          },
          {
            "key": "throughput_lh",
            "label": "Throughput / capacity",
            "type": "number",
            "unit": "L/h",
            "required": true
          },
          {
            "key": "contact_material",
            "label": "Contact material",
            "type": "select",
            "options": [
              "SS304",
              "SS316 / SS316L"
            ]
          },
          {
            "key": "power_kw",
            "label": "Motor power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "voltage",
            "label": "Voltage / phase",
            "type": "select",
            "options": [
              "220V single-phase",
              "380V three-phase",
              "415V three-phase"
            ]
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Agri-waste processing equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Shredder / chipper",
              "Baler / compactor",
              "Briquette press",
              "Pellet mill",
              "Biochar / pyrolysis unit",
              "Composting drum",
              "Biogas digester",
              "Separator / decanter",
              "Dryer"
            ],
            "required": true
          },
          {
            "key": "input_material",
            "label": "Input material",
            "type": "multiselect",
            "options": [
              "Crop residue / straw",
              "Husk / shell",
              "Bagasse",
              "Sawdust / wood",
              "Manure / slurry",
              "Food waste",
              "Green waste"
            ]
          },
          {
            "key": "throughput_th",
            "label": "Throughput / capacity",
            "type": "number",
            "unit": "t/h"
          },
          {
            "key": "power_kw",
            "label": "Motor power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "voltage",
            "label": "Voltage / phase",
            "type": "select",
            "options": [
              "220V single-phase",
              "380V three-phase",
              "415V three-phase",
              "Diesel engine"
            ]
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Feed production equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Hammer mill / grinder",
              "Mixer",
              "Pellet mill",
              "Extruder",
              "Cooler",
              "Crumbler",
              "Sifter / grader",
              "Batching / weighing",
              "Bagging line",
              "Complete feed plant"
            ],
            "required": true
          },
          {
            "key": "throughput_th",
            "label": "Throughput / capacity",
            "type": "number",
            "unit": "t/h",
            "required": true
          },
          {
            "key": "feed_type",
            "label": "Feed type",
            "type": "multiselect",
            "options": [
              "Poultry",
              "Cattle / dairy",
              "Pig",
              "Aqua / fish",
              "Pet"
            ]
          },
          {
            "key": "pellet_die_mm",
            "label": "Pellet size",
            "type": "number",
            "unit": "mm",
            "help": "Die hole diameter"
          },
          {
            "key": "power_kw",
            "label": "Motor power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Food production equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Washer / cleaner",
              "Peeler",
              "Cutter / dicer",
              "Blancher / cooker",
              "Fryer",
              "Oven / dryer",
              "Mixer / kneader",
              "Extruder",
              "Filling machine",
              "Sealing / packaging",
              "Sterilizer / retort",
              "Freezer (IQF)"
            ],
            "required": true
          },
          {
            "key": "product_line",
            "label": "Product line",
            "type": "select",
            "options": [
              "Fruit & vegetable",
              "Bakery",
              "Snacks",
              "Beverage / juice",
              "Confectionery",
              "Ready meals",
              "Oil / fats",
              "Spice / powder"
            ]
          },
          {
            "key": "throughput_kgh",
            "label": "Throughput / capacity",
            "type": "number",
            "unit": "kg/h"
          },
          {
            "key": "contact_material",
            "label": "Contact material",
            "type": "select",
            "options": [
              "SS304",
              "SS316 / SS316L",
              "Food-grade plastic"
            ]
          },
          {
            "key": "power_kw",
            "label": "Motor power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          }
        ]
      },
      {
        "name": "Poultry equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Cage / battery system",
              "Automatic feeder line",
              "Drinker / nipple line",
              "Egg collection / conveyor",
              "Egg grader / sorter",
              "Incubator / hatcher",
              "Ventilation / climate",
              "Manure removal",
              "Slaughter / processing line",
              "Feather plucker",
              "Debeaker / brooder"
            ],
            "required": true
          },
          {
            "key": "bird_type",
            "label": "Bird type",
            "type": "multiselect",
            "options": [
              "Layer",
              "Broiler",
              "Breeder",
              "Duck",
              "Turkey"
            ]
          },
          {
            "key": "capacity_birds",
            "label": "Capacity",
            "type": "number",
            "unit": "birds",
            "help": "Birds housed or processed/hour — note which in description"
          },
          {
            "key": "power_kw",
            "label": "Motor power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          }
        ]
      },
      {
        "name": "Warehouse equipment",
        "fields": [
          {
            "key": "machine_type",
            "label": "Machine type",
            "type": "select",
            "options": [
              "Forklift",
              "Pallet truck / stacker",
              "Reach truck",
              "Conveyor / roller",
              "Pallet racking",
              "Weighbridge / scale",
              "Bagging & palletizing",
              "Dock leveler",
              "Cold room / chiller",
              "Grain silo",
              "Ventilation / aeration"
            ],
            "required": true
          },
          {
            "key": "load_capacity_kg",
            "label": "Load / handling capacity",
            "type": "number",
            "unit": "kg"
          },
          {
            "key": "storage_capacity_t",
            "label": "Storage capacity",
            "type": "number",
            "unit": "t",
            "help": "For silos / cold rooms"
          },
          {
            "key": "power_source",
            "label": "Power source",
            "type": "select",
            "options": [
              "Electric",
              "Diesel",
              "LPG / gas",
              "Manual",
              "Grid 380V"
            ]
          },
          {
            "key": "automation",
            "label": "Automation",
            "type": "select",
            "options": [
              "Manual",
              "Semi-automatic",
              "Fully automatic"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "options": [
              "New",
              "Used",
              "Refurbished"
            ]
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number"
          }
        ]
      }
    ]
  },
  {
    "name": "Agricultural land & facilities",
    "emoji": "🏞️",
    "slug": "land",
    "subcategories": [
      {
        "name": "Agricultural land plots",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "area",
            "label": "Plot area",
            "type": "number",
            "unit": "ha",
            "required": true,
            "help": "Total land area in hectares"
          },
          {
            "key": "land_classification",
            "label": "Land classification",
            "type": "select",
            "options": [
              "Arable / cropland",
              "Orchard / perennial",
              "Pasture / meadow",
              "Fallow",
              "Mixed"
            ]
          },
          {
            "key": "water_source",
            "label": "Water / irrigation",
            "type": "select",
            "options": [
              "Rain-fed",
              "Borewell",
              "Canal",
              "River / lake",
              "Drip",
              "Sprinkler"
            ]
          },
          {
            "key": "soil_type",
            "label": "Soil type",
            "type": "select",
            "options": [
              "Chernozem (black)",
              "Loam",
              "Clay",
              "Sandy",
              "Silt",
              "Peat",
              "Saline"
            ]
          },
          {
            "key": "infrastructure",
            "label": "Infrastructure on site",
            "type": "multiselect",
            "options": [
              "Road access",
              "Power / grid",
              "Water supply",
              "Fencing",
              "Storage",
              "Housing"
            ]
          },
          {
            "key": "ownership",
            "label": "Ownership type",
            "type": "select",
            "options": [
              "Freehold",
              "Leasehold",
              "State-leased"
            ]
          }
        ]
      },
      {
        "name": "Processing facilities",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "processing_type",
            "label": "Processing type",
            "type": "multiselect",
            "options": [
              "Grain milling",
              "Oil pressing / extraction",
              "Dairy",
              "Meat / slaughter",
              "Fruit & vegetable",
              "Sugar",
              "Feed / compound",
              "Packing / sorting"
            ],
            "required": true
          },
          {
            "key": "building_area",
            "label": "Building floor area",
            "type": "number",
            "unit": "m²"
          },
          {
            "key": "throughput_capacity",
            "label": "Throughput capacity",
            "type": "number",
            "unit": "MT/day",
            "help": "Processing capacity per day"
          },
          {
            "key": "power_capacity",
            "label": "Connected power",
            "type": "number",
            "unit": "kW"
          },
          {
            "key": "equipment_included",
            "label": "Equipment included",
            "type": "boolean",
            "help": "Sold with production line installed"
          },
          {
            "key": "ownership",
            "label": "Ownership type",
            "type": "select",
            "options": [
              "Freehold",
              "Leasehold"
            ]
          }
        ]
      },
      {
        "name": "Greenhouses",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "covered_area",
            "label": "Covered area",
            "type": "number",
            "unit": "m²",
            "required": true,
            "help": "Area under glazing"
          },
          {
            "key": "glazing_type",
            "label": "Glazing type",
            "type": "select",
            "options": [
              "Glass",
              "Polycarbonate",
              "Polyethylene film",
              "Double-film inflated"
            ]
          },
          {
            "key": "structure_type",
            "label": "Structure type",
            "type": "select",
            "options": [
              "Venlo",
              "Gothic arch / tunnel",
              "Sawtooth",
              "Gutter-connected block"
            ]
          },
          {
            "key": "climate_control",
            "label": "Climate systems",
            "type": "multiselect",
            "options": [
              "Heating",
              "Ventilation",
              "Fogging / cooling",
              "CO₂ dosing",
              "Hydroponics / NFT",
              "Supplemental lighting",
              "Screening"
            ]
          },
          {
            "key": "water_source",
            "label": "Water / irrigation",
            "type": "select",
            "options": [
              "Borewell",
              "Canal",
              "Municipal",
              "Rainwater harvest",
              "Drip / fertigation"
            ]
          },
          {
            "key": "ownership",
            "label": "Ownership type",
            "type": "select",
            "options": [
              "Freehold",
              "Leasehold"
            ]
          }
        ]
      },
      {
        "name": "Farmsteads",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "total_area",
            "label": "Total land area",
            "type": "number",
            "unit": "ha",
            "required": true
          },
          {
            "key": "residential_area",
            "label": "Residential floor area",
            "type": "number",
            "unit": "m²",
            "help": "Farmhouse living space"
          },
          {
            "key": "buildings",
            "label": "Buildings & structures",
            "type": "multiselect",
            "options": [
              "Farmhouse",
              "Barn",
              "Livestock shed",
              "Machinery shed",
              "Grain store",
              "Workshop",
              "Greenhouse"
            ]
          },
          {
            "key": "land_use",
            "label": "Land use",
            "type": "multiselect",
            "options": [
              "Arable",
              "Orchard",
              "Pasture",
              "Vineyard",
              "Woodland"
            ]
          },
          {
            "key": "utilities",
            "label": "Utilities",
            "type": "multiselect",
            "options": [
              "Grid power",
              "Mains water",
              "Borewell",
              "Gas",
              "Septic / sewer",
              "Internet"
            ]
          },
          {
            "key": "ownership",
            "label": "Ownership type",
            "type": "select",
            "options": [
              "Freehold",
              "Leasehold"
            ]
          }
        ]
      },
      {
        "name": "Production facilities",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "facility_type",
            "label": "Facility type",
            "type": "select",
            "options": [
              "Poultry house",
              "Piggery",
              "Cattle / dairy barn",
              "Feedlot",
              "Hatchery",
              "Mushroom farm",
              "Nursery"
            ],
            "required": true
          },
          {
            "key": "building_area",
            "label": "Building area",
            "type": "number",
            "unit": "m²"
          },
          {
            "key": "rated_capacity",
            "label": "Rated capacity",
            "type": "number",
            "unit": "head",
            "help": "Animals / plants housed at full stock"
          },
          {
            "key": "infrastructure",
            "label": "Infrastructure",
            "type": "multiselect",
            "options": [
              "Road access",
              "Grid power",
              "Backup generator",
              "Water supply",
              "Ventilation",
              "Manure / effluent handling",
              "Feed silos",
              "Cold storage"
            ]
          },
          {
            "key": "land_area",
            "label": "Land area",
            "type": "number",
            "unit": "ha"
          },
          {
            "key": "ownership",
            "label": "Ownership type",
            "type": "select",
            "options": [
              "Freehold",
              "Leasehold"
            ]
          }
        ]
      },
      {
        "name": "Warehouses & elevators",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "warehouse_type",
            "label": "Warehouse type",
            "type": "select",
            "options": [
              "Grain elevator / silo",
              "Flat storage shed",
              "Cold store",
              "Ambient dry store",
              "Bonded warehouse"
            ],
            "required": true
          },
          {
            "key": "storage_capacity",
            "label": "Storage capacity",
            "type": "number",
            "unit": "MT",
            "required": true,
            "help": "Total holding capacity in metric tonnes"
          },
          {
            "key": "floor_area",
            "label": "Floor area",
            "type": "number",
            "unit": "m²"
          },
          {
            "key": "handling_equipment",
            "label": "Handling & handling systems",
            "type": "multiselect",
            "options": [
              "Weighbridge",
              "Grain dryer",
              "Conveyors / elevators",
              "Loading dock",
              "Rail siding",
              "Forklift",
              "Aeration"
            ]
          },
          {
            "key": "temperature_control",
            "label": "Temperature control",
            "type": "select",
            "options": [
              "Ambient",
              "Chilled (0–8 °C)",
              "Frozen (−18 °C)",
              "Controlled atmosphere"
            ]
          },
          {
            "key": "ownership",
            "label": "Ownership type",
            "type": "select",
            "options": [
              "Freehold",
              "Leasehold"
            ]
          }
        ]
      },
      {
        "name": "Farms",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "farm_type",
            "label": "Farm type",
            "type": "select",
            "options": [
              "Crop / arable",
              "Dairy",
              "Livestock",
              "Orchard",
              "Vineyard",
              "Mixed",
              "Organic"
            ],
            "required": true
          },
          {
            "key": "total_area",
            "label": "Total area",
            "type": "number",
            "unit": "ha",
            "required": true
          },
          {
            "key": "arable_area",
            "label": "Arable / cultivable area",
            "type": "number",
            "unit": "ha"
          },
          {
            "key": "water_source",
            "label": "Water / irrigation",
            "type": "multiselect",
            "options": [
              "Rain-fed",
              "Borewell",
              "Canal",
              "River / lake",
              "Drip",
              "Pivot / sprinkler"
            ]
          },
          {
            "key": "infrastructure",
            "label": "Infrastructure & buildings",
            "type": "multiselect",
            "options": [
              "Farmhouse",
              "Barns / sheds",
              "Storage",
              "Cold room",
              "Machinery included",
              "Livestock included",
              "Road access",
              "Grid power"
            ]
          },
          {
            "key": "ownership",
            "label": "Ownership type",
            "type": "select",
            "options": [
              "Freehold",
              "Leasehold",
              "State-leased"
            ]
          }
        ]
      },
      {
        "name": "Fish farms & ponds",
        "fields": [
          {
            "key": "listing_type",
            "label": "Listing type",
            "type": "select",
            "options": [
              "Sale",
              "Lease",
              "Rent"
            ],
            "required": true
          },
          {
            "key": "system_type",
            "label": "Aquaculture system",
            "type": "select",
            "options": [
              "Earthen ponds",
              "Concrete / lined ponds",
              "Cages / net pens",
              "Raceways",
              "RAS (recirculating)",
              "Hatchery"
            ],
            "required": true
          },
          {
            "key": "water_type",
            "label": "Water type",
            "type": "select",
            "options": [
              "Freshwater",
              "Brackish",
              "Marine / saltwater"
            ]
          },
          {
            "key": "water_area",
            "label": "Water surface area",
            "type": "number",
            "unit": "ha",
            "help": "Total pond / cage surface"
          },
          {
            "key": "pond_count",
            "label": "Number of ponds / tanks",
            "type": "number"
          },
          {
            "key": "target_species",
            "label": "Stocked / suited species",
            "type": "multiselect",
            "options": [
              "Carp",
              "Tilapia",
              "Catfish",
              "Trout",
              "Shrimp / prawn",
              "Salmon",
              "Pangasius",
              "Ornamental"
            ]
          },
          {
            "key": "infrastructure",
            "label": "Infrastructure",
            "type": "multiselect",
            "options": [
              "Aeration",
              "Inlet / outlet & pumps",
              "Water supply / borewell",
              "Grid power",
              "Feed store",
              "Cold storage",
              "Housing / office"
            ]
          }
        ]
      }
    ]
  }
];

const CAT_BY_NAME = new Map(ATTRIBUTE_SCHEMA.map((c) => [c.name, c]));

/** All category-specific fields for a subcategory (empty when none/unknown). */
export function getAttributeFields(category?: string | null, subcategory?: string | null): AttrField[] {
  if (!category || !subcategory) return [];
  const cat = CAT_BY_NAME.get(category);
  if (!cat) return [];
  const sub = cat.subcategories.find((s) => s.name === subcategory);
  return sub ? sub.fields : [];
}

/** Just the fields usable as buyer filter facets for a subcategory. */
export function getFilterFields(category?: string | null, subcategory?: string | null): AttrField[] {
  return getAttributeFields(category, subcategory).filter((f) => FILTERABLE_TYPES.includes(f.type));
}

/** Look up a single field definition by key within a subcategory. */
export function getAttributeField(
  category: string | null | undefined,
  subcategory: string | null | undefined,
  key: string,
): AttrField | undefined {
  return getAttributeFields(category, subcategory).find((f) => f.key === key);
}
