ALTER TABLE "Subcategory" DROP CONSTRAINT IF EXISTS "Subcategory_categoryId_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Subcategory_root_category_name_key"
  ON "Subcategory"("categoryId", "name")
  WHERE "parentId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Subcategory_parent_name_key"
  ON "Subcategory"("parentId", "name")
  WHERE "parentId" IS NOT NULL;
