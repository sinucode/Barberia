'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import {
  Plus, X, Loader2, Armchair,
  MoreVertical, Pencil, Power, Save,
} from 'lucide-react'
import {
  createWorkstation,
  updateWorkstation,
  toggleWorkstationStatus,
} from '@/actions/workstations'
import type { Workstation } from '@xinuco/types'
import { AdminPageHeader } from '@xinuco/ui'
import { AdminEmptyState } from '@xinuco/ui'

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — WorkstationManager (Client Island)
// ════════════════════════════════════════════════════════════════════════════════

interface WorkstationManagerProps {
  initialWorkstations: Workstation[]
  businessId: string
  slug: string
}

export function WorkstationManager({ initialWorkstations, businessId }: WorkstationManagerProps) {
  const [workstations, setWorkstations] = useState<Workstation[]>(initialWorkstations)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editing, setEditing]           = useState<Workstation | null>(null)

  /** Callback de éxito para el sheet — actualiza la lista localmente */
  const handleSaveSuccess = useCallback((saved: Workstation) => {
    setWorkstations(prev => {
      const exists = prev.find(w => w.id === saved.id)
      return exists
        ? prev.map(w => (w.id === saved.id ? saved : w)) // edición
        : [...prev, saved]                                // creación (al final, por created_at asc)
    })
    setSheetOpen(false)
    setEditing(null)
  }, [])

  const handleCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const handleEdit = useCallback((workstation: Workstation) => {
    setEditing(workstation)
    setSheetOpen(true)
  }, [])

  const handleClose = () => {
    setSheetOpen(false)
    setEditing(null)
  }

  return (
    <>
      <AdminPageHeader
        title="Estaciones de Trabajo"
        subtitle="Gestiona sillas, cabinas y espacios del negocio."
        hasData={workstations.length > 0}
        actionButton={
          <button
            onClick={handleCreate}
            className="btn-primary flex items-center gap-2 animate-fade-in"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Añadir Estación</span>
            <span className="sm:hidden">Añadir</span>
          </button>
        }
      />

      {/* Lista de estaciones */}
      <section aria-label="Lista de estaciones de trabajo" className="mt-6">
        {workstations.length === 0 ? (
          <AdminEmptyState
            icon={Armchair}
            title="Sin estaciones registradas"
            description="Aún no tienes estaciones de trabajo. Añade tu primera silla o cabina para habilitar el agendamiento tri-factorial."
            actionLabel="Añadir Primera Estación"
            onAction={handleCreate}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl animate-fade-in" style={{ border: '1px solid var(--border-color)' }}>
            <table className="w-full text-sm" aria-label="Catálogo de estaciones de trabajo">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.03))' }}>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Estación
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
                {workstations.map((workstation) => (
                  <WorkstationRow
                    key={workstation.id}
                    workstation={workstation}
                    onEdit={() => handleEdit(workstation)}
                    onToggle={(updated) =>
                      setWorkstations(prev => prev.map(w => (w.id === updated.id ? updated : w)))
                    }
                  />
                ))}
              </tbody>

              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.02))' }}>
                  <td colSpan={3} className="px-5 py-3 text-xs text-xinuco-muted">
                    {workstations.length} estación{workstations.length !== 1 ? 'es' : ''} registrada{workstations.length !== 1 ? 's' : ''}
                    {' · '}
                    {workstations.filter(w => w.is_active).length} activa{workstations.filter(w => w.is_active).length !== 1 ? 's' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Sheet Panel — Crear/Editar */}
      {sheetOpen && (
        <WorkstationSheet
          businessId={businessId}
          workstation={editing}
          onClose={handleClose}
          onSuccess={handleSaveSuccess}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// FILA DE LA TABLA — Con Toggle Optimista
// ════════════════════════════════════════════════════════════════════════════════

function WorkstationRow({
  workstation,
  onEdit,
  onToggle,
}: {
  workstation: Workstation
  onEdit: () => void
  onToggle: (updated: Workstation) => void
}) {
  const [isPendingToggle, startToggle] = useTransition()
  const [menuOpen, setMenuOpen]        = useState(false)

  /** Toggle de estado con UI Optimista y rollback automático */
  function handleToggleStatus() {
    const newStatus = !workstation.is_active

    // Optimistic: actualizar inmediatamente en la UI
    onToggle({ ...workstation, is_active: newStatus })

    startToggle(async () => {
      const result = await toggleWorkstationStatus(workstation.id, newStatus)
      if (result.error) {
        // Rollback si el servidor rechaza
        onToggle({ ...workstation, is_active: !newStatus })
      }
    })

    setMenuOpen(false)
  }

  return (
    <tr
      className="transition-all duration-200 hover:bg-white/[0.02]"
      style={{
        borderTop: '1px solid var(--border-color)',
        opacity: isPendingToggle ? 0.4 : 1,
      }}
    >
      {/* Nombre de la estación */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-2 h-2 rounded-full"
            style={{ background: workstation.is_active ? 'var(--primary-color)' : 'var(--border-color, #333)' }}
          />
          <span className="font-medium text-xinuco-text leading-tight">{workstation.name}</span>
          {/* Badge inactive — visible en mobile */}
          {!workstation.is_active && (
            <span className="text-xs text-xinuco-muted sm:hidden">(inactiva)</span>
          )}
        </div>
      </td>

      {/* Estado — Switch Optimista — desktop */}
      <td className="px-5 py-4 hidden sm:table-cell">
        <div className="flex items-center justify-center">
          <button
            type="button"
            role="switch"
            aria-checked={workstation.is_active}
            aria-label={workstation.is_active ? 'Estación activa' : 'Estación inactiva'}
            onClick={handleToggleStatus}
            disabled={isPendingToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isPendingToggle ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
            style={{
              backgroundColor: workstation.is_active ? 'var(--primary-color)' : 'var(--surface-color, #333)',
            }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                workstation.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
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
            disabled={isPendingToggle}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            aria-label={`Acciones para ${workstation.name}`}
          >
            {isPendingToggle
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
                  Editar nombre
                </button>

                <button
                  onClick={handleToggleStatus}
                  disabled={isPendingToggle}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium text-xinuco-text hover:bg-white/[0.04] transition-colors text-left"
                >
                  <Power
                    size={13}
                    className={workstation.is_active ? 'text-amber-400' : 'text-emerald-400'}
                  />
                  {workstation.is_active ? 'Desactivar' : 'Activar'}
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
// SHEET PANEL — Crear / Editar Estación de Trabajo
// ════════════════════════════════════════════════════════════════════════════════

function WorkstationSheet({
  businessId,
  workstation,
  onClose,
  onSuccess,
}: {
  businessId: string
  workstation: Workstation | null
  onClose: () => void
  onSuccess: (saved: Workstation) => void
}) {
  const isEditing   = Boolean(workstation)
  const backdropRef = useRef<HTMLDivElement>(null)

  const [name, setName]           = useState(workstation?.name ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) return setFormError('El nombre de la estación es obligatorio.')

    startTransition(async () => {
      try {
        if (isEditing && workstation) {
          const result = await updateWorkstation(workstation.id, { name })
          if (result.error) { setFormError(result.error); return }
          onSuccess({ ...workstation, name: name.trim() })
        } else {
          const result = await createWorkstation(businessId, { name })
          if (result.error) { setFormError(result.error); return }
          if (result.data && !Array.isArray(result.data)) {
            onSuccess(result.data)
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.'
        setFormError(message)
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
        className="h-full overflow-y-auto animate-slide-in-right w-[95vw] sm:w-[400px]"
        style={{
          background:  'var(--bg-color)',
          borderLeft:  '1px solid var(--border-color)',
        }}
      >
        {/* Header del Sheet */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">
              {isEditing ? 'Editar Estación' : 'Nueva Estación'}
            </h2>
            <p className="text-xs text-xinuco-muted mt-0.5">
              {isEditing
                ? 'Actualiza el nombre de esta estación.'
                : 'Añade una silla, cabina o espacio de trabajo.'}
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
            <label htmlFor="ws-name" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Nombre de la estación *
            </label>
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Silla 1, Cabina VIP, Spa Pedicure A"
              required
              autoFocus
              className="input-base"
            />
            <p className="text-xs text-xinuco-muted">
              Usa nombres cortos y descriptivos para identificar el espacio físico.
            </p>
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
