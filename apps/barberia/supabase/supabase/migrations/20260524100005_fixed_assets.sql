-- ============================================================
-- RF21 — Activos Fijos (Fixed Assets)
-- Inventario de activos con cálculo de depreciación en línea
-- recta o saldo decreciente. Todos los montos en COP INTEGER.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID         NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name                 VARCHAR(150) NOT NULL,
  category             VARCHAR(50)  NOT NULL DEFAULT 'equipment',
  description          TEXT,
  serial_number        VARCHAR(100),
  location             VARCHAR(100),
  purchase_date        DATE         NOT NULL,
  purchase_price       INTEGER      NOT NULL CHECK (purchase_price > 0),
  salvage_value        INTEGER      NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  depreciation_method  VARCHAR(30)  NOT NULL DEFAULT 'straight_line',
  useful_life_months   INTEGER      NOT NULL DEFAULT 60 CHECK (useful_life_months > 0),
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by           UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Índices de rendimiento ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fixed_assets_business_active
  ON public.fixed_assets (business_id, is_active);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_business_purchase_date
  ON public.fixed_assets (business_id, purchase_date DESC);

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_assets_select"
  ON public.fixed_assets FOR SELECT
  USING (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "fixed_assets_insert"
  ON public.fixed_assets FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "fixed_assets_update"
  ON public.fixed_assets FOR UPDATE
  USING (business_id::text = (auth.jwt() ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

-- ============================================================
-- RPC: get_depreciation_schedule
-- Calcula el estado de depreciación de un activo fijo.
-- Straight-line: depreciación constante mensual.
-- Declining balance: depreciación decreciente compuesta.
-- Todos los valores intermedios son FLOOR() para cumplir
-- la regla de no-float en montos COP.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_depreciation_schedule(
  p_business_id  UUID,
  p_asset_id     UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- [SEC M-3] Previene search_path injection
AS $$
DECLARE
  v_asset              RECORD;
  v_months_elapsed     INTEGER;
  v_months_remaining   INTEGER;
  v_depreciable_amount INTEGER;
  v_current_value      INTEGER;
  v_accumulated_dep    INTEGER;
  v_monthly_dep        INTEGER;
  v_annual_rate        NUMERIC;
  v_monthly_rate       NUMERIC;
  v_i                  INTEGER;
  v_is_fully_dep       BOOLEAN;
BEGIN
  -- Fetch asset and validate ownership
  SELECT *
    INTO v_asset
    FROM public.fixed_assets
   WHERE id          = p_asset_id
     AND business_id = p_business_id
     AND is_active   = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Asset not found');
  END IF;

  -- months_elapsed since purchase_date
  v_months_elapsed := (
    EXTRACT(YEAR  FROM AGE(CURRENT_DATE, v_asset.purchase_date)) * 12 +
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_asset.purchase_date))
  )::INTEGER;

  -- Cap elapsed to useful life (cannot depreciate beyond useful life)
  IF v_months_elapsed > v_asset.useful_life_months THEN
    v_months_elapsed := v_asset.useful_life_months;
  END IF;

  v_months_remaining   := GREATEST(v_asset.useful_life_months - v_months_elapsed, 0);
  v_depreciable_amount := v_asset.purchase_price - v_asset.salvage_value;

  -- ── Straight-line ─────────────────────────────────────────────────────────
  IF v_asset.depreciation_method = 'straight_line' THEN
    v_monthly_dep     := FLOOR(v_depreciable_amount::NUMERIC / v_asset.useful_life_months);
    v_accumulated_dep := LEAST(v_monthly_dep * v_months_elapsed, v_depreciable_amount);
    v_current_value   := v_asset.purchase_price - v_accumulated_dep;

  -- ── Declining balance ──────────────────────────────────────────────────────
  ELSIF v_asset.depreciation_method = 'declining_balance' THEN
    v_annual_rate   := 2.0 / (v_asset.useful_life_months / 12.0);
    v_monthly_rate  := v_annual_rate / 12.0;
    v_current_value := v_asset.purchase_price;

    FOR v_i IN 1..v_months_elapsed LOOP
      v_current_value := GREATEST(
        FLOOR(v_current_value::NUMERIC * (1.0 - v_monthly_rate)),
        v_asset.salvage_value
      );
    END LOOP;

    v_accumulated_dep := v_asset.purchase_price - v_current_value;

  ELSE
    -- Unknown method — fall back to straight-line
    v_monthly_dep     := FLOOR(v_depreciable_amount::NUMERIC / v_asset.useful_life_months);
    v_accumulated_dep := LEAST(v_monthly_dep * v_months_elapsed, v_depreciable_amount);
    v_current_value   := v_asset.purchase_price - v_accumulated_dep;
  END IF;

  v_is_fully_dep := (v_current_value <= v_asset.salvage_value);

  RETURN json_build_object(
    'asset_id',                 p_asset_id,
    'name',                     v_asset.name,
    'purchase_price',           v_asset.purchase_price,
    'salvage_value',            v_asset.salvage_value,
    'current_value',            v_current_value,
    'accumulated_depreciation', v_accumulated_dep,
    'months_elapsed',           v_months_elapsed,
    'months_remaining',         v_months_remaining,
    'is_fully_depreciated',     v_is_fully_dep
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_depreciation_schedule(UUID, UUID)
  TO authenticated, service_role;

-- ============================================================
-- RPC: get_total_asset_value
-- Agrega el valor en libros de todos los activos activos del
-- negocio llamando get_depreciation_schedule en un loop.
-- Returns: { total_book_value, total_purchase_price,
--            total_depreciation, asset_count }
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_total_asset_value(
  p_business_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- [SEC M-3] Previene search_path injection
AS $$
DECLARE
  v_asset           RECORD;
  v_schedule        JSON;
  v_total_book      INTEGER := 0;
  v_total_purchase  INTEGER := 0;
  v_total_dep       INTEGER := 0;
  v_asset_count     INTEGER := 0;
BEGIN
  FOR v_asset IN
    SELECT id
      FROM public.fixed_assets
     WHERE business_id = p_business_id
       AND is_active   = TRUE
  LOOP
    v_schedule := public.get_depreciation_schedule(p_business_id, v_asset.id);

    IF (v_schedule->>'error') IS NULL THEN
      v_total_book     := v_total_book     + (v_schedule->>'current_value')::INTEGER;
      v_total_purchase := v_total_purchase + (v_schedule->>'purchase_price')::INTEGER;
      v_total_dep      := v_total_dep      + (v_schedule->>'accumulated_depreciation')::INTEGER;
      v_asset_count    := v_asset_count    + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'total_book_value',     v_total_book,
    'total_purchase_price', v_total_purchase,
    'total_depreciation',   v_total_dep,
    'asset_count',          v_asset_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_asset_value(UUID)
  TO authenticated, service_role;
