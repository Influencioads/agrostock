-- Single stock figure.
--
-- A listing carried TWO independently-authored quantities: `Product."qty"`, a
-- free-text display string the seller typed ("500 MT"), rendered to buyers as
-- "N available"; and `Product."stockQty"`, the managed integer the reservation
-- machinery actually enforces. Buyers saw both, and they routinely disagreed.
--
-- `stockQty` becomes the single source of truth. This migration promotes every
-- legacy `qty` into it, then rewrites `qty` as a string DERIVED from `stockQty`
-- so anything still reading that column (order snapshots, invoice lines, the
-- translation pipeline) reports the same number the buyer sees. From here on the
-- API derives `qty` on every write — see ProductsService.stockPatch.
--
-- The parse mirrors `parseQtyIn` in @agrotraders/types exactly: strip the number
-- out of the free text, read the unit back out of the same string, fall back to
-- the listing's own unit when the text carries none, and convert between mass
-- units. Rows whose text has no usable number, or whose unit cannot convert to
-- the listing's unit (a count against a mass), are left untracked rather than
-- guessed at — the seller's next save sets them from the one remaining field.
--
-- Written as plain statements with single-quoted function bodies (no $$ blocks,
-- no DO blocks) so the whole file is a single ordinary multi-statement script.

-- ── 0. one canonical unit-code resolver, shared by this migration and runtime ──
-- Mirrors `normalizeUnit` + `toUnit` in packages/types/src/units.ts.
-- `Product."unit"` legitimately holds legacy forms ('/MT', 'MT/month') alongside
-- the canonical codes, so a naive strip-and-uppercase gets those wrong, and the
-- mapping is needed three times below. Runtime code does NOT depend on these —
-- it resolves the unit in TypeScript — so a database provisioned with
-- `prisma db push` (which never runs migration SQL) is unaffected.
--
-- Body is single-quoted rather than dollar-quoted so the whole file stays a plain
-- multi-statement script with no $$ blocks.
CREATE OR REPLACE FUNCTION agro_unit_id(raw text) RETURNS text
LANGUAGE sql IMMUTABLE AS
'SELECT CASE lower(regexp_replace(coalesce(raw, ''''), ''[^a-zA-Z]'', '''', ''g''))
   WHEN ''kg'' THEN ''KG'' WHEN ''kgs'' THEN ''KG'' WHEN ''kilo'' THEN ''KG''
   WHEN ''kilos'' THEN ''KG'' WHEN ''kilogram'' THEN ''KG'' WHEN ''kilograms'' THEN ''KG''
   WHEN ''mt'' THEN ''MT'' WHEN ''mtmonth'' THEN ''MT'' WHEN ''metricton'' THEN ''MT''
   WHEN ''metrictons'' THEN ''MT'' WHEN ''metrictonne'' THEN ''MT''
   WHEN ''tonne'' THEN ''MT'' WHEN ''tonnes'' THEN ''MT''
   WHEN ''quintal'' THEN ''QUINTAL'' WHEN ''quintals'' THEN ''QUINTAL'' WHEN ''qtl'' THEN ''QUINTAL''
   WHEN ''ton'' THEN ''TON'' WHEN ''tons'' THEN ''TON'' WHEN ''shortton'' THEN ''TON''
   WHEN ''bag'' THEN ''BAG'' WHEN ''bags'' THEN ''BAG'' WHEN ''sack'' THEN ''BAG''
   WHEN ''piece'' THEN ''PIECE'' WHEN ''pieces'' THEN ''PIECE'' WHEN ''pcs'' THEN ''PIECE''
   WHEN ''pc'' THEN ''PIECE'' WHEN ''unit'' THEN ''PIECE''
   ELSE NULL
 END';

