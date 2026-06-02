'use client'
// ============================================================
// lib/features/context.tsx
// Contexto de features + Trial Mode override
// Si trial_expires_at es una fecha futura, TODAS las features
// se tratan como habilitadas (sin modificar la BD).
// ============================================================

import { createContext, useContext, useMemo } from 'react'
import type { BusinessFeatures } from '@/types/database'

// ── Valor por defecto del contexto (todo activo para SSR) ─────────────────────

const defaultFeatures: BusinessFeatures = {
  notifications_email:    true,
  notifications_whatsapp: true,
  commissions:            true,
  staff_ledger:           true,
  expenses_pgl:           true,
  retail_sales:           true,
  loyalty:                true,
  workstations:           true,
  walk_ins:               true,
  crm:                    true,
  audit_logs:             true,
  fixed_assets:           true,
  inventory:              true,
  advanced_reports:       true,
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FeaturesContextValue {
  /** Features efectivas (pueden estar overrideadas por trial activo) */
  features:       BusinessFeatures
  /** true si el trial está activo y aún no venció */
  isTrialActive:  boolean
  /** ISO timestamp de vencimiento del trial, o null */
  trialExpiresAt: string | null
  /** Días restantes del trial (0 si inactivo) */
  trialDaysLeft:  number
}

// ── Context ───────────────────────────────────────────────────────────────────

const FeaturesContext = createContext<FeaturesContextValue>({
  features:       defaultFeatures,
  isTrialActive:  false,
  trialExpiresAt: null,
  trialDaysLeft:  0,
})

// ── Helper: verificar si el trial está vigente ────────────────────────────────

function checkTrial(trialExpiresAt: string | null): {
  isActive:  boolean
  daysLeft:  number
} {
  if (!trialExpiresAt) return { isActive: false, daysLeft: 0 }

  const expiry = new Date(trialExpiresAt)
  const now    = new Date()

  if (expiry <= now) return { isActive: false, daysLeft: 0 }

  const msLeft   = expiry.getTime() - now.getTime()
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

  return { isActive: true, daysLeft }
}

// ── ALL_FEATURES_ON — object con todas las features en true ──────────────────

function allFeaturesOn(base: BusinessFeatures): BusinessFeatures {
  const result = { ...base }
  for (const key of Object.keys(result) as (keyof BusinessFeatures)[]) {
    result[key] = true
  }
  return result
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function FeaturesProvider({
  features,
  trialExpiresAt = null,
  children,
}: {
  features:        BusinessFeatures
  trialExpiresAt?: string | null
  children:        React.ReactNode
}) {
  const value = useMemo<FeaturesContextValue>(() => {
    const { isActive, daysLeft } = checkTrial(trialExpiresAt)

    return {
      // Si el trial está activo, override todo a true
      features:       isActive ? allFeaturesOn(features) : features,
      isTrialActive:  isActive,
      trialExpiresAt,
      trialDaysLeft:  daysLeft,
    }
  }, [features, trialExpiresAt])

  return (
    <FeaturesContext.Provider value={value}>
      {children}
    </FeaturesContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Devuelve el objeto completo de features (con override de trial si aplica) */
export function useFeatures(): BusinessFeatures {
  return useContext(FeaturesContext).features
}

/** Devuelve true si la feature está habilitada (o si el trial está activo) */
export function useFeature(feature: keyof BusinessFeatures): boolean {
  const { features } = useContext(FeaturesContext)
  return features[feature] ?? false
}

/** Devuelve el estado completo del trial */
export function useTrialStatus(): {
  isActive:  boolean
  expiresAt: string | null
  daysLeft:  number
} {
  const ctx = useContext(FeaturesContext)
  return {
    isActive:  ctx.isTrialActive,
    expiresAt: ctx.trialExpiresAt,
    daysLeft:  ctx.trialDaysLeft,
  }
}
