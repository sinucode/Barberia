'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import {
  Plus, X, Loader2, Clock, DollarSign,
  MoreVertical, Pencil, Power, Trash2, Save,
} from 'lucide-react'
import { createService, updateService, toggleServiceStatus } from '@/actions/services'
import type { Service } from '@/types/database'

// ════════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════════

/** Formatea precio entero a string COP visual — 15000 → "$ 15.000" */
function formatCOP(raw: number | string): string {
  const num = parseInt(String(raw).replace(/\D/g, ''), 10)
  if (isNaN(num) || num === 0) return ''
  return '$ ' + num.toLocaleString('es-CO')
}

/** Extrae entero limpio de string COP — "$ 15.000" → 15000 */
function parseCOP(formatted: string): number {
  const clean = formatted.replace(/\D/g, '')
  return clean ? parseInt(clean, 10) : 0
}

/** Formatea minutos a string legible — 90 → "1h 30min" */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — ServiceManager (Client Island)
// ════════════════════════════════════════════════════════════════════════════════

interface ServiceManagerProps {
  initialServices: Service[]
  businessId: string
}

export function ServiceManager({ initialServices, businessId }: ServiceManagerProps) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  /** Callback de éxito para el sheet — actualiza la lista localmente */
  const handleSaveSuccess = useCallback((saved: Service) => {
    setServices(prev => {
      const exists = prev.find(s => s.id === saved.id)
      return exists
        ? prev.map(s => (s.id === saved.id ? saved : s)) // edición
        : [saved, ...prev]                                // creación
    })
    setSheetOpen(false)
    setEditingService(null)
  }, [])

  /** Abrir sheet en modo creación */
  const handleCreate = () => {
    setEditingService(null)
    setSheetOpen(true)
  }

  /** Abrir sheet en modo edición */
  const handleEdit = useCallback((service: Service) => {
    setEditingService(service)
    setSheetOpen(true)
  }, [])

  /** Cerrar sheet */
  const handleClose = () => {
    setSheetOpen(false)
    setEditingService(null)
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
          >
            <DollarSign size={24} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-xinuco-text">Menú de Servicios</h1>
            <p className="text-sm text-xinuco-muted mt-0.5">Configura cortes, precios y duraciones.</p>
          </div>
        </div>

        <button
          id="btn-add-service"
          onClick={handleCreate}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Añadir Servicio</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>

      {/* Tabla Premium Minimalist */}
      <section aria-label="Lista de servicios" className="mt-6">
        {services.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
            <table className="w-full text-sm" aria-label="Catálogo de servicios">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.03))' }}>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
                    Duración
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
                    Estado
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {services.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    onEdit={() => handleEdit(service)}
                    onToggle={(updated) =>
                      setServices(prev => prev.map(s => (s.id === updated.id ? updated : s)))
                    }
                    onDelete={(id) =>
                      setServices(prev => prev.filter(s => s.id !== id))
                    }
                  />
                ))}
              </tbody>

              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.02))' }}>
                  <td colSpan={5} className="px-5 py-3 text-xs text-xinuco-muted">
                    {services.length} servicio{services.length !== 1 ? 's' : ''} registrado{services.length !== 1 ? 's' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Sheet Panel — Crear/Editar */}
      {sheetOpen && (
        <ServiceSheet
          businessId={businessId}
          service={editingService}
          onClose={handleClose}
          onSuccess={handleSaveSuccess}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════════

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-xl border border-dashed text-center py-20 px-6"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <DollarSign size={40} className="mx-auto mb-4 text-xinuco-muted opacity-30" />
      <p className="text-sm font-medium text-xinuco-text mb-1">Sin servicios registrados</p>
      <p className="text-xs text-xinuco-muted mb-6">Añade tu primer servicio para comenzar a operar.</p>
      <button onClick={onCreate} className="btn-primary inline-flex items-center gap-2 text-sm">
        <Plus size={15} />
        Añadir Servicio
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// FILA DE LA TABLA — Con Switch Optimista
// ════════════════════════════════════════════════════════════════════════════════

function ServiceRow({
  service,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: Service
  onEdit: () => void
  onToggle: (updated: Service) => void
  onDelete: (id: string) => void
}) {
  const [isPendingToggle, startToggle] = useTransition()
  const [isPendingDelete, startDelete] = useTransition()
  const [menuOpen, setMenuOpen] = useState(false)

  /** Toggle de estado con UI Optimista y rollback automático */
  function handleToggleStatus() {
    const newStatus = !service.is_active

    // Optimistic: actualizar inmediatamente en la UI
    onToggle({ ...service, is_active: newStatus })

    startToggle(async () => {
      const result = await toggleServiceStatus(service.id, newStatus)
      if (result.error) {
        // Rollback si el servidor rechaza
        onToggle({ ...service, is_active: !newStatus })
      }
    })

    setMenuOpen(false)
  }

  /** Eliminar con confirmación */
  function handleDelete() {
    if (!confirm(`¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`)) return

    onDelete(service.id)
    startDelete(async () => {
      // Si falla, revalidatePath en el server action refrescará
    })

    setMenuOpen(false)
  }

  const isPending = isPendingToggle || isPendingDelete

  return (
    <tr
      className="transition-all duration-200 hover:bg-white/[0.02]"
      style={{
        borderTop: '1px solid var(--border-color)',
        opacity: isPending ? 0.4 : 1,
      }}
    >
      {/* Nombre + descripción + duración mobile */}
      <td className="px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-xinuco-text leading-tight">{service.name}</span>
          {service.description && (
            <span className="text-xs text-xinuco-muted line-clamp-1">{service.description}</span>
          )}
          <span className="text-xs text-xinuco-muted flex items-center gap-1 sm:hidden mt-0.5">
            <Clock size={11} />
            {formatDuration(service.duration_minutes)}
          </span>
        </div>
      </td>

      {/* Duración — desktop */}
      <td className="px-5 py-4 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-xinuco-muted">
          <Clock size={13} style={{ color: 'var(--primary-color)' }} />
          {formatDuration(service.duration_minutes)}
        </span>
      </td>

      {/* Precio */}
      <td className="px-5 py-4">
        <span className="font-semibold text-xinuco-text tabular-nums">
          {formatCOP(service.price)}
        </span>
      </td>

      {/* Estado — Switch Optimista */}
      <td className="px-5 py-4 hidden sm:table-cell">
        <div className="flex items-center justify-center">
          <button
            type="button"
            role="switch"
            aria-checked={service.is_active}
            aria-label={service.is_active ? 'Servicio activo' : 'Servicio inactivo'}
            onClick={handleToggleStatus}
            disabled={isPendingToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isPendingToggle ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
            style={{
              backgroundColor: service.is_active ? 'var(--primary-color)' : 'var(--surface-color, #333)',
              focusRingColor: 'var(--primary-color)',
            }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                service.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
            {/* Micro-spinner mientras la mutación está en vuelo */}
            {isPendingToggle && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={12} className="animate-spin text-white/70" />
              </span>
            )}
          </button>
        </div>
      </td>

      {/* Acciones — menú contextual */}
      <td className="px-5 py-4 text-right">
        <div className="relative inline-block">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={isPending}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            aria-label={`Acciones para ${service.name}`}
          >
            {isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <MoreVertical size={16} />
            }
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden animate-fade-in origin-top-right"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                <button
                  onClick={() => { onEdit(); setMenuOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium text-xinuco-text hover:bg-white/[0.04] transition-colors text-left"
                >
                  <Pencil size={13} style={{ color: 'var(--primary-color)' }} />
                  Editar servicio
                </button>

                <button
                  onClick={handleToggleStatus}
                  disabled={isPendingToggle}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium text-xinuco-text hover:bg-white/[0.04] transition-colors text-left sm:hidden"
                >
                  <Power size={13} className={service.is_active ? 'text-amber-400' : 'text-emerald-400'} />
                  {service.is_active ? 'Desactivar' : 'Activar'}
                </button>

                <div className="my-1 mx-3" style={{ borderTop: '1px solid var(--border-color)' }} />

                <button
                  onClick={handleDelete}
                  disabled={isPendingDelete}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors text-left"
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// SHEET PANEL — Crear / Editar Servicio
// ════════════════════════════════════════════════════════════════════════════════
// Comportamiento Multiplataforma:
//   - Desktop: ancho fijo 450px, abre desde la derecha
//   - Mobile: ocupa 95% del ancho para facilitar uso táctil

function ServiceSheet({
  businessId,
  service,
  onClose,
  onSuccess,
}: {
  businessId: string
  service: Service | null
  onClose: () => void
  onSuccess: (saved: Service) => void
}) {
  const isEditing = Boolean(service)
  const backdropRef = useRef<HTMLDivElement>(null)

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [name, setName]                   = useState(service?.name ?? '')
  const [description, setDesc]            = useState(service?.description ?? '')
  const [duration, setDuration]           = useState(String(service?.duration_minutes ?? '30'))
  const [priceDisplay, setPriceDisplay]   = useState(service?.price ? formatCOP(service.price) : '')
  const [formError, setFormError]         = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevenir scroll del body mientras el sheet está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Formateo COP en tiempo real ────────────────────────────────────────────
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    setPriceDisplay(digits ? '$ ' + parseInt(digits, 10).toLocaleString('es-CO') : '')
  }, [])

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const price = parseCOP(priceDisplay)
    const durationMin = parseInt(duration, 10)

    // Validaciones del cliente
    if (!name.trim())                return setFormError('El nombre del servicio es obligatorio.')
    if (!price || price < 0)         return setFormError('El precio debe ser un valor positivo.')
    if (!durationMin || durationMin <= 0) return setFormError('La duración debe ser mayor a 0 minutos.')

    startTransition(async () => {
      try {
        if (isEditing && service) {
          // Modo edición
          const result = await updateService(service.id, {
            name:             name.trim(),
            description:      description.trim() || undefined,
            price,
            duration_minutes: durationMin,
          })

          if (result.error) {
            setFormError(result.error)
            return
          }

          // Construir el servicio actualizado para feedback optimista
          onSuccess({
            ...service,
            name:             name.trim(),
            description:      description.trim() || null,
            price,
            duration_minutes: durationMin,
          })
        } else {
          // Modo creación
          const result = await createService(businessId, {
            name:             name.trim(),
            description:      description.trim() || undefined,
            duration_minutes: durationMin,
            price,
          })

          if (result.error) {
            setFormError(result.error)
            return
          }

          if (result.data && !Array.isArray(result.data)) {
            onSuccess(result.data)
          }
        }
      } catch (err: any) {
        setFormError(err?.message ?? 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      {/* Panel Sheet — responsivo */}
      <div
        className="h-full overflow-y-auto animate-slide-in-right
          w-[95vw] sm:w-[450px]"
        style={{
          background: 'var(--bg-color)',
          borderLeft: '1px solid var(--border-color)',
        }}
      >
        {/* Header del Sheet */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-color)',
          }}
        >
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">
              {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>
            <p className="text-xs text-xinuco-muted mt-0.5">
              {isEditing ? 'Actualiza los datos del servicio.' : 'Configura un nuevo servicio para tu catálogo.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Nombre */}
          <div className="flex flex-col gap-2">
            <label htmlFor="svc-name" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Nombre del servicio *
            </label>
            <input
              id="svc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Corte Clásico"
              required
              autoFocus
              className="input-base"
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-2">
            <label htmlFor="svc-desc" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Descripción <span className="normal-case opacity-50">(opcional)</span>
            </label>
            <textarea
              id="svc-desc"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe brevemente el servicio..."
              rows={3}
              className="input-base resize-none"
            />
          </div>

          {/* Duración y Precio — en fila */}
          <div className="grid grid-cols-2 gap-4">

            {/* Duración en minutos */}
            <div className="flex flex-col gap-2">
              <label htmlFor="svc-duration" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Duración (min) *
              </label>
              <input
                id="svc-duration"
                type="number"
                min={1}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                required
                className="input-base"
              />
            </div>

            {/* Precio con formateo COP en tiempo real */}
            <div className="flex flex-col gap-2">
              <label htmlFor="svc-price" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Precio (COP) *
              </label>
              <input
                id="svc-price"
                type="text"
                inputMode="numeric"
                value={priceDisplay}
                onChange={handlePriceChange}
                placeholder="$ 25.000"
                required
                className="input-base tabular-nums"
              />
            </div>
          </div>

          {/* Error de validación */}
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
              id="btn-save-service"
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
                  <Save size={15} />
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
