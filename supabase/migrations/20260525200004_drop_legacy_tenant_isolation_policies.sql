-- ============================================================
-- 20260525200004_drop_legacy_tenant_isolation_policies.sql
--
-- [SEC] Remove legacy "Tenant Isolation X" policies that were
-- created outside of migrations (in Supabase Studio) and use
-- the insecure pattern:
--   auth.jwt() -> 'user_metadata' ->> 'business_id'
--
-- These coexist with the secure "tenant can manage X" policies
-- from migration 20260525200001 (which use app_metadata).
-- Having both active means RLS is satisfied via OR — the insecure
-- path is still exploitable. Dropping the legacy ones leaves only
-- the secure app_metadata-based policies in place.
--
-- The businesses UPDATE policy is recreated with the correct
-- app_metadata path since it has no equivalent in prior migrations.
-- ============================================================

-- ── Drop legacy insecure policies ────────────────────────────────────────────

DROP POLICY IF EXISTS "Tenant Isolation Staff"               ON public.staff;
DROP POLICY IF EXISTS "Tenant Isolation Schedules"           ON public.staff_schedules;
DROP POLICY IF EXISTS "Tenant Isolation sales"               ON public.sales;
DROP POLICY IF EXISTS "Tenant Isolation sale_items"          ON public.sale_items;
DROP POLICY IF EXISTS "Tenant Isolation Customers"           ON public.customers;
DROP POLICY IF EXISTS "Tenant Isolation cash_register_shifts" ON public.cash_register_shifts;
DROP POLICY IF EXISTS "Tenant Isolation payments"            ON public.payments;

-- ── businesses: drop + recreate with app_metadata ────────────────────────────
-- This policy has no secure equivalent yet, so we recreate it.
-- Tenant admins can update their own business row.
-- Super admins (app_metadata.role = 'super_admin') can update any business.

DROP POLICY IF EXISTS "Allow tenant admin and super admin to update business branding"
  ON public.businesses;

CREATE POLICY "Allow tenant admin and super admin to update business branding"
  ON public.businesses
  FOR UPDATE
  USING (
    id = ((auth.jwt() -> 'app_metadata' ->> 'business_id'))::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    id = ((auth.jwt() -> 'app_metadata' ->> 'business_id'))::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
