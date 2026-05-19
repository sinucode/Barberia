'use server'

import { createClient } from '@/lib/supabase/server'
import { addMinutes, format, parseISO, isBefore, isAfter, getDay } from 'date-fns'

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

// ════════════════════════════════════════════════════════════════════════════════
// TAREA 2: EL INYECTOR SEGURO (createBooking)
// Inserta la cita con formato TSTZRANGE y manejo de Race Conditions.
// ════════════════════════════════════════════════════════════════════════════════

export async function createBooking(
  bookingData: {
    businessId: string
    staffId: string | null
    serviceId: string
    date: string
    time: string
  },
  customerData: {
    full_name: string
    phone: string
    email?: string | null
  }
) {
  const supabase = await createClient()
  const { businessId, staffId, serviceId, date, time } = bookingData

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

  // 5. Lógica CRM (SELECT + INSERT transaccional)
  // Paso A: Buscar cliente existente por teléfono
  const { data: existingCustomer, error: searchError } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', customerData.phone)
    .maybeSingle()

  if (searchError) {
    return { error: 'db_error', message: `Error buscando cliente: ${searchError.message}` }
  }

  let customerId = existingCustomer?.id

  // Paso B: Si no existe, crear el cliente
  if (!customerId) {
    const { data: newCustomer, error: insertCustomerError } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        full_name: customerData.full_name,
        phone: customerData.phone,
        email: customerData.email === undefined ? null : customerData.email,
      } as any)
      .select('id')
      .single()

    if (insertCustomerError || !newCustomer) {
      return { error: 'db_error', message: `Error registrando nuevo cliente: ${insertCustomerError?.message || 'ID no retornado'}` }
    }
    customerId = newCustomer.id
  }

  // 6. Inserción de Cita con llaves foráneas y detección de colisión física (Race Condition)
  const finalStaffId = (!staffId || staffId === 'any') ? null : staffId

  const { error } = await supabase
    .from('appointments')
    .insert({
      business_id: businessId,
      staff_id: finalStaffId,
      service_id: serviceId,
      customer_id: customerId,
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
