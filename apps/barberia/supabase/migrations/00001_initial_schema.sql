-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN BASE: Xinuco OS — Esquema inicial (tablas core)
-- ══════════════════════════════════════════════════════════════════════════════
-- Crea las tablas fundamentales del sistema multi-tenant.
-- Todas las migraciones posteriores asumen que estas tablas existen.
-- Usar CREATE TABLE IF NOT EXISTS garantiza idempotencia en re-runs.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. businesses (tenants) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.businesses (
  id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                           TEXT        NOT NULL,
  slug                           TEXT        NOT NULL UNIQUE,
  is_active                      BOOLEAN     NOT NULL DEFAULT TRUE,
  branding                       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  brand_config                   JSONB       NOT NULL DEFAULT '{}'::JSONB,
  features_enabled               JSONB       NOT NULL DEFAULT '{}'::JSONB,
  operating_hours                JSONB,
  workstations_count             INTEGER     DEFAULT 1,
  appointment_interval_minutes   INTEGER     DEFAULT 30,
  loyalty_point_value_cop        INTEGER     DEFAULT 1000,
  loyalty_expiry_months          INTEGER     DEFAULT 12,
  stripe_customer_id             TEXT,
  subscription_status            TEXT        CHECK (subscription_status IN ('active','past_due','canceled','trialing')),
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- ── 2. profiles ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'barber'
              CHECK (role IN ('super_admin','admin','barber','manicurist')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ── 3. services ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  description          TEXT,
  duration_minutes     INTEGER     NOT NULL DEFAULT 30,
  buffer_time_minutes  INTEGER     NOT NULL DEFAULT 0,
  price_cop            INTEGER     NOT NULL,
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage services"
  ON public.services FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 4. staff ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name      TEXT        NOT NULL,
  specialty_role TEXT        NOT NULL DEFAULT 'barber',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage staff"
  ON public.staff FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 5. staff_services ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_services (
  staff_id    UUID NOT NULL REFERENCES public.staff(id)    ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage staff_services"
  ON public.staff_services FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 6. staff_schedules ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID    NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id    UUID    NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME    NOT NULL,
  end_time    TIME    NOT NULL,
  UNIQUE (staff_id, day_of_week)
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage staff_schedules"
  ON public.staff_schedules FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 7. customers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name          TEXT        NOT NULL,
  phone              TEXT        NOT NULL,
  email              TEXT,
  preferred_staff_id UUID        REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, phone)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage customers"
  ON public.customers FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 8. appointments ───────────────────────────────────────────────────────────
-- NOTA: start_time es el campo canónico. time_range (TSTZRANGE) es legacy UI.
-- get_available_slots_v2 y bookings.ts usan start_time exclusivamente.
CREATE TABLE IF NOT EXISTS public.appointments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id    UUID        REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_id UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id  UUID        NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  status      TEXT        NOT NULL DEFAULT 'scheduled'
              CHECK (status IN ('scheduled','in_progress','ready_to_pay','completed','cancelled','no_show')),
  start_time  TIMESTAMPTZ,
  time_range  TSTZRANGE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_start
  ON public.appointments (business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_start
  ON public.appointments (staff_id, start_time);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage appointments"
  ON public.appointments FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 9. cash_register_shifts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_register_shifts (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  opened_by                UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by                UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status                   TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_balance          INTEGER     NOT NULL DEFAULT 0,
  expected_closing_balance INTEGER,
  actual_closing_balance   INTEGER,
  opened_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at                TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cash_register_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage shifts"
  ON public.cash_register_shifts FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 10. sales ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shift_id        UUID        NOT NULL REFERENCES public.cash_register_shifts(id),
  appointment_id  UUID        REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_id     UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal        INTEGER     NOT NULL,
  discount_amount INTEGER     NOT NULL DEFAULT 0,
  tip_amount      INTEGER     NOT NULL DEFAULT 0,
  total_amount    INTEGER     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'paid'
                  CHECK (status IN ('pending','paid','voided','completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage sales"
  ON public.sales FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 11. sale_items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sale_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id     UUID        NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  staff_id    UUID        REFERENCES public.staff(id) ON DELETE SET NULL,
  item_type   TEXT        NOT NULL CHECK (item_type IN ('service','product')),
  description TEXT        NOT NULL,
  quantity    INTEGER     NOT NULL DEFAULT 1,
  unit_price  INTEGER     NOT NULL,
  total_price INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage sale_items"
  ON public.sale_items FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 12. payments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id        UUID        NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  shift_id       UUID        REFERENCES public.cash_register_shifts(id),
  amount         INTEGER     NOT NULL,
  payment_method TEXT        NOT NULL CHECK (payment_method IN ('cash','card','transfer','loyalty_points','mixed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "tenant can manage payments"
  ON public.payments FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── RPC de seguridad: inyectar slug en JWT ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.secure_set_user_context(business_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id TEXT;
BEGIN
  SELECT id::TEXT INTO v_business_id
  FROM public.businesses
  WHERE slug = business_slug AND is_active = TRUE;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Negocio no encontrado o inactivo: %', business_slug;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('business_id', v_business_id, 'slug', business_slug)
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL     ON FUNCTION public.secure_set_user_context FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.secure_set_user_context TO authenticated;
