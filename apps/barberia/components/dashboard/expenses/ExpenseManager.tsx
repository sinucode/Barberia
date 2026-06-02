'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  X,
  Loader2,
  Trash2,
  Receipt,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
} from 'lucide-react'
import {
  createExpense,
  deleteExpense,
  getProfitLoss,
} from '@/actions/expenses'
import type { ExpenseCreateData } from '@/actions/expenses'
import type { Expense, ProfitLossResult } from '@xinuco/types'
import { AdminPageHeader } from '@xinuco/ui'
import { AdminEmptyState } from '@xinuco/ui'
import { formatCOP } from '@xinuco/utils'

// ── Categorías de gasto ───────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  rent:      'Arriendo',
  supplies:  'Insumos',
  utilities: 'Servicios',
  salary:    'Nómina',
  other:     'Otros',
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const CATEGORY_COLORS: Record<string, string> = {
  rent:      'text-blue-400 bg-blue-400/10 border-blue-400/20',
  supplies:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  utilities: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  salary:    'text-green-400 bg-green-400/10 border-green-400/20',
  other:     'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
}

// ── Helpers de fechas ─────────────────────────────────────────────────────────

function getMonthRange(offset: number = 0): { from: string; to: string; label: string } {
  const now = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + offset

  const from = new Date(year, month, 1)
  const to   = new Date(year, month + 1, 0)

  const label = from.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return {
    from:  from.toISOString().slice(0, 10),
    to:    to.toISOString().slice(0, 10),
    label: label.charAt(0).toUpperCase() + label.slice(1),
  }
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
  const label  = CATEGORY_LABELS[category] ?? category
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colors}`}
    >
      {label}
    </span>
  )
}

function PLMetricCard({
  label,
  value,
  positive,
  neutral,
}: {
  label:    string
  value:    number
  positive?: boolean
  neutral?:  boolean
}) {
  const colorClass = neutral
    ? 'text-xinuco-muted'
    : positive
      ? value >= 0 ? 'text-emerald-400' : 'text-red-400'
      : 'text-red-400'

  const Icon = positive && value >= 0 ? TrendingUp : positive && value < 0 ? TrendingDown : undefined

  return (
    <div
      className="flex flex-col gap-1 rounded-xl px-4 py-3"
      style={{ background: 'var(--surface-color, rgba(255,255,255,0.03))', border: '1px solid var(--border-color)' }}
    >
      <span className="text-[10px] font-semibold text-xinuco-muted uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold tabular-nums flex items-center gap-1.5 ${colorClass}`}>
        {Icon && <Icon size={16} />}
        {formatCOP(value)}
      </span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — ExpenseManager
// ════════════════════════════════════════════════════════════════════════════

interface ExpenseManagerProps {
  initialExpenses: Expense[]
  initialPL:       ProfitLossResult | null
  businessId:      string
  slug:            string
  initialDateFrom: string
  initialDateTo:   string
}

