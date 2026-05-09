import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getServices } from '@/actions/services'
import { ServiceTable } from '@/components/dashboard/services/ServiceTable'
import { ServiceModal } from '@/components/dashboard/services/ServiceModal'
import { Loader2, Scissors } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getBusinessBySlug } from '@/actions/businesses'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Servicios — Xinuco',
  description: 'Gestión de servicios y precios',
}

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  // 1. Obtener negocio por slug
  const business = await getBusinessBySlug(slug)
  if (!business) notFound()

  // 2. Obtener servicios del negocio
  const services = await getServices(business.id)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24">
      {/* Header Premium Minimalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-xinuco-border" style={{ borderColor: 'var(--surface-color, #333)' }}>
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
          >
            <Scissors size={24} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-xinuco-text">Menú de Servicios</h1>
            <p className="text-sm text-xinuco-muted mt-1">Configura cortes, precios y duraciones.</p>
          </div>
        </div>

        {/* Modal para crear servicio */}
        <ServiceModal businessId={business.id} />
      </div>

      {/* Tabla de Servicios */}
      <section aria-label="Lista de servicios" className="card p-0 overflow-hidden">
        <Suspense 
          fallback={
            <div className="flex items-center justify-center py-20 text-xinuco-muted">
              <Loader2 className="animate-spin" size={24} />
              <span className="ml-3">Cargando servicios...</span>
            </div>
          }
        >
          <ServiceTable initialServices={services} />
        </Suspense>
      </section>
    </div>
  )
}
