// ============================================================
// lib/features/config.ts — Feature catalog + plan bundles
// Fuente única de verdad para nombres, descripciones y planes
// ============================================================

import type { BusinessFeatures } from '@/types/database'

// ── Catálogo de features ──────────────────────────────────────────────────────

export type FeatureCategory = 'comunicacion' | 'finanzas' | 'operaciones' | 'compliance'

export interface FeatureMeta {
  label:       string
  description: string
  icon:        string   // lucide icon name as string
  category:    FeatureCategory
}

export const FEATURE_CATALOG: Record<keyof BusinessFeatures, FeatureMeta> = {
  notifications_email:    { label: 'Email Notifications',    description: 'Confirmación y recordatorio de citas por correo',          icon: 'Mail',       category: 'comunicacion' },
  notifications_whatsapp: { label: 'WhatsApp Notifications', description: 'Mensajes automáticos por WhatsApp Cloud API',               icon: 'MessageCircle', category: 'comunicacion' },
  commissions:            { label: 'Comisiones',             description: 'Motor de comisiones variables por barbero y servicio',     icon: 'Percent',    category: 'finanzas' },
  staff_ledger:           { label: 'Billetera Staff',        description: 'Saldos y liquidaciones del equipo en tiempo real',         icon: 'Wallet',     category: 'finanzas' },
  expenses_pgl:           { label: 'Gastos y P&G',           description: 'Registro de gastos y estado de resultados',               icon: 'Receipt',    category: 'finanzas' },
  retail_sales:           { label: 'Ventas Retail',          description: 'Venta rápida de productos sin cita asociada',             icon: 'ShoppingBag', category: 'finanzas' },
  loyalty:                { label: 'Programa de Lealtad',    description: 'Puntos y recompensas para clientes frecuentes',           icon: 'Gift',       category: 'finanzas' },
  workstations:           { label: 'Puestos de Trabajo',     description: 'Gestión de sillas, cabinas y workstations',              icon: 'LayoutGrid', category: 'operaciones' },
  walk_ins:               { label: 'Walk-ins',               description: 'Cola de clientes sin cita previa',                       icon: 'Users',      category: 'operaciones' },
  crm:                    { label: 'CRM Clientes',           description: 'Expediente técnico y notas por cliente',                 icon: 'BookUser',   category: 'operaciones' },
  audit_logs:             { label: 'Auditoría',              description: 'Trail de auditoría inmutable de todas las acciones',     icon: 'Shield',     category: 'compliance' },
  fixed_assets:           { label: 'Activos Fijos',          description: 'Inventario y depreciación de equipos',                   icon: 'Package',    category: 'compliance' },
  inventory:              { label: 'Inventario',             description: 'Control de stock de productos',                         icon: 'Archive',    category: 'operaciones' },
  advanced_reports:       { label: 'Reportes Avanzados',     description: 'Reportes financieros y de rendimiento',                 icon: 'BarChart2',  category: 'finanzas' },
  mercadopago_pos:        { label: 'MP — POS',               description: 'Cobro con MercadoPago en caja presencial',              icon: 'QrCode',     category: 'finanzas' },
  mercadopago_booking:    { label: 'MP — Reservas Online',   description: 'Pago anticipado con MercadoPago al reservar cita',     icon: 'CreditCard', category: 'finanzas' },
  mercadopago_saas:       { label: 'MP — Suscripción SaaS',  description: 'Cobro del plan Xinuco vía MercadoPago PreApproval',    icon: 'Repeat',     category: 'finanzas' },
}

// ── Precios SaaS en COP (enteros, pagos mensuales vía MP PreApproval) ─────────

export const PLAN_PRICES_COP: Record<'basico' | 'pro' | 'premium', number> = {
  basico:  0,        // Gratis
  pro:     99_000,   // ~$24 USD
  premium: 199_000,  // ~$48 USD
}

// ── Bundles de plan predefinidos ──────────────────────────────────────────────

export type PlanName = 'basico' | 'pro' | 'premium'

export interface PlanBundle {
  label:       string
  description: string
  color:       string   // Tailwind/CSS color name
  features:    Partial<BusinessFeatures>
}

export const PLAN_BUNDLES: Record<PlanName, PlanBundle> = {
  basico: {
    label:       'Básico',
    description: 'Agenda, servicios y staff. Sin módulos financieros avanzados.',
    color:       'zinc',
    features: {
      notifications_email:    false,
      notifications_whatsapp: false,
      commissions:            false,
      staff_ledger:           false,
      expenses_pgl:           false,
      retail_sales:           false,
      loyalty:                false,
      workstations:           false,
      walk_ins:               false,
      crm:                    false,
      audit_logs:             false,
      fixed_assets:           false,
      inventory:              false,
      advanced_reports:       false,
      mercadopago_pos:        false,
      mercadopago_booking:    false,
      mercadopago_saas:       false,
    },
  },
  pro: {
    label:       'Pro',
    description: 'Todo Básico + módulos financieros y operacionales.',
    color:       'blue',
    features: {
      notifications_email:    true,
      notifications_whatsapp: false,
      commissions:            true,
      staff_ledger:           true,
      expenses_pgl:           true,
      retail_sales:           true,
      loyalty:                false,
      workstations:           true,
      walk_ins:               false,
      crm:                    false,
      audit_logs:             false,
      fixed_assets:           false,
      inventory:              false,
      advanced_reports:       true,
      mercadopago_pos:        true,
      mercadopago_booking:    true,
      mercadopago_saas:       false,
    },
  },
  premium: {
    label:       'Premium',
    description: 'Todas las funciones habilitadas.',
    color:       'amber',
    features: {
      notifications_email:    true,
      notifications_whatsapp: true,
      commissions:            true,
      staff_ledger:           true,
      expenses_pgl:           true,
      retail_sales:           true,
      loyalty:                true,
      workstations:           true,
      walk_ins:               true,
      crm:                    true,
      audit_logs:             true,
      fixed_assets:           true,
      inventory:              true,
      advanced_reports:       true,
      mercadopago_pos:        true,
      mercadopago_booking:    true,
      mercadopago_saas:       true,
    },
  },
}

// ── Helper: detecta el plan actual de un negocio ──────────────────────────────
// Basado en qué features tiene activas — puede devolver 'custom' si no cuadra.

export function detectCurrentPlan(features: BusinessFeatures): PlanName | 'custom' {
  for (const [planName, bundle] of Object.entries(PLAN_BUNDLES) as [PlanName, PlanBundle][]) {
    const keys = Object.keys(bundle.features) as (keyof BusinessFeatures)[]
    const matches = keys.every((k) => features[k] === bundle.features[k])
    if (matches) return planName
  }
  return 'custom'
}
