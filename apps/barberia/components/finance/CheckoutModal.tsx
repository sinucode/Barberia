'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash, CreditCard, Banknote, Landmark, X, Loader2, DollarSign, Percent, QrCode } from 'lucide-react'
import { checkoutAppointment, type CheckoutItemInput } from '@/actions/finance'
import type { PaymentMethod } from '@xinuco/types'
import { MPPaymentPanel } from '@/components/pos/MPPaymentPanel'

interface CheckoutModalProps {
  appointment: {
    id: string
    customer_name?: string
    customer_id?: string
    service_name?: string | null
    service_price?: number // we can pass or fetch this
    staff_id?: string | null
  }
  businessId: string
  activeShiftId: string
  onClose: () => void
  onSuccess: () => void
}

export function CheckoutModal({
  appointment,
  businessId,
  activeShiftId,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [isPending, startTransition] = useTransition()
  
  // Lista de ítems a cobrar, pre-poblada con el servicio principal
  const [items, setItems] = useState<CheckoutItemInput[]>([
    {
      description: appointment.service_name || 'Servicio de Peluquería',
      quantity: 1,
      unitPrice: appointment.service_price || 0,
      itemType: 'service',
      staffId: appointment.staff_id || null,
    },
  ])

  // Estado para añadir nuevos productos manualmente
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState<number | ''>('')
  const [newProdQty, setNewProdQty] = useState<number>(1)

  // Descuentos y propinas
  const [tipAmount, setTipAmount] = useState<number | ''>('')
  const [discountAmount, setDiscountAmount] = useState<number | ''>('')

  // Método de pago
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  
  // Recibido y vuelto (para efectivo)
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('')

  // Validaciones
  const [validationError, setValidationError] = useState<string | null>(null)

  // Totales
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const finalTip = Number(tipAmount) || 0
  const finalDiscount = Number(discountAmount) || 0
  const totalAmount = Math.max(0, subtotal - finalDiscount + finalTip)

  // Cambio/Vuelto
  const finalReceived = Number(receivedAmount) || 0
  const changeAmount = paymentMethod === 'cash' && finalReceived > totalAmount ? finalReceived - totalAmount : 0

  // Agregar un producto dinámicamente
  const handleAddProduct = () => {
    if (!newProdName.trim()) {
      setValidationError('Por favor ingresa la descripción del producto.')
      return
    }
    const price = Number(newProdPrice) || 0
    if (price <= 0) {
      setValidationError('El precio del producto debe ser mayor a cero.')
      return
    }

    const newItem: CheckoutItemInput = {
      description: newProdName.trim(),
      quantity: newProdQty,
      unitPrice: price,
      itemType: 'product',
      staffId: appointment.staff_id || null,
    }

    setItems([...items, newItem])
    setNewProdName('')
    setNewProdPrice('')
    setNewProdQty(1)
    setShowAddProduct(false)
    setValidationError(null)
  }

  // Eliminar un ítem
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setValidationError('Debe haber al menos un servicio en el cobro.')
      return
    }
    setItems(items.filter((_, i) => i !== index))
    setValidationError(null)
  }

  // Confirmar cobro
  const handleConfirmCheckout = () => {
    if (!paymentMethod) {
      setValidationError('Debes seleccionar un método de pago.')
      return
    }

    if (paymentMethod === 'cash' && finalReceived < totalAmount) {
      setValidationError('El monto recibido en efectivo es menor al total a pagar.')
      return
    }

    setValidationError(null)

    startTransition(async () => {
      const result = await checkoutAppointment({
        appointmentId: appointment.id,
        businessId,
        shiftId: activeShiftId,
        paymentMethod,
        receivedAmount: paymentMethod === 'cash' ? finalReceived : totalAmount,
        tipAmount: finalTip,
        discountAmount: finalDiscount,
        items,
      })

      if (result.error) {
        setValidationError(result.message || 'Ocurrió un error al procesar el cobro.')
      } else {
        onSuccess()
      }
    })
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl text-zinc-100 flex flex-col max-h-[90vh]"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">Cobro de Cita</h2>
            <p className="text-xs text-xinuco-muted">
              Cliente: <span className="font-semibold text-xinuco-text">{appointment.customer_name || 'Sin nombre'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors"
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Listado de Items a Cobrar */}
          <div>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-xinuco-muted">
                Detalle del Ticket
              </h3>
              {!showAddProduct && (
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="text-xs font-semibold flex items-center gap-1 text-[var(--primary-color)] hover:underline"
                >
                  <Plus size={14} />
                  Añadir Producto
                </button>
              )}
            </div>

            {/* Inline Add Product Form */}
            {showAddProduct && (
              <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 animate-fade-in">
                <h4 className="text-xs font-bold text-xinuco-text">Agregar Producto Adicional</h4>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    placeholder="Ej: Cera Modeladora 100g"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                      <input
                        type="number"
                        placeholder="Precio (COP)"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={newProdQty}
                      onChange={(e) => setNewProdQty(Math.max(1, Number(e.target.value)))}
                      className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAddProduct(false)}
                    className="text-xs px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddProduct}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-black font-semibold hover:opacity-90 transition-opacity"
                  >
                    Agregar Item
                  </button>
                </div>
              </div>
            )}

            {/* Render items list */}
            <ul className="divide-y divide-zinc-900 border border-zinc-900 rounded-xl bg-zinc-900/30 overflow-hidden">
              {items.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-xinuco-text truncate">
                      {item.description}
                    </p>
                    <p className="text-xs text-xinuco-muted">
                      {item.itemType === 'service' ? 'Servicio' : 'Producto'} • {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-xinuco-text">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                      title="Eliminar del ticket"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Descuento y Propina */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-xinuco-muted mb-1">
                Propina (COP)
              </label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="number"
                  placeholder="0"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-xinuco-muted mb-1">
                Descuento (COP)
              </label>
              <div className="relative">
                <Percent size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="number"
                  placeholder="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-xinuco-muted mb-2">
              Método de Pago
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setPaymentMethod('cash'); setValidationError(null) }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5
                  ${paymentMethod === 'cash'
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/[0.08] text-[var(--primary-color)]'
                    : 'border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                  }`}
              >
                <Banknote size={20} />
                <span className="text-xs font-semibold">Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('card'); setValidationError(null); setReceivedAmount('') }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5
                  ${paymentMethod === 'card'
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/[0.08] text-[var(--primary-color)]'
                    : 'border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                  }`}
              >
                <CreditCard size={20} />
                <span className="text-xs font-semibold">Tarjeta</span>
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('transfer'); setValidationError(null); setReceivedAmount('') }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5
                  ${paymentMethod === 'transfer'
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/[0.08] text-[var(--primary-color)]'
                    : 'border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                  }`}
              >
                <Landmark size={20} />
                <span className="text-xs font-semibold">Transf.</span>
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('mercadopago'); setValidationError(null); setReceivedAmount('') }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5
                  ${paymentMethod === 'mercadopago'
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/[0.08] text-[var(--primary-color)]'
                    : 'border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                  }`}
              >
                <QrCode size={20} />
                <span className="text-xs font-semibold">MercadoPago</span>
              </button>
            </div>
          </div>

          {/* Panel MercadoPago — QR + fee preview + polling */}
          {paymentMethod === 'mercadopago' && (
            <div className="animate-fade-in">
              <MPPaymentPanel
                businessId={businessId}
                appointmentId={appointment.id}
                items={items.map((item) => ({
                  title:         item.description,
                  quantity:      item.quantity,
                  unit_price_cop: item.unitPrice,
                }))}
                totalAmount={totalAmount}
                externalRef={`appt_${appointment.id}`}
                payerEmail={undefined}
                onPaymentApproved={(_mpDbId) => {
                  // Pago confirmado por MP → ejecutar checkout con paymentMethod mercadopago
                  startTransition(async () => {
                    const result = await checkoutAppointment({
                      appointmentId: appointment.id,
                      businessId,
                      shiftId:       activeShiftId,
                      paymentMethod: 'mercadopago',
                      receivedAmount: totalAmount,
                      tipAmount:     finalTip,
                      discountAmount: finalDiscount,
                      items,
                    })
                    if (result.error) {
                      setValidationError(result.message || 'Error al finalizar el cobro.')
                      setPaymentMethod(null)
                    } else {
                      onSuccess()
                    }
                  })
                }}
                onCancel={() => setPaymentMethod(null)}
              />
            </div>
          )}

          {/* Monto Recibido y Cambio para Efectivo */}
          {paymentMethod === 'cash' && (
            <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-900 space-y-3 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-xinuco-muted mb-1">
                  Monto Recibido de Cliente
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="number"
                    placeholder="Monto con el que paga"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {finalReceived > 0 && finalReceived >= totalAmount && (
                <div className="flex items-center justify-between bg-[var(--primary-color)]/[0.05] border border-[var(--primary-color)]/20 p-2.5 rounded-lg text-sm">
                  <span className="font-semibold text-zinc-300">Cambio a entregar:</span>
                  <span className="font-extrabold text-[var(--primary-color)] text-base">
                    {formatCurrency(changeAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Alertas de error */}
          {validationError && (
            <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-xl flex gap-2 text-red-400 text-xs leading-relaxed animate-fade-in shrink-0">
              <span className="font-bold">⚠️ Error:</span>
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Resumen Final de Cobro y Acciones */}
        <div className="border-t border-zinc-900 bg-zinc-900/40 p-4 space-y-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-xinuco-muted">
              <span>Subtotal ítems:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {finalDiscount > 0 && (
              <div className="flex justify-between text-xs text-red-400">
                <span>Descuento aplicado:</span>
                <span>-{formatCurrency(finalDiscount)}</span>
              </div>
            )}
            {finalTip > 0 && (
              <div className="flex justify-between text-xs text-[var(--primary-color)]">
                <span>Propina agregada:</span>
                <span>+{formatCurrency(finalTip)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-xinuco-text pt-1.5 border-t border-zinc-900">
              <span>Total a Pagar:</span>
              <span className="text-base text-[var(--primary-color)]">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {paymentMethod !== 'mercadopago' && (
            <button
              onClick={handleConfirmCheckout}
              disabled={isPending}
              className="btn-primary w-full flex items-center justify-center gap-2 h-11 text-sm font-bold shrink-0"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Procesando cobro...
                </>
              ) : (
                <>
                  Confirmar Cobro
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
