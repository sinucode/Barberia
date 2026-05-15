'use server'

import { createClient } from '@/lib/supabase/server'
import { addMinutes, format, parseISO, isBefore, isAfter, isEqual, startOfDay, endOfDay } from 'date-fns'
import type { OperatingHours, Appointment } from '@/types/database'

/**
 * TAREA 1: EL MOTOR DE DISPONIBILIDAD (getAvailableSlots)
 * Implementa la lógica de asignación considerando staff y recursos físicos (Workstations).
 */
export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: string, // Formato YYYY-MM-DD
  staffId: string | null | 'any'
) {
  const supabase = await createClient()

  // 1. Consultas Iniciales: Negocio, Servicio y Citas
  const [
    { data: business },
    { data: service },
    { data: existingAppointments }
  ] = await Promise.all([
    supabase.from('businesses').select('operating_hours, workstations_count').eq('id', businessId).single(),
    supabase.from('services').select('duration_minutes').eq('id', serviceId).single(),
    supabase
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .not('status', 'eq', 'cancelled')
      // Filtramos citas que se solapen con el día solicitado
      .gte('time_range', `[${date} 00:00:00+00, ${date} 23:59:59+00]`)
  ])

  if (!business || !service) return { slots: [] }

  const hours = business.operating_hours as OperatingHours
  const workstations = business.workstations_count || 1
  const duration = service.duration_minutes

  // 2. Determinar horario de apertura/cierre para el día de la semana
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const dayIndex = new Date(`${date}T00:00:00`).getDay()
  const dayKey = dayNames[dayIndex]
  const dayConfig = hours[dayKey]

  if (!dayConfig || !dayConfig.is_open) return { slots: [] }

  // 3. Generar bloques de tiempo (Intervalos de 30 min)
  const slots: string[] = []
  const startTime = new Date(`${date}T${dayConfig.open_time}:00`)
  const endTime = new Date(`${date}T${dayConfig.close_time}:00`)
  
  // Función auxiliar para parsear TSTZRANGE
  const parseRange = (rangeStr: string) => {
    const match = rangeStr.match(/\["([^"]+)","([^"]+)"\)/)
    if (!match) return null
    return { start: new Date(match[1]), end: new Date(match[2]) }
  }

  let currentSlotStart = startTime

  while (isBefore(addMinutes(currentSlotStart, duration), endTime) || isEqual(addMinutes(currentSlotStart, duration), endTime)) {
    const slotStart = currentSlotStart
    const slotEnd = addMinutes(slotStart, duration)

    // --- CÁLCULO DE LÓGICA DE COLISIÓN ---
    
    // Filtro 1: Staff Específico
    let staffCollision = false
    if (staffId && staffId !== 'any') {
      staffCollision = (existingAppointments || []).some(app => {
        if (app.barber_id !== staffId) return false
        const range = parseRange(app.time_range)
        if (!range) return false
        // Lógica de solapamiento: (start1 < end2 && start2 < end1)
        return slotStart < range.end && range.start < slotEnd
      })
    }

    // Filtro 2: Cuello de Botella Físico (Workstations)
    const concurrentAppointments = (existingAppointments || []).filter(app => {
      const range = parseRange(app.time_range)
      if (!range) return false
      return slotStart < range.end && range.start < slotEnd
    }).length

    const physicalCollision = concurrentAppointments >= workstations

    if (!staffCollision && !physicalCollision) {
      slots.push(format(slotStart, 'HH:mm'))
    }

    // Avanzar puntero en bloques de 30 min
    currentSlotStart = addMinutes(currentSlotStart, 30)
  }

  return { slots }
}

/**
 * TAREA 2: EL INYECTOR SEGURO (createAppointment)
 * Inserta la cita con formato TSTZRANGE y manejo de Race Conditions.
 */
export async function createAppointment(formData: {
  businessId: string
  staffId: string | null
  serviceId: string
  date: string
  time: string
  clientData: { name: string; phone: string }
}) {
  const supabase = await createClient()
  const { businessId, staffId, serviceId, date, time, clientData } = formData

  // 1. Validación de Identidad (Anti-IDOR)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  // 2. Obtener duración del servicio
  const { data: service } = await supabase
    .from('services')
    .select('name, duration_minutes')
    .eq('id', serviceId)
    .single()

  if (!service) return { error: 'not_found', message: 'Servicio no encontrado' }

  // 3. Calcular rango de tiempo
  const start = new Date(`${date}T${time}:00Z`) // Forzamos UTC para consistencia
  const end = addMinutes(start, service.duration_minutes)

  // 4. Formato Estricto TSTZRANGE para Postgres
  const formatDB = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss") + '+00'
  const range = `[${formatDB(start)},${formatDB(end)})`

  // 5. Inserción con detección de colisión física (Race Condition)
  const finalBarberId = (!staffId || staffId === 'any') ? null : staffId

  const { error } = await supabase
    .from('appointments')
    .insert({
      business_id: businessId,
      barber_id: finalBarberId,
      service_name: service.name,
      customer_name: clientData.name,
      customer_phone: clientData.phone,
      time_range: range,
      status: 'pending'
    } as any)

  if (error) {
    // Código 23P01: Exclusion Violation (Postgres level collision)
    if (error.code === '23P01') {
      return { 
        error: 'collision', 
        message: 'Este horario acaba de ser ocupado. Por favor selecciona otro.' 
      }
    }
    return { error: 'db_error', message: error.message }
  }

  return { success: true }
}
