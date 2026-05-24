'use client'

import { useState, useTransition } from 'react'
import {
  Plus,
  Trash,
  CreditCard,
  Banknote,
  Landmark,
  X,
  Loader2,
  DollarSign,
  Percent,
  ShoppingBag,
  AlertTriangle,
} from 'lucide-react'
import { createRetailSale, type RetailItemInput } from '@/actions/retail'
import { formatCOP } from '@/lib/utils/format'
import type { PaymentMethod } from '@/types/database'

// ── Props ─────────────────────────────────────────────────────────────────────

interface RetailSaleModalProps {
  businessId:    string
  activeShiftId: string
  onClose:       () => void
  onSuccess:     () => void
}

// ── Componente ────────────────────────────────────────────────────────────────

export function RetailSaleModal({
  businessId,
  activeShiftId,
  onClose,
  onSuccess,
}: RetailSaleModalProps) {
  const [isPending, startTransition] = useTransition()

  // Carrito de ítems
  const [items, setItems] = useState<RetailItemInput[]>([])

  // Formulario de nuevo ítem
  const [newItemDesc,  setNewItemDesc]  = useState('')
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('')
  const [newItemQty,   setNewItemQty]   = useState<number>(1)
  const [showAddForm,  setShowAddForm]  = useState(true)

  // Descuento y propina
  const [tipAmount,      setTipAmount]      = useState<number | ''>('')
  const [discountAmount, setDiscountAmount] = useState<number | ''>('')

  // Método de pago
  const [paymentMethod,   setPaymentMethod]   = useState<PaymentMethod | null>(null)
  const [receivedAmount,  setReceivedAmount]  = useState<number | ''>('')

  // Feedback
  const [validationError, setValidationError] = useState<string | null>(null)
  const [successMessage,  setSuccessMessage]  = useState<string | null>(null)

  // ── Cálculos ───────────────────────────────────────────────────────────────

  const subtotal     = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
  const finalTip     = Number(tipAmount)      || 0
  const finalDiscount = Number(discountAmount) || 0
  const totalAmount  = Math.max(0, subtotal - finalDiscount + finalTip)

  const finalReceived = Number(receivedAmount) || 0
  const changeAmount  =
    paymentMethod === 'cash' && finalReceived > totalAmount
      ? finalReceived - totalAmount
      : 0

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAddItem = () => {
    if (!newItemDesc.trim()) {
      setValidationError('Por favor ingresa la descripción del producto.')
      return
    }
    const price = Number(newItemPrice)
    if (!price || price <= 0) {
      setValidationError('El precio del producto debe ser mayor a cero.')
      return
    }

    setItems((prev) => [
      ...prev,
      {
        description: newItemDesc.trim(),
        quantity:    newItemQty,
        unitPrice:   Math.round(price),
        staffId:     null,
      },
    ])

    // Limpiar formulario
    setNewItemDesc('')
    setNewItemPrice('')
    setNewItemQty(1)
    setShowAddForm(false)
    setValidationError(null)
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setValidationError(null)
  }

  const handleSubmit = () => {
    if (items.length === 0) {
      setValidationError('Agrega al menos un producto al carrito.')
      return
    }
    if (!paymentMethod) {
      setValidationError('Debes seleccionar un método de pago.')
      return
    }
    if (paymentMethod === 'cash' && finalReceived < totalAmount) {
      setValidationError('El monto recibido es menor al total a pagar.')
      return
    }

    setValidationError(null)

    startTransition(async () => {
      const result = await createRetailSale({
        businessId,
        shiftId:        activeShiftId,
        customerId:     null,
        paymentMethod,
        tipAmount:      finalTip,
        discountAmount: finalDiscount,
        items,
      })

      if (result.error) {
        setValidationError(result.message || 'Ocurrió un error al registrar la venta.')
      } else {
        setSuccessMessage('¡Venta registrada exitosamente!')
        setTimeout(() => {
          onSuccess()
        }, 1200)
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl text-zinc-100 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)' }}
            >
              <ShoppingBag size={18} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-xinuco-text">Venta Rápida</h2>
              <p className="text-xs text-xinuco-muted">Venta directa de productos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Contenido con scroll ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Formulario para agregar ítem */}
          {showAddForm ? (
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-xinuco-muted">
                Agregar Producto
              </h3>
              <input
                type="text"
                placeholder="Ej: Cera Modeladora 100g"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <DollarSign size={14} className="absolute left-2.5 top-2.5 text-zinc-500 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="Precio COP"
                    min="0"
                    value={newItemPrice}
                    onChange={(e) =>
                      setNewItemPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Cant."
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
                  className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div className="flex gap-2">
                {items.length > 0 && (
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2 text-xs rounded-xl text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleAddItem}
                  className="flex-1 py-2 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                  style={{ background: 'var(--primary-color)', color: '#080808' }}
                >
                  <Plus size={14} />
                  Agregar al Carrito
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 text-xs font-semibold rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={14} />
              Añadir otro producto
            </button>
          )}

          {/* Carrito / Listado de ítems */}
          {items.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-xinuco-muted mb-2">
                Carrito ({items.length})
              </h3>
              <ul className="divide-y divide-zinc-900 border border-zinc-900 rounded-xl bg-zinc-900/20 overflow-hidden">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-xinuco-text truncate">
                        {item.description}
                      </p>
                      <p className="text-xs text-xinuco-muted">
                        {item.quantity} x {formatCOP(item.unitPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>
                        {formatCOP(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                        aria-label={`Eliminar ${item.description}`}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Propina y Descuento */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-xinuco-muted mb-1.5">
                  Propina (COP)
                </label>
                <div className="relative">
                  <DollarSign size={13} className="absolute left-2.5 top-2.5 text-zinc-500 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={tipAmount}
                    onChange={(e) =>
                      setTipAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-xinuco-muted mb-1.5">
                  Descuento (COP)
                </label>
                <div className="relative">
                  <Percent size={13} className="absolute left-2.5 top-2.5 text-zinc-500 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Método de Pago */}
          {items.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-xinuco-muted mb-2">
                Método de Pago
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { method: 'cash'     as PaymentMethod, icon: <Banknote size={20} />,    label: 'Efectivo' },
                    { method: 'card'     as PaymentMethod, icon: <CreditCard size={20} />,  label: 'Tarjeta'  },
                    { method: 'transfer' as PaymentMethod, icon: <Landmark size={20} />,    label: 'Transf.'  },
                  ] as const
                ).map(({ method, icon, label }) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method)
                      setValidationError(null)
                      if (method !== 'cash') setReceivedAmount('')
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5
                      ${paymentMethod === method
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/[0.08] text-[var(--primary-color)]'
                        : 'border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                      }`}
                  >
                    {icon}
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Efectivo: Monto recibido y vuelto */}
          {paymentMethod === 'cash' && items.length > 0 && (
            <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900 space-y-3 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-xinuco-muted mb-1.5">
                  Monto Recibido de Cliente
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-2.5 top-2.5 text-zinc-500 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="Monto con el que paga"
                    min="0"
                    value={receivedAmount}
                    onChange={(e) =>
                      setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {finalReceived > 0 && finalReceived >= totalAmount && (
                <div
                  className="flex items-center justify-between p-2.5 rounded-xl text-sm border"
                  style={{
                    background: 'color-mix(in srgb, var(--primary-color) 6%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--primary-color) 20%, transparent)',
                  }}
                >
                  <span className="font-semibold text-zinc-300">Cambio a entregar:</span>
                  <span
                    className="font-extrabold text-base"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    {formatCOP(changeAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error de validación */}
          {validationError && (
            <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-xl flex items-start gap-2 text-red-400 text-xs leading-relaxed animate-fade-in">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Éxito */}
          {successMessage && (
            <div
              className="p-3 rounded-xl flex items-center gap-2 text-sm font-semibold animate-fade-in"
              style={{
                background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
                color: 'var(--primary-color)',
                border: '1px solid color-mix(in srgb, var(--primary-color) 30%, transparent)',
              }}
            >
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* ── Footer fijo: Totales + Botón Cobrar ─────────────────────────── */}
        <div className="border-t border-zinc-900 bg-zinc-900/40 p-4 space-y-3 shrink-0">
          {items.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-xinuco-muted">
                <span>Subtotal:</span>
                <span>{formatCOP(subtotal)}</span>
              </div>
              {finalDiscount > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Descuento:</span>
                  <span>-{formatCOP(finalDiscount)}</span>
                </div>
              )}
              {finalTip > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'var(--primary-color)' }}>
                  <span>Propina:</span>
                  <span>+{formatCOP(finalTip)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-xinuco-text pt-1.5 border-t border-zinc-900">
                <span>Total a Pagar:</span>
                <span
                  className="text-base font-extrabold"
                  style={{ color: 'var(--primary-color)' }}
                >
                  {formatCOP(totalAmount)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || items.length === 0 || !!successMessage}
            className="btn-primary w-full flex items-center justify-center gap-2 h-12 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Registrando venta...
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                {items.length === 0 ? 'Agrega productos para cobrar' : 'Cobrar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
