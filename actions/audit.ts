'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuditLog, Json } from '@/types/database'

// ── Tipos de parámetros ───────────────────────────────────────────────────────

export interface LogActionParams {
  businessId:  string
  actorId:     string | null
  actorName:   string | null
  action:      string
  entityType:  string
  entityId?:   string | null
  oldValue?:   Json | null
  newValue?:   Json | null
}

export interface GetAuditLogsFilters {
  entityType?: string
  entityId?:   string
  actorId?:    string
  dateFrom?:   string
  dateTo?:     string
  limit?:      number
}

// ════════════════════════════════════════════════════════════════════════════
// logAction — Registra una acción en el audit trail vía RPC
// IMPORTANTE: Siempre envolver en try/catch en el sitio de llamada.
// Un fallo de logging NUNCA debe bloquear la operación principal.
// ════════════════════════════════════════════════════════════════════════════

export async function logAction(params: LogActionParams): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('log_action', {
    p_business_id: params.businessId,
    p_actor_id:    params.actorId,
    p_actor_name:  params.actorName,
    p_action:      params.action,
    p_entity_type: params.entityType,
    p_entity_id:   params.entityId   ?? null,
    p_old_value:   params.oldValue   ?? null,
    p_new_value:   params.newValue   ?? null,
  })

  if (error) {
    // No lanzar — loggear silenciosamente para no romper la operación principal
    console.error('[audit.logAction] Error registrando acción:', error.message, {
      action:     params.action,
      entityType: params.entityType,
      entityId:   params.entityId,
    })
  }
}

// ════════════════════════════════════════════════════════════════════════════
// getAuditLogs — Lista logs con filtros opcionales (máx. 100 registros)
// ════════════════════════════════════════════════════════════════════════════

export async function getAuditLogs(
  businessId: string,
  filters?: GetAuditLogsFilters
): Promise<AuditLog[]> {
  const supabase = await createClient()
  const limit    = Math.min(filters?.limit ?? 100, 100)

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }
  if (filters?.entityId) {
    query = query.eq('entity_id', filters.entityId)
  }
  if (filters?.actorId) {
    query = query.eq('actor_id', filters.actorId)
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data, error } = await query

  if (error) {
    console.error('[audit.getAuditLogs]', error.message)
    return []
  }

  return (data ?? []) as AuditLog[]
}

// ════════════════════════════════════════════════════════════════════════════
// getAuditLogsForEntity — Línea de tiempo de una entidad específica
// ════════════════════════════════════════════════════════════════════════════

export async function getAuditLogsForEntity(
  businessId:  string,
  entityType:  string,
  entityId:    string
): Promise<AuditLog[]> {
  return getAuditLogs(businessId, { entityType, entityId, limit: 100 })
}
