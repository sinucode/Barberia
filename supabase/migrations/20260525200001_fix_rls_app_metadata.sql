-- ============================================================
-- 20260525200001_fix_rls_app_metadata.sql
--
-- [SEC] Fix CRITICAL: All RLS policies that used the ambiguous
--   auth.jwt() ->> 'business_id'
-- are replaced with the explicit and secure:
--   (auth.jwt() -> 'app_metadata' ->> 'business_id')
--
-- ROOT CAUSE: auth.jwt() ->> 'key' reads from the JWT top-level.
-- In Supabase, app_metadata claims are merged at the top level,
-- but user_metadata claims are NOT. However, the Supabase linter
-- flags this pattern because it cannot statically verify the claim
-- source. Using the explicit '-> app_metadata' path makes the
-- intent unambiguous and is immune to user_metadata spoofing
-- (user_metadata is editable by the client via supabase.auth.updateUser).
--
-- SECOND FIX: createBusinessUser now stores business_id in
-- app_metadata (not user_metadata), handled in application code.
--
-- Applies idempotently: DROP IF EXISTS + CREATE.
-- ============================================================

-- ── helpers ───────────────────────────────────────────────────────────────────
-- Shorthand used throughout: explicit app_metadata path.
-- (auth.jwt() -> 'app_metadata' ->> 'business_id')

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. services
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage services"  ON public.services;
DROP POLICY IF EXISTS "Tenant Isolation Services"   ON public.services;

CREATE POLICY "tenant can manage services"
  ON public.services FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. staff
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage staff" ON public.staff;

CREATE POLICY "tenant can manage staff"
  ON public.staff FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. staff_services
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage staff_services" ON public.staff_services;

CREATE POLICY "tenant can manage staff_services"
  ON public.staff_services FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. staff_schedules
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage staff_schedules" ON public.staff_schedules;

CREATE POLICY "tenant can manage staff_schedules"
  ON public.staff_schedules FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. customers
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage customers" ON public.customers;

CREATE POLICY "tenant can manage customers"
  ON public.customers FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. appointments
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage appointments" ON public.appointments;

CREATE POLICY "tenant can manage appointments"
  ON public.appointments FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. shifts
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage shifts" ON public.shifts;

CREATE POLICY "tenant can manage shifts"
  ON public.shifts FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. sales
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage sales" ON public.sales;

CREATE POLICY "tenant can manage sales"
  ON public.sales FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. sale_items
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage sale_items" ON public.sale_items;

CREATE POLICY "tenant can manage sale_items"
  ON public.sale_items FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. payments
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage payments" ON public.payments;

CREATE POLICY "tenant can manage payments"
  ON public.payments FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. workstations
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Tenants can manage their own workstations" ON public.workstations;

CREATE POLICY "Tenants can manage their own workstations"
  ON public.workstations FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. service_workstations
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Tenants can manage their service_workstations" ON public.service_workstations;

CREATE POLICY "Tenants can manage their service_workstations"
  ON public.service_workstations FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. commission_rules
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can manage commission rules" ON public.commission_rules;

CREATE POLICY "Admins can manage commission rules"
  ON public.commission_rules FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 14. loyalty_ledgers
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Tenants can manage their loyalty ledgers" ON public.loyalty_ledgers;

CREATE POLICY "Tenants can manage their loyalty ledgers"
  ON public.loyalty_ledgers FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 15. expenses
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Tenants can manage their own expenses" ON public.expenses;

CREATE POLICY "Tenants can manage their own expenses"
  ON public.expenses FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 16. staff_ledger
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "staff_ledger_tenant_isolation" ON public.staff_ledger;

CREATE POLICY "staff_ledger_tenant_isolation"
  ON public.staff_ledger FOR ALL
  TO authenticated
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 17. audit_logs
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT
  USING (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- Immutable: INSERT only, no UPDATE/DELETE
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 18. customer_notes
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant_isolation_customer_notes" ON public.customer_notes;

CREATE POLICY "tenant_isolation_customer_notes"
  ON public.customer_notes FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 19. customer_tags
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant_isolation_customer_tags" ON public.customer_tags;

CREATE POLICY "tenant_isolation_customer_tags"
  ON public.customer_tags FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 20. fixed_assets
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "fixed_assets_select" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_insert" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_update" ON public.fixed_assets;

CREATE POLICY "fixed_assets_select"
  ON public.fixed_assets FOR SELECT
  USING (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "fixed_assets_insert"
  ON public.fixed_assets FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "fixed_assets_update"
  ON public.fixed_assets FOR UPDATE
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 21. inventory_items
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "inventory_items_select" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_items_update" ON public.inventory_items;

CREATE POLICY "inventory_items_select"
  ON public.inventory_items FOR SELECT
  USING (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "inventory_items_insert"
  ON public.inventory_items FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "inventory_items_update"
  ON public.inventory_items FOR UPDATE
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 22. inventory_movements
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "inventory_movements_select" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_update" ON public.inventory_movements;

CREATE POLICY "inventory_movements_select"
  ON public.inventory_movements FOR SELECT
  USING (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "inventory_movements_insert"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "inventory_movements_update"
  ON public.inventory_movements FOR UPDATE
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 23. notification_log
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can read own notification_log" ON public.notification_log;
DROP POLICY IF EXISTS "tenant can insert notification_log"   ON public.notification_log;

CREATE POLICY "tenant can read own notification_log"
  ON public.notification_log FOR SELECT
  USING (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "tenant can insert notification_log"
  ON public.notification_log FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 24. walk_ins
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "walk_ins_tenant_isolation" ON public.walk_ins;

CREATE POLICY "walk_ins_tenant_isolation"
  ON public.walk_ins FOR ALL
  USING      (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 25. mp_fee_config  (special: NULL means global / shared row)
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can read mp_fee_config"   ON public.mp_fee_config;
DROP POLICY IF EXISTS "tenant can manage mp_fee_config" ON public.mp_fee_config;

CREATE POLICY "tenant can read mp_fee_config"
  ON public.mp_fee_config FOR SELECT
  USING (
    business_id IS NULL
    OR business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id')
  );

CREATE POLICY "tenant can manage mp_fee_config"
  ON public.mp_fee_config FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 26. mp_payments
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can manage mp_payments" ON public.mp_payments;

CREATE POLICY "tenant can manage mp_payments"
  ON public.mp_payments FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 27. mp_subscriptions
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "tenant can read own subscription"   ON public.mp_subscriptions;
DROP POLICY IF EXISTS "tenant can manage mp_subscriptions" ON public.mp_subscriptions;

CREATE POLICY "tenant can read own subscription"
  ON public.mp_subscriptions FOR SELECT
  USING (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));

CREATE POLICY "tenant can manage mp_subscriptions"
  ON public.mp_subscriptions FOR ALL
  USING      (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'))
  WITH CHECK (business_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'business_id'));
