-- Regras de negócio no banco: saldos, pagamento de contas mensais e
-- proteção das transações importadas.

-- Transferência precisa ir para outra conta — RF-13
alter table transactions
  add constraint transactions_transfer_other_account
  check (transfer_account_id is null or transfer_account_id <> account_id);

-- Excluir a transação de um pagamento desfaz o pagamento (inverso do RN-03)
alter table bill_payments drop constraint bill_payments_transaction_id_fkey;
alter table bill_payments
  add constraint bill_payments_transaction_id_fkey
  foreign key (transaction_id) references transactions on delete cascade;

-- Saldo atual por conta — RF-04, RF-05 ---------------------------------------
-- Contas manuais: balance_cents é o saldo inicial + movimentações.
-- Contas do banco (Open Finance): balance_cents já é o saldo informado pelo banco.
create view account_balances with (security_invoker = true) as
select
  a.id as account_id,
  (case
    when a.connection_id is not null then a.balance_cents
    else a.balance_cents + coalesce((
      select sum(case
        when t.type = 'income' and t.account_id = a.id then t.amount_cents
        when t.type = 'expense' and t.account_id = a.id then -t.amount_cents
        when t.type = 'transfer' and t.account_id = a.id then -t.amount_cents
        when t.type = 'transfer' and t.transfer_account_id = a.id then t.amount_cents
        else 0
      end)
      from transactions t
      where t.account_id = a.id or t.transfer_account_id = a.id
    ), 0)
  end)::bigint as current_balance_cents
from accounts a;

-- Pagamento de conta mensal — RF-18, RN-03 -----------------------------------
-- Marcar como paga gera a transação de despesa e o registro do pagamento juntos.
create function public.pay_bill(
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
  values (p_account_id, b.category_id, 'expense', b.amount_cents, label, p_paid_on)
  returning id into tx_id;

  insert into bill_payments (bill_id, reference_month, transaction_id)
  values (p_bill_id, ref_month, tx_id);

  return tx_id;
end;
$$;

-- Desmarcar remove a transação gerada — RN-03
create function public.unpay_bill(p_bill_id uuid, p_reference_month date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  tx_id uuid;
begin
  delete from bill_payments
  where bill_id = p_bill_id and reference_month = date_trunc('month', p_reference_month)::date
  returning transaction_id into tx_id;

  if tx_id is not null then
    delete from transactions where id = tx_id;
  end if;
end;
$$;

-- Transações importadas: só categoria e descrição são editáveis — RN-05 ------
-- A Edge Function (service_role) continua podendo atualizar o que vem do banco.
create function public.protect_bank_transactions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and old.source = 'bank' then
    if (new.account_id, new.transfer_account_id, new.type, new.amount_cents, new.occurred_on, new.source, new.external_id)
       is distinct from
       (old.account_id, old.transfer_account_id, old.type, old.amount_cents, old.occurred_on, old.source, old.external_id) then
      raise exception 'Transações importadas do banco: só categoria e descrição podem ser alteradas';
    end if;
  elsif tg_op = 'DELETE' and old.source = 'bank'
        -- exclusão em cascata (conta ou conexão removida) continua permitida
        and exists (select 1 from accounts where id = old.account_id) then
    raise exception 'Transações importadas do banco não podem ser excluídas';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger protect_bank_transactions
  before update or delete on transactions
  for each row execute function public.protect_bank_transactions();
