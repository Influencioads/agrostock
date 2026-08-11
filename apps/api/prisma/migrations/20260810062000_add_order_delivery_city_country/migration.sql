-- Add the two Order delivery columns that schema.prisma has always declared but
-- no migration ever created.
--
-- `Order.deliveryCity` and `Order.deliveryCountry` are in the Prisma model and
-- the API both writes them (OrdersService.place → `deliveryCity: dto.deliveryCity`)
-- and selects them (hires.module.ts). They exist on databases that were brought
-- up with `prisma db push` at some point, which is why this was never noticed —
-- but a database built purely from `prisma migrate deploy` does NOT have them,
-- and every order placement on such a database fails with
--   column "deliveryCity" of relation "Order" does not exist
--
-- Found by scripts/db-drift-report.mjs, which compares the live database against
-- schema.prisma rather than against migration history.
--
-- `IF NOT EXISTS` so this is a no-op on any database that already has them —
-- production included. Nullable and additive: no existing row is touched.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "deliveryCity" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryCountry" TEXT;
