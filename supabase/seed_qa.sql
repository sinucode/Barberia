-- ══════════════════════════════════════════════════════════════════════════════
-- SEED QA — Barbería QA
-- Datos de prueba completos para validar todos los módulos del sistema.
-- PEGAR EN: Supabase Dashboard → SQL Editor → New Query → Run
--
-- IMPORTANTE: Ejecutar una sola vez en un entorno de prueba.
--   Si necesitas limpiar y re-seed: ejecuta primero el bloque de CLEANUP.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── CLEANUP (opcional — descomentar si necesitas re-seed limpio) ─────────────
-- DELETE FROM public.payments        WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.sale_items      WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.sales           WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.appointments    WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.cash_register_shifts WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.notification_log WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.expenses        WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.staff_ledger    WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.staff_schedules WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.staff_services  WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.customers       WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.services        WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.staff           WHERE business_id = 'b0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.businesses      WHERE id          = 'b0000000-0000-0000-0000-000000000001';

-- ════════════════════════════════════════════════════════════════════════════
-- 1. NEGOCIO — Barbería QA
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.businesses (
  id, name, slug, is_active,
  features_enabled,
  branding,
  brand_config,
  operating_hours,
  appointment_interval_minutes,
  loyalty_point_value_cop,
  loyalty_expiry_months
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Barbería QA',
  'barberia-qa',
  TRUE,
  -- Todas las features habilitadas para pruebas completas
  '{
    "notifications_email": true,
    "notifications_whatsapp": false,
    "commissions": true,
    "staff_ledger": true,
    "expenses_pgl": true,
    "retail_sales": true,
    "loyalty": true,
    "workstations": true,
    "walk_ins": true,
    "crm": true,
    "audit_logs": true,
    "fixed_assets": true,
    "inventory": true,
    "advanced_reports": true
  }'::JSONB,
  '{
    "primary_color": "#C5A059",
    "secondary_color": "#1A1A1A",
    "bg_color": "#080808",
    "text_color": "#F4F4F4",
    "logo_url": null,
    "font_family": "Inter"
  }'::JSONB,
  '{
    "primaryColor": "#C5A059",
    "secondaryColor": "#1A1A1A",
    "bgColor": "#080808",
    "textColor": "#F4F4F4",
    "fontFamily": "inter"
  }'::JSONB,
  '{
    "monday":    {"is_open": true,  "open_time": "09:00", "close_time": "19:00"},
    "tuesday":   {"is_open": true,  "open_time": "09:00", "close_time": "19:00"},
    "wednesday": {"is_open": true,  "open_time": "09:00", "close_time": "19:00"},
    "thursday":  {"is_open": true,  "open_time": "09:00", "close_time": "19:00"},
    "friday":    {"is_open": true,  "open_time": "09:00", "close_time": "20:00"},
    "saturday":  {"is_open": true,  "open_time": "08:00", "close_time": "18:00"},
    "sunday":    {"is_open": false, "open_time": "09:00", "close_time": "14:00"}
  }'::JSONB,
  30,   -- slots de 30 min
  1000, -- 1 punto = $1.000 COP
  12    -- puntos vencen a 12 meses
)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. STAFF (3 empleados sin cuenta de usuario — para agregar login ver nota)
-- ════════════════════════════════════════════════════════════════════════════
-- NOTA: Para que puedan iniciar sesión, crear el usuario en Supabase Auth
-- y luego hacer UPDATE public.staff SET user_id = '<auth_user_id>' WHERE id = '...';

