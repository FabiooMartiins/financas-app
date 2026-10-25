-- Cartão que vence N dias depois do fechamento (ex.: fecha no último dia do mês e vence 7 dias depois).
-- Quando preenchido, tem prioridade sobre due_day. Vencimento em dia não útil passa para o próximo
-- dia útil (calculado no cliente, features/cards/invoices.ts).
alter table accounts
  add column due_days_after_closing smallint check (due_days_after_closing between 1 and 40);

comment on column accounts.closing_day is 'Cartão: dia do fechamento (31 = último dia do mês). Compras a partir deste dia entram na fatura seguinte.';
comment on column accounts.due_days_after_closing is 'Cartão: vencimento N dias depois do fechamento (prioridade sobre due_day).';
