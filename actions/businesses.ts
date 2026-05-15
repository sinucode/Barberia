'use server'

import { createClient, createAdminClient }      from '@/lib/supabase/server'
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

