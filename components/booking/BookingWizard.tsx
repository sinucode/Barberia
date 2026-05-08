'use client'

import { useReducer, useTransition, useState } from 'react'
import { Check, ChevronRight, AlertCircle, Loader2, Calendar } from 'lucide-react'
import type { Service, Staff } from '@/types/database'
// Aquí importaríamos el Server Action cuando exista
// import { createAppointment } from '@/actions/appointments'

// ── Tipos y Estado del Wizard ──────────────────────────────────────────────
export type BookingStep = 1 | 2 | 3 | 4

interface BookingState {
  currentStep: BookingStep
  serviceId: string | null
  staffId: string | null // 'any' significa cualquiera
  date: string | null
  time: string | null
  userData: { name: string; phone: string } | null
}

type BookingAction =
  | { type: 'SET_SERVICE'; payload: string }
  | { type: 'SET_STAFF'; payload: string }
  | { type: 'SET_TIME'; payload: { date: string; time: string } }
  | { type: 'SET_USER'; payload: { name: string; phone: string } }
  | { type: 'GOTO_STEP'; payload: BookingStep }
  | { type: 'RESET_FROM_COLLISION' }

const initialState: BookingState = {
  currentStep: 1,
  serviceId: null,
  staffId: null,
  date: null,
  time: null,
  userData: null,
}

function wizardReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_SERVICE':
      return { ...state, serviceId: action.payload, currentStep: 2 }
    case 'SET_STAFF':
      return { ...state, staffId: action.payload, currentStep: 3 }
    case 'SET_TIME':
      return { ...state, date: action.payload.date, time: action.payload.time, currentStep: 4 }
    case 'SET_USER':
      return { ...state, userData: action.payload }
    case 'GOTO_STEP':
      return { ...state, currentStep: action.payload }
    case 'RESET_FROM_COLLISION':
      // Mantiene los datos pero regresa al paso de fecha/hora para elegir otra
      return { ...state, date: null, time: null, currentStep: 3 }
    default:
      return state
  }
}

// ── Props del Componente ────────────────────────────────────────────────────
interface BookingWizardProps {
  businessId: string
  services: Service[]
  staff: Staff[]
}

