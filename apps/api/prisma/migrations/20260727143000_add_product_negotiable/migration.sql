-- Production drift fix: deployed product queries select Product.negotiable.
-- Existing rows default to firm price/non-negotiable.
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "negotiable" BOOLEAN NOT NULL DEFAULT false;
