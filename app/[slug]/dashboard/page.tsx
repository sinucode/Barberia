import { Suspense }           from 'react'
import { createClient }        from '@/lib/supabase/server'
import { redirect }            from 'next/navigation'
import type { Metadata }       from 'next'
import type { Business }       from '@/types/database'

import { Header }              from '@/components/layout/Header'
import { BottomNav }           from '@/components/layout/BottomNav'
import { DashboardContent }    from '@/components/dashboard/DashboardContent'
import { DashboardSkeleton }   from '@/components/dashboard/DashboardSkeleton'

export const metadata: Metadata = {
  title: 'Dashboard — Xinuco',
}

interface DashboardPageProps {
  params: Promise<{ slug: string }>
}

/**
 * DashboardPage — Orquestador del panel principal.
 *
 * Arquitectura de streaming:
 *  1. El Header se renderiza INMEDIATAMENTE (datos ya disponibles desde el TenantLayout).
 *  2. <DashboardContent> es un async Server Component envuelto en <Suspense>.
 *     Mientras resuelve sus queries, el usuario ve <DashboardSkeleton> (shimmer animado).
 *  3. Una vez que la data llega, React hace streaming del contenido real sin re-hidratación completa.
 *
 * Nota: business y userName se obtienen aquí de forma liviana (solo select name/branding/full_name)
 * para poder renderizar el Header sin esperar todo el DashboardContent.
 */
export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params
  const supabase  = await createClient()

  // Guard rápido de sesión — el Header lo necesita para el avatar
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // Fetch mínimo para el Header (paralelo, no bloquea DashboardContent)
  const [{ data: profile }, { data: business }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('businesses')
      .select('name, branding')
      .eq('slug', slug)
      .single<Pick<Business, 'name' | 'branding'>>(),
  ])

  return (
    <div className="min-h-screen bg-xinuco-bg">
      {/* Header — se pinta de inmediato */}
      {business && (
        <Header
          business={business}
          userName={profile?.full_name ?? undefined}
        />
      )}

      {/* Contenido principal con streaming */}
      <main className="px-4 py-6 pb-24 space-y-6 max-w-2xl mx-auto">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent slug={slug} />
        </Suspense>
      </main>

      {/* Bottom Nav — siempre visible */}
      <BottomNav slug={slug} />
    </div>
  )
}
