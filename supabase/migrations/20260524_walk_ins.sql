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
