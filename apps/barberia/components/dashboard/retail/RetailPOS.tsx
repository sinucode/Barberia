'use client'

import React, { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingBag,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  Receipt,
  User,
  Search,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { createRetailSale } from '@/actions/retail'
import type { PaymentMethod } from '@xinuco/types'
import { createClient } from '@xinuco/supabase/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCOP = (n: number) => '$' + Math.abs(n).toLocaleString('es-CO')

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartItem {
  id:          string   // local uuid para key
  description: string
  quantity:    number
  unitPrice:   number   // INTEGER COP
  staffId:     string | null
}

interface CustomerResult {
  id:        string
  full_name: string
  phone:     string
}

interface RetailPOSProps {
  businessId:   string
  slug:         string
  currentShift: { id: string; status: string; opened_at: string } | null
  recentSales:  Array<{ id: string; total_amount: number; created_at: string; status: string }>
  staffList:    Array<{ id: string; full_name: string }>
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-4 ${className}`}
      style={{ backgroundColor: '#111111', borderColor: '#2A2A2A' }}
    >
      {children}
    </div>
  )
}

// ── Input shared style ────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl px-3 py-2.5 text-sm border outline-none transition-colors placeholder-zinc-500'
const inputStyle = {
  backgroundColor: '#080808',
  borderColor:     '#2A2A2A',
  color:           '#F4F4F4',
}

// ── Payment method button ─────────────────────────────────────────────────────

function PaymentBtn({
  label,
  value,
  active,
  onClick,
}: {
  label:   string
  value:   PaymentMethod
  active:  boolean
  onClick: (v: PaymentMethod) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className="flex-1 py-2.5 rounded-full text-sm font-semibold border transition-all"
      style={
        active
          ? {
              backgroundColor: 'var(--primary-color, #C5A059)',
              borderColor:     'var(--primary-color, #C5A059)',
              color:           '#080808',
            }
          : {
              backgroundColor: 'transparent',
              borderColor:     '#2A2A2A',
              color:           '#F4F4F4',
            }
      }
    >
      {label}
    </button>
  )
}

// ── No-shift warning banner ───────────────────────────────────────────────────

function NoShiftBanner({ slug }: { slug: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border p-4"
      style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)' }}
    >
      <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-400">No hay turno abierto</p>
        <p className="text-xs text-amber-300/70 mt-0.5">
          Abre un turno en el módulo de Caja para registrar ventas.
        </p>
        <a
          href={`/${slug}/dashboard/commissions`}
          className="inline-flex items-center gap-1 text-xs font-semibold mt-2 underline underline-offset-2 text-amber-400/80 hover:text-amber-400"
        >
          Ir a Caja
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}

// ── Customer search ───────────────────────────────────────────────────────────

interface CustomerSearchProps {
  businessId:       string
  selectedCustomer: CustomerResult | null
  onSelect:         (c: CustomerResult | null) => void
}

function CustomerSearch({ businessId, selectedCustomer, onSelect }: CustomerSearchProps) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<CustomerResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const timerRef               = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef             = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([])
        setOpen(false)
        return
      }
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .eq('business_id', businessId)
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(6)
      setResults((data as unknown as CustomerResult[]) ?? [])
      setOpen(true)
      setLoading(false)
    },
    [businessId]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 300)
  }

  if (selectedCustomer) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
        style={{ backgroundColor: '#080808', borderColor: '#2A2A2A' }}
      >
        <User size={14} style={{ color: 'var(--primary-color, #C5A059)' }} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{selectedCustomer.full_name}</p>
          <p className="text-[11px] text-zinc-500">{selectedCustomer.phone}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null)
            setQuery('')
          }}
          className="p-1 rounded-md text-zinc-500 hover:text-red-400 transition-colors"
          title="Quitar cliente"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
        <input
          className={`${inputCls} pl-8`}
          style={inputStyle}
          placeholder="Buscar cliente (nombre o teléfono)"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <Loader2
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-500"
          />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-30 mt-1 w-full rounded-xl border overflow-hidden shadow-xl"
          style={{ backgroundColor: '#111111', borderColor: '#2A2A2A' }}
        >
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c)
                setQuery('')
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <User size={13} className="text-zinc-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.full_name}</p>
                <p className="text-[11px] text-zinc-500">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Recent Sale Row ───────────────────────────────────────────────────────────

function RecentSaleRow({
  sale,
}: {
  sale: { id: string; total_amount: number; created_at: string; status: string }
}) {
  const date  = new Date(sale.created_at)
  const time  = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  const day   = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

  return (
    <div
      className="flex items-center gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: '#2A2A2A' }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: 'var(--primary-color, #C5A059)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{formatCOP(sale.total_amount)}</p>
        <p className="text-[11px] text-zinc-500">
          {day} · {time}
        </p>
      </div>
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
        style={{
          color:           'var(--primary-color, #C5A059)',
          backgroundColor: 'color-mix(in srgb, var(--primary-color, #C5A059) 12%, transparent)',
          borderColor:     'color-mix(in srgb, var(--primary-color, #C5A059) 25%, transparent)',
        }}
      >
        Pagada
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RetailPOS({
  businessId,
  slug,
  currentShift,
  recentSales,
  staffList,
}: RetailPOSProps) {
  const router = useRouter()

  // ── Cart state ───────────────────────────────────────────────────────────────
  const [cartItems,         setCartItems]         = useState<CartItem[]>([])
  const [discountAmount,    setDiscountAmount]     = useState(0)
  const [tipAmount,         setTipAmount]          = useState(0)
  const [paymentMethod,     setPaymentMethod]      = useState<PaymentMethod>('cash')
  const [selectedCustomer,  setSelectedCustomer]   = useState<CustomerResult | null>(null)

  // ── Item form state ──────────────────────────────────────────────────────────
  const [itemForm, setItemForm] = useState({
    description: '',
    quantity:    1,
    unitPrice:   0,
    staffId:     '',
  })

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isPending,  startTransition] = useTransition()
  const [error,      setError]        = useState<string | null>(null)
  const [success,    setSuccess]      = useState(false)

  // ── Derived totals ───────────────────────────────────────────────────────────
  const subtotal  = cartItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
  const total     = Math.max(0, subtotal - discountAmount + tipAmount)

  // ── Add item to cart ─────────────────────────────────────────────────────────
  const handleAddItem = () => {
    if (!itemForm.description.trim()) return
    if (itemForm.quantity < 1)        return
    if (itemForm.unitPrice <= 0)      return

    const newItem: CartItem = {
      id:          crypto.randomUUID(),
      description: itemForm.description.trim(),
      quantity:    itemForm.quantity,
      unitPrice:   Math.floor(itemForm.unitPrice),
      staffId:     itemForm.staffId || null,
    }
    setCartItems((prev) => [...prev, newItem])
    setItemForm({ description: '', quantity: 1, unitPrice: 0, staffId: '' })
  }

  // ── Remove item ──────────────────────────────────────────────────────────────
  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  // ── Submit sale ──────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!currentShift || cartItems.length === 0) return
    setError(null)

    startTransition(async () => {
      const result = await createRetailSale({
        businessId,
        shiftId:        currentShift.id,
        customerId:     selectedCustomer?.id ?? null,
        paymentMethod,
        tipAmount:      Math.floor(tipAmount),
        discountAmount: Math.floor(discountAmount),
        items:          cartItems.map((item) => ({
          description: item.description,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          staffId:     item.staffId ?? null,
        })),
      })

      if (result.success) {
        // Clear cart
        setCartItems([])
        setTipAmount(0)
        setDiscountAmount(0)
        setSelectedCustomer(null)
        setPaymentMethod('cash')
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        router.refresh()
      } else {
        setError(result.message ?? 'Ocurrió un error al registrar la venta.')
      }
    })
  }

  const canSubmit = !!currentShift && cartItems.length > 0 && !isPending

  return (
    <div className="flex flex-col gap-6 pt-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-6 border-b" style={{ borderColor: '#2A2A2A' }}>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary-color, #C5A059) 12%, transparent)',
            border:          '1px solid color-mix(in srgb, var(--primary-color, #C5A059) 25%, transparent)',
          }}
        >
          <ShoppingBag size={22} style={{ color: 'var(--primary-color, #C5A059)' }} />
        </div>
        <div>
          <h1 className="font-serif font-bold text-xl" style={{ color: '#F4F4F4' }}>
            Punto de Venta
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Venta directa de productos sin cita previa
          </p>
        </div>
      </div>

      {/* ── No-shift warning ────────────────────────────────────────────── */}
      {!currentShift && <NoShiftBanner slug={slug} />}

      {/* ── Success toast ───────────────────────────────────────────────── */}
      {success && (
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}
        >
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-400">
            Venta registrada exitosamente
          </p>
        </div>
      )}

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ────────────────────────────────────────────────────────────────
            LEFT — Cart builder
           ──────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Section header */}
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Nueva Venta
          </h2>

          {/* ── Item entry form ─────────────────────────────────────────── */}
          <SectionCard>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--primary-color, #C5A059)' }}
            >
              Agregar ítem
            </p>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(244,244,244,0.45)' }}>
                Descripción <span className="text-red-400">*</span>
              </label>
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="Ej: Pomada Suavecito 4oz"
                value={itemForm.description}
                onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddItem()
                  }
                }}
              />
            </div>

            {/* Quantity + Unit price row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(244,244,244,0.45)' }}>
                  Cantidad
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  style={inputStyle}
                  value={itemForm.quantity}
                  onChange={(e) =>
                    setItemForm((p) => ({
                      ...p,
                      quantity: Math.max(1, Math.floor(Number(e.target.value))),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(244,244,244,0.45)' }}>
                  Precio unit. (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="0"
                  value={itemForm.unitPrice === 0 ? '' : itemForm.unitPrice}
                  onChange={(e) =>
                    setItemForm((p) => ({
                      ...p,
                      unitPrice: Math.floor(Number(e.target.value)),
                    }))
                  }
                />
              </div>
            </div>

            {/* Assign to staff */}
            {staffList.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(244,244,244,0.45)' }}>
                  Asignar a barbero{' '}
                  <span className="font-normal normal-case" style={{ color: '#52525b' }}>
                    (opcional)
                  </span>
                </label>
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={itemForm.staffId}
                  onChange={(e) => setItemForm((p) => ({ ...p, staffId: e.target.value }))}
                >
                  <option value="">Sin asignar</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Add button */}
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!itemForm.description.trim() || itemForm.unitPrice <= 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:scale-100"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--primary-color, #C5A059) 15%, transparent)',
                color:           'var(--primary-color, #C5A059)',
                border:          '1px solid color-mix(in srgb, var(--primary-color, #C5A059) 25%, transparent)',
              }}
            >
              <Plus size={14} />
              Agregar al carrito
            </button>
          </SectionCard>

          {/* ── Cart items list ──────────────────────────────────────────── */}
          {cartItems.length > 0 && (
            <SectionCard>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--primary-color, #C5A059)' }}
              >
                Carrito ({cartItems.length} {cartItems.length === 1 ? 'ítem' : 'ítems'})
              </p>

              <div className="flex flex-col" style={{ borderColor: '#2A2A2A' }}>
                {cartItems.map((item) => {
                  const subtotalItem = item.quantity * item.unitPrice
                  const staff        = staffList.find((s) => s.id === item.staffId)

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-3 first:pt-0"
                      style={{ borderBottom: '1px solid #2A2A2A' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.description}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {item.quantity} × {formatCOP(item.unitPrice)}
                          {staff && (
                            <span
                              className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                color:           'var(--primary-color, #C5A059)',
                                backgroundColor: 'color-mix(in srgb, var(--primary-color, #C5A059) 12%, transparent)',
                              }}
                            >
                              {staff.full_name}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-white flex-shrink-0">
                        {formatCOP(subtotalItem)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                        title="Eliminar ítem"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* ── Summary + payment ─────────────────────────────────────────── */}
          <SectionCard>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--primary-color, #C5A059)' }}
            >
              Resumen
            </p>

            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'rgba(244,244,244,0.55)' }}>Subtotal</span>
              <span className="font-medium text-white">{formatCOP(subtotal)}</span>
            </div>

            {/* Descuento */}
            <div className="flex items-center gap-3">
              <label className="text-sm flex-shrink-0 w-24" style={{ color: 'rgba(244,244,244,0.55)' }}>
                Descuento
              </label>
              <input
                type="number"
                min={0}
                className={`${inputCls} text-right`}
                style={inputStyle}
                placeholder="0"
                value={discountAmount === 0 ? '' : discountAmount}
                onChange={(e) => setDiscountAmount(Math.floor(Math.max(0, Number(e.target.value))))}
              />
            </div>

            {/* Propina */}
            <div className="flex items-center gap-3">
              <label className="text-sm flex-shrink-0 w-24" style={{ color: 'rgba(244,244,244,0.55)' }}>
                Propina
              </label>
              <input
                type="number"
                min={0}
                className={`${inputCls} text-right`}
                style={inputStyle}
                placeholder="0"
                value={tipAmount === 0 ? '' : tipAmount}
                onChange={(e) => setTipAmount(Math.floor(Math.max(0, Number(e.target.value))))}
              />
            </div>

            {/* Divider */}
            <div className="h-px" style={{ backgroundColor: '#2A2A2A' }} />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">TOTAL</span>
              <span
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: 'var(--primary-color, #C5A059)' }}
              >
                {formatCOP(total)}
              </span>
            </div>

            {/* Payment method pills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(244,244,244,0.45)' }}>
                Método de pago
              </label>
              <div className="flex gap-2">
                <PaymentBtn label="Efectivo"     value="cash"     active={paymentMethod === 'cash'}     onClick={setPaymentMethod} />
                <PaymentBtn label="Tarjeta"      value="card"     active={paymentMethod === 'card'}     onClick={setPaymentMethod} />
                <PaymentBtn label="Transferencia" value="transfer" active={paymentMethod === 'transfer'} onClick={setPaymentMethod} />
              </div>
            </div>

            {/* Customer search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(244,244,244,0.45)' }}>
                Cliente{' '}
                <span className="font-normal normal-case" style={{ color: '#52525b' }}>
                  (opcional — venta anónima si se deja en blanco)
                </span>
              </label>
              <CustomerSearch
                businessId={businessId}
                selectedCustomer={selectedCustomer}
                onSelect={setSelectedCustomer}
              />
            </div>

            {/* Error message */}
            {error && (
              <div
                className="flex items-start gap-2 rounded-xl border px-3 py-2.5"
                style={{ backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.25)' }}
              >
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Register sale button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--primary-color, #C5A059)',
                color:           '#080808',
              }}
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Receipt size={16} />
              )}
              {isPending ? 'Registrando...' : 'Registrar Venta'}
            </button>

            {/* Disabled hint */}
            {!currentShift && cartItems.length > 0 && (
              <p className="text-[11px] text-center text-amber-400/70">
                Abre un turno de caja para habilitar el registro de ventas.
              </p>
            )}
          </SectionCard>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            RIGHT — Recent sales
           ──────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(244,244,244,0.45)' }}>
            Ventas Recientes
          </h2>

          <SectionCard className="!gap-0">
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--primary-color, #C5A059) 10%, transparent)',
                    border:          '1px solid color-mix(in srgb, var(--primary-color, #C5A059) 20%, transparent)',
                  }}
                >
                  <ShoppingBag
                    size={24}
                    style={{ color: 'var(--primary-color, #C5A059)', opacity: 0.5 }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Sin ventas recientes</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(244,244,244,0.40)' }}>
                    Las ventas registradas aparecerán aquí
                  </p>
                </div>
              </div>
            ) : (
              recentSales.map((sale) => <RecentSaleRow key={sale.id} sale={sale} />)
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
