'use client'
// ============================================================
// components/super-admin/TrialManager.tsx
// UI para gestionar el periodo de prueba de un negocio.
// Permite activar un trial por fechas o por días, ver el
// countdown actual y desactivarlo manualmente.
// ============================================================

import { useState, useTransition } from 'react'
import { Calendar, Clock, Sparkles, X, Check, AlertCircle, Zap } from 'lucide-react'
import { setBusinessTrial, clearBusinessTrial } from '@/actions/super-admin'

// ── Props ─────────────────────────────────────────────────────────────────────

interface TrialManagerProps {
  businessId:     string
  businessName:   string
  trialExpiresAt: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTrialActive(trialExpiresAt: string | null): boolean {
  if (!trialExpiresAt) return false
  return new Date(trialExpiresAt) > new Date()
}

function daysRemaining(trialExpiresAt: string | null): number {
  if (!trialExpiresAt) return 0
  const msLeft = new Date(trialExpiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function addDaysToISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  // Set to end of that day in UTC
  d.setUTCHours(23, 59, 59, 0)
  return d.toISOString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TrialManager({
  businessId,
  businessName,
  trialExpiresAt: initialExpiresAt,
}: TrialManagerProps) {
  const [expiresAt, setExpiresAt]   = useState(initialExpiresAt)
  const [mode, setMode]             = useState<'days' | 'date'>('days')
  const [daysInput, setDaysInput]   = useState(14)
  const [dateInput, setDateInput]   = useState('')
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const active   = isTrialActive(expiresAt)
  const daysLeft = daysRemaining(expiresAt)
  const isUrgent = active && daysLeft <= 3

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Activar Trial ──────────────────────────────────────────────────────────

  function handleActivate() {
    let expiry: string

    if (mode === 'days') {
      if (daysInput < 1 || daysInput > 365) {
        showToast('error', 'Los días deben estar entre 1 y 365.')
        return
      }
      expiry = addDaysToISO(daysInput)
    } else {
      if (!dateInput || dateInput < todayISO()) {
        showToast('error', 'Selecciona una fecha futura.')
        return
      }
      // End of selected day UTC
      expiry = new Date(`${dateInput}T23:59:59Z`).toISOString()
    }

    startTransition(async () => {
      const result = await setBusinessTrial(businessId, expiry)
      if (result.success) {
        setExpiresAt(expiry)
        showToast('success', `Trial activado hasta el ${formatDate(expiry)}.`)
      } else {
        showToast('error', result.error ?? 'Error al activar el trial.')
      }
    })
  }

  // ── Desactivar Trial ───────────────────────────────────────────────────────

  function handleDeactivate() {
    startTransition(async () => {
      const result = await clearBusinessTrial(businessId)
      if (result.success) {
        setExpiresAt(null)
        showToast('success', 'Trial desactivado. Los datos del negocio no fueron afectados.')
      } else {
        showToast('error', result.error ?? 'Error al desactivar el trial.')
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-5"
      style={{
        border:     'rgba(197,160,89,0.15) 1px solid',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{
            background: toast.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border:     `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
            color:      toast.type === 'success' ? '#4ade80' : '#f87171',
          }}
        >
          {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: active
                ? 'color-mix(in srgb, #C5A059 12%, transparent)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'color-mix(in srgb, #C5A059 25%, transparent)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <Sparkles size={16} style={{ color: active ? '#C5A059' : 'rgba(244,244,244,0.30)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: '#F4F4F4' }}>
              Período de Prueba (Trial)
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(244,244,244,0.40)' }}>
              Acceso temporal a todos los módulos sin modificar el plan base.
            </p>
          </div>
        </div>

        {/* Badge de estado */}
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={
            active
              ? {
                  background: isUrgent ? 'rgba(239,68,68,0.12)' : 'rgba(197,160,89,0.12)',
                  color:      isUrgent ? '#fca5a5' : '#C5A059',
                  border:     `1px solid ${isUrgent ? 'rgba(239,68,68,0.25)' : 'rgba(197,160,89,0.25)'}`,
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  color:      'rgba(244,244,244,0.35)',
                  border:     '1px solid rgba(255,255,255,0.08)',
                }
          }
        >
          {active ? (
            <>
              <Clock size={11} />
              {isUrgent
                ? `Vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`
                : `Activo — ${daysLeft} ${daysLeft === 1 ? 'día restante' : 'días restantes'}`
              }
            </>
          ) : (
            'Sin trial activo'
          )}
        </span>
      </div>

      {/* Info del trial activo */}
      {active && expiresAt && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: isUrgent ? 'rgba(239,68,68,0.07)' : 'rgba(197,160,89,0.06)',
            border:     `1px solid ${isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(197,160,89,0.12)'}`,
          }}
        >
          <Calendar size={15} style={{ color: isUrgent ? '#f87171' : '#C5A059', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ color: isUrgent ? '#fca5a5' : 'rgba(244,244,244,0.75)' }}>
              <span className="font-semibold">{businessName}</span> tiene acceso completo
              a todos los módulos hasta el{' '}
              <span className="font-semibold" style={{ color: isUrgent ? '#f87171' : '#C5A059' }}>
                {formatDate(expiresAt)}
              </span>.
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(244,244,244,0.35)' }}>
              ✅ Al vencer, el acceso se revoca automáticamente pero ningún dato en la base de datos es eliminado.
            </p>
          </div>
        </div>
      )}

      {/* Formulario de activación / extensión */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(244,244,244,0.40)' }}>
          {active ? 'Extender o reemplazar trial' : 'Activar nuevo trial'}
        </p>

        {/* Tabs: Días vs Fecha */}
        <div
          className="flex rounded-lg p-1 self-start"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {(['days', 'date'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-2 rounded-md text-xs font-semibold transition-all"
              style={
                mode === m
                  ? { background: 'rgba(197,160,89,0.15)', color: '#C5A059', border: '1px solid rgba(197,160,89,0.25)' }
                  : { color: 'rgba(244,244,244,0.40)', border: '1px solid transparent' }
              }
            >
              {m === 'days' ? '# Días' : 'Fecha exacta'}
            </button>
          ))}
        </div>

        {/* Input según modo */}
        {mode === 'days' ? (
          <div className="flex flex-col gap-2">
            {/* Shortcuts rápidos */}
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysInput(d)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.04]"
                  style={
                    daysInput === d
                      ? { background: 'rgba(197,160,89,0.18)', color: '#C5A059', border: '1px solid rgba(197,160,89,0.30)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(244,244,244,0.50)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {d} días
                </button>
              ))}
            </div>

            {/* Input manual */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={daysInput}
                onChange={(e) => setDaysInput(Math.max(1, Math.min(365, Number(e.target.value))))}
                className="w-24 px-3 py-2 rounded-xl text-sm text-center outline-none"
                style={{
                  background:   'rgba(255,255,255,0.06)',
                  border:       '1px solid rgba(197,160,89,0.20)',
                  color:        '#F4F4F4',
                }}
              />
              <span className="text-sm" style={{ color: 'rgba(244,244,244,0.50)' }}>días</span>
              {daysInput > 0 && (
                <span className="text-xs" style={{ color: 'rgba(244,244,244,0.35)' }}>
                  → vence el {formatDate(addDaysToISO(daysInput))}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                type="date"
                min={todayISO()}
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background:   'rgba(255,255,255,0.06)',
                  border:       '1px solid rgba(197,160,89,0.20)',
                  color:        '#F4F4F4',
                  colorScheme:  'dark',
                }}
              />
              {dateInput && (
                <span className="text-xs" style={{ color: 'rgba(244,244,244,0.35)' }}>
                  → {formatDate(new Date(`${dateInput}T12:00:00Z`).toISOString())}
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'rgba(244,244,244,0.30)' }}>
              El trial vence al final del día seleccionado (23:59 UTC).
            </p>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          onClick={handleActivate}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{
            background: 'color-mix(in srgb, #C5A059 90%, transparent)',
            color:      '#080808',
          }}
        >
          <Zap size={14} />
          {active ? 'Extender Trial' : 'Activar Trial'}
        </button>

        {active && (
          <button
            onClick={handleDeactivate}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'rgba(239,68,68,0.10)',
              color:      '#f87171',
              border:     '1px solid rgba(239,68,68,0.20)',
            }}
          >
            <X size={14} />
            Desactivar Trial
          </button>
        )}

        {isPending && (
          <span className="text-xs" style={{ color: 'rgba(244,244,244,0.35)' }}>
            Guardando…
          </span>
        )}
      </div>
    </div>
  )
}
