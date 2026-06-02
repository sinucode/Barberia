'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CommissionRule, Staff, Service } from '@/types/database'

// ── Tipos de resultado ────────────────────────────────────────────────────────

interface ActionResult {
  success?: boolean
  error?:   string
}

interface CommissionRuleCreateData {
  staff_id?:             string | null
  service_id?:           string | null
  commission_percentage: number
  fixed_amount:          number
}

export interface CommissionSummaryEntry {
  staff_id:              string
  staff_name:            string
  appointment_count:     number
  total_base_amount:     number   // COP INTEGER — suma de bases de cálculo
  total_commission:      number   // COP INTEGER — comisión calculada
  total_tips:            number   // COP INTEGER — propinas (100% del barbero)
}

export interface CommissionQueueResult {
  success?: boolean
  error?:   string
  processed?: number
  errors?:    number
}

// ── Tipos enriquecidos para la UI ─────────────────────────────────────────────

export interface CommissionRuleWithRelations extends CommissionRule {
  staff:   Pick<Staff,   'id' | 'full_name'> | null
  service: Pick<Service, 'id' | 'name'>      | null
}

// ════════════════════════════════════════════════════════════════════════════
// getCommissionRules
// Lista todas las reglas de comisión del negocio, con nombre de staff y servicio
// ════════════════════════════════════════════════════════════════════════════

export async function getCommissionRules(
  businessId: string
): Promise<CommissionRuleWithRelations[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('commission_rules')
    .select(`
      *,
      staff:staff_id ( id, full_name ),
      service:service_id ( id, name )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as CommissionRuleWithRelations[]
}

// ════════════════════════════════════════════════════════════════════════════
// createCommissionRule
// Inserta una nueva regla de comisión.
// Validaciones:
//   - commission_percentage y fixed_amount son mutuamente excluyentes (solo uno > 0)
//   - No puede existir ya una regla con la misma combinación business+staff+service
// ════════════════════════════════════════════════════════════════════════════

export async function createCommissionRule(
  businessId: string,
  data: CommissionRuleCreateData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Validar que solo uno de los dos montos sea positivo
  if (data.commission_percentage > 0 && data.fixed_amount > 0) {
    return { error: 'Solo puede definir porcentaje O monto fijo, no ambos.' }
  }
  if (data.commission_percentage === 0 && data.fixed_amount === 0) {
    return { error: 'Debe definir un porcentaje o un monto fijo mayor a 0.' }
  }
  if (data.commission_percentage < 0 || data.commission_percentage > 100) {
    return { error: 'El porcentaje debe estar entre 0 y 100.' }
  }
  if (data.fixed_amount < 0) {
    return { error: 'El monto fijo no puede ser negativo.' }
  }

  const { error } = await supabase
    .from('commission_rules')
    .insert({
      business_id:           businessId,
      staff_id:              data.staff_id   ?? null,
      service_id:            data.service_id ?? null,
      commission_percentage: data.commission_percentage,
      fixed_amount:          data.fixed_amount,
    })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una regla con esta combinación de barbero y servicio.' }
    }
    return { error: error.message }
  }

  revalidatePath('/[slug]/dashboard/commissions', 'page')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════════
// deleteCommissionRule
// Elimina una regla de configuración (no es registro transaccional).
// ════════════════════════════════════════════════════════════════════════════

export async function deleteCommissionRule(ruleId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('commission_rules')
    .delete()
    .eq('id', ruleId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/commissions', 'page')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════════
// calculatePendingCommissions
// Llama el RPC process_commission_queue para procesar la cola pendiente
// del negocio. Tipicamente invocada desde el panel de admin o el cron job.
// ════════════════════════════════════════════════════════════════════════════

export async function calculatePendingCommissions(
  businessId: string
): Promise<CommissionQueueResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('process_commission_queue', { p_business_id: businessId })

  if (error) return { error: error.message }

  const result = data as { processed: number; errors: number } | null

  revalidatePath('/[slug]/dashboard/commissions', 'page')
  return {
    success:   true,
    processed: result?.processed ?? 0,
    errors:    result?.errors    ?? 0,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// getStaffCommissionSummary
// Calcula el resumen de ganancias de un barbero (o todos) en un período.
// Combina sales + commission_rules para proyectar comisiones.
//
// Nota: este query aplica la misma lógica de cascada que el RPC,
// pero en modo lectura para reportes — no modifica la queue.
// ════════════════════════════════════════════════════════════════════════════

export async function getStaffCommissionSummary(
  businessId: string,
  staffId:    string | null,
  dateFrom:   string,
  dateTo:     string
): Promise<CommissionSummaryEntry[]> {
  const supabase = await createClient()

  // Obtener ventas pagadas con sus citas y propinas del período
  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      subtotal,
      discount_amount,
      tip_amount,
      appointment_id,
      appointments!inner (
        id,
        staff_id,
        service_id,
        staff:staff_id ( id, full_name )
      )
    `)
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)

  if (staffId) {
    salesQuery = salesQuery.eq('appointments.staff_id', staffId)
  }

  const { data: sales, error: salesError } = await salesQuery

  if (salesError) throw salesError
  if (!sales || sales.length === 0) return []

  // Obtener todas las reglas del negocio para aplicar cascada en JS
  const { data: rules, error: rulesError } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('business_id', businessId)

  if (rulesError) throw rulesError

  // Agrupar por staff_id
  const summaryMap = new Map<string, CommissionSummaryEntry>()

  for (const sale of sales) {
    const appt = (sale.appointments as any)[0] as {
      id: string
      staff_id: string | null
      service_id: string | null
      staff: { id: string; full_name: string } | null
    } | null

    if (!appt?.staff_id || !appt.staff) continue

    const sStaffId  = appt.staff_id
    const sServiceId = appt.service_id
    const staffName  = appt.staff.full_name

    // Calcular base (subtotal - descuento, nunca negativo)
    const base = Math.max(0, (sale.subtotal ?? 0) - (sale.discount_amount ?? 0))
    const tip  = sale.tip_amount ?? 0

    // Cascada: staff+service > solo staff > global
    const rule =
      (rules ?? []).find(r => r.staff_id === sStaffId   && r.service_id === sServiceId) ??
      (rules ?? []).find(r => r.staff_id === sStaffId   && r.service_id === null) ??
      (rules ?? []).find(r => r.staff_id === null        && r.service_id === null)

    let commissionAmount = 0
    if (rule) {
      if (rule.commission_percentage > 0) {
        commissionAmount = Math.floor((base * rule.commission_percentage) / 100)
      } else if (rule.fixed_amount > 0) {
        commissionAmount = rule.fixed_amount
      }
    }

    // Acumular en el mapa
    const existing = summaryMap.get(sStaffId)
    if (existing) {
      existing.appointment_count += 1
      existing.total_base_amount += base
      existing.total_commission  += commissionAmount
      existing.total_tips        += tip
    } else {
      summaryMap.set(sStaffId, {
        staff_id:          sStaffId,
        staff_name:        staffName,
        appointment_count: 1,
        total_base_amount: base,
        total_commission:  commissionAmount,
        total_tips:        tip,
      })
    }
  }

  return Array.from(summaryMap.values()).sort((a, b) =>
    b.total_commission - a.total_commission
  )
}
