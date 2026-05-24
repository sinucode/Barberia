'use server'
// actions/accounting.ts — RF22 Trazabilidad Contable

import { createClient } from '@/lib/supabase/server'
import type { JournalEntry, JournalEntryType, AccountingSummary } from '@/types/database'

// ════════════════════════════════════════════════════════════════════════════
// getJournalEntries
// Obtiene las entradas del diario contable para un negocio.
// Consulta la VIEW accounting_journal directamente; RLS de las tablas
// subyacentes aplica automáticamente (INVOKER security).
// ════════════════════════════════════════════════════════════════════════════

export async function getJournalEntries(
  businessId: string,
  filters?: {
    dateFrom?:  string          // 'YYYY-MM-DD'
    dateTo?:    string          // 'YYYY-MM-DD'
    entryType?: JournalEntryType
  }
): Promise<{ data: JournalEntry[] | null; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'No autorizado. Por favor inicia sesión.' }
  }

  // Verify the caller belongs to this business
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { business_id: string } | null
  if (!profile?.business_id || profile.business_id !== businessId) {
    return { data: null, error: 'Acceso denegado.' }
  }

  let query = supabase
    .from('accounting_journal')
    .select('*')
    .eq('business_id', businessId)

  if (filters?.dateFrom) {
    query = query.gte('entry_date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('entry_date', filters.dateTo + 'T23:59:59')
  }
  if (filters?.entryType) {
    query = query.eq('entry_type', filters.entryType)
  }

  query = query
    .order('entry_date', { ascending: false })
    .limit(500)

  const { data, error } = await query

  if (error) {
    console.error('[getJournalEntries]', error)
    return { data: null, error: error.message }
  }

  return { data: data as unknown as JournalEntry[], error: null }
}

// ════════════════════════════════════════════════════════════════════════════
// getAccountingSummary
// Llama al RPC get_accounting_summary y retorna el resumen tipado.
// Toda la aritmética financiera ocurre en PostgreSQL.
// ════════════════════════════════════════════════════════════════════════════

export async function getAccountingSummary(
  businessId: string,
  dateFrom:   string,
  dateTo:     string
): Promise<{ data: AccountingSummary | null; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'No autorizado. Por favor inicia sesión.' }
  }

  // Verify the caller belongs to this business
  const { data: profileRaw2 } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  const profile2 = profileRaw2 as { business_id: string } | null
  if (!profile2?.business_id || profile2.business_id !== businessId) {
    return { data: null, error: 'Acceso denegado.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_accounting_summary', {
    p_business_id: businessId,
    p_date_from:   dateFrom,
    p_date_to:     dateTo,
  })

  if (error) {
    console.error('[getAccountingSummary]', error)
    return { data: null, error: error.message }
  }

  if (!data) return { data: null, error: null }

  // JSONB llega como `unknown` — cast explícito sin `as any`
  return { data: data as unknown as AccountingSummary, error: null }
}
