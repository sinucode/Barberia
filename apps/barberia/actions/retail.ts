'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod, Sale } from '@/types/database'

// ── Tipos de entrada ──────────────────────────────────────────────────────────

export interface RetailItemInput {
  description: string
  quantity:    number
  unitPrice:   number       // INTEGER COP
  staffId?:    string | null
}

export interface CreateRetailSaleParams {
  businessId:     string
  shiftId:        string
  customerId?:    string | null   // nullable: venta anónima
  paymentMethod:  PaymentMethod
  tipAmount:      number          // INTEGER COP, default 0
  discountAmount: number          // INTEGER COP, default 0
  items:          RetailItemInput[]
}

// ── Tipos de retorno ──────────────────────────────────────────────────────────

export interface RetailSaleResult {
  success?: boolean
  saleId?:  string
  error?:   string
  message?: string
}

// ── Tipo para el listado de ventas retail recientes ───────────────────────────

export interface RetailSaleSummary extends Sale {
  items_count: number
}

/**
 * createRetailSale — Registra una venta directa de productos (sin cita).
 *
 * Delega al RPC `create_retail_sale` que ejecuta todo en una sola transacción
 * PostgreSQL: INSERT sales → INSERT sale_items → INSERT payments.
 *
 * Garantía: si cualquier paso falla, PostgreSQL revierte la transacción
 * completa. No existe riesgo de estado financiero parcial.
 */
export async function createRetailSale(
  params: CreateRetailSaleParams
): Promise<RetailSaleResult> {
  const supabase = await createClient()

  const {
    businessId,
    shiftId,
    customerId,
    paymentMethod,
    tipAmount,
    discountAmount,
    items,
  } = params

  // Validaciones en el servidor antes del RPC
  if (!paymentMethod) {
    return { error: 'validation_error', message: 'El método de pago es requerido.' }
  }
  if (items.length === 0) {
    return { error: 'validation_error', message: 'Debe haber al menos un ítem para registrar la venta.' }
  }

  // Mapear camelCase → snake_case para el JSONB del RPC
  const rpcItems = items.map((item) => ({
    description: item.description,
    quantity:    item.quantity,
    unit_price:  Math.round(item.unitPrice),  // Garantizar INTEGER
    staff_id:    item.staffId ?? null,
  }))

  const { data, error } = await supabase.rpc('create_retail_sale', {
    p_business_id:     businessId,
    p_shift_id:        shiftId,
    p_customer_id:     customerId ?? null,
    p_payment_method:  paymentMethod,
    p_tip_amount:      Math.round(tipAmount),
    p_discount_amount: Math.round(discountAmount),
    p_items:           rpcItems,
  })

  if (error) {
    console.error('[create_retail_sale RPC]', error)
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

/**
 * getRecentRetailSales — Últimas ventas retail del turno activo de un negocio.
 *
 * Filtra: appointment_id IS NULL (identifica ventas retail)
 * Ordena: created_at DESC para mostrar las más recientes primero.
 */
export async function getRecentRetailSales(
  businessId: string,
  limit = 10
): Promise<RetailSaleSummary[]> {
  const supabase = await createClient()

  // Primero obtener el turno activo
  const { data: shift } = await supabase
    .from('cash_register_shifts')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'open')
    .maybeSingle()

  if (!shift) return []

  // Ventas retail del turno activo (sin cita asociada)
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*, sale_items(id)')
    .eq('business_id', businessId)
    .eq('shift_id', shift.id)
    .is('appointment_id', null)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentRetailSales]', error)
    return []
  }

  return (sales ?? []).map((sale) => {
    // Extraer el join de sale_items (no forma parte del tipo Sale)
    const { sale_items: saleItemsJoin, ...saleData } = sale as typeof sale & { sale_items?: { id: string }[] }
    return {
      ...saleData,
      items_count: Array.isArray(saleItemsJoin) ? saleItemsJoin.length : 0,
    } as RetailSaleSummary
  })
}
