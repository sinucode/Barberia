// app/book/result/page.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Página de resultado post-pago MercadoPago (back_url redirect).
//
// MP redirige aquí con ?status=success|failure|pending&ref=booking_{id}
// Esta página verifica el estado real en la DB (no confía solo en el param)
// y muestra la pantalla correcta.
// ══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@xinuco/supabase/server'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react'

interface BookResultPageProps {
  searchParams: Promise<{ status?: string; ref?: string }>
}

export default async function BookResultPage({ searchParams }: BookResultPageProps) {
  const { status, ref } = await searchParams
  const appointmentId   = ref?.startsWith('booking_') ? ref.replace('booking_', '') : null

  // Verificar el estado real del appointment en la DB
  let appointmentStatus: string | null = null
  let businessSlug: string | null = null

  if (appointmentId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('appointments')
      .select('status, businesses(slug)')
      .eq('id', appointmentId)
      .single<{ status: string; businesses: { slug: string } | null }>()

    if (data) {
      appointmentStatus = data.status
      businessSlug      = (data.businesses as { slug: string } | null)?.slug ?? null
    }
  }

  // Determinar estado final — la DB manda sobre el query param
  const isConfirmed = appointmentStatus === 'scheduled'
  const isPending   = appointmentStatus === 'payment_pending' || status === 'pending'
  const isFailed    = !isConfirmed && !isPending

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--bg-color, #080808)' }}>
      <div className="w-full max-w-sm text-center space-y-6 animate-fade-in">

        {/* ── Confirmado ─────────────────────────────────────────────────── */}
        {isConfirmed && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg"
              style={{ background: 'var(--primary-color, #C5A059)' }}>
              <CheckCircle size={40} className="text-zinc-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-color, #C5A059)' }}>
                ¡Cita Confirmada!
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Tu pago fue procesado exitosamente.<br />
                Tu cita está agendada y confirmada.
              </p>
            </div>
          </>
        )}

        {/* ── Pendiente ──────────────────────────────────────────────────── */}
        {isPending && !isConfirmed && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto bg-amber-500/10 border border-amber-500/30">
              <Clock size={40} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-300 mb-2">Pago en Proceso</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Tu pago está siendo procesado.<br />
                Recibirás una confirmación cuando se apruebe.
              </p>
            </div>
          </>
        )}

        {/* ── Fallido ────────────────────────────────────────────────────── */}
        {isFailed && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto bg-red-500/10 border border-red-500/30">
              <XCircle size={40} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-300 mb-2">Pago No Procesado</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                El pago no se completó.<br />
                Tu reserva no fue confirmada. Puedes intentarlo de nuevo.
              </p>
            </div>
          </>
        )}

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pt-2">
          {businessSlug && (
            <Link
              href={isFailed ? `/${businessSlug}/book` : `/${businessSlug}`}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary-color, #C5A059)', color: '#080808' }}
            >
              {isFailed ? 'Volver a reservar' : 'Ver barbería'}
            </Link>
          )}
          <Link href="/"
            className="w-full py-2.5 rounded-2xl text-sm font-medium text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors">
            <ArrowLeft size={14} />
            Inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
