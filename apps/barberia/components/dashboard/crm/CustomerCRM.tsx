'use client'

import {
  useState,
  useTransition,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import {
  ArrowLeft,
  Search,
  Plus,
  X,
  Loader2,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react'
import {
  searchCustomers,
  getCustomerExpediente,
  addCustomerNote,
  updateCustomerTags,
  updateCustomerPreferences,
} from '@/actions/crm'
import type {
  CustomerSearchResult,
  CustomerExpediente,
  CustomerNoteWithAuthor,
} from '@/actions/crm'
import { formatCOP } from '@xinuco/utils'
import { AdminPageHeader } from '@xinuco/ui'

// ── Etiquetas predefinidas ────────────────────────────────────────────────────

const PREDEFINED_TAGS = [
  'VIP',
  'Frecuente',
  'Alérgico',
  'Primera Visita',
  'Referido',
  'Cabello Fino',
  'Barba',
]

// ── Colores de etiquetas ──────────────────────────────────────────────────────

function getTagStyle(tag: string): string {
  switch (tag) {
    case 'VIP':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/25'
    case 'Frecuente':
      return 'text-sky-400 bg-sky-400/10 border-sky-400/25'
    case 'Alérgico':
      return 'text-red-400 bg-red-400/10 border-red-400/25'
    default:
      return 'text-xinuco-muted bg-white/[0.04] border-white/10'
  }
}

// ── Iniciales para avatar ─────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// ── Formato de fecha corta ────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ── Badge de estado de cita ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed:    { label: 'Completada',  className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    cancelled:    { label: 'Cancelada',   className: 'text-red-400 bg-red-400/10 border-red-400/20' },
    no_show:      { label: 'No asistió',  className: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    in_progress:  { label: 'En proceso',  className: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
    ready_to_pay: { label: 'Por cobrar',  className: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
    scheduled:    { label: 'Agendada',    className: 'text-xinuco-muted bg-white/[0.04] border-white/10' },
  }
  const { label, className } = config[status] ?? { label: status, className: 'text-xinuco-muted bg-white/[0.04] border-white/10' }

  return (
    <span className={`inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Props del componente principal
// ════════════════════════════════════════════════════════════════════════════

interface CustomerCRMProps {
  initialCustomers: CustomerSearchResult[]
  businessId:       string
  staffId:          string   // auth user.id — autor de las notas
  slug:             string
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — CustomerCRM
// ════════════════════════════════════════════════════════════════════════════

export function CustomerCRM({
  initialCustomers,
  businessId,
  staffId,
}: CustomerCRMProps) {
  const [view, setView] = useState<'list' | 'expediente'>('list')
  const [customers, setCustomers] = useState<CustomerSearchResult[]>(initialCustomers)
  const [query, setQuery] = useState('')
  const [isSearching, startSearch] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expediente, setExpediente] = useState<CustomerExpediente | null>(null)
  const [isLoadingExp, startLoadExp] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Búsqueda con debounce 300ms ───────────────────────────────────────────

  function handleSearchChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const results = await searchCustomers(businessId, value)
        setCustomers(results)
      })
    }, 300)
  }

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Abrir expediente ──────────────────────────────────────────────────────

  const openExpediente = useCallback((customerId: string) => {
    setSelectedId(customerId)
    startLoadExp(async () => {
      const data = await getCustomerExpediente(businessId, customerId)
      setExpediente(data)
      setView('expediente')
    })
  }, [businessId])

  // ── Volver a la lista ─────────────────────────────────────────────────────

  function goBack() {
    setView('list')
    setSelectedId(null)
    setExpediente(null)
  }

  // ── Actualizar expediente localmente tras mutación ────────────────────────

  const refreshExpediente = useCallback(() => {
    if (!selectedId) return
    startLoadExp(async () => {
      const data = await getCustomerExpediente(businessId, selectedId)
      setExpediente(data)
    })
  }, [businessId, selectedId])

  // ── Render ────────────────────────────────────────────────────────────────

  if (view === 'expediente' && selectedId) {
    return (
      <ExpedienteView
        expediente={expediente}
        isLoading={isLoadingExp}
        businessId={businessId}
        staffId={staffId}
        onBack={goBack}
        onRefresh={refreshExpediente}
      />
    )
  }

  return (
    <>
      <AdminPageHeader
        title="Clientes"
        subtitle="Busca clientes por nombre o teléfono, accede a su expediente y gestiona notas y etiquetas."
        hasData={true}
      />

      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-xinuco-muted pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="input-base w-full pl-11 pr-4"
          aria-label="Buscar cliente"
        />
        {isSearching && (
          <Loader2
            size={14}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xinuco-muted animate-spin"
          />
        )}
      </div>

      {/* Lista de clientes */}
      <section aria-label="Resultados de búsqueda" className="flex flex-col gap-2">
        {customers.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center rounded-xl"
            style={{ border: '1px dashed var(--border-color)' }}
          >
            <User size={32} className="text-xinuco-muted mb-3 opacity-40" />
            <p className="text-sm text-xinuco-muted">
              {query.trim() ? 'No se encontraron clientes.' : 'No hay clientes aún.'}
            </p>
          </div>
        ) : (
          customers.map(c => (
            <CustomerCard
              key={c.id}
              customer={c}
              onSelect={() => openExpediente(c.id)}
            />
          ))
        )}
      </section>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TARJETA DE CLIENTE — Vista de lista
// ════════════════════════════════════════════════════════════════════════════

function CustomerCard({
  customer,
  onSelect,
}: {
  customer: CustomerSearchResult
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-white/[0.04] active:scale-[0.99]"
      style={{ border: '1px solid var(--border-color)' }}
    >
      {/* Avatar con iniciales */}
      <div
        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: 'rgba(197,160,89,0.18)', color: 'var(--primary-color)' }}
        aria-hidden="true"
      >
        {getInitials(customer.full_name)}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-sm text-xinuco-text truncate">
            {customer.full_name}
          </span>
          {/* Tags */}
          {customer.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className={`inline-flex text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${getTagStyle(tag)}`}
            >
              {tag}
            </span>
          ))}
          {customer.tags.length > 3 && (
            <span className="text-[10px] text-xinuco-muted">
              +{customer.tags.length - 3}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-xinuco-muted tabular-nums">
            {customer.phone}
          </span>
          {customer.last_visit && (
            <>
              <span className="text-xinuco-muted/40">·</span>
              <span className="text-xs text-xinuco-muted">
                Última visita: {fmtDate(customer.last_visit)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Estadística derecha */}
      <div className="text-right flex-shrink-0">
        <div
          className="text-sm font-bold tabular-nums"
          style={{ color: 'var(--primary-color)' }}
        >
          {customer.total_visits}
        </div>
        <div className="text-[10px] text-xinuco-muted uppercase tracking-wide">
          {customer.total_visits === 1 ? 'visita' : 'visitas'}
        </div>
      </div>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// EXPEDIENTE DEL CLIENTE — Vista de detalle
// ════════════════════════════════════════════════════════════════════════════

function ExpedienteView({
  expediente,
  isLoading,
  businessId,
  staffId,
  onBack,
  onRefresh,
}: {
  expediente: CustomerExpediente | null
  isLoading:  boolean
  businessId: string
  staffId:    string
  onBack:     () => void
  onRefresh:  () => void
}) {
  if (isLoading && !expediente) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        <div className="h-24 w-full rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        <div className="h-32 w-full rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
        <div className="h-48 w-full rounded-xl" style={{ background: 'var(--surface-color, #1a1a1a)' }} />
      </div>
    )
  }

  if (!expediente) {
    return (
      <div className="text-center py-16">
        <p className="text-xinuco-muted text-sm">No se encontró el expediente.</p>
        <button type="button" onClick={onBack} className="mt-4 btn-ghost text-sm">
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Botón volver */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-xinuco-muted hover:text-xinuco-text transition-colors self-start"
      >
        <ArrowLeft size={16} />
        Clientes
      </button>

      {/* Header del cliente */}
      <CustomerHeader
        expediente={expediente}
        businessId={businessId}
        onRefresh={onRefresh}
      />

      {/* Fila de estadísticas */}
      <StatsRow expediente={expediente} />

      {/* Selector de barbero preferido */}
      <PreferredBarberSelector
        expediente={expediente}
        businessId={businessId}
        onRefresh={onRefresh}
      />

      {/* Notas del equipo */}
      <TeamNotes
        expediente={expediente}
        businessId={businessId}
        staffId={staffId}
        onRefresh={onRefresh}
      />

      {/* Historial de visitas */}
      <VisitHistory expediente={expediente} />
    </div>
  )
}

// ── Header del cliente ────────────────────────────────────────────────────────

function CustomerHeader({
  expediente,
  businessId,
  onRefresh,
}: {
  expediente: CustomerExpediente
  businessId: string
  onRefresh:  () => void
}) {
  const { customer } = expediente
  const [tags, setTags] = useState<string[]>(expediente.tags)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isSavingTags, startSaveTags] = useTransition()
  const customInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar si el expediente se refresca externamente
  useEffect(() => {
    setTags(expediente.tags)
  }, [expediente.tags])

  function handleAddTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) {
      setShowTagInput(false)
      setNewTag('')
      return
    }
    const newTags = [...tags, trimmed]
    setTags(newTags)
    startSaveTags(async () => {
      await updateCustomerTags(businessId, customer.id, newTags)
      onRefresh()
    })
    setShowTagInput(false)
    setNewTag('')
  }

  function handleRemoveTag(tag: string) {
    const newTags = tags.filter(t => t !== tag)
    setTags(newTags)
    startSaveTags(async () => {
      await updateCustomerTags(businessId, customer.id, newTags)
      onRefresh()
    })
  }

  useEffect(() => {
    if (showTagInput && newTag === '__custom') customInputRef.current?.focus()
  }, [showTagInput, newTag])

  return (
    <div
      className="p-5 rounded-2xl flex flex-col gap-4"
      style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.02))' }}
    >
      {/* Avatar + datos básicos */}
      <div className="flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl font-bold"
          style={{ backgroundColor: 'rgba(197,160,89,0.2)', color: 'var(--primary-color)' }}
        >
          {getInitials(customer.full_name)}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-xinuco-text leading-tight">
            {customer.full_name}
          </h2>
          <div className="flex flex-col gap-1 mt-1.5">
            {customer.phone && (
              <span className="flex items-center gap-2 text-xs text-xinuco-muted">
                <Phone size={12} className="text-xinuco-muted/60" />
                {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-2 text-xs text-xinuco-muted">
                <Mail size={12} className="text-xinuco-muted/60" />
                {customer.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Etiquetas editables */}
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map(tag => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${getTagStyle(tag)}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              disabled={isSavingTags}
              className="hover:opacity-70 transition-opacity"
              aria-label={`Eliminar etiqueta ${tag}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Añadir tag */}
        {showTagInput ? (
          <div className="flex items-center gap-1.5">
            <select
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              className="h-7 text-xs rounded-lg border px-2 bg-transparent text-xinuco-text outline-none"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <option value="">Elegir…</option>
              {PREDEFINED_TAGS.filter(t => !tags.includes(t)).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="__custom">Personalizada…</option>
            </select>
            {newTag === '__custom' && (
              <input
                ref={customInputRef}
                type="text"
                placeholder="Nueva etiqueta"
                className="h-7 text-xs rounded-lg border px-2 bg-transparent text-xinuco-text outline-none w-28"
                style={{ borderColor: 'var(--border-color)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddTag((e.target as HTMLInputElement).value)
                  if (e.key === 'Escape') { setShowTagInput(false); setNewTag('') }
                }}
              />
            )}
            <button
              type="button"
              onClick={() => handleAddTag(
                newTag === '__custom'
                  ? (customInputRef.current?.value ?? '')
                  : newTag
              )}
              disabled={!newTag || (newTag === '__custom' && !customInputRef.current?.value)}
              className="h-7 px-2.5 text-xs rounded-lg font-medium transition-colors disabled:opacity-40"
              style={{ background: 'var(--primary-color)', color: '#080808' }}
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => { setShowTagInput(false); setNewTag('') }}
              className="h-7 px-2 text-xs rounded-lg text-xinuco-muted hover:text-xinuco-text transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowTagInput(true)}
            disabled={isSavingTags}
            className="inline-flex items-center gap-1 text-xs text-xinuco-muted hover:text-xinuco-text border border-dashed rounded-full px-2.5 py-1 transition-colors disabled:opacity-40"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {isSavingTags ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Plus size={10} />
            )}
            Etiqueta
          </button>
        )}
      </div>
    </div>
  )
}

// ── Fila de estadísticas ──────────────────────────────────────────────────────

function StatsRow({ expediente }: { expediente: CustomerExpediente }) {
  const stats = [
    { label: 'Total visitas',  value: String(expediente.total_visits) },
    { label: 'Última visita',  value: fmtDate(expediente.last_visit) },
    { label: 'Gasto total',    value: formatCOP(expediente.total_spent) },
  ]

  return (
    <div
      className="grid grid-cols-3 divide-x rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-color)', borderColor: 'var(--border-color)' }}
    >
      {stats.map(s => (
        <div key={s.label} className="flex flex-col items-center py-4 px-2 gap-1">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: 'var(--primary-color)' }}
          >
            {s.value}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-xinuco-muted">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Selector de barbero preferido ─────────────────────────────────────────────

function PreferredBarberSelector({
  expediente,
  businessId,
  onRefresh,
}: {
  expediente: CustomerExpediente
  businessId: string
  onRefresh:  () => void
}) {
  const [value, setValue] = useState(expediente.customer.preferred_staff_id ?? '')
  const [isSaving, startSave] = useTransition()

  useEffect(() => {
    setValue(expediente.customer.preferred_staff_id ?? '')
  }, [expediente.customer.preferred_staff_id])

  function handleChange(staffId: string) {
    setValue(staffId)
    startSave(async () => {
      await updateCustomerPreferences(businessId, expediente.customer.id, {
        preferred_staff_id: staffId || null,
      })
      onRefresh()
    })
  }

  return (
    <div
      className="p-4 rounded-xl flex items-center gap-4"
      style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.02))' }}
    >
      <div className="flex-1">
        <label
          htmlFor="preferred-barber"
          className="text-xs font-semibold text-xinuco-muted uppercase tracking-wider"
        >
          Barbero preferido
        </label>
        <select
          id="preferred-barber"
          value={value}
          onChange={e => handleChange(e.target.value)}
          disabled={isSaving}
          className="mt-1.5 input-base w-full disabled:opacity-60"
        >
          <option value="">Sin preferencia</option>
          {expediente.staff_list.map(s => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      {isSaving && <Loader2 size={16} className="animate-spin text-xinuco-muted flex-shrink-0" />}
    </div>
  )
}

// ── Notas del equipo ──────────────────────────────────────────────────────────

function TeamNotes({
  expediente,
  businessId,
  staffId,
  onRefresh,
}: {
  expediente: CustomerExpediente
  businessId: string
  staffId:    string
  onRefresh:  () => void
}) {
  const [notes, setNotes] = useState<CustomerNoteWithAuthor[]>(expediente.notes)
  const [content, setContent] = useState('')
  const [isAdding, startAdd] = useTransition()
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    setNotes(expediente.notes)
  }, [expediente.notes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    startAdd(async () => {
      const result = await addCustomerNote(
        businessId,
        expediente.customer.id,
        staffId,
        content
      )
      if (result.error) {
        setAddError(result.error)
        return
      }
      if (result.note) {
        setNotes(prev => [result.note as CustomerNoteWithAuthor, ...prev])
      }
      setContent('')
      onRefresh()
    })
  }

  return (
    <section
      className="p-5 rounded-2xl flex flex-col gap-4"
      style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color, rgba(255,255,255,0.02))' }}
    >
      <h3 className="text-sm font-semibold text-xinuco-text">Notas del Equipo</h3>

      {/* Timeline de notas */}
      <div className="flex flex-col gap-0">
        {notes.length === 0 ? (
          <p className="text-xs text-xinuco-muted py-3 text-center">
            Sin notas aún. Agrega la primera nota después de la visita.
          </p>
        ) : (
          notes.map((note, idx) => (
            <div key={note.id} className="flex gap-3">
              {/* Línea vertical del timeline */}
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                />
                {idx < notes.length - 1 && (
                  <div
                    className="w-px flex-1 mt-1 min-h-[1rem]"
                    style={{ background: 'var(--border-color)' }}
                  />
                )}
              </div>

              {/* Contenido de la nota */}
              <div className="pb-4 flex-1 min-w-0">
                <p className="text-sm text-xinuco-text leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-xinuco-muted">
                    {note.staff_name ?? 'Equipo'}
                  </span>
                  <span className="text-xinuco-muted/30">·</span>
                  <span className="text-[10px] text-xinuco-muted tabular-nums">
                    {fmtDate(note.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulario de nueva nota */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
        style={{ borderTop: notes.length > 0 ? '1px solid var(--border-color)' : undefined, paddingTop: notes.length > 0 ? '1rem' : undefined }}
      >
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Agregar nota técnica (textura del cabello, alergias, preferencias de corte…)"
          rows={3}
          disabled={isAdding}
          className="input-base resize-none text-sm disabled:opacity-60"
        />
        {addError && (
          <p
            role="alert"
            className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 animate-fade-in"
          >
            {addError}
          </p>
        )}
        <button
          type="submit"
          disabled={isAdding || !content.trim()}
          className="self-end flex items-center gap-2 btn-primary !py-2 !px-4 text-sm disabled:opacity-40"
        >
          {isAdding ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Agregar nota
        </button>
      </form>
    </section>
  )
}

// ── Historial de visitas ──────────────────────────────────────────────────────

function VisitHistory({ expediente }: { expediente: CustomerExpediente }) {
  const [expanded, setExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const visitsToShow = showAll
    ? expediente.visits
    : expediente.visits.slice(0, 10)

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-color)' }}
    >
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        style={{ background: 'var(--surface-color, rgba(255,255,255,0.02))' }}
      >
        <span className="text-sm font-semibold text-xinuco-text">
          Historial de Visitas
          {expediente.visits.length > 0 && (
            <span className="ml-2 text-xs text-xinuco-muted font-normal">
              ({expediente.visits.length})
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp size={16} className="text-xinuco-muted" />
        ) : (
          <ChevronDown size={16} className="text-xinuco-muted" />
        )}
      </button>

      {/* Lista de visitas */}
      {expanded && (
        <div className="flex flex-col">
          {expediente.visits.length === 0 ? (
            <p className="text-xs text-xinuco-muted px-5 py-6 text-center">
              Sin visitas registradas.
            </p>
          ) : (
            <>
              {visitsToShow.map((v, idx) => (
                <div
                  key={v.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  style={{
                    borderTop: idx === 0 ? '1px solid var(--border-color)' : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Dot de color */}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        v.status === 'completed'
                          ? '#34d399'
                          : v.status === 'cancelled'
                          ? '#f87171'
                          : 'rgba(255,255,255,0.2)',
                    }}
                  />

                  {/* Servicio + barbero */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-xinuco-text font-medium">
                        {v.service_name}
                      </span>
                      <StatusBadge status={v.status} />
                    </div>
                    {v.staff_name && (
                      <span className="text-xs text-xinuco-muted">
                        {v.staff_name}
                      </span>
                    )}
                  </div>

                  {/* Fecha + monto */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-sm font-bold tabular-nums"
                      style={{ color: v.status === 'completed' ? 'var(--primary-color)' : 'var(--text-muted)' }}
                    >
                      {v.status === 'completed' ? formatCOP(v.total_paid) : '—'}
                    </div>
                    <div className="text-[10px] text-xinuco-muted tabular-nums">
                      {fmtDate(v.created_at)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Ver más */}
              {!showAll && expediente.visits.length > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full text-center text-xs text-xinuco-muted hover:text-xinuco-text py-3 transition-colors"
                  style={{ borderTop: '1px solid var(--border-color)' }}
                >
                  Ver más ({expediente.visits.length - 10} restantes)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
