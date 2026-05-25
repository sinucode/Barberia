// lib/mercadopago/client.ts
// ══════════════════════════════════════════════════════════════════════════════
// Lazy initialization del cliente MercadoPago v3.
// Mismo patrón que lib/email/resend.ts — no instancia en módulo para
// evitar crash de build si MP_ACCESS_TOKEN no está configurado.
// ══════════════════════════════════════════════════════════════════════════════

import { MercadoPagoConfig } from 'mercadopago'

let _mpClient: MercadoPagoConfig | null = null

/**
 * Retorna el cliente MercadoPago inicializado con el access token de la
 * plataforma (MVP). En v2 se pasará el access_token por-negocio (marketplace).
 */
export function getMPClient(): MercadoPagoConfig {
  if (_mpClient) return _mpClient

  const token = process.env.MP_ACCESS_TOKEN
  if (!token) {
    throw new Error(
      '[MercadoPago] MP_ACCESS_TOKEN no está configurado. ' +
      'Agrega la variable en .env.local y en Vercel.'
    )
  }

  _mpClient = new MercadoPagoConfig({
    accessToken: token,
    options: { timeout: 5000 },
  })

  return _mpClient
}

/**
 * Retorna el cliente con el access_token de un negocio específico.
 * Usar cuando el negocio tiene su propia cuenta MP conectada (v2 marketplace).
 */
export function getMPClientForBusiness(accessToken: string): MercadoPagoConfig {
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 5000 },
  })
}
