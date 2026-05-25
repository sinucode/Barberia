'use client'
// ============================================================
// components/super-admin/UserManager.tsx
// User management UI for a single business.
// ============================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Ban, Trash2, UserPlus, X } from 'lucide-react'
import {
  createBusinessUser,
  updateUserRole,
  disableUser,
  deleteUser,
} from '@/actions/super-admin'

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole = 'admin' | 'barber' | 'manicurist'

interface User {
  id: string
  full_name: string
  role: string
  created_at: string
  email?: string
}

interface UserManagerProps {
  businessId: string
  slug: string
  users: User[]
}

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  admin:       { label: 'Admin',       color: '#C5A059', bg: 'rgba(197,160,89,0.12)',  border: 'rgba(197,160,89,0.25)' },
  barber:      { label: 'Barbero',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
  manicurist:  { label: 'Manicurista', color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)' },
  super_admin: { label: 'Super Admin', color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)' },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', border: 'rgba(161,161,170,0.2)' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#111111', border: '1px solid rgba(197,160,89,0.2)' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(197,160,89,0.12)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: '#F4F4F4' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(244,244,244,0.45)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Form primitives ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'rgba(244,244,244,0.5)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(197,160,89,0.2)',
        color: '#F4F4F4',
        ...(props.style ?? {}),
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; props.onFocus?.(e) }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(197,160,89,0.2)'; props.onBlur?.(e) }}
    />
  )
}

function RoleSelect({ value, onChange }: { value: UserRole; onChange: (v: UserRole) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none cursor-pointer"
      style={{
        background: '#111111',
        border: '1px solid rgba(197,160,89,0.2)',
        color: '#F4F4F4',
      }}
    >
      <option value="admin">Admin</option>
      <option value="barber">Barbero</option>
      <option value="manicurist">Manicurista</option>
    </select>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p
      className="text-xs px-3 py-2.5 rounded-lg"
      style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
    >
      {msg}
    </p>
  )
}

function ModalActions({ onCancel, submitLabel, isPending, danger = false }: {
  onCancel: () => void
  submitLabel: string
  isPending: boolean
  danger?: boolean
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-40"
        style={{ border: '1px solid rgba(197,160,89,0.2)', color: 'rgba(197,160,89,0.8)' }}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={
          danger
            ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
            : { background: '#C5A059', color: '#080808' }
        }
      >
        {isPending ? 'Procesando…' : submitLabel}
      </button>
    </div>
  )
}

// ── Create user modal ─────────────────────────────────────────────────────────

function CreateUserModal({ businessId, slug, onClose, onSuccess }: {
  businessId: string; slug: string; onClose: () => void; onSuccess: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState<UserRole>('barber')
  const [error,    setError]    = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    startTransition(async () => {
      const result = await createBusinessUser({ businessId, slug, email, password, fullName, role })
      if (result.success) { onSuccess() } else { setError(result.error ?? 'Error desconocido.') }
    })
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nombre completo">
          <Input type="text" placeholder="Ej: Juan García" value={fullName}
            onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <Input type="email" placeholder="usuario@ejemplo.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Contraseña temporal">
          <Input type="password" placeholder="Mínimo 8 caracteres" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </Field>
        <Field label="Rol">
          <RoleSelect value={role} onChange={setRole} />
        </Field>
        {error && <ErrorBox msg={error} />}
        <ModalActions onCancel={onClose} submitLabel="Crear usuario" isPending={isPending} />
      </form>
    </Modal>
  )
}

// ── Edit role modal ───────────────────────────────────────────────────────────

function EditRoleModal({ user, onClose, onSuccess }: {
  user: User; onClose: () => void; onSuccess: () => void
}) {
  const [role,  setRole]  = useState<UserRole>(
    (['admin','barber','manicurist'].includes(user.role) ? user.role : 'barber') as UserRole
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateUserRole(user.id, role)
      if (result.success) { onSuccess() } else { setError(result.error ?? 'Error.') }
    })
  }

  return (
    <Modal title="Editar rol" onClose={onClose}>
      <p className="text-sm mb-4" style={{ color: 'rgba(244,244,244,0.5)' }}>
        Usuario: <span style={{ color: '#F4F4F4', fontWeight: 600 }}>{user.full_name}</span>
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nuevo rol">
          <RoleSelect value={role} onChange={setRole} />
        </Field>
        {error && <ErrorBox msg={error} />}
        <ModalActions onCancel={onClose} submitLabel="Guardar cambios" isPending={isPending} />
      </form>
    </Modal>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, description, confirmLabel, danger = false, onClose, onConfirm }: {
  title: string; description: string; confirmLabel: string
  danger?: boolean; onClose: () => void; onConfirm: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(() => { onConfirm() })
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'rgba(244,244,244,0.6)' }}>
        {description}
      </p>
      <form onSubmit={handleSubmit}>
        <ModalActions onCancel={onClose} submitLabel={confirmLabel} isPending={isPending} danger={danger} />
      </form>
    </Modal>
  )
}

