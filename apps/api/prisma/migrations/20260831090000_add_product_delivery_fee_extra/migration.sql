-- Seller-arranged delivery can now be priced separately from the goods.
-- IF NOT EXISTS keeps deploys safe for databases repaired manually.
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "deliveryFeeExtra" BOOLEAN NOT NULL DEFAULT false;
