import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Extraemos el slug-actual que pasamos como parámetro en la redirección inicial
  const requestSlug = searchParams.get('slug')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // 1. Leemos el slug inyectado en el JWT (Zero-DB)
      const userSlug = data.user.app_metadata?.slug as string | undefined

      if (userSlug) {
        // El usuario ya tiene un tenant asignado en el JWT, redirigimos a su dashboard
        return NextResponse.redirect(`${origin}/${userSlug}/dashboard`)
      }

      // 2. Si NO lo tiene (es su primer login social o cuenta antigua),
      // realizamos consulta estricta a 'profiles' con join a 'businesses'
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

      const profileData = profileRaw as { business_id: string, businesses: { slug: string } | { slug: string }[] } | null;

      if (profileData?.business_id && profileData.businesses) {
        // Extraemos el slug del inner join, que puede venir como objeto o array dependiendo del tipado
        const businessInfo = Array.isArray(profileData.businesses) 
          ? profileData.businesses[0] 
          : profileData.businesses;
          
        const fetchedSlug = businessInfo?.slug;

        if (fetchedSlug) {
          // 3. Ejecutamos el RPC seguro para grabar la identidad del inquilino en el app_metadata
          await supabase.rpc('secure_set_user_context', {
            business_slug: fetchedSlug
          })
          await supabase.auth.refreshSession()

          // Redirección final al dashboard
          return NextResponse.redirect(`${origin}/${fetchedSlug}/dashboard`)
        }
      }

      // 4. Bloqueo de Seguridad: El perfil NO existe (es un desconocido).
      // Destruimos la sesión inmediatamente para evitar cualquier acceso o token huérfano.
      await supabase.auth.signOut()

      if (requestSlug) {
        return NextResponse.redirect(`${origin}/${requestSlug}/login?error=unauthorized`)
      }
      return NextResponse.redirect(`${origin}/?error=unauthorized`)
    }
  }

  // 5. Seguridad: Fallo en el código OAuth o sin código
  if (requestSlug) {
    return NextResponse.redirect(`${origin}/${requestSlug}/login?error=auth_failed`)
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
