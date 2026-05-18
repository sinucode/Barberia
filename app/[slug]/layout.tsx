import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Business, BrandConfig } from '@/types/database'

// ════════════════════════════════════════════════════════════════════════════════
// DICCIONARIO DE FUENTES SSR — next/font/google (Zero-Flicker)
// Cada fuente se pre-carga en build-time. Sin @import, sin FOUT.
// ════════════════════════════════════════════════════════════════════════════════

import { Inter, Playfair_Display, Oswald } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

const oswald = Oswald({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-oswald',
})

/**
 * Mapa que traduce el string de la BD al className de next/font.
 * El key se normaliza a minúsculas para tolerancia a errores.
 * Fallback: Inter (siempre).
 */
const FONT_MAP: Record<string, { className: string; variable: string }> = {
  inter:     { className: inter.className,     variable: inter.variable },
  playfair:  { className: playfair.className,  variable: playfair.variable },
  oswald:    { className: oswald.className,    variable: oswald.variable },
}

function resolveFontClass(fontKey?: string): { className: string; variable: string } {
  if (!fontKey) return FONT_MAP.inter
  const normalized = fontKey.trim().toLowerCase().replace(/[\s_-]+/g, '')
  // Tolerancia: "Playfair Display" → "playfairdisplay" → match "playfair"
  const match = Object.keys(FONT_MAP).find(key => normalized.startsWith(key))
  return match ? FONT_MAP[match] : FONT_MAP.inter
}

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_BRAND_CONFIG: BrandConfig = {
  primaryColor: '#C5A059',
  fontFamily:   'inter',
}

// ════════════════════════════════════════════════════════════════════════════════
// METADATA DINÁMICA (SEO por Tenant)
// ════════════════════════════════════════════════════════════════════════════════

interface TenantLayoutProps {
  children: React.ReactNode
  params:   Promise<{ slug: string }>
}

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

// ════════════════════════════════════════════════════════════════════════════════
// TENANT LAYOUT — Server Component (Zero-Flicker Theme Engine)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * TenantLayout — Layout principal multi-tenant.
 *
 * 1. Fetch del tenant por slug.
 * 2. Lee `brand_config` (JSONB) + `branding` (legacy JSONB).
 * 3. Resuelve la fuente SSR via next/font (Zero-Flicker, sin useEffect).
 * 4. Inyecta CSS vars + className de fuente en el <body>.
 */
export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch del tenant
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, name, slug, is_active, branding, brand_config')
    .eq('slug', slug)
    .single<Business>()

  // 2. Guard: tenant no existe o inactivo
  if (error || !business || !business.is_active) {
    redirect('/not-found')
  }

  // 3. Extraer configuraciones
  const { branding } = business
  const brandConfig: BrandConfig = (business.brand_config as BrandConfig) ?? DEFAULT_BRAND_CONFIG

  // 4. Resolver fuente SSR (Zero-Flicker)
  //    Prioridad: brand_config.fontFamily > branding.font_family > "inter"
  const fontKey = brandConfig.fontFamily || branding.font_family || 'inter'
  const { className: fontClassName, variable: fontVariable } = resolveFontClass(fontKey)

  // 5. Construir CSS variables para inyección en el body
  const cssVars: React.CSSProperties & Record<string, string> = {
    // ── brand_config tokens (nuevos) ──
    '--brand-primary':   brandConfig.primaryColor || '#C5A059',

    // ── branding tokens (legacy, retrocompatibilidad) ──
    '--primary-color':   branding.primary_color   ?? '#C5A059',
    '--primary-dark':    shadeColor(branding.primary_color ?? '#C5A059', -20),
    '--secondary-color': branding.secondary_color ?? '#1A1A1A',
    '--bg-color':        branding.bg_color        ?? '#080808',
    '--text-color':      branding.text_color      ?? '#F4F4F4',
    '--border-color':    `${branding.secondary_color ?? '#1A1A1A'}CC`,
    '--font-family':     fontKey,
  }

  return (
    <>
      {/* Las CSS vars + fuente SSR se inyectan en el body para el subtree del tenant */}
      <body
        className={`${fontClassName} ${fontVariable} min-h-screen antialiased`}
        style={cssVars}
        suppressHydrationWarning
      >
        {children}
      </body>
    </>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

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
