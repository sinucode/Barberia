import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock,
  Scissors,
  Bell
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Xinuco',
}

interface DashboardPageProps {
  params: Promise<{ slug: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Verificar sesión activa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${slug}/login`)
  }

  // Fetch del perfil del usuario (incluye rol)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, business_id')
    .eq('id', user.id)
    .single()

  // Stats básicas (citas de hoy)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { count: todayCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profile?.business_id ?? '')
    .gte('created_at', todayStart.toISOString())

  const { count: pendingCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profile?.business_id ?? '')
    .eq('status', 'pending')

  const stats = [
    {
      id:    'stat-appointments-today',
      icon:  Calendar,
      label: 'Citas hoy',
      value: todayCount ?? 0,
      color: 'var(--primary-color)',
    },
    {
      id:    'stat-pending',
      icon:  Clock,
      label: 'Pendientes',
      value: pendingCount ?? 0,
      color: '#60A5FA',
    },
    {
      id:    'stat-barbers',
      icon:  Scissors,
      label: 'Barberos',
      value: '—',
      color: '#34D399',
    },
    {
      id:    'stat-revenue',
      icon:  TrendingUp,
      label: 'Ingresos hoy',
      value: '$0',
      color: '#A78BFA',
    },
  ]

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-xinuco-muted uppercase tracking-wider mb-0.5">
            {profile?.role === 'admin' ? 'Administrador' : 'Barbero'}
          </p>
          <h1 className="text-2xl font-bold text-xinuco-text">
            Hola, {profile?.full_name?.split(' ')[0] ?? 'Equipo'} 👋
          </h1>
        </div>
        <button
          id="btn-notifications"
          aria-label="Notificaciones"
          className="relative w-10 h-10 rounded-xl glass flex items-center justify-center text-xinuco-muted hover:text-xinuco-primary transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-xinuco-primary" />
        </button>
      </header>

      {/* Stats Grid */}
      <section aria-label="Métricas del día" className="grid grid-cols-2 gap-3 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.id} id={stat.id} className="card hover:scale-[1.02] transition-transform cursor-default">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${stat.color}20` }}
                >
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-xinuco-text">{stat.value}</p>
              <p className="text-xs text-xinuco-muted mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </section>

      {/* Próximas citas — placeholder */}
      <section aria-label="Próximas citas">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xinuco-text">Próximas citas</h2>
          <button id="btn-view-all-appointments" className="text-xs text-xinuco-primary hover:underline">
            Ver todas
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Empty state */}
          <div className="card flex flex-col items-center justify-center py-10 gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
            >
              <Calendar size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-xinuco-text">Sin citas próximas</p>
              <p className="text-xs text-xinuco-muted mt-1">Las nuevas citas aparecerán aquí</p>
            </div>
            <button id="btn-new-appointment" className="btn-primary mt-2 text-xs px-4 py-2">
              Nueva cita
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
