-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Motor de Comisiones Variables (RF14) — RPCs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- FUNCIONES:
--   calculate_commission(p_appointment_id, p_business_id)
--     → Calcula la comisión para una cita, usando la lógica de cascada:
--       staff+service > solo staff > regla global del negocio
--     → Calcula sobre el subtotal DESPUÉS del descuento
--     → Maraca commission_queue.processed = true al finalizar
--     → Retorna JSONB: { staff_id, commission_amount, commission_percentage, base_amount }
--
--   process_commission_queue(p_business_id)
--     → Itera sobre todos los registros no procesados de un negocio
--     → Llama calculate_commission para cada uno
--     → Diseñada para ser invocada desde un Cron Job o Webhook
--
-- TIPOS: Aritmética INTEGER pura — COP siempre sin decimales
-- AUTOR: The CFO (Commission Engine)
-- FECHA: 2026-05-23
-- PREREQUISITO: 20260523_workstations_and_sprint3_tables.sql debe estar aplicado
-- ══════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN 1: calculate_commission
-- Calcula y registra la comisión de una cita individual
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculate_commission(
  p_appointment_id UUID,
  p_business_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id              UUID;
  v_service_id            UUID;
  v_sale_subtotal         INTEGER;
  v_sale_discount         INTEGER;
  v_base_amount           INTEGER;
  v_rule_percentage       INTEGER;
  v_rule_fixed            INTEGER;
  v_commission_amount     INTEGER;
  v_applied_percentage    INTEGER;
BEGIN

  -- ── 1. Obtener datos de la cita ─────────────────────────────────────────────
  SELECT a.staff_id, a.service_id
  INTO   v_staff_id, v_service_id
  FROM   public.appointments a
  WHERE  a.id          = p_appointment_id
    AND  a.business_id = p_business_id;

  -- NOT FOUND = la cita no existe o no pertenece al negocio
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error',   'not_found',
      'message', 'Cita no encontrada para el negocio especificado.'
    );
  END IF;

  -- ── 2. Obtener base de cálculo desde la venta asociada ────────────────────
  --       base = subtotal - discount_amount (propinas excluidas: son 100% del barbero)
  SELECT
    COALESCE(s.subtotal,       0)::INTEGER,
    COALESCE(s.discount_amount, 0)::INTEGER
  INTO
    v_sale_subtotal,
    v_sale_discount
  FROM public.sales s
  WHERE s.appointment_id = p_appointment_id
    AND s.business_id    = p_business_id
    AND s.status         = 'paid'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Si no hay venta pagada aún, base = 0 (comisión = 0, pero procesamos igualmente)
  v_base_amount := COALESCE(v_sale_subtotal, 0) - COALESCE(v_sale_discount, 0);
  IF v_base_amount < 0 THEN
    v_base_amount := 0;
  END IF;

  -- ── 3. Buscar regla aplicable en cascada ──────────────────────────────────

  -- Nivel 1: Regla específica para staff + servicio (mayor prioridad)
  SELECT commission_percentage, fixed_amount
  INTO   v_rule_percentage, v_rule_fixed
  FROM   public.commission_rules
  WHERE  business_id = p_business_id
    AND  staff_id    = v_staff_id
    AND  service_id  = v_service_id
  LIMIT 1;

  -- Nivel 2: Si no hay regla nivel 1, buscar por staff (todos los servicios)
  IF NOT FOUND THEN
    SELECT commission_percentage, fixed_amount
    INTO   v_rule_percentage, v_rule_fixed
    FROM   public.commission_rules
    WHERE  business_id = p_business_id
      AND  staff_id    = v_staff_id
      AND  service_id  IS NULL
    LIMIT 1;
  END IF;

  -- Nivel 3: Si no hay regla para este barbero, buscar regla global del negocio
  IF NOT FOUND THEN
    SELECT commission_percentage, fixed_amount
    INTO   v_rule_percentage, v_rule_fixed
    FROM   public.commission_rules
    WHERE  business_id = p_business_id
      AND  staff_id    IS NULL
      AND  service_id  IS NULL
    LIMIT 1;
  END IF;

  -- Sin regla aplicable → comisión cero
  IF NOT FOUND THEN
    v_rule_percentage := 0;
    v_rule_fixed      := 0;
  END IF;

  -- ── 4. Calcular monto de comisión (aritmética INTEGER pura) ───────────────
  IF COALESCE(v_rule_percentage, 0) > 0 THEN
    -- Porcentaje sobre la base: truncar al entero inferior (nunca redondear hacia arriba)
    v_commission_amount  := (v_base_amount * v_rule_percentage) / 100;
    v_applied_percentage := v_rule_percentage;
  ELSIF COALESCE(v_rule_fixed, 0) > 0 THEN
    v_commission_amount  := v_rule_fixed;
    v_applied_percentage := 0;
  ELSE
    v_commission_amount  := 0;
    v_applied_percentage := 0;
  END IF;

  -- ── 5. Marcar entrada de la cola como procesada ───────────────────────────
  UPDATE public.commission_queue
  SET    processed = true
  WHERE  appointment_id = p_appointment_id
    AND  processed      = false;

  -- ── 6. Retornar resultado ─────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'staff_id',             v_staff_id,
    'commission_amount',    v_commission_amount,
    'commission_percentage', v_applied_percentage,
    'base_amount',          v_base_amount
  );

END;
$$;

-- Permisos: authenticated puede llamar esta función (llamada desde Server Actions)
GRANT EXECUTE ON FUNCTION public.calculate_commission(UUID, UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN 2: process_commission_queue
-- Itera la cola y llama calculate_commission para cada entrada pendiente
-- Diseñada para ser invocada desde el Cron Job de Supabase (pg_cron)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_commission_queue(
  p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry         RECORD;
  v_result        JSONB;
  v_processed     INTEGER := 0;
  v_errors        INTEGER := 0;
  v_results_array JSONB   := '[]'::JSONB;
BEGIN

  -- Iterar sobre todos los registros no procesados del negocio
  FOR v_entry IN
    SELECT cq.id, cq.appointment_id
    FROM   public.commission_queue cq
    JOIN   public.appointments     a  ON a.id = cq.appointment_id
    WHERE  a.business_id = p_business_id
      AND  cq.processed  = false
    ORDER BY cq.created_at ASC
  LOOP
    -- Llamar al motor de cálculo para esta cita
    v_result := public.calculate_commission(v_entry.appointment_id, p_business_id);

    -- Acumular resultados
    IF v_result ? 'error' THEN
      v_errors := v_errors + 1;
    ELSE
      v_processed := v_processed + 1;
    END IF;

    v_results_array := v_results_array || jsonb_build_array(
      jsonb_build_object(
        'appointment_id', v_entry.appointment_id,
        'result',         v_result
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'errors',    v_errors,
    'details',   v_results_array
  );

END;
$$;

-- Permisos: service_role para el cron job, y authenticated para llamadas manuales desde admin
GRANT EXECUTE ON FUNCTION public.process_commission_queue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_commission_queue(UUID) TO service_role;
