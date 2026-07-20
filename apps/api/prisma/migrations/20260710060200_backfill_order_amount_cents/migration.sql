-- Backfill Order's numeric columns from the legacy display strings.
-- Mirrors 20260708071349_backfill_price_cents. Rows whose strings don't parse
-- (ranges, "POA", ...) stay NULL and clients fall back to the string.
-- Idempotent: guarded on IS NULL so a re-run is a no-op.

-- "$1,180" -> 118000
UPDATE "Order"
SET "amountCents" = (REPLACE(REPLACE("amount", '$', ''), ',', '')::numeric * 100)::int
WHERE "amountCents" IS NULL
  AND "amount" ~ '^\$?[0-9,]+(\.[0-9]+)?$';

-- "12 MT" -> qtyValue 12, qtyUnit 'MT'
UPDATE "Order"
SET "qtyValue" = substring("qty" from '[0-9]+\.?[0-9]*')::double precision
WHERE "qtyValue" IS NULL
  AND "qty" ~ '[0-9]';

UPDATE "Order"
SET "qtyUnit" = COALESCE(NULLIF(TRIM(regexp_replace("qty", '[0-9.,]', '', 'g')), ''), 'MT')
WHERE "qty" IS NOT NULL;

-- Per-unit price, where both parts are known.
UPDATE "Order"
SET "unitPriceCents" = ("amountCents" / "qtyValue")::int
WHERE "unitPriceCents" IS NULL
  AND "amountCents" IS NOT NULL
  AND "qtyValue" IS NOT NULL
  AND "qtyValue" > 0;
