-- Admin-editable copy + on/off switches for the two mobile home banners.
--
-- Additive and idempotent, like the translation-settings migration. NULL copy
-- columns mean "use the app's built-in i18n string", so the table starting out
-- empty of copy is the correct, no-op state.
CREATE TABLE IF NOT EXISTS "HomeBanners" (
  "id"           INTEGER      NOT NULL DEFAULT 1,
  "promoEnabled" BOOLEAN      NOT NULL DEFAULT true,
  "promoTitle"   TEXT,
  "promoBody"    TEXT,
  "promoCta"     TEXT,
  "heroEnabled"  BOOLEAN      NOT NULL DEFAULT true,
  "heroTag"      TEXT,
  "heroTitle"    TEXT,
  "heroCta"      TEXT,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeBanners_pkey" PRIMARY KEY ("id")
);

-- The singleton itself, so a read never has to create it inside a request.
INSERT INTO "HomeBanners" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
