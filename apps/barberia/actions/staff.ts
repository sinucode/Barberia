'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Staff, StaffRole, StaffSchedule, Json } from '@/types/database'
import { logAction } from './audit'

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
    specialty_role: string
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('staff')
    .insert({
      business_id: businessId,
      full_name:   data.full_name,
      specialty_role: data.specialty_role,
      is_active:   true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe un miembro del equipo con esos datos.' }
    }
    return { error: error.message }
  }

  // ── Audit log ────────────────────────────────────────────────────────────────
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
      ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      : { data: null }

    await logAction({
      businessId:  businessId,
      actorId:     user?.id ?? null,
      actorName:   profile?.full_name ?? null,
      action:      'staff.created',
      entityType:  'staff',
      entityId:    (result as Staff).id,
      newValue:    { full_name: data.full_name, specialty_role: data.specialty_role } as unknown as Json,
    })
  } catch {
    // Silenciar
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

  // Obtener business_id antes de actualizar (necesario para el audit log)
  const { data: existing } = await supabase
    .from('staff')
    .select('business_id, full_name, is_active')
    .eq('id', staffId)
    .single()

  const { error } = await supabase
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', staffId)

  if (error) return { error: error.message }

  // ── Audit log ────────────────────────────────────────────────────────────────
  if (existing?.business_id) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = user
        ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        : { data: null }

      await logAction({
        businessId:  existing.business_id,
        actorId:     user?.id ?? null,
        actorName:   profile?.full_name ?? null,
        action:      isActive ? 'staff.activated' : 'staff.deactivated',
        entityType:  'staff',
        entityId:    staffId,
        oldValue:    { is_active: existing.is_active, full_name: existing.full_name } as unknown as Json,
        newValue:    { is_active: isActive,            full_name: existing.full_name } as unknown as Json,
      })
    } catch {
      // Silenciar
    }
  }

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
      })

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

/**
 * getAvailableSlotsAction — Llama a la función RPC segura en PostgreSQL
 * para obtener los horarios disponibles.
 *
 * Si se pasa `serviceId`, invoca `get_available_slots_v2` (RF7 — Agendamiento Tri-factorial)
 * que valida staff + workstation + intervalo del negocio.
 * En caso contrario hace fallback a `get_available_slots` original.
 */
export async function getAvailableSlotsAction(
  businessId: string,
  staffId: string | null,
  date: string, // Formato YYYY-MM-DD
  durationMinutes: number = 30,
  serviceId?: string        // RF7 — habilita validación de workstations
) {
  const supabase = await createClient()

  let rawData: unknown
  let rpcError: { message: string } | null = null

  if (serviceId) {
    // RF7: usar v2 con validación de workstations + buffer_time del servicio
    const { data, error } = await supabase.rpc('get_available_slots_v2', {
      p_business_id:      businessId,
      p_staff_id:         staffId,
      p_service_id:       serviceId,
      p_date:             date,
      p_duration_minutes: durationMinutes,
    } as Parameters<typeof supabase.rpc>[1])

    rawData  = data
    rpcError = error
  } else {
    // Fallback: función original sin restricción de workstations
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_business_id:      businessId,
      p_staff_id:         staffId,
      p_date:             date,
      p_duration_minutes: durationMinutes,
    } as Parameters<typeof supabase.rpc>[1])

    rawData  = data
    rpcError = error
  }

  if (rpcError) {
    return { error: `Error al calcular espacios: ${rpcError.message}`, slots: [] }
  }

  // Normalizar el resultado. Supabase a veces devuelve [{ "get_available_slots": "09:00" }] en lugar de ["09:00"]
  let slotsArray: string[] = []
  if (Array.isArray(rawData)) {
    if (rawData.length > 0 && typeof rawData[0] === 'object' && rawData[0] !== null) {
       slotsArray = (rawData as Record<string, unknown>[]).map(obj => Object.values(obj)[0] as string)
    } else {
       slotsArray = rawData as string[]
    }
  }

  // Asegurar formato HH:MM (eliminar segundos si PostgREST devuelve "09:00:00")
  slotsArray = slotsArray.map(s => s.substring(0, 5))

  return { success: true, slots: slotsArray }
}
