-- A general labour company, distinct from `loaderco`.
--
-- `loaderco` is the LOADING specialist: it supplies loading and material-handling
-- crew only, a rule enforced in the workforce module. `workerco` is the general
-- supplier and may offer all seven worker-type groups, loading included.
--
-- Additive only. No existing loaderco row is migrated: a loading company that
-- also supplies packers should re-register the broader role deliberately rather
-- than be silently reclassified.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'workerco' AFTER 'loaderco';
