'use server'

import { createClient }      from '@/lib/supabase/server'
import { revalidatePath }    from 'next/cache'
import { Database }          from '@/types/database.types'
import type { BusinessInsert, BusinessFeatures } from '@/types/database'

export async function getBusinessBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, is_active, branding, features_enabled, created_at')
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'super_admin') {
    return { error: 'Autorización denegada. Se requiere rol de super_admin.' }
  }

  // La seguridad del rol ya está validada DENTRO del RPC de Postgres.
  const { error } = await supabase.rpc('toggle_feature_flag', {
    p_business_id: businessId,
    p_feature_key: featureKey,
    p_value: value
  })
  
  if (error) return { error: error.message }
  
  revalidatePath('/admin')
  return { success: true }
}

