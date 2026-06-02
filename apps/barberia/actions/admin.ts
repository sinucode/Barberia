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

  // ── [SEC M-8] BARRERA DE SEGURIDAD RBAC — solo por rol, sin bypass de email ──
  // app_metadata.role solo es escribible por el servidor via service role.
  // Eliminar el bypass por email previene escalada de privilegios si esa
  // cuenta es comprometida.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'super_admin') {
    return { success: false, error: 'Acceso denegado. Se requieren privilegios de super_admin.' }
  }

  const name          = (formData.get('name')          as string).trim()
  const slug          = (formData.get('slug')          as string).trim().toLowerCase()
  const primaryColor  = (formData.get('primary_color') as string) || '#C5A059'
  const bgColor       = (formData.get('bg_color')      as string) || '#080808'

  // Validaciones básicas
  if (!name || name.length < 2)  return { success: false, error: 'El nombre debe tener al menos 2 caracteres.' }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { success: false, error: 'El slug solo puede tener letras minúsculas, números y guiones.' }

  const newBusiness: BusinessInsert = {
    name,
    slug,
    is_active: true,
    features_enabled: {
      notifications_email:    false,
      notifications_whatsapp: false,
      commissions:            false,
      staff_ledger:           false,
      expenses_pgl:           false,
      retail_sales:           false,
      loyalty:                false,
      workstations:           false,
      walk_ins:               false,
      crm:                    false,
      audit_logs:             false,
      fixed_assets:           false,
      inventory:              false,
      advanced_reports:       false,
    },
    branding: {
      primary_color:   primaryColor,
      secondary_color: '#1A1A1A',
      bg_color:        bgColor,
      text_color:      '#F4F4F4',
      logo_url:        null,
      font_family:     'Inter',
    },
    brand_config: {
      primaryColor:   primaryColor,
      secondaryColor: '#1A1A1A',
      bgColor:        bgColor,
      textColor:      '#F4F4F4',
      fontFamily:     'Inter',
    },
  }

  // ── ESCRITURA CON CLIENTE AUTENTICADO (RLS via JWT, Capa 2) ───────────────
  // El cliente normal adjunta el JWT del usuario activo al request.
  // Postgres valida la política RLS "Super Admin can insert businesses" de forma nativa.
  const { error } = await supabase.from('businesses').insert([newBusiness])

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'El slug que intentas usar ya está registrado. Por favor, modifícalo.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/adminbarberia')
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

  // ── [SEC M-8] Guard de rol — sin bypass de email ─────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'super_admin') {
    return { success: false, error: 'Acceso denegado. Se requieren privilegios de super_admin.' }
  }

  const { error } = await supabase
    .from('businesses')
    .update({ is_active: !currentStatus })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/adminbarberia')
  return { success: true }
}
