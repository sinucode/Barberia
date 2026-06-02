'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  X,
  Loader2,
  Trash2,
  Percent,
  DollarSign,
  RefreshCw,
  Globe,
  User,
  Layers,
  ChevronDown,
} from 'lucide-react'
import {
  createCommissionRule,
  deleteCommissionRule,
  calculatePendingCommissions,
} from '@/actions/commissions'
import type { CommissionRuleWithRelations } from '@/actions/commissions'
import type { Staff, Service } from '@xinuco/types'
import { AdminPageHeader } from '@xinuco/ui'
import { AdminEmptyState } from '@xinuco/ui'

// ── Helpers de formato COP ────────────────────────────────────────────────────

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style:    'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ── Nivel de prioridad para badge visual ─────────────────────────────────────

type PriorityLevel = 'global' | 'staff' | 'staff_service'

function getRulePriority(rule: CommissionRuleWithRelations): PriorityLevel {
  if (!rule.staff_id && !rule.service_id) return 'global'
  if (rule.staff_id && !rule.service_id)  return 'staff'
  return 'staff_service'
}

function getRuleLabel(rule: CommissionRuleWithRelations): string {
  if (!rule.staff_id && !rule.service_id) return 'Regla Global del Negocio'
  if (rule.staff_id && !rule.service_id) {
    const name = rule.staff?.full_name ?? 'Barbero desconocido'
    return `Todas las citas de ${name}`
  }
  const staffName   = rule.staff?.full_name   ?? 'Barbero desconocido'
  const serviceName = rule.service?.name ?? 'Servicio desconocido'
  return `${staffName} — ${serviceName}`
}

