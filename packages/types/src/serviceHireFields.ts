/**
 * The questions a hire form asks when the target is a service provider.
 *
 * One spec, rendered by both clients and validated by the API, because the
 * alternative is three copies of ~90 fields that drift the first time one is
 * edited. Labels are NEVER here — they are `hireQ.<key>` in the i18n catalogs,
 * the same rule the unit/vehicle/service enums follow.
 *
 * A hire asks the COMMON block plus exactly one branch block, chosen from the
 * slug of the service being hired. Blocks are per *group*, not per leaf: a buyer
 * hiring "Dry Roasting" and one hiring "Cashew Roasting" need the same answers,
 * and 600 leaf-specific forms is not a thing anyone can maintain.
 *
 * Answers land in `HireRequest.details` (Json), EXCEPT the handful marked `col`,
 * which write to the columns that already exist and are already displayed on the
 * hire card and copied onto the job minted at accept-time.
 */
import { PRODUCT_UNITS } from './units';

export type ServiceHireFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'city';

export interface ServiceHireField {
  /** Stored key. Label is `hireQ.<key>`, option labels `hireQ.opt.<key>.<option>`. */
  key: string;
  type: ServiceHireFieldType;
  /** For `select` / `multiselect`. Stored values, never display text. */
  options?: readonly string[];
  required?: boolean;
  /** Writes to the same-named HireRequest COLUMN instead of `details`. */
  col?: boolean;
  /** Render only while another field in the same form holds one of these values. */
  showIf?: { key: string; in: readonly string[] };
}

/**
 * Storage conditions — shared, because both sides of the transaction name them:
 * the hire form asks which one the buyer needs, and `ServiceProvider.storageTypes`
 * records which the provider offers. Two copies would answer different questions.
 */
export const STORAGE_TYPES = ['ambient', 'chilled', 'frozen', 'bonded'] as const;
export type StorageType = (typeof STORAGE_TYPES)[number];

/** Asked on every service hire, whatever the branch. */
export const SERVICE_HIRE_COMMON: readonly ServiceHireField[] = [
  { key: 'cargo', type: 'text', col: true },
  { key: 'qty', type: 'number' },
  { key: 'qtyUnit', type: 'select', options: PRODUCT_UNITS },
  { key: 'frequency', type: 'select', options: ['one_off', 'weekly', 'monthly', 'ongoing'] },
];

/**
 * Asked on every service hire AFTER the branch block — date and free text read
 * last on a form, and both are existing columns.
 */
export const SERVICE_HIRE_TAIL: readonly ServiceHireField[] = [
  { key: 'neededDate', type: 'date', col: true },
  { key: 'message', type: 'textarea', col: true },
];

