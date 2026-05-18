import { LucideIcon } from 'lucide-react'

interface AdminEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export function AdminEmptyState({ icon: Icon, title, description, actionLabel, onAction }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 space-y-6 text-center animate-fade-in border rounded-2xl" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
      {/* Icono en círculo opaco */}
      <div 
        className="w-20 h-20 rounded-full flex items-center justify-center border shadow-sm"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--primary-color) 20%, transparent)' 
        }}
      >
        <Icon size={32} style={{ color: 'var(--primary-color)' }} strokeWidth={1.5} />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-bold text-xinuco-text">{title}</h2>
        <p className="text-sm text-xinuco-muted leading-relaxed">
          {description}
        </p>
      </div>

      <button
        onClick={onAction}
        className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
        style={{ backgroundColor: 'var(--primary-color)' }}
      >
        {actionLabel}
      </button>
    </div>
  )
}
