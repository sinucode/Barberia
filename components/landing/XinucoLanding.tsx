'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Scissors,
  ArrowRight,
  Building2,
  Zap,
  Shield,
  BarChart3,
  Calendar,
  Package,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Users,
  Globe,
  Lock,
} from 'lucide-react'

// ─── Brand colors ────────────────────────────────────────────────────────────
const CYAN     = '#00CFCF'
const BLUE     = '#1261FF'
const I_DOT    = CYAN        // Color oficial del puntico de la 'i' del wordmark
const NAVY     = '#0B132B'
const NAVY2    = '#0D1635'

// ─── Xinuco Wordmark — Michroma + puntico custom ────────────────────────
// Renderiza "x[ı]nuco" con dotless i, y un cuadradito de color CYAN
// posicionado encima como el puntico oficial del logo.
// `size` controla el font-size en px del wordmark.
function XinucoWordmark({
  size = 56,
  className = '',
  taglineSize,
  showTagline = false,
}: {
  size?: number
  className?: string
  taglineSize?: number
  showTagline?: boolean
}) {
  return (
    <div className={`inline-flex flex-col items-stretch gap-2 ${className}`}>
      {/* Wordmark — define el ancho del bloque */}
      <div
        className="text-white leading-none flex items-baseline justify-center"
        style={{
          fontFamily: 'var(--font-michroma), Michroma, sans-serif',
          fontWeight: 600, // SemiBold
          fontSize: `${size}px`,
          letterSpacing: '0.12em',
          textTransform: 'lowercase',
        }}
      >
        <span>x</span>
        {/* "ı" (dotless i) con puntico custom CYAN encima */}
        <span style={{ position: 'relative', display: 'inline-block' }}>
          ı
          <span
            aria-hidden
            style={{
              position: 'absolute',
              bottom: '0.78em',
              left: '32%',
              transform: 'translateX(-50%)',
              width: '0.22em',
              height: '0.22em',
              background: I_DOT,
              borderRadius: '0.04em',
            }}
          />
        </span>
        <span>nuco</span>
      </div>
      {/* Tagline — width:100% del wordmark + justify para alinearlo de X a O */}
      {showTagline && (
        <p
          className="uppercase text-white/55 w-full"
          style={{
            fontFamily: 'var(--font-sora), Sora, sans-serif',
            fontSize: `${taglineSize ?? Math.max(9, size * 0.15)}px`,
            letterSpacing: '0.18em',
            textAlign: 'justify',
            textAlignLast: 'justify',
            MozTextAlignLast: 'justify',
          }}
        >
          Tecnología · Inteligencia · Impacto
        </p>
      )}
    </div>
  )
}

// ─── Xinuco Mark — imagen oficial del isotipo ─────────────────────────────────
// CSS mask radial: el centro (logo mark) es opaco, los bordes del PNG
// se disuelven suavemente → el fondo oscuro del PNG desaparece sin blending.
function XinucoMark({ size = 56 }: { size?: number }) {
  // El isotipo ocupa ~75% del área del PNG; la máscara cubre ese radio
  const fadeStart = Math.round(size * 0.44)  // inicio de fade (~44% del size)
  const fadeEnd   = Math.round(size * 0.54)  // borde totalmente transparente

  return (
    <Image
      src="https://rymlwtijbtokpqharrig.supabase.co/storage/v1/object/public/assets/landing/xinuco-isotipo.png"
      alt="Xinuco"
      width={size}
      height={size}
      className="object-contain"
      style={{
        maskImage: `radial-gradient(circle ${fadeStart}px at center, black 60%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(circle ${fadeEnd}px at center, black 60%, transparent 100%)`,
      }}
      priority
    />
  )
}

