'use client'
// ============================================================
// components/super-admin/UserManager.tsx
// User management UI for a single business.
// ============================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  barber: 'Barbero',
  manicurist: 'Manicurista',
  super_admin: 'Super Admin',
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin'
  const isSuperAdmin = role === 'super_admin'

  const style = isAdmin || isSuperAdmin
    ? {
        color: '#C5A059',
        background: 'rgba(197,160,89,0.1)',
        border: '1px solid rgba(197,160,89,0.2)',
      }
    : {
        color: 'rgba(244,244,244,0.7)',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
      }

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={style}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.60)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md mx-4"
        style={{
          background: '#0D0D0D',
          border: '1px solid rgba(197,160,89,0.2)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-transparent rounded-lg px-3 py-2 text-sm focus:outline-none"
      style={{
        border: '1px solid rgba(197,160,89,0.2)',
        color: '#F4F4F4',
        ...(props.style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#C5A059'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(197,160,89,0.2)'
        props.onBlur?.(e)
      }}
    />
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-transparent rounded-lg px-3 py-2 text-sm focus:outline-none"
      style={{
        border: '1px solid rgba(197,160,89,0.2)',
        color: '#F4F4F4',
        background: '#0D0D0D',
        ...(props.style ?? {}),
      }}
    >
      {props.children}
    </select>
  )
}

// ── GoldButton ────────────────────────────────────────────────────────────────

function GoldButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: '#C5A059', color: '#080808' }}
    >
      {children}
    </button>
  )
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ border: '1px solid rgba(197,160,89,0.25)', color: '#C5A059' }}
    >
      {children}
    </button>
  )
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateUserModal({
  businessId,
  slug,
  onClose,
  onSuccess,
}: {
  businessId: string
  slug: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('barber')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    startTransition(async () => {
      const result = await createBusinessUser({
        businessId,
        slug,
        email,
        password,
        fullName,
        role,
      })
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? 'Error desconocido.')
      }
    })
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-base font-semibold mb-5" style={{ color: '#F4F4F4' }}>
        Nuevo usuario
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Nombre completo
          </label>
          <Input
            type="text"
            placeholder="Ej: Juan García"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Email
          </label>
          <Input
            type="email"
            placeholder="usuario@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Contraseña temporal
          </label>
          <Input
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Rol
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="admin">Admin</option>
            <option value="barber">Barbero</option>
            <option value="manicurist">Manicurista</option>
          </Select>
        </div>

        {error && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              color: '#f87171',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.20)',
            }}
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <GhostButton onClick={onClose} disabled={isPending}>
            Cancelar
          </GhostButton>
          <GoldButton type="submit" disabled={isPending}>
            {isPending ? 'Creando…' : 'Crear usuario'}
          </GoldButton>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Role Modal ───────────────────────────────────────────────────────────

function EditRoleModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User
  onClose: () => void
  onSuccess: () => void
}) {
  const [role, setRole] = useState<UserRole>(
    (['admin', 'barber', 'manicurist'].includes(user.role) ? user.role : 'barber') as UserRole,
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateUserRole(user.id, role)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? 'Error desconocido.')
      }
    })
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-base font-semibold mb-1" style={{ color: '#F4F4F4' }}>
        Editar rol
      </h2>
      <p className="text-sm mb-5" style={{ color: 'rgba(244,244,244,0.45)' }}>
        {user.full_name}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Nuevo rol
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="admin">Admin</option>
            <option value="barber">Barbero</option>
            <option value="manicurist">Manicurista</option>
          </Select>
        </div>

        {error && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              color: '#f87171',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.20)',
            }}
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <GhostButton onClick={onClose} disabled={isPending}>
            Cancelar
          </GhostButton>
          <GoldButton type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </GoldButton>
        </div>
      </form>
    </Modal>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmDanger,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmDanger?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Modal onClose={onClose}>
      <h2 className="text-base font-semibold mb-2" style={{ color: '#F4F4F4' }}>
        {title}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'rgba(244,244,244,0.55)' }}>
        {description}
      </p>

      <div className="flex justify-end gap-2">
        <GhostButton onClick={onClose} disabled={isPending}>
          Cancelar
        </GhostButton>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => { onConfirm() })}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            confirmDanger
              ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
              : { background: '#C5A059', color: '#080808' }
          }
        >
          {isPending ? 'Procesando…' : confirmLabel}
        </button>
      </div>
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

