'use client'

import { useState, useTransition } from 'react'
import { toggleBusinessFeature } from '@/actions/businesses'
import { Award, Package, BarChart3, Plus } from 'lucide-react'
import type { Business, BusinessFeatures } from '@/types/database'

// IMPORTACIÓN CORREGIDA: Exportación nombrada con llaves exactas
import { NewBusinessModal } from '@/components/admin/NewBusinessModal'

interface AdminDashboardClientProps {
  initialBusinesses: Business[]
}

export function AdminDashboardClient({ initialBusinesses }: AdminDashboardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="w-full">
      {/* Header Responsivo */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-xinuco-text">
          Directorio de Inquilinos
        </h2>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-transform hover:scale-[1.02] active:scale-95 shadow-md"
          style={{ 
            backgroundColor: 'var(--primary-color)', 
            color: 'var(--bg-color)' 
          }}
        >
          <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
          {/* Oculto en móviles, visible desde tamaño 'md' */}
          <span className="hidden md:inline">Nuevo Negocio</span>
        </button>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-xinuco-border" style={{ borderColor: 'var(--border-color, #333)' }}>
              <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Nombre</th>
              <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Slug</th>
              <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Creación</th>
              <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Estado</th>
              <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Módulos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-xinuco-border" style={{ borderColor: 'var(--border-color, #333)' }}>
            {initialBusinesses.map((biz) => (
              <tr key={biz.id} className="bg-transparent hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-4 font-medium text-xinuco-text">{biz.name}</td>
                <td className="px-4 py-4 text-xinuco-muted font-mono text-xs">/{biz.slug}</td>
                <td className="px-4 py-4 text-xinuco-muted">
                  {new Date(biz.created_at).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    biz.is_active 
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {biz.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <ModulesCell 
                    businessId={biz.id} 
                    initialFeatures={biz.features_enabled || { loyalty: false, inventory: false, advanced_reports: false }} 
                  />
                </td>
              </tr>
            ))}
            {initialBusinesses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xinuco-muted">
                  No hay negocios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewBusinessModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}

function ModulesCell({ businessId, initialFeatures }: { businessId: string, initialFeatures: BusinessFeatures }) {
  return (
    <div className="flex items-center gap-6">
      <FeatureToggle businessId={businessId} featureKey="loyalty" label="Lealtad" initialValue={initialFeatures.loyalty} icon={Award} />
      <FeatureToggle businessId={businessId} featureKey="inventory" label="Inventario" initialValue={initialFeatures.inventory} icon={Package} />
      <FeatureToggle businessId={businessId} featureKey="advanced_reports" label="Reportes" initialValue={initialFeatures.advanced_reports} icon={BarChart3} />
    </div>
  )
}

function FeatureToggle({ 
  businessId, 
  featureKey, 
  label, 
  initialValue, 
  icon: Icon 
}: { 
  businessId: string
  featureKey: string
  label: string
  initialValue: boolean
  icon: React.ElementType 
}) {
  const [isEnabled, setIsEnabled] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)

    startTransition(async () => {
      const result = await toggleBusinessFeature(businessId, featureKey, newValue)
      
      if (result.error) {
        setIsEnabled(!newValue)
        alert(`Error al actualizar el módulo: ${result.error}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 group transition-opacity ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      title={label}
    >
      <Icon 
        size={16} 
        className={isEnabled ? 'text-xinuco-text' : 'text-xinuco-muted'} 
        style={{ color: isEnabled ? 'var(--primary-color)' : undefined }} 
      />
      <div 
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`} 
        style={{ backgroundColor: isEnabled ? 'var(--primary-color)' : 'var(--bg-color)' }}
      >
        <span 
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-4' : 'translate-x-1'
          }`} 
        />
      </div>
    </button>
  )
}
