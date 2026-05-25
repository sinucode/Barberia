import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/**
 * super-admin/layout.tsx — Server Component layout for the super admin section.
 * Auth guard: checks profile.role === 'super_admin', redirects to '/' if not.
 */
export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/adminbarberia/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') redirect('/adminbarberia/login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080808', color: '#F4F4F4' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: '#0D0D0D', borderColor: 'rgba(197,160,89,0.15)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Gold accent */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: 'color-mix(in srgb, #C5A059 15%, transparent)',
                border:     '1px solid color-mix(in srgb, #C5A059 30%, transparent)',
                color:      '#C5A059',
              }}
            >
              X
            </div>
            <span className="font-semibold tracking-wide text-sm" style={{ color: '#F4F4F4' }}>
              Xinuco{' '}
              <span style={{ color: '#C5A059' }}>Super Admin</span>
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              href="/super-admin/businesses"
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: 'rgba(244,244,244,0.65)' }}
            >
              Negocios
            </Link>
          </nav>

          <span className="text-xs" style={{ color: 'rgba(244,244,244,0.35)' }}>
            {profile.full_name}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
