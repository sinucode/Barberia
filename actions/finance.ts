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
      business_id:            businessId,
      opened_by:              user.id,
      opened_at:              new Date().toISOString(),
      status:                 'open',
      opening_balance:        startingCash,
      actual_closing_balance: null,
    })

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
      closed_by:              user.id,
      closed_at:              new Date().toISOString(),
      status:                 'closed',
      actual_closing_balance: actualClosingBalance,
    })
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
 * checkoutAppointment — Proceso de cobro atómico via RPC de PostgreSQL.
 *
 * Reemplaza el flujo anterior de 4 operaciones secuenciales (INSERT sales →
 * INSERT sale_items → INSERT payments → UPDATE appointments) por una única
 * llamada al RPC `checkout_appointment` que ejecuta todo en una transacción.
 *
 * Garantía: si cualquier paso falla, PostgreSQL revierte la transacción
 * completa. No existe riesgo de estado financiero parcial.
 *
 * Migración requerida: supabase/migrations/20260523_checkout_atomic_rpc.sql
 */
export async function checkoutAppointment(params: CheckoutAppointmentParams) {
  const supabase = await createClient()

  const {
    appointmentId,
    businessId,
    shiftId,
    paymentMethod,
    tipAmount,
    discountAmount,
    items,
  } = params

  // Validaciones de entrada en el servidor (antes del RPC)
  if (!paymentMethod) {
    return { error: 'validation_error', message: 'El método de pago es requerido.' }
  }
  if (items.length === 0) {
    return { error: 'validation_error', message: 'Debe haber al menos un ítem para cobrar.' }
  }

  // Mapear camelCase → snake_case para el JSONB del RPC
  const rpcItems = items.map((item) => ({
    description: item.description,
    quantity:    item.quantity,
    unit_price:  item.unitPrice,
    item_type:   item.itemType,
    staff_id:    item.staffId ?? null,
  }))

  // Una sola llamada — atomicidad garantizada por PostgreSQL
  const { data, error } = await supabase.rpc('checkout_appointment', {
    p_appointment_id:  appointmentId,
    p_business_id:     businessId,
    p_shift_id:        shiftId,
    p_payment_method:  paymentMethod,
    p_tip_amount:      tipAmount,
    p_discount_amount: discountAmount,
    p_items:           rpcItems,
  })

  if (error) {
    console.error('[checkout_appointment RPC]', error)
    return { error: 'db_error', message: error.message }
  }

  const result = data as {
    success?: boolean
    sale_id?: string
    error?:   string
    message?: string
  }

  if (result?.error) {
    return { error: result.error, message: result.message }
  }

  revalidatePath('/[slug]/dashboard', 'page')
  return { success: true, saleId: result.sale_id }
}
