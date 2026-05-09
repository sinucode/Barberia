'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { StaffRole } from '@/types/database'

export async function getStaff(businessId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createStaffMember(businessId: string, data: { full_name: string, role: string }) {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('staff')
    .insert({
      business_id: businessId,
      name: data.full_name,
      role: data.role as StaffRole,
      is_active: true
    } as any)
    .select()

  if (error) return { error: error.message }
  
  revalidatePath('/[slug]/dashboard/staff', 'page')
  return { success: true, data: result }
}

export async function toggleStaffStatus(staffId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', staffId)

  if (error) return { error: error.message }
  
  revalidatePath('/[slug]/dashboard/staff', 'page')
  return { success: true }
}
