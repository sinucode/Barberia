'use client'

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { RetailSaleModal } from './RetailSaleModal'

interface RetailSaleButtonProps {
  businessId:    string
  activeShiftId: string | null
}

/**
 * RetailSaleButton — Botón flotante de Venta Rápida para el Dashboard.
 *
 * - Si hay turno activo: botón habilitado que abre <RetailSaleModal>
 * - Si no hay turno activo: botón deshabilitado con tooltip explicativo
 *
 * Componente cliente puro — se renderiza dentro de DashboardContent (Server Component).
 */
export function RetailSaleButton({ businessId, activeShiftId }: RetailSaleButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const hasActiveShift = !!activeShiftId

  const handleSuccess = () => {
    setIsModalOpen(false)
    // Forzar refresco del dashboard para actualizar totales del turno
    window.location.reload()
  }

  return (
    <>
      {/* Botón de acceso rápido */}
      <div className="relative group">
        <button
          onClick={() => hasActiveShift && setIsModalOpen(true)}
          disabled={!hasActiveShift}
          aria-label={
            hasActiveShift
              ? 'Abrir modal de venta rápida de productos'
              : 'Debes abrir un turno de caja primero'
          }
          className={`
            w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border
            font-semibold text-sm transition-all duration-200
            ${hasActiveShift
              ? 'border-[var(--primary-color)]/30 bg-[var(--primary-color)]/[0.06] text-[var(--primary-color)] hover:bg-[var(--primary-color)]/[0.12] hover:border-[var(--primary-color)]/50 cursor-pointer active:scale-[0.98]'
              : 'border-zinc-800 bg-zinc-900/20 text-zinc-600 cursor-not-allowed opacity-60'
            }
          `}
        >
          <div
            className={`p-2 rounded-xl shrink-0 ${
              hasActiveShift
                ? 'bg-[var(--primary-color)]/[0.12]'
                : 'bg-zinc-800/50'
            }`}
          >
            <ShoppingBag size={16} className={hasActiveShift ? 'text-[var(--primary-color)]' : 'text-zinc-600'} />
          </div>
          <div className="text-left min-w-0">
            <p className={`font-bold leading-none ${hasActiveShift ? 'text-[var(--primary-color)]' : 'text-zinc-600'}`}>
              Venta Rápida
            </p>
            <p className={`text-xs mt-0.5 ${hasActiveShift ? 'text-[var(--primary-color)]/60' : 'text-zinc-700'}`}>
              {hasActiveShift ? 'Vender productos sin cita' : 'Abre el turno para vender'}
            </p>
          </div>

          {/* Indicador visual de turno activo */}
          {hasActiveShift && (
            <div className="ml-auto shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </div>
          )}
        </button>

        {/* Tooltip para estado deshabilitado */}
        {!hasActiveShift && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-800 border border-zinc-700 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            Debes abrir un turno de caja primero
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800" />
          </div>
        )}
      </div>

      {/* Modal de venta rápida */}
      {isModalOpen && hasActiveShift && (
        <RetailSaleModal
          businessId={businessId}
          activeShiftId={activeShiftId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
