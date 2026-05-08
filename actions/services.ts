'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database'

type ServiceInsert = Database['public']['Tables']['services']['Insert']
type ServiceUpdate = Database['public']['Tables']['services']['Update']

export async function getServices() {
  const supabase = await createClient()

  // Zero-DB Magic: El RLS filtra automáticamente por el business_id inyectado en el JWT.
  // No necesitamos pasar explícitamente el business_id en la consulta.
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function createService(serviceData: Omit<ServiceInsert, 'business_id'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Extraemos el business_id del app_metadata de forma segura en el servidor
  const businessId = user?.app_metadata?.business_id

  if (!businessId) {
    throw new Error('Unauthorized: business_id no encontrado en app_metadata')
  }

  const { data, error } = await supabase
    .from('services')
    .insert([{ ...serviceData, business_id: businessId }])
    .select()

  if (error) throw error

  // Revalidamos la caché para refrescar las vistas de la app
  revalidatePath('/', 'layout')
  return data
}

export async function updateService(id: string, updateData: ServiceUpdate) {
  const supabase = await createClient()

  // Zero-DB Magic: Solo pedimos hacer UPDATE. El RLS rechaza si no pertenece al negocio.
  const { data, error } = await supabase
    .from('services')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) throw error

  revalidatePath('/', 'layout')
  return data
}

export async function deleteService(id: string) {
  const supabase = await createClient()

  // Zero-DB Magic: Solo pedimos hacer DELETE. El RLS protege contra cruces de inquilinos.
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/', 'layout')
  return { success: true }
}
