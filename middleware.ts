import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Lista estándar de User-Agents de Bots y Redes Sociales
const BOT_AGENTS_REGEX = /googlebot|twitterbot|facebookexternalhit|baiduspider|bingbot|embedly|linkedinbot|quora link preview|whatsapp/i

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Dividir la ruta para aislar el [slug]
  const pathParts = pathname.split('/').filter(Boolean)

  // Ejecutar solo si estamos exactamente en la raíz del tenant: /[slug]
  // Se excluyen rutas de assets, apis, admin global y dashboards locales
  if (pathParts.length === 1 && 
      !pathname.startsWith('/_next') && 
      !pathname.startsWith('/api') && 
      !pathname.startsWith('/adminbarberia') &&
      !pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|json)$/)) {
    
    const slug = pathParts[0]
    const userAgent = request.headers.get('user-agent') || ''

    // 🛡️ FOSO DE SEGURIDAD: Verificar si es Bot/Crawler
    if (BOT_AGENTS_REGEX.test(userAgent)) {
      // Retornar HTML estático ligero para SEO sin tocar la base de datos
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Xinuco Platform - ${slug}</title>
          <meta name="description" content="Agenda tu cita en la plataforma premium de estética Xinuco.">
          <meta name="robots" content="index, follow">
        </head>
        <body style="background:#080808; color:#fff; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
          <div style="text-align:center;">
            <h1>Xinuco Platform</h1>
            <p>Redirigiendo a la vitrina de reservas...</p>
          </div>
        </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        }
      )
    }

    // ⚡ CERO FRICCIÓN: Redirección inmediata a la ruta de agendamiento para humanos
    const bookUrl = new URL(`/${slug}/book`, request.url)
    return NextResponse.redirect(bookUrl)
  }

  // ── Importante: Preservar la protección global existente para el resto de rutas ──
  // Llamamos a updateSession para mantener la sesión de Supabase viva
  return await updateSession(request)
}

// Next.js 16+ alias (Opcional pero recomendado en el proyecto actual)
export { middleware as proxy }

// Configurar el matcher para optimizar la ejecución del middleware
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
