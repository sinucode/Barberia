'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Expense, ProfitLossResult } from '@/types/database'

// ── Tipos de resultado ────────────────────────────────────────────────────────

interface ActionResult {
  success?: boolean
  error?:   string
}

export interface ExpenseCreateData {
  category:     string
  description:  string
  amount:       number   // INTEGER COP
  expense_date: string   // 'YYYY-MM-DD'
  is_recurring: boolean
}

export interface ExpenseUpdateData {
  category?:     string
  description?:  string
  amount?:       number
  expense_date?: string
  is_recurring?: boolean
}

// ════════════════════════════════════════════════════════════════════════════
// getExpenses
// Lista los gastos de un negocio, con filtro opcional por rango de fechas.
// ════════════════════════════════════════════════════════════════════════════

export async function getExpenses(
  businessId: string,
  dateFrom?:  string,
  dateTo?:    string
): Promise<Expense[]> {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('business_id', businessId)
    .order('expense_date', { ascending: false })
    .order('created_at',   { ascending: false })

  if (dateFrom) query = query.gte('expense_date', dateFrom)
  if (dateTo)   query = query.lte('expense_date', dateTo)

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as Expense[]
}

// ════════════════════════════════════════════════════════════════════════════
// createExpense
// Inserta un nuevo gasto. Valida amount > 0.
// ════════════════════════════════════════════════════════════════════════════

export async function createExpense(
  businessId: string,
  data:        ExpenseCreateData,
  userId?:     string
): Promise<ActionResult & { expense?: Expense }> {
  if (!data.category?.trim()) {
    return { error: 'La categoría es requerida.' }
  }
  if (!data.description?.trim()) {
    return { error: 'La descripción es requerida.' }
  }
  if (!Number.isInteger(data.amount) || data.amount <= 0) {
    return { error: 'El monto debe ser un entero COP mayor a 0.' }
  }
  if (!data.expense_date) {
    return { error: 'La fecha es requerida.' }
  }

  const supabase = await createClient()

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      business_id:  businessId,
      category:     data.category,
      description:  data.description.trim(),
      amount:       data.amount,
      expense_date: data.expense_date,
      is_recurring: data.is_recurring,
      created_by:   userId ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/expenses', 'page')
  return { success: true, expense: expense as Expense }
}

// ════════════════════════════════════════════════════════════════════════════
// updateExpense
// Actualiza campos de un gasto existente.
// ════════════════════════════════════════════════════════════════════════════

export async function updateExpense(
  expenseId: string,
  data:       ExpenseUpdateData
): Promise<ActionResult & { expense?: Expense }> {
  if (data.amount !== undefined) {
    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      return { error: 'El monto debe ser un entero COP mayor a 0.' }
    }
  }
  if (data.description !== undefined && !data.description.trim()) {
    return { error: 'La descripción no puede estar vacía.' }
  }

  const supabase = await createClient()

  const updatePayload: ExpenseUpdateData = {}
  if (data.category    !== undefined) updatePayload.category    = data.category
  if (data.description !== undefined) updatePayload.description = data.description.trim()
  if (data.amount      !== undefined) updatePayload.amount      = data.amount
  if (data.expense_date !== undefined) updatePayload.expense_date = data.expense_date
  if (data.is_recurring !== undefined) updatePayload.is_recurring = data.is_recurring

  const { data: expense, error } = await supabase
    .from('expenses')
    .update(updatePayload)
    .eq('id', expenseId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/expenses', 'page')
  return { success: true, expense: expense as Expense }
}

// ════════════════════════════════════════════════════════════════════════════
// deleteExpense
// Elimina un gasto (hard DELETE — los gastos son registros operativos,
// no transacciones financieras, por lo que el borrado físico es permitido).
// ════════════════════════════════════════════════════════════════════════════

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) return { error: error.message }

  revalidatePath('/[slug]/dashboard/expenses', 'page')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════════
// getProfitLoss
// Llama el RPC get_profit_loss y retorna el estado de resultados tipado.
// Toda la aritmética financiera ocurre en el servidor PostgreSQL.
// ════════════════════════════════════════════════════════════════════════════

export async function getProfitLoss(
  businessId: string,
  dateFrom:   string,
  dateTo:     string
): Promise<ProfitLossResult | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_profit_loss', {
    p_business_id: businessId,
    p_date_from:   dateFrom,
    p_date_to:     dateTo,
  })

  if (error) throw error
  if (!data) return null

  // JSONB llega como `unknown` — usamos as unknown as para respetar la regla de no `as any`
  const result = data as unknown as ProfitLossResult & { error?: string }

  if (result.error) {
    throw new Error(result.message ?? result.error)
  }

  return result as ProfitLossResult
}
