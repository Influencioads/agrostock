-- Backfill Product.priceCents from the display string "price" (e.g. "$1,180" -> 118000).
-- Rows that don't parse (ranges, "POA", ...) stay NULL and clients fall back to the string.
UPDATE "Product"
SET "priceCents" = (REPLACE(REPLACE("price", '$', ''), ',', '')::numeric * 100)::int
WHERE "priceCents" IS NULL
  AND "price" ~ '^\$?[0-9,]+(\.[0-9]+)?$';
