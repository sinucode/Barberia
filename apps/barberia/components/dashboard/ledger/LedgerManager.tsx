'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  X,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Clock,
} from 'lucide-react'
import { recordAdvance, recordPayment, getStaffLedger } from '@/actions/ledger'
import type { StaffBalanceWithDetails, LedgerEntryWithStaff } from '@/actions/ledger'
import type { LedgerEntryType } from '@/types/database'
import { AdminPageHeader } from '@/components/ui/AdminPageHeader'
import { AdminEmptyState } from '@/components/ui/AdminEmptyState'
import { formatCOP } from '@/lib/utils/format'

// ── Badge de tipo de entrada ──────────────────────────────────────────────────

const ENTRY_TYPE_CONFIG: Record<
  LedgerEntryType,
  { label: string; colors: string; icon: React.ReactNode }
> = {
  commission: {
    label:  'Comisión',
    colors: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    icon:   <TrendingUp size={10} />,
  },
  tip: {
    label:  'Propina',
    colors: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    icon:   <ArrowUpRight size={10} />,
  },
  advance: {
    label:  'Anticipo',
    colors: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    icon:   <ArrowDownLeft size={10} />,
  },
  payment: {
    label:  'Liquidación',
    colors: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    icon:   <ArrowUpRight size={10} />,
  },
}

