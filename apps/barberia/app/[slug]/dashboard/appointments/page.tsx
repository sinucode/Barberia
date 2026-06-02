import { Suspense } from 'react'
import { createClient } from '@xinuco/supabase/server'
import { redirect } from 'next/navigation'
import { InteractiveAgenda } from '@/components/dashboard/InteractiveAgenda'
import { getActiveShiftDetails } from '@/actions/finance'

interface AppointmentsPageProps {
  params: Promise<{ slug: string }>
}

export default async function AppointmentsPage({ params }: AppointmentsPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Auth Guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // 2. Fetch Profile & Business
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
    .eq('id', user.id)
    .single()

  const businessId = profile?.business_id ?? ''
  const isAdmin = profile?.role === 'admin'

  // 3. Obtener Turno Activo para permitir el CheckoutModal desde esta página
  let activeShiftId = null
  if (isAdmin) {
    const shiftDetails = await getActiveShiftDetails(businessId)
    activeShiftId = shiftDetails?.shift?.id || null
  }

  // 4. Obtener TODAS las citas futuras o de un rango (Aquí podríamos implementar paginación o filtro por mes)
  // Por ahora, mostraremos las citas a partir de hoy para dar una vista de agenda general
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 4a. Si es barbero, obtener su staff.id vinculado al user.id
  //     La relación es: auth.users.id → staff.user_id → staff.id → appointments.staff_id
  //     NO usar barber_id (campo eliminado) ni user.id directo (no es staff.id)
  let linkedStaffId: string | null = null
  if (profile?.role === 'barber') {
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle()

    linkedStaffId = staffRecord?.id ?? null
  }

  let query = supabase
    .from('appointments')
    .select('*, customers(full_name, phone), services(name, price_cop)')
    .eq('business_id', businessId)
    .gte('created_at', todayStart.toISOString())
    .order('start_time', { ascending: true })

  // Aplicar filtro de barbero usando staff_id correcto
  if (profile?.role === 'barber') {
    if (linkedStaffId) {
      query = query.eq('staff_id', linkedStaffId)
    } else {
      // Sin staff vinculado → devolver lista vacía por seguridad (no exponer citas ajenas)
      query = query.eq('staff_id', 'no-linked-staff')
    }
  }

  const { data: appointmentsData } = await query
  const appointments = (appointmentsData ?? []) as Record<string, unknown>[]

  return (
    <div className="bg-xinuco-bg min-h-screen">
      <main className="px-4 py-6 pb-24 space-y-6 max-w-2xl mx-auto">
        <section aria-label="Encabezado de Agenda">
          <h1 className="text-2xl font-bold text-xinuco-text">
            Agenda Completa
          </h1>
          <p className="text-sm text-xinuco-muted mt-1">
            Gestiona todas tus citas programadas e historial reciente.
          </p>
        </section>

        <section aria-label="Lista Completa de Citas">
          <InteractiveAgenda
            appointments={appointments}
            activeShiftId={activeShiftId}
            businessId={businessId}
            slug={slug}
          />
        </section>
      </main>
    </div>
  )
}
