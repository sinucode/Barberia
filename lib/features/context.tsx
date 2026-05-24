'use client'
// ============================================================
// lib/features/context.tsx — React Context for feature flags
// Injected from DashboardLayout (Server Component).
// Accessible in any Client Component via useFeatures().
// ============================================================

import { createContext, useContext } from 'react'
import type { BusinessFeatures } from '@/types/database'

// Default: all features ON so components without a provider don't break.
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

export const FeaturesContext = createContext<BusinessFeatures>(defaultFeatures)

export function FeaturesProvider({
  features,
  children,
}: {
  features: BusinessFeatures
  children: React.ReactNode
}) {
  return (
    <FeaturesContext.Provider value={features}>
      {children}
    </FeaturesContext.Provider>
  )
}

/** Returns the full features object for the current tenant. */
export function useFeatures(): BusinessFeatures {
  return useContext(FeaturesContext)
}

/** Check a single feature flag. Returns false if the flag is absent. */
export function useFeature(feature: keyof BusinessFeatures): boolean {
  const features = useFeatures()
  return features[feature] ?? false
}
