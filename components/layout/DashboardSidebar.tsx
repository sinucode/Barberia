'use client'

import { useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Scissors, BarChart2, Settings, ChevronRight, Users, Store, Percent } from 'lucide-react'
import type { Business } from '@/types/database'
import { useDateTime } from '@/lib/hooks/useDateTime'

export const SidebarContext = createContext<{ isCollapsed: boolean; setIsCollapsed: (val: boolean) => void }>({
  isCollapsed: false,
  setIsCollapsed: () => {}
})

export function DashboardSidebar({ 
  slug, 
  business,
  children 
}: { 
  slug: string
  business?: Pick<Business, 'name' | 'branding'> | null
  children: React.ReactNode 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const dateTime = useDateTime()

  const links = [
    { href: `/${slug}/dashboard/appointments`, icon: CalendarDays, label: 'Agenda' },
    { href: `/${slug}/dashboard/services`,     icon: Scissors,     label: 'Servicios' },
    { href: `/${slug}/dashboard/staff`,        icon: Users,        label: 'Staff' },
    { href: `/${slug}/dashboard/commissions`,  icon: Percent,      label: 'Comisiones' },
    { href: `/${slug}/dashboard/reports`,      icon: BarChart2,    label: 'Reportes' },
    { href: `/${slug}/dashboard/settings`,     icon: Settings,     label: 'Configuración' },
  ]

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="flex min-h-screen bg-xinuco-bg">
      {/* Sidebar Desktop */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 hidden md:flex flex-col transition-all duration-300 ease-in-out border-r border-zinc-850
          ${isCollapsed ? 'w-16' : 'w-64'}`}
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
      >
        <div 
          className={`relative flex transition-all duration-300 border-b overflow-hidden
            ${isCollapsed ? 'h-[72px] items-center justify-center' : 'flex-col items-center justify-center py-10 px-4 gap-4'}`} 
          style={{ borderColor: 'var(--border-color)' }}
        >
          {/* Botón Collapse (Esquina superior derecha cuando está expandido) */}
          {!isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(true)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors"
              aria-label="Contraer menú"
            >
              <ChevronRight size={18} className="rotate-180 transition-transform duration-300" />
            </button>
          )}

          {isCollapsed ? (
            <button 
              onClick={() => setIsCollapsed(false)} 
              className="w-11 h-11 rounded-xl flex items-center justify-center border transition-all animate-fade-in shadow-sm hover:scale-105"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary-color) 25%, transparent)' 
              }}
              title="Expandir menú"
            >
              <Store size={20} style={{ color: 'var(--primary-color)' }} />
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-fade-in text-center mt-2 w-full">
              {/* Contenedor de Marca Premium */}
              <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border shadow-sm" 
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary-color) 25%, transparent)' 
                }}
              >
                <Store size={26} style={{ color: 'var(--primary-color)' }} />
              </div>
              
              <div className="flex flex-col items-center">
                <span 
                  className="font-serif font-bold text-base text-xinuco-text tracking-wide whitespace-nowrap"
                >
                  {business?.name || 'XINUCO'}
                </span>
                
                {/* Reloj en Tiempo Real Independiente */}
                <div className="h-4 flex items-center justify-center mt-1.5">
                  {dateTime ? (
                    <span className="text-xs text-xinuco-muted uppercase tracking-[0.15em] font-medium whitespace-nowrap">
                      {dateTime.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')} • {dateTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                  ) : (
                    <div className="w-32 h-3 rounded bg-xinuco-surface animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )}
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
    </SidebarContext.Provider>
  )
}
