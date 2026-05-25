'use server'
// ============================================================
// actions/super-admin.ts — Server Actions for super admin
// All actions require profile.role === 'super_admin'.
// ============================================================

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PLAN_BUNDLES } from '@/lib/features/config'
import type { BusinessFeatures } from '@/types/database'
import type { PlanName } from '@/lib/features/config'

export interface ActionResult {
  success: boolean
  error?:  string
}

// ── Auth guard helper ─────────────────────────────────────────────────────────
//
// [SEC] Usa app_metadata.role del JWT — NO la tabla profiles.
// Los super_admin no tienen fila en profiles (no son tenant-specific).
// app_metadata solo es escribible por el service role (servidor) — nunca
// puede ser manipulado por el cliente. Es la fuente de verdad para roles.

async function requireSuperAdmin() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.', supabase: null, user: null }

  if (user.app_metadata?.role !== 'super_admin') {
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

// ── User Management Actions ───────────────────────────────────────────────────

/**
 * Lists all users (profiles) for a given business, enriched with auth emails.
 */
export async function listBusinessUsers(businessId: string): Promise<{
  data: Array<{ id: string; full_name: string; role: string; created_at: string; email?: string }> | null
  error: string | null
}> {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { data: null, error: authError }

  // Usar adminClient (service role) para bypasear RLS —
  // el super_admin no tiene business_id en su JWT, por lo que
  // el cliente normal devuelve 0 filas silenciosamente.
  const adminClient = await createAdminClient()

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('business_id', businessId)
    .order('created_at')

  if (profilesError) return { data: null, error: profilesError.message }

  // Enrich with emails from auth
  const enriched = await Promise.all((profiles ?? []).map(async (p) => {
    try {
      const { data: { user } } = await adminClient.auth.admin.getUserById(p.id)
      return { ...p, email: user?.email ?? undefined }
    } catch {
      return { ...p }
    }
  }))

  return { data: enriched, error: null }
}

/**
 * Creates a new auth user for a business and updates their profile role.
 */
export async function createBusinessUser(params: {
  businessId: string
  slug: string
  email: string
  password: string
  fullName: string
  role: 'admin' | 'barber' | 'manicurist'
}): Promise<ActionResult & { userId?: string }> {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { success: false, error: authError }

  const adminClient = await createAdminClient()

  // Step 1: Create auth user
  // [SEC] business_id and slug go in app_metadata (server-only, NOT editable by client).
  //       full_name is display data only — user_metadata is fine for it.
  //       NEVER put security-relevant claims in user_metadata (client can overwrite via
  //       supabase.auth.updateUser({ data: { business_id: 'attacker-id' } })).
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    app_metadata: {
      business_id: params.businessId,
      slug: params.slug,
    },
    user_metadata: {
      full_name: params.fullName,
    },
  })

  if (createError || !createData.user) {
    return { success: false, error: createError?.message ?? 'Error al crear usuario.' }
  }

  const userId = createData.user.id

  // Step 2: Upsert profile (trigger may have already created it, or we create it manually)
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      business_id: params.businessId,
      full_name: params.fullName,
      role: params.role,
    })

  if (profileError) {
    // Attempt rollback
    await adminClient.auth.admin.deleteUser(userId)
    return { success: false, error: `Perfil no creado: ${profileError.message}` }
  }

  revalidatePath(`/super-admin/businesses/${params.businessId}/users`)
  return { success: true, userId }
}

/**
 * Updates the role of a user, refusing to downgrade a super_admin.
 */
export async function updateUserRole(
  userId: string,
  role: 'admin' | 'barber' | 'manicurist',
): Promise<ActionResult> {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { success: false, error: authError }

  const adminClient = await createAdminClient()

  // Safety: refuse if target user is super_admin
  const { data: existing } = await adminClient
    .from('profiles')
    .select('role, business_id')
    .eq('id', userId)
    .single()

  if (existing?.role === 'super_admin') {
    return { success: false, error: 'No se puede cambiar el rol de un super_admin.' }
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (updateError) return { success: false, error: updateError.message }

  if (existing?.business_id) {
    revalidatePath(`/super-admin/businesses/${existing.business_id}/users`)
  }
  return { success: true }
}

/**
 * Bans a user for ~100 years (effectively disabled without deleting data).
 */
export async function disableUser(userId: string): Promise<ActionResult> {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { success: false, error: authError }

  const adminClient = await createAdminClient()

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: '876600h', // ~100 years
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Permanently deletes a user from auth (profile is removed by FK cascade).
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { success: false, error: authError }

  const adminClient = await createAdminClient()

  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