export const SERVICE_HIRE_BLOCKS: Record<string, readonly ServiceHireField[]> = {
  processing: [
    { key: 'location', type: 'city', col: true },
    { key: 'movement', type: 'select', options: ['i_deliver', 'you_collect', 'you_arrange_both'] },
    { key: 'condition', type: 'text' },
    { key: 'outputSpec', type: 'textarea', required: true },
    { key: 'returnPackaging', type: 'select', options: ['bulk', 'provider_supplies', 'i_supply'] },
    { key: 'certifications', type: 'multiselect', options: ['fssai', 'iso', 'haccp', 'organic', 'halal', 'kosher', 'brc'] },
    { key: 'sampleFirst', type: 'select', options: ['yes', 'no'] },
  ],
  warehousing: [
    { key: 'storageType', type: 'select', options: STORAGE_TYPES, required: true },
    { key: 'tempC', type: 'text', showIf: { key: 'storageType', in: ['chilled', 'frozen'] } },
    { key: 'volume', type: 'number' },
    { key: 'volumeUnit', type: 'select', options: ['pallets', 'cbm', 'tons'] },
    { key: 'storageFrom', type: 'date', required: true },
    { key: 'storageTo', type: 'date' },
    { key: 'location', type: 'city', col: true },
    { key: 'foodGrade', type: 'select', options: ['yes', 'no'] },
    { key: 'handling', type: 'multiselect', options: ['receiving', 'pick_pack', 'dispatch'] },
  ],
  transport: [
    { key: 'fromCity', type: 'city', col: true },
    { key: 'toCity', type: 'city', col: true },
    { key: 'mode', type: 'select', options: ['road', 'rail', 'sea', 'air', 'multimodal'], required: true },
    { key: 'loadType', type: 'select', options: ['ftl', 'ltl', 'part_load', 'fcl', 'lcl', 'reefer'] },
    { key: 'tempControlled', type: 'select', options: ['yes', 'no'] },
    { key: 'tempC', type: 'text', showIf: { key: 'tempControlled', in: ['yes'] } },
    { key: 'deliveryDeadline', type: 'date' },
    { key: 'incoterm', type: 'select', options: ['exw', 'fob', 'cif', 'dap', 'ddp'] },
    { key: 'loadingIncluded', type: 'select', options: ['yes', 'no'] },
  ],
  customs: [
    { key: 'direction', type: 'select', options: ['import', 'export', 'transit'], required: true },
    { key: 'fromCity', type: 'city', col: true },
    { key: 'toCity', type: 'city', col: true },
    { key: 'portOrBorder', type: 'text' },
    { key: 'hsCode', type: 'text' },
    { key: 'shipmentValue', type: 'number' },
    { key: 'shipmentCurrency', type: 'text' },
    { key: 'documentsHeld', type: 'multiselect', options: ['invoice', 'packing_list', 'coo', 'phyto', 'licence', 'bl_awb'] },
    { key: 'containers', type: 'number' },
  ],
  accounting: [
    { key: 'jurisdiction', type: 'text' },
    { key: 'entityType', type: 'select', options: ['individual', 'sole_prop', 'llp', 'pvt_ltd', 'ooo', 'other'] },
    { key: 'periodFrom', type: 'date' },
    { key: 'periodTo', type: 'date' },
    { key: 'engagement', type: 'select', options: ['one_off', 'monthly_retainer', 'annual'] },
    { key: 'turnoverBand', type: 'select', options: ['under_100k', '100k_1m', '1m_10m', 'over_10m'] },
    { key: 'volumePerMonth', type: 'number' },
    { key: 'booksIn', type: 'select', options: ['tally', 'one_c', 'zoho', 'excel', 'none', 'other'] },
    { key: 'registrations', type: 'text' },
  ],
  insurance: [
    { key: 'coverType', type: 'select', options: ['cargo', 'transit', 'warehouse', 'liability', 'crop'], required: true },
    { key: 'sumInsured', type: 'number' },
    { key: 'sumCurrency', type: 'text' },
    { key: 'coverScope', type: 'text' },
    { key: 'routeOrLocation', type: 'text' },
    { key: 'coverFrom', type: 'date' },
    { key: 'coverTo', type: 'date' },
    { key: 'claimsHistory', type: 'textarea' },
  ],
  packing: [
    { key: 'packFormat', type: 'select', options: ['retail_pouch', 'carton', 'vacuum', 'map', 'shrink', 'bulk_bag'], required: true },
    { key: 'packSize', type: 'text' },
    { key: 'unitsPerCase', type: 'number' },
    { key: 'materialBy', type: 'select', options: ['i_supply', 'you_supply'] },
    { key: 'labelling', type: 'multiselect', options: ['private_label', 'barcode', 'export_marks'] },
    { key: 'location', type: 'city', col: true },
    { key: 'shipTo', type: 'city' },
  ],
  fulfilment: [
    { key: 'channels', type: 'multiselect', options: ['own_site', 'amazon', 'flipkart', 'ozon', 'wildberries', 'other'] },
    { key: 'ordersPerMonth', type: 'number' },
    { key: 'skuCount', type: 'number' },
    { key: 'storageNeeded', type: 'select', options: ['yes', 'no'] },
    { key: 'storageVolume', type: 'text', showIf: { key: 'storageNeeded', in: ['yes'] } },
    { key: 'returnsHandling', type: 'select', options: ['yes', 'no'] },
    { key: 'location', type: 'city', col: true },
  ],
  inspection: [
    { key: 'testParams', type: 'multiselect', options: ['moisture', 'foreign_matter', 'microbio', 'residue', 'metal_detect', 'size', 'colour'], required: true },
    { key: 'standard', type: 'text' },
    { key: 'location', type: 'city', col: true },
    { key: 'lotSize', type: 'text' },
    { key: 'sampleCount', type: 'number' },
    { key: 'reportType', type: 'select', options: ['lab_report', 'certificate', 'psi_certificate'] },
  ],
};

export type ServiceHireBlock = keyof typeof SERVICE_HIRE_BLOCKS;

/**
 * Group slug prefix → block. ORDER MATTERS: the first match wins, so the two
 * `processing/` exceptions must precede the `processing` catch-all.
 *
 * Every group the taxonomy carries is listed, including the eleven that seed no
 * leaves yet (cold-chain, loading-and-unloading, inspection, …) — they resolve
 * the day someone adds leaves, rather than silently falling back.
 */
