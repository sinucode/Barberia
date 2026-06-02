'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Business } from '@/types/database'
import { NewBusinessModal }    from '@/components/admin/NewBusinessModal'
import { TenantDetailDrawer }  from '@/components/admin/TenantDetailDrawer'

interface AdminDashboardClientProps {
  initialBusinesses: Business[]
}

export function AdminDashboardClient({ initialBusinesses }: AdminDashboardClientProps) {
  const [isModalOpen,       setIsModalOpen]       = useState(false)
  const [selectedBusiness,  setSelectedBusiness]  = useState<Business | null>(null)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-xinuco-text">Directorio de Inquilinos</h2>
          <p className="text-xs text-xinuco-muted mt-0.5">
            {initialBusinesses.length} negocio{initialBusinesses.length !== 1 ? 's' : ''} registrados — clic en una fila para ver detalle y módulos
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          id="btn-new-business"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
                     transition-transform hover:scale-[1.02] active:scale-95 shadow-md"
          style={{ backgroundColor: 'var(--primary-color)', color: 'var(--bg-color)' }}
        >
          <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
          <span className="hidden md:inline">Nuevo Negocio</span>
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto w-full rounded-xl border border-xinuco-border">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-xinuco-border bg-xinuco-surface/50">
              <th className="px-5 py-3.5 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Negocio</th>
              <th className="px-5 py-3.5 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Slug</th>
              <th className="px-5 py-3.5 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Creación</th>
              <th className="px-5 py-3.5 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Estado</th>
              <th className="px-5 py-3.5 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Módulos activos</th>
            </tr>
          </thead>
          <tbody>
            {initialBusinesses.map((biz) => {
              const activeModules = Object.values(biz.features_enabled ?? {}).filter(Boolean).length
              const totalModules  = Object.keys(biz.features_enabled ?? {}).length

              return (
                <tr
                  key={biz.id}
                  onClick={() => setSelectedBusiness(biz)}
                  className="border-b border-xinuco-border last:border-0 hover:bg-white/[0.03]
                             transition-colors cursor-pointer group"
                >
                  {/* Nombre */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {/* Swatch del color primario */}
                      <div
                        className="w-7 h-7 rounded-lg shrink-0 border border-white/10"
                        style={{ background: biz.brand_config?.primaryColor ?? '#C5A059' }}
                      />
                      <span className="font-medium text-xinuco-text group-hover:underline underline-offset-2">
                        {biz.name}
                      </span>
                    </div>
                  </td>

                  {/* Slug */}
                  <td className="px-5 py-4 text-xinuco-muted font-mono text-xs">/{biz.slug}</td>

                  {/* Creación */}
                  <td className="px-5 py-4 text-xinuco-muted text-xs">
                    {new Date(biz.created_at).toLocaleDateString('es-CO')}
                  </td>

                  {/* Estado */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        biz.is_active
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${biz.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                      {biz.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Módulos */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {/* Barra de progreso */}
                      <div className="w-20 h-1.5 rounded-full bg-xinuco-surface overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${totalModules > 0 ? (activeModules / totalModules) * 100 : 0}%`,
                            background: 'var(--primary-color)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-xinuco-muted tabular-nums">
                        {activeModules}/{totalModules}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}

            {initialBusinesses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-xinuco-muted text-sm">
                  No hay negocios registrados. Crea el primero con el botón <strong>+ Nuevo Negocio</strong>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modales / Drawers */}
      <NewBusinessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <TenantDetailDrawer
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
      />
    </div>
  )
}
