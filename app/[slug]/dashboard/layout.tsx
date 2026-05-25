import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { FeaturesProvider } from '@/lib/features/context'
import { RoleProvider } from '@/lib/features/role-context'
import type { Business, BusinessFeatures, UserRole, Profile } from '@/types/database'

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

  // Fetch para el Header, Sidebar y FeaturesProvider
  const [{ data: profile }, { data: business }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single<Pick<Profile, 'full_name' | 'role'>>(),
    supabase
      .from('businesses')
      .select('id, name, branding, features_enabled')
      .eq('slug', slug)
      .single<Pick<Business, 'id' | 'name' | 'branding' | 'features_enabled'>>(),
  ])

  // Leer features_enabled del JSONB — cast estricto sin "as any"
  const features = (business?.features_enabled ?? {}) as unknown as BusinessFeatures

  return (
    <RoleProvider role={(profile?.role ?? 'barber') as UserRole}>
      <FeaturesProvider features={features}>
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
      </FeaturesProvider>
    </RoleProvider>
  )
}
