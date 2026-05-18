import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingWizard } from '@/components/booking/BookingWizard'
import type { Service, Staff, Business } from '@/types/database'

interface BookPageProps {
  params: Promise<{ slug: string }>
}

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch de control para inyectar la metadata y asegurar existencia del negocio
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('slug', slug)
    .single<Business>()

  if (!business) {
    notFound()
  }

  // Fetch de los servicios y el staff para el BookingWizard
  const [servicesRes, staffRes] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('is_active', true).order('name'),
    supabase.from('staff').select('*').eq('business_id', business.id).eq('is_active', true).order('name'),
  ])

  const services = (servicesRes.data ?? []) as Service[]
  const staff = (staffRes.data ?? []) as Staff[]

  return (
    <main className="w-full min-h-screen pt-safe px-4 md:px-8 max-w-7xl mx-auto flex flex-col justify-between">
      <Suspense fallback={<div className="h-96 w-full bg-xinuco-surface animate-pulse rounded-2xl" />}>
        {/* Instanciación del Wizard de Reservas del Cliente */}
        <BookingWizard businessId={business.id} services={services} staff={staff} />
      </Suspense>
    </main>
  )
}
