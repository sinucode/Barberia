import { createClient } from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import { AdminSidebar }  from '@/components/admin/AdminSidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

/**
 * AdminLayout — Layout global del panel de administración SaaS.
 *
 * Sidebar lateral fijo + área de contenido.
 * Protección básica: verifica sesión activa.
 * TODO: verificar rol 'super-admin' cuando implementemos RBAC.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient()

  // Guard de sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="flex min-h-screen bg-xinuco-bg">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between
                           px-8 py-4 border-b border-xinuco-border bg-xinuco-bg/90 backdrop-blur-md">
          <div>
            <h1 className="text-sm font-semibold text-xinuco-text">Panel de Administración</h1>
            <p className="text-xs text-xinuco-muted">Gestión global de Xinuco SaaS</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Indicador de entorno */}
            <span className="badge text-amber-400 bg-amber-500/10 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft" />
              Desarrollo
            </span>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
