'use server'

import { createClient } from '@/lib/supabase/server'
import { addMinutes, format, parseISO, isBefore, isAfter, isEqual } from 'date-fns'

// Instalaremos date-fns si no está, o usaremos la lógica base. 
// Asumiendo que podemos usar métodos base de JS si date-fns no está.
// Para no romper si no está instalado, implemento la lógica con Date nativo o asumo que date-fns está disponible.
// El prompt explícitamente importa de 'date-fns'. 

/**
 * TAREA 1: EL MOTOR DE DISPONIBILIDAD
 * Calcula slots de 30 min basados en la duración del servicio y citas existentes.
 */
export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: string, // Formato YYYY-MM-DD
  staffId?: string | null
) {
  const supabase = await createClient()

  // 1. Obtener duración del servicio
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single()

  // 2. Consultar citas existentes para ese día (usando time_range)
  let query = supabase
    .from('appointments')
    .select('time_range')
    .eq('business_id', businessId)
    // Buscamos cualquier cita que empiece en este día. 
    // Como Supabase TSTZRANGE filter no siempre es directo desde TS, usaremos un like o traeremos todo el día.
    .like('time_range', `%${date}%`)

  if (staffId && staffId !== 'any') {
    query = query.eq('barber_id', staffId)
  }
  
  const { data: existingAppointments } = await query

  // 3. Generar slots (Jornada 08:00 - 20:00 simulada)
  const slots: string[] = []
  
  let currentPos = new Date(`${date}T08:00:00`)
  const endTime = new Date(`${date}T20:00:00`)
  const duration = service?.duration_minutes || 30

  // Función auxiliar para parsear el TSTZRANGE: '["2025-01-01 10:00:00+00","2025-01-01 11:00:00+00")'
  const parseRange = (rangeStr: string) => {
    // Basic extraction of dates
    const match = rangeStr.match(/\["([^"]+)","([^"]+)"\)/)
    if (match) {
      return { start: new Date(match[1]), end: new Date(match[2]) }
    }
    // Fallback if format is slightly different
    const parts = rangeStr.split(',')
    if (parts.length === 2) {
      const s = parts[0].replace(/\[|"/g, '').trim()
      const e = parts[1].replace(/\)|"/g, '').trim()
      return { start: new Date(s), end: new Date(e) }
    }
    return null
  }

  while (currentPos < endTime) {
    const slotStart = new Date(currentPos)
    const slotEnd = new Date(currentPos.getTime() + duration * 60000)

    // Verificar si el slot choca con alguna cita
    const isOccupied = existingAppointments?.some((app) => {
      const range = parseRange(app.time_range)
      if (!range) return false
      
      // Lógica de solapamiento de intervalos [start1, end1) choca con [start2, end2) si:
      // start1 < end2 AND end1 > start2
      return slotStart < range.end && slotEnd > range.start
    })

    if (!isOccupied) {
      slots.push(
        slotStart.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
      )
    }
    
    // Incremento de bloque de 30 mins
    currentPos = new Date(currentPos.getTime() + 30 * 60000)
  }

  return { slots }
}

/**
 * TAREA 2: EL INYECTOR SEGURO
 * Inserta la cita calculando el rango y manejando colisiones.
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

  // --- TAREA 1: VALIDACIÓN DE SEGURIDAD (Anti-IDOR) ---
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'unauthorized', message: 'No tienes permisos para agendar en este negocio.' }
  }

  const isSuperAdmin = user.app_metadata?.role === 'super_admin'

  if (!isSuperAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.business_id !== businessId) {
      return { error: 'unauthorized', message: 'No tienes permisos para agendar en este negocio.' }
    }
  }

  // 1. Obtener servicio (duración y nombre)
  const { data: service } = await supabase
    .from('services')
    .select('name, duration_minutes')
    .eq('id', serviceId)
    .single()

  if (!service) return { error: 'Servicio no encontrado' }

  // 2. Construir fechas
  const start = new Date(`${date}T${time}:00`)
  const end = new Date(start.getTime() + service.duration_minutes * 60000)

  // 3. Formatear para TSTZRANGE de Postgres: [YYYY-MM-DD HH:mm:ss, YYYY-MM-DD HH:mm:ss)
  // Usamos el formato ISO sin la 'T' o '.000Z' para que Postgres lo entienda
  const formatDB = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19) + '+00'
  const range = `[${formatDB(start)},${formatDB(end)})`

  // 4. Intento de inserción mapeando a los tipos correctos de database.ts
  // --- TAREA 2: Lógica de Empleado "Cualquiera" ---
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
    // Código 23P01: Exclusion Violation (Solapamiento detectado por Postgres)
    if (error.code === '23P01') {
      return { error: 'collision', message: 'Este horario se acaba de ocupar.' }
    }
    return { error: 'db_error', message: error.message }
  }

  return { success: true }
}
