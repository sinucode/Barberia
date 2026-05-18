'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { 
  Plus, X, Loader2, User, Users, ShieldAlert, Scissors, 
  Sparkles, Calendar, CalendarDays 
} from 'lucide-react'
import { createStaffMember, toggleStaffStatus } from '@/actions/staff'
import type { Staff, StaffRole } from '@/types/database'
import { StaffScheduleSheet } from './StaffScheduleSheet'
import { AdminPageHeader } from '@/components/ui/AdminPageHeader'
import { AdminEmptyState } from '@/components/ui/AdminEmptyState'

// Eliminado ROLES_CONFIG para permitir roles personalizados según la base de datos

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — StaffManager
// ════════════════════════════════════════════════════════════════════════════════

interface StaffManagerProps {
  initialStaff: Staff[]
  businessId: string
}

export function StaffManager({ initialStaff, businessId }: StaffManagerProps) {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff)
  const [sheetOpen, setSheetOpen] = useState(false)
  
  // Estado para controlar a qué empleado le estamos viendo el horario
  const [scheduleStaff, setScheduleStaff] = useState<{ id: string, name: string } | null>(null)

  const handleCreateSuccess = useCallback((newStaff: Staff) => {
    setStaffList(prev => [newStaff, ...prev])
    setSheetOpen(false)
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Tu Ejército"
        subtitle="Gestiona tu staff de barberos profesionales"
        hasData={staffList.length > 0}
        actionButton={
          <button 
            onClick={() => setSheetOpen(true)}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Añadir Barbero</span>
            <span className="sm:hidden">Añadir</span>
          </button>
        }
      />

      {/* Grid de Empleados */}
      <section aria-label="Lista de staff" className="mt-6">
        {staffList.length === 0 ? (
          <AdminEmptyState 
            icon={Users} 
            title="Sin staff registrado" 
            description="Añade a tu primer barbero para comenzar a asignar turnos y servicios." 
            actionLabel="Añadir Barbero" 
            onAction={() => setSheetOpen(true)} 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {staffList.map((member) => (
              <StaffCard 
                key={member.id} 
                member={member} 
                onToggle={(updated) => 
                  setStaffList(prev => prev.map(m => m.id === updated.id ? updated : m))
                } 
                onOpenSchedule={() => setScheduleStaff({ id: member.id, name: member.full_name })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sheet de Creación */}
      {sheetOpen && (
        <StaffSheet 
          businessId={businessId} 
          onClose={() => setSheetOpen(false)} 
          onSuccess={handleCreateSuccess} 
        />
      )}

      {/* Sheet de Horarios */}
      {scheduleStaff && (
        <StaffScheduleSheet
          businessId={businessId}
          staffId={scheduleStaff.id}
          staffName={scheduleStaff.name}
          onClose={() => setScheduleStaff(null)}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// TARJETA DE EMPLEADO (StaffCard)
// ════════════════════════════════════════════════════════════════════════════════

function StaffCard({ 
  member, 
  onToggle,
  onOpenSchedule
}: { 
  member: Staff
  onToggle: (updated: Staff) => void 
  onOpenSchedule: () => void
}) {
  const [isPending, startTransition] = useTransition()

  // Extraer iniciales para el avatar
  const initials = member.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  // Optimistic UI Toggle
  const handleToggle = () => {
    const newStatus = !member.is_active
    
    // 1. Actualizar localmente de inmediato
    onToggle({ ...member, is_active: newStatus })

    // 2. Ejecutar mutación en background
    startTransition(async () => {
      const result = await toggleStaffStatus(member.id, newStatus)
      if (result.error) {
        // 3. Rollback si falla
        onToggle({ ...member, is_active: !newStatus })
      }
    })
  }

  return (
    <div 
      className={`card flex flex-col gap-5 transition-all duration-300 ${!member.is_active ? 'opacity-50 grayscale' : ''} ${isPending ? 'cursor-wait opacity-70' : ''}`}
    >
      {/* Top: Avatar, Nombre y Switch */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          {/* Avatar (Letras) */}
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-sm tracking-widest shadow-inner"
            style={{ 
              background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              color: 'var(--primary-color)' 
            }}
          >
            {initials}
          </div>

          <div className="flex flex-col">
            <h3 className="font-bold text-xinuco-text text-base leading-tight line-clamp-1" title={member.full_name}>
              {member.full_name}
            </h3>
            
            {/* Badge de Rol */}
            <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-white/5 border-white/10 text-xinuco-muted w-fit`}>
              <Scissors size={10} />
              {member.specialty_role || 'Empleado'}
            </span>
          </div>
        </div>

        {/* Switch Optimista */}
        <button
          type="button"
          role="switch"
          aria-checked={member.is_active}
          onClick={handleToggle}
          disabled={isPending}
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed"
          style={{
            backgroundColor: member.is_active ? 'var(--primary-color)' : 'var(--surface-color, #333)',
          }}
          title={member.is_active ? 'Desactivar empleado' : 'Activar empleado'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              member.is_active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={12} className="animate-spin text-white/70" />
            </span>
          )}
        </button>
      </div>

      <div className="h-px w-full" style={{ background: 'var(--border-color)' }} />

      {/* Acciones Secundarias */}
      <div className="flex items-center gap-2">
        <button 
          className="flex-1 btn-ghost !py-2 !px-3 text-xs flex items-center justify-center gap-2"
          onClick={onOpenSchedule}
        >
          <CalendarDays size={14} />
          Ver Horario
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// SHEET PANEL — CREAR EMPLEADO
// ════════════════════════════════════════════════════════════════════════════════

function StaffSheet({ 
  businessId, 
  onClose, 
  onSuccess 
}: { 
  businessId: string
  onClose: () => void
  onSuccess: (newStaff: Staff) => void
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  
  const [name, setName] = useState('')
  const [specialtyRole, setSpecialtyRole] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Bloquear scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) return setFormError('El nombre es obligatorio.')
    if (!specialtyRole.trim()) return setFormError('El rol/especialidad es obligatorio.')

    startTransition(async () => {
      try {
        const result = await createStaffMember(businessId, {
          full_name: name.trim(),
          specialty_role: specialtyRole.trim()
        })

        if (result.error) {
          setFormError(result.error)
          return
        }

        if (result.data && !Array.isArray(result.data)) {
          onSuccess(result.data as Staff)
        }
      } catch (err: any) {
        setFormError(err?.message ?? 'Error inesperado al crear el empleado.')
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
      <div 
        className="h-full overflow-y-auto animate-slide-in-right w-[95vw] sm:w-[450px]"
        style={{ 
          background: 'var(--bg-color)', 
          borderLeft: '1px solid var(--border-color)' 
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">Añadir Empleado</h2>
            <p className="text-xs text-xinuco-muted mt-0.5">Registra a un nuevo colaborador en tu negocio.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          
          {/* Nombre */}
          <div className="flex flex-col gap-2">
            <label htmlFor="staff-name" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Nombre Completo *
            </label>
            <input
              id="staff-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carlos Ramírez"
              required
              autoFocus
              className="input-base"
            />
          </div>

          {/* Rol (Input Texto) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="staff-role" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Especialidad / Rol *
            </label>
            <input 
              id="staff-role"
              type="text"
              name="specialty_role"
              placeholder="Ej: Master Barber, Colorista..."
              className="input-base"
              value={specialtyRole}
              onChange={(e) => setSpecialtyRole(e.target.value)}
              required
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 animate-fade-in">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-4 mt-auto">
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
                'Crear Empleado'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