export function ExpenseManager({
  initialExpenses,
  initialPL,
  businessId,
  initialDateFrom,
  initialDateTo,
}: ExpenseManagerProps) {
  const [expenses,   setExpenses]   = useState<Expense[]>(initialExpenses)
  const [pl,         setPL]         = useState<ProfitLossResult | null>(initialPL)
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [dateFrom,   setDateFrom]   = useState(initialDateFrom)
  const [dateTo,     setDateTo]     = useState(initialDateTo)
  const [monthLabel, setMonthLabel] = useState<string>(() => getMonthRange(0).label)
  const [monthOffset, setMonthOffset] = useState(0)
  const [isPendingPL, startPL]      = useTransition()

  // Refrescar P&G cuando cambia el rango de fechas
  const refreshPL = useCallback((from: string, to: string) => {
    startPL(async () => {
      try {
        const result = await getProfitLoss(businessId, from, to)
        setPL(result)
      } catch {
        // Silencioso — los datos existentes permanecen
      }
    })
  }, [businessId])

  function handleMonthChange(offset: number) {
    const range = getMonthRange(offset)
    setMonthOffset(offset)
    setDateFrom(range.from)
    setDateTo(range.to)
    setMonthLabel(range.label)
    refreshPL(range.from, range.to)
  }

  const handleExpenseCreated = useCallback((expense: Expense) => {
    setExpenses(prev => [expense, ...prev])
    setSheetOpen(false)
    // Refrescar P&G con el rango actual
    refreshPL(dateFrom, dateTo)
  }, [dateFrom, dateTo, refreshPL])

  const handleExpenseDeleted = useCallback((expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId))
    refreshPL(dateFrom, dateTo)
  }, [dateFrom, dateTo, refreshPL])

  // Filtrar gastos según el rango de fechas actual
  const visibleExpenses = expenses.filter(e => {
    return e.expense_date >= dateFrom && e.expense_date <= dateTo
  })

  return (
    <>
      <AdminPageHeader
        title="Gastos"
        subtitle="Registra gastos operativos y visualiza el estado de resultados del período."
        hasData={true}
        actionButton={
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="btn-primary flex items-center gap-2 animate-fade-in"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nuevo Gasto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        }
      />

      {/* ── Selector de período ─────────────────────────────────────────── */}
      <section aria-label="Selector de período" className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => handleMonthChange(monthOffset - 1)}
          className="btn-ghost text-xs flex items-center gap-1.5"
        >
          ← Mes anterior
        </button>
        <span
          className="flex-1 text-center text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: 'var(--surface-color, rgba(255,255,255,0.03))', border: '1px solid var(--border-color)' }}
        >
          <CalendarDays size={13} className="inline mr-1.5 opacity-70" />
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => handleMonthChange(monthOffset + 1)}
          disabled={monthOffset >= 0}
          className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-30"
        >
          Mes siguiente →
        </button>
      </section>

      {/* ── Resumen P&G ──────────────────────────────────────────────────── */}
      {pl && (
        <section
          aria-label="Estado de Resultados"
          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-opacity duration-300 ${isPendingPL ? 'opacity-50' : 'opacity-100'}`}
        >
          <PLMetricCard label="Ingresos" value={pl.revenue.total} neutral />
          <PLMetricCard label="Gastos"   value={pl.expenses.total} neutral />
          <PLMetricCard label="Utilidad Bruta" value={pl.gross_profit} positive />
          <PLMetricCard label="Utilidad Neta"  value={pl.net_profit}   positive />
        </section>
      )}

      {isPendingPL && !pl && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[72px] rounded-xl"
              style={{ background: 'var(--surface-color, rgba(255,255,255,0.03))' }}
            />
          ))}
        </div>
      )}

      {/* ── Detalle de gastos por categoría (desde P&G) ──────────────────── */}
      {pl && pl.expenses.by_category.length > 0 && (
        <section
          aria-label="Gastos por categoría"
          className="rounded-xl overflow-hidden animate-fade-in"
          style={{ border: '1px solid var(--border-color)' }}
        >
          <div
            className="px-5 py-3 text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
            style={{ background: 'var(--surface-color, rgba(255,255,255,0.03))', borderBottom: '1px solid var(--border-color)' }}
          >
            Gastos por categoría
          </div>
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {pl.expenses.by_category.map(entry => (
              <div
                key={entry.category}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <CategoryBadge category={entry.category} />
                <span className="text-sm font-semibold tabular-nums text-xinuco-text">
                  {formatCOP(entry.total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Lista de gastos ───────────────────────────────────────────────── */}
      <section aria-label="Lista de gastos" className="mt-2">
        {visibleExpenses.length === 0 ? (
          <AdminEmptyState
            icon={Receipt}
            title="Sin gastos en este período"
            description="Registra los gastos operativos del negocio: arriendo, insumos, servicios públicos, nómina, etc."
            actionLabel="Registrar Primer Gasto"
            onAction={() => setSheetOpen(true)}
          />
        ) : (
          <div
            className="overflow-x-auto rounded-xl animate-fade-in"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <table className="w-full text-sm" aria-label="Tabla de gastos">
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background:   'var(--surface-color, rgba(255,255,255,0.03))',
                  }}
                >
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
                    Categoría
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden md:table-cell">
                    Fecha
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleExpenses.map(expense => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onDelete={handleExpenseDeleted}
                  />
                ))}
              </tbody>

              <tfoot>
                <tr
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--surface-color, rgba(255,255,255,0.02))',
                  }}
                >
                  <td colSpan={2} className="px-5 py-3 text-xs text-xinuco-muted">
                    {visibleExpenses.length} gasto{visibleExpenses.length !== 1 ? 's' : ''} en el período
                  </td>
                  <td colSpan={3} className="px-5 py-3 text-right text-xs font-semibold tabular-nums text-xinuco-text">
                    {formatCOP(visibleExpenses.reduce((sum, e) => sum + e.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Sheet Panel */}
      {sheetOpen && (
        <ExpenseSheet
          businessId={businessId}
          defaultDate={dateFrom.slice(0, 10)}
          onClose={() => setSheetOpen(false)}
          onSuccess={handleExpenseCreated}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// FILA DE LA TABLA — Un gasto
// ════════════════════════════════════════════════════════════════════════════

function ExpenseRow({
  expense,
  onDelete,
}: {
  expense:  Expense
  onDelete: (id: string) => void
}) {
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [isPendingDel,  startDelete]      = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setMenuOpen(false)
    startDelete(async () => {
      const result = await deleteExpense(expense.id)
      if (!result.error) onDelete(expense.id)
    })
  }

  return (
    <tr
      className="transition-all duration-200 hover:bg-white/[0.02]"
      style={{
        borderTop: '1px solid var(--border-color)',
        opacity:   isPendingDel ? 0.4 : 1,
      }}
    >
      {/* Descripción */}
      <td className="px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-xinuco-text leading-tight text-sm">
            {expense.description}
          </span>
          <span className="sm:hidden">
            <CategoryBadge category={expense.category} />
          </span>
          {expense.is_recurring && (
            <span className="inline-flex items-center gap-1 text-[10px] text-xinuco-muted">
              <ToggleRight size={10} className="text-emerald-400" />
              Recurrente
            </span>
          )}
        </div>
      </td>

      {/* Categoría — desktop */}
      <td className="px-5 py-4 hidden sm:table-cell">
        <CategoryBadge category={expense.category} />
      </td>

      {/* Fecha — desktop */}
      <td className="px-5 py-4 hidden md:table-cell text-sm text-xinuco-muted tabular-nums">
        {new Date(expense.expense_date + 'T12:00:00').toLocaleDateString('es-CO', {
          day:   '2-digit',
          month: 'short',
          year:  'numeric',
        })}
      </td>

      {/* Monto */}
      <td className="px-5 py-4 text-center">
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary-color)' }}>
          {formatCOP(expense.amount)}
        </span>
      </td>

      {/* Acciones */}
      <td className="px-5 py-4 text-right">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false) }}
            disabled={isPendingDel}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            aria-label={`Acciones para ${expense.description}`}
          >
            {isPendingDel ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false) }} />
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden animate-fade-in origin-top-right"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium hover:bg-white/[0.04] transition-colors text-left"
                  style={{ color: confirmDelete ? '#f87171' : 'var(--text-color)' }}
                >
                  <Trash2
                    size={13}
                    className={confirmDelete ? 'text-red-400' : 'text-red-400/60'}
                  />
                  {confirmDelete ? 'Confirmar eliminación' : 'Eliminar gasto'}
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET PANEL — Registrar nuevo gasto
// ════════════════════════════════════════════════════════════════════════════

function ExpenseSheet({
  businessId,
  defaultDate,
  onClose,
  onSuccess,
}: {
  businessId:  string
  defaultDate: string
  onClose:     () => void
  onSuccess:   (expense: Expense) => void
}) {
  const backdropRef = useRef<HTMLDivElement>(null)

  const [category,     setCategory]    = useState<string>('rent')
  const [description,  setDescription] = useState('')
  const [amountStr,    setAmountStr]   = useState('')
  const [expenseDate,  setExpenseDate] = useState(defaultDate)
  const [isRecurring,  setIsRecurring] = useState(false)
  const [formError,    setFormError]   = useState<string | null>(null)
  const [isPending,    startTransition] = useTransition()

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const amount = parseInt(amountStr.replace(/\D/g, ''), 10)

    if (!description.trim()) {
      return setFormError('La descripción es requerida.')
    }
    if (!amount || amount <= 0) {
      return setFormError('El monto debe ser mayor a $0 COP.')
    }
    if (!expenseDate) {
      return setFormError('La fecha es requerida.')
    }

    const data: ExpenseCreateData = {
      category,
      description: description.trim(),
      amount,
      expense_date: expenseDate,
      is_recurring: isRecurring,
    }

    startTransition(async () => {
      try {
        const result = await createExpense(businessId, data)

        if (result.error) {
          setFormError(result.error)
          return
        }

        if (result.expense) {
          onSuccess(result.expense)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.'
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
      {/* Panel Sheet */}
      <div
        className="h-full overflow-y-auto animate-slide-in-right w-[95vw] sm:w-[420px]"
        style={{
          background: 'var(--bg-color)',
          borderLeft: '1px solid var(--border-color)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-xinuco-text">Nuevo Gasto</h2>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Registra un gasto operativo del negocio.
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Categoría */}
          <div className="flex flex-col gap-2">
            <label htmlFor="exp-category" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Categoría *
            </label>
            <select
              id="exp-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input-base"
              required
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-2">
            <label htmlFor="exp-desc" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Descripción *
            </label>
            <input
              id="exp-desc"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Pago arriendo local mes mayo"
              required
              autoFocus
              maxLength={200}
              className="input-base"
            />
          </div>

          {/* Monto */}
          <div className="flex flex-col gap-2">
            <label htmlFor="exp-amount" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Monto COP *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-xinuco-muted pointer-events-none">
                $
              </span>
              <input
                id="exp-amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1000}
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="Ej: 1500000"
                required
                className="input-base pl-7"
              />
            </div>
            <p className="text-xs text-xinuco-muted">
              Entero COP sin decimales (ej: 1500000 = $1.500.000).
            </p>
          </div>

          {/* Fecha */}
          <div className="flex flex-col gap-2">
            <label htmlFor="exp-date" className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
              Fecha *
            </label>
            <input
              id="exp-date"
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              required
              className="input-base"
            />
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px solid var(--border-color)' }} />

          {/* Toggle recurrente */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-xinuco-text">Gasto recurrente</p>
              <p className="text-xs text-xinuco-muted mt-0.5">Se repite mensualmente (solo referencia visual).</p>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(prev => !prev)}
              className="transition-colors"
              aria-label={isRecurring ? 'Desactivar recurrencia' : 'Activar recurrencia'}
            >
              {isRecurring ? (
                <ToggleRight size={32} className="text-emerald-400" />
              ) : (
                <ToggleLeft size={32} className="text-xinuco-muted" />
              )}
            </button>
          </div>

          {/* Error */}
          {formError && (
            <p
              role="alert"
              className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 animate-fade-in"
            >
              {formError}
            </p>
          )}

          {/* Botones */}
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
                  Guardar Gasto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
