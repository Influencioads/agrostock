-- F10: optional inventory. stockQty NULL = unmanaged (legacy unlimited).
ALTER TABLE "Product" ADD COLUMN "stockQty" INTEGER;
ALTER TABLE "Product" ADD COLUMN "reservedQty" INTEGER NOT NULL DEFAULT 0;
