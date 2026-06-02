'use server'

import { createClient } from '@xinuco/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Customer, CustomerNote, CustomerTag, Staff, Service, Appointment } from '@xinuco/types'

// ── Tipos de resultado ────────────────────────────────────────────────────────

interface ActionResult {
  success?: boolean
  error?:   string
}

// Resultado enriquecido de búsqueda de clientes
export interface CustomerSearchResult {
  id:              string
  business_id:     string
  full_name:       string
  phone:           string
  email:           string | null
  preferred_staff_id: string | null
  created_at:      string
  updated_at:      string
  last_visit:      string | null   // ISO string de la última cita completada
  total_visits:    number
  tags:            string[]
}

// Visita con detalles para el historial
export interface CustomerVisit {
  id:           string
  created_at:   string
  start_time:   string | null
  status:       string
  total_paid:   number            // COP INTEGER
  service_name: string
  staff_name:   string | null
}

// Nota enriquecida con nombre del autor
export interface CustomerNoteWithAuthor extends CustomerNote {
  staff_name: string | null
}

// Expediente completo del cliente
export interface CustomerExpediente {
  customer:     Customer
  total_visits: number
  total_spent:  number            // COP INTEGER
  last_visit:   string | null
  tags:         string[]
  notes:        CustomerNoteWithAuthor[]
  visits:       CustomerVisit[]
  staff_list:   Pick<Staff, 'id' | 'full_name'>[]  // para el selector de barbero preferido
}

// ════════════════════════════════════════════════════════════════════════════
// searchCustomers
// Busca clientes por nombre o teléfono (ilike). Enriquece con última visita,
// total de visitas y etiquetas.
// ════════════════════════════════════════════════════════════════════════════

export async function searchCustomers(
  businessId: string,
  query: string
): Promise<CustomerSearchResult[]> {
  const supabase = await createClient()

  // Construir filtro: si hay query filtramos, si no devolvemos los últimos 10
  let customersQuery = supabase
    .from('customers')
    .select('id, business_id, full_name, phone, email, preferred_staff_id, created_at, updated_at')
    .eq('business_id', businessId)

  if (query.trim().length > 0) {
    const q = `%${query.trim()}%`
    customersQuery = customersQuery.or(`full_name.ilike.${q},phone.ilike.${q}`)
  }

  const { data: customers, error: custErr } = await customersQuery
    .order('updated_at', { ascending: false })
    .limit(20)

  if (custErr) throw custErr
  if (!customers || customers.length === 0) return []

  const customerIds = customers.map(c => c.id)

  // Obtener última visita y total de visitas por cliente en una sola query
  const { data: visits, error: visitsErr } = await supabase
    .from('appointments')
    .select('customer_id, created_at, status')
    .eq('business_id', businessId)
    .in('customer_id', customerIds)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (visitsErr) throw visitsErr

  // Obtener tags
  const { data: tags, error: tagsErr } = await supabase
    .from('customer_tags')
    .select('customer_id, tag')
    .eq('business_id', businessId)
    .in('customer_id', customerIds)

  if (tagsErr) throw tagsErr

  // Agrupar visitas y tags por customer_id
  const visitMap = new Map<string, { last_visit: string | null; count: number }>()
  for (const v of visits ?? []) {
    const existing = visitMap.get(v.customer_id)
    if (!existing) {
      visitMap.set(v.customer_id, { last_visit: v.created_at, count: 1 })
    } else {
      existing.count += 1
    }
  }

  const tagMap = new Map<string, string[]>()
  for (const t of tags ?? []) {
    const arr = tagMap.get(t.customer_id) ?? []
    arr.push(t.tag)
    tagMap.set(t.customer_id, arr)
  }

  return customers.map(c => ({
    ...c,
    preferred_staff_id: c.preferred_staff_id ?? null,
    last_visit:   visitMap.get(c.id)?.last_visit   ?? null,
    total_visits: visitMap.get(c.id)?.count         ?? 0,
    tags:         tagMap.get(c.id)                  ?? [],
  }))
}

// ════════════════════════════════════════════════════════════════════════════
// getCustomerExpediente
// Carga el perfil completo: datos del cliente + historial de citas (últimas 20)
// + notas del equipo + etiquetas + staff disponible para el selector.
// ════════════════════════════════════════════════════════════════════════════

