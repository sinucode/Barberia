'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'

/**
 * loginWithPassword — Server Action para el login del Admin Global (/admin/login).
 *
 * Solo acepta super_admin. Redirige a /admin tras autenticación exitosa.
 * Para logins de tenants de barbería, ver apps/barberia/actions/auth.ts.
 */
export async function loginWithPassword(formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Por favor ingresa tu correo y contraseña.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[AUTH ERROR] signInWithPassword (admin global):', error.message)
    return { error: 'Credenciales incorrectas o usuario no encontrado.' }
  }

  const role = data.user?.app_metadata?.role

  if (role !== 'super_admin') {
    await supabase.auth.signOut()
    return { error: 'No estás autorizado para acceder al panel global.' }
  }

  redirect('/admin')
}

/**
 * logout — Cierra la sesión y redirige al login del admin global.
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
