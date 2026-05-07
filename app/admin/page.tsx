import { Suspense }            from 'react'
import type { Metadata }        from 'next'
import { BusinessTable }        from '@/components/admin/BusinessTable'
import { BusinessTableSkeleton } from '@/components/admin/BusinessTableSkeleton'
import { TenantActions }        from '@/components/admin/TenantActions'
import { Store }                from 'lucide-react'

export const metadata: Metadata = {
  title: 'Negocios — Xinuco Admin',
  description: 'Gestión global de los tenants de Xinuco SaaS',
}

/**
 * AdminPage — CRUD principal de negocios (tenants).
 *
 * Arquitectura:
 *  - Server Component (sin 'use client')
 *  - <TenantActions>  → isla de cliente con el botón + modal
 *  - <Suspense>       → muestra BusinessTableSkeleton mientras carga
 *  - <BusinessTable>  → async Server Component con datos reales
 */
export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
          >
            <Store size={20} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-xinuco-text">Negocios (Tenants)</h1>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Todos los negocios registrados en la plataforma
            </p>
          </div>
        </div>

        {/* Botón + modal — isla de cliente */}
        <TenantActions />
      </div>

      {/* Stats rápidas (placeholder para futuro) */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de negocios',   value: '—' },
          { label: 'Activos este mes',    value: '—' },
          { label: 'MRR (Ingresos recurrentes)', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card py-4">
            <p className="text-2xl font-bold text-xinuco-text">{value}</p>
            <p className="text-xs text-xinuco-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla principal con Suspense */}
      <section aria-label="Lista de negocios">
        <Suspense fallback={<BusinessTableSkeleton />}>
          <BusinessTable />
        </Suspense>
      </section>

    </div>
  )
}
