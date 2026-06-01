'use client'

import { useState, useTransition } from 'react'
import { Play, Clock, CheckCircle2, XCircle, AlertCircle, CalendarX, Loader2, ArrowRight } from 'lucide-react'
import { parseTimeRange, formatTime, getDurationMinutes } from '@/lib/utils/time'
import { updateAppointmentStatus } from '@/actions/appointments'
import { CheckoutModal } from '../finance/CheckoutModal'
import type { Appointment, AppointmentStatus } from '@/types/database'

interface InteractiveAgendaProps {
  appointments: any[]
  activeShiftId: string | null
  businessId: string
  slug: string
}

interface StatusConfig {
  label: string
  textClass: string
  bgClass: string
  Icon: React.ElementType
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  payment_pending: {
    label: 'Pago Pendiente',
    textClass: 'text-amber-500',
    bgClass: 'bg-zinc-950',
    Icon: AlertCircle,
  },
  scheduled: {
    label: 'Programada',
    textClass: 'text-xinuco-primary',
    bgClass: 'bg-xinuco-surface',
    Icon: Clock,
  },
  ready_to_pay: {
    label: 'Lista para Pagar',
    textClass: 'text-amber-400',
    bgClass: 'bg-zinc-950',
    Icon: CheckCircle2,
  },
  in_progress: {
    label: 'En curso',
    textClass: 'text-emerald-400',
    bgClass: 'bg-zinc-950',
    Icon: Play,
  },
  completed: {
    label: 'Completada',
    textClass: 'text-zinc-550',
    bgClass: 'bg-zinc-950',
    Icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelada',
    textClass: 'text-zinc-550',
    bgClass: 'bg-zinc-950',
    Icon: XCircle,
  },
  no_show: {
    label: 'No asistió',
    textClass: 'text-zinc-550',
    bgClass: 'bg-zinc-950',
    Icon: AlertCircle,
  },
}

