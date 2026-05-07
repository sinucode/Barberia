'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

export async function getBusinesses() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    
  if (error) throw error
  return data
}

export async function createBusiness(businessData: any) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('businesses')
    .insert([businessData])
    .select()
    
  if (error) throw error
  return data
}
