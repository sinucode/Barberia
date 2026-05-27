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
              left: '50%',
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
    { label: 'Inicio',      href: '#hero' },
    { label: 'Verticales',  href: '#verticales' },
    { label: 'Aliados',     href: '#aliados' },
    { label: 'Nosotros',    href: '#nosotros' },
  ]

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{ background: `${NAVY}cc`, backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo horizontal corporativo: isotipo + (XINUCO + tagline) */}
      <a href="#hero" className="flex items-center gap-3 leading-none">
        <XinucoMark size={42} />
        <div className="flex flex-col items-start gap-1">
          <XinucoWordmark size={20} />
          <p
            className="uppercase text-white/45"
            style={{
              fontFamily: 'var(--font-sora), Sora, sans-serif',
              fontSize: '7px',
              letterSpacing: '0.28em',
            }}
          >
            Tecnología · Inteligencia · Impacto
          </p>
        </div>
      </a>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-8">
        {links.map(l => (
          <a
            key={l.href}
            href={l.href}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            {l.label}
          </a>
        ))}
      </nav>

      {/* CTA */}
      <div className="hidden md:flex items-center gap-3">
        <a
          href="#aliados"
          className="px-4 py-2 text-sm rounded-lg text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition-all"
        >
          Portal Aliados
        </a>
        <a
          href="/adminbarberia/login"
          className="px-4 py-2 text-sm rounded-lg font-semibold text-white transition-all"
          style={{ background: `linear-gradient(135deg, ${CYAN}, ${BLUE})` }}
        >
          Admin
        </a>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-white"
        onClick={() => setOpen(o => !o)}
        aria-label="Menú"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 py-4 px-6 flex flex-col gap-4 md:hidden"
          style={{ background: NAVY2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-white/80 text-sm py-1"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#aliados"
            className="text-center py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${CYAN}, ${BLUE})` }}
            onClick={() => setOpen(false)}
          >
            Portal Aliados
          </a>
        </div>
      )}
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
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

          {/* Stats — fila horizontal con separadores */}
          <div className="flex items-center gap-0 pt-4 border-t border-white/8 w-full justify-center">
            {[
              { value: '1',    label: 'Vertical activa' },
              { value: '∞',    label: 'Negocios posibles' },
              { value: '100%', label: 'Cloud & seguro' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <div className="w-px h-8 bg-white/10 mx-6" />}
                <div className="text-center">
                  <p className="text-xl font-bold leading-none" style={{ color: CYAN }}>{s.value}</p>
                  <p className="text-[10px] text-white/35 mt-1 uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Columna derecha: celular ══ */}
        <div className="flex justify-center items-center">
          <div className="relative">
            {/* Halo detrás del teléfono */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 360, height: 500,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(ellipse at center, ${BLUE}55 0%, ${CYAN}30 40%, transparent 70%)`,
                filter: 'blur(48px)',
                opacity: 0.5,
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
                background: '#080d1a',
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
              {/* Pantalla — splash */}
              <Image
                src="https://rymlwtijbtokpqharrig.supabase.co/storage/v1/object/public/assets/landing/xinuco-splash.png"
                alt="Xinuco App"
                fill
                sizes="285px"
                className="object-cover"
                priority
              />
              {/* Brillo de pantalla (reflejo superior) */}
              <div
                className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-10"
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
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: CYAN }}>
            Nuestras Verticales
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Un sistema, <GradientText>múltiples industrias</GradientText>
          </h2>
          <p className="mt-4 text-white/50 text-lg max-w-2xl mx-auto">
            El mismo núcleo tecnológico adaptado a cada tipo de negocio. Escala con tu empresa.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {VERTICALES.map(v => (
            <div
              key={v.slug}
              className="relative rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1"
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
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: BLUE }}>
            Tecnología
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Todo lo que necesita <GradientText>tu negocio</GradientText>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all bg-white/[0.02] hover:bg-white/[0.04]"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `linear-gradient(135deg, ${CYAN}22, ${BLUE}22)`, color: CYAN }}
              >
                {f.icon}
              </div>
              <h4 className="text-white font-semibold mb-1.5">{f.title}</h4>
              <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
        </div>
          ))}
        </div>
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
      className="py-24 px-6 relative overflow-hidden"
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
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
                    style={{
                      background: '#0a0f1e',
                      border: '1px solid rgba(255,255,255,0.10)',
                      boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px ${CYAN}15`,
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

                    {/* Lista */}
                    <div className="max-h-56 overflow-y-auto">
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
export default function XinucoLanding({ businesses = [] }: { businesses: BusinessItem[] }) {
  return (
    <div className="antialiased" style={{ background: NAVY, color: 'white' }}>
      <Navbar />
      <Hero />
      <Verticales />
      <Features />
      <Aliados businesses={businesses} />
      <Nosotros />
      <Footer />
    </div>
  )
}
