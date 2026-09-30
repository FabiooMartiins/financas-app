-- Esquema inicial — App de Controle Financeiro
-- Valores monetários em centavos (bigint) — RNF-12
-- RLS em todas as tabelas: cada usuário vê só os próprios dados — RNF-02

-- Tipos -------------------------------------------------------------------
create type account_type as enum ('checking', 'savings', 'credit_card', 'wallet');
create type transaction_type as enum ('income', 'expense', 'transfer');
create type transaction_source as enum ('manual', 'bank');
create type category_kind as enum ('income', 'expense');
create type bill_frequency as enum ('monthly', 'yearly');

-- Conexões bancárias (Open Finance via agregador) — RF-06 a RF-10 -----------
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  provider text not null,                 -- 'pluggy' | 'belvo'
  external_item_id text not null,
  institution_name text not null,
  status text not null default 'active',  -- active | error | expired
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider, external_item_id)
);

-- Contas — RF-04, RF-05 -----------------------------------------------------
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  connection_id uuid references bank_connections on delete cascade,
  name text not null,
  type account_type not null,
  balance_cents bigint not null default 0,
  external_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, external_id)
);

-- Categorias — RF-16 --------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  parent_id uuid references categories on delete restrict,
  name text not null,
  kind category_kind not null,
  color text not null default '#9AA39E',
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

-- Contas mensais / recorrentes — RF-17 --------------------------------------
create table bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  due_day smallint not null check (due_day between 1 and 31),
  frequency bill_frequency not null default 'monthly',
  category_id uuid references categories on delete set null,
  account_id uuid references accounts on delete set null,
  remind_days_before smallint not null default 3,  -- RF-20
  installments_total smallint,                     -- RF-21 (null = sem fim)
  starts_on date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Transações — RF-11 a RF-15 ------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  transfer_account_id uuid references accounts on delete cascade,  -- RF-13
  category_id uuid references categories on delete restrict,       -- RN-06
  type transaction_type not null,
  amount_cents bigint not null check (amount_cents > 0),
  description text not null,
  occurred_on date not null,
  source transaction_source not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  unique (user_id, external_id),  -- RNF-13: sem duplicar importações
  check (type <> 'transfer' or transfer_account_id is not null)
);
create index transactions_user_date_idx on transactions (user_id, occurred_on desc);

-- Pagamentos de contas mensais — RF-18, RN-03 --------------------------------
create table bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  bill_id uuid not null references bills on delete cascade,
  reference_month date not null,  -- sempre o dia 1 do mês
  transaction_id uuid references transactions on delete set null,
  paid_at timestamptz not null default now(),
  unique (bill_id, reference_month)
);

-- RLS ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['bank_connections','accounts','categories','bills','transactions','bill_payments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "dono acessa" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Categorias padrão para cada novo usuário -----------------------------------
create function public.create_default_categories()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into categories (user_id, name, kind, color) values
    (new.id, 'Salário', 'income', '#0E6B58'),
    (new.id, 'Outras receitas', 'income', '#0E6B58'),
    (new.id, 'Moradia', 'expense', '#0E6B58'),
    (new.id, 'Alimentação', 'expense', '#2F6FB0'),
    (new.id, 'Transporte', 'expense', '#D07A2B'),
    (new.id, 'Lazer', 'expense', '#8A5CB8'),
    (new.id, 'Saúde', 'expense', '#9AA39E'),
    (new.id, 'Contas da casa', 'expense', '#9AA39E'),
    (new.id, 'Outros', 'expense', '#9AA39E');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_default_categories();