// ─── Gradient text helper ─────────────────────────────────────────────────────
function GradientText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{ background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
    >
      {children}
    </span>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false)

  const links = [
    { label: 'Inicio',     href: '#hero'       },
    { label: 'Verticales', href: '#verticales'  },
    { label: 'Precios',    href: '#precios'     },
    { label: 'Aliados',    href: '#aliados'     },
    { label: 'Nosotros',   href: '#nosotros'    },
  ]

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: `rgba(11,19,43,0.82)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 1px 32px rgba(0,0,0,0.35)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">

        {/* ── Logo ── */}
        <a href="#hero" className="flex items-center gap-2.5 leading-none group">
          <XinucoMark size={36} />
          <XinucoWordmark size={17} />
        </a>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="relative px-4 py-2 text-[13px] font-medium text-white/50 hover:text-white/90 rounded-lg transition-all duration-200 hover:bg-white/[0.04]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* ── CTAs ── */}
        <div className="hidden md:flex items-center gap-2">
          {/* Portal Aliados — ghost pill */}
          <a
            href="#aliados"
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-xl transition-all duration-200"
            style={{
              color: CYAN,
              border: `1px solid ${CYAN}30`,
              background: `${CYAN}08`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = `${CYAN}14`
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = `${CYAN}55`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = `${CYAN}08`
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = `${CYAN}30`
            }}
          >
            <Lock size={11} />
            Portal Aliados
          </a>

          {/* Admin — gradient pill */}
          <a
            href="/adminbarberia/login"
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`,
              boxShadow: `0 0 18px ${CYAN}30, 0 2px 8px rgba(0,0,0,0.3)`,
            }}
          >
            Admin
          </a>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
          onClick={() => setOpen(o => !o)}
          aria-label="Menú"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {open && (
        <div
          className="md:hidden px-6 pb-5 pt-2 flex flex-col gap-1"
          style={{
            background: 'rgba(10,15,35,0.97)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a
              href="#aliados"
              className="text-center py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ color: CYAN, border: `1px solid ${CYAN}35`, background: `${CYAN}08` }}
              onClick={() => setOpen(false)}
            >
              Portal Aliados
            </a>
            <a
              href="/adminbarberia/login"
              className="text-center py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${CYAN}, ${BLUE})` }}
              onClick={() => setOpen(false)}
            >
              Admin
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── Phone mockup — tipos y helpers ──────────────────────────────────────────
type CitaItem  = { time: string; name: string; service: string; price: string; dot: string }
type NotifItem = { emoji: string; title: string; desc: string; time: string; accent: string }

function PhoneCitaRow({ cita, compact = false }: { cita: CitaItem; compact?: boolean }) {
  return (
    <div style={{
      margin: `0 14px ${compact ? 5 : 7}px`,
      background: 'rgba(255,255,255,0.025)',
      borderRadius: 10, padding: compact ? '6px 9px' : '7px 10px',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <p style={{ minWidth: 30, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{cita.time}</p>
      <div style={{ width: 2, height: 24, borderRadius: 99, background: cita.dot, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, marginBottom: 1 }}>{cita.name}</p>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.33)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cita.service}</p>
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, color: cita.dot.startsWith('rgba') ? 'rgba(255,255,255,0.3)' : cita.dot }}>{cita.price}</p>
    </div>
  )
}

function PhoneTabIcon({ icon, active }: { icon: string; active: boolean }) {
  const c = active ? CYAN : 'rgba(255,255,255,0.28)'
  const p: React.SVGProps<SVGSVGElement> = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' }
  const l = { stroke: c, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (icon === 'home') return (
    <svg {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" {...l}/>
      <polyline points="9 22 9 12 15 12 15 22" {...l}/>
    </svg>
  )
  if (icon === 'cal') return (
    <svg {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" {...l}/>
      <line x1="16" y1="2" x2="16" y2="6" {...l}/>
      <line x1="8" y1="2" x2="8" y2="6" {...l}/>
      <line x1="3" y1="10" x2="21" y2="10" {...l}/>
    </svg>
  )
  if (icon === 'cash') return (
    <svg {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" {...l}/>
      <line x1="2" y1="10" x2="22" y2="10" {...l}/>
    </svg>
  )
  return (
    <svg {...p}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" {...l}/>
      <path d="M13.73 21a2 2 0 01-3.46 0" {...l}/>
    </svg>
  )
}

// ─── Phone Dashboard UI — interactivo ─────────────────────────────────────────
// 4 tabs funcionales: Inicio · Agenda · Caja · Alertas
// Cada pestaña renderiza una pantalla distinta de la app de Xinuco Barbería.
function PhoneDashboardUI() {
  const [tab, setTab] = useState<'inicio' | 'agenda' | 'caja' | 'notif'>('inicio')

  const CITAS: CitaItem[] = [
    { time: '9:00',  name: 'Sebastián R.', service: 'Corte + Barba',  price: '$40k', dot: '#22C55E' },
    { time: '10:30', name: 'Miguel A.',     service: 'Fade bajo',       price: '$25k', dot: '#22C55E' },
    { time: '12:00', name: 'Juan C.',       service: 'Barba completa',  price: '$20k', dot: '#F59E0B' },
    { time: '14:00', name: 'Pedro L.',      service: 'Corte clásico',   price: '$30k', dot: 'rgba(255,255,255,0.18)' },
    { time: '16:30', name: 'Andrés M.',     service: 'Corte + diseño',  price: '$35k', dot: '#7EB3FF' },
  ]

  const NOTIFS: NotifItem[] = [
    { emoji: '📅', title: 'Nueva cita',     desc: 'Sebastián · 9:00 am',  time: 'hace 2 min',  accent: CYAN      },
    { emoji: '💳', title: 'Pago recibido',  desc: '$45.000 COP',           time: 'hace 15 min', accent: '#22C55E' },
    { emoji: '⭐', title: 'Reseña nueva',   desc: 'Diego · 5.0 ★★★★★',   time: 'hace 1 h',    accent: '#F59E0B' },
    { emoji: '📅', title: 'Cita cancelada', desc: 'Marco · 11:00 am',      time: 'hace 2 h',    accent: '#EF4444' },
    { emoji: '💳', title: 'Pago recibido',  desc: '$25.000 COP',           time: 'ayer',         accent: '#22C55E' },
  ]

  const TABS = [
    { key: 'inicio' as const, label: 'Inicio',  icon: 'home' },
    { key: 'agenda' as const, label: 'Agenda',  icon: 'cal'  },
    { key: 'caja'   as const, label: 'Caja',    icon: 'cash' },
    { key: 'notif'  as const, label: 'Alertas', icon: 'bell' },
  ]

  const DAYS: [string, string, boolean][] = [
    ['L','26',false],['M','27',false],['X','28',true],['J','29',false],['V','30',false],
  ]

  // ── Pantalla Inicio ──────────────────────────────────────────────────────
  const screenInicio = (
    <>
      <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Buenos días</p>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Carlos Mendoza</p>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>CM</div>
      </div>
      <div style={{ padding: '0 16px 10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: CYAN, background: `${CYAN}14`, padding: '4px 10px', borderRadius: 99, border: `1px solid ${CYAN}28` }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: CYAN, display: 'inline-block' }} />
          Mié 28 May · 5 citas hoy
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px' }}>
        <div style={{ flex: 1, borderRadius: 11, padding: '8px 11px', background: `linear-gradient(135deg, ${CYAN}18, ${BLUE}14)`, border: `1px solid ${CYAN}28` }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Hoy</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: CYAN, lineHeight: 1 }}>$150k</p>
          <p style={{ fontSize: 8, color: `${CYAN}99`, marginTop: 2 }}>3 de 5 cobrados</p>
        </div>
        <div style={{ flex: 1, borderRadius: 11, padding: '8px 11px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Semana</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#7EB3FF', lineHeight: 1 }}>$420k</p>
          <p style={{ fontSize: 8, color: 'rgba(126,179,255,0.55)', marginTop: 2 }}>↑ 12% vs ant.</p>
        </div>
      </div>
      <div style={{ padding: '0 14px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Agenda de hoy</p>
        <button onClick={() => setTab('agenda')} style={{ fontSize: 9, color: CYAN, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Ver todo →</button>
      </div>
      {CITAS.slice(0, 3).map((c, i) => <PhoneCitaRow key={i} cita={c} />)}
      <button onClick={() => setTab('agenda')} style={{ display: 'block', margin: '3px auto 0', fontSize: 9, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer' }}>
        +2 citas más →
      </button>
    </>
  )

  // ── Pantalla Agenda ──────────────────────────────────────────────────────
  const screenAgenda = (
    <>
      <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 14, fontWeight: 800 }}>Agenda</p>
        <span style={{ fontSize: 9, color: CYAN, background: `${CYAN}14`, padding: '3px 8px', borderRadius: 99 }}>Hoy</span>
      </div>
      <div style={{ display: 'flex', gap: 5, padding: '0 14px 12px' }}>
        {DAYS.map(([d, n, active]) => (
          <div key={n} style={{ flex: 1, textAlign: 'center', padding: '5px 2px', borderRadius: 9, background: active ? `linear-gradient(135deg, ${CYAN}, ${BLUE})` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.06)'}` }}>
            <p style={{ fontSize: 8, color: active ? 'white' : 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{d}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: active ? 'white' : 'rgba(255,255,255,0.6)' }}>{n}</p>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 4 }}>
        {CITAS.map((c, i) => <PhoneCitaRow key={i} cita={c} compact />)}
      </div>
    </>
  )

  // ── Pantalla Caja ────────────────────────────────────────────────────────
  const screenCaja = (
    <>
      <div style={{ padding: '6px 14px 8px' }}>
        <p style={{ fontSize: 14, fontWeight: 800 }}>Caja</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Miércoles 28 de mayo</p>
      </div>
      <div style={{ margin: '0 14px 12px', borderRadius: 14, padding: '14px', background: `linear-gradient(135deg, ${CYAN}22, ${BLUE}18)`, border: `1px solid ${CYAN}35`, textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Total del día</p>
        <p style={{ fontSize: 28, fontWeight: 900, color: CYAN, lineHeight: 1, letterSpacing: '-0.02em' }}>$150k</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>5 servicios · 3 cobrados</p>
      </div>
      <div style={{ padding: '0 14px', marginBottom: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 9 }}>Desglose</p>
        {([
          { label: 'Cortes',  amount: '$90k', pct: 60, color: CYAN      },
          { label: 'Barbas',  amount: '$40k', pct: 27, color: '#7EB3FF' },
          { label: 'Diseños', amount: '$20k', pct: 13, color: BLUE      },
        ] as const).map(item => (
          <div key={item.label} style={{ marginBottom: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{item.label}</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: item.color }}>{item.amount}</p>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${item.pct}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 14px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7 }}>Pagos recientes</p>
        {[
          { name: 'Sebastián R.', amt: '+$40k' },
          { name: 'Miguel A.',    amt: '+$25k' },
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{t.name}</p>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#22C55E' }}>{t.amt}</p>
          </div>
        ))}
      </div>
    </>
  )

  // ── Pantalla Alertas ─────────────────────────────────────────────────────
  const screenNotif = (
    <>
      <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 14, fontWeight: 800 }}>Notificaciones</p>
        <span style={{ fontSize: 8, background: '#EF444428', color: '#EF4444', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>3 nuevas</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {NOTIFS.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: i < 3 ? `${n.accent}07` : 'transparent' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: `${n.accent}18`, border: `1px solid ${n.accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{n.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{n.title}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', marginLeft: 4, flexShrink: 0 }}>{n.time}</p>
              </div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{n.desc}</p>
            </div>
            {i < 3 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.accent, flexShrink: 0, marginTop: 3 }} />}
          </div>
        ))}
      </div>
    </>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#07101E', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sora), Sora, system-ui, sans-serif', overflow: 'hidden', color: 'white' }}>
      {/* Espacio bajo Dynamic Island */}
      <div style={{ height: 54, flexShrink: 0 }} />

      {/* Área de contenido — cada pantalla ocupa flex:1 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {tab === 'inicio' && screenInicio}
        {tab === 'agenda' && screenAgenda}
        {tab === 'caja'   && screenCaja}
        {tab === 'notif'  && screenNotif}
      </div>

      {/* Bottom navigation */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0 18px', background: 'rgba(7,16,30,0.98)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 10px', position: 'relative' }}
          >
            {/* Badge de notificaciones sin leer */}
            {t.key === 'notif' && (
              <span style={{ position: 'absolute', top: 0, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '1.5px solid #07101E' }} />
            )}
            <PhoneTabIcon icon={t.icon} active={tab === t.key} />
            <p style={{ fontSize: 8, color: tab === t.key ? CYAN : 'rgba(255,255,255,0.25)', fontWeight: tab === t.key ? 700 : 400 }}>{t.label}</p>
            {/* Indicador activo */}
            {tab === t.key && (
              <div style={{ position: 'absolute', bottom: -1, width: 16, height: 2, borderRadius: 99, background: CYAN }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Sprint 2 helpers — scroll reveal + contadores + grano ───────────────────

/** Detecta cuando el elemento entra al viewport. Dispara una sola vez. */
function useInView(threshold = 0.14) {
  const ref  = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/** Wrapper que hace fade-up al entrar al viewport. */
function FadeUp({
  children, delay = 0, className = '',
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    inView ? 1 : 0,
        transform:  inView ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

/** Cuenta de 0 al valor `to` con ease-out cuando entra al viewport. */
function AnimatedCounter({ to, suffix = '', duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const { ref, inView } = useInView(0.5)
  const [count, setCount] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (!inView || started.current) return
    started.current = true
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)   // ease-out cubic
      setCount(Math.round(eased * to))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, to, duration])
  return <span ref={ref}>{count}{suffix}</span>
}

/** Overlay de ruido/grano sobre toda la página. SVG inline, sin carga extra. */
function GrainOverlay() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='1'/></svg>`
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[999]"
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundRepeat: 'repeat',
        opacity: 0.032,
        mixBlendMode: 'overlay',
      }}
    />
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
type LandingStats = { citasTotal: number; barberias: number; clientes: number }

function Hero({ stats }: { stats: LandingStats }) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center px-6 pt-24 pb-16 overflow-hidden"
      style={{ background: NAVY }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-[700px] h-[600px] rounded-full opacity-15 blur-3xl"
          style={{ background: `radial-gradient(ellipse, ${CYAN}, transparent 65%)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full opacity-12 blur-3xl"
          style={{ background: `radial-gradient(ellipse, ${BLUE}, transparent 65%)` }}
        />
        {/* Dot grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>
      </div>

      {/* Two-column layout */}
      <div className="relative z-10 max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-16 items-center">

        {/* ══ Columna izquierda ══ */}
        <div className="flex flex-col items-center gap-8 text-center">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border"
            style={{ borderColor: `${CYAN}50`, background: `${CYAN}10`, color: CYAN }}
          >
            <Sparkles size={11} />
            Software de gestión para negocios LATAM
          </div>

          {/* Logo — componentes nítidos (vector/font) en lugar de PNG raster */}
          <div className="relative flex flex-col items-center gap-5 py-4">
            {/* Halo de brillo radial detrás */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: '110%', height: '130%',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(ellipse at center, ${CYAN}28 0%, ${BLUE}18 42%, transparent 70%)`,
                filter: 'blur(48px)',
              }}
            />

            {/* Isotipo — PNG separado, mucho más pequeño → no pixela */}
            <div className="relative z-10">
              <XinucoMark size={172} />
            </div>

            {/* Wordmark — 100% CSS / Michroma font → infinitamente nítido */}
            <XinucoWordmark
              size={58}
              showTagline
              taglineSize={10}
              className="relative z-10"
            />
          </div>

          {/* Descripción */}
          <p className="text-base md:text-lg text-white/55 leading-relaxed max-w-sm">
            Negocios inteligentes corren con <GradientText>IA.</GradientText>{' '}
            Desde la primera cita hasta el cierre de caja — todo en un sistema que{' '}
            <GradientText>piensa contigo y crece contigo.</GradientText>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <a
              href="#aliados"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`,
                boxShadow: `0 0 32px ${CYAN}45, 0 4px 16px rgba(0,0,0,0.4)`,
              }}
            >
              Portal de Aliados <ArrowRight size={15} />
            </a>
            <a
              href="#verticales"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white/65 hover:text-white w-full sm:w-auto border border-white/10 hover:border-white/25 transition-all"
            >
              Ver verticales <ChevronRight size={15} />
            </a>
          </div>

          {/* Stats — contadores animados */}
          <div className="flex items-center gap-0 pt-4 border-t border-white/8 w-full justify-center">
            {[
              { to: stats.citasTotal, suffix: '+', label: 'Citas registradas' },
              { to: stats.barberias,  suffix: '',  label: 'Barberías activas' },
              { to: stats.clientes,   suffix: '+', label: 'Clientes únicos'   },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <div className="w-px h-8 bg-white/10 mx-6" />}
                <div className="text-center">
                  <p className="text-xl font-bold leading-none" style={{ color: CYAN }}>
                    <AnimatedCounter to={s.to} suffix={s.suffix} />
                  </p>
                  <p className="text-[10px] text-white/35 mt-1 uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Columna derecha: celular ══ */}
        <div className="flex justify-center items-center">
          {/* Todo el grupo (teléfono + tarjetas) flota como una unidad */}
          <div
            className="relative"
            style={{ animation: 'phoneFloat 3.5s ease-in-out infinite' }}
          >
            {/* Halo pulsante detrás del teléfono */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 360, height: 500,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(ellipse at center, ${BLUE}55 0%, ${CYAN}30 40%, transparent 70%)`,
                filter: 'blur(48px)',
                animation: 'glowPulse 2.5s ease-in-out infinite',
              }}
            />

            {/* Reflejo sutil en el suelo */}
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                width: 200, height: 40,
                background: `radial-gradient(ellipse, ${CYAN}40, transparent 70%)`,
                filter: 'blur(16px)',
              }}
            />

            {/* Marco del teléfono */}
            <div
              className="relative rounded-[2.8rem] overflow-hidden"
              style={{
                width: 285,
                height: 616,
                background: '#07101E',
                border: '1.5px solid rgba(255,255,255,0.18)',
                boxShadow: [
                  '0 48px 96px rgba(0,0,0,0.7)',
                  '0 0 0 1px rgba(255,255,255,0.06)',
                  'inset 0 1px 0 rgba(255,255,255,0.12)',
                  `0 0 60px ${BLUE}30`,
                ].join(', '),
              }}
            >
              {/* Dynamic Island */}
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full"
                style={{ width: 96, height: 28, background: '#000' }}
              />
              {/* Pantalla — UI real del dashboard */}
              <PhoneDashboardUI />
              {/* Brillo de pantalla (reflejo superior) */}
              <div
                className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-20"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
                  borderRadius: '2.8rem 2.8rem 0 0',
                }}
              />
            </div>

            {/* Botones laterales */}
            <div className="absolute top-24 -right-[3px] rounded-full" style={{ width: 3, height: 56, background: 'rgba(255,255,255,0.2)' }} />
            <div className="absolute top-32 -left-[3px] rounded-full" style={{ width: 3, height: 36, background: 'rgba(255,255,255,0.15)' }} />
            <div className="absolute top-44 -left-[3px] rounded-full" style={{ width: 3, height: 36, background: 'rgba(255,255,255,0.15)' }} />

          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20 animate-bounce">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ChevronRight size={14} className="rotate-90" />
      </div>
    </section>
  )
}

// ─── Verticales ───────────────────────────────────────────────────────────────
const VERTICALES = [
  {
    icon: <Scissors size={28} />,
    name: 'Barbería',
    slug: 'barberia',
    description: 'Agenda, caja, inventario, comisiones y lealtad para barberías modernas.',
    status: 'active' as const,
    features: ['Agenda online', 'Caja registradora', 'Control de inventario', 'Comisiones', 'Programa de lealtad'],
    color: '#C5A059',
  },
  {
    icon: <Building2 size={28} />,
    name: 'Lavandería',
    slug: 'lavanderia',
    description: 'Control de órdenes, seguimiento y facturación para lavanderías.',
    status: 'soon' as const,
    features: ['Órdenes digitales', 'Seguimiento en tiempo real', 'Facturación automática'],
    color: CYAN,
  },
  {
    icon: <Zap size={28} />,
    name: 'Fumigación',
    slug: 'fumigacion',
    description: 'Gestión de visitas, rutas y reportes para empresas de control de plagas.',
    status: 'soon' as const,
    features: ['Programación de visitas', 'Rutas optimizadas', 'Reportes PDF'],
    color: BLUE,
  },
]

function Verticales() {
  return (
    <section
      id="verticales"
      className="py-24 px-6"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY2} 100%)` }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <FadeUp className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: CYAN }}>
            Nuestras Verticales
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Un sistema, <GradientText>múltiples industrias</GradientText>
          </h2>
          <p className="mt-4 text-white/50 text-lg max-w-2xl mx-auto">
            El mismo núcleo tecnológico adaptado a cada tipo de negocio. Escala con tu empresa.
          </p>
        </FadeUp>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {VERTICALES.map((v, i) => (
            <FadeUp key={v.slug} delay={i * 120} className="flex flex-col">
            <div
              className="relative rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 flex-1"
              style={{
                background: v.status === 'active'
                  ? `linear-gradient(145deg, ${NAVY2}, #111827)`
                  : `${NAVY2}`,
                borderColor: v.status === 'active' ? `${v.color}40` : 'rgba(255,255,255,0.06)',
                boxShadow: v.status === 'active' ? `0 0 40px ${v.color}18` : 'none',
              }}
            >
              {/* Badge */}
              {v.status === 'active' ? (
                <span
                  className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${v.color}22`, color: v.color }}
                >
                  Activo
                </span>
              ) : (
                <span className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full font-semibold bg-white/5 text-white/30">
                  Pronto
                </span>
              )}

              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{
                  background: `${v.color}18`,
                  color: v.color,
                  border: `1px solid ${v.color}30`,
                }}
              >
                {v.icon}
              </div>

              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                {v.name}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed mb-5">{v.description}</p>

              {/* Features */}
              <ul className="flex flex-col gap-2">
                {v.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: v.color }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {v.status === 'active' && (
                <a
                  href="#aliados"
                  className="mt-6 flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: v.color }}
                >
                  Acceder como aliado <ArrowRight size={14} />
                </a>
              )}
            </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: <Calendar size={22} />,  title: 'Agenda Inteligente',   desc: 'Reservas online 24/7 con detección de conflictos en tiempo real.' },
  { icon: <BarChart3 size={22} />, title: 'Reportes Financieros',  desc: 'P&G, flujo de caja y depreciación de activos en un clic.' },
  { icon: <Package size={22} />,   title: 'Inventario',            desc: 'Control de stock, movimientos y alertas de mínimos.' },
  { icon: <Users size={22} />,     title: 'Multi-Sucursal',        desc: 'Cada negocio aislado. Un panel para gobernarlos todos.' },
  { icon: <Shield size={22} />,    title: 'Seguridad RLS',         desc: 'Row-Level Security en cada tabla. Sin fugas de datos entre tenants.' },
  { icon: <Globe size={22} />,     title: 'SaaS LATAM',            desc: 'Pagos en COP, MercadoPago integrado y soporte en español.' },
]

function Features() {
  return (
    <section className="py-24 px-6" style={{ background: NAVY2 }}>
      <div className="max-w-6xl mx-auto">
        <FadeUp className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: BLUE }}>
            Tecnología
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Todo lo que necesita <GradientText>tu negocio</GradientText>
          </h2>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FadeUp key={f.title} delay={i * 80}>
              <div className="p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all bg-white/[0.02] hover:bg-white/[0.04] h-full">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${CYAN}22, ${BLUE}22)`, color: CYAN }}
                >
                  {f.icon}
                </div>
                <h4 className="text-white font-semibold mb-1.5">{f.title}</h4>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Precios ──────────────────────────────────────────────────────────────────
type PlanItem = {
  key: string; name: string; desc: string
  priceMonthly: number; priceAnnual: number
  color: string; highlight: boolean; badge: string | null
  cta: string; ctaHref: string
  features: { text: string; ok: boolean }[]
}

const PLANES: PlanItem[] = [
  {
    key: 'basico', name: 'Básico', desc: 'Para comenzar',
    priceMonthly: 79000, priceAnnual: 63000,
    color: 'rgba(255,255,255,0.55)', highlight: false, badge: null,
    cta: 'Empezar gratis', ctaHref: '#aliados',
    features: [
      { text: '1 barbero / silla',       ok: true  },
      { text: 'Agenda online 24/7',      ok: true  },
      { text: 'Caja registradora',       ok: true  },
      { text: 'App móvil',              ok: true  },
      { text: 'Control de inventario',  ok: false },
      { text: 'Comisiones de personal', ok: false },
      { text: 'Reportes financieros',   ok: false },
      { text: 'Multi-sucursal',         ok: false },
    ],
  },
  {
    key: 'pro', name: 'Pro', desc: 'El favorito de las barberías',
    priceMonthly: 149000, priceAnnual: 119000,
    color: CYAN, highlight: true, badge: 'Más popular',
    cta: 'Quiero este plan', ctaHref: '#aliados',
    features: [
      { text: 'Hasta 5 barberos / sillas', ok: true  },
      { text: 'Agenda online 24/7',        ok: true  },
      { text: 'Caja registradora',         ok: true  },
      { text: 'App móvil',                ok: true  },
      { text: 'Control de inventario',    ok: true  },
      { text: 'Comisiones de personal',   ok: true  },
      { text: 'Reportes financieros',     ok: true  },
      { text: 'Multi-sucursal',           ok: false },
    ],
  },
  {
    key: 'cadena', name: 'Cadena', desc: 'Para múltiples locales',
    priceMonthly: 279000, priceAnnual: 224000,
    color: BLUE, highlight: false, badge: null,
    cta: 'Hablar con ventas', ctaHref: 'mailto:hola@xinuco.com',
    features: [
      { text: 'Barberos ilimitados',      ok: true },
      { text: 'Agenda online 24/7',       ok: true },
      { text: 'Caja registradora',        ok: true },
      { text: 'App móvil',               ok: true },
      { text: 'Control de inventario',   ok: true },
      { text: 'Comisiones de personal',  ok: true },
      { text: 'Reportes financieros',    ok: true },
      { text: 'Multi-sucursal',          ok: true },
    ],
  },
]

function Pricing() {
  const [annual, setAnnual] = useState(false)

  // Solo display — no cálculo financiero, sin floats en BD
  function fmt(amt: number) { return '$' + Math.round(amt / 1000) + 'k' }
  function savedPerYear(p: PlanItem) { return Math.round((p.priceMonthly - p.priceAnnual) * 12 / 1000) }

  return (
    <section
      id="precios"
      className="py-24 px-6"
      style={{ background: `linear-gradient(180deg, ${NAVY2} 0%, ${NAVY} 100%)` }}
    >
      <div className="max-w-6xl mx-auto">

        {/* Header + toggle */}
        <FadeUp className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: CYAN }}>
            Planes
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Precios <GradientText>transparentes</GradientText>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
            Sin sorpresas ni contratos. Cancela cuando quieras.
          </p>

          {/* Toggle mensual / anual */}
          <div
            className="inline-flex items-center gap-1 p-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {([
              { label: 'Mensual', val: false, badge: null as string | null },
              { label: 'Anual',   val: true,  badge: '−20%'               },
            ] as const).map(opt => (
              <button
                key={opt.label}
                onClick={() => setAnnual(opt.val)}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
                style={annual === opt.val
                  ? { background: `linear-gradient(135deg, ${CYAN}35, ${BLUE}35)`, color: 'white', border: `1px solid ${CYAN}45` }
                  : { color: 'rgba(255,255,255,0.38)', border: '1px solid transparent' }
                }
              >
                {opt.label}
                {opt.badge && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: '#22C55E20', color: '#22C55E' }}
                  >
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </FadeUp>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-center">
          {PLANES.map((plan, i) => (
            <FadeUp key={plan.key} delay={i * 110} className={plan.highlight ? 'md:-mt-6 md:mb-6' : ''}>
              <div
                className="relative rounded-2xl p-7 flex flex-col h-full transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: plan.highlight
                    ? `linear-gradient(150deg, #0e1c38, #071028)`
                    : NAVY2,
                  border: `1px solid ${plan.highlight ? plan.color + '50' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: plan.highlight
                    ? `0 0 60px ${plan.color}22, 0 32px 64px rgba(0,0,0,0.45)`
                    : '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                {/* Badge popular */}
                {plan.badge && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span
                      className="text-xs font-bold px-4 py-1 rounded-full text-white"
                      style={{
                        background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`,
                        boxShadow: `0 0 20px ${CYAN}55`,
                      }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Nombre + desc */}
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em] mb-1"
                  style={{ color: plan.highlight ? plan.color : 'rgba(255,255,255,0.35)' }}
                >
                  {plan.name}
                </p>
                <p className="text-sm text-white/40 mb-5">{plan.desc}</p>

                {/* Precio */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="text-5xl font-black leading-none"
                    style={{ color: plan.highlight ? plan.color : 'white' }}
                  >
                    {fmt(annual ? plan.priceAnnual : plan.priceMonthly)}
                  </span>
                  <span className="text-sm text-white/30">/mes</span>
                </div>

                {/* Ahorro — espacio fijo para que las cards no salten */}
                <div className="h-5 mb-5">
                  {annual && (
                    <p className="text-xs" style={{ color: '#22C55E' }}>
                      Ahorras ${savedPerYear(plan)}k al año ✓
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div
                  className="w-full h-px mb-6"
                  style={{ background: plan.highlight ? `${plan.color}20` : 'rgba(255,255,255,0.05)' }}
                />

                {/* Features */}
                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f.text} className="flex items-center gap-2.5 text-sm">
                      {f.ok ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                          <circle cx="12" cy="12" r="10" fill={plan.color + '18'} stroke={plan.color + '50'} strokeWidth="1.5"/>
                          <path d="M8 12l3 3 5-5" stroke={plan.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                          <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5"/>
                          <path d="M15 9l-6 6M9 9l6 6" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                      <span style={{ color: f.ok ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.22)' }}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={plan.ctaHref}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-center block transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={plan.highlight
                    ? { background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`, color: 'white', boxShadow: `0 0 28px ${CYAN}45` }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                >
                  {plan.cta}
                </a>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Nota legal */}
        <FadeUp className="text-center mt-12">
          <p className="text-white/22 text-sm">
            14 días de prueba gratis en todos los planes · Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </FadeUp>

      </div>
    </section>
  )
}

// ─── Portal de Aliados ────────────────────────────────────────────────────────
type BusinessItem = { id: string; name: string; slug: string; branding: { primary_color?: string } | null }

function Aliados({ businesses = [] }: { businesses: BusinessItem[] }) {
  const router = useRouter()
  const [mode, setMode]           = useState<'dashboard' | 'book'>('dashboard')
  const [selected, setSelected]   = useState<BusinessItem | null>(null)
  const [open, setOpen]           = useState(false)
  const [search, setSearch]       = useState('')
  const [error, setError]         = useState('')
  const dropdownRef               = useRef<HTMLDivElement>(null)
  const searchRef                 = useRef<HTMLInputElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  // Focus en buscador al abrir
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(b: BusinessItem) {
    setSelected(b)
    setOpen(false)
    setSearch('')
    setError('')
  }

  function handleAccess() {
    if (!selected) { setError('Selecciona tu negocio de la lista.'); return }
    setError('')
    router.push(mode === 'dashboard' ? `/${selected.slug}/login` : `/${selected.slug}/book`)
  }

  const dotColor = (b: BusinessItem) => b.branding?.primary_color ?? CYAN

  return (
    <section
      id="aliados"
      className="py-24 px-6 relative overflow-x-hidden"
      style={{ background: `linear-gradient(180deg, ${NAVY2} 0%, ${NAVY} 100%)` }}
    >
      {/* Glow de fondo */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 100%, ${BLUE}20, transparent)` }}
      />

      <div className="max-w-2xl mx-auto relative z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
          style={{ background: `${BLUE}18`, border: `1px solid ${BLUE}40`, color: '#7EB3FF' }}
        >
          <Lock size={14} />
          Portal exclusivo para aliados
        </div>

        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
          Accede a tu <GradientText>negocio</GradientText>
        </h2>
        <p className="text-white/50 mb-12 text-lg">
          Selecciona tu negocio para acceder al panel de gestión
          o para que tus clientes agenden una cita.
        </p>

        {/* Card */}
        <div className="rounded-2xl p-8 text-left"
          style={{ background: '#0D1635', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        >
          {/* Tabs modo */}
          <div className="flex rounded-lg p-1 mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {[
              { key: 'dashboard', label: 'Panel de gestión', icon: <BarChart3 size={14} /> },
              { key: 'book',      label: 'Agendar cita',     icon: <Calendar size={14} /> },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setMode(tab.key as 'dashboard' | 'book')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-md transition-all"
                style={mode === tab.key
                  ? { background: `linear-gradient(135deg, ${CYAN}30, ${BLUE}30)`, color: 'white', border: `1px solid ${CYAN}40` }
                  : { color: 'rgba(255,255,255,0.4)' }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Dropdown selector */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">
                Selecciona tu negocio
              </label>

              <div ref={dropdownRef} className="relative">
                {/* Trigger */}
                <button
                  type="button"
                  onClick={() => setOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm text-left transition-all"
                  style={{
                    background: '#111827',
                    border: `1px solid ${open ? CYAN + '60' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: open ? `0 0 0 3px ${CYAN}15` : 'none',
                  }}
                >
                  <span className="flex items-center gap-3">
                    {selected ? (
                      <>
                        {/* Dot con color del negocio */}
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: dotColor(selected), boxShadow: `0 0 6px ${dotColor(selected)}80` }}
                        />
                        <span className="text-white font-medium">{selected.name}</span>
                        <span className="text-white/30 text-xs">/{selected.slug}</span>
                      </>
                    ) : (
                      <span className="text-white/30">— Elige tu negocio —</span>
                    )}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-white/30 flex-shrink-0 transition-transform duration-200"
                    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  />
                </button>

                {/* Panel desplegable */}
                {open && (
                  <div
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl z-50"
                    style={{
                      background: '#0a0f1e',
                      border: '1px solid rgba(255,255,255,0.10)',
                      boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px ${CYAN}15`,
                      borderRadius: '0.75rem',
                      overflow: 'visible',
                    }}
                  >
                    {/* Buscador */}
                    <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 flex-shrink-0">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                          ref={searchRef}
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Buscar negocio..."
                          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/25"
                        />
                        {search && (
                          <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista — scrollable con fade inferior */}
                    <div className="relative">
                    <div
                      className="max-h-72 overflow-y-auto"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: `${CYAN}40 transparent` }}
                    >
                      {filtered.length === 0 ? (
                        <div className="px-4 py-6 text-center text-white/30 text-sm">
                          {businesses.length === 0
                            ? 'Aún no hay negocios registrados.'
                            : 'No se encontró ningún negocio.'}
                        </div>
                      ) : (
                        filtered.map((b, i) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelect(b)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all group"
                            style={{
                              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                              background: selected?.id === b.id ? `${CYAN}10` : 'transparent',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = `${CYAN}08`)}
                            onMouseLeave={e => (e.currentTarget.style.background = selected?.id === b.id ? `${CYAN}10` : 'transparent')}
                          >
                            {/* Color dot */}
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all"
                              style={{ background: dotColor(b), boxShadow: `0 0 8px ${dotColor(b)}60` }}
                            />
                            {/* Info */}
                            <span className="flex-1 min-w-0">
                              <span className="text-white text-sm font-medium block truncate">{b.name}</span>
                              <span className="text-white/30 text-xs">xinuco.com/{b.slug}</span>
                            </span>
                            {/* Check si seleccionado */}
                            {selected?.id === b.id && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    {/* Fade inferior — indica que hay más items */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-xl"
                      style={{ background: 'linear-gradient(to top, #0a0f1e, transparent)' }} />
                    </div>

                    {/* Footer del panel */}
                    <div className="px-4 py-2.5 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <span className="text-[11px] text-white/20">
                        {filtered.length} negocio{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>

            {/* Botón acción */}
            <button
              type="button"
              onClick={handleAccess}
              disabled={!selected}
              className="w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={selected
                ? { background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`, boxShadow: `0 0 30px ${CYAN}35` }
                : { background: 'rgba(255,255,255,0.06)' }
              }
            >
              {mode === 'dashboard'
                ? <><BarChart3 size={16} /> Ir al panel de gestión</>
                : <><Calendar size={16} /> Agendar mi cita</>}
            </button>
          </div>

          {/* Info contacto */}
          <p className="text-xs text-white/25 text-center mt-5">
            ¿Tu negocio no aparece? Escríbenos a{' '}
            <a href="mailto:hola@xinuco.com" className="underline" style={{ color: `${CYAN}90` }}>
              hola@xinuco.com
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Nosotros ─────────────────────────────────────────────────────────────────
function Nosotros() {
  return (
    <section
      id="nosotros"
      className="py-24 px-6"
      style={{ background: NAVY }}
    >
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-4" style={{ color: CYAN }}>
            Quiénes somos
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Sora, sans-serif' }}>
            Innovamos para <GradientText>impulsar el futuro</GradientText> de los negocios LATAM
          </h2>
          <p className="text-white/50 leading-relaxed mb-8">
            Xinuco nació para democratizar la tecnología empresarial en Latinoamérica.
            Creemos que cada pequeño negocio merece las mismas herramientas que usan
            las grandes corporaciones — sin la complejidad ni el costo.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[
              { title: 'Innovamos',   desc: 'Impulsando el futuro con tecnología que realmente funciona.' },
              { title: 'Conectamos',  desc: 'Tecnología, negocios y personas en un ecosistema.' },
              { title: 'Inteligencia', desc: 'Datos que se transforman en decisiones más inteligentes.' },
              { title: 'Impacto Real', desc: 'Resultados medibles desde el primer día de uso.' },
            ].map(i => (
              <div key={i.title}>
                <h4 className="font-bold text-white text-sm mb-1" style={{ color: CYAN }}>{i.title}</h4>
                <p className="text-white/40 text-xs leading-relaxed">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — app icon */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Glow detrás */}
            <div
              className="absolute inset-0 -m-6 rounded-full blur-2xl opacity-35 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${CYAN} 0%, ${BLUE} 55%, transparent 75%)` }}
            />
            <Image
              src="https://rymlwtijbtokpqharrig.supabase.co/storage/v1/object/public/assets/landing/xinuco-app-icon.png"
              alt="Xinuco App"
              width={260}
              height={260}
              className="relative z-10 rounded-[3rem] shadow-2xl"
              style={{ boxShadow: `0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      className="py-10 px-6 border-t"
      style={{ background: NAVY2, borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <XinucoMark size={28} />
          <div>
            <XinucoWordmark size={15} />
            <p className="text-white/30 text-xs mt-1">Tecnología · Inteligencia · Impacto</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-white/30">
          <a href="#verticales" className="hover:text-white/60 transition-colors">Verticales</a>
          <a href="#aliados"    className="hover:text-white/60 transition-colors">Aliados</a>
          <a href="mailto:hola@xinuco.com" className="hover:text-white/60 transition-colors">Contacto</a>
          <a href="/adminbarberia/login" className="hover:text-white/60 transition-colors">Admin</a>
        </div>

        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Xinuco. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────
const DEFAULT_STATS: LandingStats = { citasTotal: 0, barberias: 0, clientes: 0 }

export default function XinucoLanding({
  businesses = [],
  stats = DEFAULT_STATS,
}: {
  businesses: BusinessItem[]
  stats?: LandingStats
}) {
  return (
    <div className="antialiased" style={{ background: NAVY, color: 'white' }}>
      <GrainOverlay />
      <Navbar />
      <Hero stats={stats} />
      <Verticales />
      <Features />
      <Pricing />
      <Aliados businesses={businesses} />
      <Nosotros />
      <Footer />
    </div>
  )
}
