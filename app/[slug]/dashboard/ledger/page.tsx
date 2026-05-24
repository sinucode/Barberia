import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffBalances } from '@/actions/ledger'
import { LedgerManager } from '@/components/dashboard/ledger/LedgerManager'

export const metadata: Metadata = {
  title: 'Billetera del Staff — Xinuco',
  description: 'Ledger digital: comisiones, propinas, anticipos y liquidaciones del equipo',
}

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // 1. Auth guard — mismo patrón que commissions/page.tsx
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // 2. Obtener business_id desde el perfil autenticado
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  if (!profile?.business_id) redirect(`/${slug}/login`)

  const businessId = profile.business_id

  // 3. Cargar saldos de todo el staff en paralelo
  const balances = await getStaffBalances(businessId)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<LedgerPageSkeleton />}>
        <LedgerManager
          initialBalances={balances}
          businessId={businessId}
          slug={slug}
        />
      </Suspense>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function LedgerPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div
        className="flex items-center justify-between pb-6 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col gap-2">
          <div
            className="h-6 w-52 rounded-md"
            style={{ background: 'var(--surface-color, #1a1a1a)' }}
          />
          <div
            className="h-3 w-72 rounded-md"
            style={{ background: 'var(--surface-color, #1a1a1a)' }}
          />
        </div>
        <div
          className="h-10 w-32 rounded-lg"
          style={{ background: 'var(--surface-color, #1a1a1a)' }}
        />
      </div>

      {/* Staff tabs skeleton */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-9 w-28 rounded-xl"
            style={{ background: 'var(--surface-color, #1a1a1a)' }}
          />
        ))}
      </div>

      {/* Balance card skeleton */}
      <div
        className="rounded-2xl p-5"
        style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.03))' }}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-20 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-8 w-40 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
          <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-2.5 w-16 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
              <div className="h-4 w-20 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            </div>
          ))}
        </div>
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
          {[20, 24, 48, 20].map((w, i) => (
            <div
              key={i}
              className={`h-3 w-${w} rounded`}
              style={{ background: 'var(--surface-color, #1a1a1a)' }}
            />
          ))}
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <div className="h-5 w-20 rounded-full" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="flex-1 h-4 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-4 w-32 rounded hidden md:block" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-4 w-20 rounded hidden sm:block" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
