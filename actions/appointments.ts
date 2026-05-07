'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

export async function getAppointments() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    
  if (error) throw error
  return data
}

export async function createAppointment(appointmentData: any) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
    
  if (error) throw error
  return data
}

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .select()
    
  if (error) throw error
  return data
}
