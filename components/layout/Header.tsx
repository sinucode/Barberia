import Image     from 'next/image'
import { Scissors } from 'lucide-react'
import type { Business } from '@/types/database'

interface HeaderProps {
  business: Pick<Business, 'name' | 'branding'>
  /** Nombre completo del usuario logueado */
  userName?: string
}

/**
 * Header — Barra superior del tenant.
 *
 * Muestra el logo (si existe en branding.logo_url) o un ícono fallback,
 * el nombre del negocio, y el avatar del usuario.
 * Es un Server Component (sin 'use client').
 */
export function Header({ business, userName }: HeaderProps) {
  const { branding } = business
  const initials = userName
    ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-40 glass border-b border-xinuco-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        {/* Logo + Nombre */}
        <div className="flex items-center gap-3">
          {branding.logo_url ? (
            <Image
              src={branding.logo_url}
              alt={`Logo de ${business.name}`}
              width={36}
              height={36}
              className="rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary-color)' }}
            >
              <Scissors size={18} color="var(--bg-color)" strokeWidth={2.5} />
            </div>
          )}

          <span className="font-bold text-sm text-xinuco-text leading-tight line-clamp-1">
            {business.name}
          </span>
        </div>

        {/* Avatar del usuario */}
        {userName && (
          <div
            aria-label={`Sesión de ${userName}`}
            title={userName}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--primary-color) 25%, transparent)',
              color:      'var(--primary-color)',
              border:     '1.5px solid var(--primary-color)',
            }}
          >
            {initials}
          </div>
        )}
      </div>
    </header>
  )
}
