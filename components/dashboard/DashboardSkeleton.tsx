import {
  NextAppointmentSkeleton,
  AgendaItemSkeleton,
  Skeleton,
} from '@/components/ui/Skeleton'

/**
 * DashboardSkeleton — Fallback de Suspense para el Dashboard.
 * Replica exactamente la estructura visual de DashboardContent.
 */
export function DashboardSkeleton() {
  return (
    <>
      {/* Saludo skeleton */}
      <section aria-hidden>
        <Skeleton className="h-3 w-24 mb-2" rounded="sm" />
        <Skeleton className="h-8 w-48" />
      </section>

      {/* Widget 1 — Próxima cita */}
      <section aria-hidden>
        <NextAppointmentSkeleton />
      </section>

      {/* Widget 2 — Agenda */}
      <section aria-hidden>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <ul className="flex flex-col gap-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="mb-2">
              <AgendaItemSkeleton />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
