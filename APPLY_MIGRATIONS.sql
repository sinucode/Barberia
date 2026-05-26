-- ============================================================
-- XINUCO OS — Script consolidado de migraciones pendientes
-- Aplicar en Supabase SQL Editor en una sola ejecución
-- Fecha: 2026-05-24
-- ============================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_workstations_and_sprint3_tables.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Tablas Sprint 3 — Workstations, Comisiones y Lealtad
-- ══════════════════════════════════════════════════════════════════════════════
-- RF5:  Tabla workstations + pivot service_workstations
-- RF7:  Columnas de configuración operativa en businesses (para Agendamiento Tri-factorial)
-- RF14: Tabla commission_rules + commission_queue
-- RF17: Tabla loyalty_ledgers + columnas de configuración en businesses
-- RF23: Columnas de Stripe Billing en businesses
-- RF18: Columna buffer_time_minutes en services
--
-- AUTOR: The Vault (Database Engineer)
-- FECHA: 2026-05-23
-- PREREQUISITO: 00001_initial_schema.sql debe estar aplicado
-- ══════════════════════════════════════════════════════════════════════════════


-- ── Extensión requerida (si no está activa) ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 1: Columnas nuevas en tablas existentes
-- ════════════════════════════════════════════════════════════════════════════

-- RF7: buffer time en services (tiempo de limpieza post-servicio)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER NOT NULL DEFAULT 0;

-- RF7: intervalo de slots configurable por negocio
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS appointment_interval_minutes INTEGER NOT NULL DEFAULT 30;

-- RF17: configuración del programa de lealtad por negocio
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS loyalty_point_value_cop   INTEGER DEFAULT 1000,  -- 1 punto = $1.000 COP
  ADD COLUMN IF NOT EXISTS loyalty_expiry_months     INTEGER DEFAULT 12;    -- puntos vencen a los 12 meses

-- RF23: Stripe Billing
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT DEFAULT 'trialing'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing'));


-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 2: Tabla workstations (RF5)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workstations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas por negocio
CREATE INDEX IF NOT EXISTS idx_workstations_business_id
  ON public.workstations(business_id);

-- RLS
ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own workstations"
  ON public.workstations
  FOR ALL
  USING (business_id::text = auth.jwt() ->> 'business_id')
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');


-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 3: Tabla service_workstations — pivot RF5 ↔ RF7
-- Registra qué tipos de workstation requiere cada servicio
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.service_workstations (
  service_id     UUID NOT NULL REFERENCES public.services(id)      ON DELETE CASCADE,
  workstation_id UUID NOT NULL REFERENCES public.workstations(id)  ON DELETE CASCADE,
  business_id    UUID NOT NULL REFERENCES public.businesses(id)    ON DELETE CASCADE,
  PRIMARY KEY (service_id, workstation_id)
);

ALTER TABLE public.service_workstations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their service_workstations"
  ON public.service_workstations
  FOR ALL
  USING (business_id::text = auth.jwt() ->> 'business_id')
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');


-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 4: Tabla commission_rules (RF14)
-- Lógica de cascada: staff+service > solo staff > regla global
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_rules (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id           UUID    NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id              UUID    REFERENCES public.staff(id) ON DELETE CASCADE,    -- null = aplica a todos
  service_id            UUID    REFERENCES public.services(id) ON DELETE CASCADE, -- null = aplica a todos
  commission_percentage INTEGER NOT NULL DEFAULT 0 CHECK (commission_percentage BETWEEN 0 AND 100),
  fixed_amount          INTEGER NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0),     -- COP como INTEGER
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_business_id
  ON public.commission_rules(business_id);

CREATE INDEX IF NOT EXISTS idx_commission_rules_staff_id
  ON public.commission_rules(staff_id);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission rules"
  ON public.commission_rules
  FOR ALL
  USING (business_id::text = auth.jwt() ->> 'business_id')
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');


