'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database'

type StaffInsert = Database['public']['Tables']['staff']['Insert']
type StaffUpdate = Database['public']['Tables']['staff']['Update']

export async function getStaff() {
  const supabase = await createClient()

  // Zero-DB Magic: El RLS limita los resultados únicamente al business_id del JWT.
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function createStaffMember(staffData: Omit<StaffInsert, 'business_id'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Extraemos el business_id del app_metadata (inyectado por triggers o de forma segura)
  const businessId = user?.app_metadata?.business_id

  if (!businessId) {
    throw new Error('Unauthorized: business_id no encontrado en app_metadata')
  }

  const { data, error } = await supabase
    .from('staff')
    .insert([{ ...staffData, business_id: businessId }])
    .select()

  if (error) throw error

  revalidatePath('/', 'layout')
  return data
}

export async function updateStaff(id: string, updateData: StaffUpdate) {
  const supabase = await createClient()

  // Zero-DB Magic: RLS garantiza que solo puedas actualizar tu propio staff.
  const { data, error } = await supabase
    .from('staff')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) throw error

  revalidatePath('/', 'layout')
  return data
}

export async function deleteStaff(id: string) {
  const supabase = await createClient()

  // Zero-DB Magic: RLS garantiza que no puedas borrar staff de otros tenants.
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/', 'layout')
  return { success: true }
}
