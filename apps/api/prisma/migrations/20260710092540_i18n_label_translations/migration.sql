-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locale" TEXT;

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcategoryTranslation" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SubcategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketTranslation" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,

    CONSTRAINT "MarketTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPageTranslation" (
    "id" TEXT NOT NULL,
    "cmsPageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,

    CONSTRAINT "CmsPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTagTranslation" (
    "id" TEXT NOT NULL,
    "supportTagId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "SupportTagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityGroupTranslation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CommunityGroupTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE INDEX "SubcategoryTranslation_locale_idx" ON "SubcategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "SubcategoryTranslation_subcategoryId_locale_key" ON "SubcategoryTranslation"("subcategoryId", "locale");

-- CreateIndex
CREATE INDEX "MarketTranslation_locale_idx" ON "MarketTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "MarketTranslation_marketId_locale_key" ON "MarketTranslation"("marketId", "locale");

-- CreateIndex
CREATE INDEX "CmsPageTranslation_locale_idx" ON "CmsPageTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPageTranslation_cmsPageId_locale_key" ON "CmsPageTranslation"("cmsPageId", "locale");

-- CreateIndex
CREATE INDEX "SupportTagTranslation_locale_idx" ON "SupportTagTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTagTranslation_supportTagId_locale_key" ON "SupportTagTranslation"("supportTagId", "locale");

-- CreateIndex
CREATE INDEX "CommunityGroupTranslation_locale_idx" ON "CommunityGroupTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityGroupTranslation_groupId_locale_key" ON "CommunityGroupTranslation"("groupId", "locale");

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategoryTranslation" ADD CONSTRAINT "SubcategoryTranslation_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTranslation" ADD CONSTRAINT "MarketTranslation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPageTranslation" ADD CONSTRAINT "CmsPageTranslation_cmsPageId_fkey" FOREIGN KEY ("cmsPageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTagTranslation" ADD CONSTRAINT "SupportTagTranslation_supportTagId_fkey" FOREIGN KEY ("supportTagId") REFERENCES "SupportTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityGroupTranslation" ADD CONSTRAINT "CommunityGroupTranslation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
