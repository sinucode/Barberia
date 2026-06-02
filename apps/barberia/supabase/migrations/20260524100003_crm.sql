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
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
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
