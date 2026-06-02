import { ReactNode } from 'react'

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  actionButton?: ReactNode
  hasData?: boolean
}

export function AdminPageHeader({ title, subtitle, actionButton, hasData = true }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex flex-col">
        <h1 className="text-2xl font-serif font-bold text-xinuco-text tracking-wide">{title}</h1>
        {subtitle && (
          <p className="text-sm text-xinuco-muted mt-1" style={{ color: 'var(--primary-color)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {hasData && actionButton && (
        <div className="shrink-0">
          {actionButton}
        </div>
      )}
    </div>
  )
}
