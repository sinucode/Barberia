'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Sparkles, ArrowRight, ChevronRight } from 'lucide-react'
import { useFeature } from '@/lib/features/context'
import type { BusinessFeatures } from '@/types/database'

// ════════════════════════════════════════════════════════════════════════════════
// FeatureGate — Paywall Premium para módulos restringidos por plan
// ════════════════════════════════════════════════════════════════════════════════

interface FeatureGateProps {
  /** Clave del feature flag dentro de features_enabled JSONB */
  featureKey: keyof BusinessFeatures
  /** Nombre legible del plan requerido (ej. "Profesional", "Élite") */
  planName: string
  /** Contenido protegido que se renderiza si el feature está activo */
  children: ReactNode
}

export function FeatureGate({ featureKey, planName, children }: FeatureGateProps) {
  const isEnabled = useFeature(featureKey)
  const [isMounted, setIsMounted] = useState(false)
  const params = useParams()
  const slug = params?.slug as string

  // Animación de entrada sedosa sin framer-motion
  useEffect(() => {
    if (!isEnabled) {
      const t = requestAnimationFrame(() => setIsMounted(true))
      return () => cancelAnimationFrame(t)
    }
  }, [isEnabled])

  // ── Feature habilitada → renderiza children normalmente ──
  if (isEnabled) return <>{children}</>

  // ── Feature restringida → Paywall Premium ──
  return (
    <div
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16"
      style={{
        opacity: isMounted ? 1 : 0,
        transform: isMounted ? 'translateY(0)' : 'translateY(15px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
      }}
    >
      {/* ── Icono de Candado con Glow Dorado ── */}
      <div className="relative mb-8">
        {/* Glow difuso detrás del ícono */}
        <div
          className="absolute inset-0 -m-6 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--primary-color) 0%, transparent 70%)',
          }}
        />
        <div
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center border"
          style={{
            background: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--primary-color) 20%, transparent)',
          }}
        >
          <Lock
            size={36}
            strokeWidth={1.5}
            style={{ color: 'var(--primary-color)' }}
          />
        </div>
      </div>

      {/* ── Cabecera — Michroma ── */}
      <h2
        className="text-2xl md:text-3xl text-xinuco-text text-center mb-3"
        style={{
          fontFamily: 'var(--font-michroma), Michroma, sans-serif',
          letterSpacing: '0.12em',
          fontWeight: 600,
        }}
      >
        Módulo Restringido
      </h2>

      {/* ── Copy Persuasivo — Sora ── */}
      <p
        className="text-xinuco-muted text-center max-w-md mb-2 leading-relaxed"
        style={{
          fontFamily: 'var(--font-sora), Sora, sans-serif',
          fontWeight: 600,
          fontSize: '0.95rem',
        }}
      >
        Automatiza y escala tu negocio. Esta función está disponible
        a partir del plan{' '}
        <span style={{ color: 'var(--primary-color)' }}>{planName}</span>.
      </p>

      {/* ── Beneficios rápidos ── */}
      <div className="flex flex-col gap-2 my-6 max-w-sm w-full">
        {[
          'Desbloquea módulos avanzados',
          'Acceso a reportes financieros',
          'Soporte prioritario incluido',
        ].map((benefit) => (
          <div
            key={benefit}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--primary-color) 5%, transparent)',
              border: '1px solid color-mix(in srgb, var(--primary-color) 10%, transparent)',
            }}
          >
            <Sparkles
              size={14}
              style={{ color: 'var(--primary-color)', flexShrink: 0 }}
            />
            <span
              className="text-sm text-xinuco-text"
              style={{ fontFamily: 'var(--font-sora), Sora, sans-serif' }}
            >
              {benefit}
            </span>
          </div>
        ))}
      </div>

      {/* ── CTA Principal — Botón de Upgrade ── */}
      <Link
        href={`/${slug}/dashboard/settings/billing?upgrade=${encodeURIComponent(planName)}`}
        className="flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          fontFamily: 'var(--font-sora), Sora, sans-serif',
          fontWeight: 700,
          background: 'var(--primary-color)',
          color: 'var(--bg-color)',
          boxShadow: '0 0 30px color-mix(in srgb, var(--primary-color) 30%, transparent)',
        }}
      >
        Hacer Upgrade a {planName}
        <ArrowRight size={16} />
      </Link>

      {/* ── Enlace Secundario ── */}
      <Link
        href={`/${slug}/dashboard/settings/billing`}
        className="mt-4 flex items-center gap-1 text-xs text-xinuco-muted hover:text-xinuco-text transition-colors"
        style={{ fontFamily: 'var(--font-sora), Sora, sans-serif' }}
      >
        Ver todos los planes y características
        <ChevronRight size={12} />
      </Link>
    </div>
  )
}
