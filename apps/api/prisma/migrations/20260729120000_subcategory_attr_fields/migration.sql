-- Product attribute fields move from the generated packages/types/attributes.ts
-- into the DB so admins can edit them per subcategory.
--   Subcategory.attrFields            -> AttrField[] (canonical English)
--   SubcategoryTranslation.attrFields -> { label: {en->loc}, option: {en->loc} }
-- Both nullable and additive: safe to apply before the code that reads them.
-- Populate with: pnpm --filter @agrotraders/api seed:attrs
ALTER TABLE "Subcategory"
ADD COLUMN IF NOT EXISTS "attrFields" JSONB;

ALTER TABLE "SubcategoryTranslation"
ADD COLUMN IF NOT EXISTS "attrFields" JSONB;

-- Seller "delete" on a traded listing archives instead of hard-deleting.
-- IF NOT EXISTS keeps this idempotent for dev DBs already pushed via db push.
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'archived';
