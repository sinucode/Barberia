-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: checkout_appointment — RPC Atómico de Cobro
-- ══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA QUE RESUELVE:
--   El flujo anterior hacía 4 operaciones de BD separadas desde Next.js:
--   INSERT sales → INSERT sale_items → INSERT payments → UPDATE appointments
--   Si cualquier paso fallaba, los pasos anteriores ya estaban commiteados,
--   dejando la BD en un estado inconsistente (venta sin pago, cita sin cerrar).
--
-- SOLUCIÓN:
--   Esta función ejecuta las 4 operaciones dentro de una sola transacción
--   PostgreSQL. Si cualquier INSERT/UPDATE falla, PostgreSQL revierte TODO
--   automáticamente. No hay riesgo de estado parcial.
--
-- AUTOR:    The Vault (Database Engineer)
-- FECHA:    2026-05-23
-- SPRINT:   Sprint 2 — Integridad Financiera
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.checkout_appointment(
  p_appointment_id  UUID,
  p_business_id     UUID,
  p_shift_id        UUID,
  p_payment_method  TEXT,
  p_tip_amount      NUMERIC  DEFAULT 0,
  p_discount_amount NUMERIC  DEFAULT 0,
  p_items           JSONB    DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id     UUID;
  v_customer_id UUID;
  v_staff_id    UUID;
  v_subtotal    NUMERIC(12,2);
  v_total       NUMERIC(12,2);
BEGIN
  -- ── Validaciones de entrada (ANTES de cualquier escritura) ───────────────
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'error',   'validation_error',
      'message', 'Debe haber al menos un ítem para cobrar.'
    );
  END IF;

  -- ── Verificar que la cita existe y pertenece al negocio ──────────────────
  SELECT customer_id, staff_id
  INTO   v_customer_id, v_staff_id
  FROM   public.appointments
  WHERE  id          = p_appointment_id
    AND  business_id = p_business_id;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object(
      'error',   'not_found',
      'message', 'La cita especificada no fue encontrada.'
    );
  END IF;

  -- ── Calcular subtotal desde el JSONB de ítems ────────────────────────────
  SELECT COALESCE(SUM(
    (item->>'unit_price')::NUMERIC(12,2) * (item->>'quantity')::INT
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

  -- 1. Registrar la Venta (Sale)
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
    p_appointment_id,
    v_customer_id,
    v_subtotal,
    COALESCE(p_discount_amount, 0),
    COALESCE(p_tip_amount,      0),
    v_total,
    'paid'
  )
  RETURNING id INTO v_sale_id;

  -- 2. Registrar los Ítems de la Venta (SaleItems)
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
    COALESCE(NULLIF(item->>'staff_id', '')::UUID, v_staff_id),
    item->>'item_type',
    item->>'description',
    (item->>'quantity')::INT,
    (item->>'unit_price')::NUMERIC(12,2),
    (item->>'unit_price')::NUMERIC(12,2) * (item->>'quantity')::INT
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

  -- 4. Marcar la cita como completada
  UPDATE public.appointments
  SET    status     = 'completed',
         updated_at = NOW()
  WHERE  id          = p_appointment_id
    AND  business_id = p_business_id;

  -- ── Retornar resultado exitoso ────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id
  );

END;
$$;

-- ── Seguridad: solo roles autenticados pueden ejecutar esta función ──────────
REVOKE ALL    ON FUNCTION public.checkout_appointment FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.checkout_appointment TO authenticated;
