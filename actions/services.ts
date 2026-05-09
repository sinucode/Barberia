'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getServices(businessId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createService(businessId: string, data: { name: string, duration_minutes: number, price: number }) {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('services')
    .insert({
      business_id: businessId,
      name: data.name,
      duration_minutes: data.duration_minutes,
      price: data.price,
      is_active: true
    } as any)
    .select()

  if (error) return { error: error.message }
  
  revalidatePath('/[slug]/dashboard/services', 'page')
  return { success: true, data: result }
}

export async function toggleServiceStatus(serviceId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', serviceId)

  if (error) return { error: error.message }
  
  revalidatePath('/[slug]/dashboard/services', 'page')
  return { success: true }
}
