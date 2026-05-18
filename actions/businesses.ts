'use server'

import { createClient, createAdminClient }      from '@/lib/supabase/server'
import { revalidatePath }    from 'next/cache'
import { Database }          from '@/types/database.types'
import type { BusinessInsert, BusinessFeatures, BrandConfig } from '@/types/database'

// ── Regex estricta para colores hexadecimales (#RGB, #RRGGBB, #RRGGBBAA) ──────
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

export async function getBusinessBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, is_active, branding, brand_config, features_enabled, created_at')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data
}

export async function getBusinesses() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('*')

  if (error) throw error
  return data
}

export async function createBusiness(businessData: BusinessInsert) {
  const supabase = await createClient()

  const { data, error } = await (supabase.from('businesses') as any)
    .insert([businessData])
    .select()

  if (error) throw error
  return data
}

/**
 * toggleBusinessFeature — Habilita o deshabilita un módulo (Feature Flag)
 * para un inquilino específico asegurando validación de rol de admin.
 */
export async function toggleBusinessFeature(businessId: string, featureKey: string, value: boolean) {
  const supabase = await createClient()

  // 1. Validar que el usuario sea super_admin en el servidor (Next.js side security)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'super_admin') {
    return { error: 'Autorización denegada. Se requiere rol de super_admin.' }
  }

  // 2. Usar cliente administrativo para bypass del RPC fallido y RLS
  const adminSupabase = await createAdminClient()

  // Obtener estado actual de los módulos
  const { data: biz, error: fetchError } = await adminSupabase
    .from('businesses')
    .select('features_enabled')
    .eq('id', businessId)
    .single()

  if (fetchError || !biz) return { error: 'No se pudo obtener el estado del negocio.' }

  // Patch del JSONB
  const updatedFeatures = {
    ...(biz.features_enabled as any),
    [featureKey]: value
  }

  const { error: updateError } = await adminSupabase
    .from('businesses')
    .update({ features_enabled: updatedFeatures } as any)
    .eq('id', businessId)
  
  if (updateError) return { error: updateError.message }
  
  revalidatePath('/admin')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════════════
// updateBusinessTheme — Actualiza la configuración visual (brand_config JSONB)
// ════════════════════════════════════════════════════════════════════════════════

export async function updateBusinessTheme(businessId: string, config: BrandConfig) {
  const supabase = await createClient()

  // 1. Validación de sesión (Anti-IDOR)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado. Inicia sesión para continuar.' }
  }

  // 2. Validación estricta de formato hexadecimal
  if (!HEX_COLOR_REGEX.test(config.primaryColor)) {
    return { error: `Color primario inválido: "${config.primaryColor}". Usa formato hexadecimal (ej: #C5A059).` }
  }

  // 3. Sanitizar el payload — solo campos permitidos
  const safeConfig: BrandConfig = {
    primaryColor: config.primaryColor,
    fontFamily:   config.fontFamily.trim().toLowerCase(),
    ...(config.logoUrl ? { logoUrl: config.logoUrl } : {}),
  }

  // 4. Persistir en Supabase
  const { error: updateError } = await supabase
    .from('businesses')
    .update({ brand_config: safeConfig } as any)
    .eq('id', businessId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 5. Invalidar caché — la UI del tenant y el dashboard se refrescan
  revalidatePath(`/`)  // Revalida todas las rutas del tenant
  return { success: true }
}