function EntryTypeBadge({ type }: { type: LedgerEntryType }) {
  const config = ENTRY_TYPE_CONFIG[type]
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${config.colors}`}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

// ── Tarjeta de balance ────────────────────────────────────────────────────────

function BalanceCard({ balance }: { balance: StaffBalanceWithDetails }) {
  const isNegative = balance.current_balance < 0

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 animate-fade-in"
      style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.03))' }}
    >
      {/* Saldo principal */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider mb-1">
            Saldo Actual
          </span>
          <span
            className="text-3xl font-bold tabular-nums leading-none"
            style={{ color: isNegative ? '#f87171' : 'var(--primary-color)' }}
          >
            {formatCOP(Math.abs(balance.current_balance))}
          </span>
          {isNegative && (
            <span className="text-xs text-red-400 mt-1">Saldo negativo</span>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
            borderColor:     'color-mix(in srgb, var(--primary-color) 25%, transparent)',
          }}
        >
          <Wallet size={22} style={{ color: 'var(--primary-color)' }} />
        </div>
      </div>

      {/* Desglose */}
      <div
        className="grid grid-cols-3 gap-3 pt-3"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-xinuco-muted uppercase tracking-wider">
            Ganado
          </span>
          <span className="text-sm font-bold tabular-nums text-emerald-400">
            {formatCOP(balance.total_earned)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-xinuco-muted uppercase tracking-wider">
            Anticipos
          </span>
          <span className="text-sm font-bold tabular-nums text-yellow-400">
            {formatCOP(balance.total_advances)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-xinuco-muted uppercase tracking-wider">
            Liquidado
          </span>
          <span className="text-sm font-bold tabular-nums text-sky-400">
            {formatCOP(balance.total_paid_out)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — LedgerManager
// ════════════════════════════════════════════════════════════════════════════

interface LedgerManagerProps {
  initialBalances: StaffBalanceWithDetails[]
  businessId:      string
  slug:            string
}

export function LedgerManager({
  initialBalances,
  businessId,
  slug,
}: LedgerManagerProps) {
  const [balances, setBalances] = useState<StaffBalanceWithDetails[]>(initialBalances)
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialBalances[0]?.staff_id ?? ''
  )
  const [entries, setEntries] = useState<LedgerEntryWithStaff[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [advanceSheetOpen, setAdvanceSheetOpen] = useState(false)
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)

  const selectedBalance = balances.find(b => b.staff_id === selectedStaffId)

  // Cargar entradas al cambiar de staff
  const loadEntries = useCallback(
    async (staffId: string) => {
      if (!staffId) return
      setLoadingEntries(true)
      try {
        const result = await getStaffLedger(businessId, staffId, 50)
        setEntries(result)
      } catch {
        setEntries([])
      } finally {
        setLoadingEntries(false)
      }
    },
    [businessId]
  )

  useEffect(() => {
    if (selectedStaffId) {
      loadEntries(selectedStaffId)
    }
  }, [selectedStaffId, loadEntries])

  // Actualizar saldo local tras registrar operación
  function refreshBalance(staffId: string, delta: { advance?: number; payment?: number }) {
    setBalances(prev =>
      prev.map(b => {
        if (b.staff_id !== staffId) return b
        const advance = delta.advance ?? 0
        const payment = delta.payment ?? 0
        return {
          ...b,
          total_advances:  b.total_advances  + advance,
          total_paid_out:  b.total_paid_out  + payment,
          current_balance: b.current_balance - advance - payment,
        }
      })
    )
  }

  if (balances.length === 0) {
    return (
      <AdminEmptyState
        icon={Wallet}
        title="Sin empleados activos"
        description="No hay empleados activos en el negocio. Añade personal desde la sección Staff para gestionar su billetera."
        actionLabel="Ir a Staff"
        onAction={() => { window.location.href = `/${slug}/dashboard/staff` }}
      />
    )
  }

  return (
    <>
      <AdminPageHeader
        title="Billetera del Staff"
        subtitle="Comisiones, propinas, anticipos y liquidaciones de cada empleado."
        hasData={true}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdvanceSheetOpen(true)}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <ArrowDownLeft size={15} />
              <span className="hidden sm:inline">Anticipo</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentSheetOpen(true)}
              className="btn-primary flex items-center gap-2 animate-fade-in"
            >
              <ArrowUpRight size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Liquidar</span>
              <span className="sm:hidden">Liquidar</span>
            </button>
          </div>
        }
      />

      {/* Selector de Staff */}
      <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
        {balances.map(b => (
          <button
            key={b.staff_id}
            type="button"
            onClick={() => setSelectedStaffId(b.staff_id)}
            className={[
              'shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border whitespace-nowrap',
              selectedStaffId === b.staff_id
                ? 'text-[#080808] border-transparent'
                : 'text-xinuco-muted border-transparent hover:text-xinuco-text hover:bg-white/[0.04]',
            ].join(' ')}
            style={
              selectedStaffId === b.staff_id
                ? { background: 'var(--primary-color)' }
                : { borderColor: 'var(--border-color)' }
            }
          >
            {b.staff.full_name}
          </button>
        ))}
      </div>

      {/* Tarjeta de balance */}
      {selectedBalance && (
        <BalanceCard balance={selectedBalance} />
      )}

      {/* Tabla de movimientos */}
      <section aria-label="Historial de movimientos" className="mt-2">
        {loadingEntries ? (
          <LedgerSkeleton />
        ) : entries.length === 0 ? (
          <AdminEmptyState
            icon={Clock}
            title="Sin movimientos"
            description="Este empleado aún no tiene registros en su billetera. Las comisiones y propinas aparecerán automáticamente al completar citas."
            actionLabel="Registrar Anticipo"
            onAction={() => setAdvanceSheetOpen(true)}
          />
        ) : (
          <div
            className="overflow-x-auto rounded-xl animate-fade-in"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <table className="w-full text-sm" aria-label="Historial de movimientos del ledger">
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background:   'var(--surface-color, rgba(255,255,255,0.03))',
                  }}
                >
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden md:table-cell">
                    Nota
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <LedgerRow key={entry.id} entry={entry} />
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--surface-color, rgba(255,255,255,0.02))',
                  }}
                >
                  <td colSpan={4} className="px-5 py-3 text-xs text-xinuco-muted">
                    {entries.length} movimiento{entries.length !== 1 ? 's' : ''} · mostrando los últimos 50
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Sheets */}
      {advanceSheetOpen && selectedBalance && (
        <AdvanceSheet
          businessId={businessId}
          balances={balances}
          initialStaffId={selectedStaffId}
          onClose={() => setAdvanceSheetOpen(false)}
          onSuccess={(staffId, amount) => {
            refreshBalance(staffId, { advance: amount })
            loadEntries(selectedStaffId)
          }}
        />
      )}

      {paymentSheetOpen && selectedBalance && (
        <PaymentSheet
          businessId={businessId}
          balances={balances}
          initialStaffId={selectedStaffId}
          onClose={() => setPaymentSheetOpen(false)}
          onSuccess={(staffId, amount) => {
            refreshBalance(staffId, { payment: amount })
            loadEntries(selectedStaffId)
          }}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// FILA DEL LEDGER
// ════════════════════════════════════════════════════════════════════════════

function LedgerRow({ entry }: { entry: LedgerEntryWithStaff }) {
  const isCredit = entry.entry_type === 'commission' || entry.entry_type === 'tip'

  const dateLabel = new Date(entry.created_at).toLocaleDateString('es-CO', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })

  return (
    <tr
      className="transition-all duration-200 hover:bg-white/[0.02]"
      style={{ borderTop: '1px solid var(--border-color)' }}
    >
      {/* Tipo */}
      <td className="px-5 py-4">
        <EntryTypeBadge type={entry.entry_type} />
      </td>

      {/* Monto */}
      <td className="px-5 py-4 text-right">
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: isCredit ? '#34d399' : '#f87171' }}
        >
          {isCredit ? '+' : '-'}{formatCOP(entry.amount)}
        </span>
      </td>

      {/* Nota — desktop */}
      <td className="px-5 py-4 hidden md:table-cell">
        <span className="text-xs text-xinuco-muted truncate max-w-xs block">
          {entry.notes ?? '—'}
        </span>
      </td>

      {/* Fecha — desktop */}
      <td className="px-5 py-4 text-right hidden sm:table-cell">
        <span className="text-xs text-xinuco-muted tabular-nums">{dateLabel}</span>
      </td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET: Registrar Anticipo
// ════════════════════════════════════════════════════════════════════════════

interface AdvanceSheetProps {
  businessId:     string
  balances:       StaffBalanceWithDetails[]
  initialStaffId: string
  onClose:        () => void
  onSuccess:      (staffId: string, amount: number) => void
}

function AdvanceSheet({
  businessId,
  balances,
  initialStaffId,
  onClose,
  onSuccess,
}: AdvanceSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  const [staffId,    setStaffId]    = useState(initialStaffId)
  const [amount,     setAmount]     = useState('')
  const [notes,      setNotes]      = useState('')
  const [formError,  setFormError]  = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const parsedAmount = parseInt(amount, 10)
    if (!parsedAmount || parsedAmount <= 0) {
      return setFormError('El monto debe ser un número entero mayor a $0.')
    }
    if (!staffId) {
      return setFormError('Selecciona un empleado.')
    }

    startTransition(async () => {
      try {
        const result = await recordAdvance(businessId, staffId, parsedAmount, notes)
        if (result.error) {
          setFormError(result.error)
          return
        }
        onSuccess(staffId, parsedAmount)
        onClose()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado.'
        setFormError(message)
      }
    })
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className="h-full overflow-y-auto animate-slide-in-right w-[95vw] sm:w-[420px]"
        style={{ background: 'var(--bg-color)', borderLeft: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">Registrar Anticipo</h2>
            <p className="text-xs text-xinuco-muted mt-0.5">
              El anticipo reduce el saldo del empleado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Selector de staff */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="adv-staff"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Empleado *
            </label>
            <select
              id="adv-staff"
              value={staffId}
              onChange={e => setStaffId(e.target.value)}
              className="input-base"
              required
            >
              <option value="">Seleccionar empleado…</option>
              {balances.map(b => (
                <option key={b.staff_id} value={b.staff_id}>
                  {b.staff.full_name} — Saldo: {formatCOP(b.current_balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Monto */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="adv-amount"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Monto COP *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-xinuco-muted pointer-events-none">
                $
              </span>
              <input
                id="adv-amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1000}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ej: 50000"
                required
                autoFocus
                className="input-base pl-7"
              />
            </div>
            <p className="text-xs text-xinuco-muted">Ingresa el monto en COP entero (sin decimales).</p>
          </div>

          {/* Nota */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="adv-notes"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Nota *
            </label>
            <textarea
              id="adv-notes"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Anticipo semana del 19 al 25 de mayo"
              required
              className="input-base resize-none"
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 animate-fade-in"
            >
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium text-xinuco-muted border transition-colors hover:text-xinuco-text hover:bg-white/[0.03]"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 btn-primary !py-3 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Registrar Anticipo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET: Liquidar Saldo
// ════════════════════════════════════════════════════════════════════════════

interface PaymentSheetProps {
  businessId:     string
  balances:       StaffBalanceWithDetails[]
  initialStaffId: string
  onClose:        () => void
  onSuccess:      (staffId: string, amount: number) => void
}

function PaymentSheet({
  businessId,
  balances,
  initialStaffId,
  onClose,
  onSuccess,
}: PaymentSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  const [staffId,    setStaffId]    = useState(initialStaffId)
  const [amount,     setAmount]     = useState(() => {
    const b = balances.find(b => b.staff_id === initialStaffId)
    return b && b.current_balance > 0 ? String(b.current_balance) : ''
  })
  const [notes,      setNotes]      = useState('')
  const [formError,  setFormError]  = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()
  const [expanded,   setExpanded]   = useState(false)

  const selectedBalance = balances.find(b => b.staff_id === staffId)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Pre-rellenar monto al cambiar staff
  function handleStaffChange(id: string) {
    setStaffId(id)
    const b = balances.find(b => b.staff_id === id)
    if (b && b.current_balance > 0) {
      setAmount(String(b.current_balance))
    } else {
      setAmount('')
    }
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const parsedAmount = parseInt(amount, 10)
    if (!parsedAmount || parsedAmount <= 0) {
      return setFormError('El monto debe ser un número entero mayor a $0.')
    }
    if (!staffId) {
      return setFormError('Selecciona un empleado.')
    }

    startTransition(async () => {
      try {
        const result = await recordPayment(businessId, staffId, parsedAmount, notes)
        if (result.error) {
          setFormError(result.error)
          return
        }
        onSuccess(staffId, parsedAmount)
        onClose()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado.'
        setFormError(message)
      }
    })
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className="h-full overflow-y-auto animate-slide-in-right w-[95vw] sm:w-[420px]"
        style={{ background: 'var(--bg-color)', borderLeft: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">Liquidar Saldo</h2>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Registra el pago al empleado. El monto se pre-rellena con el saldo actual.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Selector de staff */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="pay-staff"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Empleado *
            </label>
            <div className="relative">
              <select
                id="pay-staff"
                value={staffId}
                onChange={e => handleStaffChange(e.target.value)}
                className="input-base"
                required
              >
                <option value="">Seleccionar empleado…</option>
                {balances.map(b => (
                  <option key={b.staff_id} value={b.staff_id}>
                    {b.staff.full_name} — Saldo: {formatCOP(b.current_balance)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xinuco-muted pointer-events-none"
              />
            </div>
          </div>

          {/* Resumen de balance */}
          {selectedBalance && (
            <div
              className="rounded-xl p-4 flex flex-col gap-1"
              style={{
                background:  'rgba(197,160,89,0.07)',
                border:      '1px solid rgba(197,160,89,0.15)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-xinuco-muted">Saldo disponible</span>
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px] text-xinuco-muted hover:text-xinuco-text transition-colors"
                >
                  {expanded ? 'Ocultar' : 'Ver desglose'}
                </button>
              </div>
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: selectedBalance.current_balance >= 0 ? 'var(--primary-color)' : '#f87171' }}
              >
                {formatCOP(selectedBalance.current_balance)}
              </span>
              {expanded && (
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-xinuco-muted">Ganado</p>
                    <p className="text-xs font-semibold text-emerald-400">
                      {formatCOP(selectedBalance.total_earned)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-xinuco-muted">Anticipos</p>
                    <p className="text-xs font-semibold text-yellow-400">
                      {formatCOP(selectedBalance.total_advances)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-xinuco-muted">Liquidado</p>
                    <p className="text-xs font-semibold text-sky-400">
                      {formatCOP(selectedBalance.total_paid_out)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monto */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="pay-amount"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Monto a pagar COP *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-xinuco-muted pointer-events-none">
                $
              </span>
              <input
                id="pay-amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1000}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ej: 120000"
                required
                autoFocus
                className="input-base pl-7"
              />
            </div>
            <p className="text-xs text-xinuco-muted">
              Pre-rellenado con el saldo actual. Puedes ajustar el monto.
            </p>
          </div>

          {/* Nota */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="pay-notes"
              className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            >
              Nota *
            </label>
            <textarea
              id="pay-notes"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Liquidación quincena mayo 2026"
              required
              className="input-base resize-none"
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 animate-fade-in"
            >
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium text-xinuco-muted border transition-colors hover:text-xinuco-text hover:bg-white/[0.03]"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 btn-primary !py-3 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <ArrowUpRight size={15} />
                  Confirmar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function LedgerSkeleton() {
  return (
    <div className="animate-pulse rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
      <div
        className="flex gap-4 px-5 py-3.5"
        style={{ background: 'var(--surface-color, rgba(255,255,255,0.03))' }}
      >
        {[24, 20, 48, 24].map((w, i) => (
          <div
            key={i}
            className={`h-3 rounded w-${w}`}
            style={{ background: 'var(--surface-color, #1a1a1a)' }}
          />
        ))}
      </div>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <div className="h-5 w-20 rounded-full" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="flex-1 h-4 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-4 w-16 rounded hidden md:block" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
          <div className="h-4 w-20 rounded hidden sm:block" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        </div>
      ))}
    </div>
  )
}
