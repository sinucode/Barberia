-- ============================================================
-- 20260525200002_move_btree_gist_to_extensions.sql
--
-- [SEC] Fix WARNING: Extension btree_gist installed in public schema.
-- Move to extensions schema to remove its functions from the default
-- search path (prevents schema-injection / function-shadowing attacks).
--
-- Procedure (must be done in order):
--   1. Drop the EXCLUDE constraint that depends on btree_gist
--   2. Drop the extension from public
--   3. Recreate in extensions schema
--   4. Recreate the constraint — works because Supabase includes
--      the extensions schema in the search path automatically.
-- ============================================================

-- Step 1: Drop the dependent exclusion constraint
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_barber_id_time_range_excl;

-- Step 2: Drop extension from public schema
DROP EXTENSION IF EXISTS btree_gist;

-- Step 3: Recreate in the extensions schema (safe, in search path)
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- Step 4: Recreate the double-booking guard with identical definition
-- Prevents the same barber from having two overlapping appointments
-- (cancelled appointments are excluded from the check).
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_barber_id_time_range_excl
  EXCLUDE USING gist (
    barber_id WITH =,
    time_range WITH &&
  )
  WHERE (status <> 'cancelled');
