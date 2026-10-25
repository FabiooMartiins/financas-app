-- Ajustes de 25/10/2026 (tarde): valor por mês nas contas mensais, vários cartões dentro de
-- um mesmo cartão de crédito e dados bancários da conta.

-- Valor de um mês específico (ex.: conta de luz e água), sem mexer nos outros meses
create table bill_amount_overrides (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  bill_id uuid not null references bills on delete cascade,
  reference_month date not null,  -- sempre o dia 1 do mês
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  primary key (bill_id, reference_month)
);

alter table bill_amount_overrides enable row level security;
create policy "dono acessa" on bill_amount_overrides
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cartões dentro do mesmo cartão de crédito: físico, virtual, adicionais (plano família)
alter table accounts
  add column card_names text[] not null default '{}',
  add column bank_branch text check (bank_branch is null or char_length(bank_branch) <= 10),
  add column bank_account text check (bank_account is null or char_length(bank_account) <= 20);

comment on column accounts.card_names is 'Cartão de crédito: nomes dos cartões que usam esta fatura (ex.: Físico, Virtual, Adicional Ana).';
comment on column accounts.bank_branch is 'Conta bancária: agência (só exibição).';
comment on column accounts.bank_account is 'Conta bancária: número da conta com dígito (só exibição).';

alter table transactions
  add column card_name text check (card_name is null or char_length(card_name) <= 40);

-- pay_bill passa a usar o valor do mês quando houver um definido
create or replace function public.pay_bill(
  p_bill_id uuid,
  p_reference_month date,
  p_account_id uuid,
  p_paid_on date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  b bills;
  ref_month date := date_trunc('month', p_reference_month)::date;
  installment int;
  label text;
  amount bigint;
  tx_id uuid;
begin
  select * into b from bills where id = p_bill_id;
  if not found then
    raise exception 'Conta mensal não encontrada';
  end if;

  select o.amount_cents into amount
  from bill_amount_overrides o
  where o.bill_id = p_bill_id and o.reference_month = ref_month;
  amount := coalesce(amount, b.amount_cents);

  label := b.name;
  if b.installments_total is not null then  -- RF-21: "Nome (3/10)"
    installment := (extract(year from ref_month) * 12 + extract(month from ref_month))
                 - (extract(year from b.starts_on) * 12 + extract(month from b.starts_on)) + 1;
    label := format('%s (%s/%s)', b.name, installment, b.installments_total);
  end if;

  insert into transactions (account_id, category_id, type, amount_cents, description, occurred_on)
  values (p_account_id, b.category_id, b.kind::text::transaction_type, amount, label, p_paid_on)
  returning id into tx_id;

  insert into bill_payments (bill_id, reference_month, transaction_id)
  values (p_bill_id, ref_month, tx_id);

  return tx_id;
end;
$$;
