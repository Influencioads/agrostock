-- iOS plan subscriptions are sold through Apple In-App Purchase (Guideline 3.1.1),
-- so the App Store becomes a billing source next to the card gateways.
--
-- `apple` is only ever written onto Subscription/Payment rows the App Store
-- billed; it never gets a PaymentGatewayConfig row. `appleOriginalTransactionId`
-- is Apple's stable id for one subscription across renewals and upgrades; App
-- Store server notifications find the row by it, so it is unique.
--
-- Additive: a new enum value and a nullable column cannot invalidate a row.
ALTER TYPE "PaymentProviderKey" ADD VALUE IF NOT EXISTS 'apple';

ALTER TABLE "Subscription" ADD COLUMN "appleOriginalTransactionId" TEXT;

CREATE UNIQUE INDEX "Subscription_appleOriginalTransactionId_key" ON "Subscription"("appleOriginalTransactionId");
