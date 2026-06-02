// scripts/run-seed-qa.mjs — Seed Barbería QA (schema real de Supabase)
import { createClient } from '@supabase/supabase-js'
import { config }        from 'dotenv'

config({ path: '.env.local' })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('❌ Faltan variables en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}


// UUIDs válidos (solo hex: 0-9 a-f)
const BIZ = 'b0000000-0000-0000-0000-000000000001'
const S1  = 'cafe0001-0000-0000-0000-000000000001'  // Carlos
const S2  = 'cafe0001-0000-0000-0000-000000000002'  // Miguel
const S3  = 'cafe0001-0000-0000-0000-000000000003'  // Laura
const V1  = 'face0002-0000-0000-0000-000000000001'  // Corte Clásico
const V2  = 'face0002-0000-0000-0000-000000000002'  // Corte + Barba
const V3  = 'face0002-0000-0000-0000-000000000003'  // Afeitado
const V4  = 'face0002-0000-0000-0000-000000000004'  // Manicure
const V5  = 'face0002-0000-0000-0000-000000000005'  // Tratamiento
const C1  = 'c1000000-0000-0000-0000-000000000001'
const C2  = 'c1000000-0000-0000-0000-000000000002'
const C3  = 'c1000000-0000-0000-0000-000000000003'
const C4  = 'c1000000-0000-0000-0000-000000000004'
const C5  = 'c1000000-0000-0000-0000-000000000005'
const C6  = 'c1000000-0000-0000-0000-000000000006'
const C7  = 'c1000000-0000-0000-0000-000000000007'
const C8  = 'c1000000-0000-0000-0000-000000000008'
const H1  = 'dec00001-0000-0000-0000-000000000001'  // turno abierto hoy
const H2  = 'dec00001-0000-0000-0000-000000000002'  // turno cerrado ayer
const A1  = 'a1000000-0000-0000-0000-000000000001'
const A2  = 'a1000000-0000-0000-0000-000000000002'
const A3  = 'a1000000-0000-0000-0000-000000000003'
const A4  = 'a1000000-0000-0000-0000-000000000004'
const A5  = 'a1000000-0000-0000-0000-000000000005'
const A6  = 'a1000000-0000-0000-0000-000000000006'
const A7  = 'a1000000-0000-0000-0000-000000000007'
const A8  = 'a1000000-0000-0000-0000-000000000008'
const A9  = 'a1000000-0000-0000-0000-000000000009'
const L1  = 'feed0001-0000-0000-0000-000000000001'
const L2  = 'feed0001-0000-0000-0000-000000000002'
const L3  = 'feed0001-0000-0000-0000-000000000003'
const L4  = 'feed0001-0000-0000-0000-000000000004'
const L5  = 'feed0001-0000-0000-0000-000000000005'
const L6  = 'feed0001-0000-0000-0000-000000000006'

const db = createClient(URL, KEY, { auth: { persistSession: false } })

// ── helpers de tiempo ─────────────────────────────────────────────────────────
const now   = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const t = (h) => new Date(today.getTime() + h * 3600000).toISOString()
const ago = (h) => new Date(now.getTime() - h * 3600000).toISOString()
const daysAgo = (d) => {
  const x = new Date(today); x.setDate(x.getDate() - d)
  return x.toISOString().split('T')[0]
}
// TSTZRANGE para appointments (formato que acepta PostgREST)
const range = (startH, endH) =>
  `["${t(startH)}","${t(endH)}")`

let ok = 0; let fail = 0

async function up(table, data, conflict = 'id') {
  const rows = Array.isArray(data) ? data : [data]
  const { error } = await db.from(table).upsert(rows, { onConflict: conflict, ignoreDuplicates: true })
  if (error) { console.error(`  ✗ ${table}: ${error.message}`); fail++ }
  else        { console.log(`  ✓ ${table} (${rows.length})`);   ok++ }
}
async function ins(table, data) {
  const rows = Array.isArray(data) ? data : [data]
  const { error } = await db.from(table).insert(rows)
  if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
    console.error(`  ✗ ${table}: ${error.message}`); fail++
  } else { console.log(`  ✓ ${table} (${rows.length})`); ok++ }
}

console.log('\n══════════════════════════════════════')
console.log('  SEED QA — Barbería QA')
console.log('══════════════════════════════════════\n')

