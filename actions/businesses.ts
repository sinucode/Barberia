'use server'

import { createClient }      from '@/lib/supabase/server'
import { Database }          from '@/types/database.types'
import type { BusinessInsert } from '@/types/database'

export async function getBusinessBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, is_active, branding, created_at')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data
}

export async function getBusinesses() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('*')

  if (error) throw error
  return data
}

export async function createBusiness(businessData: BusinessInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .insert([businessData])
    .select()

  if (error) throw error
  return data
}
