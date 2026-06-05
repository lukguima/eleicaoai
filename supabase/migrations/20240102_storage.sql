-- Bucket público para imagens geradas pelo Imagen 4
-- Execute no Supabase SQL Editor após criar o bucket via dashboard.

-- Cria o bucket se ainda não existir
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated',
  'generated',
  true,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/mp4']
)
on conflict (id) do nothing;

-- Service role pode fazer upload (webhooks e API routes)
drop policy if exists "service_role_upload_generated" on storage.objects;
create policy "service_role_upload_generated"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'generated');

drop policy if exists "service_role_update_generated" on storage.objects;
create policy "service_role_update_generated"
  on storage.objects for update
  to service_role
  using (bucket_id = 'generated');

-- Qualquer pessoa pode ler (URLs públicas para preview/download)
drop policy if exists "public_read_generated" on storage.objects;
create policy "public_read_generated"
  on storage.objects for select
  using (bucket_id = 'generated');
