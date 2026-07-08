-- ============================================================
-- EleiçãoAI — Reestruturação: Pedidos e Entitlements
-- Substitui o modelo de créditos/assinatura por:
--   pagamento único → orders → entitlements (direito de criar cada peça)
-- Executar no Supabase SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: orders  (pedido de compra — 1 checkout = 1 order)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','rejected','expired','refunded')),
  amount_cents     INT  NOT NULL,

  -- Referências do Mercado Pago
  mp_preference_id TEXT UNIQUE,
  mp_payment_id    TEXT UNIQUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: order_items  (itens do pedido — 'pacote' ou avulsos)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,   -- 'pacote' | 'santinho' | 'banner' | 'perfurado' | 'social' | 'jingle'
  price_cents  INT  NOT NULL
);

-- ============================================================
-- TABELA: entitlements  (direito de criar UMA peça de um tipo)
-- Criados quando um pedido é pago. Consumidos ao finalizar a peça.
-- ============================================================
CREATE TABLE IF NOT EXISTS entitlements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id       UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  asset_type         TEXT NOT NULL
                       CHECK (asset_type IN ('santinho','banner','perfurado','social','jingle')),
  status             TEXT NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available','in_use','consumed')),

  -- Cotas de reprocessamento (custo variável de IA)
  music_regens_left  INT NOT NULL DEFAULT 3,    -- só relevante para jingle
  ai_bg_gens_left    INT NOT NULL DEFAULT 10,   -- só relevante para peças visuais

  asset_id           UUID REFERENCES assets(id),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotência do webhook: 1 entitlement por (pedido, tipo)
  UNIQUE (order_id, asset_type)
);

-- ============================================================
-- COLUNA NOVA: assets.design  (rascunho JSON do editor visual)
-- ============================================================
ALTER TABLE assets ADD COLUMN IF NOT EXISTS design JSONB;

-- Foto do candidato sem fundo (recorte via IA) — reutilizada em todas as peças.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS base_photo_cutout_url TEXT;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- orders: dono lê os seus; escrita só via service_role (backend/webhook)
DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_service_all" ON orders;
CREATE POLICY "orders_service_all" ON orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- order_items: dono lê via order; escrita só service_role
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "order_items_service_all" ON order_items;
CREATE POLICY "order_items_service_all" ON order_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- entitlements: dono lê via candidate; escrita só service_role
DROP POLICY IF EXISTS "entitlements_select_own" ON entitlements;
CREATE POLICY "entitlements_select_own" ON entitlements
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "entitlements_service_all" ON entitlements;
CREATE POLICY "entitlements_service_all" ON entitlements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_user            ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_candidate       ON orders(candidate_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order      ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_candidate ON entitlements(candidate_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_lookup    ON entitlements(candidate_id, asset_type, status);

-- ============================================================
-- TRIGGER: updated_at automático em orders
-- (função update_updated_at() já existe no schema base)
-- ============================================================
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNÇÃO: claim_entitlement — reivindica atomicamente um direito
-- disponível para o tipo pedido. Retorna o id ou NULL se não houver.
-- SKIP LOCKED evita corrida entre requisições concorrentes.
-- ============================================================
CREATE OR REPLACE FUNCTION claim_entitlement(p_candidate_id UUID, p_asset_type TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM entitlements
  WHERE candidate_id = p_candidate_id
    AND asset_type   = p_asset_type
    AND status       = 'available'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE entitlements SET status = 'in_use' WHERE id = v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: consume_music_regen — decrementa cota de regravação de
-- música do jingle de forma atômica. Retorna TRUE se havia cota.
-- ============================================================
CREATE OR REPLACE FUNCTION consume_music_regen(p_entitlement_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_left INT;
BEGIN
  SELECT music_regens_left INTO v_left
  FROM entitlements
  WHERE id = p_entitlement_id
  FOR UPDATE;

  IF v_left IS NULL OR v_left <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE entitlements SET music_regens_left = music_regens_left - 1
  WHERE id = p_entitlement_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED: produto "pacote" (Pacote Campanha Completa)
-- Preço editável no admin. Avulsos já existem em admin_schema.sql.
-- ============================================================
INSERT INTO products (type, label, description, price) VALUES
  ('pacote', 'Pacote Campanha Completa',
   'Kit completo: santinho, banner, faixa perfurada, post para redes e jingle — tudo pronto para a campanha.',
   49900)
ON CONFLICT (type) DO NOTHING;
