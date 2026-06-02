-- ══════════════════════════════════════════════════════════════════════════════
-- RF-MP — MercadoPago: tablas de configuración, pagos y suscripciones
-- ══════════════════════════════════════════════════════════════════════════════
-- Tablas nuevas:
--   mp_fee_config    — tarifas por método de pago (editables por super_admin)
--   mp_payments      — registro de cobros procesados por MP
--   mp_subscriptions — suscripciones SaaS activas por negocio
--
-- Constraint: COP siempre como INTEGER. Fees en basis points (1bp = 0.01%).
-- RLS: todas las tablas aisladas por business_id.
-- Nota: CREATE POLICY IF NOT EXISTS solo existe en PG17+.
--       Usamos DROP POLICY IF EXISTS + CREATE POLICY para idempotencia.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. mp_fee_config ──────────────────────────────────────────────────────────
-- NULL business_id = config global de plataforma (aplica a todos los negocios)
-- Un business_id específico sobreescribe la config global para ese negocio.
CREATE TABLE IF NOT EXISTS public.mp_fee_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_method  TEXT        NOT NULL
                  CHECK (payment_method IN (
                    'credit_card','debit_card','pse',
                    'nequi','daviplata','qr','efecty','subscription'
                  )),
  fee_rate_bp     INTEGER     NOT NULL CHECK (fee_rate_bp >= 0),
  fixed_fee_cop   INTEGER     NOT NULL DEFAULT 0 CHECK (fixed_fee_cop >= 0),
  iva_rate_bp     INTEGER     NOT NULL DEFAULT 1900 CHECK (iva_rate_bp >= 0),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (business_id, payment_method)
);

ALTER TABLE public.mp_fee_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant can read mp_fee_config"   ON public.mp_fee_config;
DROP POLICY IF EXISTS "tenant can manage mp_fee_config" ON public.mp_fee_config;

CREATE POLICY "tenant can read mp_fee_config"
  ON public.mp_fee_config FOR SELECT
  USING (
    business_id IS NULL
    OR business_id::TEXT = auth.jwt() ->> 'business_id'
  );

CREATE POLICY "tenant can manage mp_fee_config"
  ON public.mp_fee_config FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 2. mp_payments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mp_payments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id             UUID        REFERENCES public.sales(id) ON DELETE SET NULL,
  appointment_id      UUID        REFERENCES public.appointments(id) ON DELETE SET NULL,
  mp_preference_id    TEXT,
  mp_payment_id       TEXT        UNIQUE,
  mp_status           TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (mp_status IN (
                        'pending','approved','authorized','in_process',
                        'in_mediation','rejected','cancelled','refunded','charged_back'
                      )),
  payment_method      TEXT        NOT NULL
                      CHECK (payment_method IN (
                        'credit_card','debit_card','pse',
                        'nequi','daviplata','qr','efecty','subscription'
                      )),
  gross_amount_cop    INTEGER     NOT NULL CHECK (gross_amount_cop > 0),
  fee_amount_cop      INTEGER     NOT NULL DEFAULT 0 CHECK (fee_amount_cop >= 0),
  net_amount_cop      INTEGER     NOT NULL CHECK (net_amount_cop >= 0),
  fee_rate_bp         INTEGER     NOT NULL DEFAULT 0,
  external_reference  TEXT,
  webhook_payload     JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_payments_business
  ON public.mp_payments (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mp_payments_mp_payment_id
  ON public.mp_payments (mp_payment_id);

ALTER TABLE public.mp_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant can manage mp_payments" ON public.mp_payments;

CREATE POLICY "tenant can manage mp_payments"
  ON public.mp_payments FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 3. mp_subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mp_subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID        NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  mp_subscription_id  TEXT        UNIQUE,
  plan_id             TEXT        NOT NULL
                      CHECK (plan_id IN ('basico','pro','premium')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending','authorized','paused','cancelled'
                      )),
  amount_cop          INTEGER     NOT NULL CHECK (amount_cop > 0),
  next_billing_date   DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mp_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant can read own subscription"   ON public.mp_subscriptions;
DROP POLICY IF EXISTS "tenant can manage mp_subscriptions" ON public.mp_subscriptions;

CREATE POLICY "tenant can read own subscription"
  ON public.mp_subscriptions FOR SELECT
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

CREATE POLICY "tenant can manage mp_subscriptions"
  ON public.mp_subscriptions FOR ALL
  USING (business_id::TEXT = auth.jwt() ->> 'business_id');

-- ── 4. Extender payments.payment_method para incluir 'mercadopago' ────────────
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_method_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN (
    'cash','card','transfer','loyalty_points','mixed','mercadopago'
  ));

-- ── 5. SEED: Tarifas Colombia 2026 (config global de plataforma) ──────────────
INSERT INTO public.mp_fee_config
  (business_id, payment_method, fee_rate_bp, fixed_fee_cop, iva_rate_bp)
VALUES
  (NULL, 'credit_card',  349, 0,   1900),
  (NULL, 'debit_card',   249, 0,   1900),
  (NULL, 'pse',          175, 0,   1900),
  (NULL, 'nequi',        229, 0,   1900),
  (NULL, 'daviplata',    229, 0,   1900),
  (NULL, 'qr',           229, 0,   1900),
  (NULL, 'efecty',       399, 900, 1900),
  (NULL, 'subscription', 499, 0,   1900)
ON CONFLICT (business_id, payment_method) DO UPDATE
  SET fee_rate_bp   = EXCLUDED.fee_rate_bp,
      fixed_fee_cop = EXCLUDED.fixed_fee_cop,
      iva_rate_bp   = EXCLUDED.iva_rate_bp,
      updated_at    = NOW();

COMMENT ON TABLE public.mp_fee_config IS
  'Configuración de fees de MercadoPago por método de pago. '
  'NULL business_id = config global de plataforma. '
  'Actualizar cuando MP cambie sus tarifas (mercadopago.com.co/tariffs).';

COMMENT ON TABLE public.mp_payments IS
  'Registro de todos los pagos procesados a través de MercadoPago. '
  'mp_payment_id es el ID único de MP, external_reference para reconciliación.';

COMMENT ON TABLE public.mp_subscriptions IS
  'Suscripciones SaaS de negocios via MercadoPago Preapproval API. '
  'Una fila por negocio (UNIQUE business_id).';
