/**
 * format.ts — Utilidades de formato compartidas (Xinuco)
 * Fuente única de verdad para formateo de moneda COP y otros helpers.
 */

/**
 * formatCOP — Formatea un entero COP a string legible.
 * Ejemplo: 15000 → "$ 15.000"
 */
export function formatCOP(price: number): string {
  return '$ ' + Math.round(price).toLocaleString('es-CO')
}

/**
 * formatCOPFull — Formato Intl con símbolo COP completo.
 * Ejemplo: 15000 → "COP 15.000"
 * Útil para recibos y reportes formales.
 */
export function formatCOPFull(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}
