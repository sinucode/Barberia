'use server'

import { createClient }            from '@/lib/supabase/server'
import { redirect }                from 'next/navigation'
import { headers }                 from 'next/headers'
import type { Profile, Business }  from '@/types/database'

/**
 * signUp — Server Action para registro de nuevos usuarios.
 *
 * Inyecta en raw_user_meta_data:
 *  - full_name:   nombre visible del usuario.
 *  - business_id: UUID del negocio al que pertenece.
 *  - slug:        slug del negocio (clave para el aislamiento Zero-DB en el Edge).
 *
 * El campo `slug` es crítico: el middleware lo lee directamente del JWT
 * descifrado para aislar tenants sin consultar la base de datos.
 */
export async function signUp(formData: FormData) {
  const email       = formData.get('email')       as string
  const password    = formData.get('password')    as string
  const fullName    = formData.get('full_name')   as string
  const businessId  = formData.get('business_id') as string
  const slug        = formData.get('slug')        as string

  if (!email || !password || !fullName || !businessId || !slug) {
    return { error: 'Todos los campos son obligatorios.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name:   fullName,   // Nombre mostrado en la UI
        business_id: businessId, // UUID del tenant en la tabla businesses
        slug,                    // ← CLAVE ZERO-DB: inyectado en raw_user_meta_data
                                 //   El middleware lo extrae del JWT sin tocar BD
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Redirige al login del tenant recién registrado
  redirect(`/${slug}/login`)
}

/**
 * login — Server Action para inicio de sesión.
 *
 * Tras autenticarse exitosamente, sincroniza el slug en raw_user_meta_data
 * (por si el usuario fue creado antes de implementar el campo slug).
 * Luego redirige al dashboard del tenant: /{slug}/dashboard.
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

  // ── Slug ya en el JWT ────────────────────────────────────────────────────────
  // Si el JWT ya contiene el slug (usuarios registrados con la nueva acción),
  // lo usamos directamente para evitar la consulta a BD.
  const existingSlug = data.user.app_metadata?.slug as string | undefined

  if (existingSlug) {
    redirect(`/${existingSlug}/dashboard`)
  }

  // ── Retrocompatibilidad: usuarios sin slug en el JWT ─────────────────────────
  // Para cuentas antiguas: consultamos la BD UNA VEZ y luego inyectamos el slug
  // en raw_user_meta_data para que los siguientes logins sean Zero-DB.
  const { data: profileData } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', data.user.id)
    .single()

  const profile = profileData as Pick<Profile, 'business_id'> | null

  if (!profile?.business_id) {
    return { error: 'No tienes un negocio asignado. Contacta al administrador.' }
  }

  const { data: businessData } = await supabase
    .from('businesses')
    .select('slug')
    .eq('id', profile.business_id)
    .single()

  const business = businessData as Pick<Business, 'slug'> | null

  if (!business?.slug) {
    return { error: 'No se encontró el negocio. Contacta al administrador.' }
  }

  // Inyectar slug en el app_metadata mediante RPC seguro para Zero-DB
  await supabase.rpc('secure_set_user_context', {
    business_slug: business.slug
  })
  
  // Refrescar sesión para actualizar el JWT local con los nuevos app_metadata
  await supabase.auth.refreshSession()

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

/**
 * signInWithGoogle — Inicia el flujo de OAuth con Google.
 * 
 * Se pasa el slug de la barbería actual para que la ruta de callback
 * sepa a dónde redirigir en caso de error o si es un usuario nuevo.
 */
export async function signInWithGoogle(slug: string) {
  const supabase = await createClient()
  const headersList = await headers()

  // Determinamos la URL base dinámicamente y de forma segura
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const host     = headersList.get('host')
  const origin   = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // El redirectTo apunta al callback y pasamos el slug como parámetro
  const redirectUrl = `${origin}/auth/callback?slug=${slug}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Redirigimos al usuario a la pantalla de consentimiento de Google
  if (data.url) {
    redirect(data.url)
  }
}
