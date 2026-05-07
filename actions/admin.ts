'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { BusinessInsert } from '@/types/database'

// ── Tipo del estado devuelto por las Server Actions ──────────────────────────
export interface ActionResult {
  success: boolean
  error?:  string
}

/**
 * createTenant — Inserta un nuevo negocio (tenant) en la tabla businesses.
 * Inicializa el JSONB de branding con los colores recibidos y defaults seguros.
 */
export async function createTenant(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  // TODO: verificar rol super-admin cuando implementemos RBAC
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const name          = (formData.get('name')          as string).trim()
  const slug          = (formData.get('slug')          as string).trim().toLowerCase()
  const primaryColor  = (formData.get('primary_color') as string) || '#C5A059'
  const bgColor       = (formData.get('bg_color')      as string) || '#080808'

  // Validaciones básicas
  if (!name || name.length < 2)  return { success: false, error: 'El nombre debe tener al menos 2 caracteres.' }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { success: false, error: 'El slug solo puede tener letras minúsculas, números y guiones.' }

  // Verificar que el slug no exista ya
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) return { success: false, error: `El slug "${slug}" ya está en uso. Elige otro.` }

  const newBusiness: BusinessInsert = {
    name,
    slug,
    is_active: true,
    branding: {
      primary_color:   primaryColor,
      secondary_color: '#1A1A1A',
      bg_color:        bgColor,
      text_color:      '#F4F4F4',
      logo_url:        null,
      font_family:     'Inter',
    },
  }

  const { error } = await supabase.from('businesses').insert([newBusiness])

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * toggleTenantStatus — Activa o desactiva un negocio por id.
 */
export async function toggleTenantStatus(
  id: string,
  currentStatus: boolean,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('businesses')
    .update({ is_active: !currentStatus })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}
