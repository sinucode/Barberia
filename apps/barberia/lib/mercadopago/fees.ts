// lib/mercadopago/fees.ts
// ══════════════════════════════════════════════════════════════════════════════
// Calculadora de fees MercadoPago Colombia.
//
// REGLAS FINANCIERAS:
//  - Todos los montos son INTEGER (COP centavos enteros)
//  - Fees en basis points (1 bp = 0.01%) → sin floats en el camino crítico
//  - ROUND() con Math.round — no truncar, no floor
//  - IVA del 19% se aplica SOBRE el fee de MP (no sobre el monto total)
//  - Esta función se llama SOLO desde Server Actions — nunca desde el cliente
//
// TARIFAS COLOMBIA 2026 (fuente: mercadopago.com.co/tariffs, 2026-05-24)
// Actualizar en mp_fee_config (tabla DB) cuando MP cambie tarifas.
// ══════════════════════════════════════════════════════════════════════════════

import type { MPFeeBreakdown, MPFeeConfig, MPPaymentMethod } from './types'

// ── Tarifas hardcoded de fallback (se sobreescriben con la tabla mp_fee_config)
const DEFAULT_FEE_CONFIGS: Record<MPPaymentMethod, MPFeeConfig> = {
  credit_card: {
    payment_method: 'credit_card',
    fee_rate_bp:  349,   // 3.49%
    fixed_fee_cop: 0,
    iva_rate_bp:  1900,  // 19.00%
  },
  debit_card: {
    payment_method: 'debit_card',
    fee_rate_bp:  249,   // 2.49%
    fixed_fee_cop: 0,
    iva_rate_bp:  1900,
  },
  pse: {
    payment_method: 'pse',
    fee_rate_bp:  175,   // 1.75%
    fixed_fee_cop: 0,
    iva_rate_bp:  1900,
  },
  nequi: {
    payment_method: 'nequi',
    fee_rate_bp:  229,   // 2.29%
    fixed_fee_cop: 0,
    iva_rate_bp:  1900,
  },
  daviplata: {
    payment_method: 'daviplata',
    fee_rate_bp:  229,   // 2.29%
    fixed_fee_cop: 0,
    iva_rate_bp:  1900,
  },
  qr: {
    payment_method: 'qr',
    fee_rate_bp:  229,   // 2.29%
    fixed_fee_cop: 0,
    iva_rate_bp:  1900,
  },
  efecty: {
    payment_method: 'efecty',
    fee_rate_bp:  399,   // 3.99%
    fixed_fee_cop: 900,  // cargo fijo $900 COP
    iva_rate_bp:  1900,
  },
  subscription: {
    payment_method: 'subscription',
    fee_rate_bp:  499,   // 4.99%
    fixed_fee_cop: 0,
    iva_rate_bp:  1900,
  },
}

/**
 * Calcula el desglose de fee de MercadoPago para un monto dado.
 *
 * @param grossAmountCop  Monto que paga el cliente (COP, INTEGER)
 * @param method          Método de pago
 * @param configOverride  Opcional: config de la tabla mp_fee_config
 *
 * @example
 * calculateMPFee(50000, 'credit_card')
 * // → { gross: 50000, fee: 2079, iva: 332, net: 47921, rate_bp: 416 }
 */
export function calculateMPFee(
  grossAmountCop: number,
  method: MPPaymentMethod,
  configOverride?: MPFeeConfig,
): MPFeeBreakdown {
  if (!Number.isInteger(grossAmountCop) || grossAmountCop <= 0) {
    throw new Error(
      `[MP fees] grossAmountCop debe ser un entero positivo. Recibido: ${grossAmountCop}`
    )
  }

  const cfg = configOverride ?? DEFAULT_FEE_CONFIGS[method]

  // ── 1. Fee base = gross × rate_bp / 10_000  (redondeado al COP más cercano)
  const baseFee = Math.round((grossAmountCop * cfg.fee_rate_bp) / 10_000)

  // ── 2. Fee total antes de IVA = base + cargo fijo
  const feeBeforeIva = baseFee + cfg.fixed_fee_cop

  // ── 3. IVA sobre el fee (no sobre el monto total)
  const ivaAmount = Math.round((feeBeforeIva * cfg.iva_rate_bp) / 10_000)

  // ── 4. Fee total (lo que descuenta MP)
  const totalFee = feeBeforeIva + ivaAmount

  // ── 5. Neto que llega al negocio
  const netAmount = grossAmountCop - totalFee

  // ── 6. Tasa efectiva en bp (para mostrar en UI)
  const effectiveRateBp = Math.round((totalFee * 10_000) / grossAmountCop)

  return {
    gross_amount_cop:  grossAmountCop,
    fee_amount_cop:    totalFee,
    iva_amount_cop:    ivaAmount,
    net_amount_cop:    netAmount,
    effective_rate_bp: effectiveRateBp,
    payment_method:    method,
  }
}

/**
 * Formatea un MPFeeBreakdown en texto legible para UI.
 * Se puede usar en tooltips o en la confirmación de pago.
 *
 * @example
 * formatFeeBreakdown(calculateMPFee(50000, 'credit_card'))
 * // "Cliente paga $50,000 → Te llega $47,921 (fee MP: $2,079 inc. IVA)"
 */
export function formatFeeBreakdown(breakdown: MPFeeBreakdown): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
      .format(n)

  return (
    `Cliente paga ${fmt(breakdown.gross_amount_cop)} → ` +
    `Te llega ${fmt(breakdown.net_amount_cop)} ` +
    `(fee MP: ${fmt(breakdown.fee_amount_cop)} inc. IVA)`
  )
}

/**
 * Retorna el label en español para un método de pago MP.
 */
export function getMPMethodLabel(method: MPPaymentMethod): string {
  const labels: Record<MPPaymentMethod, string> = {
    credit_card:  'Tarjeta de crédito',
    debit_card:   'Tarjeta débito',
    pse:          'PSE',
    nequi:        'Nequi',
    daviplata:    'Daviplata',
    qr:           'QR presencial',
    efecty:       'Efectivo (Efecty/Baloto)',
    subscription: 'Suscripción recurrente',
  }
  return labels[method] ?? method
}

/**
 * Retorna todos los métodos disponibles con su desglose de fee
 * para un monto dado. Útil para el selector de método de pago en UI.
 */
export function getAllFeeOptions(grossAmountCop: number): MPFeeBreakdown[] {
  const methods: MPPaymentMethod[] = [
    'pse', 'nequi', 'daviplata', 'qr',
    'debit_card', 'credit_card', 'efecty',
  ]
  return methods.map((m) => calculateMPFee(grossAmountCop, m))
}

/** Expone los configs por defecto para seed en DB */
export { DEFAULT_FEE_CONFIGS }
