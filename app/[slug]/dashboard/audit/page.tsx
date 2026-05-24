import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { getAuditLogs } from '@/actions/audit'
import { AuditLogViewer } from '@/components/dashboard/audit/AuditLogViewer'

interface AuditPageProps {
  params: Promise<{ slug: string }>
}

export default async function AuditPage({ params }: AuditPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/login`)

  // ── Verificar rol: solo admin puede acceder a auditoría ─────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect(`/${slug}/dashboard`)
  }

  const businessId = profile.business_id

  // ── Cargar primera página de logs ───────────────────────────────────────────
  const initialLogs = await getAuditLogs(businessId, { limit: 100 })

  return (
    <div className="bg-xinuco-bg min-h-screen">
      <main className="px-4 py-6 pb-24 space-y-6 max-w-5xl mx-auto">
        {/* Encabezado */}
        <section aria-label="Encabezado de Auditoría" className="flex items-start gap-3">
          <div
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center mt-0.5"
            style={{
              background:   'rgba(197,160,89,0.10)',
              border:       '1px solid rgba(197,160,89,0.20)',
            }}
          >
            <Shield size={18} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-xinuco-text">
              Auditoría
            </h1>
            <p className="text-sm text-xinuco-muted mt-0.5">
              Registro inmutable de todas las acciones del sistema. Solo visible para administradores.
            </p>
          </div>
        </section>

        {/* Visor de logs */}
        <section aria-label="Registros de auditoría">
          <AuditLogViewer
            initialLogs={initialLogs}
            businessId={businessId}
          />
        </section>
      </main>
    </div>
  )
}
