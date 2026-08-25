-- Legal services: a sixth service-provider role, and the category it lists under.
--
-- Additive only. `legal_advisor` self-registers like every other provider role
-- and reaches only `financial-and-compliance/legal` in the taxonomy — tax and
-- audit stay with the accountant who already holds them.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'legal_advisor' AFTER 'finance_partner';
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'legal_services' AFTER 'financial_services';

-- What `capacityPerDay` counts.
--
-- The column shipped as a bare integer whose unit was "implied by pricingBasis",
-- so a directory card read "Capacity per day: 30" with no way to tell 30 tons
-- from 30 filings. NULLABLE and NOT back-filled: a guessed unit on an existing
-- row would be worse than the plain number those rows already render.
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "capacityUnit" TEXT;
