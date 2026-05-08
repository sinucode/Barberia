'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { X, Plus, Loader2, Save } from 'lucide-react'
import { createService, updateService } from '@/actions/services'
import type { Service } from '@/types/database'

// ── Utilidades COP ──────────────────────────────────────────────────────────────
/**
 * Convierte un entero a string con formato visual COP.
 * Ej: 15000 → "$ 15.000"
 */
function formatCOP(raw: number | string): string {
  const num = parseInt(String(raw).replace(/\D/g, ''), 10)
  if (isNaN(num) || num === 0) return ''
  return '$ ' + num.toLocaleString('es-CO')
}

/**
 * Extrae el entero limpio de un string formateado COP.
 * Ej: "$ 15.000" → 15000
 */
function parseCOP(formatted: string): number {
  const clean = formatted.replace(/\D/g, '')
  return clean ? parseInt(clean, 10) : 0
}

// ── Tipos ────────────────────────────────────────────────────────────────────────
interface ServiceModalProps {
  /** Si se pasa, entra en modo edición. Si no, modo creación. */
  service?: Service
  /** Callback para cerrar el modal desde el padre */
  onClose: () => void
  /** Callback de éxito para actualizar la lista optimistamente */
  onSuccess: (service: Service) => void
}

// ── Componente ──────────────────────────────────────────────────────────────────
export function ServiceModal({ service, onClose, onSuccess }: ServiceModalProps) {
  const isEditing = Boolean(service)
  const backdropRef = useRef<HTMLDivElement>(null)

  // ── Estado del formulario ────────────────────────────────────────────────────
  const [name, setName]           = useState(service?.name ?? '')
  const [description, setDesc]    = useState(service?.description ?? '')
  const [duration, setDuration]   = useState(String(service?.duration_minutes ?? ''))
  const [priceDisplay, setPriceDisplay] = useState(service?.price ? formatCOP(service.price) : '')
  const [formError, setFormError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // ── Formateo COP en tiempo real ──────────────────────────────────────────────
  // Estrategia:
  //  1. El input `value` siempre muestra el string formateado ("$ 15.000")
  //  2. Al onChange, extraemos solo dígitos y re-formateamos al instante.
  //  3. En el submit, pasamos parseCOP() → entero limpio al Server Action.
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    setPriceDisplay(digits ? '$ ' + parseInt(digits, 10).toLocaleString('es-CO') : '')
  }, [])

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const price = parseCOP(priceDisplay)
    const durationMin = parseInt(duration, 10)

    // Validación cliente
    if (!name.trim())       return setFormError('El nombre del servicio es obligatorio.')
    if (!price || price < 0) return setFormError('El precio debe ser un valor positivo.')
    if (!durationMin || durationMin <= 0) return setFormError('La duración debe ser mayor a 0 minutos.')

    const payload = {
      name:               name.trim(),
      description:        description.trim() || null,
      price,
      duration_minutes:   durationMin,
      is_active:          service?.is_active ?? true,
    }

    startTransition(async () => {
      try {
        let result

        if (isEditing && service) {
          // Modo edición
          const updated = await updateService(service.id, payload)
          result = updated?.[0]
        } else {
          // Modo creación
          const created = await createService(payload)
          result = created?.[0]
        }

        if (result) {
          onSuccess(result as Service)
          onClose()
        }
      } catch (err: any) {
        setFormError(err?.message ?? 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  return (
    /* Backdrop — click fuera cierra el modal */
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar servicio' : 'Crear servicio'}
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
      >
        {/* Header del modal */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <h2 className="text-base font-bold text-xinuco-text">
            {isEditing ? 'Editar servicio' : 'Nuevo servicio'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text transition-colors hover:bg-xinuco-surface/60"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="svc-name" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Nombre del servicio *
            </label>
            <input
              id="svc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Corte de cabello"
              required
              className="input-base"
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="svc-desc" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Descripción <span className="text-xinuco-muted/60 normal-case">(opcional)</span>
            </label>
            <textarea
              id="svc-desc"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe brevemente el servicio..."
              rows={2}
              className="input-base resize-none"
            />
          </div>

          {/* Duración y Precio — en fila */}
          <div className="grid grid-cols-2 gap-3">

            {/* Duración en minutos */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="svc-duration" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Duración (min) *
              </label>
              <input
                id="svc-duration"
                type="number"
                min={1}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                required
                className="input-base"
              />
            </div>

            {/* ── Precio con formateo COP ────────────────────────────────────────
              Estrategia de doble-estado:
              - `priceDisplay` (string): lo que ve el usuario ("$ 15.000")
              - `parseCOP(priceDisplay)` (number): lo que el Server Action recibe (15000)
              
              Al teclear, handlePriceChange limpia dígitos y re-aplica
              toLocaleString('es-CO') instantáneamente. No hay delay ni flash.
              El Server Action nunca recibe caracteres especiales.
            ─────────────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="svc-price" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Precio (COP) *
              </label>
              <input
                id="svc-price"
                type="text"
                inputMode="numeric"
                value={priceDisplay}
                onChange={handlePriceChange}
                placeholder="$ 25.000"
                required
                className="input-base"
              />
            </div>
          </div>

          {/* Error de validación */}
          {formError && (
            <p role="alert" className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2 animate-fade-in">
              {formError}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium text-xinuco-muted border transition-colors hover:text-xinuco-text hover:bg-xinuco-surface/40"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              id="btn-save-service"
              type="submit"
              disabled={isPending}
              className="flex-1 btn-primary !py-3 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={15} />
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Trigger Button ──────────────────────────────────────────────────────────────
/** Botón primario que abre el modal de creación */
export function AddServiceButton() {
  const [isOpen, setIsOpen] = useState(false)

  const handleSuccess = useCallback(() => {
    // La revalidación de caché ya ocurre en el Server Action.
    // Aquí solo cerramos; la tabla se actualiza automáticamente.
  }, [])

  return (
    <>
      <button
        id="btn-add-service"
        onClick={() => setIsOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={16} />
        Añadir Servicio
      </button>

      {isOpen && (
        <ServiceModal
          onClose={() => setIsOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