// ── Componente Principal ────────────────────────────────────────────────────
export function BookingWizard({ businessId, services, staff }: BookingWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Handlers
  const handleConfirm = () => {
    if (!state.serviceId || !state.date || !state.time || !state.userData) return
    
    setError(null)
    
    // UI Optimista con prevención de colisiones
    startTransition(async () => {
      try {
        // Simulamos la llamada al Server Action
        // const res = await createAppointment({ ... })
        // if (res.error) throw new Error(res.error)
        
        // Simular colisión para demostración si se llama "error" en nombre
        if (state.userData?.name.toLowerCase() === 'error') {
          throw new Error('collision')
        }

        alert('¡Cita Confirmada con éxito!')
        
      } catch (err: any) {
        if (err.message === 'collision') {
          setError('Este horario acaba de ser ocupado. Por favor, elige otro.')
          dispatch({ type: 'RESET_FROM_COLLISION' })
        } else {
          setError('Ocurrió un error al agendar tu cita.')
        }
      }
    })
  }

  // Helper para renderizar los encabezados colapsables del acordeón
  const renderStepHeader = (step: BookingStep, title: string, summary?: string) => {
    const isCompleted = state.currentStep > step
    const isActive = state.currentStep === step
    
    return (
      <div 
        className={`flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer border
          ${isActive ? 'bg-xinuco-surface/40 border-xinuco-primary' : 'bg-transparent border-transparent'}`}
        onClick={() => isCompleted && dispatch({ type: 'GOTO_STEP', payload: step })}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
            ${isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-[var(--primary-color)] text-white' : 'bg-xinuco-surface text-xinuco-muted'}`}
          >
            {isCompleted ? <Check size={14} /> : step}
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${isActive ? 'text-xinuco-text' : 'text-xinuco-muted'}`}>
              {title}
            </span>
            {isCompleted && summary && (
              <span className="text-xs text-[var(--primary-color)]">{summary}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
      {/* Mensaje de Error (Colisiones) */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2 animate-slide-up">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Paso 1: Servicios */}
      <div className="flex flex-col gap-2">
        {renderStepHeader(1, 'Selecciona un Servicio', 
          state.serviceId ? services.find(s => s.id === state.serviceId)?.name : undefined
        )}
        
        {state.currentStep === 1 && (
          <div className="grid gap-3 p-2 animate-fade-in">
            {services.map(svc => (
              <button
                key={svc.id}
                onClick={() => dispatch({ type: 'SET_SERVICE', payload: svc.id })}
                className="flex justify-between items-center p-4 rounded-xl bg-xinuco-surface border border-xinuco-border hover:border-[var(--primary-color)] transition-all text-left"
              >
                <div>
                  <h4 className="text-sm font-semibold text-xinuco-text">{svc.name}</h4>
                  <p className="text-xs text-xinuco-muted mt-1">{svc.duration_minutes} min</p>
                </div>
                <span className="font-medium text-xinuco-text">
                  $ {svc.price.toLocaleString('es-CO')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Paso 2: Profesional */}
      <div className="flex flex-col gap-2">
        {renderStepHeader(2, '¿Con quién te atiendes?',
          state.staffId === 'any' ? 'Cualquier profesional' : staff.find(s => s.id === state.staffId)?.name
        )}

        {state.currentStep === 2 && (
          <div className="grid grid-cols-2 gap-3 p-2 animate-fade-in">
            <button
              onClick={() => dispatch({ type: 'SET_STAFF', payload: 'any' })}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-xinuco-surface border border-xinuco-border hover:border-[var(--primary-color)] transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-xinuco-border flex items-center justify-center">✨</div>
              <span className="text-sm font-medium text-xinuco-text">Cualquiera</span>
            </button>
            
            {staff.map(st => (
              <button
                key={st.id}
                onClick={() => dispatch({ type: 'SET_STAFF', payload: st.id })}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-xinuco-surface border border-xinuco-border hover:border-[var(--primary-color)] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--primary-color)_20%,transparent)] text-[var(--primary-color)] flex items-center justify-center font-bold">
                  {st.name[0]}
                </div>
                <span className="text-sm font-medium text-xinuco-text">{st.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Paso 3: Fecha y Hora */}
      <div className="flex flex-col gap-2">
        {renderStepHeader(3, 'Fecha y Hora',
          state.date && state.time ? `${state.date} a las ${state.time}` : undefined
        )}

        {state.currentStep === 3 && (
          <div className="p-4 bg-xinuco-surface border border-xinuco-border rounded-xl animate-fade-in flex flex-col items-center gap-4">
            <Calendar className="text-xinuco-muted" size={32} />
            <p className="text-sm text-xinuco-text text-center">Aquí va el selector horizontal de fechas y horas.</p>
            {/* Simulación rápida */}
            <button
              onClick={() => dispatch({ type: 'SET_TIME', payload: { date: 'Hoy', time: '15:00' } })}
              className="px-6 py-2 rounded-full bg-[var(--primary-color)] text-white text-sm font-semibold"
            >
              Elegir Hoy a las 15:00
            </button>
          </div>
        )}
      </div>

      {/* Paso 4: Tus Datos */}
      <div className="flex flex-col gap-2">
        {renderStepHeader(4, 'Tus Datos')}

        {state.currentStep === 4 && (
          <div className="p-4 bg-xinuco-surface border border-xinuco-border rounded-xl animate-fade-in flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Nombre Completo" 
              className="input-base"
              onChange={(e) => dispatch({ type: 'SET_USER', payload: { ...state.userData, name: e.target.value } as any })}
            />
            <input 
              type="tel" 
              placeholder="Teléfono (WhatsApp)" 
              className="input-base"
              onChange={(e) => dispatch({ type: 'SET_USER', payload: { ...state.userData, phone: e.target.value } as any })}
            />

            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="mt-4 w-full py-4 rounded-xl bg-[var(--primary-color)] text-white font-bold text-lg flex justify-center items-center gap-2 shadow-[0_0_20px_color-mix(in_srgb,var(--primary-color)_30%,transparent)] transition-transform active:scale-[0.98]"
            >
              {isPending ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar Cita'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