// ── 1. NEGOCIO ────────────────────────────────────────────────────────────────
console.log('[1] Negocio')
await up('businesses', {
  id: BIZ, name: 'Barbería QA', slug: 'barberia-qa', is_active: true,
  features_enabled: {
    notifications_email:true, notifications_whatsapp:false,
    commissions:true, staff_ledger:true, expenses_pgl:true,
    retail_sales:true, loyalty:true, workstations:true,
    walk_ins:true, crm:true, audit_logs:true,
    fixed_assets:true, inventory:true, advanced_reports:true,
  },
  branding: { primary_color:'#C5A059', secondary_color:'#1A1A1A', bg_color:'#080808', text_color:'#F4F4F4', logo_url:null, font_family:'Inter' },
  brand_config: { primaryColor:'#C5A059', secondaryColor:'#1A1A1A', bgColor:'#080808', textColor:'#F4F4F4', fontFamily:'inter' },
  appointment_interval_minutes: 30,
  loyalty_point_value_cop: 1000,
  loyalty_expiry_months: 12,
})

// ── 2. STAFF ──────────────────────────────────────────────────────────────────
console.log('\n[2] Staff')
await up('staff', [
  { id:S1, business_id:BIZ, full_name:'Carlos Rodríguez', specialty_role:'Barbero Senior', is_active:true },
  { id:S2, business_id:BIZ, full_name:'Miguel Torres',    specialty_role:'Barbero',        is_active:true },
  { id:S3, business_id:BIZ, full_name:'Laura Gómez',      specialty_role:'Manicurista',    is_active:true },
])

// ── 3. SERVICIOS ──────────────────────────────────────────────────────────────
console.log('\n[3] Servicios')
await up('services', [
  { id:V1, business_id:BIZ, name:'Corte Clásico',      description:'Corte con acabado clásico',         duration_minutes:30, buffer_time_minutes:5,  price_cop:25000, is_active:true },
  { id:V2, business_id:BIZ, name:'Corte + Barba',       description:'Corte más diseño de barba',         duration_minutes:50, buffer_time_minutes:10, price_cop:45000, is_active:true },
  { id:V3, business_id:BIZ, name:'Afeitado Clásico',    description:'Afeitado con navaja y toalla',      duration_minutes:40, buffer_time_minutes:5,  price_cop:35000, is_active:true },
  { id:V4, business_id:BIZ, name:'Manicure Clásico',    description:'Limpieza y esmaltado de uñas',      duration_minutes:45, buffer_time_minutes:5,  price_cop:30000, is_active:true },
  { id:V5, business_id:BIZ, name:'Tratamiento Capilar', description:'Hidratación profunda y masaje',     duration_minutes:60, buffer_time_minutes:10, price_cop:55000, is_active:true },
])

// ── 4. STAFF ↔ SERVICIOS ──────────────────────────────────────────────────────
console.log('\n[4] Staff-Servicios')
await ins('staff_services', [
  { staff_id:S1, service_id:V1, business_id:BIZ },
  { staff_id:S1, service_id:V2, business_id:BIZ },
  { staff_id:S1, service_id:V3, business_id:BIZ },
  { staff_id:S1, service_id:V5, business_id:BIZ },
  { staff_id:S2, service_id:V1, business_id:BIZ },
  { staff_id:S2, service_id:V2, business_id:BIZ },
  { staff_id:S2, service_id:V3, business_id:BIZ },
  { staff_id:S3, service_id:V4, business_id:BIZ },
  { staff_id:S3, service_id:V5, business_id:BIZ },
])

// ── 5. HORARIOS ───────────────────────────────────────────────────────────────
console.log('\n[5] Horarios (Lun-Sáb)')
const horarios = []
for (const sid of [S1, S2, S3])
  for (const dow of [1,2,3,4,5,6])
    horarios.push({ business_id:BIZ, staff_id:sid, day_of_week:dow,
      start_time: dow===6 ? '08:00:00' : '09:00:00',
      end_time:   dow===6 ? '16:00:00' : '18:00:00' })
await ins('staff_schedules', horarios)