INSERT INTO public.staff (id, business_id, full_name, specialty_role, is_active)
VALUES
  ('s1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Carlos Rodríguez', 'Barbero Senior', TRUE),
  ('s1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Miguel Torres', 'Barbero', TRUE),
  ('s1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Laura Gómez', 'Manicurista', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. SERVICIOS
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.services (id, business_id, name, description, duration_minutes, buffer_time_minutes, price_cop, is_active)
VALUES
  ('sv100000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Corte Clásico', 'Corte de cabello con acabado clásico y peinado', 30, 5, 25000, TRUE),
  ('sv100000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Corte + Barba', 'Corte de cabello más diseño y arreglo de barba', 50, 10, 45000, TRUE),
  ('sv100000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Afeitado Clásico', 'Afeitado tradicional con navaja y toalla caliente', 40, 5, 35000, TRUE),
  ('sv100000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'Manicure Clásico', 'Limpieza, corte y esmaltado de uñas', 45, 5, 30000, TRUE),
  ('sv100000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'Tratamiento Capilar', 'Hidratación profunda y masaje capilar', 60, 10, 55000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. ASIGNACIÓN STAFF → SERVICIOS
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.staff_services (staff_id, service_id, business_id)
VALUES
  -- Carlos: todo menos manicure
  ('s1000000-0000-0000-0000-000000000001', 'sv100000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('s1000000-0000-0000-0000-000000000001', 'sv100000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('s1000000-0000-0000-0000-000000000001', 'sv100000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001'),
  ('s1000000-0000-0000-0000-000000000001', 'sv100000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001'),
  -- Miguel: cortes básicos
  ('s1000000-0000-0000-0000-000000000002', 'sv100000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('s1000000-0000-0000-0000-000000000002', 'sv100000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('s1000000-0000-0000-0000-000000000002', 'sv100000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001'),
  -- Laura: manicure y tratamiento
  ('s1000000-0000-0000-0000-000000000003', 'sv100000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001'),
  ('s1000000-0000-0000-0000-000000000003', 'sv100000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. HORARIOS DE TRABAJO (Lun-Vie 9-18, Sáb 8-16)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.staff_schedules (business_id, staff_id, day_of_week, start_time, end_time)
SELECT
  'b0000000-0000-0000-0000-000000000001',
  s.id,
  d.dow,
  CASE WHEN d.dow = 6 THEN '08:00' ELSE '09:00' END,
  CASE WHEN d.dow = 6 THEN '16:00' ELSE '18:00' END
FROM
  (VALUES
    ('s1000000-0000-0000-0000-000000000001'::UUID),
    ('s1000000-0000-0000-0000-000000000002'::UUID),
    ('s1000000-0000-0000-0000-000000000003'::UUID)
  ) AS s(id),
  (VALUES (1),(2),(3),(4),(5),(6)) AS d(dow)  -- Lun=1 a Sáb=6
ON CONFLICT (staff_id, day_of_week) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. CLIENTES (8 clientes de prueba)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.customers (id, business_id, full_name, phone, email, preferred_staff_id)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Juan Pablo Reyes',   '+573001234567', 'juan.reyes@email.com',   's1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Andrés Morales',     '+573102345678', 'andres.m@email.com',     's1000000-0000-0000-0000-000000000002'),
  ('c1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Diego Hernández',    '+573203456789', NULL,                     NULL),
  ('c1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'Camila Vargas',      '+573304567890', 'camila.v@email.com',     's1000000-0000-0000-0000-000000000003'),
  ('c1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'Santiago Ruiz',      '+573405678901', NULL,                     's1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'Valentina Castro',   '+573506789012', 'vale.castro@email.com',  's1000000-0000-0000-0000-000000000003'),
  ('c1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'Sebastián Mejía',    '+573607890123', NULL,                     NULL),
  ('c1000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   'Isabella Díaz',      '+573708901234', 'isa.diaz@email.com',     's1000000-0000-0000-0000-000000000003')
ON CONFLICT (business_id, phone) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. TURNO DE CAJA ABIERTO (hoy)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.cash_register_shifts (id, business_id, status, opening_balance, opened_at)
VALUES (
  'sh100000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'open',
  200000,  -- $200.000 COP de apertura
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Turno cerrado (ayer) — para probar historial
INSERT INTO public.cash_register_shifts (id, business_id, status, opening_balance, actual_closing_balance, opened_at, closed_at)
VALUES (
  'sh100000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  'closed',
  150000,   -- $150.000 apertura
  680000,   -- $680.000 cierre
  NOW() - INTERVAL '27 hours',
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. CITAS (mix de estados para probar la agenda)
-- ════════════════════════════════════════════════════════════════════════════

-- Citas de HOY (en curso / próximas)
INSERT INTO public.appointments (id, business_id, staff_id, customer_id, service_id, status, start_time, notes)
VALUES
  -- 9:00 AM — completada
  ('a1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'sv100000-0000-0000-0000-000000000002', 'completed',
   DATE_TRUNC('day', NOW()) + INTERVAL '9 hours', 'Cliente frecuente'),

  -- 10:00 AM — completada (Miguel)
  ('a1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
   'sv100000-0000-0000-0000-000000000001', 'completed',
   DATE_TRUNC('day', NOW()) + INTERVAL '10 hours', NULL),

  -- 11:00 AM — ready_to_pay (Carlos)
  ('a1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003',
   'sv100000-0000-0000-0000-000000000005', 'ready_to_pay',
   DATE_TRUNC('day', NOW()) + INTERVAL '11 hours', 'Tratamiento de keratina'),

  -- 12:00 PM — in_progress (Laura)
  ('a1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000004',
   'sv100000-0000-0000-0000-000000000004', 'in_progress',
   DATE_TRUNC('day', NOW()) + INTERVAL '12 hours', NULL),

  -- 2:00 PM — scheduled (Carlos)
  ('a1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005',
   'sv100000-0000-0000-0000-000000000001', 'scheduled',
   DATE_TRUNC('day', NOW()) + INTERVAL '14 hours', NULL),

  -- 3:00 PM — scheduled (Miguel)
  ('a1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000006',
   'sv100000-0000-0000-0000-000000000002', 'scheduled',
   DATE_TRUNC('day', NOW()) + INTERVAL '15 hours', NULL),

  -- 4:00 PM — cancelled
  ('a1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000007',
   'sv100000-0000-0000-0000-000000000003', 'cancelled',
   DATE_TRUNC('day', NOW()) + INTERVAL '16 hours', 'Cliente canceló por enfermedad'),

  -- Mañana — scheduled (para probar recordatorios)
  ('a1000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000008',
   'sv100000-0000-0000-0000-000000000002', 'scheduled',
   DATE_TRUNC('day', NOW()) + INTERVAL '33 hours', 'Cita de prueba para recordatorio 24h'),

  -- Pasado mañana — scheduled
  ('a1000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001',
   's1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   'sv100000-0000-0000-0000-000000000001', 'scheduled',
   DATE_TRUNC('day', NOW()) + INTERVAL '57 hours', NULL)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. VENTAS COBRADAS (para validar accounting_journal y reportes)
-- ════════════════════════════════════════════════════════════════════════════

-- Venta 1: Corte + Barba para Juan Pablo (turno actual)
INSERT INTO public.sales (id, business_id, shift_id, appointment_id, customer_id, subtotal, discount_amount, tip_amount, total_amount, status)
VALUES (
  'sl100000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'sh100000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  45000, 0, 5000, 50000, 'paid'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sale_items (business_id, sale_id, staff_id, item_type, description, quantity, unit_price, total_price)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'sl100000-0000-0000-0000-000000000001',
  's1000000-0000-0000-0000-000000000001',
  'service', 'Corte + Barba', 1, 45000, 45000
);

INSERT INTO public.payments (business_id, sale_id, shift_id, amount, payment_method)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'sl100000-0000-0000-0000-000000000001',
  'sh100000-0000-0000-0000-000000000001',
  50000, 'cash'
);

-- Venta 2: Corte Clásico para Andrés (turno actual)
INSERT INTO public.sales (id, business_id, shift_id, appointment_id, customer_id, subtotal, discount_amount, tip_amount, total_amount, status)
VALUES (
  'sl100000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  'sh100000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000002',
  25000, 0, 0, 25000, 'paid'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sale_items (business_id, sale_id, staff_id, item_type, description, quantity, unit_price, total_price)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'sl100000-0000-0000-0000-000000000002',
  's1000000-0000-0000-0000-000000000002',
  'service', 'Corte Clásico', 1, 25000, 25000
);

INSERT INTO public.payments (business_id, sale_id, shift_id, amount, payment_method)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'sl100000-0000-0000-0000-000000000002',
  'sh100000-0000-0000-0000-000000000001',
  25000, 'card'
);

-- Venta 3: Venta Retail — productos (sin cita)
INSERT INTO public.sales (id, business_id, shift_id, appointment_id, customer_id, subtotal, discount_amount, tip_amount, total_amount, status)
VALUES (
  'sl100000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000001',
  'sh100000-0000-0000-0000-000000000001',
  NULL, NULL,
  62000, 2000, 0, 60000, 'paid'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sale_items (business_id, sale_id, staff_id, item_type, description, quantity, unit_price, total_price)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'sl100000-0000-0000-0000-000000000003',
   's1000000-0000-0000-0000-000000000001', 'product', 'Pomada Suavecito 4oz', 2, 25000, 50000),
  ('b0000000-0000-0000-0000-000000000001', 'sl100000-0000-0000-0000-000000000003',
   's1000000-0000-0000-0000-000000000001', 'product', 'Shampoo Anticaspa 250ml', 1, 12000, 12000);

INSERT INTO public.payments (business_id, sale_id, shift_id, amount, payment_method)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'sl100000-0000-0000-0000-000000000003',
  'sh100000-0000-0000-0000-000000000001',
  60000, 'transfer'
);

-- Ventas del turno de ayer (para probar rango de fechas en reportes)
INSERT INTO public.sales (id, business_id, shift_id, customer_id, subtotal, discount_amount, tip_amount, total_amount, status, created_at)
VALUES
  ('sl100000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001',
   'sh100000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000005',
   45000, 5000, 0, 40000, 'paid',
   NOW() - INTERVAL '20 hours'),
  ('sl100000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000001',
   'sh100000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000003',
   55000, 0, 10000, 65000, 'paid',
   NOW() - INTERVAL '18 hours'),
  ('sl100000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000001',
   'sh100000-0000-0000-0000-000000000002',
   NULL,
   30000, 0, 0, 30000, 'paid',
   NOW() - INTERVAL '15 hours')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. GASTOS (para probar P&G y diario contable)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.expenses (business_id, description, amount, category, expense_date)
VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'Insumos de barbería — toallas y desinfectante', 85000, 'supplies',
   (NOW() - INTERVAL '1 day')::DATE),
  ('b0000000-0000-0000-0000-000000000001',
   'Servicio de internet mensual', 65000, 'utilities',
   (NOW() - INTERVAL '2 days')::DATE),
  ('b0000000-0000-0000-0000-000000000001',
   'Productos para reventa — pomadas y shampoos', 240000, 'inventory',
   (NOW() - INTERVAL '3 days')::DATE),
  ('b0000000-0000-0000-0000-000000000001',
   'Arriendo local comercial', 1200000, 'rent',
   (NOW() - INTERVAL '4 days')::DATE);

-- ════════════════════════════════════════════════════════════════════════════
-- 11. VERIFICACIÓN FINAL
-- ════════════════════════════════════════════════════════════════════════════
-- Ejecuta esto para confirmar que los datos quedaron bien:

SELECT
  'businesses'   AS tabla, COUNT(*) AS registros FROM public.businesses  WHERE id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'staff',         COUNT(*) FROM public.staff          WHERE business_id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'services',      COUNT(*) FROM public.services       WHERE business_id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'customers',     COUNT(*) FROM public.customers      WHERE business_id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'appointments',  COUNT(*) FROM public.appointments   WHERE business_id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'sales',         COUNT(*) FROM public.sales          WHERE business_id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'expenses',      COUNT(*) FROM public.expenses       WHERE business_id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'shifts',        COUNT(*) FROM public.cash_register_shifts WHERE business_id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'accounting_journal_ingresos', COUNT(*) FROM public.accounting_journal
  WHERE business_id = 'b0000000-0000-0000-0000-000000000001' AND entry_type = 'income'
UNION ALL SELECT 'accounting_journal_gastos',   COUNT(*) FROM public.accounting_journal
  WHERE business_id = 'b0000000-0000-0000-0000-000000000001' AND entry_type = 'expense';
