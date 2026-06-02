'use server'

import { createClient } from '@xinuco/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LoyaltyLedger, Customer } from '@xinuco/types'

// ── Tipos de resultado ────────────────────────────────────────────────────────

interface ActionResult {
  success?: boolean
  error?:   string
}

export interface LoyaltyBalanceResult {
  total_points:     number
  points_value_cop: number
  expires_soon:     number
}

export interface EarnPointsResult {
  points_earned:        number
  total_points_balance: number
}

export interface RedeemPointsResult {
  success:             boolean
  discount_amount_cop: number
  remaining_balance:   number
  error?:              string
}

export interface LoyaltySettings {
  loyalty_point_value_cop: number
  loyalty_expiry_months:   number
}

export interface LoyaltyHistoryEntry extends LoyaltyLedger {
  customer: Pick<Customer, 'id' | 'full_name' | 'phone'> | null
}

// ════════════════════════════════════════════════════════════════════════════
// getClientLoyaltyBalance
// Obtiene el saldo de puntos activos de un cliente via RPC.
// ════════════════════════════════════════════════════════════════════════════

export async function getClientLoyaltyBalance(
  businessId: string,
  clientId:   string
): Promise<LoyaltyBalanceResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_client_loyalty_balance', {
    p_business_id: businessId,
    p_client_id:   clientId,
  })

  if (error) throw error

  const result = data as LoyaltyBalanceResult & { error?: string }
  if (result?.error) throw new Error(result.error)

  return {
    total_points:     result.total_points     ?? 0,
    points_value_cop: result.points_value_cop ?? 0,
    expires_soon:     result.expires_soon     ?? 0,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// earnPoints
// Llama el RPC earn_loyalty_points tras un cobro exitoso.
// Devuelve los puntos ganados y el saldo actualizado.
// ════════════════════════════════════════════════════════════════════════════

export async function earnPoints(
  businessId:           string,
  clientId:             string,
  saleAmount:           number,
  transactionReference: string
): Promise<EarnPointsResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('earn_loyalty_points', {
    p_business_id:           businessId,
    p_client_id:             clientId,
    p_sale_amount:           saleAmount,
    p_transaction_reference: transactionReference,
  })

  if (error) throw error

  const result = data as EarnPointsResult & { error?: string }
  if (result?.error) throw new Error(result.error)

  revalidatePath('/[slug]/dashboard/loyalty', 'page')
  return {
    points_earned:        result.points_earned        ?? 0,
    total_points_balance: result.total_points_balance ?? 0,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// redeemPoints
// Canjea puntos de un cliente como descuento en COP.
// ════════════════════════════════════════════════════════════════════════════

export async function redeemPoints(
  businessId:           string,
  clientId:             string,
  pointsToRedeem:       number,
  transactionReference: string
): Promise<RedeemPointsResult> {
  const supabase = await createClient()

  if (pointsToRedeem <= 0) {
    return { success: false, discount_amount_cop: 0, remaining_balance: 0, error: 'points_must_be_positive' }
  }

  const { data, error } = await supabase.rpc('redeem_loyalty_points', {
    p_business_id:           businessId,
    p_client_id:             clientId,
    p_points_to_redeem:      pointsToRedeem,
    p_transaction_reference: transactionReference,
  })

  if (error) return { success: false, discount_amount_cop: 0, remaining_balance: 0, error: error.message }

  const result = data as RedeemPointsResult
  if (!result.success) {
    return { success: false, discount_amount_cop: 0, remaining_balance: 0, error: result.error }
  }

  revalidatePath('/[slug]/dashboard/loyalty', 'page')
  return result
}

// ════════════════════════════════════════════════════════════════════════════
// getLoyaltyHistory
// Retorna el historial de movimientos de puntos con datos del cliente.
// Si clientId es nulo, retorna todos los movimientos del negocio.
// ════════════════════════════════════════════════════════════════════════════

export async function getLoyaltyHistory(
  businessId: string,
  clientId?:  string
): Promise<LoyaltyHistoryEntry[]> {
  const supabase = await createClient()

  let query = supabase
    .from('loyalty_ledgers')
    .select(`
      *,
      customer:client_id ( id, full_name, phone )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as LoyaltyHistoryEntry[]
}

// ════════════════════════════════════════════════════════════════════════════
// getLoyaltySettings
// Lee la configuración del programa de lealtad del negocio.
// ════════════════════════════════════════════════════════════════════════════

export async function getLoyaltySettings(
  businessId: string
): Promise<LoyaltySettings> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('loyalty_point_value_cop, loyalty_expiry_months')
    .eq('id', businessId)
    .single()

  if (error) throw error

  return {
    loyalty_point_value_cop: data.loyalty_point_value_cop ?? 1000,
    loyalty_expiry_months:   data.loyalty_expiry_months   ?? 12,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// updateLoyaltySettings
// Actualiza la configuración del programa de lealtad.
// ════════════════════════════════════════════════════════════════════════════

export async function updateLoyaltySettings(
  businessId: string,
  data: Partial<LoyaltySettings>
): Promise<ActionResult> {
  const supabase = await createClient()

  if (
    data.loyalty_point_value_cop !== undefined &&
    data.loyalty_point_value_cop <= 0
  ) {
    return { error: 'El valor del punto debe ser mayor a 0 COP.' }
  }

  if (
    data.loyalty_expiry_months !== undefined &&
    (data.loyalty_expiry_months < 1 || data.loyalty_expiry_months > 60)
  ) {
    return { error: 'Los meses de vencimiento deben estar entre 1 y 60.' }
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      ...(data.loyalty_point_value_cop !== undefined && {
        loyalty_point_value_cop: data.loyalty_point_value_cop,
      }),
      ...(data.loyalty_expiry_months !== undefined && {
        loyalty_expiry_months: data.loyalty_expiry_months,
      }),
    })
    .eq('id', businessId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/loyalty', 'page')
  return { success: true }
}