// ── Format date ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function UserManager({ businessId, slug, users }: UserManagerProps) {
  const router = useRouter()
  const [showCreate,     setShowCreate]     = useState(false)
  const [editUser,       setEditUser]       = useState<User | null>(null)
  const [disableTarget,  setDisableTarget]  = useState<User | null>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<User | null>(null)
  const [actionError,    setActionError]    = useState<string | null>(null)

  function refresh() { router.refresh() }

  async function handleDisable(user: User) {
    setActionError(null)
    const result = await disableUser(user.id)
    if (result.success) { setDisableTarget(null); refresh() }
    else { setActionError(result.error ?? 'Error al deshabilitar.'); setDisableTarget(null) }
  }

  async function handleDelete(user: User) {
    setActionError(null)
    const result = await deleteUser(user.id)
    if (result.success) { setDeleteTarget(null); refresh() }
    else { setActionError(result.error ?? 'Error al eliminar.'); setDeleteTarget(null) }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#F4F4F4' }}>
            Usuarios
            <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(197,160,89,0.12)', color: '#C5A059' }}>
              {users.length}
            </span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#C5A059', color: '#080808' }}
        >
          <UserPlus size={14} />
          Nuevo usuario
        </button>
      </div>

      {/* Error global */}
      {actionError && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}
        >
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="ml-3 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabla */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(197,160,89,0.12)', background: 'rgba(255,255,255,0.01)' }}
      >
        {/* Encabezado de tabla */}
        <div
          className="grid px-5 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: 'minmax(140px,2fr) minmax(180px,2.5fr) 120px 100px 120px',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(244,244,244,0.35)',
            borderBottom: '1px solid rgba(197,160,89,0.10)',
          }}
        >
          <span>Nombre</span>
          <span>Email</span>
          <span>Rol</span>
          <span>Creado</span>
          <span className="text-right">Acciones</span>
        </div>

        {/* Filas */}
        {users.map((user, idx) => (
          <div
            key={user.id}
            className="grid px-5 py-4 items-center transition-colors hover:bg-white/[0.025]"
            style={{
              gridTemplateColumns: 'minmax(140px,2fr) minmax(180px,2.5fr) 120px 100px 120px',
              borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
            }}
          >
            {/* Nombre */}
            <span className="text-sm font-medium truncate pr-3" style={{ color: '#F4F4F4' }}>
              {user.full_name}
            </span>

            {/* Email */}
            <span className="text-xs truncate pr-3" style={{ color: 'rgba(244,244,244,0.5)' }}>
              {user.email ?? '—'}
            </span>

            {/* Rol */}
            <div>
              <RoleBadge role={user.role} />
            </div>

            {/* Fecha */}
            <span className="text-xs" style={{ color: 'rgba(244,244,244,0.35)' }}>
              {formatDate(user.created_at)}
            </span>

            {/* Acciones */}
            {user.role !== 'super_admin' ? (
              <div className="flex items-center justify-end gap-1">
                {/* Editar rol */}
                <button
                  type="button"
                  title="Editar rol"
                  onClick={() => setEditUser(user)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: '#C5A059' }}
                >
                  <Pencil size={14} />
                </button>
                {/* Deshabilitar */}
                <button
                  type="button"
                  title="Deshabilitar"
                  onClick={() => setDisableTarget(user)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(244,244,244,0.4)' }}
                >
                  <Ban size={14} />
                </button>
                {/* Eliminar */}
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => setDeleteTarget(user)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/15"
                  style={{ color: 'rgba(239,68,68,0.7)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <span className="text-right text-xs" style={{ color: 'rgba(244,244,244,0.2)' }}>—</span>
            )}
          </div>
        ))}

        {/* Empty state */}
        {users.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.15)' }}
            >
              <UserPlus size={18} style={{ color: 'rgba(197,160,89,0.6)' }} />
            </div>
            <p className="text-sm" style={{ color: 'rgba(244,244,244,0.35)' }}>
              No hay usuarios en este negocio
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: '#C5A059' }}
            >
              Crear primer usuario →
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      {showCreate && (
        <CreateUserModal businessId={businessId} slug={slug}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refresh() }}
        />
      )}
      {editUser && (
        <EditRoleModal user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); refresh() }}
        />
      )}
      {disableTarget && (
        <ConfirmModal
          title="Deshabilitar usuario"
          description={`¿Deshabilitar a ${disableTarget.full_name}? No podrá iniciar sesión, pero sus datos se conservarán.`}
          confirmLabel="Deshabilitar"
          onClose={() => setDisableTarget(null)}
          onConfirm={() => handleDisable(disableTarget)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Eliminar usuario"
          description={`¿Eliminar permanentemente a ${deleteTarget.full_name}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar permanentemente"
          danger
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  )
}
