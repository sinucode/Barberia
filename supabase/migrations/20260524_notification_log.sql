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
