-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Billetera Digital del Staff (RF15) — Staff Ledger
-- ══════════════════════════════════════════════════════════════════════════════
--
-- TABLA:  staff_ledger
--   Registra cada movimiento de la billetera de un empleado:
--     commission → comisión calculada por el motor RF14
--     tip        → propina de una cita
--     advance    → anticipo pagado al empleado
--     payment    → liquidación del saldo acumulado
--
-- VISTA:  staff_ledger_balances
--   Agrega el saldo actual por empleado: earned - advances - paid_out
--
-- FUNCIÓN HELPER: record_commission_to_ledger
--   Llamada desde checkout_appointment RPC y calculate_commission
--   para atomizar el ingreso al ledger.
--
-- TIPOS: Aritmética INTEGER pura — COP siempre sin decimales
-- AUTOR: The CFO (RF15 — Staff Ledger)
-- FECHA: 2026-05-23
-- PREREQUISITO: 20260523_workstations_and_sprint3_tables.sql debe estar aplicado
-- ══════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- TABLA: staff_ledger
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.staff_ledger (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id     UUID        NOT NULL REFERENCES public.staff(id)      ON DELETE CASCADE,
  entry_type   TEXT        NOT NULL
                           CHECK (entry_type IN ('commission', 'tip', 'advance', 'payment')),
  amount       INTEGER     NOT NULL
                           CHECK (amount > 0),               -- siempre positivo; entry_type define dirección
  notes        TEXT,
  reference_id UUID        DEFAULT NULL,                     -- → appointments.id o sales.id
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice de consulta principal (por negocio + empleado, orden cronológico)
CREATE INDEX IF NOT EXISTS idx_staff_ledger_business_staff
  ON public.staff_ledger (business_id, staff_id, created_at DESC);

-- Índice por referencia (para joins con appointments/sales)
CREATE INDEX IF NOT EXISTS idx_staff_ledger_reference
  ON public.staff_ledger (reference_id)
  WHERE reference_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════════════════════
-- RLS: staff_ledger
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.staff_ledger ENABLE ROW LEVEL SECURITY;

-- Los autenticados solo ven/modifican entradas de su propio negocio
CREATE POLICY "staff_ledger_tenant_isolation"
  ON public.staff_ledger
  FOR ALL
  TO authenticated
  USING      (business_id::TEXT = auth.jwt() ->> 'business_id')
  WITH CHECK (business_id::TEXT = auth.jwt() ->> 'business_id');

-- service_role puede leer/escribir sin restricción (para RPCs y triggers)
CREATE POLICY "staff_ledger_service_role_full"
  ON public.staff_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════════════
-- VISTA: staff_ledger_balances
-- Agrega el saldo actual por (business_id, staff_id)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.staff_ledger_balances
  WITH (security_invoker = true)           -- hereda el contexto RLS del llamador
AS
SELECT
  business_id,
  staff_id,
  -- Ingresos acumulados: comisiones + propinas
  COALESCE(
    SUM(CASE WHEN entry_type IN ('commission', 'tip') THEN amount ELSE 0 END),
    0
  )::INTEGER AS total_earned,

  -- Anticipos dados al empleado
  COALESCE(
    SUM(CASE WHEN entry_type = 'advance'  THEN amount ELSE 0 END),
    0
  )::INTEGER AS total_advances,

  -- Liquidaciones pagadas al empleado
  COALESCE(
    SUM(CASE WHEN entry_type = 'payment'  THEN amount ELSE 0 END),
    0
  )::INTEGER AS total_paid_out,

  -- Saldo actual = earned - advances - paid_out
  COALESCE(
    SUM(
      CASE
        WHEN entry_type IN ('commission', 'tip')    THEN  amount
        WHEN entry_type IN ('advance',   'payment') THEN -amount
        ELSE 0
      END
    ),
    0
  )::INTEGER AS current_balance

FROM public.staff_ledger
GROUP BY business_id, staff_id;

-- Permisos sobre la vista
GRANT SELECT ON public.staff_ledger_balances TO authenticated;
GRANT SELECT ON public.staff_ledger_balances TO service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN HELPER: record_commission_to_ledger
-- Inserta entradas de comisión y/o propina en staff_ledger.
-- Invocada desde checkout_appointment RPC y calculate_commission.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_commission_to_ledger(
  p_appointment_id   UUID,
  p_business_id      UUID,
  p_staff_id         UUID,
  p_commission_amount INTEGER,
  p_tip_amount        INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- Insertar comisión si es mayor a 0
  IF p_commission_amount > 0 THEN
    INSERT INTO public.staff_ledger (
      business_id,
      staff_id,
      entry_type,
      amount,
      notes,
      reference_id
    ) VALUES (
      p_business_id,
      p_staff_id,
      'commission',
      p_commission_amount,
      'Comisión automática — Motor RF14',
      p_appointment_id
    );
  END IF;

  -- Insertar propina si es mayor a 0
  IF p_tip_amount > 0 THEN
    INSERT INTO public.staff_ledger (
      business_id,
      staff_id,
      entry_type,
      amount,
      notes,
      reference_id
    ) VALUES (
      p_business_id,
      p_staff_id,
      'tip',
      p_tip_amount,
      'Propina — 100% del empleado',
      p_appointment_id
    );
  END IF;

END;
$$;

-- Permisos: authenticated puede llamar (Server Actions), service_role para RPCs internos
GRANT EXECUTE ON FUNCTION public.record_commission_to_ledger(UUID, UUID, UUID, INTEGER, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_commission_to_ledger(UUID, UUID, UUID, INTEGER, INTEGER)
  TO service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- Permisos sobre la tabla principal
-- ════════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT ON public.staff_ledger TO authenticated;
GRANT ALL           ON public.staff_ledger TO service_role;