// Badge de prioridad: oro=global, plata=por barbero, bronce=barbero+servicio
function PriorityBadge({ level }: { level: PriorityLevel }) {
  const config: Record<PriorityLevel, { label: string; colors: string; icon: React.ReactNode }> = {
    global: {
      label:  'Global',
      colors: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      icon:   <Globe size={10} />,
    },
    staff: {
      label:  'Barbero',
      colors: 'text-slate-300 bg-slate-400/10 border-slate-400/20',
      icon:   <User size={10} />,
    },
    staff_service: {
      label:  'Específica',
      colors: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
      icon:   <Layers size={10} />,
    },
  }

  const { label, colors, icon } = config[level]
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colors}`}
    >
      {icon}
      {label}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — CommissionManager
// ════════════════════════════════════════════════════════════════════════════

interface CommissionManagerProps {
  initialRules: CommissionRuleWithRelations[]
  staff:        Pick<Staff, 'id' | 'full_name' | 'specialty_role' | 'is_active'>[]
  services:     Service[]
  businessId:   string
  slug:         string
}

export function CommissionManager({
  initialRules,
  staff,
  services,
  businessId,
}: CommissionManagerProps) {
  const [rules, setRules]         = useState<CommissionRuleWithRelations[]>(initialRules)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [queueMsg, setQueueMsg]   = useState<string | null>(null)
  const [isPendingQueue, startQueue] = useTransition()

  // Añadir regla nueva a la lista local tras guardar
  const handleRuleCreated = useCallback((rule: CommissionRuleWithRelations) => {
    setRules(prev => [rule, ...prev])
    setSheetOpen(false)
  }, [])

  // Eliminar regla de la lista local tras confirmar
  const handleRuleDeleted = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId))
  }, [])

  // Procesar cola de comisiones pendientes
  function handleProcessQueue() {
    setQueueMsg(null)
    startQueue(async () => {
      const result = await calculatePendingCommissions(businessId)
      if (result.error) {
        setQueueMsg(`Error: ${result.error}`)
      } else {
        setQueueMsg(
          `Procesadas ${result.processed ?? 0} cita(s). ${
            result.errors ? `${result.errors} error(es).` : ''
          }`
        )
      }
    })
  }

  return (
    <>
      <AdminPageHeader
        title="Comisiones"
        subtitle="Define las reglas de comisión para tu equipo. Cascada: barbero+servicio › barbero › global."
        hasData={true}
        actionButton={
          <div className="flex items-center gap-2">
            {/* Procesar cola manualmente */}
            <button
              type="button"
              onClick={handleProcessQueue}
              disabled={isPendingQueue}
              className="btn-ghost flex items-center gap-2 text-xs"
              title="Calcular comisiones pendientes de la cola"
            >
              {isPendingQueue ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              <span className="hidden sm:inline">Calcular Pendientes</span>
            </button>

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="btn-primary flex items-center gap-2 animate-fade-in"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Nueva Regla</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        }
      />

      {/* Mensaje de resultado del procesamiento */}
      {queueMsg && (
        <p
          role="status"
          className="text-xs px-4 py-2.5 rounded-lg border animate-fade-in"
          style={{
            background:   'rgba(197,160,89,0.08)',
            borderColor:  'rgba(197,160,89,0.2)',
            color:        'var(--primary-color)',
          }}
        >
          {queueMsg}
        </p>
      )}

      {/* Tabla de reglas */}
      <section aria-label="Reglas de comisión" className="mt-6">
        {rules.length === 0 ? (
          <AdminEmptyState
            icon={Percent}
            title="Sin reglas de comisión"
            description="Aún no tienes reglas configuradas. Crea una regla global para aplicar a todo el equipo, o reglas específicas por barbero y servicio."
            actionLabel="Crear Primera Regla"
            onAction={() => setSheetOpen(true)}
          />
        ) : (
          <div
            className="overflow-x-auto rounded-xl animate-fade-in"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <table
              className="w-full text-sm"
              aria-label="Tabla de reglas de comisión"
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background:   'var(--surface-color, rgba(255,255,255,0.03))',
                  }}
                >
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Alcance
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
                    Prioridad
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {rules.map(rule => (
                  <CommissionRuleRow
                    key={rule.id}
                    rule={rule}
                    onDelete={handleRuleDeleted}
                  />
                ))}
              </tbody>

              <tfoot>
                <tr
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--surface-color, rgba(255,255,255,0.02))',
                  }}
                >
                  <td colSpan={4} className="px-5 py-3 text-xs text-xinuco-muted">
                    {rules.length} regla{rules.length !== 1 ? 's' : ''} configurada
                    {rules.length !== 1 ? 's' : ''} · Propinas: 100% del barbero (excluidas del cálculo)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Sheet Panel */}
      {sheetOpen && (
        <CommissionRuleSheet
          businessId={businessId}
          staff={staff}
          services={services}
          onClose={() => setSheetOpen(false)}
          onSuccess={handleRuleCreated}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// FILA DE LA TABLA — Una regla
// ════════════════════════════════════════════════════════════════════════════

function CommissionRuleRow({
  rule,
  onDelete,
}: {
  rule:     CommissionRuleWithRelations
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen]           = useState(false)
  const [isPendingDelete, startDelete]    = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const priority = getRulePriority(rule)
  const label    = getRuleLabel(rule)

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setMenuOpen(false)
    startDelete(async () => {
      const result = await deleteCommissionRule(rule.id)
      if (!result.error) onDelete(rule.id)
    })
  }

  return (
    <tr
      className="transition-all duration-200 hover:bg-white/[0.02]"
      style={{
        borderTop: '1px solid var(--border-color)',
        opacity:   isPendingDelete ? 0.4 : 1,
      }}
    >
      {/* Alcance */}
      <td className="px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-xinuco-text leading-tight text-sm">
            {label}
          </span>
          {/* Badge en mobile (la columna Prioridad está oculta) */}
          <span className="sm:hidden">
            <PriorityBadge level={priority} />
          </span>
        </div>
      </td>

      {/* Prioridad — desktop */}
      <td className="px-5 py-4 hidden sm:table-cell">
        <PriorityBadge level={priority} />
      </td>

      {/* Comisión */}
      <td className="px-5 py-4 text-center">
        {rule.commission_percentage > 0 ? (
          <span
            className="inline-flex items-center gap-1 text-sm font-bold tabular-nums"
            style={{ color: 'var(--primary-color)' }}
          >
            <Percent size={12} />
            {rule.commission_percentage}%
          </span>
        ) : rule.fixed_amount > 0 ? (
          <span
            className="inline-flex items-center gap-1 text-sm font-bold tabular-nums"
            style={{ color: 'var(--primary-color)' }}
          >
            <DollarSign size={12} />
            {formatCOP(rule.fixed_amount)}
          </span>
        ) : (
          <span className="text-xs text-xinuco-muted">Sin comisión</span>
        )}
      </td>

      {/* Acciones */}
      <td className="px-5 py-4 text-right">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false) }}
            disabled={isPendingDelete}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            aria-label={`Acciones para regla ${label}`}
          >
            {isPendingDelete ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false) }} />
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden animate-fade-in origin-top-right"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium hover:bg-white/[0.04] transition-colors text-left"
                  style={{ color: confirmDelete ? '#f87171' : 'var(--text-color)' }}
                >
                  <Trash2
                    size={13}
                    className={confirmDelete ? 'text-red-400' : 'text-red-400/60'}
                  />
                  {confirmDelete ? 'Confirmar eliminación' : 'Eliminar regla'}
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET PANEL — Crear nueva regla
// ════════════════════════════════════════════════════════════════════════════

type CommissionMode = 'percentage' | 'fixed'

function CommissionRuleSheet({
  businessId,
  staff,
  services,
  onClose,
  onSuccess,
}: {
  businessId: string
  staff:      Pick<Staff, 'id' | 'full_name' | 'specialty_role' | 'is_active'>[]
  services:   Service[]
  onClose:    () => void
  onSuccess:  (rule: CommissionRuleWithRelations) => void
}) {
  const backdropRef = useRef<HTMLDivElement>(null)

  const [selectedStaffId,   setSelectedStaffId]   = useState<string>('')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [mode,              setMode]              = useState<CommissionMode>('percentage')
  const [percentage,        setPercentage]        = useState<string>('')
  const [fixedAmount,       setFixedAmount]       = useState<string>('')
  const [formError,         setFormError]         = useState<string | null>(null)
  const [isPending,         startTransition]      = useTransition()

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Reset del campo contrario al cambiar de modo
  function handleModeChange(newMode: CommissionMode) {
    setMode(newMode)
    if (newMode === 'percentage') setFixedAmount('')
    else                          setPercentage('')
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const pct   = mode === 'percentage' ? parseInt(percentage,  10) || 0 : 0
    const fixed = mode === 'fixed'      ? parseInt(fixedAmount, 10) || 0 : 0

    if (pct === 0 && fixed === 0) {
      return setFormError('Ingresa un porcentaje o un monto fijo mayor a 0.')
    }
    if (mode === 'percentage' && (pct < 1 || pct > 100)) {
      return setFormError('El porcentaje debe estar entre 1 y 100.')
    }
    if (mode === 'fixed' && fixed < 1) {
      return setFormError('El monto fijo debe ser mayor a $0 COP.')
    }

    startTransition(async () => {
      try {
        const result = await createCommissionRule(businessId, {
          staff_id:              selectedStaffId   || null,
          service_id:            selectedServiceId || null,
          commission_percentage: pct,
          fixed_amount:          fixed,
        })

        if (result.error) {
          setFormError(result.error)
          return
        }

        // Construir el objeto enriquecido para actualizar la UI local
        const staffObj   = staff.find(s => s.id === selectedStaffId)   ?? null
        const serviceObj = services.find(s => s.id === selectedServiceId) ?? null

        const mockRule: CommissionRuleWithRelations = {
          id:                    crypto.randomUUID(),
          business_id:           businessId,
          staff_id:              selectedStaffId   || null,
          service_id:            selectedServiceId || null,
          commission_percentage: pct,
          fixed_amount:          fixed,
          created_at:            new Date().toISOString(),
          staff:   staffObj   ? { id: staffObj.id,   full_name: staffObj.full_name }   : null,
          service: serviceObj ? { id: serviceObj.id, name: serviceObj.name } : null,
        }

        onSuccess(mockRule)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.'
        setFormError(message)
      }
    })
  }

  // Label descriptivo del alcance mientras el usuario configura
  function getScopePreview(): string {
    const sName = staff.find(s => s.id === selectedStaffId)?.full_name
    const svName = services.find(s => s.id === selectedServiceId)?.name
    if (!selectedStaffId && !selectedServiceId) return 'Regla Global del Negocio'
    if (selectedStaffId && !selectedServiceId)  return `Todas las citas de ${sName}`
    if (selectedStaffId && selectedServiceId)   return `${sName} — ${svName}`
    return 'Alcance no válido'
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      {/* Panel Sheet */}
      <div
        className="h-full overflow-y-auto animate-slide-in-right w-[95vw] sm:w-[420px]"
        style={{
          background: 'var(--bg-color)',
          borderLeft: '1px solid var(--border-color)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">Nueva Regla</h2>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Define el alcance y el monto de comisión.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Preview del alcance */}
          <div
            className="px-4 py-3 rounded-xl text-xs font-medium"
            style={{
              background:  'rgba(197,160,89,0.07)',
              border:      '1px solid rgba(197,160,89,0.15)',
              color:       'var(--primary-color)',
            }}
          >
            {getScopePreview()}
          </div>

          {/* Select Barbero */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="cr-staff"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Barbero <span className="normal-case font-normal">(opcional)</span>
            </label>
            <select
              id="cr-staff"
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              className="input-base"
            >
              <option value="">Todos los barberos</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-xinuco-muted">
              Deja en &quot;Todos&quot; para crear una regla global del negocio.
            </p>
          </div>

          {/* Select Servicio */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="cr-service"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Servicio <span className="normal-case font-normal">(opcional)</span>
            </label>
            <select
              id="cr-service"
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
              className="input-base"
            >
              <option value="">Todos los servicios</option>
              {services.map(sv => (
                <option key={sv.id} value={sv.id}>
                  {sv.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-xinuco-muted">
              Deja en &quot;Todos&quot; para aplicar a cualquier servicio del barbero.
            </p>
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px solid var(--border-color)' }} />

          {/* Radio toggle: Porcentaje / Monto Fijo */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Tipo de comisión
            </p>
            <div
              className="grid grid-cols-2 gap-1 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <button
                type="button"
                onClick={() => handleModeChange('percentage')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: mode === 'percentage' ? 'var(--primary-color)' : 'transparent',
                  color:      mode === 'percentage' ? '#080808' : 'var(--text-color)',
                }}
              >
                <Percent size={14} />
                Porcentaje
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('fixed')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: mode === 'fixed' ? 'var(--primary-color)' : 'transparent',
                  color:      mode === 'fixed' ? '#080808' : 'var(--text-color)',
                }}
              >
                <DollarSign size={14} />
                Monto Fijo
              </button>
            </div>
          </div>

          {/* Input según modo */}
          {mode === 'percentage' ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cr-pct"
                className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
              >
                Porcentaje de comisión *
              </label>
              <div className="relative">
                <input
                  id="cr-pct"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={percentage}
                  onChange={e => setPercentage(e.target.value)}
                  placeholder="Ej: 40"
                  required
                  autoFocus
                  className="input-base pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-xinuco-muted pointer-events-none">
                  %
                </span>
              </div>
              <p className="text-xs text-xinuco-muted">
                Sobre el subtotal después del descuento. Propinas no incluidas.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cr-fixed"
                className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
              >
                Monto fijo COP *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-xinuco-muted pointer-events-none">
                  $
                </span>
                <input
                  id="cr-fixed"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1000}
                  value={fixedAmount}
                  onChange={e => setFixedAmount(e.target.value)}
                  placeholder="Ej: 15000"
                  required
                  autoFocus
                  className="input-base pl-7"
                />
              </div>
              <p className="text-xs text-xinuco-muted">
                Monto fijo en COP entero (ej: 15000 = $15.000). Se aplica por cita completada.
              </p>
            </div>
          )}

          {/* Error */}
          {formError && (
            <p
              role="alert"
              className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 animate-fade-in"
            >
              {formError}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium text-xinuco-muted border transition-colors hover:text-xinuco-text hover:bg-white/[0.03]"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 btn-primary !py-3 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Guardar Regla
                </>
              )}
            </button>
          </div>

          {/* Nota sobre propinas */}
          <p
            className="text-[11px] text-xinuco-muted text-center px-2"
            style={{ lineHeight: '1.5' }}
          >
            Las propinas son 100% del barbero y no entran al cálculo de comisiones.
          </p>
        </form>
      </div>
    </div>
  )
}
