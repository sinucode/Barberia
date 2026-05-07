/**
 * parseTimeRange — Convierte un TSTZRANGE de Supabase a objetos Date.
 *
 * Supabase retorna el rango como string:
 *   '["2025-01-01 10:00:00+00","2025-01-01 11:00:00+00")'
 *
 * @returns { start: Date, end: Date } | null si el formato es inválido
 */
export function parseTimeRange(range: string): { start: Date; end: Date } | null {
  try {
    const cleaned = range.replace(/[\[\]()""]/g, '')
    const [startStr, endStr] = cleaned.split(',')
    const start = new Date(startStr.trim())
    const end   = new Date(endStr.trim())

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

    return { start, end }
  } catch {
    return null
  }
}

/**
 * formatTime — Formatea una Date a "HH:mm" en hora local
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-MX', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * formatDate — Formatea una Date a texto legible en español
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })
}

/**
 * getDurationMinutes — Calcula los minutos entre start y end de un time_range
 */
export function getDurationMinutes(range: string): number | null {
  const parsed = parseTimeRange(range)
  if (!parsed) return null
  return Math.round((parsed.end.getTime() - parsed.start.getTime()) / 60_000)
}
