-- Let a general labour company receive hire requests, like a loading company.
-- Additive; every existing hire keeps its target type.
ALTER TYPE "HireTargetType" ADD VALUE IF NOT EXISTS 'workerco' AFTER 'loaderco';
