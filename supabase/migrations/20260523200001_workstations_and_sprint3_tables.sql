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
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
