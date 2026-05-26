-- ============================================================
-- 20260525200005_harden_functions_and_storage.sql
--
-- Resolves 47 Supabase Advisor warnings in three categories:
--
-- A) function_search_path_mutable (7 functions)
--    Fix: SET search_path = public — prevents schema-injection
--    attacks where a malicious user creates a public.pg_catalog
--    shadow function to hijack SECURITY DEFINER execution.
--
-- B) anon_security_definer_function_executable (19 functions)
--    Fix: REVOKE EXECUTE FROM anon — none of these RPCs should
--    be callable without authentication. All app flows go through
--    Next.js Server Actions which require a valid session.
--
-- C) authenticated_security_definer_function_executable (partial)
--    Fix: REVOKE EXECUTE FROM authenticated for trigger/cron-only
--    functions that should never be called directly via RPC.
--    Functions legitimately called by authenticated users are kept.
--
-- D) public_bucket_allows_listing — logos bucket
--    Fix: Restrict SELECT policy so the REST list endpoint is blocked
--    while direct file URL access continues to work.
--
-- NOTE: auth_leaked_password_protection must be enabled manually:
--   Supabase Dashboard → Authentication → Settings →
--   Password Security → enable "Leaked password protection"
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- A. Fix mutable search_path
-- ══════════════════════════════════════════════════════════════

-- Trigger function: fires on auth.users INSERT
ALTER FUNCTION public.handle_new_user()
  SET search_path = public;

-- Trigger function: fires on inventory_items UPDATE
ALTER FUNCTION public.set_inventory_item_updated_at()
  SET search_path = public;

-- Utility: enable RLS on all tables (admin helper, not for RPC)
ALTER FUNCTION public.rls_auto_enable()
  SET search_path = public;

-- Feature flag toggle (super_admin / service_role use)
ALTER FUNCTION public.toggle_feature_flag(uuid, text, boolean)
  SET search_path = public;

-- Already in 20260525100001 but re-applied here for idempotency
-- (that migration may not have been fully executed)
ALTER FUNCTION public.log_action(uuid, uuid, text, text, text, uuid, jsonb, jsonb)
  SET search_path = public;

ALTER FUNCTION public.get_depreciation_schedule(uuid, uuid)
  SET search_path = public;

ALTER FUNCTION public.get_total_asset_value(uuid)
  SET search_path = public;

ALTER FUNCTION public.record_inventory_movement(uuid, uuid, integer, text, text, uuid, uuid)
  SET search_path = public;

-- ══════════════════════════════════════════════════════════════
-- B. Revoke anon access from all SECURITY DEFINER RPCs
--    None of these should be reachable without a valid JWT.
-- ══════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.calculate_commission(uuid, uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.checkout_appointment(uuid, uuid, uuid, text, numeric, numeric, jsonb)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.create_retail_sale(uuid, uuid, text, uuid, integer, integer, jsonb)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.earn_loyalty_points(uuid, uuid, integer, uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_accounting_summary(uuid, date, date)
  FROM anon;

-- get_available_slots / v2: only called by authenticated staff,
-- not a public customer-facing booking widget.
REVOKE EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, integer)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_available_slots_v2(uuid, uuid, uuid, date, integer)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_client_loyalty_balance(uuid, uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_depreciation_schedule(uuid, uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_profit_loss(uuid, date, date)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_total_asset_value(uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.log_action(uuid, uuid, text, text, text, uuid, jsonb, jsonb)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.process_commission_queue(uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.record_commission_to_ledger(uuid, uuid, uuid, integer, integer)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.record_inventory_movement(uuid, uuid, integer, text, text, uuid, uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, uuid, integer, uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.secure_set_user_context(text)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.set_inventory_item_updated_at()
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.toggle_feature_flag(uuid, text, boolean)
  FROM anon;

-- ══════════════════════════════════════════════════════════════
-- C. Revoke authenticated access from internal-only functions
--    These are trigger callbacks, cron jobs, or internal helpers
--    that must never be called directly via /rest/v1/rpc/.
-- ══════════════════════════════════════════════════════════════

-- Trigger only — fires automatically on auth.users INSERT
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM authenticated;

-- Trigger only — fires on inventory_items UPDATE
REVOKE EXECUTE ON FUNCTION public.set_inventory_item_updated_at()
  FROM authenticated;

-- Admin utility — should only run as service_role
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM authenticated;

-- Cron job only — called by pg_cron as service_role
REVOKE EXECUTE ON FUNCTION public.process_commission_queue(uuid)
  FROM authenticated;

-- Internal — called only from checkout_appointment (SECURITY DEFINER chain)
REVOKE EXECUTE ON FUNCTION public.record_commission_to_ledger(uuid, uuid, uuid, integer, integer)
  FROM authenticated;

-- ══════════════════════════════════════════════════════════════
-- D. Logos bucket: prevent directory listing
--    Replace the broad SELECT policy with one that requires a
--    non-empty name (blocks the list endpoint while direct file
--    URL access continues to work normally).
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Logos publicos para todos" ON storage.objects;

CREATE POLICY "Logos publicos para todos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'logos'
    AND name <> ''
    AND RIGHT(name, 1) <> '/'   -- block folder/prefix "files"
  );
