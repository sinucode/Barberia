import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import type { Business } from '@/types/database'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Seguridad: Obtener usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // Fetch para el Header y Sidebar (perfil y negocio)
  const [{ data: profile }, { data: business }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('businesses')
      .select('name, branding')
      .eq('slug', slug)
      .single<Pick<Business, 'name' | 'branding'>>(),
  ])

  return (
    <DashboardSidebar slug={slug} business={business}>
      <div className="flex flex-col min-h-screen">
        {/* Header en desktop y mobile */}
        {business && (
          <Header
            business={business}
            userName={profile?.full_name ?? undefined}
          />
        )}
        
        {/* Área de contenido principal */}
        <div className="flex-1 w-full pb-safe-bottom">
          {children}
        </div>

        {/* Bottom Nav solo para mobile */}
        <div className="md:hidden">
          <BottomNav slug={slug} />
        </div>
      </div>
    </DashboardSidebar>
  )
}
