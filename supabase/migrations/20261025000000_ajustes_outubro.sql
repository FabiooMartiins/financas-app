-- Ajustes de 25/10/2026: cartões, caixinhas/investimentos, saldo total, ajuste de saldo,
-- logos das contas e perfil com foto e tema (RF-27 a RF-34, RN-07, RN-09 a RN-11).

-- Caixinha do Nubank e outros investimentos de resgate livre — RF-28
alter type account_type add value if not exists 'investment';

alter table accounts
  -- RF-32: caminho do logo no bucket privado "logos" (<user_id>/<arquivo>)
  add column logo_path text,
  -- RN-07: só contas bancárias e carteira entram no saldo total; dá para tirar uma delas
  add column include_in_total boolean not null default true,
  -- Anotação do rendimento combinado, ex.: "100% do CDI" (só exibição)
  add column yield_note text check (yield_note is null or char_length(yield_note) <= 40);

-- RN-10: rendimentos e ajustes de saldo mexem no saldo, mas não são receita nem despesa
create type transaction_nature as enum ('normal', 'adjustment', 'yield');
alter table transactions add column nature transaction_nature not null default 'normal';
alter table transactions
  add constraint transactions_nature_not_transfer
  check (nature = 'normal' or type <> 'transfer');

-- Perfil — RF-33, RF-34 ---------------------------------------------------------
create table profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 80),
  nickname text check (nickname is null or char_length(nickname) <= 30),
  phone text check (phone is null or char_length(phone) <= 20),
  birth_date date,
  occupation text check (occupation is null or char_length(occupation) <= 60),
  monthly_income_cents bigint check (monthly_income_cents is null or monthly_income_cents >= 0),
  financial_goal text check (financial_goal is null or char_length(financial_goal) <= 120),
  avatar_path text,  -- caminho no bucket privado "avatars"
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "dono acessa" on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fotos de perfil e logos: buckets privados, cada usuário só mexe na própria pasta.
-- A tela usa URLs assinadas temporárias (RNF-06: nada fica público).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('logos', 'logos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "dono lê as próprias imagens" on storage.objects
  for select to authenticated
  using (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono envia as próprias imagens" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono troca as próprias imagens" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono apaga as próprias imagens" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = auth.uid()::text);