const BLOCK_BY_PREFIX: readonly (readonly [string, string])[] = [
  ['processing/quality-testing', 'inspection'],
  ['processing/packaging', 'packing'],
  ['processing', 'processing'],

  ['logistics-and-handling/warehousing', 'warehousing'],
  ['logistics-and-handling/cold-chain', 'warehousing'],
  ['logistics-and-handling/packing', 'packing'],
  ['logistics-and-handling/fulfilment', 'fulfilment'],
  ['logistics-and-handling/inspection', 'inspection'],
  ['logistics-and-handling/customs-and-border-logistics', 'customs'],
  ['logistics-and-handling', 'transport'],

  ['financial-and-compliance/customs-clearance', 'customs'],
  ['financial-and-compliance/insurance', 'insurance'],
  ['financial-and-compliance', 'accounting'],
];

/** Which block a leaf's slug belongs to. Null for a slug outside the taxonomy. */
export function hireBlockForService(slug: string | null | undefined): ServiceHireBlock | null {
  if (!slug) return null;
  const hit = BLOCK_BY_PREFIX.find(([p]) => slug === p || slug.startsWith(`${p}/`));
  return hit ? hit[1] : null;
}

/**
 * The whole form for one service, in render order: common → branch → tail.
 * With no service picked yet, only the blockless fields are asked — the buyer
 * is not left with an empty form while they decide.
 */
export function hireFieldsForService(slug: string | null | undefined): ServiceHireField[] {
  const block = hireBlockForService(slug);
  return [...SERVICE_HIRE_COMMON, ...(block ? SERVICE_HIRE_BLOCKS[block] : []), ...SERVICE_HIRE_TAIL];
}

/** Every field the spec can ever produce — the API's write whitelist. */
export const ALL_SERVICE_HIRE_FIELDS: readonly ServiceHireField[] = [
  ...SERVICE_HIRE_COMMON,
  ...Object.values(SERVICE_HIRE_BLOCKS).flat(),
  ...SERVICE_HIRE_TAIL,
];

/** Detail keys only — the `col` ones are real columns and validated as such. */
export const SERVICE_HIRE_DETAIL_FIELDS: readonly ServiceHireField[] = ALL_SERVICE_HIRE_FIELDS.filter((f) => !f.col);

/**
 * Look a field up by key, for rendering stored answers back.
 *
 * Keys repeat across blocks (`location`, `tempC`, `fromCity`) but always with
 * the same type, so one flat map is enough — and the type is all a reader needs
 * to know whether a stored value is a translatable option or free text.
 */
const FIELD_BY_KEY = new Map(ALL_SERVICE_HIRE_FIELDS.map((f) => [f.key, f]));
export function hireFieldByKey(key: string): ServiceHireField | undefined {
  return FIELD_BY_KEY.get(key);
}

/** Is this field visible given the answers so far? */
export function isFieldVisible(field: ServiceHireField, values: Record<string, unknown>): boolean {
  if (!field.showIf) return true;
  return field.showIf.in.includes(String(values[field.showIf.key] ?? ''));
}

/**
 * Coerce and whitelist a client-supplied `details` object.
 *
 * A trust boundary: `details` is free-shaped Json on the way to the database, so
 * unknown keys are dropped, selects must hold a declared option, and strings are
 * capped — otherwise "any JSON" means "any size, any content", stored and later
 * rendered on the provider's dashboard.
 *
 * Pass the service's `slug` to narrow the whitelist to that service's OWN
 * questions. Without it every declared key is accepted, which lets a crafted
 * request file a warehousing answer against a roasting job — harmless to the
 * database, but it renders on the provider's enquiry as a question they were
 * never asked. The server always knows the slug, so it always passes it.
 */
export function sanitizeHireDetails(input: unknown, slug?: string | null): Record<string, string | number | string[]> {
  const out: Record<string, string | number | string[]> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  const src = input as Record<string, unknown>;
  const allowed = slug ? hireFieldsForService(slug).filter((f) => !f.col) : SERVICE_HIRE_DETAIL_FIELDS;
  for (const f of allowed) {
    const v = src[f.key];
    if (v === undefined || v === null || v === '') continue;
    if (f.type === 'multiselect') {
      const picked = (Array.isArray(v) ? v : [v])
        .filter((x): x is string => typeof x === 'string' && (f.options ?? []).includes(x));
      if (picked.length) out[f.key] = [...new Set(picked)].slice(0, 20);
    } else if (f.type === 'select') {
      if (typeof v === 'string' && (f.options ?? []).includes(v)) out[f.key] = v;
    } else if (f.type === 'number') {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n >= 0) out[f.key] = Math.round(n * 100) / 100;
    } else {
      const s = String(v).slice(0, f.type === 'textarea' ? 1000 : 200).trim();
      if (s) out[f.key] = s;
    }
  }
  return out;
}
