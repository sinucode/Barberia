import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getExpenses, getProfitLoss } from '@/actions/expenses'
import { ExpenseManager } from '@/components/dashboard/expenses/ExpenseManager'

export const metadata: Metadata = {
  title: 'Gastos — Xinuco',
  description: 'Registro de gastos y estado de resultados (P&G)',
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
  const now   = new Date()
  const from  = new Date(now.getFullYear(), now.getMonth(), 1)
  const to    = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo:   to.toISOString().slice(0, 10),
  }
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function ExpensesPage({
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

  // 2. Obtener business_id desde el perfil autenticado
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  if (!profile?.business_id) redirect(`/${slug}/login`)

  const businessId = profile.business_id
  const { dateFrom, dateTo } = getCurrentMonthRange()

  // 3. Cargar gastos y P&G del mes actual en paralelo
  const [expenses, pl] = await Promise.all([
    getExpenses(businessId, dateFrom, dateTo),
    getProfitLoss(businessId, dateFrom, dateTo).catch(() => null),
  ])

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<ExpensesSkeleton />}>
        <ExpenseManager
          initialExpenses={expenses}
          initialPL={pl}
          businessId={businessId}
          slug={slug}
          initialDateFrom={dateFrom}
          initialDateTo={dateTo}
        />
      </Suspense>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function ExpensesSkeleton() {
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
            <div className="h-6 w-36 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-3 w-56 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        </div>
        <div className="h-10 w-32 rounded-lg" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
      </div>

      {/* Month picker skeleton */}
      <div className="h-10 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />

      {/* P&G cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[72px] rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
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
          {[48, 32, 24, 16].map((w, i) => (
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
            <div className="flex-1 h-4 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-4 w-20 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-4 w-24 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
            <div className="h-6 w-6 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
