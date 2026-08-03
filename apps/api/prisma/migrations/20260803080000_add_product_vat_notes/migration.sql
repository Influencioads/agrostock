-- Product listings can explicitly mark VAT as extra and show seller-provided
-- notes. IF NOT EXISTS keeps deploys safe for databases repaired manually.
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "vatExtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "notes" TEXT;
