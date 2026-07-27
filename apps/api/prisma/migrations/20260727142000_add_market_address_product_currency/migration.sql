-- Production drift fix: schema.prisma already expects these columns and the
-- deployed API reads them. Add them defensively so existing VPS databases that
-- missed the schema change can be upgraded with `prisma migrate deploy`.
ALTER TABLE "Market"
ADD COLUMN IF NOT EXISTS "address" TEXT;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'USD';
