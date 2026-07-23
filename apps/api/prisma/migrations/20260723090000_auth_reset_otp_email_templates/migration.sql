-- Admin permission for the email template editor.
ALTER TYPE "AdminPermission" ADD VALUE 'email_templates';

-- One-shot password-reset links. Only token hashes are stored.
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

ALTER TABLE "PasswordResetToken"
ADD CONSTRAINT "PasswordResetToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Passwordless email login OTP codes. Only code hashes are stored.
CREATE TABLE "LoginOtpToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtpToken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginOtpToken_userId_idx" ON "LoginOtpToken"("userId");

ALTER TABLE "LoginOtpToken"
ADD CONSTRAINT "LoginOtpToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Admin-editable transactional email templates.
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

CREATE TABLE "EmailTemplateTranslation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "ctaLabel" TEXT,

    CONSTRAINT "EmailTemplateTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailTemplateTranslation_templateId_locale_key" ON "EmailTemplateTranslation"("templateId", "locale");
CREATE INDEX "EmailTemplateTranslation_locale_idx" ON "EmailTemplateTranslation"("locale");

ALTER TABLE "EmailTemplateTranslation"
ADD CONSTRAINT "EmailTemplateTranslation_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
