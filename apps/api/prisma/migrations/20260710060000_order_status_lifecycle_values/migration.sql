-- Adds the missing OrderStatus lifecycle values.
--
-- This migration deliberately contains NOTHING else: Postgres forbids using a
-- newly added enum value in the same transaction that adds it, and Prisma wraps
-- each migration file in one transaction. Columns/tables that reference these
-- values live in the next migration.
--
-- Positions are chosen so the physical enum order matches schema.prisma.
-- "shipped" is retained for pre-lifecycle rows; new code never writes it.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'enquiry' BEFORE 'quote';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'packed' AFTER 'paid';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'dispatched' AFTER 'packed';
