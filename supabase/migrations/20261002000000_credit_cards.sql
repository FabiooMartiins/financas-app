-- Cartão de crédito: limite, fechamento e vencimento da fatura (RN-02)
alter table accounts
  add column credit_limit_cents bigint check (credit_limit_cents is null or credit_limit_cents >= 0),
  add column closing_day smallint check (closing_day between 1 and 31),
  add column due_day smallint check (due_day between 1 and 31);

comment on column accounts.closing_day is 'Cartão: dia do fechamento. Compras a partir deste dia entram na fatura seguinte.';
comment on column accounts.due_day is 'Cartão: dia do vencimento. Se for menor ou igual ao fechamento, vence no mês seguinte.';
