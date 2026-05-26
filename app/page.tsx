import type { Metadata } from 'next'
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

export default function RootPage() {
  return <XinucoLanding />
}
