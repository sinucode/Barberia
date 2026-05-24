-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Módulo de Gastos y P&G (RF16)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- TABLAS:
--   expenses — Registro de gastos fijos y variables del negocio
--
-- FUNCIONES:
--   get_profit_loss(p_business_id, p_date_from, p_date_to)
--     → Calcula ingresos, gastos, comisiones y utilidad neta para un período
--     → Retorna JSONB con revenue, expenses, gross_profit, commissions, net_profit
--     → Aritmética INTEGER pura — COP siempre sin decimales
--
-- AUTOR:    The CFO (RF16 — Gastos y P&G)
-- FECHA:    2026-05-23
-- PREREQUISITO: 00001_initial_schema.sql + 20260523_workstations_and_sprint3_tables.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Extensión requerida (si no está activa) ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ════════════════════════════════════════════════════════════════════════════
-- TABLA: expenses
-- Registra gastos operativos del negocio (alquiler, suministros, etc.)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category     TEXT        NOT NULL,          -- 'rent' | 'supplies' | 'utilities' | 'salary' | 'other'
  description  TEXT        NOT NULL,
  amount       INTEGER     NOT NULL CHECK (amount > 0),   -- COP INTEGER — NUNCA FLOAT
  expense_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN     NOT NULL DEFAULT false,
  created_by   UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas de P&G por negocio y período
CREATE INDEX IF NOT EXISTS idx_expenses_business_date
  ON public.expenses(business_id, expense_date);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own expenses"
  ON public.expenses
  FOR ALL
  USING  (business_id::text = auth.jwt() ->> 'business_id')
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');


