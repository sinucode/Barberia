import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getAvailability } from '@/actions/availability'
import { AvailabilityClient } from '@/components/dashboard/settings/AvailabilityClient'
import { getBusinessBySlug } from '@/actions/businesses'
import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Disponibilidad — Xinuco',
  description: 'Configura tus horarios de atención y capacidad operativa.',
}

export default async function AvailabilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  // 1. Obtener negocio
  const business = await getBusinessBySlug(slug)
  if (!business) notFound()

  // 2. Obtener la disponibilidad (horas y estaciones de trabajo)
  const availability = await getAvailability(business.id)

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header Premium Minimalist */}
      <div className="flex flex-col pb-6 border-b border-xinuco-border" style={{ borderColor: 'var(--surface-color, #333)' }}>
        <h1 className="text-3xl font-bold tracking-tight text-xinuco-text">Configuración Operativa</h1>
        <p className="text-sm text-xinuco-muted mt-2 max-w-2xl">
          Define los días de apertura, horarios de atención y la capacidad física de tu negocio. 
          Esta configuración es la base del motor de reservas.
        </p>
      </div>

      {/* Contenedor Principal */}
      <main className="mt-4">
        <Suspense 
          fallback={
            <div className="flex items-center justify-center py-32 text-xinuco-muted">
              <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
              <span className="ml-4 font-medium">Cargando configuración...</span>
            </div>
          }
        >
          <AvailabilityClient 
            businessId={business.id} 
            initialOperatingHours={availability?.operating_hours as unknown as import('@/types/database').OperatingHours}
            initialWorkstationsCount={availability?.workstations_count}
          />
        </Suspense>
      </main>
    </div>
  )
}
