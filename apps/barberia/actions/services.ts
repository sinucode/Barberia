'use server'

import { createClient } from '@xinuco/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Service } from '@xinuco/types'

// ── Tipo del resultado de las operaciones ────────────────────────────────────
interface ActionResult {
  success?: boolean
  error?:   string
  data?:    Service | Service[]
}

/**
 * getServices — Obtiene los servicios de un negocio específico.
 * Usa el cliente autenticado → RLS filtra por business_id automáticamente.
 */
export async function getServices(businessId: string): Promise<Service[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Service[]
}

/**
 * createService — Crea un nuevo servicio para un negocio.
 * Cliente autenticado → RLS valida que el usuario pertenezca al business_id.
 */
export async function createService(
  businessId: string,
  data: {
    name: string
    description?: string
    duration_minutes: number
    price_cop: number
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('services')
    .insert({
      business_id:      businessId,
      name:             data.name,
      description:      data.description ?? null,
      duration_minutes: data.duration_minutes,
      price_cop:        data.price_cop,
      is_active:        true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe un servicio con ese nombre en este negocio.' }
    }
    return { error: error.message }
  }

  revalidatePath('/[slug]/dashboard/services', 'page')
  return { success: true, data: result as Service }
}

/**
 * updateService — Actualiza los datos de un servicio existente.
 * El .eq('id') garantiza mutación atómica (sin fugas cross-tenant).
 */
export async function updateService(
  serviceId: string,
  data: {
    name?: string
    description?: string
    duration_minutes?: number
    price_cop?: number
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('services')
    .update(data)
    .eq('id', serviceId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/services', 'page')
  return { success: true }
}

/**
 * toggleServiceStatus — Activa o desactiva un servicio.
 * El .eq('id') es obligatorio para evitar mutación masiva.
 */
export async function toggleServiceStatus(
  serviceId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', serviceId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/services', 'page')
  return { success: true }
}
