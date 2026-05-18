'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Staff, StaffRole, StaffSchedule } from '@/types/database'

// ── Tipo del resultado de las operaciones ────────────────────────────────────
interface ActionResult {
  success?: boolean
  error?:   string
  data?:    Staff | Staff[] | StaffSchedule[]
}

/**
 * getStaff — Obtiene el personal de un negocio específico.
 * Cliente autenticado → RLS filtra por business_id automáticamente.
 */
export async function getStaff(businessId: string): Promise<Staff[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Staff[]
}

/**
 * createStaffMember — Crea un nuevo miembro del personal.
 * El campo user_id (profile_id) es opcional: puede ser null
 * cuando el empleado no tiene cuenta de autenticación aún.
 * Cliente autenticado → RLS valida pertenencia al business_id.
 */
export async function createStaffMember(
  businessId: string,
  data: {
    full_name: string
    role: string
    user_id?: string | null
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('staff')
    .insert({
      business_id: businessId,
      name:        data.full_name,
      role:        data.role as StaffRole,
      user_id:     data.user_id ?? null,
      is_active:   true,
    } as any)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe un miembro del equipo con esos datos.' }
    }
    return { error: error.message }
  }

  revalidatePath('/[slug]/dashboard/staff', 'page')
  return { success: true, data: result as Staff }
}

/**
 * toggleStaffStatus — Activa o desactiva un miembro del staff.
 * El .eq('id') es obligatorio para evitar mutación masiva.
 */
export async function toggleStaffStatus(
  staffId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', staffId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/staff', 'page')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════════════
// GESTIÓN DE HORARIOS — staff_schedules
// ════════════════════════════════════════════════════════════════════════════════

/**
 * getStaffSchedules — Obtiene los bloques de horario de un miembro del staff.
 * day_of_week: 0 = Domingo, 1 = Lunes … 6 = Sábado
 */
export async function getStaffSchedules(staffId: string): Promise<StaffSchedule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff_schedules')
    .select('*')
    .eq('staff_id', staffId)
    .order('day_of_week', { ascending: true })

  if (error) throw error
  return data as StaffSchedule[]
}

/**
 * upsertStaffSchedule — Crea o actualiza el horario de un empleado para un día.
 * Si ya existe un registro para ese staff_id + day_of_week, lo actualiza.
 * Si no existe, lo crea.
 * Cliente autenticado → RLS valida pertenencia al business_id.
 */
export async function upsertStaffSchedule(
  businessId: string,
  staffId: string,
  schedule: {
    day_of_week: number
    start_time:  string
    end_time:    string
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verificar si ya existe un horario para ese día
  const { data: existing } = await supabase
    .from('staff_schedules')
    .select('id')
    .eq('staff_id', staffId)
    .eq('day_of_week', schedule.day_of_week)
    .single()

  if (existing) {
    // UPDATE — ya existe, actualizamos los horarios
    const { error } = await supabase
      .from('staff_schedules')
      .update({
        start_time: schedule.start_time,
        end_time:   schedule.end_time,
      })
      .eq('id', existing.id)

    if (error) return { error: error.message }
  } else {
    // INSERT — no existe, creamos un nuevo bloque
    const { error } = await supabase
      .from('staff_schedules')
      .insert({
        business_id: businessId,
        staff_id:    staffId,
        day_of_week: schedule.day_of_week,
        start_time:  schedule.start_time,
        end_time:    schedule.end_time,
      } as any)

    if (error) return { error: error.message }
  }

  revalidatePath('/[slug]/dashboard/staff', 'page')
  return { success: true }
}

/**
 * deleteStaffSchedule — Elimina un bloque de horario específico.
 * El .eq('id') garantiza eliminación atómica.
 */
export async function deleteStaffSchedule(scheduleId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('staff_schedules')
    .delete()
    .eq('id', scheduleId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/staff', 'page')
  return { success: true }
}

/**
 * saveStaffSchedulesBatch — Actualización masiva del horario semanal de un empleado.
 * Estrategia: Elimina todos los registros actuales y hace un insert masivo (Batch) de los nuevos.
 * Cliente autenticado → RLS valida pertenencia al business_id.
 */
export async function saveStaffSchedulesBatch(
  businessId: string,
  staffId: string,
  schedules: Omit<StaffSchedule, 'id' | 'created_at' | 'updated_at' | 'business_id' | 'staff_id'>[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // PASO 1: Limpiar el calendario actual del empleado en este negocio
  const { error: deleteError } = await supabase
    .from('staff_schedules')
    .delete()
    .eq('staff_id', staffId)
    .eq('business_id', businessId)

  if (deleteError) {
    return { error: `Error al limpiar horarios: ${deleteError.message}` }
  }

  // PASO 2: Insertar masivamente si hay horarios activos
  if (schedules.length > 0) {
    // 🛡️ Blindaje de seguridad: Forzamos los IDs en el servidor
    const safeSchedulesToInsert = schedules.map(schedule => ({
      ...schedule,
      business_id: businessId,
      staff_id: staffId
    }))

    const { error: insertError } = await supabase
      .from('staff_schedules')
      .insert(safeSchedulesToInsert)

    if (insertError) {
      return { error: `Error al guardar horarios: ${insertError.message}` }
    }
  }

  // PASO 3: Refrescar la caché de Next.js
  revalidatePath('/[slug]/dashboard/staff', 'page')
  return { success: true }
}
