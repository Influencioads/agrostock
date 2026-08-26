-- Master controls for machine translation.
--
-- Additive and idempotent, like the legal-services migration. The permission
-- value must exist before any admin row can be granted it; PG16 allows
-- ALTER TYPE ... ADD VALUE inside a transaction so long as the new value is not
-- used in the same one, and nothing here uses it.
ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'translation_manage' AFTER 'billing_manage';

CREATE TABLE IF NOT EXISTS "TranslationSettings" (
  "id"                   INTEGER      NOT NULL DEFAULT 1,
  "autoTranslateEnabled" BOOLEAN      NOT NULL DEFAULT true,
  "lastRunAt"            TIMESTAMP(3),
  "lastRunFilled"        INTEGER,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TranslationSettings_pkey" PRIMARY KEY ("id")
);

-- The singleton itself, so a read never has to create it inside a request.
INSERT INTO "TranslationSettings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
