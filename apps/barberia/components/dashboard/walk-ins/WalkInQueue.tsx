'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import {
  Users,
  Plus,
  X,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Scissors,
  Clock,
  UserCheck,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  getWalkInQueue,
  addWalkIn,
  updateWalkInStatus,
  assignStaff,
  removeFromQueue,
} from '@/actions/walk-ins'
import type { WalkInWithRelations } from '@/actions/walk-ins'
import type { Staff, Service } from '@xinuco/types'

// ── Tipos de props ────────────────────────────────────────────────────────────

interface WalkInQueueProps {
  initialQueue:   WalkInWithRelations[]
  initialHistory: WalkInWithRelations[]
  staffList:      Pick<Staff, 'id' | 'full_name'>[]
  serviceList:    Pick<Service, 'id' | 'name' | 'price_cop' | 'duration_minutes'>[]
  businessId:     string
  slug:           string
}

// ── Wait time badge ──────────────────────────────────────────────────────────

function WaitTimeBadge({ arrivedAt }: { arrivedAt: string }) {
  const minutesWaited = Math.floor(
    (Date.now() - new Date(arrivedAt).getTime()) / 60_000
  )

  let colorClass: string
  if (minutesWaited < 15) {
    colorClass = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
  } else if (minutesWaited < 30) {
    colorClass = 'text-amber-400 bg-amber-400/10 border-amber-400/25'
  } else {
    colorClass = 'text-red-400 bg-red-400/10 border-red-400/25'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}
    >
      <Clock size={9} />
      hace {minutesWaited} min
    </span>
  )
}

// ── Staff Chip ─────────────────────────────────────────────────────────────

function StaffChip({ name }: { name?: string }) {
  if (!name) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-zinc-500 bg-zinc-500/10 border-zinc-500/25">
        <UserCheck size={9} />
        Sin asignar
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{
        color:            'var(--primary-color)',
        backgroundColor:  'color-mix(in srgb, var(--primary-color) 12%, transparent)',
        borderColor:      'color-mix(in srgb, var(--primary-color) 25%, transparent)',
      }}
    >
      <UserCheck size={9} />
      {name}
    </span>
  )
}

// ── Walk-in Card ─────────────────────────────────────────────────────────────

interface WalkInCardProps {
  entry:       WalkInWithRelations
  staffList:   Pick<Staff, 'id' | 'full_name'>[]
  onRefresh:   () => void
}