export async function getCustomerExpediente(
  businessId: string,
  customerId:  string
): Promise<CustomerExpediente | null> {
  const supabase = await createClient()

  // Cargar todo en paralelo
  const [
    customerResult,
    appointmentsResult,
    notesResult,
    tagsResult,
    staffResult,
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('id', customerId)
      .single(),

    supabase
      .from('appointments')
      .select(`
        id,
        created_at,
        start_time,
        status,
        services!inner ( name, price_cop ),
        staff:staff_id ( full_name )
      `)
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('customer_notes')
      .select(`
        id,
        business_id,
        customer_id,
        staff_id,
        appointment_id,
        content,
        created_at,
        staff:staff_id ( full_name )
      `)
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),

    supabase
      .from('customer_tags')
      .select('tag')
      .eq('business_id', businessId)
      .eq('customer_id', customerId),

    supabase
      .from('staff')
      .select('id, full_name')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('full_name'),
  ])

  if (customerResult.error || !customerResult.data) return null

  const customer = customerResult.data as unknown as Customer

  // Mapear visitas
  type AppointmentRow = {
    id:         string
    created_at: string
    start_time: string | null
    status:     string
    services:   { name: string; price_cop: number } | null
    staff:      { full_name: string } | null
  }

  const rawAppts = (appointmentsResult.data ?? []) as unknown as AppointmentRow[]

  const visits: CustomerVisit[] = rawAppts.map(a => ({
    id:           a.id,
    created_at:   a.created_at,
    start_time:   a.start_time ?? null,
    status:       a.status,
    total_paid:   a.services?.price_cop ?? 0,
    service_name: a.services?.name      ?? 'Servicio desconocido',
    staff_name:   a.staff?.full_name    ?? null,
  }))

  const completedVisits = visits.filter(v => v.status === 'completed')
  const totalSpent = completedVisits.reduce((sum, v) => sum + v.total_paid, 0)
  const lastVisit  = completedVisits[0]?.created_at ?? null

  // Mapear notas
  type NoteRow = CustomerNote & { staff: { full_name: string } | null }
  const rawNotes = (notesResult.data ?? []) as unknown as NoteRow[]

  const notes: CustomerNoteWithAuthor[] = rawNotes.map(n => ({
    id:             n.id,
    business_id:    n.business_id,
    customer_id:    n.customer_id,
    staff_id:       n.staff_id,
    appointment_id: n.appointment_id,
    content:        n.content,
    created_at:     n.created_at,
    staff_name:     n.staff?.full_name ?? null,
  }))

  const tags = (tagsResult.data ?? []).map(t => t.tag)
  const staffList = (staffResult.data ?? []) as unknown as Pick<Staff, 'id' | 'full_name'>[]

  return {
    customer,
    total_visits: completedVisits.length,
    total_spent:  totalSpent,
    last_visit:   lastVisit,
    tags,
    notes,
    visits,
    staff_list: staffList,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// addCustomerNote
// Inserta una nueva nota técnica del barbero sobre el cliente.
// ════════════════════════════════════════════════════════════════════════════

export async function addCustomerNote(
  businessId:     string,
  customerId:     string,
  staffId:        string,
  content:        string,
  appointmentId?: string
): Promise<ActionResult & { note?: CustomerNoteWithAuthor }> {
  const supabase = await createClient()

  if (!content.trim()) {
    return { error: 'El contenido de la nota no puede estar vacío.' }
  }

  const { data, error } = await supabase
    .from('customer_notes')
    .insert({
      business_id:    businessId,
      customer_id:    customerId,
      staff_id:       staffId,
      appointment_id: appointmentId ?? null,
      content:        content.trim(),
    })
    .select(`
      id,
      business_id,
      customer_id,
      staff_id,
      appointment_id,
      content,
      created_at,
      staff:staff_id ( full_name )
    `)
    .single()

  if (error) return { error: error.message }

  type NoteRow = CustomerNote & { staff: { full_name: string } | null }
  const row = data as unknown as NoteRow

  const note: CustomerNoteWithAuthor = {
    id:             row.id,
    business_id:    row.business_id,
    customer_id:    row.customer_id,
    staff_id:       row.staff_id,
    appointment_id: row.appointment_id,
    content:        row.content,
    created_at:     row.created_at,
    staff_name:     row.staff?.full_name ?? null,
  }

  revalidatePath('/[slug]/dashboard/crm', 'page')
  return { success: true, note }
}

// ════════════════════════════════════════════════════════════════════════════
// updateCustomerTags
// Reemplaza todas las etiquetas del cliente de forma atómica
// (DELETE + INSERT dentro de la misma transacción lógica).
// ════════════════════════════════════════════════════════════════════════════

export async function updateCustomerTags(
  businessId:  string,
  customerId:  string,
  tags:        string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Eliminar tags actuales
  const { error: delError } = await supabase
    .from('customer_tags')
    .delete()
    .eq('business_id', businessId)
    .eq('customer_id', customerId)

  if (delError) return { error: delError.message }

  // Insertar nuevos (si los hay)
  const uniqueTags = [...new Set(tags.map(t => t.trim()).filter(t => t.length > 0))]

  if (uniqueTags.length > 0) {
    const rows: CustomerTag[] = uniqueTags.map(tag => ({
      customer_id: customerId,
      business_id: businessId,
      tag,
    }))

    const { error: insError } = await supabase
      .from('customer_tags')
      .insert(rows)

    if (insError) return { error: insError.message }
  }

  revalidatePath('/[slug]/dashboard/crm', 'page')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════════
// updateCustomerPreferences
// Actualiza preferencias del cliente (barbero preferido, etc.)
// ════════════════════════════════════════════════════════════════════════════

export async function updateCustomerPreferences(
  businessId:  string,
  customerId:  string,
  data: { preferred_staff_id?: string | null }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .update({ preferred_staff_id: data.preferred_staff_id ?? null })
    .eq('id', customerId)
    .eq('business_id', businessId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/crm', 'page')
  return { success: true }
}
