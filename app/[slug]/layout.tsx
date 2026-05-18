import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
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
    .single<Business>()

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

const FONT_DICTIONARY: Record<string, { className: string; variable: string }> = {
  inter: inter,
  playfair: playfair,
  oswald: oswald,
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Consultar la base de datos extrayendo el brand_config (JSONB)
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, brand_config, is_active')
    .eq('slug', slug)
    .single<Business>()

  if (!business || !business.is_active) {
    notFound()
  }

  // Extraer variables con fallbacks seguros
  const brandConfig = (business.brand_config as BrandConfig) || {}
  const primaryColor = brandConfig.primaryColor || '#C5A059'
  const fontFamilyRaw = brandConfig.fontFamily || 'inter'
  
  // Normalizar llave del diccionario de fuentes
  const normalizedFontKey = fontFamilyRaw.toLowerCase().replace(/\s+/g, '')
  const selectedFont = FONT_DICTIONARY[normalizedFontKey] || FONT_DICTIONARY.inter

  return (
    <div 
      className={`${selectedFont.className} ${selectedFont.variable} min-h-screen antialiased flex flex-col`}
      style={{ 
        '--brand-primary': primaryColor,
        // Compatibilidad con variables previas de tokens heredados
        '--primary-color': primaryColor, 
        '--bg-color': '#080808', // Respaldo global
        '--text-color': '#F4F4F4', // Respaldo global
      } as React.CSSProperties}
    >
      {children}
    </div>
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
