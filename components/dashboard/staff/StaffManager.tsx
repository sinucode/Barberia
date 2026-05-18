'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { 
  Plus, X, Loader2, User, ShieldAlert, Scissors, 
  Sparkles, Calendar, CalendarDays 
} from 'lucide-react'
import { createStaffMember, toggleStaffStatus } from '@/actions/staff'
import type { Staff, StaffRole } from '@/types/database'

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ROLES
// ════════════════════════════════════════════════════════════════════════════════

const ROLES_CONFIG: Record<string, { icon: React.ElementType, label: string, color: string, bg: string, desc: string }> = {
  admin: { 
    icon: ShieldAlert, 
    label: 'Administrador', 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10 border-blue-500/20',
    desc: 'Acceso total al panel'
  },
  barber: { 
    icon: Scissors, 
    label: 'Barbero', 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10 border-amber-500/20',
    desc: 'Especialista en cortes'
  },
  manicurist: { 
    icon: Sparkles, 
    label: 'Manicurista', 
    color: 'text-pink-500', 
    bg: 'bg-pink-500/10 border-pink-500/20',
    desc: 'Especialista en uñas'
  }
}

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

  const handleCreateSuccess = useCallback((newStaff: Staff) => {
    setStaffList(prev => [newStaff, ...prev])
    setSheetOpen(false)
  }, [])

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
          >
            <User size={24} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-xinuco-text">Tu Ejército</h1>
            <p className="text-sm text-xinuco-muted mt-0.5">Gestiona tu equipo, roles y horarios.</p>
          </div>
        </div>

        <button 
          onClick={() => setSheetOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Añadir Empleado</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>

      {/* Grid de Empleados */}
      <section aria-label="Lista de staff" className="mt-6">
        {staffList.length === 0 ? (
          <EmptyState onCreate={() => setSheetOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {staffList.map((member) => (
              <StaffCard 
                key={member.id} 
                member={member} 
                onToggle={(updated) => 
                  setStaffList(prev => prev.map(m => m.id === updated.id ? updated : m))
                } 
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
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// ESTADO VACÍO
// ════════════════════════════════════════════════════════════════════════════════

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed text-center py-20 px-6" style={{ borderColor: 'var(--border-color)' }}>
      <User size={40} className="mx-auto mb-4 text-xinuco-muted opacity-30" />
      <p className="text-sm font-medium text-xinuco-text mb-1">Sin personal registrado</p>
      <p className="text-xs text-xinuco-muted mb-6">Añade a tu primer colaborador para comenzar.</p>
      <button onClick={onCreate} className="btn-primary inline-flex items-center gap-2 text-sm">
        <Plus size={15} />
        Añadir Empleado
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// TARJETA DE EMPLEADO (StaffCard)
// ════════════════════════════════════════════════════════════════════════════════

function StaffCard({ 
  member, 
  onToggle 
}: { 
  member: Staff
  onToggle: (updated: Staff) => void 
}) {
  const [isPending, startTransition] = useTransition()

  // Extraer iniciales para el avatar
  const initials = member.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const config = ROLES_CONFIG[member.role] || { icon: User, label: 'Empleado', color: 'text-xinuco-muted', bg: 'bg-white/5 border-white/10' }
  const RoleIcon = config.icon

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
            <h3 className="font-bold text-xinuco-text text-base leading-tight line-clamp-1" title={member.name}>
              {member.name}
            </h3>
            
            {/* Badge de Rol */}
            <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${config.bg} ${config.color} w-fit`}>
              <RoleIcon size={10} />
              {config.label}
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
          onClick={() => alert('Próximamente: Gestión de Horarios')}
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
  const [role, setRole] = useState<StaffRole>('barber')
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

    startTransition(async () => {
      try {
        const result = await createStaffMember(businessId, {
          full_name: name.trim(),
          role: role
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

          {/* Rol (Radio Group Visual) */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Rol del Empleado *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {(Object.keys(ROLES_CONFIG) as StaffRole[]).map((roleKey) => {
                const conf = ROLES_CONFIG[roleKey]
                const Icon = conf.icon
                const isSelected = role === roleKey

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setRole(roleKey)}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                      isSelected 
                        ? 'border-transparent shadow-md' 
                        : 'border-xinuco-border hover:bg-white/[0.02]'
                    }`}
                    style={{
                      background: isSelected ? 'color-mix(in srgb, var(--primary-color) 8%, var(--bg-color))' : 'transparent',
                      borderColor: isSelected ? 'var(--primary-color)' : undefined
                    }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? conf.bg : 'bg-xinuco-surface border border-xinuco-border'} ${isSelected ? conf.color : 'text-xinuco-muted'}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className={`font-semibold text-sm ${isSelected ? 'text-xinuco-text' : 'text-xinuco-muted'}`}>
                        {conf.label}
                      </div>
                      <div className="text-xs text-xinuco-muted opacity-80 mt-0.5">
                        {conf.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
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
