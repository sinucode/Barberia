import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkstations } from '@/actions/workstations'
import { WorkstationManager } from '@/components/dashboard/workstations/WorkstationManager'
import type { BusinessFeatures, Profile } from '@/types/database'

export const metadata: Metadata = {
  title: 'Estaciones — Xinuco',
  description: 'Gestión de estaciones de trabajo',
}

export default async function WorkstationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 1. Auth guard — redirige si no hay sesión activa
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // 2. Obtener perfil: business_id + role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
    .eq('id', user.id)
    .single<Pick<Profile, 'role' | 'business_id'>>()

  if (!profile?.business_id) redirect(`/${slug}/login`)

  // Role guard: solo admin puede acceder
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    redirect(`/${slug}/dashboard`)
  }

  // Feature gate: check workstations flag server-side
  const { data: biz } = await supabase
    .from('businesses')
    .select('features_enabled')
    .eq('slug', slug)
    .single<{ features_enabled: unknown }>()
  const features = (biz?.features_enabled ?? {}) as unknown as BusinessFeatures
  if (!features?.workstations) redirect(`/${slug}/dashboard`)

  // 3. Obtener estaciones de trabajo del negocio
  const workstations = await getWorkstations(profile.business_id)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<WorkstationsSkeleton />}>
        <WorkstationManager
          initialWorkstations={workstations}
          businessId={profile.business_id}
          slug={slug}
        />
      </Suspense>
    </div>
  )
}

/** Skeleton de carga elegante para la sección de estaciones */
function WorkstationsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-48 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-3 w-64 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        </div>
        <div className="h-10 w-36 rounded-lg" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        {/* Header row */}
        <div className="flex gap-4 px-5 py-3.5" style={{ background: 'var(--surface-color, rgba(255,255,255,0.03))' }}>
          <div className="h-3 w-32 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-3 w-20 rounded hidden sm:block" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-3 w-16 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        </div>

        {/* Data rows */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-32 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            </div>
            <div className="h-6 w-11 rounded-full hidden sm:block" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-6 w-6 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
