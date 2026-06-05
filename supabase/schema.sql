-- ============================================================
-- EleiçãoAI — Schema do Banco de Dados
-- Executar no Supabase SQL Editor
-- ============================================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: candidates
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados de campanha
  name            TEXT NOT NULL,
  election_number VARCHAR(6) NOT NULL,
  party           TEXT NOT NULL,
  campaign_cnpj   VARCHAR(18) NOT NULL,
  slogan          TEXT,
  biography_summary TEXT NOT NULL,

  -- Dados pessoais (sensíveis — CPF criptografado na app antes de inserir)
  cpf_encrypted   TEXT NOT NULL,

  -- Foto base
  base_photo_url  TEXT,

  -- Preferências visuais
  primary_color   VARCHAR(7) DEFAULT '#1a56db',
  secondary_color VARCHAR(7) DEFAULT '#ffffff',

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: assets
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  asset_type      TEXT NOT NULL CHECK (asset_type IN ('santinho','banner','perfurado','social','jingle')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','done','failed')),

  -- Referência da task externa (Suno taskId ou Higgsfield request_id)
  external_task_id TEXT,

  -- URLs do resultado final
  output_url      TEXT,
  preview_url     TEXT,

  -- Metadados (dimensões, DPI, estilo, etc.)
  metadata        JSONB DEFAULT '{}',

  -- Qual modelo de IA gerou
  ai_model        TEXT,

  -- Letra do jingle (gerada antes da música)
  lyrics          TEXT,

  error_message   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: compliance_logs
-- Append-only — nunca fazer UPDATE ou DELETE aqui
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type      TEXT NOT NULL,  -- IMAGE_GENERATION | JINGLE_GENERATION | LYRICS_GENERATION | EXPORT
  candidate_id    UUID NOT NULL REFERENCES candidates(id),
  asset_id        UUID REFERENCES assets(id),

  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  ai_model        TEXT,
  legal_basis     TEXT DEFAULT 'Consentimento e Execução de Campanha',

  -- Nunca armazenar dados pessoais em texto claro aqui
  ip_address      INET,
  user_agent      TEXT,
  raw_payload     JSONB DEFAULT '{}'
);

-- ============================================================
-- TABELA: subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  plan            TEXT NOT NULL DEFAULT 'starter'
                    CHECK (plan IN ('starter','pro','unlimited')),
  credits_remaining INT NOT NULL DEFAULT 3,  -- 3 créditos trial
  valid_until     TIMESTAMPTZ,

  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE candidates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;

-- candidates: usuário vê e edita apenas os seus próprios
DROP POLICY IF EXISTS "candidates_select" ON candidates;
CREATE POLICY "candidates_select" ON candidates
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "candidates_insert" ON candidates;
CREATE POLICY "candidates_insert" ON candidates
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "candidates_update" ON candidates;
CREATE POLICY "candidates_update" ON candidates
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "candidates_delete" ON candidates;
CREATE POLICY "candidates_delete" ON candidates
  FOR DELETE USING (user_id = auth.uid());

-- assets: via candidate_id (garante isolamento de tenant)
DROP POLICY IF EXISTS "assets_select" ON assets;
CREATE POLICY "assets_select" ON assets
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "assets_insert" ON assets;
CREATE POLICY "assets_insert" ON assets
  FOR INSERT WITH CHECK (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "assets_update" ON assets;
CREATE POLICY "assets_update" ON assets
  FOR UPDATE USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );

-- compliance_logs: somente leitura para o usuário dono
DROP POLICY IF EXISTS "compliance_logs_select" ON compliance_logs;
CREATE POLICY "compliance_logs_select" ON compliance_logs
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );

-- compliance_logs: insert via service_role apenas (backend)
DROP POLICY IF EXISTS "compliance_logs_insert_service" ON compliance_logs;
CREATE POLICY "compliance_logs_insert_service" ON compliance_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- subscriptions
DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_candidates_user_id      ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_candidate_id     ON assets(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assets_status           ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_external_task    ON assets(external_task_id);
CREATE INDEX IF NOT EXISTS idx_compliance_candidate    ON compliance_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_candidate ON subscriptions(candidate_id);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidates_updated_at ON candidates;
CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_assets_updated_at ON assets;
CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNÇÃO: decrementar crédito de forma atômica (evita race condition)
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_credit(p_candidate_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits INT;
BEGIN
  SELECT credits_remaining INTO v_credits
  FROM subscriptions
  WHERE candidate_id = p_candidate_id
  FOR UPDATE;  -- bloqueia a linha durante a transação

  IF v_credits IS NULL OR v_credits <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE subscriptions
  SET credits_remaining = credits_remaining - 1
  WHERE candidate_id = p_candidate_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