-- Kilograms per canonical unit. NULL = a count (BAG/PIECE) with no fixed mass, so
-- a quantity in one converts to nothing else. Mirrors UNIT_KG.
CREATE OR REPLACE FUNCTION agro_unit_kg(unit_id text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS
'SELECT CASE unit_id WHEN ''KG'' THEN 1 WHEN ''QUINTAL'' THEN 100 WHEN ''MT'' THEN 1000
                     WHEN ''TON'' THEN 907.18474 ELSE NULL END';

-- The display string `Product."qty"` mirrors. Mirrors `stockQtyText`.
CREATE OR REPLACE FUNCTION agro_stock_text(stock int, raw_unit text) RETURNS text
LANGUAGE sql IMMUTABLE AS
'SELECT CASE WHEN stock IS NOT NULL AND stock > 0
             THEN stock::text || '' '' || coalesce(agro_unit_id(raw_unit), ''MT'')
             ELSE NULL END';

-- ── 1. promote the legacy free-text quantity into the managed column ────────
WITH resolved AS (
  SELECT
    p.id,
    -- Digits and dots only, exactly like the seller form's `bareNumber`. A
    -- result that is not a plain number ("12.5.3", "") is rejected here.
    NULLIF(regexp_replace(p."qty", '[^0-9.]', '', 'g'), '') AS num_text,
    -- `normalizeUnit(qty) ?? toUnit(unit)` — the unit named inside the free
    -- text, else the listing's own metric. A Cyrillic unit ("25000 кг") names
    -- nothing the alias table knows and falls through to the listing's, which
    -- is exactly what the TypeScript does.
    COALESCE(agro_unit_id(p."qty"), agro_unit_id(p."unit"), 'MT') AS source_unit,
    COALESCE(agro_unit_id(p."unit"), 'MT') AS target_unit
  FROM "Product" p
  WHERE p."stockQty" IS NULL
    AND p."qty" IS NOT NULL
    -- Promote only text that holds exactly ONE number. `parseQtyIn` strips every
    -- non-digit and concatenates whatever is left, so "20 x 40ft containers"
    -- parses as 2040 — harmless as a display fallback, dangerous as an enforced
    -- stock cap. This migration is deliberately STRICTER than the runtime parse:
    -- an ambiguous string is left untracked (with its text intact) rather than
    -- silently becoming a wrong quantity. The seller forms only ever write a
    -- single bare number, so nothing they produced is excluded by this.
    -- Counted on the comma-stripped text, because "2,400 MT" is ONE number
    -- written with a thousands separator (and is what the seed writes), while
    -- "20 x 40ft" is genuinely two. A space-separated variant ("2 400 MT") is
    -- not unpicked here and simply stays untracked — the safe fallback.
    AND (SELECT count(*) FROM regexp_matches(replace(p."qty", ',', ''), '[0-9]+(\.[0-9]+)?', 'g')) = 1
),
converted AS (
  SELECT
    id,
    CASE
      -- Same metric: the number stands as typed.
      WHEN source_unit = target_unit THEN value
      -- Different metrics: convertible only when both are masses.
      WHEN agro_unit_kg(source_unit) IS NOT NULL AND agro_unit_kg(target_unit) IS NOT NULL
        THEN (value * agro_unit_kg(source_unit)) / agro_unit_kg(target_unit)
      ELSE NULL
    END AS stock
  FROM (
    -- The cast lives inside a CASE, not beside a regex test in a WHERE clause:
    -- Postgres does not guarantee the order those are evaluated in, so a value
    -- like '500..' could otherwise raise `invalid input syntax for type numeric`
    -- and abort the whole migration.
    SELECT
      id, source_unit, target_unit,
      CASE WHEN num_text ~ '^[0-9]+(\.[0-9]+)?$' THEN num_text::numeric ELSE NULL END AS value
    FROM resolved
  ) numbers
  WHERE value IS NOT NULL AND value > 0
)
UPDATE "Product" p
-- Clamped to MAX_QTY (1,000,000) from apps/api/src/common/limits.ts, so a junk
-- legacy string cannot seed a quantity the order machinery would reject.
SET "stockQty" = LEAST(1000000, round(c.stock))::int
FROM converted c
WHERE p.id = c.id
  AND c.stock IS NOT NULL
  -- Anything that rounds below one whole unit is NOT promoted. "400 kg" on a
  -- listing priced per MT is 0.4 MT, and writing 0 there would flip an
  -- unlimited listing to permanently "Out of stock" — the reservation guard
  -- (`stockQty - reservedQty >= qty`) would then reject every order on it.
  -- Left untracked instead, which is how it already behaved.
  AND round(c.stock) >= 1;

-- ── 2. rewrite the display column from the figure that now owns it ──────────
-- Only where `stockQty` is now set. Rows step 1 deliberately skipped (no usable
-- number, or a count against a mass) keep their original free text: it is the
-- ONLY remaining copy of what the seller typed, and both edit forms fall back to
-- it to seed the single stock box. Nothing renders it to a buyer any more.
--
-- Rows that already HAD a `stockQty` are rewritten too — those are precisely the
-- listings where the two columns disagreed.
UPDATE "Product"
SET "qty" = agro_stock_text("stockQty", "unit")
WHERE "stockQty" IS NOT NULL AND "qty" IS DISTINCT FROM agro_stock_text("stockQty", "unit");

-- ── 3. the translated copies of the old free text are now stale ────────────
-- `qty` is a number plus a unit code; translating it produced "500 МТ" and, worse,
-- kept a per-locale copy of a figure that no longer has its own source. Clearing
-- them makes every locale fall back to the canonical column. `qty` is also removed
-- from the product translation field list in the same change, so nothing refills
-- these on the next save.
UPDATE "ProductTranslation" SET "qty" = NULL WHERE "qty" IS NOT NULL;