export function InteractiveAgenda({
  appointments: initialAppointments,
  activeShiftId,
  businessId,
  slug,
}: InteractiveAgendaProps) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [isPending, startTransition] = useTransition()
  
  // Fila que se está actualizando actualmente (para mostrar loader individual)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Checkout Modal
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [checkoutWarning, setCheckoutWarning] = useState<string | null>(null)

  // Cambiar estado de cita
  const handleStatusChange = (appointmentId: string, nextStatus: AppointmentStatus) => {
    setUpdatingId(appointmentId)
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointmentId, nextStatus)
      if (result.error) {
        alert(`Error al actualizar estado: ${result.error}`)
      } else {
        // Actualizar localmente para feedback inmediato
        setAppointments((prev) =>
          prev.map((app) => (app.id === appointmentId ? { ...app, status: nextStatus } : app))
        )
      }
      setUpdatingId(null)
    })
  }

  // Abrir Checkout Modal
  const handleOpenCheckout = (appt: any) => {
    if (!activeShiftId) {
      setCheckoutWarning('⚠️ Debes abrir un turno de caja en el gestor antes de realizar cobros.')
      setTimeout(() => setCheckoutWarning(null), 5000)
      return
    }
    setCheckoutWarning(null)
    setSelectedAppt(appt)
  }

  const handleCheckoutSuccess = () => {
    if (selectedAppt) {
      // Marcar como completada en UI
      setAppointments((prev) =>
        prev.map((app) => (app.id === selectedAppt.id ? { ...app, status: 'completed' } : app))
      )
    }
    setSelectedAppt(null)
    window.location.reload() // Recargar para sincronizar el consolidado de caja
  }

  return (
    <div className="space-y-6">
      {/* Advertencia de Caja Cerrada al intentar cobrar */}
      {checkoutWarning && (
        <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl text-amber-400 text-xs flex gap-2 animate-fade-in shrink-0">
          <span>{checkoutWarning}</span>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-10 gap-3 text-center bg-zinc-950/50 border border-zinc-900">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)' }}
          >
            <CalendarX size={24} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-xinuco-text">Sin citas para hoy</p>
            <p className="text-xs text-xinuco-muted mt-1">Las nuevas citas aparecerán aquí</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Lista de citas del día">
          {appointments.map((appt) => {
            const customerName = appt.customers?.full_name || appt.customer_name || 'Cliente sin nombre'
            const customerPhone = appt.customers?.phone || appt.customer_phone
            const serviceName = appt.services?.name || appt.service_name || 'Servicio'
            const servicePrice = appt.services?.price_cop || 0

            const parsed = appt.start_time ? { start: new Date(appt.start_time) } : parseTimeRange(appt.time_range ?? '')
            const timeStr = parsed ? formatTime(parsed.start) : '—'
            const duration = appt.time_range ? getDurationMinutes(appt.time_range) : 30

            const cfg = STATUS_CONFIG[appt.status as AppointmentStatus] || STATUS_CONFIG.scheduled
            const Icon = cfg.Icon
            const isUpdating = updatingId === appt.id
            const isActive = appt.status === 'scheduled' || appt.status === 'in_progress' || appt.status === 'ready_to_pay'

            return (
              <li key={appt.id} className="flex items-stretch gap-3 animate-fade-in">
                {/* Columna hora */}
                <time
                  dateTime={parsed?.start.toISOString()}
                  className="text-xs font-bold text-xinuco-muted w-12 shrink-0 pt-4 text-right leading-none"
                >
                  {timeStr}
                </time>

                {/* Línea de timeline */}
                <div className="flex flex-col items-center shrink-0 pt-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-colors duration-300"
                    style={{
                      borderColor: isActive ? 'var(--primary-color)' : 'var(--border-color)',
                      background: isActive ? 'var(--primary-color)' : 'transparent',
                    }}
                  />
                  <div
                    className="w-px flex-1 mt-1"
                    style={{ background: 'var(--border-color)' }}
                  />
                </div>

                {/* Card de la cita */}
                <div
                  className="card flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-950/70 transition-colors"
                  style={isActive ? { borderColor: 'color-mix(in srgb, var(--primary-color) 25%, transparent)' } : {}}
                >
                  {/* Detalles principales */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: isActive
                          ? 'color-mix(in srgb, var(--primary-color) 12%, transparent)'
                          : 'color-mix(in srgb, var(--border-color) 60%, transparent)',
                      }}
                    >
                      {isUpdating ? (
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                      ) : (
                        <Icon
                          size={16}
                          style={{ color: isActive ? 'var(--primary-color)' : 'var(--muted-color)' }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-xinuco-text truncate">
                          {customerName}
                        </p>
                        {customerPhone && (
                          <span className="text-[10px] text-zinc-500 font-medium">
                            ({customerPhone})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-xinuco-muted mt-0.5">
                        <span className="truncate">{serviceName}</span>
                        <span>•</span>
                        <span>{duration} min</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones del Administrador en base al estado actual */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-zinc-900/50 sm:border-0">
                    {/* Badge de estado estático */}
                    <span
                      className={`badge shrink-0 text-[10px] font-bold uppercase tracking-wider ${cfg.textClass}`}
                      style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}
                    >
                      {cfg.label}
                    </span>

                    {/* Botón de acción interactivo */}
                    {!isUpdating && (
                      <>
                        {appt.status === 'scheduled' && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'in_progress')}
                            disabled={isPending}
                            className="text-xs px-3.5 py-1.5 rounded-lg bg-[var(--primary-color)] text-black font-bold hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <Play size={11} fill="black" />
                            Iniciar
                          </button>
                        )}

                        {appt.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'ready_to_pay')}
                            disabled={isPending}
                            className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black font-bold hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <CheckCircle2 size={11} />
                            Terminar Cita
                          </button>
                        )}

                        {appt.status === 'ready_to_pay' && (
                          <button
                            onClick={() => handleOpenCheckout(appt)}
                            disabled={isPending}
                            className="text-xs px-3.5 py-1.5 rounded-lg bg-amber-400 text-black font-bold hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <ArrowRight size={11} strokeWidth={2.5} />
                            Cobrar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Checkout Modal */}
      {selectedAppt && (
        <CheckoutModal
          appointment={{
            id: selectedAppt.id,
            customer_name: selectedAppt.customers?.full_name || selectedAppt.customer_name,
            customer_id: selectedAppt.customer_id,
            service_name: selectedAppt.services?.name || selectedAppt.service_name,
            service_price: selectedAppt.services?.price_cop || 0,
            staff_id: selectedAppt.staff_id,
          }}
          businessId={businessId}
          activeShiftId={activeShiftId || ''}
          onClose={() => setSelectedAppt(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  )
}
