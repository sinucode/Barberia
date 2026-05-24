-- ============================================================
-- RF — Inventario (Inventory Management)
-- Gestión de stock de productos con movimientos auditados.
-- Todos los montos en COP INTEGER. Soft-delete únicamente.
-- ============================================================

-- ── Tabla: inventory_items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID         NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  sku           VARCHAR(80),
  category      VARCHAR(60)  NOT NULL DEFAULT 'general',
  description   TEXT,
  current_stock INTEGER      NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock     INTEGER      NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  unit_price    INTEGER,       -- COP — precio de venta al público
  unit_cost     INTEGER,       -- COP — costo de compra (para P&G)
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: inventory_movements ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID         NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_id       UUID         NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity      INTEGER      NOT NULL,   -- positivo = entrada, negativo = salida
  movement_type VARCHAR(20)  NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'waste')),
  reference_id  UUID,                   -- link a sales.id si viene de venta
  notes         TEXT,
  created_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Índices de rendimiento ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inventory_items_business_active
  ON public.inventory_items (business_id, is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_items_business_name
  ON public.inventory_items (business_id, name);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_business
  ON public.inventory_movements (business_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item
  ON public.inventory_movements (item_id);

-- ── Trigger: actualizar updated_at en inventory_items ────────────────────────

CREATE OR REPLACE FUNCTION public.set_inventory_item_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON public.inventory_items;

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inventory_item_updated_at();

-- ── Row Level Security — inventory_items ─────────────────────────────────────

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_select"
  ON public.inventory_items FOR SELECT
  USING (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_items_insert"
  ON public.inventory_items FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_items_update"
  ON public.inventory_items FOR UPDATE
  USING  (business_id::text = (auth.jwt() ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

-- ── Row Level Security — inventory_movements ─────────────────────────────────

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_select"
  ON public.inventory_movements FOR SELECT
  USING (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_movements_insert"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

CREATE POLICY "inventory_movements_update"
  ON public.inventory_movements FOR UPDATE
  USING  (business_id::text = (auth.jwt() ->> 'business_id'))
  WITH CHECK (business_id::text = (auth.jwt() ->> 'business_id'));

-- ============================================================
-- RPC: record_inventory_movement
-- Registra un movimiento de stock de forma atómica:
--   1. Verifica que el ítem exista y pertenezca al negocio.
--   2. Valida que el stock resultante no sea negativo.
--   3. Inserta la fila en inventory_movements.
--   4. Actualiza current_stock en inventory_items.
--   5. Retorna JSON con new_stock y aviso de stock bajo si aplica.
--
-- Todos los valores de COP son INTEGER (Math.floor en el caller).
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  p_business_id  UUID,
  p_item_id      UUID,
  p_quantity     INTEGER,  -- positivo = entrada, negativo = salida
  p_type         TEXT,
  p_notes        TEXT     DEFAULT NULL,
  p_reference_id UUID     DEFAULT NULL,
  p_user_id      UUID     DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item      RECORD;
  v_new_stock INTEGER;
BEGIN
  -- 1. Verificar que el ítem existe y pertenece al negocio
  SELECT current_stock, min_stock, name
    INTO v_item
    FROM public.inventory_items
   WHERE id          = p_item_id
     AND business_id = p_business_id
     AND is_active   = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Item not found or does not belong to this business');
  END IF;

  -- 2. Validar que el nuevo stock no sea negativo
  v_new_stock := v_item.current_stock + p_quantity;

  IF v_new_stock < 0 THEN
    RETURN json_build_object(
      'error',         'Insufficient stock',
      'current_stock', v_item.current_stock,
      'requested',     p_quantity
    );
  END IF;

  -- 3. Insertar movimiento
  INSERT INTO public.inventory_movements (
    business_id,
    item_id,
    quantity,
    movement_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    p_business_id,
    p_item_id,
    p_quantity,
    p_type,
    p_reference_id,
    p_notes,
    p_user_id
  );

  -- 4. Actualizar stock
  UPDATE public.inventory_items
     SET current_stock = v_new_stock,
         updated_at    = NOW()
   WHERE id          = p_item_id
     AND business_id = p_business_id;

  -- 5. Retornar resultado con alerta de stock bajo si corresponde
  RETURN json_build_object(
    'item_id',        p_item_id,
    'new_stock',      v_new_stock,
    'low_stock_warn', v_new_stock <= v_item.min_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_inventory_movement(UUID, UUID, INTEGER, TEXT, TEXT, UUID, UUID)
  TO authenticated, service_role;
