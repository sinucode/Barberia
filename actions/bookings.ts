'use server'

import { createClient } from '@/lib/supabase/server'
import { isValid, parseISO } from 'date-fns'

export async function createBooking(bookingData: {
  full_name: string
  phone: string
  email?: string | null
  service_id: string
  staff_id: string | null
  start_time: string
  business_id: string
}) {
  const supabase = await createClient()

  // 1. Validaciones del servidor
  if (!bookingData.phone || bookingData.phone.trim() === '') {
    return { error: 'validation_error', message: 'El teléfono es requerido.' }
  }

  const parsedStartTime = parseISO(bookingData.start_time)
  if (!isValid(parsedStartTime)) {
    return { error: 'validation_error', message: 'La fecha/hora de inicio no es válida.' }
  }

  const { full_name, phone, email, service_id, staff_id, start_time, business_id } = bookingData

  // 2. Upsert del Cliente (Paso A y B)
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .upsert(
      {
        business_id,
        phone,
        full_name,
        email: email || null,
      },
      { onConflict: 'business_id,phone' }
    )
    .select('id')
    .single()

  if (customerError || !customer) {
    return { error: 'db_error', message: `Error en registro de cliente: ${customerError?.message || 'ID no retornado'}` }
  }

  // 3. Inserción de Cita (Paso C)
  // Requerimos que la base de datos tenga correctamente el esquema para start_time y customer_id
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      business_id,
      customer_id: customer.id,
      service_id,
      staff_id: staff_id === 'any' ? null : staff_id,
      start_time,
      status: 'scheduled' as const,
      notes: null,
    })
    .select('id')
    .single()

  if (appointmentError) {
    return { error: 'db_error', message: `Error al crear la cita: ${appointmentError.message}` }
  }

  return { success: true, appointment_id: appointment.id, customer_id: customer.id }
}