// ── Main Component ────────────────────────────────────────────────────────────

export function UserManager({ businessId, slug, users }: UserManagerProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [disableTarget, setDisableTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function refresh() {
    router.refresh()
  }

  async function handleDisable(user: User) {
    setActionError(null)
    const result = await disableUser(user.id)
    if (result.success) {
      setDisableTarget(null)
      refresh()
    } else {
      setActionError(result.error ?? 'Error al deshabilitar.')
      setDisableTarget(null)
    }
  }

  async function handleDelete(user: User) {
    setActionError(null)
    const result = await deleteUser(user.id)
    if (result.success) {
      setDeleteTarget(null)
      refresh()
    } else {
      setActionError(result.error ?? 'Error al eliminar.')
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: '#F4F4F4' }}>
          Usuarios ({users.length})
        </h2>
        <GoldButton onClick={() => setShowCreate(true)}>
          Nuevo usuario
        </GoldButton>
      </div>

      {/* Action error toast */}
      {actionError && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.20)',
            color: '#f87171',
          }}
        >
          {actionError}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(197,160,89,0.12)', background: 'rgba(255,255,255,0.02)' }}
      >
        {/* Header */}
        <div
          className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: '1fr 1fr 120px 110px 130px',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(244,244,244,0.40)',
            borderBottom: '1px solid rgba(197,160,89,0.10)',
          }}
        >
          <span>Nombre</span>
          <span>Email</span>
          <span>Rol</span>
          <span>Creado</span>
          <span className="text-right">Acciones</span>
        </div>

        {/* Rows */}
        {users.map((user, idx) => (
          <div
            key={user.id}
            className="grid gap-4 px-5 py-4 items-center transition-colors hover:bg-white/[0.02]"
            style={{
              gridTemplateColumns: '1fr 1fr 120px 110px 130px',
              borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
            }}
          >
            {/* Name */}
            <span className="text-sm font-medium truncate" style={{ color: '#F4F4F4' }}>
              {user.full_name}
            </span>

            {/* Email */}
            <span className="text-sm truncate" style={{ color: 'rgba(244,244,244,0.55)' }}>
              {user.email ?? '—'}
            </span>

            {/* Role badge */}
            <RoleBadge role={user.role} />

            {/* Created */}
            <span className="text-xs" style={{ color: 'rgba(244,244,244,0.40)' }}>
              {formatDate(user.created_at)}
            </span>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1.5">
              {user.role !== 'super_admin' && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditUser(user)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: '#C5A059' }}
                  >
                    Editar rol
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisableTarget(user)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: 'rgba(244,244,244,0.45)' }}
                  >
                    Deshabilitar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(user)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10"
                    style={{ color: 'rgba(239,68,68,0.75)' }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div
            className="px-5 py-12 text-center text-sm"
            style={{ color: 'rgba(244,244,244,0.35)' }}
          >
            No hay usuarios en este negocio.
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal
          businessId={businessId}
          slug={slug}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            refresh()
          }}
        />
      )}

      {/* Edit role modal */}
      {editUser && (
        <EditRoleModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null)
            refresh()
          }}
        />
      )}

      {/* Disable confirm */}
      {disableTarget && (
        <ConfirmModal
          title="Deshabilitar usuario"
          description={`¿Deshabilitar a ${disableTarget.full_name}? No podrá iniciar sesión, pero sus datos se conservarán.`}
          confirmLabel="Deshabilitar"
          onClose={() => setDisableTarget(null)}
          onConfirm={() => handleDisable(disableTarget)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Eliminar usuario"
          description={`¿Eliminar permanentemente a ${deleteTarget.full_name}? Esta acción no se puede deshacer. Todos sus datos serán eliminados.`}
          confirmLabel="Eliminar permanentemente"
          confirmDanger
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  )
}
