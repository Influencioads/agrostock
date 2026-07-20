-- Add nullable product attribute payloads and translation tables used by the
-- seller dashboard overhaul. This migration is defensive because some VPS
-- databases already had earlier i18n migrations applied without these newer
-- user-content translation tables.
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "attributes" JSONB;

CREATE TABLE IF NOT EXISTS "ProductTranslation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT,
    "origin" TEXT,
    "qty" TEXT,
    "moq" TEXT,
    "delivery" TEXT,
    "attributes" JSONB,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ReviewTranslation" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ReviewTranslation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReviewTranslation_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CommunityPostTranslation" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,

    CONSTRAINT "CommunityPostTranslation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommunityPostTranslation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CommunityTradeRequirementTranslation" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "grade" TEXT,
    "delivery" TEXT,

    CONSTRAINT "CommunityTradeRequirementTranslation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommunityTradeRequirementTranslation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "CommunityTradeRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BuyerBidTranslation" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "BuyerBidTranslation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BuyerBidTranslation_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "BuyerBid"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CommunityMessageTranslation" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMessageTranslation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommunityMessageTranslation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CommunityMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TextTranslation" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextTranslation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductTranslation_locale_idx" ON "ProductTranslation"("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

CREATE INDEX IF NOT EXISTS "ReviewTranslation_locale_idx" ON "ReviewTranslation"("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewTranslation_reviewId_locale_key" ON "ReviewTranslation"("reviewId", "locale");

CREATE INDEX IF NOT EXISTS "CommunityPostTranslation_locale_idx" ON "CommunityPostTranslation"("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityPostTranslation_postId_locale_key" ON "CommunityPostTranslation"("postId", "locale");

CREATE INDEX IF NOT EXISTS "CommunityTradeRequirementTranslation_locale_idx" ON "CommunityTradeRequirementTranslation"("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityTradeRequirementTranslation_requirementId_locale_key" ON "CommunityTradeRequirementTranslation"("requirementId", "locale");

CREATE INDEX IF NOT EXISTS "BuyerBidTranslation_locale_idx" ON "BuyerBidTranslation"("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "BuyerBidTranslation_bidId_locale_key" ON "BuyerBidTranslation"("bidId", "locale");

CREATE INDEX IF NOT EXISTS "CommunityMessageTranslation_locale_idx" ON "CommunityMessageTranslation"("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityMessageTranslation_messageId_locale_key" ON "CommunityMessageTranslation"("messageId", "locale");

CREATE INDEX IF NOT EXISTS "TextTranslation_locale_idx" ON "TextTranslation"("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "TextTranslation_sourceHash_locale_key" ON "TextTranslation"("sourceHash", "locale");
