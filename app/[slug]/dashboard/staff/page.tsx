import { Suspense }            from 'react'
import { redirect }             from 'next/navigation'
import type { Metadata }        from 'next'
import { createClient }         from '@/lib/supabase/server'
import { getStaff }             from '@/actions/staff'
import type { Staff }           from '@/types/database'

import { StaffGrid }            from '@/components/staff/StaffGrid'
import { AddStaffButton }       from '@/components/staff/StaffModal'
import { Skeleton }             from '@/components/ui/Skeleton'
import { BottomNav }            from '@/components/layout/BottomNav'
import { Header }               from '@/components/layout/Header'
import type { Business }        from '@/types/database'

export const metadata: Metadata = {
  title: 'Equipo — Xinuco',
  description: 'Gestiona el personal de tu negocio.',
}

interface StaffPageProps {
  params: Promise<{ slug: string }>
}

function StaffGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" rounded="lg" />
      ))}
    </div>
  )
}

async function StaffLoader() {
  let staff: Staff[] = []

  try {
    const raw = await getStaff()
    staff = (raw ?? []) as Staff[]
  } catch (err) {
    console.error('[StaffPage] Error loading staff:', err)
  }

  return <StaffGrid initialStaff={staff} />
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { slug } = await params
  const supabase  = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  const [{ data: profileRaw }, { data: business }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('businesses').select('name, branding').eq('slug', slug).single<Pick<Business, 'name' | 'branding'>>(),
  ])
  const profileCasted = profileRaw as { full_name: string } | null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
      {business && (
        <Header
          business={business}
          userName={profileCasted?.full_name ?? undefined}
        />
      )}

      <main className="px-4 py-6 pb-28 max-w-5xl mx-auto">
        <div
          aria-hidden
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% -10%, color-mix(in srgb, var(--primary-color) 8%, transparent), transparent)',
          }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-xinuco-text">Equipo de Trabajo</h1>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Administra a tus barberos y manicuristas.
            </p>
          </div>

          <AddStaffButton />
        </div>

        <Suspense fallback={<StaffGridSkeleton />}>
          <StaffLoader />
        </Suspense>
      </main>

      <BottomNav slug={slug} />
    </div>
  )
}
