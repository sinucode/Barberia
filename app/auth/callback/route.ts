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
      // Leemos el slug inyectado en el JWT (Zero-DB)
      const userSlug = data.user.user_metadata?.slug as string | undefined

      if (userSlug) {
        // El usuario tiene un tenant asignado, redirigimos a su dashboard
        return NextResponse.redirect(`${origin}/${userSlug}/dashboard`)
      }

      // Si no tiene slug (usuario nuevo de Google o no asignado a ningún tenant)
      if (requestSlug) {
        return NextResponse.redirect(`${origin}/${requestSlug}/login?error=unauthorized`)
      }
      
      // Fallback si por alguna razón no se pasó el slug inicial
      return NextResponse.redirect(`${origin}/?error=unauthorized`)
    }
  }

  // En caso de error al intercambiar el código o sin código
  if (requestSlug) {
    return NextResponse.redirect(`${origin}/${requestSlug}/login?error=unauthorized`)
  }

  return NextResponse.redirect(`${origin}/?error=unauthorized`)
}
