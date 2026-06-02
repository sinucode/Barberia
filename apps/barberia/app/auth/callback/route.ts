import { NextResponse } from 'next/server'
import { createClient } from '@xinuco/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Extraemos el slug-actual que pasamos como parámetro en la redirección inicial
  const requestSlug = searchParams.get('slug')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // 1. Leemos el slug inyectado en el JWT (Zero-DB, sin round-trip a BD)
      const userSlug = data.user.app_metadata?.slug as string | undefined

      if (userSlug) {
        // El usuario ya tiene un tenant asignado en app_metadata, redirigimos a su dashboard
        return NextResponse.redirect(`${origin}/${userSlug}/dashboard`)
      }

      // 2. Si NO lo tiene (primer login social o cuenta legada),
      // realizamos consulta a 'profiles' con join a 'businesses'.
      // SENTINEL PATCH 3: Envolvemos TODA la lógica de BD en try/catch para
      // evitar sesiones huérfanas ante cualquier fallo de base de datos.
      try {
        const { data: profileRaw } = await supabase
          .from('profiles')
          .select(`
            business_id,
            businesses!inner (
              slug
            )
          `)
          .eq('id', data.user.id)
          .single()

        const profileData = profileRaw as { business_id: string, businesses: { slug: string } | { slug: string }[] } | null

        if (profileData?.business_id && profileData.businesses) {
          const businessInfo = Array.isArray(profileData.businesses)
            ? profileData.businesses[0]
            : profileData.businesses

          const fetchedSlug = businessInfo?.slug

          if (fetchedSlug) {
            // 3. RPC seguro — escribe en app_metadata mediante el trigger de Postgres (The Vault)
            await supabase.rpc('secure_set_user_context', {
              business_slug: fetchedSlug
            })
            // Refrescar sesión para que el JWT local incluya los nuevos app_metadata
            await supabase.auth.refreshSession()

            return NextResponse.redirect(`${origin}/${fetchedSlug}/dashboard`)
          }
        }

        // 4. Bloqueo: perfil no encontrado → destruimos la sesión (usuario desconocido)
        await supabase.auth.signOut()
        if (requestSlug) {
          return NextResponse.redirect(`${origin}/${requestSlug}/login?error=unauthorized`)
        }
        return NextResponse.redirect(`${origin}/?error=unauthorized`)

      } catch (err) {
        // 5. SENTINEL PATCH 3 — Fallo de BD no manejado:
        //    Destruimos la sesión para impedir tokens huérfanos y redirigimos a error.
        console.error('[AUTH CALLBACK] Unhandled DB error — signing out to prevent orphan session:', err)
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/?error=server_error`)
      }
    }
  }

  // 5. Seguridad: Fallo en el código OAuth o sin código
  if (requestSlug) {
    return NextResponse.redirect(`${origin}/${requestSlug}/login?error=auth_failed`)
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
