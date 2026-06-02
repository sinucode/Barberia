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

/** Skeleton del avatar circular del Header */
export function AvatarSkeleton() {
  return <Skeleton className="w-9 h-9 shrink-0" rounded="full" />
}

/** Skeleton de una stat card (2×2 grid) */
export function StatCardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="w-9 h-9 mb-3" rounded="lg" />
      <Skeleton className="h-7 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/**
 * Skeleton de la tarjeta "Próxima Cita" (el widget grande destacado).
 * Replica la estructura visual de NextAppointmentCard.
 */
export function NextAppointmentSkeleton() {
  return (
    <div className="card border border-xinuco-border">
      {/* Badge superior */}
      <Skeleton className="h-5 w-28 mb-4" rounded="full" />
      {/* Nombre del cliente */}
      <Skeleton className="h-6 w-3/4 mb-2" />
      {/* Servicio */}
      <Skeleton className="h-4 w-1/2 mb-4" />
      {/* Fila hora + duración */}
      <div className="flex items-center gap-3 mb-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Botón */}
      <Skeleton className="h-11 w-full" rounded="lg" />
    </div>
  )
}

/**
 * Skeleton de un ítem de la agenda del día.
 * Replica la estructura de AgendaItem.
 */
export function AgendaItemSkeleton() {
  return (
    <div className="flex items-center gap-3">
      {/* Columna hora */}
      <Skeleton className="h-4 w-12 shrink-0" />
      {/* Card */}
      <div className="card flex-1 flex items-center gap-3 py-3">
        <Skeleton className="w-9 h-9 shrink-0" rounded="lg" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-16 h-5 shrink-0" rounded="full" />
      </div>
    </div>
  )
}

/** Skeleton de un item de cita (genérico) */
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
