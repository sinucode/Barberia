'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Staff, StaffLedgerEntry, StaffLedgerBalance, LedgerEntryType } from '@/types/database'

// ── Tipos de resultado ────────────────────────────────────────────────────────

interface ActionResult {
  success?: boolean
  error?:   string
}

// Entrada del ledger enriquecida con el nombre del staff
export interface LedgerEntryWithStaff extends StaffLedgerEntry {
  staff: Pick<Staff, 'id' | 'full_name'> | null
}

// Saldo enriquecido con el nombre y datos del staff
export interface StaffBalanceWithDetails extends StaffLedgerBalance {
  staff: Pick<Staff, 'id' | 'full_name' | 'specialty_role' | 'is_active'>
}

// ════════════════════════════════════════════════════════════════════════════
// getStaffLedger
// Devuelve las entradas recientes del ledger para un empleado específico.
// Incluye el nombre del staff para contextualizar en la UI.
// ════════════════════════════════════════════════════════════════════════════

export async function getStaffLedger(
  businessId: string,
  staffId:    string,
  limit:      number = 50
): Promise<LedgerEntryWithStaff[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff_ledger')
    .select(`
      *,
      staff:staff_id ( id, full_name )
    `)
    .eq('business_id', businessId)
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as LedgerEntryWithStaff[]
}

// ════════════════════════════════════════════════════════════════════════════
// getStaffBalances
// Devuelve el saldo actual de todos los empleados activos del negocio.
// Hace un LEFT JOIN entre la vista staff_ledger_balances y la tabla staff
// para incluir empleados con saldo $0 (que nunca han tenido entradas).
// ════════════════════════════════════════════════════════════════════════════

export async function getStaffBalances(
  businessId: string
): Promise<StaffBalanceWithDetails[]> {
  const supabase = await createClient()

  // Traer todos los empleados activos del negocio
  const { data: staffList, error: staffError } = await supabase
    .from('staff')
    .select('id, full_name, specialty_role, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('full_name')

  if (staffError) throw staffError
  if (!staffList || staffList.length === 0) return []

  // Traer saldos de la vista (solo tendrá filas para quienes tienen entradas)
  const { data: balances, error: balancesError } = await supabase
    .from('staff_ledger_balances')
    .select('*')
    .eq('business_id', businessId)

  if (balancesError) throw balancesError

  const balancesMap = new Map<string, StaffLedgerBalance>()
  for (const b of (balances ?? [])) {
    balancesMap.set(b.staff_id, b as StaffLedgerBalance)
  }

  // Fusionar: todo el staff activo, con saldo de la vista (o cero si no tiene entradas)
  return staffList.map(s => {
    const balance = balancesMap.get(s.id) ?? {
      business_id:     businessId,
      staff_id:        s.id,
      total_earned:    0,
      total_advances:  0,
      total_paid_out:  0,
      current_balance: 0,
    }
    return {
      ...balance,
      staff: {
        id:            s.id,
        full_name:     s.full_name,
        specialty_role: s.specialty_role,
        is_active:     s.is_active,
      },
    }
  })
}

// ════════════════════════════════════════════════════════════════════════════
// recordAdvance
// Registra un anticipo entregado a un empleado (entry_type = 'advance').
// El monto reduce el saldo del ledger (direction: negative).
// ════════════════════════════════════════════════════════════════════════════

export async function recordAdvance(
  businessId: string,
  staffId:    string,
  amount:     number,
  notes:      string
): Promise<ActionResult> {
  const supabase = await createClient()

  if (amount <= 0) {
    return { error: 'El monto del anticipo debe ser mayor a $0 COP.' }
  }
  if (!notes?.trim()) {
    return { error: 'Ingresa una nota descriptiva para el anticipo.' }
  }

  const entryType: LedgerEntryType = 'advance'

  const { error } = await supabase
    .from('staff_ledger')
    .insert({
      business_id:  businessId,
      staff_id:     staffId,
      entry_type:   entryType,
      amount:       Math.round(amount),
      notes:        notes.trim(),
      reference_id: null,
    })

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/ledger', 'page')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════════
// recordPayment
// Registra una liquidación del saldo de un empleado (entry_type = 'payment').
// Típicamente se pre-rellena con current_balance para liquidar todo.
// ════════════════════════════════════════════════════════════════════════════

export async function recordPayment(
  businessId: string,
  staffId:    string,
  amount:     number,
  notes:      string
): Promise<ActionResult> {
  const supabase = await createClient()

  if (amount <= 0) {
    return { error: 'El monto de la liquidación debe ser mayor a $0 COP.' }
  }
  if (!notes?.trim()) {
    return { error: 'Ingresa una nota descriptiva para la liquidación.' }
  }

  const entryType: LedgerEntryType = 'payment'

  const { error } = await supabase
    .from('staff_ledger')
    .insert({
      business_id:  businessId,
      staff_id:     staffId,
      entry_type:   entryType,
      amount:       Math.round(amount),
      notes:        notes.trim(),
      reference_id: null,
    })

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/ledger', 'page')
  return { success: true }
}
