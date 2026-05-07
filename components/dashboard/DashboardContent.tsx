import { createClient }     from '@/lib/supabase/server'
import { redirect }          from 'next/navigation'
import { Play, Clock, CheckCircle2, XCircle, AlertCircle, CalendarX } from 'lucide-react'
import { parseTimeRange, formatTime, getDurationMinutes } from '@/lib/utils/time'
import type { Appointment, AppointmentStatus } from '@/types/database'

// ── Status config ─────────────────────────────────────────────────────────────

interface StatusConfig {
  label:  string
  textClass: string
  bgClass:   string
  Icon:   React.ElementType
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  pending: {
    label:     'Pendiente',
    textClass: 'text-xinuco-muted',
    bgClass:   'bg-xinuco-surface',
    Icon:      Clock,
  },
  confirmed: {
    label:     'Confirmada',
    textClass: 'text-xinuco-primary',
    bgClass:   'bg-xinuco-surface',
    Icon:      CheckCircle2,
  },
  in_progress: {
    label:     'En curso',
    textClass: 'text-xinuco-primary',
    bgClass:   'bg-xinuco-surface',
    Icon:      Play,
  },
  completed: {
    label:     'Completada',
    textClass: 'text-xinuco-muted',
    bgClass:   'bg-xinuco-surface',
    Icon:      CheckCircle2,
  },
  cancelled: {
    label:     'Cancelada',
    textClass: 'text-xinuco-muted',
    bgClass:   'bg-xinuco-surface',
    Icon:      XCircle,
  },
  no_show: {
    label:     'No asistió',
    textClass: 'text-xinuco-muted',
    bgClass:   'bg-xinuco-surface',
    Icon:      AlertCircle,
  },
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

/** Tarjeta grande "Próxima Cita" */
function NextAppointmentCard({ appt }: { appt: Appointment }) {
  const parsed   = parseTimeRange(appt.time_range)
  const timeStr  = parsed ? formatTime(parsed.start) : '—'
  const duration = getDurationMinutes(appt.time_range)

  return (
    <div
      className="card relative overflow-hidden"
      style={{ border: '1px solid color-mix(in srgb, var(--primary-color) 30%, transparent)' }}
    >
      {/* Glow de fondo decorativo */}
      <div
        aria-hidden
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"
        style={{ background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)' }}
      />

      {/* Badge "Próxima" */}
      <span
        className="badge mb-4 text-xinuco-primary"
        style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-xinuco-primary animate-pulse-soft" />
        Próxima cita
      </span>

      {/* Nombre del cliente */}
      <h2 className="text-xl font-bold text-xinuco-text leading-tight mb-1">
        {appt.customer_name}
      </h2>

      {/* Servicio */}
      {appt.service_name && (
        <p className="text-sm text-xinuco-muted mb-4">{appt.service_name}</p>
      )}

      {/* Hora + duración */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-xinuco-primary" />
          <span className="text-sm font-semibold text-xinuco-text">{timeStr}</span>
        </div>
        {duration !== null && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-xinuco-muted">{duration} min</span>
          </div>
        )}
        {appt.customer_phone && (
          <span className="text-xs text-xinuco-muted ml-auto truncate max-w-[120px]">
            {appt.customer_phone}
          </span>
        )}
      </div>

      {/* CTA */}
      <button
        id={`btn-start-service-${appt.id}`}
        className="btn-primary w-full"
      >
        <Play size={15} />
        Iniciar Servicio
      </button>
    </div>
  )
}

/** Badge de estado de una cita en la agenda */
function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg  = STATUS_CONFIG[status]
  const Icon = cfg.Icon

  return (
    <span
      className={`badge shrink-0 ${cfg.textClass}`}
      style={{ background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  )
}

/** Fila individual de la agenda del día */
function AgendaItem({ appt }: { appt: Appointment }) {
  const parsed  = parseTimeRange(appt.time_range)
  const timeStr = parsed ? formatTime(parsed.start) : '—'
  const cfg     = STATUS_CONFIG[appt.status]
  const Icon    = cfg.Icon

  const isActive = appt.status === 'confirmed' || appt.status === 'in_progress'

  return (
    <li className="flex items-stretch gap-3">
      {/* Columna hora */}
      <time
        dateTime={parsed?.start.toISOString()}
        className="text-xs font-semibold text-xinuco-muted w-12 shrink-0 pt-4 text-right leading-none"
      >
        {timeStr}
      </time>

      {/* Línea de timeline */}
      <div className="flex flex-col items-center shrink-0 pt-3">
        <div
          className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
          style={{
            borderColor: isActive ? 'var(--primary-color)' : 'var(--border-color)',
            background:  isActive ? 'var(--primary-color)' : 'transparent',
          }}
        />
        <div
          className="w-px flex-1 mt-1"
          style={{ background: 'var(--border-color)' }}
        />
      </div>

      {/* Card de la cita */}
      <div
        className="card flex-1 flex items-center gap-3 py-3 mb-2"
        style={isActive ? { borderColor: 'color-mix(in srgb, var(--primary-color) 35%, transparent)' } : {}}
      >
        {/* Icono de estado */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isActive
              ? 'color-mix(in srgb, var(--primary-color) 15%, transparent)'
              : 'color-mix(in srgb, var(--border-color) 60%, transparent)',
          }}
        >
          <Icon
            size={16}
            style={{ color: isActive ? 'var(--primary-color)' : 'var(--muted-color)' }}
          />
        </div>

        {/* Nombre + servicio */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-xinuco-text leading-tight truncate">
            {appt.customer_name}
          </p>
          {appt.service_name && (
            <p className="text-xs text-xinuco-muted mt-0.5 truncate">{appt.service_name}</p>
          )}
        </div>

        {/* Badge de estado */}
        <StatusBadge status={appt.status} />
      </div>
    </li>
  )
}

/** Empty state cuando no hay citas en el día */
function AgendaEmpty() {
  return (
    <div className="card flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)' }}
      >
        <CalendarX size={24} style={{ color: 'var(--primary-color)' }} />
      </div>
      <div>
        <p className="text-sm font-semibold text-xinuco-text">Sin citas para hoy</p>
        <p className="text-xs text-xinuco-muted mt-1">Las nuevas citas aparecerán aquí</p>
      </div>
      <button id="btn-new-appointment" className="btn-primary mt-1 !px-4 !py-2 !text-xs">
        + Nueva cita
      </button>
    </div>
  )
}

// ── Componente principal (async Server Component) ─────────────────────────────

interface DashboardContentProps {
  slug: string
}

/**
 * DashboardContent — Server Component async que obtiene datos reales.
 * Se usa dentro de un <Suspense> en dashboard/page.tsx para mostrar
 * los Skeletons mientras este componente resuelve sus promesas.
 */
export async function DashboardContent({ slug }: DashboardContentProps) {
  const supabase = await createClient()

  // 1. Sesión activa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // 2. Perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, business_id')
    .eq('id', user.id)
    .single()

  const businessId = profile?.business_id ?? ''

  // 3. Citas de HOY (join con barber_id = user si es barber, o todas si admin)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  let query = supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .not('status', 'in', '("cancelled","no_show")')
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())
    .order('time_range', { ascending: true })

  // Si es barbero, solo sus citas
  if (profile?.role === 'barber') {
    query = query.eq('barber_id', user.id)
  }

  const { data: todayAppointments } = await query

  const appointments: Appointment[] = (todayAppointments ?? []) as Appointment[]

  // 4. "Próxima cita": la primera que esté pending o confirmed
  const nextAppt = appointments.find(
    (a) => a.status === 'pending' || a.status === 'confirmed',
  )

  // 5. Agenda del día: todas las citas ordenadas
  const agenda = appointments

  // 6. Saludo por hora del día
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'Equipo'

  return (
    <>
      {/* Saludo */}
      <section aria-label="Saludo">
        <p className="text-xs text-xinuco-muted uppercase tracking-widest mb-1">
          {profile?.role === 'admin' ? 'Administrador' : 'Barbero'}
        </p>
        <h1 className="text-2xl font-bold text-xinuco-text">
          {greeting}, {firstName} 👋
        </h1>
      </section>

      {/* Widget 1 — Próxima cita */}
      <section aria-label="Próxima cita">
        {nextAppt ? (
          <NextAppointmentCard appt={nextAppt} />
        ) : (
          <div
            className="card text-center py-8"
            style={{ border: '1px solid color-mix(in srgb, var(--primary-color) 20%, transparent)' }}
          >
            <p className="text-sm font-semibold text-xinuco-text">Sin próximas citas</p>
            <p className="text-xs text-xinuco-muted mt-1">El día está despejado ✨</p>
          </div>
        )}
      </section>

      {/* Widget 2 — Agenda del día */}
      <section aria-label="Agenda del día">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xinuco-text">
            Agenda del día
            {agenda.length > 0 && (
              <span
                className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
                  color:      'var(--primary-color)',
                }}
              >
                {agenda.length}
              </span>
            )}
          </h2>
          <a
            href={`/${slug}/appointments`}
            id="link-view-all-appointments"
            className="text-xs text-xinuco-primary hover:underline transition-colors"
          >
            Ver todas →
          </a>
        </div>

        {agenda.length === 0 ? (
          <AgendaEmpty />
        ) : (
          <ul className="flex flex-col" aria-label="Lista de citas del día">
            {agenda.map((appt) => (
              <AgendaItem key={appt.id} appt={appt} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
