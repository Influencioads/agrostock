-- Service taxonomy: the tree behind the Services module.
--
-- PURELY ADDITIVE. Three new tables and two new enums; nothing existing is
-- touched. No DROP, no ALTER on an existing table, no data written or removed —
-- so it is safe on a populated database and needs no backfill.
--
-- `ServiceProvider` is deliberately NOT modified here. Its `categories` column
-- stays exactly as it is and keeps driving the current directory; the taxonomy
-- lands alongside it, and the mapping between the two comes later as its own
-- reviewable step.
--
-- To reverse (nothing else references these):
--   DROP TABLE "ServiceNodeTranslation"; DROP TABLE "ServiceNode";
--   DROP TABLE "ServiceCountry";
--   DROP TYPE "ServiceCountryScope"; DROP TYPE "ServiceNodeKind";

-- CreateEnum
CREATE TYPE "ServiceNodeKind" AS ENUM ('SECTION', 'GROUP', 'COUNTRY', 'SUBGROUP', 'SERVICE');

-- CreateEnum
CREATE TYPE "ServiceCountryScope" AS ENUM ('GLOBAL', 'INDIA', 'RUSSIA', 'INTERNATIONAL');

-- CreateTable
CREATE TABLE "ServiceNode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "nameEn" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "kind" "ServiceNodeKind" NOT NULL,
    "countryScope" "ServiceCountryScope",
    "level" INTEGER NOT NULL,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceNodeTranslation" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ServiceNodeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCountry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCountry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceNode_slug_key" ON "ServiceNode"("slug");

-- CreateIndex
CREATE INDEX "ServiceNode_parentId_idx" ON "ServiceNode"("parentId");

-- CreateIndex
CREATE INDEX "ServiceNode_kind_idx" ON "ServiceNode"("kind");

-- CreateIndex
CREATE INDEX "ServiceNode_isActive_level_idx" ON "ServiceNode"("isActive", "level");

-- CreateIndex
CREATE INDEX "ServiceNodeTranslation_locale_idx" ON "ServiceNodeTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceNodeTranslation_nodeId_locale_key" ON "ServiceNodeTranslation"("nodeId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCountry_code_key" ON "ServiceCountry"("code");

-- AddForeignKey
ALTER TABLE "ServiceNode" ADD CONSTRAINT "ServiceNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ServiceNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceNodeTranslation" ADD CONSTRAINT "ServiceNodeTranslation_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ServiceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

