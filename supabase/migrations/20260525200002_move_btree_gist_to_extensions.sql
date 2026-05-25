-- ============================================================
-- 20260525200002_move_btree_gist_to_extensions.sql
--
-- [SEC] Fix WARNING: Extension btree_gist installed in public schema.
-- Move to the extensions schema so it is not exposed in the public
-- search path (avoids schema-injection attacks via function shadowing).
--
-- Safe to run: btree_gist is not used by any application table
-- indexes or EXCLUDE constraints in this project.
-- ============================================================

DROP EXTENSION IF EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;
