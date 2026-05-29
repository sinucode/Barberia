import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFixedAssets, getAssetPortfolioSummary } from '@/actions/fixed-assets'
import { FixedAssetsManager } from '@/components/dashboard/fixed-assets/FixedAssetsManager'
import { FeatureGate } from '@/components/dashboard/FeatureGate'
import type { Profile } from '@/types/database'

export const metadata: Metadata = {
  title: 'Activos Fijos — Xinuco',
  description: 'Inventario de activos fijos y cronograma de depreciación',
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function FixedAssetsPage({
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

  // 3. Cargar activos y resumen de portafolio en paralelo
  const [assetsResult, summaryResult] = await Promise.all([
    getFixedAssets(businessId),
    getAssetPortfolioSummary(businessId),
  ])

  const assets  = assetsResult.data  ?? []
  const summary = summaryResult.data ?? null

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<FixedAssetsSkeleton />}>
        <FeatureGate featureKey="fixed_assets" planName="Premium">
          <FixedAssetsManager
            assets={assets}
            summary={summary}
            businessId={businessId}
            slug={slug}
          />
        </FeatureGate>
      </Suspense>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function FixedAssetsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div
        className="flex items-center justify-between pb-6 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-40 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-3 w-64 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        </div>
        <div className="h-10 w-36 rounded-lg" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        ))}
      </div>

      {/* Asset cards skeleton */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        ))}
      </div>
    </div>
  )
}
