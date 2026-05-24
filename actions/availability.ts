'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OperatingHours, Json } from '@/types/database'

export async function getAvailability(businessId: string) {
  const supabase = await createClient()

  // Asumiendo que operating_hours y workstations_count están en la tabla businesses
  const { data, error } = await supabase
    .from('businesses')
    .select('operating_hours, workstations_count')
    .eq('id', businessId)
    .single()

  if (error) throw error
  return data
}

export async function updateAvailability(
  businessId: string, 
  data: { operating_hours: OperatingHours, workstations_count: number }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('businesses')
    .update({
      operating_hours:    data.operating_hours as unknown as Json,
      workstations_count: data.workstations_count,
    })
    .eq('id', businessId)

  if (error) return { error: error.message }
  
  revalidatePath('/[slug]/dashboard/settings/availability', 'page')
  return { success: true }
}
