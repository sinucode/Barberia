'use client'

import { useState, useTransition } from 'react'
import { createService } from '@/actions/services'
import { Loader2, Plus, X } from 'lucide-react'

export function ServiceModal({ businessId }: { businessId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // States for form
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('30')
  const [rawPrice, setRawPrice] = useState<number>(0)
  const [displayPrice, setDisplayPrice] = useState('')
  
  const [error, setError] = useState<string | null>(null)

  // Real-time currency formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números
    const numericValue = e.target.value.replace(/\D/g, '')
    const numberValue = parseInt(numericValue, 10)

    if (isNaN(numberValue)) {
      setRawPrice(0)
      setDisplayPrice('')
      return
    }

    setRawPrice(numberValue)
    
    // Formatear visualmente a COP
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(numberValue)
    
    setDisplayPrice(formatted)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!name || rawPrice <= 0 || !duration) {
      setError('Todos los campos son obligatorios y el precio debe ser mayor a 0.')
      return
    }

    startTransition(async () => {
      const result = await createService(businessId, {
        name,
        duration_minutes: parseInt(duration, 10),
        price: rawPrice
      })
      
      if (result.error) {
        setError(result.error)
      } else {
        // Success
        setIsOpen(false)
        setName('')
        setDuration('30')
        setRawPrice(0)
        setDisplayPrice('')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={18} />
        <span>Nuevo Servicio</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-xinuco-bg border border-xinuco-border rounded-2xl shadow-xl overflow-hidden animate-slide-up" style={{ borderColor: 'var(--surface-color, #333)' }}>
            
            <div className="flex items-center justify-between p-4 border-b border-xinuco-border" style={{ borderColor: 'var(--surface-color, #333)' }}>
              <h2 className="text-lg font-bold text-xinuco-text">Crear Servicio</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-xinuco-muted hover:text-xinuco-text transition-colors rounded-md"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-xinuco-muted uppercase tracking-wider">
                  Nombre del servicio
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Corte Clásico"
                  className="input-base"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-xinuco-muted uppercase tracking-wider">
                  Duración (Minutos)
                </label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input-base"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min (1 hr)</option>
                  <option value="90">90 min (1.5 hr)</option>
                  <option value="120">120 min (2 hr)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-xinuco-muted uppercase tracking-wider">
                  Precio (COP)
                </label>
                <input
                  type="text"
                  required
                  value={displayPrice}
                  onChange={handlePriceChange}
                  placeholder="$ 20.000"
                  className="input-base font-mono"
                />
                <p className="text-xs text-xinuco-muted mt-1">Valor exacto guardado: {rawPrice}</p>
              </div>

              {error && (
                <p className="text-xs text-red-400 text-center px-2 py-1 bg-red-500/10 rounded-md">
                  {error}
                </p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 size={16} className="animate-spin" />}
                  <span>{isPending ? 'Guardando...' : 'Crear Servicio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
