import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import XinucoLanding from '@/components/landing/XinucoLanding'

export const metadata: Metadata = {
  title: 'Xinuco — Tecnología · Inteligencia · Impacto',
  description:
    'Software de gestión inteligente para negocios. Barberías, lavanderías, fumigaciones y más. Agenda, inventario, finanzas y control en un solo lugar.',
  openGraph: {
    title: 'Xinuco — Tecnología · Inteligencia · Impacto',
    description: 'Software de gestión inteligente para negocios LATAM.',
    url: 'https://xinuco.com',
    siteName: 'Xinuco',
    locale: 'es_CO',
    type: 'website',
  },
}

export type PublicBusiness = {
  id:       string
  name:     string
  slug:     string
  branding: { logo_url?: string; primary_color?: string } | null
}

export type LandingStats = {
  citasTotal: number
  barberias:  number
  clientes:   number
}

// Renderizado bajo demanda: la landing muestra stats en vivo cuando las env
// vars de Supabase están presentes en runtime, sin prerenderizar en build
// (lo que fallaría si Supabase no está configurado en el entorno de build).
export const dynamic = 'force-dynamic'

const EMPTY_STATS: LandingStats = { citasTotal: 0, barberias: 0, clientes: 0 }

/**
 * fetchLandingData — Obtiene negocios y stats de forma resiliente.
 * Si faltan las env vars de Supabase o la consulta falla, devuelve datos
 * vacíos en vez de romper el render/build.
 */
async function fetchLandingData(): Promise<{ businesses: PublicBusiness[]; stats: LandingStats }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Sin credenciales (ej. build sin env) → landing con datos vacíos.
  if (!url || !serviceKey) {
    return { businesses: [], stats: EMPTY_STATS }
  }

  try {
    const admin = createClient(url, serviceKey)

    const [businessesRes, citasRes, clientesRes] = await Promise.all([
      admin
        .from('businesses')
        .select('id, name, slug, branding')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      admin.from('appointments').select('*', { count: 'exact', head: true }),
      admin.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    const businesses: PublicBusiness[] = (businessesRes.data ?? []).map((b) => ({
      id:       b.id,
      name:     b.name,
      slug:     b.slug,
      branding: (b.branding as PublicBusiness['branding']) ?? null,
    }))

    const stats: LandingStats = {
      citasTotal: citasRes.count    ?? 0,
      barberias:  businesses.length,
      clientes:   clientesRes.count ?? 0,
    }

    return { businesses, stats }
  } catch (err) {
    console.error('[landing] No se pudieron cargar las stats:', err)
    return { businesses: [], stats: EMPTY_STATS }
  }
}

export default async function RootPage() {
  const { businesses, stats } = await fetchLandingData()
  return <XinucoLanding businesses={businesses} stats={stats} />
}