-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 5: Tabla commission_queue (trigger on_appointment_status_change)
-- Cola de procesamiento asíncrono — se inserta automáticamente al completar cita
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_queue (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  processed      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_queue_unprocessed
  ON public.commission_queue(processed, created_at)
  WHERE processed = false;

-- Sin RLS — solo acceso via Service Role Key desde el Cron Job


-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 6: Tabla loyalty_ledgers (RF17)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.loyalty_ledgers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id)  ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES public.customers(id)   ON DELETE CASCADE,
  points_added          INTEGER NOT NULL DEFAULT 0 CHECK (points_added >= 0),
  points_redeemed       INTEGER NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  transaction_reference UUID DEFAULT NULL,  -- → appointments.id o sales.id
  expires_at            TIMESTAMPTZ DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledgers_client
  ON public.loyalty_ledgers(business_id, client_id);

ALTER TABLE public.loyalty_ledgers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their loyalty ledgers"
  ON public.loyalty_ledgers
  FOR ALL
  USING (business_id::text = auth.jwt() ->> 'business_id')
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_commission_engine_rpc.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_commission_rules_unique_idx.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Unique index en commission_rules para cascade logic
-- ══════════════════════════════════════════════════════════════════════════════
-- RF14: Garantiza que por business_id sólo exista UNA regla para cada
--       combinación (staff_id, service_id), incluyendo el caso global
--       donde ambos son NULL.
--
-- PostgreSQL trata NULL != NULL en índices únicos normales, por lo que dos
-- reglas globales (staff_id=NULL, service_id=NULL) podrían coexistir.
-- COALESCE reemplaza NULL con un UUID centinela para forzar unicidad real.
--
-- PREREQUISITO: 20260523_workstations_and_sprint3_tables.sql aplicado
-- ══════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_rules_business_staff_service
  ON public.commission_rules (
    business_id,
    COALESCE(staff_id,   '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(service_id, '00000000-0000-0000-0000-000000000000'::UUID)
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_staff_ledger.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_expenses.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_checkout_atomic_rpc.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_retail_sale_rpc.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  p_customer_id     UUID    DEFAULT NULL,
  p_payment_method  TEXT,
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260523_get_available_slots_v2.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: get_available_slots_v2 — Agendamiento Tri-factorial (RF7)
-- ══════════════════════════════════════════════════════════════════════════════
-- Extiende la función original get_available_slots para validar:
--   1. Disponibilidad del barbero (staff)
--   2. Disponibilidad de estación de trabajo (workstation) — NUEVO
--   3. Respeta appointment_interval_minutes del negocio — NUEVO
--   4. Incorpora buffer_time_minutes del servicio en el cálculo — NUEVO
--
-- Fallback seguro: si el servicio no tiene workstations asignadas,
-- la función se comporta igual que get_available_slots (sin restricción física).
--
-- AUTOR: The Vault (Database Engineer)
-- FECHA: 2026-05-23
-- PREREQUISITO: 20260523_workstations_and_sprint3_tables.sql debe estar aplicado
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_available_slots_v2(
  p_business_id      UUID,
  p_staff_id         UUID,     -- NULL = cualquier barbero disponible
  p_service_id       UUID,     -- NULL = sin restricción de workstation; calcula duración desde services
  p_date             DATE,
  p_duration_minutes INTEGER   -- duración+buffer pre-calculada; se usa si p_service_id es NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval_minutes   INTEGER := 30;   -- granularidad de slots (default)
  v_duration_minutes   INTEGER;         -- duración real del servicio
  v_buffer_minutes     INTEGER := 0;    -- buffer post-servicio
  v_total_duration     INTEGER;         -- duración + buffer = bloque total reservado
  v_day_of_week        INTEGER;         -- 0=Domingo … 6=Sábado
  v_open_time          TIME;
  v_close_time         TIME;
  v_current_slot       TIME;
  v_slot_end           TIME;
  v_has_workstations   BOOLEAN := FALSE;
  v_free_workstation   BOOLEAN;
  v_slots              JSONB := '[]'::JSONB;
  v_slot_text          TEXT;
BEGIN
  -- ── PASO 1: Leer configuración operativa del negocio ──────────────────────
  SELECT COALESCE(appointment_interval_minutes, 30)
    INTO v_interval_minutes
    FROM public.businesses
   WHERE id = p_business_id;

  -- ── PASO 2: Calcular duración total (servicio + buffer) ───────────────────
  IF p_service_id IS NOT NULL THEN
    SELECT
      COALESCE(duration_minutes, p_duration_minutes),
      COALESCE(buffer_time_minutes, 0)
      INTO v_duration_minutes, v_buffer_minutes
      FROM public.services
     WHERE id = p_service_id;
  ELSE
    -- Fallback: usar la duración pre-calculada pasada como parámetro
    v_duration_minutes := COALESCE(p_duration_minutes, 30);
    v_buffer_minutes   := 0;
  END IF;

  v_total_duration := COALESCE(v_duration_minutes, 30) + v_buffer_minutes;

  -- ── PASO 3: Verificar si el servicio requiere workstations ────────────────
  IF p_service_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.service_workstations sw
        JOIN public.workstations w ON w.id = sw.workstation_id
       WHERE sw.service_id    = p_service_id
         AND sw.business_id   = p_business_id
         AND w.is_active      = TRUE
    ) INTO v_has_workstations;
  END IF;

  -- ── PASO 4: Determinar día de la semana y horario del negocio ─────────────
  -- EXTRACT DOW: 0=Domingo … 6=Sábado
  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- Obtener horario del barbero para ese día
  -- Si p_staff_id es NULL, tomamos el horario más amplio disponible en el negocio
  IF p_staff_id IS NOT NULL THEN
    SELECT start_time, end_time
      INTO v_open_time, v_close_time
      FROM public.staff_schedules
     WHERE staff_id    = p_staff_id
       AND business_id = p_business_id
       AND day_of_week = v_day_of_week
     LIMIT 1;
  ELSE
    -- Sin barbero específico: usar el rango más amplio entre todos los barberos activos
    SELECT MIN(start_time), MAX(end_time)
      INTO v_open_time, v_close_time
      FROM public.staff_schedules ss
      JOIN public.staff s ON s.id = ss.staff_id
     WHERE ss.business_id = p_business_id
       AND ss.day_of_week = v_day_of_week
       AND s.is_active    = TRUE;
  END IF;

  -- Si no hay horario configurado para ese día → devolver array vacío
  IF v_open_time IS NULL OR v_close_time IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- ── PASO 5: Generar y filtrar slots candidatos ─────────────────────────────
  v_current_slot := v_open_time;

  WHILE v_current_slot + (v_total_duration || ' minutes')::INTERVAL <= v_close_time LOOP

    v_slot_end := v_current_slot + (v_total_duration || ' minutes')::INTERVAL;

    -- ── 5a. Verificar colisión de staff ─────────────────────────────────────
    -- Un slot es inválido si el barbero ya tiene una cita que se solapa
    DECLARE
      v_staff_busy BOOLEAN := FALSE;
    BEGIN
      IF p_staff_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1
            FROM public.appointments a
           WHERE a.staff_id    = p_staff_id
             AND a.business_id = p_business_id
             AND DATE(a.start_time) = p_date
             AND a.status NOT IN ('cancelled', 'no_show')
             AND (
               -- La cita existente se solapa con el slot candidato
               (a.start_time::TIME < v_slot_end AND
                (a.start_time + (
                  COALESCE((SELECT duration_minutes + buffer_time_minutes FROM public.services WHERE id = a.service_id), 30) || ' minutes'
                )::INTERVAL)::TIME > v_current_slot)
             )
        ) INTO v_staff_busy;
      END IF;

      -- Si el barbero está ocupado, saltar este slot
      IF v_staff_busy THEN
        v_current_slot := v_current_slot + (v_interval_minutes || ' minutes')::INTERVAL;
        CONTINUE;
      END IF;
    END;

    -- ── 5b. Verificar disponibilidad de workstation ──────────────────────────
    -- Solo si el servicio requiere workstations asignadas
    IF v_has_workstations THEN
      SELECT EXISTS (
        SELECT 1
          FROM public.service_workstations sw
          JOIN public.workstations wk ON wk.id = sw.workstation_id
         WHERE sw.service_id  = p_service_id
           AND sw.business_id = p_business_id
           AND wk.is_active   = TRUE
           -- La workstation NO tiene citas solapadas en este slot
           AND NOT EXISTS (
             SELECT 1
               FROM public.appointments a2
              WHERE a2.business_id   = p_business_id
                AND a2.status NOT IN ('cancelled', 'no_show')
                AND DATE(a2.start_time) = p_date
                -- Verificar que la workstation está ocupada en ese horario
                -- Usamos la tabla service_workstations para saber qué workstation usa cada cita
                AND EXISTS (
                  SELECT 1
                    FROM public.service_workstations sw2
                   WHERE sw2.workstation_id = sw.workstation_id
                     AND sw2.service_id     = a2.service_id
                )
                AND (
                  a2.start_time::TIME < v_slot_end AND
                  (a2.start_time + (
                    COALESCE((SELECT duration_minutes + buffer_time_minutes FROM public.services WHERE id = a2.service_id), 30) || ' minutes'
                  )::INTERVAL)::TIME > v_current_slot
                )
           )
         LIMIT 1
      ) INTO v_free_workstation;

      -- Si no hay ninguna workstation libre → saltar este slot
      IF NOT v_free_workstation THEN
        v_current_slot := v_current_slot + (v_interval_minutes || ' minutes')::INTERVAL;
        CONTINUE;
      END IF;
    END IF;

    -- ── 5c. Slot válido — añadir al resultado ────────────────────────────────
    v_slot_text := TO_CHAR(v_current_slot, 'HH24:MI');
    v_slots := v_slots || jsonb_build_array(v_slot_text);

    v_current_slot := v_current_slot + (v_interval_minutes || ' minutes')::INTERVAL;
  END LOOP;

  RETURN v_slots;
END;
$$;

-- ── Comentario de la función para introspección ──────────────────────────────
COMMENT ON FUNCTION public.get_available_slots_v2 IS
  'RF7 — Agendamiento Tri-factorial: valida disponibilidad de staff + workstation + horario del negocio. '
  'Si el servicio no tiene workstations asignadas, actúa como get_available_slots original.';

-- ── Registrar la función en el tipo Database de TypeScript ──────────────────
-- (Actualizar types/database.ts manualmente o via supabase gen types)


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_audit_logs.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ============================================================
-- RF19 — Audit Logs (Immutable Audit Trail)
-- Tabla de auditoría inmutable para trazabilidad de acciones.
-- REGLA: No hay políticas UPDATE ni DELETE — solo INSERT + SELECT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id     UUID        REFERENCES auth.users(id),  -- NULL para eventos de sistema
  actor_name   TEXT,                                    -- Denormalizado para precisión histórica
  action       TEXT        NOT NULL,                   -- Ej: 'appointment.created', 'staff.deleted'
  entity_type  TEXT        NOT NULL,                   -- 'appointment' | 'staff' | 'service' | 'shift' | 'sale'
  entity_id    UUID,                                    -- ID del registro afectado
  old_value    JSONB       DEFAULT NULL,               -- Estado antes del cambio
  new_value    JSONB       DEFAULT NULL,               -- Estado después del cambio
  ip_address   TEXT        DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices de rendimiento ───────────────────────────────────────────────────

-- Consulta principal: todos los logs del negocio ordenados por fecha (DESC)
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created
  ON public.audit_logs (business_id, created_at DESC);

-- Consulta de línea de tiempo de una entidad específica
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (business_id, entity_type, entity_id);

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo miembros del negocio pueden leer sus propios logs
CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT
  USING (business_id::text = auth.jwt() ->> 'business_id');

-- Solo miembros del negocio pueden insertar logs (inmutable — no UPDATE, no DELETE)
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');

-- ── Función helper: log_action ───────────────────────────────────────────────
-- Wrapper de INSERT para llamar desde Server Actions vía RPC.

CREATE OR REPLACE FUNCTION public.log_action(
  p_business_id  UUID,
  p_actor_id     UUID,
  p_actor_name   TEXT,
  p_action       TEXT,
  p_entity_type  TEXT,
  p_entity_id    UUID    DEFAULT NULL,
  p_old_value    JSONB   DEFAULT NULL,
  p_new_value    JSONB   DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    business_id,
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  ) VALUES (
    p_business_id,
    p_actor_id,
    p_actor_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_value,
    p_new_value
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Otorgar acceso al RPC para usuarios autenticados y el rol de servicio
GRANT EXECUTE ON FUNCTION public.log_action(UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB, JSONB)
  TO authenticated, service_role;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_loyalty_rpcs.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_features_enabled_default.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_walk_ins.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ============================================================
-- Migration: RF8 — Walk-ins (Cola de clientes sin cita)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.walk_ins (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_name  TEXT        NOT NULL,
  customer_phone TEXT        DEFAULT NULL,
  service_id     UUID        REFERENCES public.services(id),
  staff_id       UUID        REFERENCES public.staff(id),
  status         TEXT        NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  notes          TEXT        DEFAULT NULL,
  position       INTEGER     NOT NULL DEFAULT 0,
  arrived_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  served_at      TIMESTAMPTZ DEFAULT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for queue reads: active walk-ins per business ordered by arrival
CREATE INDEX IF NOT EXISTS idx_walk_ins_business_status_arrived
  ON public.walk_ins (business_id, status, arrived_at ASC);

-- Enable Row Level Security
ALTER TABLE public.walk_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tenant isolation via JWT claim
CREATE POLICY "walk_ins_tenant_isolation"
  ON public.walk_ins
  FOR ALL
  USING (business_id::text = auth.jwt() ->> 'business_id')
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_crm.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ============================================================
-- RF9 — CRM Expediente del Cliente
-- ============================================================

-- Extensión para UUID (ya debería existir, pero por seguridad)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Columna preferred_staff_id en customers ───────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_staff_id UUID REFERENCES public.staff(id);

-- ── 2. Tabla: customer_notes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  staff_id       UUID        REFERENCES public.staff(id),
  appointment_id UUID        REFERENCES public.appointments(id),
  content        TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para recuperación rápida por cliente y fecha
CREATE INDEX IF NOT EXISTS idx_customer_notes_business_customer_date
  ON public.customer_notes (business_id, customer_id, created_at DESC);

-- RLS
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_customer_notes" ON public.customer_notes;
CREATE POLICY "tenant_isolation_customer_notes"
  ON public.customer_notes
  USING (business_id::text = auth.jwt() ->> 'business_id');

-- ── 3. Tabla: customer_tags ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_tags (
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  PRIMARY KEY (customer_id, business_id, tag)
);

-- RLS
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_customer_tags" ON public.customer_tags;
CREATE POLICY "tenant_isolation_customer_tags"
  ON public.customer_tags
  USING (business_id::text = auth.jwt() ->> 'business_id');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_notification_log.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ============================================================
-- RF18 — Notification Log
-- Registra todos los intentos de envío de notificaciones.
-- Permite auditar historial y evitar duplicados (recordatorio).
-- ============================================================

-- Extensión uuid ya disponible vía schema inicial
CREATE TABLE IF NOT EXISTS public.notification_log (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id    UUID                 REFERENCES public.appointments(id) ON DELETE SET NULL,
  notification_type TEXT        NOT NULL CHECK (notification_type IN ('confirmation', 'reminder', 'cancellation')),
  channel           TEXT        NOT NULL DEFAULT 'email',
  recipient_email   TEXT,
  status            TEXT        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message     TEXT        DEFAULT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultar historial por cita
CREATE INDEX IF NOT EXISTS idx_notification_log_appointment
  ON public.notification_log (appointment_id);

-- Índice para consultar historial por negocio
CREATE INDEX IF NOT EXISTS idx_notification_log_business
  ON public.notification_log (business_id, created_at DESC);

-- Índice para detectar si ya se envió un tipo de notificación para una cita
-- (útil para deduplicar recordatorios en el cron job)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_log_dedup
  ON public.notification_log (appointment_id, notification_type, channel)
  WHERE status = 'sent';

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Los admin del tenant pueden leer sus propios logs
CREATE POLICY "tenant can read own notification_log"
  ON public.notification_log
  FOR SELECT
  USING (business_id::text = auth.jwt() ->> 'business_id');

-- Solo el service role puede insertar (las notificaciones se crean desde el servidor)
-- Las Server Actions usan el cliente anon con contexto de sesión, así que
-- permitimos INSERT si el business_id coincide con el JWT del tenant.
CREATE POLICY "tenant can insert notification_log"
  ON public.notification_log
  FOR INSERT
  WITH CHECK (business_id::text = auth.jwt() ->> 'business_id');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_accounting_journal.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_fixed_assets.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN: 20260524_inventory.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ============================================================
-- RF — Inventario (Inventory Management)
-- Gestión de stock de productos con movimientos auditados.
-- Todos los montos en COP INTEGER. Soft-delete únicamente.
-- ============================================================

-- ── Tabla: inventory_items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID         NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  sku           VARCHAR(80),
  category      VARCHAR(60)  NOT NULL DEFAULT 'general',
  description   TEXT,
  current_stock INTEGER      NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock     INTEGER      NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  unit_price    INTEGER,       -- COP — precio de venta al público
  unit_cost     INTEGER,       -- COP — costo de compra (para P&G)
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: inventory_movements ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID         NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_id       UUID         NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity      INTEGER      NOT NULL,   -- positivo = entrada, negativo = salida
  movement_type VARCHAR(20)  NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'waste')),
  reference_id  UUID,                   -- link a sales.id si viene de venta
  notes         TEXT,
  created_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Índices de rendimiento ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inventory_items_business_active
  ON public.inventory_items (business_id, is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_items_business_name
  ON public.inventory_items (business_id, name);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_business
  ON public.inventory_movements (business_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item
  ON public.inventory_movements (item_id);

-- ── Trigger: actualizar updated_at en inventory_items ────────────────────────

CREATE OR REPLACE FUNCTION public.set_inventory_item_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON public.inventory_items;

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inventory_item_updated_at();

-- ── Row Level Security — inventory_items ─────────────────────────────────────

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_select"
  ON public.inventory_items FOR SELECT
  USING (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_items_insert"
  ON public.inventory_items FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_items_update"
  ON public.inventory_items FOR UPDATE
  USING  (business_id::text = (auth.jwt() ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

-- ── Row Level Security — inventory_movements ─────────────────────────────────

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_select"
  ON public.inventory_movements FOR SELECT
  USING (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_movements_insert"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_movements_update"
  ON public.inventory_movements FOR UPDATE
  USING  (business_id::text = (auth.jwt() ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

-- ============================================================
-- RPC: record_inventory_movement
-- Registra un movimiento de stock de forma atómica:
--   1. Verifica que el ítem exista y pertenezca al negocio.
--   2. Valida que el stock resultante no sea negativo.
--   3. Inserta la fila en inventory_movements.
--   4. Actualiza current_stock en inventory_items.
--   5. Retorna JSON con new_stock y aviso de stock bajo si aplica.
--
-- Todos los valores de COP son INTEGER (Math.floor en el caller).
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  p_business_id  UUID,
  p_item_id      UUID,
  p_quantity     INTEGER,  -- positivo = entrada, negativo = salida
  p_type         TEXT,
  p_notes        TEXT     DEFAULT NULL,
  p_reference_id UUID     DEFAULT NULL,
  p_user_id      UUID     DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item      RECORD;
  v_new_stock INTEGER;
BEGIN
  -- 1. Verificar que el ítem existe y pertenece al negocio
  SELECT current_stock, min_stock, name
    INTO v_item
    FROM public.inventory_items
   WHERE id          = p_item_id
     AND business_id = p_business_id
     AND is_active   = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Item not found or does not belong to this business');
  END IF;

  -- 2. Validar que el nuevo stock no sea negativo
  v_new_stock := v_item.current_stock + p_quantity;

  IF v_new_stock < 0 THEN
    RETURN json_build_object(
      'error',         'Insufficient stock',
      'current_stock', v_item.current_stock,
      'requested',     p_quantity
    );
  END IF;

  -- 3. Insertar movimiento
  INSERT INTO public.inventory_movements (
    business_id,
    item_id,
    quantity,
    movement_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    p_business_id,
    p_item_id,
    p_quantity,
    p_type,
    p_reference_id,
    p_notes,
    p_user_id
  );

  -- 4. Actualizar stock
  UPDATE public.inventory_items
     SET current_stock = v_new_stock,
         updated_at    = NOW()
   WHERE id          = p_item_id
     AND business_id = p_business_id;

  -- 5. Retornar resultado con alerta de stock bajo si corresponde
  RETURN json_build_object(
    'item_id',        p_item_id,
    'new_stock',      v_new_stock,
    'low_stock_warn', v_new_stock <= v_item.min_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_inventory_movement(UUID, UUID, INTEGER, TEXT, TEXT, UUID, UUID)
  TO authenticated, service_role;

