'use server'

import { createClient } from '@/lib/supabase/server'
import { addMinutes, format, parseISO, isBefore, isAfter, getDay } from 'date-fns'
import { revalidatePath } from 'next/cache'
import type { AppointmentStatus, Json } from '@/types/database'
import { logAction } from './audit'

// ════════════════════════════════════════════════════════════════════════════════
// TAREA 1: EL MOTOR DE DISPONIBILIDAD (getAvailableSlots)
// Basado en staff_schedules (turnos individuales) + detección de colisiones.
// ════════════════════════════════════════════════════════════════════════════════

export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: string, // Formato YYYY-MM-DD
  staffId?: string | null
) {
  const supabase = await createClient()

  // 1. Datos Base: Obtener la duración del servicio
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) throw new Error('Servicio no encontrado.')

  const duration = service.duration_minutes

  // 2. Consulta de Colisiones: Obtener citas del día
  const startOfDay = `${date} 00:00:00+00`
  const endOfDay = `${date} 23:59:59+00`

  let apptQuery = supabase
    .from('appointments')
    .select('staff_id, time_range')
    .eq('business_id', businessId)
    .not('status', 'eq', 'cancelled')
    .filter('time_range', 'ov', `[${startOfDay}, ${endOfDay}]`)

  if (staffId && staffId !== 'any') apptQuery = apptQuery.eq('staff_id', staffId)

  const { data: appointments } = await apptQuery

  // 3. Horarios Hábiles: Obtener turnos de trabajo del staff
  const targetDate = parseISO(date)
  const dayOfWeek = getDay(targetDate)

  let scheduleQuery = supabase
    .from('staff_schedules')
    .select('staff_id, start_time, end_time')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek)

  if (staffId && staffId !== 'any') scheduleQuery = scheduleQuery.eq('staff_id', staffId)

  const { data: schedules } = await scheduleQuery

  if (!schedules || schedules.length === 0) return { slots: [] }

  // Parsear los rangos de citas (TSTZRANGE) a objetos Date nativos
  const bookedIntervals = (appointments || []).map((app) => {
    const match = app.time_range.match(/\["?([^",]+)"?,\s*"?([^",)]+)"?\)/)
    if (!match) return null
    return { staff_id: app.staff_id, start: new Date(match[1]), end: new Date(match[2]) }
  }).filter(Boolean) as { staff_id: string; start: Date; end: Date }[]

  const availableSlots = new Set<string>()

  // 4. Generación de Intervalos y Filtro Core Logic
  for (const schedule of schedules) {
    const shiftStart = parseISO(`${date}T${schedule.start_time}`)
    const shiftEnd = parseISO(`${date}T${schedule.end_time}`)
    const staffBookings = bookedIntervals.filter((b) => b.staff_id === schedule.staff_id)

    let currentSlotStart = shiftStart

    while (isBefore(currentSlotStart, shiftEnd)) {
      const currentSlotEnd = addMinutes(currentSlotStart, duration)

      // Edge Case: Descartar si la cita cruza la hora de salida
      if (isAfter(currentSlotEnd, shiftEnd)) break

      const hasOverlap = staffBookings.some((booking) => {
        return currentSlotStart < booking.end && currentSlotEnd > booking.start
      })

      if (!hasOverlap) availableSlots.add(format(currentSlotStart, 'HH:mm'))

      currentSlotStart = addMinutes(currentSlotStart, 30) // Incremento de 30 mins
    }
  }

  return { slots: Array.from(availableSlots).sort() }
}

/**
 * updateAppointmentStatus — Actualiza el estado de una cita.
 */
export async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const supabase = await createClient()

  // Obtener el estado anterior y el business_id antes de actualizar
  const { data: existing } = await supabase
    .from('appointments')
    .select('status, business_id, staff_id')
    .eq('id', appointmentId)
    .single()

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)

  if (error) {
    console.error('Error updating appointment status:', error)
    return { error: error.message }
  }

  // ── Audit log (nunca bloquea la operación principal) ─────────────────────────
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
        action:      'appointment.status_changed',
        entityType:  'appointment',
        entityId:    appointmentId,
        oldValue:    { status: existing.status } as unknown as Json,
        newValue:    { status } as unknown as Json,
      })
    } catch {
      // Silenciar — el log nunca rompe la operación principal
    }
  }

  revalidatePath('/[slug]/dashboard', 'page')
  return { success: true }
}


