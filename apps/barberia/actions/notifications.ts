'use server'
// actions/notifications.ts — RF18 Cron manual trigger + historial

import { createClient } from '@xinuco/supabase/server'

export interface CronTriggerResult {
  success:   boolean
  error?:    string
  processed?: number
  sent?:      number
  skipped?:   number
  failed?:    number
}

// ════════════════════════════════════════════════════════════════════════════
// triggerReminderCron
// Llama al endpoint del cron desde el servidor de Next.js usando el mismo
// CRON_SECRET que usa Vercel. Permite disparar el job manualmente desde
// el dashboard sin exponer el secreto al cliente.
// ════════════════════════════════════════════════════════════════════════════
export async function triggerReminderCron(
  businessId: string,
): Promise<CronTriggerResult> {
  const supabase = await createClient()

  // ── Verificar autenticación y pertenencia al negocio ─────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado.' }

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { business_id: string } | null
  if (!profile?.business_id || profile.business_id !== businessId) {
    return { success: false, error: 'Acceso denegado.' }
  }

  // ── Preparar la llamada interna al cron ───────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return { success: false, error: 'CRON_SECRET no está configurado en las variables de entorno.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const cronUrl = `${appUrl}/api/cron/send-reminders`

  try {
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      // Timeout de 30 s para evitar cuelgues
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const body = await response.text()
      return { success: false, error: `El cron respondió con ${response.status}: ${body}` }
    }

    const data = await response.json() as {
      ok:        boolean
      processed: number
      sent:      number
      skipped:   number
      failed:    number
    }

    return {
      success:   data.ok,
      processed: data.processed,
      sent:      data.sent,
      skipped:   data.skipped,
      failed:    data.failed,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[triggerReminderCron]', msg)
    return { success: false, error: msg }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// getNotificationLog
// Obtiene el historial de notificaciones enviadas para un negocio.
// ════════════════════════════════════════════════════════════════════════════
export async function getNotificationLog(
  businessId: string,
  limit = 50,
): Promise<{
  data: Array<{
    id:                string
    appointment_id:    string | null
    notification_type: string
    channel:           string
    recipient_email:   string | null
    status:            string
    error_message:     string | null
    created_at:        string
  }> | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autorizado.' }

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { business_id: string } | null
  if (!profile?.business_id || profile.business_id !== businessId) {
    return { data: null, error: 'Acceso denegado.' }
  }

  const { data, error } = await supabase
    .from('notification_log')
    .select('id, appointment_id, notification_type, channel, recipient_email, status, error_message, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getNotificationLog]', error)
    return { data: null, error: error.message }
  }

  return { data: data as unknown as typeof data, error: null }
}
