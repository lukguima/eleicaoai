-- ============================================================
-- EleiçãoAI — Schema Adicional para Dashboard Administrativo
-- Executar no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TABELA: site_content
-- ============================================================
CREATE TABLE IF NOT EXISTS site_content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key             TEXT UNIQUE NOT NULL,
  value           JSONB NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT UNIQUE NOT NULL, -- ex: 'santinho', 'jingle'
  label           TEXT NOT NULL,
  description     TEXT,
  price           INT NOT NULL, -- em centavos
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;

-- Políticas para site_content
DROP POLICY IF EXISTS "site_content_select_public" ON site_content;
CREATE POLICY "site_content_select_public" ON site_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_content_admin_all" ON site_content;
CREATE POLICY "site_content_admin_all" ON site_content
  FOR ALL USING (auth.jwt() ->> 'email' = 'lucasguimasilva02@gmail.com');

-- Políticas para products
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_admin_all" ON products;
CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (auth.jwt() ->> 'email' = 'lucasguimasilva02@gmail.com');

-- ============================================================
-- Inserção de dados iniciais (Seed)
-- ============================================================

-- Seed para site_content (Textos da Home)
INSERT INTO site_content (key, value) VALUES
('hero', '{
  "title": "Escolha o que precisa.\nReceba em minutos.",
  "subtitle": "Santinhos, banners, jingles e posts gerados por IA — com conformidade automática à Resolução TSE nº 23.732/2024.",
  "badge": "Plataforma self-service · IA para campanhas políticas"
}')
ON CONFLICT (key) DO NOTHING;

-- Seed para products (Baseado em pricing.ts)
INSERT INTO products (type, label, description, price) VALUES
('santinho', 'Santinho', 'Material impresso padrão de campanha, pronto para gráfica.', 2900),
('banner', 'Banner', 'Banner vertical para fachada, evento ou stand de campanha.', 2900),
('perfurado', 'Faixa Perfurada', 'Faixa horizontal para fachadas, muros e espaços abertos.', 3900),
('social', 'Post para Redes Sociais', 'Imagem quadrada para Instagram, Facebook e WhatsApp.', 1900),
('jingle', 'Jingle de Campanha', 'Música original com letra personalizada gerada por IA.', 4900)
ON CONFLICT (type) DO NOTHING;
