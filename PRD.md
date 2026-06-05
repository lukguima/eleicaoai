# EleiçãoAI — Product Requirements Document (PRD)
**Versão:** 1.1 | **Data:** 2026-05-09 | **Status:** Atualizado (Incluindo Dashboard Admin)

---

## 1. Visão Geral do Produto

O **EleiçãoAI** é uma plataforma self-service que permite a candidatos políticos criarem sua identidade visual, materiais impressos e jingles usando Inteligência Artificial. O diferencial do produto é a **conformidade legal automática** com as regras do TSE (Resolução nº 23.732/2024), garantindo que todo material gerado esteja dentro da lei.

O sistema possui duas frentes principais:
1. **Área do Cliente (Candidato):** Onde ele configura seu perfil e gera os materiais.
2. **Área Administrativa (Admin):** Onde os gestores controlam os clientes, as vendas, os textos do site e os produtos/preços.

---

## 2. Objetivos Estratégicos

- **Conformidade Nativa:** Inserir rótulos de IA automaticamente em todas as peças para evitar cassações.
- **Padronização Técnica:** Gerar arquivos nas dimensões exatas para gráficas e redes sociais.
- **Controle Total:** Permitir que o administrador altere qualquer texto da página de vendas e os preços dos produtos sem precisar mexer no código.

---

## 3. Arquitetura e Módulos do Sistema

### 3.1. Módulo do Candidato (Frontend & Geração)

Permite ao candidato configurar seu perfil e gerar materiais.

#### CRUD de Candidaturas
**Payload de Criação (`POST /api/v1/candidates`):**
```json
{
  "name": "Rafael Costa",
  "election_number": "99",
  "party": "Partido da Tecnologia",
  "campaign_cnpj": "12.345.678/0001-90",
  "biography_summary": "Líder comunitário há 10 anos...",
  "base_photo_url": "https://storage.eleicaoai.com/photos/ref_01.jpg"
}
```

#### Módulo de Imagem (Higgsfield Integration)
Geração de santinhos, banners e perfurados.
- **Regra:** Inserção de marca d'água "Conteúdo fabricado com IA".

#### Módulo de Áudio (Suno API Integration)
Geração de jingles.
- **Regra:** O áudio deve iniciar com a declaração de conformidade.

---

### 3.2. Módulo Administrativo (NOVO)

Permite o controle total da plataforma. Acesso restrito ao e-mail do administrador.

#### 3.2.1. Controle de Clientes (Candidatos)
Visualização de todos os candidatos cadastrados.
- **Endpoint:** `GET /api/v1/admin/candidates`
- **Resposta:** Lista de candidatos com nome, partido, número, CNPJ, etc.

#### 3.2.2. Controle de Compras (Orders)
Visualização de todas as vendas e assinaturas realizadas no site.
- **Endpoint:** `GET /api/v1/admin/orders`
- **Resposta:** Lista de ordens com ID do candidato, plano, créditos, etc.

#### 3.2.3. Edição de Conteúdo (Site Content)
Permite alterar os textos da página de vendas (Hero, títulos, etc.).
- **Endpoint:** `GET /api/v1/admin/content` (Lista conteúdos)
- **Endpoint:** `PUT /api/v1/admin/content` (Atualiza conteúdo)
- **Payload de Atualização:**
```json
{
  "key": "hero",
  "value": {
    "title": "Escolha o que precisa.\nReceba em minutos.",
    "subtitle": "Santinhos, banners, jingles e posts gerados por IA.",
    "badge": "Plataforma self-service"
  }
}
```

#### 3.2.4. Gestão de Produtos e Preços
Permite alterar os preços e descrições dos serviços oferecidos.
- **Endpoint:** `GET /api/v1/admin/products` (Lista produtos)
- **Endpoint:** `PUT /api/v1/admin/products` (Atualiza produto)
- **Payload de Atualização:**
```json
{
  "id": "uuid-do-produto",
  "type": "santinho",
  "label": "Santinho Digital",
  "description": "Santinho em alta definição",
  "price": 2900, // Em centavos (R$ 29,00)
  "active": true
}
```

---

## 4. Modelo de Dados (Supabase)

### Tabelas Originais (Resumo)
- **candidates:** Dados dos candidatos.
- **assets:** Materiais gerados.
- **compliance_logs:** Logs de auditoria LGPD.
- **subscriptions:** Planos e créditos.

### Tabelas do Admin (Novas)
```sql
-- Conteúdo dinâmico do site
CREATE TABLE site_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos e Preços
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- em centavos
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Segurança e Regras de Negócio

- **Autenticação:** Supabase Auth.
- **Autorização Admin:** Hardcoded para o e-mail `lucasguimasilva02@gmail.com` nas rotas de API do admin para esta fase.
- **RLS (Row Level Security):** Ativado para garantir que um candidato não veja os dados de outro.
- **Service Role:** As rotas de API do admin utilizam a `service_role` para poder listar todos os dados e atualizar conteúdos, mas validam o e-mail do usuário logado antes de executar a ação.

---

## 6. Critérios de Aceite para Materiais

1. Dimensões corretas.
2. Presença do rótulo de IA (15% opacidade).
3. Rodapé legal com CNPJ (para impressos).
4. Registro no log de compliance.
