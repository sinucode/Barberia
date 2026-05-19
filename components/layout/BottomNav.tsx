'use client'

import Link        from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  CalendarDays,
  Scissors,
  BarChart2,
  Settings,
} from 'lucide-react'

interface NavItem {
  id:    string
  href:  string
  icon:  React.ElementType
  label: string
}

interface BottomNavProps {
  slug: string
}

/**
 * BottomNav — Navegación "One-Hand" optimizada para móvil.
 *
 * Los ítems son alcanzables con el pulgar en pantallas de hasta 6.7".
 * Detecta la ruta activa con usePathname y aplica el color del tenant.
 */
export function BottomNav({ slug }: BottomNavProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { id: 'nav-appointments', href: `/${slug}/dashboard/appointments`, icon: CalendarDays,    label: 'Agenda' },
    { id: 'nav-services',     href: `/${slug}/dashboard/services`,     icon: Scissors,        label: 'Servicios' },
    { id: 'nav-staff',        href: `/${slug}/dashboard/staff`,        icon: Users,           label: 'Staff' },
    { id: 'nav-reports',      href: `/${slug}/dashboard/reports`,      icon: BarChart2,       label: 'Reportes' },
    { id: 'nav-settings',     href: `/${slug}/dashboard/settings`,     icon: Settings,        label: 'Ajustes' },
  ]

  return (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-50 pb-safe"
    >
      {/* Blur overlay */}
      <div className="glass border-t border-xinuco-border">
        <ul className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto">
          {navItems.map(({ id, href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)

            return (
              <li key={id} className="flex-1">
                <Link
                  id={id}
                  href={href}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all duration-200 group',
                    isActive ? 'text-xinuco-primary' : 'text-xinuco-muted hover:text-xinuco-text',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
                      isActive
                        ? 'glow-primary'
                        : 'group-hover:bg-xinuco-surface',
                    ].join(' ')}
                    style={
                      isActive
                        ? { background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }
                        : undefined
                    }
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                  </span>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
