'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'

/**
 * login — Server Action para inicio de sesión.
 *
 * Tras autenticarse, recupera el negocio del perfil y redirige al
 * dashboard del tenant: /{slug}/dashboard
 */
export async function login(formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Obtener el slug del negocio del perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', data.user.id)
    .single()

  if (!profile?.business_id) {
    return { error: 'No tienes un negocio asignado. Contacta al administrador.' }
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('slug')
    .eq('id', profile.business_id)
    .single()

  if (!business?.slug) {
    return { error: 'No se encontró el negocio. Contacta al administrador.' }
  }

  redirect(`/${business.slug}/dashboard`)
}

/**
 * logout — Cierra la sesión y redirige al home.
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
