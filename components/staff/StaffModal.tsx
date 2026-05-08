'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { X, Plus, Loader2, Save, UserCircle } from 'lucide-react'
import { createStaffMember, updateStaff } from '@/actions/staff'
import type { Staff, StaffRole } from '@/types/database'

interface StaffModalProps {
  staff?: Staff
  onClose: () => void
  onSuccess: (staff: Staff) => void
}

const ROLES: { id: StaffRole; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'barber', label: 'Barbero' },
  { id: 'manicurist', label: 'Manicurista' }
]

export function StaffModal({ staff, onClose, onSuccess }: StaffModalProps) {
  const isEditing = Boolean(staff)
  const backdropRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState(staff?.name ?? '')
  const [role, setRole] = useState<StaffRole>(staff?.role ?? 'barber')
  const [formError, setFormError] = useState<string | null>(null)
  
  const [isPending, startTransition] = useTransition()

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) return setFormError('El nombre del empleado es obligatorio.')

    const payload = {
      name: name.trim(),
      role,
      user_id: staff?.user_id ?? null,
      is_active: staff?.is_active ?? true,
    }

    startTransition(async () => {
      try {
        let result
        if (isEditing && staff) {
          const updated = await updateStaff(staff.id, payload)
          result = updated?.[0]
        } else {
          const created = await createStaffMember(payload)
          result = created?.[0]
        }

        if (result) {
          onSuccess(result as Staff)
          onClose()
        }
      } catch (err: any) {
        setFormError(err?.message ?? 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <h2 className="text-base font-bold text-xinuco-text flex items-center gap-2">
            <UserCircle size={18} />
            {isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text transition-colors hover:bg-xinuco-surface/60"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="staff-name" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Nombre Completo *
            </label>
            <input
              id="staff-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carlos Pérez"
              required
              className="input-base"
            />
          </div>

          {/* Selector de Rol tipo Pills */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Rol Asignado *
            </label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer
                    ${role === r.id 
                      ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)]' 
                      : 'border-xinuco-border text-xinuco-muted bg-xinuco-surface hover:text-xinuco-text hover:border-xinuco-muted'
                    }
                  `}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {formError && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2 animate-fade-in">
              {formError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 mt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium text-xinuco-muted border transition-colors hover:text-xinuco-text hover:bg-xinuco-surface/40 cursor-pointer"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 btn-primary !py-3 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Guardando...</>
              ) : (
                <><Save size={15} /> {isEditing ? 'Actualizar' : 'Guardar'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AddStaffButton() {
  const [isOpen, setIsOpen] = useState(false)

  const handleSuccess = useCallback(() => {
    // Reload happens automatically via Server Action revalidatePath
  }, [])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
      >
        <Plus size={16} />
        Añadir Empleado
      </button>

      {isOpen && (
        <StaffModal
          onClose={() => setIsOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