function WalkInCard({ entry, staffList, onRefresh }: WalkInCardProps) {
  const [isPending, startTransition]      = useTransition()
  const [showConfirmCancel, setShowConfirm] = useState(false)
  const [completedAnim, setCompletedAnim]   = useState(false)

  const handleStatusChange = (nextStatus: 'in_progress' | 'completed' | 'cancelled') => {
    if (nextStatus === 'completed') {
      setCompletedAnim(true)
      setTimeout(() => setCompletedAnim(false), 800)
    }
    startTransition(async () => {
      await updateWalkInStatus(entry.id, nextStatus)
      onRefresh()
    })
  }

  const handleAssign = (staffId: string | null) => {
    startTransition(async () => {
      await assignStaff(entry.id, staffId)
      onRefresh()
    })
  }

  const handleCancel = () => {
    startTransition(async () => {
      await removeFromQueue(entry.id)
      setShowConfirm(false)
      onRefresh()
    })
  }

  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-3 border transition-all duration-300 ${
        completedAnim ? 'scale-95 opacity-60' : 'opacity-100'
      }`}
      style={{
        backgroundColor: 'var(--surface-color)',
        borderColor:     'var(--border-color)',
      }}
    >
      {/* Row 1: name + position */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                color:           'var(--primary-color)',
                backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              }}
            >
              {entry.position + 1}
            </span>
            <span className="font-semibold text-sm text-xinuco-text truncate">
              {entry.customer_name}
            </span>
          </div>
          {entry.customer_phone && (
            <span className="flex items-center gap-1 text-[11px] text-xinuco-muted ml-7">
              <Phone size={9} />
              {entry.customer_phone}
            </span>
          )}
        </div>
        <WaitTimeBadge arrivedAt={entry.arrived_at} />
      </div>

      {/* Row 2: service + staff chips */}
      <div className="flex flex-wrap gap-1.5 ml-0">
        {entry.service && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-zinc-300 bg-zinc-300/10 border-zinc-300/20">
            <Scissors size={9} />
            {entry.service.name}
          </span>
        )}
        <StaffChip name={entry.staff?.full_name} />
      </div>

      {/* Row 3: notes */}
      {entry.notes && (
        <p className="text-[11px] text-xinuco-muted italic border-l-2 pl-2" style={{ borderColor: 'var(--border-color)' }}>
          {entry.notes}
        </p>
      )}

      {/* Row 4: actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
        {isPending ? (
          <Loader2 size={14} className="animate-spin text-xinuco-muted" />
        ) : (
          <>
            {entry.status === 'waiting' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{
                  color:           'var(--primary-color)',
                  backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
                }}
              >
                <Play size={11} />
                Atender
              </button>
            )}
            {entry.status === 'in_progress' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 transition-all hover:scale-105"
              >
                <CheckCircle size={11} />
                Completar
              </button>
            )}

            {/* Staff selector */}
            <select
              value={entry.staff_id ?? ''}
              onChange={(e) => handleAssign(e.target.value || null)}
              className="ml-auto text-[11px] rounded-lg px-2 py-1 border outline-none cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--bg-color)',
                borderColor:     'var(--border-color)',
                color:           'var(--text-color, #F4F4F4)',
              }}
            >
              <option value="">Asignar barbero</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>

            {/* Cancel */}
            {!showConfirmCancel ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Cancelar walk-in"
              >
                <X size={13} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-400">¿Cancelar?</span>
                <button
                  onClick={handleCancel}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  Sí
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-400"
                >
                  No
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Add Walk-in Sheet ──────────────────────────────────────────────────────

interface AddWalkInSheetProps {
  businessId:  string
  staffList:   Pick<Staff, 'id' | 'full_name'>[]
  serviceList: Pick<Service, 'id' | 'name' | 'price_cop' | 'duration_minutes'>[]
  onClose:     () => void
  onSuccess:   () => void
}

function AddWalkInSheet({ businessId, staffList, serviceList, onClose, onSuccess }: AddWalkInSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)
  const formRef                      = React.useRef<HTMLFormElement>(null)

  const [form, setForm] = useState({
    customer_name:  '',
    customer_phone: '',
    service_id:     '',
    staff_id:       '',
    notes:          '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer_name.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await addWalkIn(businessId, {
        customer_name:  form.customer_name,
        customer_phone: form.customer_phone || null,
        service_id:     form.service_id     || null,
        staff_id:       form.staff_id       || null,
        notes:          form.notes          || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  const inputCls =
    'w-full rounded-xl px-3 py-2.5 text-sm border outline-none transition-colors placeholder-zinc-500'

  const inputStyle = {
    backgroundColor: 'var(--bg-color)',
    borderColor:     'var(--border-color)',
    color:           'var(--text-color, #F4F4F4)',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--bg-color)', borderLeft: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              }}
            >
              <Users size={16} style={{ color: 'var(--primary-color)' }} />
            </div>
            <span className="font-semibold text-sm text-xinuco-text">Agregar Walk-in</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Customer name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-xinuco-muted uppercase tracking-wide">
              Nombre del cliente <span className="text-red-400">*</span>
            </label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="Ej: Juan García"
              value={form.customer_name}
              onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-xinuco-muted uppercase tracking-wide">
              Teléfono <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
            </label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="+57 300 000 0000"
              type="tel"
              value={form.customer_phone}
              onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))}
            />
          </div>

          {/* Service */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-xinuco-muted uppercase tracking-wide">
              Servicio <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
            </label>
            <select
              className={inputCls}
              style={inputStyle}
              value={form.service_id}
              onChange={(e) => setForm((p) => ({ ...p, service_id: e.target.value }))}
            >
              <option value="">Sin definir</option>
              {serviceList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Staff */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-xinuco-muted uppercase tracking-wide">
              Barbero <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
            </label>
            <select
              className={inputCls}
              style={inputStyle}
              value={form.staff_id}
              onChange={(e) => setForm((p) => ({ ...p, staff_id: e.target.value }))}
            >
              <option value="">Cualquier barbero</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-xinuco-muted uppercase tracking-wide">
              Notas <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              className={`${inputCls} resize-none`}
              style={inputStyle}
              rows={3}
              placeholder="Ej: Cliente frecuente, prefiere corte clásico..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex gap-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-xinuco-muted hover:text-xinuco-text transition-colors"
            style={{ borderColor: 'var(--border-color)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
            style={{
              backgroundColor: 'var(--primary-color)',
              color:           '#080808',
            }}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Agregar a cola
          </button>
        </div>
      </div>
    </>
  )
}

// ── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ entry }: { entry: WalkInWithRelations }) {
  const isCompleted = entry.status === 'completed'

  return (
    <div
      className="flex items-center gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? 'bg-emerald-400' : 'bg-zinc-600'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-xinuco-text truncate">{entry.customer_name}</p>
        <p className="text-[11px] text-xinuco-muted">
          {entry.service?.name ?? 'Sin servicio'} •{' '}
          {formatDistanceToNow(new Date(entry.arrived_at), { addSuffix: true, locale: es })}
        </p>
      </div>
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          isCompleted
            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
            : 'text-zinc-500 bg-zinc-500/10 border-zinc-500/25'
        }`}
      >
        {isCompleted ? 'Completado' : 'Cancelado'}
      </span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WalkInQueue({
  initialQueue,
  initialHistory,
  staffList,
  serviceList,
  businessId,
}: WalkInQueueProps) {
  const [queue, setQueue]           = useState<WalkInWithRelations[]>(initialQueue)
  const [history, setHistory]       = useState<WalkInWithRelations[]>(initialHistory)
  const [showAddSheet, setShowAdd]  = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [, startTransition]         = useTransition()

  const waiting    = queue.filter((e) => e.status === 'waiting')
  const inProgress = queue.filter((e) => e.status === 'in_progress')

  // Refresh queue from server
  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const fresh = await getWalkInQueue(businessId)
        setQueue(fresh)
      } catch {
        // silent refresh failure — stale data is acceptable
      }
    })
  }, [businessId])

  // Auto-refresh every 30 seconds for multi-device sync
  useEffect(() => {
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const columnHeader = (
    label:    string,
    count:    number,
    isGold?:  boolean
  ) => (
    <div className="flex items-center gap-2 mb-4">
      <h3
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: isGold ? 'var(--primary-color)' : '#f59e0b' }}
      >
        {label}
      </h3>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
        style={
          isGold
            ? {
                color:           'var(--primary-color)',
                backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              }
            : { color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }
        }
      >
        {count}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
              border:          '1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)',
            }}
          >
            <Users size={22} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-xl text-xinuco-text">Cola de Walk-ins</h1>
              {waiting.length > 0 && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color:           'var(--primary-color)',
                    backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
                  }}
                >
                  {waiting.length} en espera
                </span>
              )}
            </div>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Clientes sin cita previa — actualización automática cada 30s
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:scale-105 flex-shrink-0"
          style={{
            backgroundColor: 'var(--primary-color)',
            color:           '#080808',
          }}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Agregar Walk-in</span>
          <span className="sm:hidden">Agregar</span>
        </button>
      </div>

      {/* Empty state */}
      {queue.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center gap-4 py-16 border"
          style={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
              border:          '1px solid color-mix(in srgb, var(--primary-color) 20%, transparent)',
            }}
          >
            <Users size={32} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-xinuco-text">No hay clientes en espera</p>
            <p className="text-sm text-xinuco-muted mt-1">
              Agrega el primer walk-in para comenzar la cola
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              color:           'var(--primary-color)',
              border:          '1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)',
            }}
          >
            <Plus size={14} />
            Agregar Walk-in
          </button>
        </div>
      ) : (
        /* Kanban board */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* En Espera */}
          <div>
            {columnHeader('En Espera', waiting.length, false)}
            <div className="flex flex-col gap-3">
              {waiting.length === 0 ? (
                <div
                  className="rounded-xl py-8 flex flex-col items-center gap-2 border border-dashed"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <p className="text-xs text-xinuco-muted">Sin clientes en espera</p>
                </div>
              ) : (
                waiting.map((entry) => (
                  <WalkInCard
                    key={entry.id}
                    entry={entry}
                    staffList={staffList}
                    onRefresh={refresh}
                  />
                ))
              )}
            </div>
          </div>

          {/* En Atención */}
          <div>
            {columnHeader('En Atención', inProgress.length, true)}
            <div className="flex flex-col gap-3">
              {inProgress.length === 0 ? (
                <div
                  className="rounded-xl py-8 flex flex-col items-center gap-2 border border-dashed"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <p className="text-xs text-xinuco-muted">Ningún cliente en atención ahora</p>
                </div>
              ) : (
                inProgress.map((entry) => (
                  <WalkInCard
                    key={entry.id}
                    entry={entry}
                    staffList={staffList}
                    onRefresh={refresh}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* History (collapsible) */}
      {history.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
            style={{ backgroundColor: 'var(--surface-color)' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-xinuco-muted">
              Historial reciente
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-xinuco-muted">{history.length} registros</span>
              {showHistory ? (
                <ChevronUp size={14} className="text-xinuco-muted" />
              ) : (
                <ChevronDown size={14} className="text-xinuco-muted" />
              )}
            </div>
          </button>

          {showHistory && (
            <div className="px-5" style={{ backgroundColor: 'var(--bg-color)' }}>
              {history.map((entry) => (
                <HistoryItem key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Walk-in Sheet */}
      {showAddSheet && (
        <AddWalkInSheet
          businessId={businessId}
          staffList={staffList}
          serviceList={serviceList}
          onClose={() => setShowAdd(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
