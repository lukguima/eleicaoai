-- Tabela de pagamentos EleiçãoAI
-- Execute no Supabase SQL Editor quando for ativar o Mercado Pago.

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  candidate_id        uuid not null references public.candidates(id) on delete cascade,
  service_type        text not null check (service_type in ('santinho','banner','perfurado','social','jingle')),
  jingle_style        text,
  status              text not null default 'pending'
                        check (status in ('pending','approved','rejected','expired')),
  amount_cents        int  not null,
  mp_preference_id    text unique,
  mp_payment_id       text unique,
  asset_id            uuid references public.assets(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- RLS
alter table public.payments enable row level security;

-- Usuário vê apenas seus próprios pagamentos
drop policy if exists "users_read_own_payments" on public.payments;
create policy "users_read_own_payments"
  on public.payments for select
  using (user_id = auth.uid());

-- Service role tem acesso total (webhooks, etc.)
drop policy if exists "service_role_all_payments" on public.payments;
create policy "service_role_all_payments"
  on public.payments for all
  to service_role
  using (true)
  with check (true);

-- Índices úteis
create index if not exists payments_user_id_idx        on public.payments (user_id);
create index if not exists payments_mp_preference_idx  on public.payments (mp_preference_id);
create index if not exists payments_mp_payment_idx     on public.payments (mp_payment_id);
create index if not exists payments_status_idx         on public.payments (status);
