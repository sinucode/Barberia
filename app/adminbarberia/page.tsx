import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getBusinesses } from '@/actions/businesses'
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Centro de Control — Xinuco Admin',
  description: 'Panel de Super Administrador de Xinuco SaaS',
}

export default async function AdminPage() {
  // Fetch inicial en el servidor para delegar los datos al cliente
  const businesses = await getBusinesses()

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto py-8 px-4 md:px-8">
      
      {/* Layout Global: Header Premium Minimalist */}
      <header className="flex flex-col gap-2 pb-6 border-b border-xinuco-border" style={{ borderColor: 'var(--border-color, #333)' }}>
        <div className="flex items-center justify-between">
          <h1 
            className="text-4xl font-serif tracking-tight text-xinuco-text" 
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Centro de Control Xinuco
          </h1>
          
          <UserDropdown initials="SA" userName="Super Admin" />
        </div>
        <p className="text-sm text-xinuco-muted">
          Gestión maestra de inquilinos y administración de módulos (Feature Flags).
        </p>
      </header>

      {/* Contenido Principal con Suspense e Inyección de Datos */}
      <main>
        <Suspense 
          fallback={
            <div className="flex flex-col items-center justify-center py-32 text-xinuco-muted gap-4">
              <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium">Cargando inquilinos...</span>
            </div>
          }
        >
          <AdminDashboardClient initialBusinesses={businesses} />
        </Suspense>
      </main>

    </div>
  )
}
