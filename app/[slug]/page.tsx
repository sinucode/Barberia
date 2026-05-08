import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Business } from '@/types/database'
import { BookingWizard } from '@/components/booking/BookingWizard'

interface PublicBookingPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PublicBookingPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('slug', slug)
    .single()

  if (!business) return { title: 'Xinuco' }

  return {
    title: `Reserva en ${business.name} — Xinuco`,
    description: `Agenda tu cita en ${business.name} de forma rápida y sencilla.`,
  }
}

export default async function PublicBookingPage({ params }: PublicBookingPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Obtener la información del negocio
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, branding, is_active')
    .eq('slug', slug)
    .single<Business>()

  if (bizError || !business || !business.is_active) {
    notFound()
  }

  // 2. Obtener servicios y staff activo (solo lo necesario para el cliente)
  const [servicesRes, staffRes] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('staff')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name'),
  ])

  const services = servicesRes.data ?? []
  const staff = staffRes.data ?? []

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg-color)' }}>
      {/* Header Premium Publico */}
      <header className="relative pt-12 pb-8 px-4 flex flex-col items-center overflow-hidden">
        {/* Background Blur */}
        <div 
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at top, var(--primary-color), transparent 70%)',
            filter: 'blur(40px)'
          }}
        />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          {business.branding?.logo_url ? (
            <img 
              src={business.branding.logo_url} 
              alt={`Logo de ${business.name}`}
              className="w-20 h-20 rounded-full object-cover mb-4 border-2 shadow-lg"
              style={{ borderColor: 'var(--primary-color)' }}
            />
          ) : (
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg"
              style={{ background: 'var(--primary-color)', color: 'white' }}
            >
              {business.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          <h1 className="text-2xl font-bold text-xinuco-text">{business.name}</h1>
          <p className="text-sm text-xinuco-muted mt-1 max-w-xs">
            Reserva tu cita en segundos. Elige el servicio y profesional que prefieras.
          </p>
        </div>
      </header>

      {/* Orquestador del Wizard */}
      <main className="px-4 mt-2">
        <BookingWizard 
          businessId={business.id} 
          services={services as any} 
          staff={staff as any} 
        />
      </main>
    </div>
  )
}
