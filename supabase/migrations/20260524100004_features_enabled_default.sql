-- ============================================================
-- Migration: 20260524_features_enabled_default.sql
-- Ensures all existing businesses have a proper features_enabled
-- JSONB with all required keys filled in.
-- Default: Pro plan for all existing tenants (backward compat).
-- ============================================================

-- Update rows that either have NULL features_enabled
-- OR are missing the 'commissions' key (newly added in this sprint).
UPDATE public.businesses
SET features_enabled = jsonb_build_object(
  'notifications_email',    true,
  'notifications_whatsapp', false,
  'commissions',            true,
  'staff_ledger',           true,
  'expenses_pgl',           true,
  'retail_sales',           true,
  'loyalty',                false,
  'workstations',           true,
  'walk_ins',               false,
  'crm',                    false,
  'audit_logs',             false,
  'fixed_assets',           false,
  'inventory',              false,
  'advanced_reports',       true
)
WHERE features_enabled IS NULL
   OR NOT (features_enabled ? 'commissions');
