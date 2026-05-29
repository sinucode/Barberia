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

export default async function RootPage() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Todas las consultas en paralelo — cero latencia extra
  const [businessesRes, citasRes, clientesRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, slug, branding')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    admin
      .from('appointments')
      .select('*', { count: 'exact', head: true }),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true }),
  ])

  const businesses: PublicBusiness[] = (businessesRes.data ?? []).map((b) => ({
    id:       b.id,
    name:     b.name,
    slug:     b.slug,
    branding: (b.branding as PublicBusiness['branding']) ?? null,
  }))

  const stats: LandingStats = {
    citasTotal: citasRes.count    ?? 0,
    barberias:  businesses.length,          // ya tenemos la lista completa
    clientes:   clientesRes.count ?? 0,
  }

  return <XinucoLanding businesses={businesses} stats={stats} />
}
