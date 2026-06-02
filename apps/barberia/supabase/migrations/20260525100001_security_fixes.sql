-- ══════════════════════════════════════════════════════════════════════════════
-- Migración: 20260525100001_security_fixes.sql
-- Aplica fixes de seguridad detectados en auditoría 2026-05-25.
--
-- [SEC M-2/M-3/M-4] SET search_path = public en funciones SECURITY DEFINER
--   Previene search_path injection: un usuario malicioso no puede crear
--   objetos en su schema que sombreen las tablas de public.
--
-- [SEC M-1] Habilitar RLS en commission_queue con política de tenant isolation
-- ══════════════════════════════════════════════════════════════════════════════

-- ── [SEC M-4] log_action ─────────────────────────────────────────────────────
ALTER FUNCTION public.log_action(
  UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB, JSONB
) SET search_path = public;

-- ── [SEC M-2] record_inventory_movement ──────────────────────────────────────
-- Nota: la firma exacta puede variar — ajustar si hay error de resolución.
ALTER FUNCTION public.record_inventory_movement(
  UUID, UUID, TEXT, INTEGER, INTEGER, UUID, UUID
) SET search_path = public;

-- ── [SEC M-3] get_depreciation_schedule ──────────────────────────────────────
ALTER FUNCTION public.get_depreciation_schedule(
  UUID, UUID
) SET search_path = public;

-- ── [SEC M-3] get_total_asset_value ──────────────────────────────────────────
ALTER FUNCTION public.get_total_asset_value(
  UUID
) SET search_path = public;

-- ── [SEC M-1] RLS en commission_queue ────────────────────────────────────────
-- La tabla se inserta/lee solo desde el cron job (service role).
-- Para el rol authenticated bloqueamos todo acceso directo.
ALTER TABLE public.commission_queue ENABLE ROW LEVEL SECURITY;

-- Política: ningún usuario authenticated puede leer o escribir directamente.
-- El cron job usa service role que bypasea RLS — esto es intencional.
DROP POLICY IF EXISTS "commission_queue_deny_authenticated" ON public.commission_queue;
CREATE POLICY "commission_queue_deny_authenticated"
  ON public.commission_queue
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
