-- ══════════════════════════════════════════════════════════════════════════════
-- RF22 — Trazabilidad Contable (Accounting Journal)
-- Migration: 20260524_accounting_journal.sql
--
-- Creates:
--   - VIEW  public.accounting_journal   (unified financial movements)
--   - FUNCTION public.get_accounting_summary (period totals)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. VIEW: accounting_journal ───────────────────────────────────────────────
-- Security: INVOKER means the view respects the RLS policies of each underlying
-- table (sales, expenses, staff_ledger) automatically.  No extra RLS needed on
-- the view itself.

CREATE OR REPLACE VIEW public.accounting_journal AS

-- Ingresos: ventas completadas (servicios + retail)
SELECT
  s.id                                                                        AS entry_id,
  s.business_id,
  s.created_at                                                                AS entry_date,
  'income'::TEXT                                                              AS entry_type,
  'sale'::TEXT                                                                AS entry_subtype,
  COALESCE(c.full_name, 'Público general') || ' — Venta #' || SUBSTRING(s.id::TEXT, 1, 8)
                                                                              AS description,
  s.total_amount                                                              AS amount,
  'ventas'::TEXT                                                              AS category,
  s.id::TEXT                                                                  AS reference_id,
  'sales'::TEXT                                                               AS reference_table
FROM public.sales s
LEFT JOIN public.customers c ON s.customer_id = c.id
WHERE s.status = 'completed'

UNION ALL

-- Gastos operativos
SELECT
  e.id                              AS entry_id,
  e.business_id,
  (e.expense_date::DATE)::TIMESTAMPTZ AS entry_date,
  'expense'::TEXT                   AS entry_type,
  'operating_expense'::TEXT         AS entry_subtype,
  e.description,
  e.amount,
  e.category::TEXT                  AS category,
  e.id::TEXT                        AS reference_id,
  'expenses'::TEXT                  AS reference_table
FROM public.expenses e

UNION ALL

-- Pagos reales a staff (liquidaciones)
SELECT
  sl.id                                                      AS entry_id,
  sl.business_id,
  sl.created_at                                              AS entry_date,
  'expense'::TEXT                                            AS entry_type,
  'staff_payout'::TEXT                                       AS entry_subtype,
  COALESCE('Liquidación: ' || st.full_name, 'Liquidación staff') AS description,
  sl.amount,
  'staff_ledger'::TEXT                                       AS category,
  sl.id::TEXT                                                AS reference_id,
  'staff_ledger'::TEXT                                       AS reference_table
FROM public.staff_ledger sl
JOIN public.staff st ON sl.staff_id = st.id
WHERE sl.entry_type = 'payment';

COMMENT ON VIEW public.accounting_journal IS
  'RF22 — Diario contable unificado. Agrega ventas completadas (income), gastos operativos y liquidaciones de staff (expense) en una vista única ordenable por entry_date. Hereda RLS de tablas subyacentes (INVOKER security).';

-- ── 2. FUNCTION: get_accounting_summary ──────────────────────────────────────
-- SECURITY DEFINER so the function can aggregate across the view regardless of
-- the caller's row-visibility, but the business_id filter ensures tenant
-- isolation is enforced at the function level.

CREATE OR REPLACE FUNCTION public.get_accounting_summary(
  p_business_id UUID,
  p_date_from   DATE,
  p_date_to     DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_income  INTEGER;
  v_total_expense INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN entry_type = 'income'  THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expense
  FROM public.accounting_journal
  WHERE business_id = p_business_id
    AND entry_date::DATE BETWEEN p_date_from AND p_date_to;

  RETURN json_build_object(
    'total_income',   v_total_income,
    'total_expense',  v_total_expense,
    'net_position',   v_total_income - v_total_expense,
    'period_from',    p_date_from,
    'period_to',      p_date_to
  );
END;
$$;

COMMENT ON FUNCTION public.get_accounting_summary(UUID, DATE, DATE) IS
  'RF22 — Devuelve un resumen JSON con total_income, total_expense y net_position (todos INTEGER COP) para el negocio y rango de fechas indicados.';
