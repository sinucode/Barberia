import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCommissionRules } from '@/actions/commissions'
import { getServices } from '@/actions/services'
import { CommissionManager } from '@/components/dashboard/commissions/CommissionManager'
import type { Staff, BusinessFeatures, Profile } from '@/types/database'

export const metadata: Metadata = {
  title: 'Comisiones — Xinuco',
  description: 'Motor de comisiones variables para el equipo',
}

export default async function CommissionsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // 1. Auth guard
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const businessId = profile.business_id

  // Feature gate: check commissions flag server-side
  const { data: biz } = await supabase
    .from('businesses')
    .select('features_enabled')
    .eq('slug', slug)
    .single<{ features_enabled: unknown }>()
  const features = (biz?.features_enabled ?? {}) as unknown as BusinessFeatures
  if (!features?.commissions) redirect(`/${slug}/dashboard`)

  // 3. Cargar datos en paralelo
  const [rules, services, staffResult] = await Promise.all([
    getCommissionRules(businessId),
    getServices(businessId),
    supabase
      .from('staff')
      .select('id, full_name, specialty_role, is_active')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('full_name'),
  ])

  const staff = (staffResult.data ?? []) as Pick<
    Staff,
    'id' | 'full_name' | 'specialty_role' | 'is_active'
  >[]

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<CommissionsSkeleton />}>
        <CommissionManager
          initialRules={rules}
          staff={staff}
          services={services}
          businessId={businessId}
          slug={slug}
        />
      </Suspense>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function CommissionsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div
        className="flex items-center justify-between pb-6 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl"
            style={{ background: 'var(--surface-color, #1a1a1a)' }}
          />
          <div className="flex flex-col gap-2">
            <div
              className="h-6 w-48 rounded-md"
              style={{ background: 'var(--surface-color, #1a1a1a)' }}
            />
            <div
              className="h-3 w-64 rounded-md"
              style={{ background: 'var(--surface-color, #1a1a1a)' }}
            />
          </div>
        </div>
        <div
          className="h-10 w-36 rounded-lg"
          style={{ background: 'var(--surface-color, #1a1a1a)' }}
        />
      </div>

      {/* Table skeleton */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-color)' }}
      >
        <div
          className="flex gap-4 px-5 py-3.5"
          style={{ background: 'var(--surface-color, rgba(255,255,255,0.03))' }}
        >
          {[32, 40, 24, 24, 16].map((w, i) => (
            <div
              key={i}
              className={`h-3 w-${w} rounded`}
              style={{ background: 'var(--surface-color, #1a1a1a)' }}
            />
          ))}
        </div>

        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <div className="flex-1 h-4 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-4 w-24 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-6 w-12 rounded-full" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-6 w-6 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
