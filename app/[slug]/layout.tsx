import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Business } from '@/types/database'

interface TenantLayoutProps {
  children: React.ReactNode
  params:   Promise<{ slug: string }>
}

/**
 * Genera metadata dinámica por tenant (SEO por negocio)
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, branding')
    .eq('slug', slug)
    .single()

  if (!business) {
    return { title: 'Xinuco' }
  }

  return {
    title:       `${business.name} — Xinuco`,
    description: `Gestiona tu agenda y negocio en ${business.name}.`,
  }
}

/**
 * TenantLayout — Layout principal multi-tenant.
 *
 * Hace fetch de la tabla `businesses` usando el [slug] de la URL,
 * inyecta las CSS variables del branding en el <body> y renderiza
 * el contenido de la ruta hija.
 *
 * Si el negocio no existe o está inactivo → 404/redirect.
 */
export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch del tenant por slug
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, name, slug, is_active, branding')
    .eq('slug', slug)
    .single<Business>()

  // 2. Guard: tenant no existe o inactivo
  if (error || !business || !business.is_active) {
    redirect('/not-found')
  }

  const { branding } = business

  // 3. Construir las CSS variables para inyectar en el body
  const cssVars: React.CSSProperties & Record<string, string> = {
    '--primary-color':   branding.primary_color   ?? '#C5A059',
    '--primary-dark':    shadeColor(branding.primary_color ?? '#C5A059', -20),
    '--secondary-color': branding.secondary_color ?? '#1A1A1A',
    '--bg-color':        branding.bg_color        ?? '#080808',
    '--text-color':      branding.text_color       ?? '#F4F4F4',
    '--border-color':    `${branding.secondary_color ?? '#1A1A1A'}CC`,
    '--font-family':     branding.font_family      ?? 'Inter',
  }

  return (
    <>
      {/*
        Inyectamos el logo font via Google Fonts si el tenant usa uno custom.
        Se hace aquí para que sea SSR y no bloquee el render.
      */}
      {branding.font_family && branding.font_family !== 'Inter' && (
        <style>{`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(branding.font_family)}:wght@400;600;700&display=swap');`}</style>
      )}

      {/* Las CSS vars se ponen en el body para que apliquen al subtree del tenant */}
      <body style={cssVars} className="min-h-screen antialiased">
        {children}
      </body>
    </>
  )
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Oscurece un color hex un % dado (negativo = más oscuro)
 */
function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + percent))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + percent))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + percent))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
