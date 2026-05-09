'use client'

import { useState, useTransition } from 'react'
import { toggleStaffStatus } from '@/actions/staff'
import type { Staff } from '@/types/database'
import { User, ShieldAlert, Scissors, Sparkles } from 'lucide-react'

export function StaffGrid({ initialStaff }: { initialStaff: Staff[] }) {
  if (initialStaff.length === 0) {
    return (
      <div className="py-12 text-center text-xinuco-muted border border-dashed border-xinuco-border rounded-lg" style={{ borderColor: 'var(--surface-color, #333)' }}>
        No hay empleados registrados.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialStaff.map((member) => (
        <StaffCard key={member.id} member={member} />
      ))}
    </div>
  )
}

function StaffCard({ member }: { member: Staff }) {
  const [isActive, setIsActive] = useState(member.is_active)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    const newValue = !isActive
    setIsActive(newValue) // Optimistic UI

    startTransition(async () => {
      const result = await toggleStaffStatus(member.id, newValue)
      
      if (result.error) {
        setIsActive(!newValue) // Rollback
        alert(`Error al actualizar estado: ${result.error}`)
      }
    })
  }

  // Define iconos y colores por rol
  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'super_admin': return { icon: ShieldAlert, label: 'Llave Maestra', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' }
      case 'admin': return { icon: User, label: 'Administrador', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' }
      case 'barber': return { icon: Scissors, label: 'Barbero', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' }
      case 'manicurist': return { icon: Sparkles, label: 'Manicurista', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' }
      default: return { icon: User, label: 'Empleado', color: 'text-xinuco-muted', bg: 'bg-white/5 border-white/10' }
    }
  }

  const roleConfig = getRoleConfig(member.role)
  const RoleIcon = roleConfig.icon

  return (
    <div 
      className={`card flex items-center justify-between transition-all duration-300 ${!isActive ? 'opacity-50 grayscale' : ''} ${isPending ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar Placeholder */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
        >
          <RoleIcon size={20} style={{ color: 'var(--primary-color)' }} />
        </div>

        <div className="flex flex-col">
          <h3 className="font-bold text-xinuco-text text-base">{member.name}</h3>
          
          {/* Badge de Rol */}
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${roleConfig.bg} ${roleConfig.color} w-fit`}>
            {roleConfig.label}
          </span>
        </div>
      </div>

      {/* iOS Style Toggle */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${isPending ? 'cursor-wait' : 'cursor-pointer'}`}
        style={{ backgroundColor: isActive ? 'var(--primary-color)' : 'var(--surface-color, #333)' }}
        title={isActive ? 'Desactivar empleado' : 'Activar empleado'}
      >
        <span 
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isActive ? 'translate-x-6' : 'translate-x-1'
          }`} 
        />
      </button>
    </div>
  )
}
