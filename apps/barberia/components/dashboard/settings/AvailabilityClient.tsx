'use client'

import { useState, useTransition } from 'react'
import { updateAvailability } from '@/actions/availability'
import type { OperatingHours, DayHours } from '@xinuco/types'
import { Loader2, Plus, Minus, Save, Clock, Armchair } from 'lucide-react'

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
] as const

const DEFAULT_DAY: DayHours = { is_open: true, open_time: '09:00', close_time: '19:00' }
const DEFAULT_HOURS: OperatingHours = {
  monday: { ...DEFAULT_DAY },
  tuesday: { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday: { ...DEFAULT_DAY },
  friday: { ...DEFAULT_DAY },
  saturday: { ...DEFAULT_DAY, close_time: '14:00' },
  sunday: { ...DEFAULT_DAY, is_open: false }
}

interface AvailabilityClientProps {
  businessId: string
  initialOperatingHours: OperatingHours | null | undefined
  initialWorkstationsCount: number | null | undefined
}

export function AvailabilityClient({ businessId, initialOperatingHours, initialWorkstationsCount }: AvailabilityClientProps) {
  const [hours, setHours] = useState<OperatingHours>(initialOperatingHours || DEFAULT_HOURS)
  const [workstations, setWorkstations] = useState<number>(initialWorkstationsCount || 1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDayChange = (dayKey: keyof OperatingHours, field: keyof DayHours, value: any) => {
    setHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value
      }
    }))
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateAvailability(businessId, {
        operating_hours: hours,
        workstations_count: workstations
      })

      if (result.error) {
        setError(result.error)
      } else {
        alert('Disponibilidad actualizada exitosamente.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-8 pb-32">
      
      {/* Sección 1: Horarios de Operación */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-2">
          <Clock size={20} style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-xl font-bold text-xinuco-text">Horarios de Atención</h2>
        </div>
        
        <div className="card p-0 overflow-hidden divide-y divide-xinuco-border" style={{ borderColor: 'var(--surface-color, #333)' }}>
          {DAYS_OF_WEEK.map((day) => {
            const dayData = hours[day.key]
            return (
              <div key={day.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 transition-colors hover:bg-white/[0.01]">
                <div className="flex items-center gap-4 min-w-[120px]">
                  {/* iOS Style Toggle */}
                  <button
                    type="button"
                    onClick={() => handleDayChange(day.key, 'is_open', !dayData.is_open)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                    style={{ backgroundColor: dayData.is_open ? 'var(--primary-color)' : 'var(--surface-color, #333)' }}
                  >
                    <span 
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        dayData.is_open ? 'translate-x-6' : 'translate-x-1'
                      }`} 
                    />
                  </button>
                  <span className={`font-medium ${dayData.is_open ? 'text-xinuco-text' : 'text-xinuco-muted'}`}>
                    {day.label}
                  </span>
                </div>

                <div className={`flex items-center gap-3 transition-all duration-300 ${dayData.is_open ? 'opacity-100 translate-y-0 h-10' : 'opacity-0 -translate-y-2 h-0 overflow-hidden sm:h-10 sm:overflow-visible sm:opacity-0 pointer-events-none'}`}>
                  <input
                    type="time"
                    value={dayData.open_time}
                    onChange={(e) => handleDayChange(day.key, 'open_time', e.target.value)}
                    className="input-base !w-auto !py-2 text-center font-mono cursor-pointer bg-transparent"
                    disabled={!dayData.is_open}
                  />
                  <span className="text-xinuco-muted text-sm px-1">a</span>
                  <input
                    type="time"
                    value={dayData.close_time}
                    onChange={(e) => handleDayChange(day.key, 'close_time', e.target.value)}
                    className="input-base !w-auto !py-2 text-center font-mono cursor-pointer bg-transparent"
                    disabled={!dayData.is_open}
                  />
                </div>
                
                {!dayData.is_open && (
                  <span className="hidden sm:block text-sm text-xinuco-muted italic mr-4">
                    Cerrado
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Sección 2: Capacidad Física (Workstations) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-2">
          <Armchair size={20} style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-xl font-bold text-xinuco-text">Capacidad Física</h2>
        </div>

        <div className="card p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="flex flex-col gap-2 flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-xinuco-text">Sillas o Estaciones de Trabajo</h3>
            <p className="text-sm text-xinuco-muted leading-relaxed">
              Limitará la cantidad de citas simultáneas que se pueden agendar, independientemente de la cantidad de personal que tengas disponible.
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 bg-xinuco-bg p-2 rounded-2xl border border-xinuco-border shrink-0" style={{ borderColor: 'var(--surface-color, #333)' }}>
            <button
              onClick={() => setWorkstations(Math.max(1, workstations - 1))}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xinuco-text hover:bg-white/5 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              disabled={workstations <= 1}
            >
              <Minus size={24} />
            </button>
            
            <div className="w-16 text-center">
              <span className="text-4xl font-bold font-mono text-xinuco-text">{workstations}</span>
            </div>

            <button
              onClick={() => setWorkstations(workstations + 1)}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xinuco-text hover:bg-white/5 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              disabled={workstations >= 50}
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Error Global */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      {/* Footer Flotante para Guardar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-xinuco-bg via-xinuco-bg/90 to-transparent z-40 pointer-events-none">
        <div className="max-w-3xl mx-auto flex justify-end pointer-events-auto pb-4 md:pb-8 pr-4 md:pr-0">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary flex items-center gap-2 shadow-xl shadow-black/20 px-8 py-4 text-base rounded-full"
          >
            {isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            <span>{isPending ? 'Guardando...' : 'Guardar Disponibilidad'}</span>
          </button>
        </div>
      </div>
      
    </div>
  )
}
