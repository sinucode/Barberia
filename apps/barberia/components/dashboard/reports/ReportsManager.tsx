'use client'

import Link from 'next/link'
import { BarChart2, TrendingUp, Calendar, DollarSign, type LucideIcon } from 'lucide-react'
import type { ReportsKPIs, TopService, TopStaff } from '@/app/[slug]/dashboard/reports/page'
import { AdminPageHeader } from '@/components/ui/AdminPageHeader'
import { formatCOP } from '@/lib/utils/format'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReportsManagerProps {
  kpis:           ReportsKPIs
  topServices:    TopService[]
  topStaff:       TopStaff[]
  slug:           string
  activePeriod:   'hoy' | 'semana' | 'mes'
  weekIngresos:   number
  weekCitas:      number
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  isCurrency,
}: {
  label:       string
  value:       number
  sub?:        string
  icon:        LucideIcon
  isCurrency?: boolean
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl px-5 py-4"
      style={{
        background:  '#111111',
        border:      '1px solid var(--border-color)',
        borderLeft:  '3px solid var(--primary-color)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-xinuco-muted">
          {label}
        </span>
        <Icon size={15} style={{ color: 'var(--primary-color)' }} strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-2xl font-bold tabular-nums text-xinuco-text leading-tight">
          {isCurrency ? formatCOP(value) : value.toLocaleString('es-CO')}
        </span>
        {sub && (
          <span className="text-[11px] text-xinuco-muted">{sub}</span>
        )}
      </div>
    </div>
  )
}

// ── Period Tabs ───────────────────────────────────────────────────────────────

function PeriodTabs({
  activePeriod,
  slug,
}: {
  activePeriod: 'hoy' | 'semana' | 'mes'
  slug:         string
}) {
  const tabs: { key: 'hoy' | 'semana' | 'mes'; label: string }[] = [
    { key: 'hoy',    label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes',    label: 'Este mes' },
  ]

  return (
    <div
      className="flex gap-1 p-1 rounded-xl w-fit"
      style={{ background: '#111111', border: '1px solid var(--border-color)' }}
      role="tablist"
      aria-label="Período de reporte"
    >
      {tabs.map(tab => (
        <Link
          key={tab.key}
          href={`/${slug}/dashboard/reports?period=${tab.key}`}
          role="tab"
          aria-selected={activePeriod === tab.key}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={
            activePeriod === tab.key
              ? { background: 'var(--primary-color)', color: '#080808' }
              : { color: 'var(--text-muted, #888)', background: 'transparent' }
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

function DataTable({
  title,
  headers,
  rows,
  emptyMessage,
}: {
  title:        string
  headers:      string[]
  rows:         (string | number)[][]
  emptyMessage: string
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-color)' }}
    >
      <div
        className="px-5 py-3 text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
        style={{
          background:   '#111111',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {title}
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-xinuco-muted">
          {emptyMessage}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-xs font-semibold text-xinuco-muted uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="transition-colors hover:bg-white/[0.02]"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-5 py-3.5 ${ci === 0 ? 'text-left text-xinuco-text font-medium' : 'text-right tabular-nums text-xinuco-muted'}`}
                  >
                    {ci === 0 ? (
                      <span className="truncate block max-w-[180px]">{cell}</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ReportsManager({
  kpis,
  topServices,
  topStaff,
  slug,
  activePeriod,
  weekIngresos,
  weekCitas,
}: ReportsManagerProps) {
  // Select the KPIs to show based on period
  const displayKPIs = {
    hoy: {
      citas:    kpis.citasHoy,
      ingresos: kpis.ingresosHoy,
    },
    semana: {
      citas:    weekCitas,
      ingresos: weekIngresos,
    },
    mes: {
      citas:    kpis.citasCompletadasMes,
      ingresos: kpis.ingresosMes,
    },
  }[activePeriod]

  const periodLabel = {
    hoy:    'hoy',
    semana: 'esta semana',
    mes:    'este mes',
  }[activePeriod]

  // Top services table rows
  const serviceRows = topServices.map((s, i) => [
    `${i + 1}. ${s.description}`,
    s.citas.toString(),
    formatCOP(s.revenue),
  ])

  // Top staff table rows
  const staffRows = topStaff.map((s, i) => [
    `${i + 1}. ${s.name}`,
    s.citas.toString(),
    formatCOP(s.revenue),
  ])

  return (
    <>
      <AdminPageHeader
        title="Reportes"
        subtitle="KPIs y métricas de rendimiento del negocio."
      />

      {/* Period tabs */}
      <PeriodTabs activePeriod={activePeriod} slug={slug} />

      {/* KPI Cards — 2x2 mobile / 4x1 desktop */}
      <section aria-label="KPIs" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          label="Citas"
          value={displayKPIs.citas}
          sub={`Total ${periodLabel}`}
          icon={Calendar}
        />
        <KPICard
          label="Ingresos"
          value={displayKPIs.ingresos}
          sub={`Ventas ${periodLabel}`}
          icon={DollarSign}
          isCurrency
        />
        <KPICard
          label="Citas completadas (mes)"
          value={kpis.citasCompletadasMes}
          sub="Mes actual"
          icon={TrendingUp}
        />
        <KPICard
          label="Ingresos (mes)"
          value={kpis.ingresosMes}
          sub="Mes actual"
          icon={BarChart2}
          isCurrency
        />
      </section>

      {/* Tables — side by side on desktop */}
      <section
        aria-label="Rankings del mes"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <DataTable
          title="Top 5 Servicios — Este mes"
          headers={['Servicio', 'Citas', 'Ingresos']}
          rows={serviceRows}
          emptyMessage="Sin servicios facturados este mes."
        />
        <DataTable
          title="Top 5 Staff — Este mes"
          headers={['Barbero', 'Citas', 'Ingresos']}
          rows={staffRows}
          emptyMessage="Sin citas completadas este mes."
        />
      </section>
    </>
  )
}
