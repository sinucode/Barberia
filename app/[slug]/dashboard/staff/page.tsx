import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getStaff } from '@/actions/staff'
import { StaffGrid } from '@/components/dashboard/staff/StaffGrid'
import { Loader2, Users } from 'lucide-react'
import { getBusinessBySlug } from '@/actions/businesses'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'El Ejército — Xinuco',
  description: 'Gestión del staff',
}

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  // 1. Obtener negocio
  const business = await getBusinessBySlug(slug)
  if (!business) notFound()

  // 2. Obtener el staff
  const staff = await getStaff(business.id)

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-24">
      {/* Header Premium Minimalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-xinuco-border" style={{ borderColor: 'var(--surface-color, #333)' }}>
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
          >
            <Users size={24} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-xinuco-text">Tu Ejército (Staff)</h1>
            <p className="text-sm text-xinuco-muted mt-1">Gestiona los miembros de tu equipo y sus roles.</p>
          </div>
        </div>

        {/* Podríamos agregar aquí un StaffModal en el futuro */}
        <button className="btn-primary" disabled title="Pronto disponible">
          + Nuevo Empleado
        </button>
      </div>

      {/* Grid de Empleados */}
      <section aria-label="Lista de staff">
        <Suspense 
          fallback={
            <div className="flex items-center justify-center py-20 text-xinuco-muted">
              <Loader2 className="animate-spin" size={24} />
              <span className="ml-3">Reuniendo al ejército...</span>
            </div>
          }
        >
          <StaffGrid initialStaff={staff} />
        </Suspense>
      </section>
    </div>
  )
}
