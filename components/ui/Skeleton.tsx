interface SkeletonProps {
  className?: string
  rounded?:   'sm' | 'md' | 'lg' | 'full'
}

const roundedMap = {
  sm:   'rounded',
  md:   'rounded-xl',
  lg:   'rounded-2xl',
  full: 'rounded-full',
}

/**
 * Skeleton — componente de carga que respeta el branding del tenant.
 * Usa la clase `.shimmer` definida en globals.css para el efecto de barrido.
 */
export function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`shimmer ${roundedMap[rounded]} ${className}`}
      style={{ minHeight: '1rem' }}
    />
  )
}

/** Skeleton de una card de stat */
export function StatCardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="w-9 h-9 mb-3" rounded="lg" />
      <Skeleton className="h-7 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/** Skeleton de un item de cita */
export function AppointmentItemSkeleton() {
  return (
    <div className="card flex items-center gap-3">
      <Skeleton className="w-12 h-12 shrink-0" rounded="lg" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-16 h-6" rounded="full" />
    </div>
  )
}
