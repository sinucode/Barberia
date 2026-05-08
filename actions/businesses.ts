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
export async function toggleBusinessFeature(
  businessId: string, 
  featureKey: keyof BusinessFeatures, 
  value: boolean
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Verificación Zero-DB: rol extraído directamente de la sesión
    if (!user || user.user_metadata?.role !== 'admin') {
      return { error: 'Autorización denegada. Se requiere rol de administrador.' }
    }

    // 1. Obtener estado actual de los features
    const { data: businessRaw, error: fetchError } = await supabase
      .from('businesses')
      .select('features_enabled')
      .eq('id', businessId)
      .single()

    const business = businessRaw as { features_enabled: BusinessFeatures | null } | null

    if (fetchError || !business) {
      return { error: 'Error al obtener los datos del negocio.' }
    }

    // 2. Fusionar el JSONB actual con el nuevo valor
    const currentFeatures = (business.features_enabled || {}) as Partial<BusinessFeatures>
    
    // Aseguramos estructura base más la sobreescritura
    const newFeatures: BusinessFeatures = {
      loyalty: false,
      inventory: false,
      advanced_reports: false,
      ...currentFeatures,
      [featureKey]: value
    }

    // 3. Ejecutar el update
    const { error: updateError } = await (supabase.from('businesses') as any)
      .update({ features_enabled: newFeatures })
      .eq('id', businessId)

    if (updateError) {
      return { error: updateError.message }
    }

    // Refrescar caché de la vista de admin
    revalidatePath('/admin')
    
    return { success: true }
  } catch (error: any) {
    return { error: error?.message || 'Error interno del servidor.' }
  }
}

