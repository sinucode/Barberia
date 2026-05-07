import Image from 'next/image'
import { Scissors } from 'lucide-react'
import type { Business } from '@/types/database'
import { AvatarSkeleton } from '@/components/ui/Skeleton'

interface HeaderProps {
  business:  Pick<Business, 'name' | 'branding'>
  userName?: string
  /** Si true, muestra skeleton del avatar mientras el perfil carga */
  isLoading?: boolean
}

/**
 * Header Premium — Server Component.
 *
 * Izquierda: fecha de hoy con formato elegante (ej. "Jueves, 24 Oct")
 * Centro:    nombre del negocio con logo/fallback
 * Derecha:   avatar con iniciales del usuario logueado (o Skeleton)
 *
 * Sticky top-0, backdrop-blur, bg-xinuco-bg/80
 */
export function Header({ business, userName, isLoading = false }: HeaderProps) {
  const { branding } = business

  // ── Fecha elegante ────────────────────────────────────────────
  const today = new Date()
  const dayName = today.toLocaleDateString('es-MX', { weekday: 'long' })
  const dayNum  = today.getDate()
  const month   = today.toLocaleDateString('es-MX', { month: 'short' })
  // "jueves, 24 may" → capitalizar primera letra
  const dateLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dayNum} ${month}`

  // ── Iniciales del usuario ─────────────────────────────────────
  const initials = userName
    ? userName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-40 bg-xinuco-bg/80 backdrop-blur-md border-b border-xinuco-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto gap-3">

        {/* ── Izquierda: fecha ──────────────────────────────── */}
        <div className="flex flex-col min-w-0">
          <time
            dateTime={today.toISOString().split('T')[0]}
            className="text-xs font-medium text-xinuco-muted leading-none"
          >
            {dateLabel}
          </time>
          {/* Nombre del negocio bajo la fecha */}
          <div className="flex items-center gap-1.5 mt-1">
            {branding.logo_url ? (
              <Image
                src={branding.logo_url}
                alt={`Logo de ${business.name}`}
                width={16}
                height={16}
                className="rounded object-cover shrink-0"
              />
            ) : (
              <Scissors
                size={13}
                strokeWidth={2.5}
                className="shrink-0"
                style={{ color: 'var(--primary-color)' }}
              />
            )}
            <span className="text-sm font-semibold text-xinuco-text leading-none truncate">
              {business.name}
            </span>
          </div>
        </div>

        {/* ── Derecha: avatar ───────────────────────────────── */}
        {isLoading ? (
          <AvatarSkeleton />
        ) : (
          <button
            id="btn-user-avatar"
            aria-label={userName ? `Perfil de ${userName}` : 'Perfil'}
            title={userName ?? 'Perfil'}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                       transition-all duration-200 hover:opacity-80 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: 'color-mix(in srgb, var(--primary-color) 20%, transparent)',
              color:       'var(--primary-color)',
              border:      '1.5px solid color-mix(in srgb, var(--primary-color) 50%, transparent)',
            }}
          >
            {initials}
          </button>
        )}
      </div>
    </header>
  )
}
