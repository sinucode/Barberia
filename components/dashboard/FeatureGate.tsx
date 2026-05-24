'use client'
// ============================================================
// components/dashboard/FeatureGate.tsx
// Client component that gates content behind a feature flag.
//
// Usage:
//   <FeatureGate feature="loyalty">
//     <LoyaltyDashboard />
//   </FeatureGate>
// ============================================================

import type { ReactNode } from 'react'
import {
  Mail, MessageCircle, Percent, Wallet, Receipt, ShoppingBag,
  Gift, LayoutGrid, Users, BookUser, Shield, Package, Archive,
  BarChart2, LucideIcon,
} from 'lucide-react'
import { useFeature } from '@/lib/features/context'
import { FEATURE_CATALOG } from '@/lib/features/config'
import type { BusinessFeatures } from '@/types/database'

// ── Icon map (lucide name → component) ───────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Mail, MessageCircle, Percent, Wallet, Receipt, ShoppingBag,
  Gift, LayoutGrid, Users, BookUser, Shield, Package, Archive, BarChart2,
}

// ── Default upgrade fallback ──────────────────────────────────────────────────

function UpgradeFallback({ feature }: { feature: keyof BusinessFeatures }) {
  const meta    = FEATURE_CATALOG[feature]
  const Icon    = ICON_MAP[meta.icon] ?? Shield

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Icon badge */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
        style={{
          background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
          border:     '1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)',
        }}
      >
        <Icon size={36} style={{ color: 'var(--primary-color)' }} />
      </div>

      {/* Feature name */}
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-color)' }}>
        {meta.label}
      </h2>

      {/* Description */}
      <p className="text-sm mb-6 max-w-sm leading-relaxed" style={{ color: 'rgba(244,244,244,0.55)' }}>
        {meta.description}
      </p>

      {/* Divider */}
      <div
        className="w-12 h-px mb-6"
        style={{ background: 'color-mix(in srgb, var(--primary-color) 40%, transparent)' }}
      />

      {/* Upgrade message */}
      <p className="text-sm font-medium mb-1" style={{ color: 'rgba(244,244,244,0.80)' }}>
        Esta función no está incluida en tu plan actual.
      </p>
      <p className="text-xs" style={{ color: 'rgba(244,244,244,0.40)' }}>
        Contacta a tu administrador para activarla.
      </p>
    </div>
  )
}

// ── FeatureGate ───────────────────────────────────────────────────────────────

interface FeatureGateProps {
  feature:   keyof BusinessFeatures
  children:  ReactNode
  fallback?: ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const enabled = useFeature(feature)

  if (!enabled) {
    return <>{fallback ?? <UpgradeFallback feature={feature} />}</>
  }

  return <>{children}</>
}
