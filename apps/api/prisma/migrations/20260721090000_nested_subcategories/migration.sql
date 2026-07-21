-- Allow subcategories to form an admin-managed tree:
-- Category -> Subcategory -> Sub-subcategory -> ... .
ALTER TABLE "Subcategory" ADD COLUMN "parentId" TEXT;

CREATE INDEX "Subcategory_parentId_idx" ON "Subcategory"("parentId");

ALTER TABLE "Subcategory"
  ADD CONSTRAINT "Subcategory_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Subcategory"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
