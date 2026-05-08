'use client'

import { useState, useTransition, useCallback } from 'react'
import { Loader2, MoreVertical, Pencil, Power, Trash2, Clock, DollarSign } from 'lucide-react'
import { updateService, deleteService } from '@/actions/services'
import { ServiceModal } from './ServiceModal'
import type { Service } from '@/types/database'

// ── Utilidades ──────────────────────────────────────────────────────────────────
/** Formatea precio a moneda COP visual */
function formatCOPDisplay(price: number): string {
  return '$ ' + price.toLocaleString('es-CO')
}

/** Formatea minutos a string legible */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ── Props ────────────────────────────────────────────────────────────────────────
interface ServiceTableProps {
  initialServices: Service[]
}

// ── Componente principal ─────────────────────────────────────────────────────────
export function ServiceTable({ initialServices }: ServiceTableProps) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [editingService, setEditingService] = useState<Service | null>(null)

  // Callback de éxito para el modal — actualiza la lista localmente
  const handleModalSuccess = useCallback((saved: Service) => {
    setServices(prev => {
      const exists = prev.find(s => s.id === saved.id)
      return exists
        ? prev.map(s => s.id === saved.id ? saved : s)  // edición
        : [saved, ...prev]                                // creación
    })
  }, [])

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed text-center py-16 px-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <DollarSign size={36} className="mx-auto mb-3 text-xinuco-muted opacity-40" />
        <p className="text-sm font-medium text-xinuco-text mb-1">Sin servicios registrados</p>
        <p className="text-xs text-xinuco-muted">Usa el botón "Añadir Servicio" para comenzar.</p>
      </div>
    )
  }

  return (
    <>
      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-sm" aria-label="Catálogo de servicios">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.04))' }}>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Servicio
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
                Duración
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Precio
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
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
                onEdit={() => setEditingService(service)}
                onToggle={(updated) =>
                  setServices(prev => prev.map(s => s.id === updated.id ? updated : s))
                }
                onDelete={(id) =>
                  setServices(prev => prev.filter(s => s.id !== id))
                }
              />
            ))}
          </tbody>

          <tfoot>
            <tr style={{ borderTop: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.03))' }}>
              <td colSpan={5} className="px-5 py-3 text-xs text-xinuco-muted">
                {services.length} servicio{services.length !== 1 ? 's' : ''} registrado{services.length !== 1 ? 's' : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modal de edición */}
      {editingService && (
        <ServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  )
}

// ── Row individual con Optimistic UI ─────────────────────────────────────────────
/**
 * UI Optimista para toggle de estado:
 *  1. Al hacer clic, el row baja opacidad (0.45) y muestra micro-spinner.
 *  2. Actualiza el estado local de forma instantánea (sin esperar servidor).
 *  3. Si el Server Action falla → rollback al estado anterior.
 *  4. useTransition garantiza que React no bloquee el hilo principal.
 */
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

  function handleToggleStatus() {
    const newStatus = !service.is_active

    // ── UI Optimista ─────────────────────────────────────────────────────────
    // Actualizamos localmente de inmediato antes de la respuesta del servidor
    onToggle({ ...service, is_active: newStatus })

    startToggle(async () => {
      try {
        const result = await updateService(service.id, { is_active: newStatus })
        if (result?.[0]) {
          onToggle(result[0] as Service)
        }
      } catch {
        // Rollback: revertimos al estado anterior
        onToggle({ ...service, is_active: !newStatus })
      }
    })

    setMenuOpen(false)
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`)) return

    // ── UI Optimista ─────────────────────────────────────────────────────────
    // Ocultamos la fila inmediatamente para feedback instantáneo
    onDelete(service.id)

    startDelete(async () => {
      try {
        await deleteService(service.id)
      } catch {
        // Si falla, la revalidatePath del Server Action refrescará la lista correcta.
        // No necesitamos rollback manual ya que la mutación se confirma del servidor.
      }
    })

    setMenuOpen(false)
  }

  const isPending = isPendingToggle || isPendingDelete

  return (
    <tr
      className="transition-all duration-200 hover:bg-white/[0.03]"
      style={{
        borderTop: '1px solid var(--border-color)',
        opacity: isPending ? 0.45 : 1,
      }}
    >
      {/* Nombre del servicio */}
      <td className="px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-xinuco-text leading-tight">{service.name}</span>
          {service.description && (
            <span className="text-xs text-xinuco-muted line-clamp-1">{service.description}</span>
          )}
          {/* Duración solo en mobile */}
          <span className="text-xs text-xinuco-muted flex items-center gap-1 sm:hidden mt-0.5">
            <Clock size={11} />
            {formatDuration(service.duration_minutes)}
          </span>
        </div>
      </td>

      {/* Duración */}
      <td className="px-5 py-4 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-xinuco-muted">
          <Clock size={13} style={{ color: 'var(--primary-color)' }} />
          {formatDuration(service.duration_minutes)}
        </span>
      </td>

      {/* Precio */}
      <td className="px-5 py-4">
        <span className="font-semibold text-xinuco-text tabular-nums">
          {formatCOPDisplay(service.price)}
        </span>
      </td>

      {/* Estado — badge */}
      <td className="px-5 py-4 hidden sm:table-cell">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          service.is_active
            ? 'text-emerald-400 bg-emerald-400/10'
            : 'text-xinuco-muted bg-xinuco-surface/60'
        }`}>
          {/* Spinner mientras la mutación está en vuelo */}
          {isPendingToggle
            ? <Loader2 size={10} className="animate-spin" />
            : <span className="w-1.5 h-1.5 rounded-full" style={{ background: service.is_active ? '#34d399' : 'var(--border-color)' }} />
          }
          {service.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </td>

      {/* Acciones — menú de 3 puntos */}
      <td className="px-5 py-4 text-right">
        <div className="relative inline-block">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={isPending}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-xinuco-surface/60 transition-colors disabled:opacity-40"
            aria-label={`Acciones para ${service.name}`}
          >
            {isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <MoreVertical size={16} />
            }
          </button>

          {menuOpen && (
            <>
              {/* Overlay para cerrar el menú */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-lg shadow-2xl z-20 py-1 overflow-hidden animate-slide-up origin-top-right"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-xinuco-text hover:bg-xinuco-surface/60 transition-colors text-left"
                >
                  <Pencil size={13} style={{ color: 'var(--primary-color)' }} />
                  Editar servicio
                </button>

                <button
                  onClick={handleToggleStatus}
                  disabled={isPendingToggle}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-xinuco-text hover:bg-xinuco-surface/60 transition-colors text-left"
                >
                  <Power size={13} className={service.is_active ? 'text-amber-400' : 'text-emerald-400'} />
                  {service.is_active ? 'Desactivar' : 'Activar'}
                </button>

                <div className="my-1 mx-3" style={{ borderTop: '1px solid var(--border-color)' }} />

                <button
                  onClick={handleDelete}
                  disabled={isPendingDelete}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors text-left"
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
