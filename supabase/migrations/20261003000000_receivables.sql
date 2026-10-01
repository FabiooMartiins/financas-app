-- Recebimentos previstos: a mesma tabela de contas do mês, com tipo receita.
-- Marcar como recebido gera a receita na conta escolhida; desmarcar remove (como RN-03).

-- Lançamento único (ex.: freela, reembolso), além de mensal e anual
alter type bill_frequency add value if not exists 'once';

alter table bills add column kind category_kind not null default 'expense';

-- pay_bill passa a gerar receita ou despesa conforme o tipo da conta
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
  tx_id uuid;
begin
  select * into b from bills where id = p_bill_id;
  if not found then
    raise exception 'Conta mensal não encontrada';
  end if;

  label := b.name;
  if b.installments_total is not null then  -- RF-21: "Nome (3/10)"
    installment := (extract(year from ref_month) * 12 + extract(month from ref_month))
                 - (extract(year from b.starts_on) * 12 + extract(month from b.starts_on)) + 1;
    label := format('%s (%s/%s)', b.name, installment, b.installments_total);
  end if;

  insert into transactions (account_id, category_id, type, amount_cents, description, occurred_on)
  values (p_account_id, b.category_id, b.kind::text::transaction_type, b.amount_cents, label, p_paid_on)
  returning id into tx_id;

  insert into bill_payments (bill_id, reference_month, transaction_id)
  values (p_bill_id, ref_month, tx_id);

  return tx_id;
end;
$$;
