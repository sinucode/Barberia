import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@xinuco/supabase/server'
import { ReportsManager } from '@/components/dashboard/reports/ReportsManager'
import type { Business, Profile } from '@xinuco/types'

export const metadata: Metadata = {
  title: 'Reportes — Xinuco',
  description: 'KPIs y reportes del negocio',
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function getTodayRange(): { start: string; end: string } {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return {
    start: start.toISOString(),
    end:   end.toISOString(),
  }
}

function getWeekRange(): { start: string; end: string } {
  const now       = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const monday    = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: monday.toISOString(),
    end:   sunday.toISOString(),
  }
}

function getMonthRange(): { start: string; end: string } {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return {
    start: start.toISOString(),
    end:   end.toISOString(),
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportsKPIs {
  citasHoy:             number
  ingresosHoy:          number   // INTEGER COP
  ingresosMes:          number   // INTEGER COP
  citasCompletadasMes:  number
}

export interface TopService {
  description: string
  citas:       number
  revenue:     number  // INTEGER COP
}

export interface TopStaff {
  staffId:    string
  name:       string
  citas:      number
  revenue:    number  // INTEGER COP
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const { slug }   = await params
  const { period } = await searchParams

  const activePeriod: 'hoy' | 'semana' | 'mes' =
    period === 'hoy' || period === 'semana' || period === 'mes'
      ? period
      : 'mes'

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

  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', slug)
    .single<Pick<Business, 'id' | 'name' | 'slug'>>()

  if (!biz) redirect(`/${slug}/login`)

  // 3. Rangos de fecha
  const today = getTodayRange()
  const week  = getWeekRange()
  const month = getMonthRange()

  // 4. Queries en paralelo
  const [
    todayAppts,
    todaySales,
    monthSales,
    monthCompletedAppts,
    monthSaleItems,
    monthStaffAppts,
    monthStaffSaleItems,
  ] = await Promise.all([
    // Citas hoy (scheduled + completed)
    supabase
      .from('appointments')
      .select('id, status')
      .eq('business_id', businessId)
      .in('status', ['scheduled', 'completed'])
      .gte('created_at', today.start)
      .lte('created_at', today.end),

    // Ingresos hoy (ventas completadas)
    supabase
      .from('sales')
      .select('total_amount')
      .eq('business_id', businessId)
      .eq('status', 'paid')
      .gte('created_at', today.start)
      .lte('created_at', today.end),

    // Ingresos este mes
    supabase
      .from('sales')
      .select('total_amount')
      .eq('business_id', businessId)
      .eq('status', 'paid')
      .gte('created_at', month.start)
      .lte('created_at', month.end),

    // Citas completadas este mes
    supabase
      .from('appointments')
      .select('id, staff_id')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('created_at', month.start)
      .lte('created_at', month.end),

    // Top servicios — sale_items del mes
    supabase
      .from('sale_items')
      .select('description, quantity, total_price')
      .eq('business_id', businessId)
      .eq('item_type', 'service')
      .gte('created_at', month.start)
      .lte('created_at', month.end),

    // Staff completadas este mes (para top staff)
    supabase
      .from('appointments')
      .select('id, staff_id')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('created_at', month.start)
      .lte('created_at', month.end),

    // Sale items por staff este mes
    supabase
      .from('sale_items')
      .select('staff_id, total_price')
      .eq('business_id', businessId)
      .eq('item_type', 'service')
      .gte('created_at', month.start)
      .lte('created_at', month.end),
  ])

  // 5. Calcular KPIs
  const kpis: ReportsKPIs = {
    citasHoy: todayAppts.data?.length ?? 0,
    ingresosHoy: (todaySales.data ?? []).reduce(
      (acc, s) => acc + Math.round(s.total_amount),
      0,
    ),
    ingresosMes: (monthSales.data ?? []).reduce(
      (acc, s) => acc + Math.round(s.total_amount),
      0,
    ),
    citasCompletadasMes: monthCompletedAppts.data?.length ?? 0,
  }

  // 6. Top 5 servicios agrupados en JS
  const serviceMap = new Map<string, { citas: number; revenue: number }>()
  for (const item of monthSaleItems.data ?? []) {
    const key     = item.description
    const current = serviceMap.get(key) ?? { citas: 0, revenue: 0 }
    serviceMap.set(key, {
      citas:   current.citas + (item.quantity ?? 1),
      revenue: current.revenue + Math.round(item.total_price),
    })
  }
  const topServices: TopService[] = Array.from(serviceMap.entries())
    .map(([description, v]) => ({ description, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // 7. Top 5 staff
  const staffCitasMap = new Map<string, number>()
  for (const appt of monthStaffAppts.data ?? []) {
    if (!appt.staff_id) continue
    staffCitasMap.set(appt.staff_id, (staffCitasMap.get(appt.staff_id) ?? 0) + 1)
  }
  const staffRevenueMap = new Map<string, number>()
  for (const item of monthStaffSaleItems.data ?? []) {
    if (!item.staff_id) continue
    staffRevenueMap.set(
      item.staff_id,
      (staffRevenueMap.get(item.staff_id) ?? 0) + Math.round(item.total_price),
    )
  }

  // Fetch staff names for IDs found
  const staffIds = Array.from(new Set([
    ...staffCitasMap.keys(),
    ...staffRevenueMap.keys(),
  ]))

  const staffNames: Map<string, string> = new Map()
  if (staffIds.length > 0) {
    const { data: staffRows } = await supabase
      .from('staff')
      .select('id, full_name')
      .in('id', staffIds)
    for (const row of staffRows ?? []) {
      staffNames.set(row.id, row.full_name)
    }
  }

  const topStaff: TopStaff[] = staffIds
    .map(id => ({
      staffId: id,
      name:    staffNames.get(id) ?? 'Desconocido',
      citas:   staffCitasMap.get(id) ?? 0,
      revenue: staffRevenueMap.get(id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // 8. Obtener KPIs adicionales para semana y día (para cuando se filtra)
  const weekSalesData = await supabase
    .from('sales')
    .select('total_amount')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('created_at', week.start)
    .lte('created_at', week.end)

  const weekIngresos = (weekSalesData.data ?? []).reduce(
    (acc, s) => acc + Math.round(s.total_amount),
    0,
  )

  const weekCompletedAppts = await supabase
    .from('appointments')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('created_at', week.start)
    .lte('created_at', week.end)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsManager
          kpis={kpis}
          topServices={topServices}
          topStaff={topStaff}
          slug={slug}
          activePeriod={activePeriod}
          weekIngresos={weekIngresos}
          weekCitas={weekCompletedAppts.data?.length ?? 0}
        />
      </Suspense>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div
        className="flex items-center justify-between pb-6 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="h-8 w-40 rounded-lg" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-64 rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        ))}
      </div>
    </div>
  )
}
