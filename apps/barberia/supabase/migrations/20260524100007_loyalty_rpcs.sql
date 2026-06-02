-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: RPCs Programa de Lealtad (RF17)
-- ══════════════════════════════════════════════════════════════════════════════
-- earn_loyalty_points   — Otorga puntos tras un cobro exitoso
-- redeem_loyalty_points — Canjea puntos como descuento
-- get_client_loyalty_balance — Consulta saldo activo de un cliente
--
-- AUTOR: The CFO (Finance Engineer)
-- FECHA: 2026-05-24
-- PREREQUISITO: 20260523_workstations_and_sprint3_tables.sql debe estar aplicado
-- ══════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- RPC: earn_loyalty_points
-- Otorga puntos al cliente tras un cobro exitoso.
-- Puntos = FLOOR(p_sale_amount / loyalty_point_value_cop)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.earn_loyalty_points(
  p_business_id           UUID,
  p_client_id             UUID,
  p_sale_amount           INTEGER,
  p_transaction_reference UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_point_value_cop    INTEGER;
  v_expiry_months      INTEGER;
  v_points_earned      INTEGER;
  v_total_balance      INTEGER;
BEGIN
  -- Leer configuración del negocio
  SELECT
    COALESCE(loyalty_point_value_cop, 1000),
    COALESCE(loyalty_expiry_months, 12)
  INTO v_point_value_cop, v_expiry_months
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'business_not_found');
  END IF;

  -- Evitar división por cero
  IF v_point_value_cop <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_point_value');
  END IF;

  -- División entera: puntos ganados
  v_points_earned := FLOOR(p_sale_amount::NUMERIC / v_point_value_cop);

  -- Solo insertar si hay puntos a ganar
  IF v_points_earned > 0 THEN
    INSERT INTO public.loyalty_ledgers (
      business_id,
      client_id,
      points_added,
      points_redeemed,
      transaction_reference,
      expires_at
    ) VALUES (
      p_business_id,
      p_client_id,
      v_points_earned,
      0,
      p_transaction_reference,
      NOW() + (v_expiry_months || ' months')::INTERVAL
    );
  END IF;

  -- Calcular saldo total activo (no vencido)
  SELECT COALESCE(
    SUM(points_added) - SUM(points_redeemed),
    0
  )
  INTO v_total_balance
  FROM public.loyalty_ledgers
  WHERE business_id = p_business_id
    AND client_id   = p_client_id
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN jsonb_build_object(
    'points_earned',         v_points_earned,
    'total_points_balance',  v_total_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.earn_loyalty_points(UUID, UUID, INTEGER, UUID)
  TO authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- RPC: redeem_loyalty_points
-- Canjea puntos como descuento. Valida saldo activo antes de insertar.
-- discount_amount_cop = p_points_to_redeem * loyalty_point_value_cop
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_business_id         UUID,
  p_client_id           UUID,
  p_points_to_redeem    INTEGER,
  p_transaction_reference UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_point_value_cop   INTEGER;
  v_active_balance    INTEGER;
  v_discount_cop      INTEGER;
  v_remaining_balance INTEGER;
BEGIN
  -- Validación básica
  IF p_points_to_redeem <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'points_must_be_positive');
  END IF;

  -- Leer configuración del negocio
  SELECT COALESCE(loyalty_point_value_cop, 1000)
  INTO v_point_value_cop
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'business_not_found');
  END IF;

  -- Calcular saldo activo (no vencido)
  SELECT COALESCE(
    SUM(points_added) - SUM(points_redeemed),
    0
  )
  INTO v_active_balance
  FROM public.loyalty_ledgers
  WHERE business_id = p_business_id
    AND client_id   = p_client_id
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Validar fondos suficientes
  IF v_active_balance < p_points_to_redeem THEN
    RETURN jsonb_build_object(
      'success',          false,
      'error',            'insufficient_points',
      'active_balance',   v_active_balance
    );
  END IF;

  -- Calcular descuento en COP (INTEGER, nunca float)
  v_discount_cop := p_points_to_redeem * v_point_value_cop;

  -- Insertar redención en el libro mayor
  INSERT INTO public.loyalty_ledgers (
    business_id,
    client_id,
    points_added,
    points_redeemed,
    transaction_reference,
    expires_at
  ) VALUES (
    p_business_id,
    p_client_id,
    0,
    p_points_to_redeem,
    p_transaction_reference,
    NULL
  );

  -- Saldo restante
  v_remaining_balance := v_active_balance - p_points_to_redeem;

  RETURN jsonb_build_object(
    'success',             true,
    'discount_amount_cop', v_discount_cop,
    'remaining_balance',   v_remaining_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(UUID, UUID, INTEGER, UUID)
  TO authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- RPC: get_client_loyalty_balance
-- Retorna saldo activo, valor en COP y puntos próximos a vencer (30 días).
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_client_loyalty_balance(
  p_business_id UUID,
  p_client_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_point_value_cop   INTEGER;
  v_total_points      INTEGER;
  v_expires_soon      INTEGER;
BEGIN
  -- Leer configuración
  SELECT COALESCE(loyalty_point_value_cop, 1000)
  INTO v_point_value_cop
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'business_not_found');
  END IF;

  -- Saldo total activo (no vencido)
  SELECT COALESCE(
    SUM(points_added) - SUM(points_redeemed),
    0
  )
  INTO v_total_points
  FROM public.loyalty_ledgers
  WHERE business_id = p_business_id
    AND client_id   = p_client_id
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Puntos que vencen en los próximos 30 días (solo los adds, no redeems)
  SELECT COALESCE(SUM(points_added), 0)
  INTO v_expires_soon
  FROM public.loyalty_ledgers
  WHERE business_id = p_business_id
    AND client_id   = p_client_id
    AND points_added > 0
    AND expires_at IS NOT NULL
    AND expires_at > NOW()
    AND expires_at <= NOW() + INTERVAL '30 days';

  RETURN jsonb_build_object(
    'total_points',     v_total_points,
    'points_value_cop', v_total_points * v_point_value_cop,
    'expires_soon',     v_expires_soon
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_loyalty_balance(UUID, UUID)
  TO authenticated;
