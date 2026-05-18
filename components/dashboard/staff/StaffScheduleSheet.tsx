'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { X, Loader2, Save, CalendarDays } from 'lucide-react'
import { getStaffSchedules, saveStaffSchedulesBatch } from '@/actions/staff'
import type { StaffSchedule } from '@/types/database'

// 0 = Domingo, 1 = Lunes ... 6 = Sábado
const DAYS_ORDER = [
  { index: 1, name: 'Lunes' },
  { index: 2, name: 'Martes' },
  { index: 3, name: 'Miércoles' },
  { index: 4, name: 'Jueves' },
  { index: 5, name: 'Viernes' },
  { index: 6, name: 'Sábado' },
  { index: 0, name: 'Domingo' },
]

interface DayState {
  day_of_week: number
  isWorking: boolean
  start_time: string
  end_time: string
  existingId?: string
}

interface StaffScheduleSheetProps {
  businessId: string
  staffId: string
  staffName: string
  onClose: () => void
}

export function StaffScheduleSheet({
  businessId,
  staffId,
  staffName,
  onClose,
}: StaffScheduleSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  
  const [daysState, setDaysState] = useState<Record<number, DayState>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Bloquear scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Cargar horarios actuales
  useEffect(() => {
    async function loadSchedules() {
      try {
        const schedules = await getStaffSchedules(staffId)
        
        // Inicializar el estado de los 7 días
        const newState: Record<number, DayState> = {}
        
        DAYS_ORDER.forEach(day => {
          const existing = schedules.find(s => s.day_of_week === day.index)
          if (existing) {
            // Eliminar los segundos ':00' si los hay para los inputs de tipo time (HH:MM)
            const st = existing.start_time.substring(0, 5)
            const et = existing.end_time.substring(0, 5)
            
            newState[day.index] = {
              day_of_week: day.index,
              isWorking: true,
              start_time: st,
              end_time: et,
              existingId: existing.id
            }
          } else {
            newState[day.index] = {
              day_of_week: day.index,
              isWorking: false,
              start_time: '09:00',
              end_time: '18:00',
              existingId: undefined
            }
          }
        })
        
        setDaysState(newState)
      } catch (err: any) {
        setError('No se pudieron cargar los horarios. Intenta de nuevo.')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSchedules()
  }, [staffId])

  const handleToggleDay = (dayIndex: number) => {
    setDaysState(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        isWorking: !prev[dayIndex].isWorking
      }
    }))
  }

  const handleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setDaysState(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [field]: value
      }
    }))
  }

  const handleSave = () => {
    setError(null)
    
    startTransition(async () => {
      try {
        // 1. Filtrar y mapear ÚNICAMENTE los días que están activos
        const activeSchedules = Object.values(daysState)
          .filter(day => day.isWorking)
          .map(day => ({
            day_of_week: day.day_of_week,
            start_time: day.start_time,
            end_time: day.end_time
          }))
        
        // 2. Enviar el arreglo completo en un solo viaje (Bulk Insert)
        const result = await saveStaffSchedulesBatch(businessId, staffId, activeSchedules)
        
        if (result.error) {
          setError(result.error)
          return
        }
        
        // Éxito, cerrar panel
        onClose()
      } catch (err: any) {
        setError(err?.message || 'Ocurrió un error inesperado al guardar.')
      }
    })
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div 
        className="h-full overflow-y-auto animate-slide-in-right w-[95vw] sm:w-[450px] flex flex-col"
        style={{ 
          background: 'var(--bg-color)', 
          borderLeft: '1px solid var(--border-color)' 
        }}
      >
        {/* Header fijo */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-xinuco-text flex items-center gap-2">
              <CalendarDays size={18} style={{ color: 'var(--primary-color)' }} />
              Horario de {staffName}
            </h2>
            <p className="text-xs text-xinuco-muted">
              Define los días y horas laborales de esta persona.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg text-xinuco-muted hover:text-xinuco-text hover:bg-white/[0.05] transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido (Lista de 7 días) */}
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-xinuco-muted gap-3">
              <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium">Cargando horario...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.02))' }}>
              {DAYS_ORDER.map((day, idx) => {
                const state = daysState[day.index]
                if (!state) return null
                
                const isLast = idx === DAYS_ORDER.length - 1

                return (
                  <div 
                    key={day.index} 
                    className="flex flex-col p-4 transition-colors"
                    style={{ 
                      borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                      background: state.isWorking ? 'transparent' : 'rgba(0,0,0,0.2)' 
                    }}
                  >
                    {/* Fila del día + Toggle */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${state.isWorking ? 'text-xinuco-text' : 'text-xinuco-muted'}`}>
                        {day.name}
                      </span>
                      
                      <button
                        type="button"
                        role="switch"
                        aria-checked={state.isWorking}
                        onClick={() => handleToggleDay(day.index)}
                        disabled={isSaving}
                        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                        style={{
                          backgroundColor: state.isWorking ? 'var(--primary-color)' : 'var(--border-color)',
                        }}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            state.isWorking ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Fila de horas (Condicional) */}
                    {state.isWorking && (
                      <div className="grid grid-cols-2 gap-4 mt-4 animate-fade-in">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-semibold text-xinuco-muted uppercase tracking-wider">
                            Entrada
                          </label>
                          <input 
                            type="time" 
                            value={state.start_time}
                            onChange={(e) => handleTimeChange(day.index, 'start_time', e.target.value)}
                            disabled={isSaving}
                            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all bg-xinuco-bg text-xinuco-text border focus:ring-2 disabled:opacity-50"
                            style={{ 
                              borderColor: 'var(--border-color)',
                              '--tw-ring-color': 'color-mix(in srgb, var(--primary-color) 25%, transparent)' 
                            } as React.CSSProperties}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-semibold text-xinuco-muted uppercase tracking-wider">
                            Salida
                          </label>
                          <input 
                            type="time" 
                            value={state.end_time}
                            onChange={(e) => handleTimeChange(day.index, 'end_time', e.target.value)}
                            disabled={isSaving}
                            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all bg-xinuco-bg text-xinuco-text border focus:ring-2 disabled:opacity-50"
                            style={{ 
                              borderColor: 'var(--border-color)',
                              '--tw-ring-color': 'color-mix(in srgb, var(--primary-color) 25%, transparent)' 
                            } as React.CSSProperties}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          
          {error && (
            <p className="mt-4 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Footer con el botón de guardar */}
        <div className="p-6 sticky bottom-0" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="w-full btn-primary !py-3.5 flex items-center justify-center gap-2 text-base font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={18} />
                Guardar Horario
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
