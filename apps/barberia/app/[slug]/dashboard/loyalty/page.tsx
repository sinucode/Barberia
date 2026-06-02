import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@xinuco/supabase/server'
import { getLoyaltySettings, getLoyaltyHistory } from '@/actions/loyalty'
import { LoyaltyDashboard } from '@/components/dashboard/loyalty/LoyaltyDashboard'
import type { BusinessFeatures, Profile } from '@xinuco/types'

export const metadata: Metadata = {
  title: 'Lealtad — Xinuco',
  description: 'Programa de puntos de lealtad para clientes',
}

export default async function LoyaltyPage({
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

  // Feature gate: check loyalty flag server-side
  const { data: biz } = await supabase
    .from('businesses')
    .select('features_enabled')
    .eq('slug', slug)
    .single<{ features_enabled: unknown }>()
  const features = (biz?.features_enabled ?? {}) as unknown as BusinessFeatures
  if (!features?.loyalty) redirect(`/${slug}/dashboard`)

  // 3. Cargar datos en paralelo
  const [settings, history] = await Promise.all([
    getLoyaltySettings(businessId),
    getLoyaltyHistory(businessId),
  ])

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<LoyaltySkeleton />}>
        <LoyaltyDashboard
          businessId={businessId}
          initialSettings={settings}
          initialHistory={history}
          slug={slug}
        />
      </Suspense>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function LoyaltySkeleton() {
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
              className="h-6 w-40 rounded-md"
              style={{ background: 'var(--surface-color, #1a1a1a)' }}
            />
            <div
              className="h-3 w-64 rounded-md"
              style={{ background: 'var(--surface-color, #1a1a1a)' }}
            />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, #1a1a1a)' }}
          >
            <div className="h-3 w-24 rounded mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-7 w-16 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-color)' }}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}
          >
            <div className="flex-1 h-4 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-4 w-20 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-4 w-20 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
