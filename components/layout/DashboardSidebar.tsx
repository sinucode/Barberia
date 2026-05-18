'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Scissors, BarChart2, Settings, ChevronRight, Users } from 'lucide-react'

export function DashboardSidebar({ slug, children }: { slug: string, children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const links = [
    { href: `/${slug}/dashboard/appointments`, icon: CalendarDays, label: 'Agenda' },
    { href: `/${slug}/dashboard/services`,     icon: Scissors,     label: 'Servicios' },
    { href: `/${slug}/dashboard/staff`,        icon: Users,        label: 'Staff' },
    { href: `/${slug}/dashboard/reports`,      icon: BarChart2,    label: 'Reportes' },
    { href: `/${slug}/dashboard/settings`,     icon: Settings,     label: 'Configuración' },
  ]

  return (
    <div className="flex min-h-screen bg-xinuco-bg">
      {/* Sidebar Desktop */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 hidden md:flex flex-col transition-all duration-300 ease-in-out border-r border-zinc-850
          ${isCollapsed ? 'w-16' : 'w-64'}`}
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
      >
        <div className="flex items-center justify-between h-[60px] px-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          {!isCollapsed && <span className="font-bold text-lg text-xinuco-text animate-fade-in tracking-tight">XINUCO</span>}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors ml-auto flex items-center justify-center"
          >
            <ChevronRight size={18} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl transition-all duration-200 group overflow-hidden
                  ${isCollapsed ? 'justify-center py-3' : 'px-3 py-2.5'}
                  ${isActive ? 'bg-xinuco-surface' : 'hover:bg-white/[0.05] text-xinuco-muted hover:text-xinuco-text'}
                `}
                title={isCollapsed ? link.label : undefined}
              >
                <div 
                  className={`flex items-center justify-center relative ${isActive ? 'text-[var(--primary-color)]' : ''}`}
                >
                  {isActive && !isCollapsed && (
                    <div className="absolute -left-3 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                  )}
                  <link.icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                {!isCollapsed && (
                  <span className={`font-medium text-sm whitespace-nowrap transition-colors ${isActive ? 'text-xinuco-text' : ''}`}>
                    {link.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out md:min-h-screen w-full
          ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}
      >
        {children}
      </div>
    </div>
  )
}