// ── 6. CLIENTES ───────────────────────────────────────────────────────────────
console.log('\n[6] Clientes')
await up('customers', [
  { id:C1, business_id:BIZ, full_name:'Juan Pablo Reyes', phone:'+573001234567', email:'juan.reyes@email.com',  preferred_staff_id:S1 },
  { id:C2, business_id:BIZ, full_name:'Andrés Morales',   phone:'+573102345678', email:'andres.m@email.com',    preferred_staff_id:S2 },
  { id:C3, business_id:BIZ, full_name:'Diego Hernández',  phone:'+573203456789', email:null,                    preferred_staff_id:null },
  { id:C4, business_id:BIZ, full_name:'Camila Vargas',    phone:'+573304567890', email:'camila.v@email.com',    preferred_staff_id:S3 },
  { id:C5, business_id:BIZ, full_name:'Santiago Ruiz',    phone:'+573405678901', email:null,                    preferred_staff_id:S1 },
  { id:C6, business_id:BIZ, full_name:'Valentina Castro', phone:'+573506789012', email:'vale.castro@email.com', preferred_staff_id:S3 },
  { id:C7, business_id:BIZ, full_name:'Sebastián Mejía',  phone:'+573607890123', email:null,                    preferred_staff_id:null },
  { id:C8, business_id:BIZ, full_name:'Isabella Díaz',    phone:'+573708901234', email:'isa.diaz@email.com',    preferred_staff_id:S3 },
], 'business_id,phone')

// ── 7. TURNOS DE CAJA ─────────────────────────────────────────────────────────
console.log('\n[7] Turnos de caja')
await up('cash_register_shifts', [
  { id:H1, business_id:BIZ, status:'open',   opening_balance:200000, opened_at:ago(3) },
  { id:H2, business_id:BIZ, status:'closed', opening_balance:150000, actual_closing_balance:680000, opened_at:ago(27), closed_at:ago(3) },
])

// ── 8. CITAS (con time_range TSTZRANGE) ───────────────────────────────────────
// appointments usa barber_id (no staff_id), time_range (no start_time)
// durations: V1=30, V2=50, V3=40, V4=45, V5=60
console.log('\n[8] Citas')
await up('appointments', [
  { id:A1, business_id:BIZ, barber_id:S1, customer_id:C1, status:'completed',    time_range:range(9,  9.83) },  // 9:00-9:50 (Corte+Barba 50min)
  { id:A2, business_id:BIZ, barber_id:S2, customer_id:C2, status:'completed',    time_range:range(10, 10.5) },  // 10:00-10:30 (Corte 30min)
  { id:A3, business_id:BIZ, barber_id:S1, customer_id:C3, status:'ready_to_pay', time_range:range(11, 12) },    // 11:00-12:00 (Tratamiento 60min)
  { id:A4, business_id:BIZ, barber_id:S3, customer_id:C4, status:'in_progress',  time_range:range(12, 12.75) }, // 12:00-12:45 (Manicure 45min)
  { id:A5, business_id:BIZ, barber_id:S1, customer_id:C5, status:'scheduled',    time_range:range(14, 14.5) },  // 14:00-14:30 (Corte 30min)
  { id:A6, business_id:BIZ, barber_id:S2, customer_id:C6, status:'scheduled',    time_range:range(15, 15.83) }, // 15:00-15:50 (Corte+Barba)
  { id:A7, business_id:BIZ, barber_id:S1, customer_id:C7, status:'cancelled',    time_range:range(16, 16.67) }, // 16:00-16:40 (Afeitado)
  { id:A8, business_id:BIZ, barber_id:S1, customer_id:C8, status:'scheduled',    time_range:range(33, 33.83) }, // mañana 9:00 — para cron recordatorio
  { id:A9, business_id:BIZ, barber_id:S2, customer_id:C1, status:'scheduled',    time_range:range(57, 57.5) },  // pasado mañana
])

// ── 9. VENTAS ─────────────────────────────────────────────────────────────────
console.log('\n[9] Ventas')
await up('sales', [
  { id:L1, business_id:BIZ, shift_id:H1, appointment_id:A1, customer_id:C1, subtotal:45000, discount_amount:0,    tip_amount:5000,  total_amount:50000, status:'paid' },
  { id:L2, business_id:BIZ, shift_id:H1, appointment_id:A2, customer_id:C2, subtotal:25000, discount_amount:0,    tip_amount:0,     total_amount:25000, status:'paid' },
  { id:L3, business_id:BIZ, shift_id:H1, appointment_id:null, customer_id:null, subtotal:62000, discount_amount:2000, tip_amount:0, total_amount:60000, status:'paid' },
  { id:L4, business_id:BIZ, shift_id:H2, appointment_id:null, customer_id:C5, subtotal:45000, discount_amount:5000, tip_amount:0,  total_amount:40000, status:'paid', created_at:ago(20) },
  { id:L5, business_id:BIZ, shift_id:H2, appointment_id:null, customer_id:C3, subtotal:55000, discount_amount:0,   tip_amount:10000, total_amount:65000, status:'paid', created_at:ago(18) },
  { id:L6, business_id:BIZ, shift_id:H2, appointment_id:null, customer_id:null, subtotal:30000, discount_amount:0, tip_amount:0,   total_amount:30000, status:'paid', created_at:ago(15) },
])

