-- EleiçãoAI — catch-up: pedidos/entitlements (se ainda não existirem)
-- + estúdio guiado (wizard, novos formatos, mini-site).
-- Idempotente: pode rodar mesmo se 20260708 já tiver sido aplicado.
-- Requer: schema.sql (candidates, assets) já executado.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Pedidos (cria só se faltar) ───────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','rejected','expired','refunded')),
  amount_cents     INT  NOT NULL,
  mp_preference_id TEXT UNIQUE,
  mp_payment_id    TEXT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  price_cents  INT  NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id       UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  asset_type         TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available','in_use','consumed')),
  music_regens_left  INT NOT NULL DEFAULT 3,
  ai_bg_gens_left    INT NOT NULL DEFAULT 10,
  asset_id           UUID REFERENCES assets(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, asset_type)
);

ALTER TABLE assets ADD COLUMN IF NOT EXISTS design JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS base_photo_cutout_url TEXT;

ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "orders_service_all" ON orders;
CREATE POLICY "orders_service_all" ON orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "order_items_service_all" ON order_items;
CREATE POLICY "order_items_service_all" ON order_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "entitlements_select_own" ON entitlements;
CREATE POLICY "entitlements_select_own" ON entitlements
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "entitlements_service_all" ON entitlements;
CREATE POLICY "entitlements_service_all" ON entitlements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_orders_user            ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_candidate       ON orders(candidate_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order      ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_candidate ON entitlements(candidate_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_lookup    ON entitlements(candidate_id, asset_type, status);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    EXECUTE $t$
      CREATE TRIGGER trg_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    $t$;
  END IF;
END $$;

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

-- ── Estúdio guiado ────────────────────────────────────────────
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS office TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS uf VARCHAR(2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS visual_style TEXT DEFAULT 'classico';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS jingle_style TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS public_slug TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS week_plan JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS jingle_lyrics_draft TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS party_logo_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS show_party_logo BOOLEAN DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_public_slug
  ON candidates(public_slug) WHERE public_slug IS NOT NULL;

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_asset_type_check
  CHECK (asset_type IN (
    'santinho','banner','perfurado','social','jingle',
    'stories','colinha','adesivo','capa','status'
  ));

ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_asset_type_check;
ALTER TABLE entitlements ADD CONSTRAINT entitlements_asset_type_check
  CHECK (asset_type IN (
    'santinho','banner','perfurado','social','jingle',
    'stories','colinha','adesivo','capa','status'
  ));

DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO products (type, label, description, price) VALUES
    ('pacote', 'Pacote Campanha Completa',
     'Kit completo: santinho, banner, faixa, posts, stories, colinha, adesivo, capa, jingle e mini-site — pronto para a campanha.',
     49900)
  ON CONFLICT (type) DO UPDATE
  SET description = EXCLUDED.description;
END $$;
