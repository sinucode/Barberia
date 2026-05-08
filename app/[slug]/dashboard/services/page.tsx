import { Suspense }            from 'react'
import { redirect }             from 'next/navigation'
import type { Metadata }        from 'next'
import { createClient }         from '@/lib/supabase/server'
import { getServices }          from '@/actions/services'
import type { Service }         from '@/types/database'

import { ServiceTable }         from '@/components/services/ServiceTable'
import { AddServiceButton }     from '@/components/services/ServiceModal'
import { Skeleton }             from '@/components/ui/Skeleton'
import { BottomNav }            from '@/components/layout/BottomNav'
import { Header }               from '@/components/layout/Header'
import type { Business }        from '@/types/database'

export const metadata: Metadata = {
  title: 'Servicios — Xinuco',
  description: 'Gestiona el catálogo de servicios de tu negocio.',
}

interface ServicesPageProps {
  params: Promise<{ slug: string }>
}

// ── Skeleton de carga de la tabla ────────────────────────────────────────────────
function ServiceTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" rounded="md" />
      ))}
    </div>
  )
}

// ── Loader de servicios (async Server Component) ─────────────────────────────────
async function ServicesLoader({ slug }: { slug: string }) {
  let services: Service[] = []

  try {
    const raw = await getServices()
    // Supabase RLS ya filtra por business_id — cast seguro
    services = (raw ?? []) as Service[]
  } catch (err) {
    console.error('[ServicesPage] Error loading services:', err)
  }

  return <ServiceTable initialServices={services} />
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export default async function ServicesPage({ params }: ServicesPageProps) {
  const { slug } = await params
  const supabase  = await createClient()

  // Guard de sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // Fetch mínimo para el Header (paralelo con la carga de servicios)
  const [{ data: profileRaw }, { data: business }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('businesses').select('name, branding').eq('slug', slug).single<Pick<Business, 'name' | 'branding'>>(),
  ])

  const profile = profileRaw as { full_name: string } | null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
      {/* Header reutilizable del tenant */}
      {business && (
        <Header
          business={business}
          userName={profile?.full_name ?? undefined}
        />
      )}

      <main className="px-4 py-6 pb-28 max-w-3xl mx-auto">
        {/* Hero sutil de sección */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% -10%, color-mix(in srgb, var(--primary-color) 10%, transparent), transparent)',
          }}
        />

        {/* Cabecera de la página */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-xinuco-text">Catálogo de Servicios</h1>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Gestiona los servicios que ofrece tu negocio.
            </p>
          </div>

          {/* Botón que abre el modal de creación */}
          <AddServiceButton />
        </div>

        {/* Tabla con streaming via Suspense */}
        <Suspense fallback={<ServiceTableSkeleton />}>
          <ServicesLoader slug={slug} />
        </Suspense>
      </main>

      <BottomNav slug={slug} />
    </div>
  )
}
