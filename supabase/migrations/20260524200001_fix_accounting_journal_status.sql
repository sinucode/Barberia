-- ══════════════════════════════════════════════════════════════════════════════
-- FIX RF22 — accounting_journal: incluir ventas con status = 'paid'
-- ══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA:
--   checkout_appointment y create_retail_sale insertan ventas con
--   status = 'paid', pero la VIEW filtraba WHERE s.status = 'completed'.
--   Resultado: el diario contable siempre mostraba $0 de ingresos.
--
-- FIX:
--   Cambiar el filtro a IN ('paid', 'completed') para capturar ambos
--   estados válidos de ventas cobradas. Se mantiene 'completed' por
--   compatibilidad con ventas que puedan tener ese estado en el futuro.
--
-- SPRINT: Corrección post-auditoría
-- FECHA:  2026-05-24
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.accounting_journal AS

-- Ingresos: ventas cobradas (servicios + retail)
-- status 'paid'      → insertado por checkout_appointment y create_retail_sale
-- status 'completed' → reservado para flujos futuros / compatibilidad
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
WHERE s.status IN ('paid', 'completed')   -- ← FIX: era solo 'completed'

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
  'RF22 — Diario contable unificado. Agrega ventas cobradas (status paid|completed),
gastos operativos y liquidaciones de staff en una vista única.
FIX 2026-05-24: filtro ampliado a IN (''paid'', ''completed'').';
