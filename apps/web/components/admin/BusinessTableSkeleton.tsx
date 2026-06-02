import { Skeleton } from '@/components/ui/Skeleton'

/**
 * BusinessTableSkeleton — Fallback de Suspense para la tabla de negocios.
 * Replica exactamente la estructura de BusinessTable.
 */
export function BusinessTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-xinuco-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-xinuco-border bg-xinuco-surface/60">
            {['Negocio', 'Slug / URL', 'Branding', 'Estado', 'Acciones'].map((h) => (
              <th key={h} className="px-5 py-3.5 text-left">
                <span className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider">
                  {h}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-xinuco-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="bg-xinuco-bg">
              {/* Nombre */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-7 h-7 shrink-0" rounded="md" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </td>
              {/* Slug */}
              <td className="px-5 py-4">
                <Skeleton className="h-4 w-24" />
              </td>
              {/* Branding */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5" rounded="sm" />
                  <Skeleton className="w-5 h-5" rounded="sm" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </td>
              {/* Estado */}
              <td className="px-5 py-4">
                <Skeleton className="h-7 w-20" rounded="lg" />
              </td>
              {/* Acciones */}
              <td className="px-5 py-4 text-right">
                <Skeleton className="h-7 w-16 ml-auto" rounded="lg" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
