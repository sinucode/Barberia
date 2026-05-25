// lib/mercadopago/types.ts
// ══════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript estrictos para MercadoPago — sin `as any`.
// COP siempre como INTEGER. Fee en basis points (1bp = 0.01%).
// ══════════════════════════════════════════════════════════════════════════════

// ── Métodos de pago soportados ────────────────────────────────────────────────
export type MPPaymentMethod =
  | 'credit_card'     // Tarjeta crédito
  | 'debit_card'      // Tarjeta débito
  | 'pse'             // PSE (débito bancario en línea)
  | 'nequi'           // Nequi
  | 'daviplata'       // Daviplata
  | 'qr'              // QR presencial
  | 'efecty'          // Efecty / Baloto (efectivo)
  | 'subscription'    // Suscripción recurrente SaaS

// ── Estado de un pago en MP ───────────────────────────────────────────────────
export type MPPaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'

// ── Desglose de fee ───────────────────────────────────────────────────────────
export interface MPFeeBreakdown {
  /** Monto que paga el cliente (COP entero) */
  gross_amount_cop: number
  /** Fee MercadoPago en COP (redondeado) */
  fee_amount_cop: number
  /** IVA sobre el fee (incluido en fee_amount_cop) */
  iva_amount_cop: number
  /** Monto neto que recibe el negocio (COP entero) */
  net_amount_cop: number
  /** Tasa efectiva en basis points (fee_amount / gross × 10000) */
  effective_rate_bp: number
  /** Método de pago usado para el cálculo */
  payment_method: MPPaymentMethod
}

// ── Configuración de fee por método ──────────────────────────────────────────
export interface MPFeeConfig {
  payment_method: MPPaymentMethod
  fee_rate_bp: number    // tasa base en bp (ej: 349 = 3.49%)
  fixed_fee_cop: number  // cargo fijo en COP (ej: 900)
  iva_rate_bp: number    // IVA en bp (ej: 1900 = 19.00%)
}

// ── Resultado de crear una preferencia ───────────────────────────────────────
export interface MPPreferenceResult {
  preference_id: string
  init_point: string       // URL para redirect (producción)
  sandbox_init_point: string // URL para sandbox
}

// ── Payload del webhook de MP ─────────────────────────────────────────────────
export interface MPWebhookPayload {
  id: number
  live_mode: boolean
  type: 'payment' | 'plan' | 'subscription' | 'invoice' | string
  date_created: string
  user_id: string
  api_version: string
  action: 'payment.created' | 'payment.updated' | string
  data: {
    id: string
  }
}

// ── Contexto para crear una preferencia de pago ───────────────────────────────
export interface MPCreatePreferenceParams {
  businessId: string
  appointmentId?: string
  saleId?: string
  items: Array<{
    title: string
    quantity: number
    unit_price_cop: number  // INTEGER
    description?: string
  }>
  payerEmail?: string
  externalReference: string  // para reconciliación: `${businessId}:${saleId}`
  backUrls: {
    success: string
    failure: string
    pending: string
  }
}
