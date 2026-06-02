-- ══════════════════════════════════════════════════════════════════════════════
-- RF-MP Sprint 3 — Agregar status 'payment_pending' a appointments
-- ══════════════════════════════════════════════════════════════════════════════
-- Cuando un cliente reserva y elige pagar online con MercadoPago,
-- la cita se crea con status = 'payment_pending' hasta que el webhook
-- confirme el pago y lo cambie a 'scheduled'.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'payment_pending',   -- ← NUEVO: cita creada, esperando pago online
    'scheduled',
    'in_progress',
    'ready_to_pay',
    'completed',
    'cancelled',
    'no_show'
  ));

COMMENT ON COLUMN public.appointments.status IS
  'payment_pending: reserva creada, esperando confirmación de pago MP. '
  'scheduled: cita confirmada (pago presencial o pago online aprobado). '
  'Otros: flujo normal de la cita.';
