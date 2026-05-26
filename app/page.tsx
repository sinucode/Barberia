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

export default async function RootPage() {
  // Fetch server-side con service role (bypasses RLS — solo lectura pública)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await admin
    .from('businesses')
    .select('id, name, slug, branding')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const businesses: PublicBusiness[] = (data ?? []).map((b) => ({
    id:       b.id,
    name:     b.name,
    slug:     b.slug,
    branding: (b.branding as PublicBusiness['branding']) ?? null,
  }))

  return <XinucoLanding businesses={businesses} />
}
