'use client'

import { useState, useTransition, useCallback } from 'react'
import { Loader2, Users, Pencil } from 'lucide-react'
import { updateStaff } from '@/actions/staff'
import { StaffModal } from './StaffModal'
import type { Staff, StaffRole } from '@/types/database'

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Admin',
  barber: 'Barbero',
  manicurist: 'Manicurista'
}

interface StaffGridProps {
  initialStaff: Staff[]
}

export function StaffGrid({ initialStaff }: StaffGridProps) {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

  const handleModalSuccess = useCallback((saved: Staff) => {
    setStaffList(prev => {
      const exists = prev.find(s => s.id === saved.id)
      return exists
        ? prev.map(s => s.id === saved.id ? saved : s)
        : [saved, ...prev]
    })
  }, [])

  if (staffList.length === 0) {
    return (
      <div className="rounded-xl border border-dashed text-center py-16 px-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Users size={36} className="mx-auto mb-3 text-xinuco-muted opacity-40" />
        <p className="text-sm font-medium text-xinuco-text mb-1">Sin empleados registrados</p>
        <p className="text-xs text-xinuco-muted">Usa el botón "Añadir Empleado" para comenzar.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {staffList.map((staff) => (
          <StaffCard
            key={staff.id}
            staff={staff}
            onEdit={() => setEditingStaff(staff)}
            onToggle={(updated) =>
              setStaffList(prev => prev.map(s => s.id === updated.id ? updated : s))
            }
          />
        ))}
      </div>

      {editingStaff && (
        <StaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  )
}

function StaffCard({
  staff,
  onEdit,
  onToggle
}: {
  staff: Staff
  onEdit: () => void
  onToggle: (updated: Staff) => void
}) {
  const [isPending, startTransition] = useTransition()

  // Generate initials for avatar
  const initials = staff.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleToggle = () => {
    if (isPending) return
    const newStatus = !staff.is_active

    // Optimistic UI update
    onToggle({ ...staff, is_active: newStatus })

    startTransition(async () => {
      try {
        const result = await updateStaff(staff.id, { is_active: newStatus })
        if (result?.[0]) {
          onToggle(result[0] as Staff)
        }
      } catch {
        // Rollback on failure
        onToggle({ ...staff, is_active: !newStatus })
      }
    })
  }

  return (
    <div 
      className="relative flex flex-col p-5 rounded-xl border transition-all duration-300"
      style={{ 
        backgroundColor: 'var(--surface-color, rgba(255,255,255,0.02))',
        borderColor: 'var(--border-color)',
        opacity: staff.is_active ? 1 : 0.5,
        filter: staff.is_active ? 'none' : 'grayscale(50%)'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex items-center justify-center w-11 h-11 rounded-full font-bold text-sm shrink-0 border border-[color-mix(in_srgb,var(--primary-color)_30%,transparent)]"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              color: 'var(--primary-color)' 
            }}
          >
            {initials}
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-xinuco-text truncate max-w-[140px]">
              {staff.name}
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 w-fit border" 
              style={{ 
                color: 'var(--primary-color)',
                backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary-color) 20%, transparent)'
              }}
            >
              {ROLE_LABELS[staff.role] ?? 'Staff'}
            </span>
          </div>
        </div>

        {/* Toggle Switch iOS style */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-xinuco-primary disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: staff.is_active ? 'var(--primary-color)' : 'var(--bg-color)',
            opacity: isPending ? 0.6 : 1
          }}
          role="switch"
          aria-checked={staff.is_active}
          aria-label={`Toggle ${staff.name} status`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
              staff.is_active ? 'translate-x-4' : 'translate-x-0'
            }`}
          >
             {isPending && <Loader2 size={10} className="animate-spin text-gray-500" />}
          </span>
        </button>
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-color)' }}>
        <span className="text-[10px] uppercase tracking-wider text-xinuco-muted font-medium">
          {staff.is_active ? 'Disponible' : 'Inactivo'}
        </span>
        
        <button
          onClick={onEdit}
          disabled={isPending}
          className="text-xs font-medium text-xinuco-muted hover:text-[var(--primary-color)] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          <Pencil size={12} />
          Editar
        </button>
      </div>
    </div>
  )
}
