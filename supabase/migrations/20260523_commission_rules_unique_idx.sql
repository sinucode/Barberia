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
