'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Workstation } from '@/types/database'

// ── Tipo del resultado de las operaciones ────────────────────────────────────
interface ActionResult {
  success?: boolean
  error?:   string
  data?:    Workstation | Workstation[]
}

/**
 * getWorkstations — Obtiene todas las estaciones de trabajo de un negocio.
 * Incluye activas e inactivas (el componente decide qué mostrar).
 * Cliente autenticado → RLS filtra por business_id automáticamente.
 */
export async function getWorkstations(businessId: string): Promise<Workstation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workstations')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Workstation[]
}

/**
 * createWorkstation — Crea una nueva estación de trabajo para un negocio.
 * Cliente autenticado → RLS valida que el usuario pertenezca al business_id.
 */
export async function createWorkstation(
  businessId: string,
  data: { name: string }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('workstations')
    .insert({
      business_id: businessId,
      name:        data.name.trim(),
      is_active:   true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una estación con ese nombre en este negocio.' }
    }
    return { error: error.message }
  }

  revalidatePath('/[slug]/dashboard/workstations', 'page')
  return { success: true, data: result as Workstation }
}

/**
 * updateWorkstation — Actualiza el nombre de una estación de trabajo.
 * El .eq('id') garantiza mutación atómica (sin fugas cross-tenant).
 */
export async function updateWorkstation(
  workstationId: string,
  data: { name: string }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('workstations')
    .update({ name: data.name.trim() })
    .eq('id', workstationId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/workstations', 'page')
  return { success: true }
}

/**
 * toggleWorkstationStatus — Activa o desactiva una estación (soft delete).
 * El .eq('id') es obligatorio para evitar mutación masiva.
 */
export async function toggleWorkstationStatus(
  workstationId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('workstations')
    .update({ is_active: isActive })
    .eq('id', workstationId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/workstations', 'page')
  return { success: true }
}
