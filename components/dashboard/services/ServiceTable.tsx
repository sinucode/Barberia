'use client'

import { useState, useTransition } from 'react'
import { toggleServiceStatus } from '@/actions/services'
import type { Service } from '@/types/database'
import { Loader2 } from 'lucide-react'

export function ServiceTable({ initialServices }: { initialServices: Service[] }) {
  if (initialServices.length === 0) {
    return (
      <div className="py-12 text-center text-xinuco-muted border border-dashed border-xinuco-border rounded-lg" style={{ borderColor: 'var(--surface-color, #333)' }}>
        No hay servicios configurados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-xinuco-border" style={{ borderColor: 'var(--surface-color, #333)' }}>
            <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Nombre</th>
            <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Duración</th>
            <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs">Precio</th>
            <th className="px-4 py-4 font-medium text-xinuco-muted tracking-wider uppercase text-xs text-right">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-xinuco-border" style={{ borderColor: 'var(--surface-color, #333)' }}>
          {initialServices.map((service) => (
            <tr key={service.id} className="bg-transparent hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-4 font-medium text-xinuco-text">{service.name}</td>
              <td className="px-4 py-4 text-xinuco-muted">{service.duration_minutes} min</td>
              <td className="px-4 py-4 font-mono text-xinuco-text">
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(service.price)}
              </td>
              <td className="px-4 py-4 text-right">
                <ServiceToggle serviceId={service.id} initialValue={service.is_active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ServiceToggle({ serviceId, initialValue }: { serviceId: string, initialValue: boolean }) {
  const [isEnabled, setIsEnabled] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    const newValue = !isEnabled
    setIsEnabled(newValue) // Optimistic UI update

    startTransition(async () => {
      const result = await toggleServiceStatus(serviceId, newValue)
      
      if (result.error) {
        setIsEnabled(!newValue) // Rollback
        alert(`Error: ${result.error}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-2 group transition-opacity ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      title={isEnabled ? 'Desactivar servicio' : 'Activar servicio'}
    >
      <div 
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" 
        style={{ backgroundColor: isEnabled ? 'var(--primary-color)' : 'var(--surface-color, #333)' }}
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
