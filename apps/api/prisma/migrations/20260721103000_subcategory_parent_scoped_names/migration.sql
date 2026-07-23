-- V03 fix: nested subcategories drop the old whole-category name uniqueness.
-- Prisma's schema cannot express partial (WHERE) unique indexes, so declaring
-- them here produced a permanent phantom drift between the migrations and
-- schema.prisma. Align with the schema (plain lookup indexes, no DB-level name
-- uniqueness — parent-scoped name checks are enforced in the admin service).
ALTER TABLE "Subcategory" DROP CONSTRAINT IF EXISTS "Subcategory_categoryId_name_key";
DROP INDEX IF EXISTS "Subcategory_categoryId_name_key";

CREATE INDEX IF NOT EXISTS "Subcategory_categoryId_idx" ON "Subcategory"("categoryId");
