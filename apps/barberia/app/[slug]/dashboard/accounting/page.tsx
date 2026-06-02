import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@xinuco/supabase/server'
import { getJournalEntries, getAccountingSummary } from '@/actions/accounting'
import { AccountingJournal } from '@/components/dashboard/accounting/AccountingJournal'
import type { BusinessFeatures, Profile } from '@xinuco/types'

export const metadata: Metadata = {
  title: 'Contabilidad — Xinuco',
  description: 'Trazabilidad contable unificada: ingresos, egresos y posición neta',
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
  const now  = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo:   now.toISOString().slice(0, 10),
  }
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function AccountingPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; type?: string }>
}) {
  const { slug }                              = await params
  const { dateFrom: qFrom, dateTo: qTo, type: qType } = await searchParams

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

  // 3. Feature gate: verificar advanced_reports server-side
  const { data: biz } = await supabase
    .from('businesses')
    .select('features_enabled')
    .eq('slug', slug)
    .single<{ features_enabled: unknown }>()

  const features = (biz?.features_enabled ?? {}) as unknown as BusinessFeatures
  if (!features?.advanced_reports) redirect(`/${slug}/dashboard`)

  // 4. Rango de fechas: searchParams tienen prioridad, luego el mes actual
  const { dateFrom: defaultFrom, dateTo: defaultTo } = getCurrentMonthRange()
  const dateFrom = qFrom ?? defaultFrom
  const dateTo   = qTo   ?? defaultTo

  // 5. Carga paralela de resumen y entradas del diario
  const [summaryResult, entriesResult] = await Promise.all([
    getAccountingSummary(businessId, dateFrom, dateTo),
    getJournalEntries(businessId, {
      dateFrom,
      dateTo,
      entryType: qType === 'income' || qType === 'expense' ? qType : undefined,
    }),
  ])

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<AccountingSkeleton />}>
        <AccountingJournal
          entries={entriesResult.data ?? []}
          summary={summaryResult.data}
          businessId={businessId}
          slug={slug}
          currentDateFrom={dateFrom}
          currentDateTo={dateTo}
          currentType={qType}
        />
      </Suspense>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function AccountingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div
        className="flex items-center gap-4 pb-6 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-48 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-3 w-72 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        </div>
      </div>

      {/* Date filter skeleton */}
      <div className="h-10 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, #1a1a1a)' }}
          >
            <div className="h-3 w-24 rounded mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-8 w-28 rounded"       style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
        ))}
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
          {[48, 24, 32, 16].map((w, i) => (
            <div key={i} className="h-3 rounded" style={{ width: `${w * 4}px`, background: 'var(--surface-color, #1a1a1a)' }} />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <div className="w-24 h-4 rounded"  style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="w-16 h-5 rounded-full" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="flex-1 h-4 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="w-20 h-5 rounded-full" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="w-24 h-4 rounded"  style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