// ── 10. ITEMS DE VENTA ────────────────────────────────────────────────────────
console.log('\n[10] Sale items')
await ins('sale_items', [
  { business_id:BIZ, sale_id:L1, staff_id:S1, item_type:'service', description:'Corte + Barba',           quantity:1, unit_price:45000, total_price:45000 },
  { business_id:BIZ, sale_id:L2, staff_id:S2, item_type:'service', description:'Corte Clásico',            quantity:1, unit_price:25000, total_price:25000 },
  { business_id:BIZ, sale_id:L3, staff_id:S1, item_type:'product', description:'Pomada Suavecito 4oz',     quantity:2, unit_price:25000, total_price:50000 },
  { business_id:BIZ, sale_id:L3, staff_id:S1, item_type:'product', description:'Shampoo Anticaspa 250ml',  quantity:1, unit_price:12000, total_price:12000 },
  { business_id:BIZ, sale_id:L4, staff_id:S1, item_type:'service', description:'Corte + Barba',           quantity:1, unit_price:45000, total_price:45000 },
  { business_id:BIZ, sale_id:L5, staff_id:S1, item_type:'service', description:'Tratamiento Capilar',     quantity:1, unit_price:55000, total_price:55000 },
  { business_id:BIZ, sale_id:L6, staff_id:S3, item_type:'service', description:'Manicure Clásico',        quantity:1, unit_price:30000, total_price:30000 },
])

// ── 11. PAGOS ─────────────────────────────────────────────────────────────────
console.log('\n[11] Pagos')
await ins('payments', [
  { business_id:BIZ, sale_id:L1, shift_id:H1, amount:50000, payment_method:'cash'     },
  { business_id:BIZ, sale_id:L2, shift_id:H1, amount:25000, payment_method:'card'     },
  { business_id:BIZ, sale_id:L3, shift_id:H1, amount:60000, payment_method:'transfer' },
  { business_id:BIZ, sale_id:L4, shift_id:H2, amount:40000, payment_method:'cash'     },
  { business_id:BIZ, sale_id:L5, shift_id:H2, amount:65000, payment_method:'card'     },
  { business_id:BIZ, sale_id:L6, shift_id:H2, amount:30000, payment_method:'cash'     },
])

// ── 12. GASTOS ────────────────────────────────────────────────────────────────
console.log('\n[12] Gastos')
await ins('expenses', [
  { business_id:BIZ, description:'Insumos — toallas y desinfectante',  amount:85000,   category:'supplies',   expense_date:daysAgo(1) },
  { business_id:BIZ, description:'Servicio de internet mensual',       amount:65000,   category:'utilities',  expense_date:daysAgo(2) },
  { business_id:BIZ, description:'Productos para reventa — pomadas',  amount:240000,  category:'inventory',  expense_date:daysAgo(3) },
  { business_id:BIZ, description:'Arriendo local comercial',          amount:1200000, category:'rent',       expense_date:daysAgo(4) },
])

// ── VERIFICACIÓN ──────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════')
console.log('  VERIFICACIÓN')
console.log('══════════════════════════════════════')

const checks = [
  ['businesses',          'id',          BIZ],
  ['staff',               'business_id', BIZ],
  ['services',            'business_id', BIZ],
  ['customers',           'business_id', BIZ],
  ['appointments',        'business_id', BIZ],
  ['sales',               'business_id', BIZ],
  ['expenses',            'business_id', BIZ],
  ['cash_register_shifts','business_id', BIZ],
]
for (const [table, col, val] of checks) {
  const { count } = await db.from(table).select('*', { count:'exact', head:true }).eq(col, val)
  console.log(`  ${table.padEnd(26)} ${String(count ?? 0).padStart(2)} registros`)
}

const { data: aj } = await db.from('accounting_journal').select('entry_type').eq('business_id', BIZ)
const inc = aj?.filter(r => r.entry_type === 'income').length  ?? 0
const exp = aj?.filter(r => r.entry_type === 'expense').length ?? 0
console.log(`  ${'accounting_journal'.padEnd(26)} ${inc} ingresos | ${exp} gastos`)

console.log(`\n  ✓ Éxitos: ${ok}   ✗ Errores: ${fail}`)
console.log('══════════════════════════════════════\n')
if (fail > 0) process.exit(1)
