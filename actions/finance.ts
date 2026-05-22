'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod, CashRegisterShift, Sale, SaleItem, Payment } from '@/types/database'

/**
 * getActiveShift — Obtiene el turno de caja abierto actualmente para un negocio.
 */
export async function getActiveShift(businessId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_register_shifts')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'open')
    .maybeSingle()

  if (error) {
    console.error('Error fetching active shift:', error)
    return null
  }
  return data as CashRegisterShift | null
}

/**
 * getShiftSummary — Calcula consolidados financieros de ventas y efectivo en el turno.
 */
export async function getShiftSummary(shiftId: string) {
  const supabase = await createClient()

  // Sumar ventas asociadas a este turno
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('total_amount')
    .eq('shift_id', shiftId)

  if (salesError) {
    console.error('Error fetching sales for summary:', salesError)
  }

  // Sumar pagos en efectivo del turno
  const { data: cashPayments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('shift_id', shiftId)
    .eq('payment_method', 'cash')

  if (paymentsError) {
    console.error('Error fetching cash payments for summary:', paymentsError)
  }

  const totalSales = (sales ?? []).reduce((sum, s) => sum + (s.total_amount ?? 0), 0)
  const totalCashCollected = (cashPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return {
    totalSales,
    totalCashCollected,
  }
}

/**
 * getActiveShiftDetails — Retorna el turno activo junto con su resumen financiero.
 */
export async function getActiveShiftDetails(businessId: string) {
  const shift = await getActiveShift(businessId)
  if (!shift) return null

  const summary = await getShiftSummary(shift.id)

  return {
    shift,
    totalSales: summary.totalSales,
    expectedCashBalance: shift.opening_balance + summary.totalCashCollected,
  }
}

/**
 * openShift — Abre un nuevo turno de caja registrando la base inicial.
 */
export async function openShift(businessId: string, startingCash: number) {
  const supabase = await createClient()
  
  // Seguridad: obtener usuario autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado. Por favor inicia sesión.' }

  // Validar si ya hay un turno abierto
  const existing = await getActiveShift(businessId)
  if (existing) {
    return { error: 'Ya existe un turno de caja abierto para este negocio.' }
  }

  const { error } = await supabase
    .from('cash_register_shifts')
    .insert({
      business_id: businessId,
      opened_by: user.id,
      opened_at: new Date().toISOString(),
      status: 'open',
      opening_balance: startingCash,
      actual_closing_balance: null,
    } as any)

  if (error) {
    console.error('Error opening shift:', error)
    return { error: `Error de base de datos: ${error.message}` }
  }

  revalidatePath('/[slug]/dashboard', 'page')
  return { success: true }
}

/**
 * closeShift — Cierra el turno activo validando integridad operativa (citas en curso).
 */
export async function closeShift(businessId: string, shiftId: string, actualClosingBalance: number) {
  const supabase = await createClient()
  
  // Seguridad
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado. Por favor inicia sesión.' }

  // 1. Integridad: Verificar si hay citas en estado 'in_progress'
  const { count, error: countError } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'in_progress')

  if (countError) {
    console.error('Error counting in_progress appointments:', countError)
  } else if (count && count > 0) {
    return {
      error: 'integrity_error',
      message: `No es posible cerrar la caja. Hay ${count} cita(s) En Curso actualmente. Por favor, termínalas o cancélalas primero.`,
    }
  }

  // 2. Cerrar turno en BD
  const { error } = await supabase
    .from('cash_register_shifts')
    .update({
      closed_by: user.id,
      closed_at: new Date().toISOString(),
      status: 'closed',
      actual_closing_balance: actualClosingBalance,
    } as any)
    .eq('id', shiftId)

  if (error) {
    console.error('Error closing shift:', error)
    return { error: `Error de base de datos: ${error.message}` }
  }

  revalidatePath('/[slug]/dashboard', 'page')
  return { success: true }
}

export interface CheckoutItemInput {
  description: string
  quantity: number
  unitPrice: number
  itemType: 'service' | 'product'
  staffId?: string | null
}

export interface CheckoutAppointmentParams {
  appointmentId: string
  businessId: string
  shiftId: string
  paymentMethod: PaymentMethod
  receivedAmount: number
  tipAmount: number
  discountAmount: number
  items: CheckoutItemInput[]
}

/**
 * checkoutAppointment — Proceso transaccional para cobro y facturación de citas.
 */
export async function checkoutAppointment(params: CheckoutAppointmentParams) {
  const supabase = await createClient()

  const {
    appointmentId,
    businessId,
    shiftId,
    paymentMethod,
    receivedAmount,
    tipAmount,
    discountAmount,
    items,
  } = params

  // 1. Validaciones financieras estrictas
  if (!paymentMethod) {
    return { error: 'validation_error', message: 'El método de pago es requerido.' }
  }

  if (items.length === 0) {
    return { error: 'validation_error', message: 'Debe haber al menos un ítem para cobrar.' }
  }

  // 2. Consultar cita origen
  const { data: appointment, error: apptError } = await supabase
    .from('appointments')
    .select('customer_id, staff_id')
    .eq('id', appointmentId)
    .single()

  if (apptError || !appointment) {
    console.error('Error fetching appointment for checkout:', apptError)
    return { error: 'not_found', message: 'La cita especificada no fue encontrada.' }
  }

  // 3. Calcular totales
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const total = subtotal - discountAmount + tipAmount

  if (total < 0) {
    return { error: 'validation_error', message: 'El total a pagar no puede ser menor a cero.' }
  }

  // 4. Registrar la Venta (Sale)
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      business_id: businessId,
      shift_id: shiftId,
      appointment_id: appointmentId,
      customer_id: appointment.customer_id,
      subtotal,
      discount_amount: discountAmount,
      tip_amount: tipAmount,
      total_amount: total,
      status: 'paid',
    } as any)
    .select('id')
    .single()

  if (saleError || !sale) {
    console.error('Error inserting sale:', saleError)
    return { error: 'db_error', message: `Error al registrar la venta: ${saleError?.message || 'ID no retornado'}` }
  }

  // 5. Registrar los Ítems de la Venta (SaleItems)
  const saleItemsPayload = items.map((item) => ({
    business_id: businessId,
    sale_id: sale.id,
    staff_id: item.staffId || appointment.staff_id || null,
    item_type: item.itemType,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
  }))

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItemsPayload as any)

  if (itemsError) {
    console.error('Error inserting sale items:', itemsError)
    // Nota: en producción idealmente revertiríamos la venta o usaríamos RPC/transacción real.
    return { error: 'db_error', message: `Error al registrar los ítems de venta: ${itemsError.message}` }
  }

  // 6. Registrar el Pago (Payment)
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      business_id: businessId,
      sale_id: sale.id,
      shift_id: shiftId,
      amount: total,
      payment_method: paymentMethod,
    } as any)

  if (paymentError) {
    console.error('Error inserting payment:', paymentError)
    return { error: 'db_error', message: `Error al registrar el pago: ${paymentError.message}` }
  }

  // 7. Completar la cita (Actualizar status) — SOLO si los pasos anteriores fueron exitosos
  const { error: apptUpdateError } = await supabase
    .from('appointments')
    .update({ status: 'completed' } as any)
    .eq('id', appointmentId)

  if (apptUpdateError) {
    console.error('Error updating appointment to completed:', apptUpdateError)
    return { error: 'db_error', message: `El pago se registró pero hubo un problema al completar la cita: ${apptUpdateError.message}` }
  }

  revalidatePath('/[slug]/dashboard', 'page')
  return { success: true, saleId: sale.id }
}
