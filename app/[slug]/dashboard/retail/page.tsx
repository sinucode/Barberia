import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FeatureGate } from '@/components/dashboard/FeatureGate'
import { RetailPOS } from '@/components/dashboard/retail/RetailPOS'
import type { Profile } from '@/types/database'

export const metadata: Metadata = {
  title: 'Punto de Venta — Xinuco',
  description: 'Venta directa de productos sin cita previa',
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function RetailPage({
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

  // 3. Cargar datos en paralelo
  const [shiftResult, salesResult, staffResult] = await Promise.all([
    // Turno abierto actual
    supabase
      .from('cash_register_shifts')
      .select('id, status, opened_at, opening_balance')
      .eq('business_id', businessId)
      .eq('status', 'open')
      .maybeSingle(),

    // Últimas 20 ventas retail (sin cita, completadas)
    supabase
      .from('sales')
      .select('id, total_amount, created_at, status, customer_id')
      .eq('business_id', businessId)
      .is('appointment_id', null)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(20),

    // Lista de empleados activos
    supabase
      .from('staff')
      .select('id, full_name')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
  ])

  const currentShift = shiftResult.data ?? null
  const recentSales  = salesResult.data ?? []
  const staffList    = staffResult.data ?? []

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-24">
      <Suspense fallback={<RetailPOSSkeleton />}>
        <FeatureGate featureKey="retail_sales" planName="Profesional">
          <RetailPOS
            businessId={businessId}
            slug={slug}
            currentShift={currentShift}
            recentSales={recentSales}
            staffList={staffList}
          />
        </FeatureGate>
      </Suspense>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function RetailPOSSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse pt-6">
      {/* Header skeleton */}
      <div
        className="flex items-center gap-4 pb-6 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-44 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-3 w-64 rounded-md" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        </div>
      </div>

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <div className="h-48 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-40 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-32 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