-- ════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN: get_profit_loss
-- Calcula el Estado de Resultados (P&G) para un negocio en un período.
--
-- Ingresos:
--   - services: sum(sale_items.total_price) WHERE item_type = 'service' AND sale.status = 'paid'
--   - retail:   sum(sale_items.total_price) WHERE item_type = 'product'  AND sale.status = 'paid'
--
-- Gastos: sum(expenses.amount) agrupado por categoría
--
-- Comisiones proyectadas:
--   Aplica la lógica de cascada sobre ventas pagadas en el período:
--   staff+service > solo staff > regla global
--   (misma lógica que process_commission_queue, pero en modo lectura)
--
-- Retorna JSONB:
-- {
--   "revenue":      { "services": INTEGER, "retail": INTEGER, "total": INTEGER },
--   "expenses":     { "total": INTEGER, "by_category": [{ "category": TEXT, "total": INTEGER }] },
--   "gross_profit": INTEGER,
--   "commissions":  INTEGER,
--   "net_profit":   INTEGER
-- }
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_profit_loss(
  p_business_id UUID,
  p_date_from   DATE,
  p_date_to     DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue_services  INTEGER := 0;
  v_revenue_retail    INTEGER := 0;
  v_revenue_total     INTEGER := 0;
  v_expenses_total    INTEGER := 0;
  v_expenses_by_cat   JSONB   := '[]'::JSONB;
  v_gross_profit      INTEGER := 0;
  v_commissions       INTEGER := 0;
  v_net_profit        INTEGER := 0;

  -- Para cálculo de comisiones
  v_sale_record       RECORD;
  v_rule_pct          INTEGER;
  v_rule_fixed        INTEGER;
  v_base              INTEGER;
  v_commission_item   INTEGER;
BEGIN

  -- ── 1. Ingresos por servicios (sale_items tipo 'service') ─────────────────
  SELECT COALESCE(SUM(si.total_price), 0)::INTEGER
  INTO   v_revenue_services
  FROM   public.sale_items si
  JOIN   public.sales      s  ON s.id = si.sale_id
  WHERE  s.business_id  = p_business_id
    AND  s.status       = 'paid'
    AND  s.created_at::DATE BETWEEN p_date_from AND p_date_to
    AND  si.item_type   = 'service';

  -- ── 2. Ingresos por retail (sale_items tipo 'product') ───────────────────
  SELECT COALESCE(SUM(si.total_price), 0)::INTEGER
  INTO   v_revenue_retail
  FROM   public.sale_items si
  JOIN   public.sales      s  ON s.id = si.sale_id
  WHERE  s.business_id  = p_business_id
    AND  s.status       = 'paid'
    AND  s.created_at::DATE BETWEEN p_date_from AND p_date_to
    AND  si.item_type   = 'product';

  v_revenue_total := v_revenue_services + v_revenue_retail;

  -- ── 3. Gastos totales y por categoría ────────────────────────────────────
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  INTO   v_expenses_total
  FROM   public.expenses
  WHERE  business_id  = p_business_id
    AND  expense_date BETWEEN p_date_from AND p_date_to;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', category,
        'total',    cat_total
      )
      ORDER BY cat_total DESC
    ),
    '[]'::JSONB
  )
  INTO v_expenses_by_cat
  FROM (
    SELECT category, SUM(amount)::INTEGER AS cat_total
    FROM   public.expenses
    WHERE  business_id  = p_business_id
      AND  expense_date BETWEEN p_date_from AND p_date_to
    GROUP  BY category
  ) grouped;

  -- ── 4. Utilidad bruta ────────────────────────────────────────────────────
  v_gross_profit := v_revenue_total - v_expenses_total;

  -- ── 5. Comisiones proyectadas (lógica de cascada — modo lectura) ─────────
  FOR v_sale_record IN
    SELECT
      s.id              AS sale_id,
      s.subtotal        AS subtotal,
      s.discount_amount AS discount_amount,
      a.staff_id        AS staff_id,
      a.service_id      AS service_id
    FROM  public.sales        s
    JOIN  public.appointments a ON a.id = s.appointment_id
    WHERE s.business_id  = p_business_id
      AND s.status        = 'paid'
      AND s.created_at::DATE BETWEEN p_date_from AND p_date_to
      AND a.staff_id     IS NOT NULL
  LOOP
    -- Base = subtotal - descuento (nunca negativo)
    v_base := GREATEST(0, v_sale_record.subtotal - v_sale_record.discount_amount);

    -- Cascada: staff+service
    SELECT commission_percentage, fixed_amount
    INTO   v_rule_pct, v_rule_fixed
    FROM   public.commission_rules
    WHERE  business_id = p_business_id
      AND  staff_id   = v_sale_record.staff_id
      AND  service_id = v_sale_record.service_id
    LIMIT 1;

    -- Fallback: solo staff
    IF v_rule_pct IS NULL AND v_rule_fixed IS NULL THEN
      SELECT commission_percentage, fixed_amount
      INTO   v_rule_pct, v_rule_fixed
      FROM   public.commission_rules
      WHERE  business_id = p_business_id
        AND  staff_id   = v_sale_record.staff_id
        AND  service_id IS NULL
      LIMIT 1;
    END IF;

    -- Fallback: regla global
    IF v_rule_pct IS NULL AND v_rule_fixed IS NULL THEN
      SELECT commission_percentage, fixed_amount
      INTO   v_rule_pct, v_rule_fixed
      FROM   public.commission_rules
      WHERE  business_id = p_business_id
        AND  staff_id   IS NULL
        AND  service_id IS NULL
      LIMIT 1;
    END IF;

    -- Calcular comisión
    v_commission_item := 0;
    IF COALESCE(v_rule_pct, 0) > 0 THEN
      v_commission_item := (v_base * v_rule_pct) / 100;
    ELSIF COALESCE(v_rule_fixed, 0) > 0 THEN
      v_commission_item := v_rule_fixed;
    END IF;

    v_commissions := v_commissions + v_commission_item;

    -- Limpiar para la próxima iteración
    v_rule_pct   := NULL;
    v_rule_fixed := NULL;
  END LOOP;

  -- ── 6. Utilidad neta ─────────────────────────────────────────────────────
  v_net_profit := v_gross_profit - v_commissions;

  -- ── 7. Retornar JSONB ────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'revenue', jsonb_build_object(
      'services', v_revenue_services,
      'retail',   v_revenue_retail,
      'total',    v_revenue_total
    ),
    'expenses', jsonb_build_object(
      'total',       v_expenses_total,
      'by_category', v_expenses_by_cat
    ),
    'gross_profit', v_gross_profit,
    'commissions',  v_commissions,
    'net_profit',   v_net_profit
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error',   'rpc_error',
      'message', SQLERRM
    );
END;
$$;
