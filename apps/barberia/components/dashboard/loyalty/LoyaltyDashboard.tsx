'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  Gift,
  Search,
  X,
  Loader2,
  Edit2,
  Check,
  AlertCircle,
  TrendingUp,
  Users,
  Award,
} from 'lucide-react'
import {
  updateLoyaltySettings,
  getClientLoyaltyBalance,
  redeemPoints,
} from '@/actions/loyalty'
import type { LoyaltySettings, LoyaltyHistoryEntry, LoyaltyBalanceResult } from '@/actions/loyalty'
import type { Customer } from '@xinuco/types'
import { AdminPageHeader } from '@xinuco/ui'
import { formatCOP } from '@xinuco/utils'

// ── Props ─────────────────────────────────────────────────────────────────────

interface LoyaltyDashboardProps {
  businessId:      string
  initialSettings: LoyaltySettings
  initialHistory:  LoyaltyHistoryEntry[]
  slug:            string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — LoyaltyDashboard
// ════════════════════════════════════════════════════════════════════════════

export function LoyaltyDashboard({
  businessId,
  initialSettings,
  initialHistory,
}: LoyaltyDashboardProps) {
  const [settings, setSettings]       = useState<LoyaltySettings>(initialSettings)
  const [history]                     = useState<LoyaltyHistoryEntry[]>(initialHistory)
  const [redeemOpen, setRedeemOpen]   = useState(false)
  const [selectedClient, setSelectedClient] = useState<Pick<Customer, 'id' | 'full_name' | 'phone'> | null>(null)
  const [clientBalance, setClientBalance]   = useState<LoyaltyBalanceResult | null>(null)
  const [settingsMsg, setSettingsMsg]       = useState<string | null>(null)

  // Estadísticas calculadas desde el historial
  const stats = computeStats(history)

  return (
    <>
      <AdminPageHeader
        title="Programa de Lealtad"
        subtitle="Tus clientes ganan puntos en cada cita. Canjéalos como descuento."
        hasData={true}
        actionButton={
          <button
            type="button"
            onClick={() => setRedeemOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Gift size={16} />
            <span className="hidden sm:inline">Redimir Puntos</span>
            <span className="sm:hidden">Redimir</span>
          </button>
        }
      />

      {/* Settings card */}
      <LoyaltySettingsCard
        businessId={businessId}
        settings={settings}
        onSaved={(updated) => {
          setSettings(updated)
          setSettingsMsg('Configuración guardada.')
          setTimeout(() => setSettingsMsg(null), 3000)
        }}
      />

      {settingsMsg && (
        <p
          role="status"
          className="text-xs px-4 py-2.5 rounded-lg border animate-fade-in"
          style={{
            background:  'rgba(197,160,89,0.08)',
            borderColor: 'rgba(197,160,89,0.2)',
            color:       'var(--primary-color)',
          }}
        >
          {settingsMsg}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={18} />}
          label="Clientes con puntos"
          value={stats.uniqueClients.toString()}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Puntos activos totales"
          value={stats.totalActive.toLocaleString('es-CO')}
        />
        <StatCard
          icon={<Award size={18} />}
          label="Puntos canjeados totales"
          value={stats.totalRedeemed.toLocaleString('es-CO')}
        />
      </div>

      {/* Búsqueda de cliente */}
      <ClientSearch
        businessId={businessId}
        settings={settings}
        onClientSelected={(client, balance) => {
          setSelectedClient(client)
          setClientBalance(balance)
          setRedeemOpen(true)
        }}
      />

      {/* Historial reciente */}
      <LoyaltyHistoryTable history={history} settings={settings} />

      {/* Sheet de redención */}
      {redeemOpen && (
        <RedeemSheet
          businessId={businessId}
          settings={settings}
          preselectedClient={selectedClient}
          preselectedBalance={clientBalance}
          onClose={() => {
            setRedeemOpen(false)
            setSelectedClient(null)
            setClientBalance(null)
          }}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CARD DE CONFIGURACIÓN — Edición inline de valores
// ════════════════════════════════════════════════════════════════════════════

function LoyaltySettingsCard({
  businessId,
  settings,
  onSaved,
}: {
  businessId: string
  settings:   LoyaltySettings
  onSaved:    (updated: LoyaltySettings) => void
}) {
  const [editing, setEditing]       = useState(false)
  const [pointValue, setPointValue] = useState(settings.loyalty_point_value_cop.toString())
  const [expiry, setExpiry]         = useState(settings.loyalty_expiry_months.toString())
  const [formError, setFormError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEdit() {
    setPointValue(settings.loyalty_point_value_cop.toString())
    setExpiry(settings.loyalty_expiry_months.toString())
    setFormError(null)
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setFormError(null)
  }

  function handleSave() {
    setFormError(null)
    const pv = parseInt(pointValue, 10)
    const ex = parseInt(expiry, 10)

    if (isNaN(pv) || pv <= 0) {
      return setFormError('El valor del punto debe ser mayor a 0.')
    }
    if (isNaN(ex) || ex < 1 || ex > 60) {
      return setFormError('Los meses deben estar entre 1 y 60.')
    }

    startTransition(async () => {
      const result = await updateLoyaltySettings(businessId, {
        loyalty_point_value_cop: pv,
        loyalty_expiry_months:   ex,
      })
      if (result.error) {
        setFormError(result.error)
        return
      }
      onSaved({ loyalty_point_value_cop: pv, loyalty_expiry_months: ex })
      setEditing(false)
    })
  }

  return (
    <div
      className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
      style={{ border: '1px solid var(--border-color)', background: 'rgba(197,160,89,0.04)' }}
    >
      <Gift size={28} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />

      <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:gap-8">
        {/* Valor del punto */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
            Valor del punto
          </span>
          {editing ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-xinuco-muted">1 pto = $</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={500}
                value={pointValue}
                onChange={e => setPointValue(e.target.value)}
                className="input-base w-28 text-sm"
                aria-label="Valor del punto en COP"
              />
              <span className="text-xs text-xinuco-muted">COP</span>
            </div>
          ) : (
            <span className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>
              1 punto = {formatCOP(settings.loyalty_point_value_cop)}
            </span>
          )}
        </div>

        {/* Vencimiento */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
            Vencimiento
          </span>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="input-base w-20 text-sm"
                aria-label="Meses de vencimiento"
              />
              <span className="text-xs text-xinuco-muted">meses</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-xinuco-text">
              Vencen en {settings.loyalty_expiry_months} mes
              {settings.loyalty_expiry_months !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Error de edición */}
      {formError && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      {/* Botones de acción */}
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
              aria-label="Cancelar"
            >
              <X size={16} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="btn-primary flex items-center gap-2 !py-2 !px-3 text-xs"
              aria-label="Guardar configuración"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Guardar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleEdit}
            className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
            aria-label="Editar configuración de lealtad"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// STAT CARD — Mini tarjeta estadística
// ════════════════════════════════════════════════════════════════════════════

function StatCard({
  icon,
  label,
  value,
}: {
  icon:  React.ReactNode
  label: string
  value: string
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2"
      style={{ border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center gap-2 text-xinuco-muted">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color: 'var(--primary-color)' }}
      >
        {value}
      </span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CLIENT SEARCH — Buscar cliente por teléfono y mostrar saldo
// ════════════════════════════════════════════════════════════════════════════

function ClientSearch({
  businessId,
  settings,
  onClientSelected,
}: {
  businessId:       string
  settings:         LoyaltySettings
  onClientSelected: (client: Pick<Customer, 'id' | 'full_name' | 'phone'>, balance: LoyaltyBalanceResult) => void
}) {
  const [phone, setPhone]                 = useState('')
  const [searching, setSearching]         = useState(false)
  const [searchResult, setSearchResult]   = useState<{
    client:  Pick<Customer, 'id' | 'full_name' | 'phone'>
    balance: LoyaltyBalanceResult
  } | null>(null)
  const [searchError, setSearchError]     = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return

    setSearching(true)
    setSearchError(null)
    setSearchResult(null)

    startTransition(async () => {
      try {
        // Dynamic import to avoid circular dep with server action
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: customer, error } = await supabase
          .from('customers')
          .select('id, full_name, phone')
          .eq('business_id', businessId)
          .ilike('phone', `%${phone.trim()}%`)
          .limit(1)
          .maybeSingle()

        if (error) {
          setSearchError('Error al buscar el cliente.')
          setSearching(false)
          return
        }
        if (!customer) {
          setSearchError('No se encontró un cliente con ese teléfono.')
          setSearching(false)
          return
        }

        const balance = await getClientLoyaltyBalance(businessId, customer.id)
        setSearchResult({ client: customer, balance })
      } catch {
        setSearchError('Error inesperado al buscar el cliente.')
      } finally {
        setSearching(false)
      }
    })
  }

  return (
    <section
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ border: '1px solid var(--border-color)' }}
    >
      <h3 className="text-sm font-semibold text-xinuco-text">Consultar saldo de cliente</h3>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Teléfono del cliente…"
          className="input-base flex-1"
          aria-label="Teléfono del cliente"
        />
        <button
          type="submit"
          disabled={isPending || !phone.trim()}
          className="btn-primary flex items-center gap-2"
        >
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </form>

      {searchError && (
        <p className="text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={13} />
          {searchError}
        </p>
      )}

      {searchResult && !searching && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl animate-fade-in"
          style={{ background: 'rgba(197,160,89,0.06)', border: '1px solid rgba(197,160,89,0.15)' }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-xinuco-text">
              {searchResult.client.full_name}
            </p>
            <p className="text-xs text-xinuco-muted mt-0.5">
              {searchResult.client.phone}
            </p>
            <p className="text-xs text-xinuco-muted mt-1">
              Saldo:{' '}
              <span className="font-bold" style={{ color: 'var(--primary-color)' }}>
                {searchResult.balance.total_points.toLocaleString('es-CO')} puntos
              </span>
              {' '}({formatCOP(searchResult.balance.points_value_cop)})
              {searchResult.balance.expires_soon > 0 && (
                <span className="text-amber-400 ml-2">
                  · {searchResult.balance.expires_soon} pts por vencer pronto
                </span>
              )}
            </p>
          </div>
          {searchResult.balance.total_points > 0 && (
            <button
              type="button"
              onClick={() =>
                onClientSelected(searchResult.client, searchResult.balance)
              }
              className="btn-primary text-xs flex items-center gap-2 shrink-0"
            >
              <Gift size={13} />
              Redimir Puntos
            </button>
          )}
        </div>
      )}
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORIAL — Tabla de movimientos recientes
// ════════════════════════════════════════════════════════════════════════════

function LoyaltyHistoryTable({
  history,
  settings,
}: {
  history:  LoyaltyHistoryEntry[]
  settings: LoyaltySettings
}) {
  if (history.length === 0) {
    return (
      <div
        className="rounded-xl px-5 py-12 text-center"
        style={{ border: '1px solid var(--border-color)' }}
      >
        <Gift size={28} className="mx-auto mb-3 text-xinuco-muted" />
        <p className="text-sm text-xinuco-muted">
          Aún no hay movimientos de puntos. Los puntos se acumulan automáticamente al cobrar una cita.
        </p>
      </div>
    )
  }

  return (
    <section aria-label="Historial de puntos de lealtad">
      <h3 className="text-sm font-semibold text-xinuco-text mb-3">Actividad reciente</h3>
      <div
        className="overflow-x-auto rounded-xl"
        style={{ border: '1px solid var(--border-color)' }}
      >
        <table className="w-full text-sm" aria-label="Tabla de historial de lealtad">
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-color)',
                background:   'var(--surface-color, rgba(255,255,255,0.03))',
              }}
            >
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Puntos
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden sm:table-cell">
                Tipo
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold text-xinuco-muted uppercase tracking-wider hidden md:table-cell">
                Equivalente
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>

          <tbody>
            {history.map(entry => {
              const isEarn   = entry.points_added > 0
              const points   = isEarn ? entry.points_added : entry.points_redeemed
              const valueCOP = points * settings.loyalty_point_value_cop

              return (
                <tr
                  key={entry.id}
                  className="transition-all duration-200 hover:bg-white/[0.02]"
                  style={{ borderTop: '1px solid var(--border-color)' }}
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-xinuco-text text-sm leading-tight">
                      {entry.customer?.full_name ?? 'Cliente desconocido'}
                    </p>
                    <p className="text-xs text-xinuco-muted mt-0.5">
                      {entry.customer?.phone ?? '—'}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isEarn ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {isEarn ? '+' : '-'}{points.toLocaleString('es-CO')}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center hidden sm:table-cell">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        isEarn
                          ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                          : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                      }`}
                    >
                      {isEarn ? 'Acumulado' : 'Canjeado'}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center hidden md:table-cell">
                    <span className="text-xs text-xinuco-muted tabular-nums">
                      {formatCOP(valueCOP)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right text-xs text-xinuco-muted tabular-nums whitespace-nowrap">
                    {formatDate(entry.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>

          <tfoot>
            <tr style={{ borderTop: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.02))' }}>
              <td colSpan={5} className="px-5 py-3 text-xs text-xinuco-muted">
                {history.length} movimiento{history.length !== 1 ? 's' : ''} reciente
                {history.length !== 1 ? 's' : ''} · Mostrando últimos 100
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// REDEEM SHEET — Panel lateral de canje de puntos
// ════════════════════════════════════════════════════════════════════════════

function RedeemSheet({
  businessId,
  settings,
  preselectedClient,
  preselectedBalance,
  onClose,
}: {
  businessId:         string
  settings:           LoyaltySettings
  preselectedClient:  Pick<Customer, 'id' | 'full_name' | 'phone'> | null
  preselectedBalance: LoyaltyBalanceResult | null
  onClose:            () => void
}) {
  const backdropRef                         = useRef<HTMLDivElement>(null)
  const [phone, setPhone]                   = useState(preselectedClient?.phone ?? '')
  const [foundClient, setFoundClient]       = useState<Pick<Customer, 'id' | 'full_name' | 'phone'> | null>(preselectedClient)
  const [balance, setBalance]               = useState<LoyaltyBalanceResult | null>(preselectedBalance)
  const [pointsInput, setPointsInput]       = useState('')
  const [searchError, setSearchError]       = useState<string | null>(null)
  const [redeemError, setRedeemError]       = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess]   = useState<string | null>(null)
  const [isPendingSearch, startSearch]      = useTransition()
  const [isPendingRedeem, startRedeem]      = useTransition()

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

  const pointsToRedeem = parseInt(pointsInput, 10) || 0
  const discountCOP    = pointsToRedeem * settings.loyalty_point_value_cop
  const maxPoints      = balance?.total_points ?? 0

  function handleSearchClient(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setSearchError(null)
    setFoundClient(null)
    setBalance(null)
    setRedeemSuccess(null)

    startSearch(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: customer, error } = await supabase
          .from('customers')
          .select('id, full_name, phone')
          .eq('business_id', businessId)
          .ilike('phone', `%${phone.trim()}%`)
          .limit(1)
          .maybeSingle()

        if (error || !customer) {
          setSearchError('No se encontró un cliente con ese teléfono.')
          return
        }

        const bal = await getClientLoyaltyBalance(businessId, customer.id)
        setFoundClient(customer)
        setBalance(bal)
      } catch {
        setSearchError('Error al buscar el cliente.')
      }
    })
  }

  function handleRedeem() {
    if (!foundClient || pointsToRedeem <= 0) return
    setRedeemError(null)
    setRedeemSuccess(null)

    if (pointsToRedeem > maxPoints) {
      setRedeemError(`Saldo insuficiente. El cliente tiene ${maxPoints} puntos.`)
      return
    }

    startRedeem(async () => {
      const result = await redeemPoints(
        businessId,
        foundClient.id,
        pointsToRedeem,
        crypto.randomUUID()
      )

      if (!result.success) {
        const msgs: Record<string, string> = {
          insufficient_points:   `Saldo insuficiente. El cliente tiene ${maxPoints} puntos.`,
          points_must_be_positive: 'Debes indicar al menos 1 punto.',
        }
        setRedeemError(msgs[result.error ?? ''] ?? result.error ?? 'Error al canjear puntos.')
        return
      }

      setBalance(prev => prev
        ? { ...prev, total_points: result.remaining_balance, points_value_cop: result.remaining_balance * settings.loyalty_point_value_cop }
        : null
      )
      setPointsInput('')
      setRedeemSuccess(
        `Canje exitoso: ${pointsToRedeem.toLocaleString('es-CO')} pts → descuento de ${formatCOP(result.discount_amount_cop)}`
      )
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
            <h2 className="text-lg font-bold text-xinuco-text">Redimir Puntos</h2>
            <p className="text-xs text-xinuco-muted mt-0.5">
              Busca al cliente y aplica el descuento.
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

        <div className="p-6 flex flex-col gap-5">

          {/* Búsqueda de cliente */}
          {!foundClient && (
            <form onSubmit={handleSearchClient} className="flex flex-col gap-3">
              <label
                htmlFor="redeem-phone"
                className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
              >
                Teléfono del cliente
              </label>
              <div className="flex gap-2">
                <input
                  id="redeem-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ej: 3001234567"
                  className="input-base flex-1"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isPendingSearch || !phone.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  {isPendingSearch ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                </button>
              </div>
              {searchError && (
                <p className="text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle size={13} />
                  {searchError}
                </p>
              )}
            </form>
          )}

          {/* Datos del cliente y saldo */}
          {foundClient && balance && (
            <>
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: 'rgba(197,160,89,0.06)', border: '1px solid rgba(197,160,89,0.15)' }}
              >
                <div>
                  <p className="text-sm font-semibold text-xinuco-text">
                    {foundClient.full_name}
                  </p>
                  <p className="text-xs text-xinuco-muted">{foundClient.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFoundClient(null); setBalance(null); setRedeemSuccess(null) }}
                  className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text transition-colors"
                  aria-label="Cambiar cliente"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Saldo disponible */}
              <div className="flex flex-col gap-1 text-center">
                <span className="text-xs text-xinuco-muted uppercase tracking-wider">Saldo disponible</span>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: 'var(--primary-color)' }}
                >
                  {balance.total_points.toLocaleString('es-CO')}
                  <span className="text-base font-medium ml-1">pts</span>
                </span>
                <span className="text-xs text-xinuco-muted">
                  Equivale a {formatCOP(balance.points_value_cop)}
                </span>
                {balance.expires_soon > 0 && (
                  <span className="text-xs text-amber-400 mt-1">
                    {balance.expires_soon} pts vencen en los próximos 30 días
                  </span>
                )}
              </div>

              {balance.total_points === 0 ? (
                <p className="text-sm text-xinuco-muted text-center py-4">
                  Este cliente no tiene puntos disponibles para canjear.
                </p>
              ) : (
                <>
                  <div style={{ borderTop: '1px solid var(--border-color)' }} />

                  {/* Input de puntos a canjear */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="points-to-redeem"
                      className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
                    >
                      Puntos a canjear
                    </label>
                    <input
                      id="points-to-redeem"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={maxPoints}
                      value={pointsInput}
                      onChange={e => setPointsInput(e.target.value)}
                      placeholder={`Máx. ${maxPoints}`}
                      className="input-base"
                    />
                    {pointsToRedeem > 0 && (
                      <p className="text-xs" style={{ color: 'var(--primary-color)' }}>
                        Descuento: {formatCOP(discountCOP)}
                      </p>
                    )}
                  </div>

                  {redeemError && (
                    <p
                      role="alert"
                      className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 animate-fade-in"
                    >
                      {redeemError}
                    </p>
                  )}

                  {redeemSuccess && (
                    <p
                      role="status"
                      className="text-xs px-4 py-2.5 rounded-lg border animate-fade-in"
                      style={{
                        background:  'rgba(52,211,153,0.08)',
                        borderColor: 'rgba(52,211,153,0.2)',
                        color:       '#34d399',
                      }}
                    >
                      {redeemSuccess}
                    </p>
                  )}

                  {/* Botón de confirmar canje */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 rounded-lg text-sm font-medium text-xinuco-muted border transition-colors hover:text-xinuco-text hover:bg-white/[0.03]"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={handleRedeem}
                      disabled={isPendingRedeem || pointsToRedeem <= 0 || pointsToRedeem > maxPoints}
                      className="flex-1 btn-primary !py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isPendingRedeem ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Canjeando…
                        </>
                      ) : (
                        <>
                          <Gift size={15} />
                          Confirmar Canje
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Nota informativa */}
          <p
            className="text-[11px] text-xinuco-muted text-center px-2"
            style={{ lineHeight: '1.5' }}
          >
            1 punto = {formatCOP(settings.loyalty_point_value_cop)} · Puntos vencen a los{' '}
            {settings.loyalty_expiry_months} meses de ser ganados.
          </p>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Helpers de cálculo de estadísticas
// ════════════════════════════════════════════════════════════════════════════

function computeStats(history: LoyaltyHistoryEntry[]) {
  const clientSet = new Set<string>()
  let totalActive  = 0
  let totalRedeemed = 0

  for (const entry of history) {
    if (entry.points_added > 0) {
      clientSet.add(entry.client_id)
      totalActive += entry.points_added
    }
    totalRedeemed += entry.points_redeemed
  }

  return {
    uniqueClients: clientSet.size,
    totalActive:   Math.max(0, totalActive - totalRedeemed),
    totalRedeemed,
  }
}
