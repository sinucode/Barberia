import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import {
  CreditCard, AlertCircle, TrendingUp, Users, CheckCircle,
  Clock, XCircle, Zap,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Facturación SaaS — Xinuco Admin',
  description: 'Estado de suscripciones y facturación de los inquilinos de Xinuco',
}

// Mapa visual de estados de suscripción
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: 'Activo',      color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: CheckCircle },
  trialing:  { label: 'Trial',       color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',      icon: Clock },
  past_due:  { label: 'Vencido',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   icon: AlertCircle },
  canceled:  { label: 'Cancelado',   color: 'text-red-400 bg-red-500/10 border-red-500/20',         icon: XCircle },
  none:      { label: 'Sin plan',    color: 'text-xinuco-muted bg-xinuco-surface border-xinuco-border', icon: Zap },
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/adminbarberia/login')

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, is_active, subscription_status, stripe_customer_id, created_at')
    .order('created_at', { ascending: false })

  const biz = businesses ?? []

  // KPIs rápidos
  const totalActive    = biz.filter((b) => b.subscription_status === 'active').length
  const totalTrialing  = biz.filter((b) => b.subscription_status === 'trialing').length
  const totalPastDue   = biz.filter((b) => b.subscription_status === 'past_due').length
  const noStripe       = biz.filter((b) => !b.stripe_customer_id).length

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-xinuco-text">Facturación SaaS</h1>
        <p className="text-sm text-xinuco-muted mt-1">
          Estado de suscripciones y revenue de todos los inquilinos.
        </p>
      </div>

      {/* Banner de integración pendiente */}
      <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-400">Integración con Stripe pendiente</p>
          <p className="text-xs text-xinuco-muted mt-1">
            Para activar cobros reales, configura <code className="font-mono bg-xinuco-surface px-1 rounded">STRIPE_SECRET_KEY</code> en{' '}
            <code className="font-mono bg-xinuco-surface px-1 rounded">.env.local</code> y vincula cada negocio con un Customer de Stripe.
            Los datos mostrados son del estado actual en la base de datos.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Activos',        value: totalActive,   icon: CheckCircle,  color: '#10B981' },
          { label: 'En Trial',       value: totalTrialing, icon: Clock,        color: '#3B82F6' },
          { label: 'Vencidos',       value: totalPastDue,  icon: AlertCircle,  color: '#F59E0B' },
          { label: 'Sin Stripe',     value: noStripe,      icon: CreditCard,   color: '#6B6B6B' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-xinuco-surface border border-xinuco-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-xinuco-muted uppercase tracking-wider">{label}</p>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-3xl font-bold text-xinuco-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabla de suscripciones */}
      <div className="rounded-xl border border-xinuco-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-xinuco-border bg-xinuco-surface/50">
          <h2 className="text-sm font-semibold text-xinuco-text">Registro de Suscripciones</h2>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-xinuco-muted" />
            <span className="text-xs text-xinuco-muted">{biz.length} inquilinos</span>
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-xinuco-border">
              <th className="px-5 py-3 text-[10px] font-medium text-xinuco-muted uppercase tracking-wider">Negocio</th>
              <th className="px-5 py-3 text-[10px] font-medium text-xinuco-muted uppercase tracking-wider">Stripe ID</th>
              <th className="px-5 py-3 text-[10px] font-medium text-xinuco-muted uppercase tracking-wider">Suscripción</th>
              <th className="px-5 py-3 text-[10px] font-medium text-xinuco-muted uppercase tracking-wider">Alta</th>
            </tr>
          </thead>
          <tbody>
            {biz.map((b) => {
              const status   = b.subscription_status ?? 'none'
              const statusDef = STATUS_MAP[status] ?? STATUS_MAP.none
              const StatusIcon = statusDef.icon

              return (
                <tr key={b.id} className="border-b border-xinuco-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-xinuco-text">{b.name}</p>
                    <p className="text-[10px] text-xinuco-muted font-mono">/{b.slug}</p>
                  </td>
                  <td className="px-5 py-4">
                    {b.stripe_customer_id
                      ? <span className="font-mono text-xs text-xinuco-muted">{b.stripe_customer_id}</span>
                      : <span className="text-xs text-xinuco-muted italic">No vinculado</span>
                    }
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusDef.color}`}>
                      <StatusIcon size={11} />
                      {statusDef.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-xinuco-muted">
                    {new Date(b.created_at).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              )
            })}
            {biz.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-xinuco-muted text-sm">
                  No hay negocios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
