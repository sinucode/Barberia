'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Settings2, Loader2, AlertCircle } from 'lucide-react'
import { toggleBusinessFeature } from '@/actions/businesses'
import type { BusinessFeatures } from '@xinuco/types'

export function FeatureToggles({ 
  businessId, 
  initialFeatures 
}: { 
  businessId: string, 
  initialFeatures: BusinessFeatures 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Click outside listener para cerrar el Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-xinuco-border text-xinuco-muted bg-transparent hover:border-xinuco-primary hover:text-xinuco-primary transition-all duration-200 cursor-pointer"
        aria-label="Módulos"
      >
        <Settings2 size={14} />
        Módulos
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#080808] border border-xinuco-border rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-1 animate-slide-up origin-top-right">
          <div className="px-3 py-2 border-b border-xinuco-border mb-1">
            <h4 className="text-xs font-semibold text-xinuco-text uppercase tracking-wider">Gestión de Módulos</h4>
          </div>
          
          <ToggleRow 
            businessId={businessId} 
            featureKey="loyalty" 
            title="Programa de Lealtad" 
            icon="🏆" 
            initialState={initialFeatures?.loyalty ?? false} 
          />
          <ToggleRow 
            businessId={businessId} 
            featureKey="inventory" 
            title="Control de Inventario" 
            icon="📦" 
            initialState={initialFeatures?.inventory ?? false} 
          />
          <ToggleRow 
            businessId={businessId} 
            featureKey="advanced_reports" 
            title="Reportes Avanzados" 
            icon="📊" 
            initialState={initialFeatures?.advanced_reports ?? false} 
          />
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  businessId,
  featureKey,
  title,
  icon,
  initialState
}: {
  businessId: string,
  featureKey: keyof BusinessFeatures,
  title: string,
  icon: string,
  initialState: boolean
}) {
  const [isActive, setIsActive] = useState(initialState)
  const [isPending, startTransition] = useTransition()
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const handleToggle = () => {
    if (isPending) return
    const newValue = !isActive
    
    // UI Optimista: Actualizar visualmente al instante
    setIsActive(newValue) 
    setErrorToast(null)

    // Ejecutar Server Action en background
    startTransition(async () => {
      const res = await toggleBusinessFeature(businessId, featureKey, newValue)
      if (res.error) {
        // Rollback visual si falla la red o autorización
        setIsActive(!newValue) 
        setErrorToast(res.error)
        setTimeout(() => setErrorToast(null), 4000)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-xinuco-surface/40 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-medium text-xinuco-text">{title}</span>
        </div>
        
        {/* Switch estilo iOS */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-xinuco-primary disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: isActive ? 'var(--primary-color)' : 'var(--surface-color, #1A1A1A)',
            opacity: isPending ? 0.6 : 1
          }}
          role="switch"
          aria-checked={isActive}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
              isActive ? 'translate-x-4' : 'translate-x-0'
            }`}
          >
             {isPending && <Loader2 size={10} className="animate-spin text-gray-500" />}
          </span>
        </button>
      </div>
      
      {/* Toast In-line de Error */}
      {errorToast && (
        <div className="px-3 py-1.5 flex items-start gap-1.5 text-[10px] text-red-400 bg-red-400/10 rounded-md border border-red-400/20 animate-fade-in mx-2 mb-1">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span className="leading-tight">{errorToast}</span>
        </div>
      )}
    </div>
  )
}
