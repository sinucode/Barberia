-- ============================================================
-- RF19 — Audit Logs (Immutable Audit Trail)
-- Tabla de auditoría inmutable para trazabilidad de acciones.
-- REGLA: No hay políticas UPDATE ni DELETE — solo INSERT + SELECT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
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
