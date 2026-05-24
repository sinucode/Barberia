-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: create_retail_sale — RPC Atómico de Venta Retail (sin cita)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA QUE RESUELVE:
--   Permite registrar ventas de productos (retail) que no están asociadas a
--   ninguna cita. Misma filosofía atómica que checkout_appointment: todo en
--   una transacción PostgreSQL — si cualquier paso falla, se revierte todo.
--
-- DIFERENCIAS vs checkout_appointment:
--   - No recibe p_appointment_id
--   - p_customer_id es nullable (venta anónima)
--   - item_type siempre 'product' (no 'service')
--   - No actualiza ninguna cita al finalizar
--
-- AUTOR:    The Mirror + The CFO (Finance Engineer)
-- FECHA:    2026-05-23
-- SPRINT:   RF20 — Venta Directa de Productos (Retail)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_retail_sale(
  p_business_id     UUID,
  p_shift_id        UUID,
  p_payment_method  TEXT,
  p_customer_id     UUID    DEFAULT NULL,
  p_tip_amount      INTEGER DEFAULT 0,
  p_discount_amount INTEGER DEFAULT 0,
  p_items           JSONB   DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id   UUID;
  v_subtotal  INTEGER;
  v_total     INTEGER;
  v_shift_status TEXT;
BEGIN
  -- ── Validaciones de entrada (ANTES de cualquier escritura) ───────────────

  -- 1. Al menos un ítem
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'error',   'validation_error',
      'message', 'Debe haber al menos un ítem para registrar la venta.'
    );
  END IF;

  -- 2. Verificar que el turno existe, pertenece al negocio y está abierto
  SELECT status
  INTO   v_shift_status
  FROM   public.cash_register_shifts
  WHERE  id          = p_shift_id
    AND  business_id = p_business_id;

  IF v_shift_status IS NULL THEN
    RETURN jsonb_build_object(
      'error',   'not_found',
      'message', 'El turno de caja especificado no fue encontrado.'
    );
  END IF;

  IF v_shift_status <> 'open' THEN
    RETURN jsonb_build_object(
      'error',   'shift_closed',
      'message', 'No se puede registrar una venta en un turno de caja cerrado.'
    );
  END IF;

  -- 3. Método de pago requerido
  IF p_payment_method IS NULL OR TRIM(p_payment_method) = '' THEN
    RETURN jsonb_build_object(
      'error',   'validation_error',
      'message', 'El método de pago es requerido.'
    );
  END IF;

  -- ── Calcular subtotal desde el JSONB de ítems (precios como INTEGER) ─────
  SELECT COALESCE(SUM(
    (item->>'unit_price')::INTEGER * (item->>'quantity')::INT
  ), 0)
  INTO   v_subtotal
  FROM   jsonb_array_elements(p_items) AS item;

  v_total := v_subtotal
           - COALESCE(p_discount_amount, 0)
           + COALESCE(p_tip_amount,      0);

  IF v_total < 0 THEN
    RETURN jsonb_build_object(
      'error',   'validation_error',
      'message', 'El total a pagar no puede ser negativo.'
    );
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- BLOQUE ATÓMICO
  -- A partir de aquí no hay EXCEPTION HANDLER deliberadamente.
  -- Si cualquier operación falla, PostgreSQL aborta la transacción completa
  -- y revierte todos los cambios anteriores de forma automática.
  -- ════════════════════════════════════════════════════════════════════════

  -- 1. Registrar la Venta (Sale) — appointment_id = NULL (retail)
  INSERT INTO public.sales (
    business_id,
    shift_id,
    appointment_id,
    customer_id,
    subtotal,
    discount_amount,
    tip_amount,
    total_amount,
    status
  )
  VALUES (
    p_business_id,
    p_shift_id,
    NULL,                              -- Sin cita asociada
    p_customer_id,                     -- Puede ser NULL (venta anónima)
    v_subtotal,
    COALESCE(p_discount_amount, 0),
    COALESCE(p_tip_amount,      0),
    v_total,
    'paid'
  )
  RETURNING id INTO v_sale_id;

  -- 2. Registrar los Ítems de la Venta (SaleItems) — item_type = 'product'
  INSERT INTO public.sale_items (
    business_id,
    sale_id,
    staff_id,
    item_type,
    description,
    quantity,
    unit_price,
    total_price
  )
  SELECT
    p_business_id,
    v_sale_id,
    NULLIF(item->>'staff_id', '')::UUID,
    'product',                          -- Siempre 'product' en retail
    item->>'description',
    (item->>'quantity')::INT,
    (item->>'unit_price')::INTEGER,
    (item->>'unit_price')::INTEGER * (item->>'quantity')::INT
  FROM jsonb_array_elements(p_items) AS item;

  -- 3. Registrar el Pago (Payment)
  INSERT INTO public.payments (
    business_id,
    sale_id,
    shift_id,
    amount,
    payment_method
  )
  VALUES (
    p_business_id,
    v_sale_id,
    p_shift_id,
    v_total,
    p_payment_method
  );

  -- ── Retornar resultado exitoso ────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id
  );

END;
$$;

-- ── Seguridad: solo roles autenticados pueden ejecutar esta función ──────────
REVOKE ALL     ON FUNCTION public.create_retail_sale FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_retail_sale TO authenticated;
