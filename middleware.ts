import { type NextRequest } from 'next/server'
import { updateSession }    from '@/lib/supabase/middleware'

/**
 * middleware — Refreshes the Supabase session on every request.
 * Also exported as 'proxy' for Next.js 16+ compatibility.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Next.js 16+ alias
export { middleware as proxy }

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
