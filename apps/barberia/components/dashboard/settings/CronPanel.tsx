'use client'
// components/dashboard/settings/CronPanel.tsx — RF18
// Panel interactivo para ver el estado del cron y dispararlo manualmente.

import { useState, useTransition } from 'react'
import { triggerReminderCron, type CronTriggerResult } from '@/actions/notifications'
import { Play, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface LogEntry {
  id:                string
  appointment_id:    string | null
  notification_type: string
  channel:           string
  recipient_email:   string | null
  status:            string
  error_message:     string | null
  created_at:        string
}

interface Props {
  businessId:   string
  cronSecret:   boolean   // solo indica si está configurado (sin exponer el valor)
  initialLog:   LogEntry[]
}

const TYPE_LABELS: Record<string, string> = {
  confirmation: 'Confirmación',
  reminder:     'Recordatorio',
  cancellation: 'Cancelación',
}

export function CronPanel({ businessId, cronSecret, initialLog }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult]           = useState<CronTriggerResult | null>(null)
  const [log, setLog]                 = useState<LogEntry[]>(initialLog)

  function handleTrigger() {
    setResult(null)
    startTransition(async () => {
      const res = await triggerReminderCron(businessId)
      setResult(res)
      // Refrescar log si el trigger fue exitoso
      if (res.success) {
        // Pequeño delay para dar tiempo a que se inserten los logs en la BD
        await new Promise(r => setTimeout(r, 1200))
        const { getNotificationLog } = await import('@/actions/notifications')
        const fresh = await getNotificationLog(businessId, 50)
        if (fresh.data) setLog(fresh.data as LogEntry[])
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Tarjeta del Cron Job ────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ background: '#111', borderColor: '#222' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-xinuco-text uppercase tracking-widest">
              Cron Job — Recordatorios 24 h
            </h3>
            <p className="text-xs text-xinuco-muted mt-1">
              Se ejecuta automáticamente <strong>cada hora</strong> en Vercel.
              Busca citas en la ventana +22 h a +26 h y envía recordatorios.
            </p>
          </div>

          {/* Estado del secreto */}
          <div className="shrink-0 ml-4">
            {cronSecret ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                <CheckCircle2 size={12} /> CRON_SECRET ✓
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <XCircle size={12} /> Sin CRON_SECRET
              </span>
            )}
          </div>
        </div>

        {/* Schedule info */}
        <div className="flex items-center gap-2 text-xs text-xinuco-muted">
          <Clock size={13} />
          <span>Schedule: <code className="text-xinuco-primary">0 * * * *</code> (cada hora, minuto 0)</span>
        </div>

        {/* Botón de disparo manual */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTrigger}
            disabled={isPending || !cronSecret}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:    'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              border:        '1px solid color-mix(in srgb, var(--primary-color) 30%, transparent)',
              color:         'var(--primary-color)',
            }}
            title={!cronSecret ? 'CRON_SECRET no está configurado' : 'Ejecutar ahora'}
          >
            {isPending
              ? <RefreshCw size={14} className="animate-spin" />
              : <Play      size={14} />
            }
            {isPending ? 'Ejecutando…' : 'Ejecutar ahora'}
          </button>

          {!cronSecret && (
            <p className="text-xs" style={{ color: '#ef4444' }}>
              Agrega <code>CRON_SECRET</code> a las variables de entorno para habilitar.
            </p>
          )}
        </div>

        {/* Resultado del último disparo */}
        {result && (
          <div
            className="rounded-lg p-4 text-sm"
            style={{
              background:   result.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border:       `1px solid ${result.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color:        result.success ? '#22c55e' : '#ef4444',
            }}
          >
            {result.success ? (
              <div className="space-y-1">
                <p className="font-semibold">✓ Ejecución completada</p>
                <div className="flex gap-4 text-xs mt-2" style={{ color: '#aaa' }}>
                  <span>Procesadas: <strong style={{ color: '#F4F4F4' }}>{result.processed}</strong></span>
                  <span>Enviadas: <strong style={{ color: '#22c55e' }}>{result.sent}</strong></span>
                  <span>Omitidas: <strong style={{ color: '#C5A059' }}>{result.skipped}</strong></span>
                  {(result.failed ?? 0) > 0 && (
                    <span>Fallidas: <strong style={{ color: '#ef4444' }}>{result.failed}</strong></span>
                  )}
                </div>
              </div>
            ) : (
              <p>✕ Error: {result.error}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Historial de Notificaciones ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-xinuco-text uppercase tracking-widest mb-3">
          Historial Reciente
        </h3>

        {log.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-xinuco-muted text-sm"
            style={{ background: '#111', borderColor: '#222' }}>
            No hay notificaciones registradas aún.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#222' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#0d0d0d', borderBottom: '1px solid #222' }}>
                  {['Tipo', 'Canal', 'Destinatario', 'Estado', 'Fecha'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider"
                      style={{ color: '#555' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((entry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: i < log.length - 1 ? '1px solid #1a1a1a' : 'none',
                      background:   i % 2 === 0 ? '#111' : 'transparent',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: '#C5A059' }}>
                      {TYPE_LABELS[entry.notification_type] ?? entry.notification_type}
                    </td>
                    <td className="px-4 py-3 uppercase" style={{ color: '#666' }}>
                      {entry.channel}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#aaa' }}>
                      {entry.recipient_email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#22c55e' }}>
                          <CheckCircle2 size={11} /> Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#ef4444' }}>
                          <XCircle size={11} /> Fallido
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#555' }}>
                      {new Date(entry.created_at).toLocaleString('es-CO', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
