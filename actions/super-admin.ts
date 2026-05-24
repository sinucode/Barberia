'use server'
// ============================================================
// actions/super-admin.ts — Server Actions for super admin
// All actions require profile.role === 'super_admin'.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PLAN_BUNDLES } from '@/lib/features/config'
import type { BusinessFeatures } from '@/types/database'
import type { PlanName } from '@/lib/features/config'

export interface ActionResult {
  success: boolean
  error?:  string
}

// ── Auth guard helper ─────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.', supabase: null, user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return { error: 'Acceso denegado. Se requiere rol super_admin.', supabase: null, user: null }
  }

  return { error: null, supabase, user }
}

// ── getAllBusinesses ───────────────────────────────────────────────────────────

export async function getAllBusinesses() {
  const { error, supabase } = await requireSuperAdmin()
  if (error || !supabase) return { data: null, error: error ?? 'Error desconocido.' }

  const { data, error: dbError } = await supabase
    .from('businesses')
    .select('id, name, slug, is_active, features_enabled, created_at')
    .order('name')

  if (dbError) return { data: null, error: dbError.message }
  return { data, error: null }
}

// ── updateBusinessFeatures ────────────────────────────────────────────────────

/**
 * Merges partial feature overrides into the existing features_enabled JSONB.
 * Does NOT replace the entire object — only touches the provided keys.
 */
export async function updateBusinessFeatures(
  businessId: string,
  features:   Partial<BusinessFeatures>,
): Promise<ActionResult> {
  const { error, supabase } = await requireSuperAdmin()
  if (error || !supabase) return { success: false, error: error ?? 'Error desconocido.' }

  // Fetch current features to merge
  const { data: biz, error: fetchError } = await supabase
    .from('businesses')
    .select('features_enabled')
    .eq('id', businessId)
    .single()

  if (fetchError || !biz) return { success: false, error: fetchError?.message ?? 'Negocio no encontrado.' }

  const current   = (biz.features_enabled ?? {}) as unknown as BusinessFeatures
  const merged    = { ...current, ...features }

  const { error: updateError } = await supabase
    .from('businesses')
    .update({ features_enabled: merged as unknown as Record<string, boolean> })
    .eq('id', businessId)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath('/super-admin/businesses')
  revalidatePath(`/super-admin/businesses/${businessId}`)
  return { success: true }
}

// ── applyPlan ─────────────────────────────────────────────────────────────────

/**
 * Applies a full plan bundle to a business, replacing all feature flags
 * with the bundle's values.
 */
export async function applyPlan(
  businessId: string,
  plan:        PlanName,
): Promise<ActionResult> {
  const bundle = PLAN_BUNDLES[plan]
  if (!bundle) return { success: false, error: `Plan desconocido: ${plan}` }

  // applyPlan is a "full replace" of the plan keys — reuse updateBusinessFeatures
  // but with all keys from the bundle (it's a complete set)
  return updateBusinessFeatures(businessId, bundle.features as Partial<BusinessFeatures>)
}
