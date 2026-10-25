// Dados de exemplo para as capturas de tela (nada disso vai para o banco real).
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const day = (offset) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
const month = (offset, d) => iso(new Date(now.getFullYear(), now.getMonth() + offset, d));

export const user = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'fabio@exemplo.com',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: month(-6, 1) + 'T12:00:00Z',
};

const acc = (id, name, type, balance, extra = {}) => ({
  id,
  name,
  type,
  balance_cents: balance,
  is_active: true,
  connection_id: null,
  created_at: month(-6, 1) + 'T12:00:00Z',
  credit_limit_cents: null,
  closing_day: null,
  due_day: null,
  logo_path: null,
  include_in_total: true,
  yield_note: null,
  connection: null,
  ...extra,
});

export const accounts = [
  acc('a1', 'Conta corrente Itaú', 'checking', 0),
  acc('a2', 'Carteira', 'wallet', 0),
  acc('a3', 'Nubank', 'credit_card', 0, { credit_limit_cents: 500000, closing_day: 3, due_day: 10, include_in_total: false }),
  acc('a4', 'Poupança', 'savings', 340000, { include_in_total: false }),
  acc('a5', 'Caixinha Nubank', 'investment', 145000, { include_in_total: false, yield_note: '100% do CDI' }),
];

export const categories = [
  { id: 'c1', name: 'Salário', kind: 'income', color: '#0E6B58', parent_id: null },
  { id: 'c2', name: 'Alimentação', kind: 'expense', color: '#2F6FB0', parent_id: null },
  { id: 'c3', name: 'Transporte', kind: 'expense', color: '#D07A2B', parent_id: null },
  { id: 'c4', name: 'Lazer', kind: 'expense', color: '#8A5CB8', parent_id: null },
  { id: 'c5', name: 'Saúde', kind: 'expense', color: '#5B8A2E', parent_id: null },
  { id: 'c6', name: 'Moradia', kind: 'expense', color: '#B4410F', parent_id: null },
  { id: 'c7', name: 'Contas da casa', kind: 'expense', color: '#9AA39E', parent_id: null },
  { id: 'c8', name: 'Eletrônicos', kind: 'expense', color: '#C2477E', parent_id: null },
];

const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
let seq = 0;
const tx = (type, amount, description, occurred_on, account_id, opts = {}) => {
  seq += 1;
  const t = {
    id: `t${seq}`,
    type,
    nature: opts.nature ?? 'normal',
    amount_cents: amount,
    description,
    occurred_on,
    source: 'manual',
    account_id,
    transfer_account_id: opts.to ?? null,
    category_id: opts.cat ?? null,
    created_at: `${occurred_on}T12:${pad(seq % 60)}:00Z`,
  };
  t.account = { id: account_id, name: accById[account_id].name };
  t.transfer_account = t.transfer_account_id ? { id: t.transfer_account_id, name: accById[t.transfer_account_id].name } : null;
  t.category = t.category_id ? { id: t.category_id, ...catById[t.category_id] } : null;
  return t;
};

export const transactions = [
  // Mês atual — conta corrente e carteira
  tx('income', 620000, 'Salário', month(0, 5), 'a1', { cat: 'c1' }),
  tx('expense', 150000, 'Aluguel', month(0, 1), 'a1', { cat: 'c6' }),
  tx('expense', 23847, 'Supermercado', day(0), 'a1', { cat: 'c2' }),
  tx('transfer', 50000, 'Guardar na caixinha', day(-1), 'a1', { to: 'a5' }),
  tx('expense', 5490, 'Cinema', day(-1), 'a2', { cat: 'c4' }),
  tx('income', 3160, 'Ajuste de saldo', day(-1), 'a1', { nature: 'adjustment' }),
  tx('transfer', 66000, 'Pagamento fatura — Nubank', month(0, 9), 'a1', { to: 'a3' }),
  // Cartão Nubank — fatura aberta (fecha dia 3)
  tx('expense', 2790, 'Aplicativo de transporte', day(0), 'a3', { cat: 'c3' }),
  tx('expense', 6430, 'Farmácia', month(0, 8), 'a3', { cat: 'c5' }),
  tx('expense', 3990, 'Streaming', month(0, 6), 'a3', { cat: 'c4' }),
  tx('expense', 79350, 'Mercado do mês', month(0, 20), 'a3', { cat: 'c2' }),
  ...Array.from({ length: 8 }, (_, i) => tx('expense', 32000, `Notebook (${i + 3}/10)`, month(i, 12), 'a3', { cat: 'c8' })),
  // Fatura anterior (paga no dia 9)
  tx('expense', 66000, 'Mercado do mês', month(-1, 20), 'a3', { cat: 'c2' }),
  // Investimentos
  tx('income', 66, 'Rendimento', day(0), 'a5', { nature: 'yield' }),
  tx('income', 1914, 'Rendimento', month(0, 10), 'a5', { nature: 'yield' }),
  tx('income', 3020, 'Rendimento', month(-1, 10), 'a5', { nature: 'yield' }),
  tx('income', 1840, 'Rendimento', month(0, 15), 'a4', { nature: 'yield' }),
  tx('income', 4100, 'Rendimento', month(-1, 15), 'a4', { nature: 'yield' }),
  tx('income', 4060, 'Rendimento', month(-2, 15), 'a4', { nature: 'yield' }),
  // Meses anteriores (para o gráfico de relatórios)
  ...[-1, -2, -3, -4, -5].flatMap((m) => [
    tx('income', 620000, 'Salário', month(m, 5), 'a1', { cat: 'c1' }),
    tx('expense', 150000, 'Aluguel', month(m, 1), 'a1', { cat: 'c6' }),
    tx('expense', 90000 + Math.abs(m) * 17000, 'Mercado', month(m, 18), 'a1', { cat: 'c2' }),
    tx('expense', 11990, 'Internet', month(m, 28), 'a1', { cat: 'c7' }),
    tx('expense', 25000 + Math.abs(m) * 6000, 'Lazer', month(m, 22), 'a2', { cat: 'c4' }),
  ]),
];

// Saldo de cada conta = saldo inicial + movimentações (como a view account_balances)
export function balances() {
  return accounts.map((a) => {
    let total = a.balance_cents;
    for (const t of transactions) {
      if (t.type === 'transfer') {
        if (t.transfer_account_id === a.id) total += t.amount_cents;
        if (t.account_id === a.id) total -= t.amount_cents;
      } else if (t.account_id === a.id) total += t.type === 'income' ? t.amount_cents : -t.amount_cents;
    }
    // Conta corrente e carteira: saldos de hoje como no design
    if (a.id === 'a1') total = 591840;
    if (a.id === 'a2') total = 26010;
    return { account_id: a.id, current_balance_cents: total };
  });
}

export const bills = [
  { id: 'b1', kind: 'expense', name: 'Aluguel', amount_cents: 150000, due_day: 1, frequency: 'monthly', category_id: 'c6', account_id: 'a1', remind_days_before: 3, installments_total: null, starts_on: month(-6, 1), is_active: true, category: { id: 'c6', ...catById.c6 }, account: { id: 'a1', name: accById.a1.name } },
  { id: 'b2', kind: 'expense', name: 'Internet', amount_cents: 11990, due_day: 28, frequency: 'monthly', category_id: 'c7', account_id: 'a1', remind_days_before: 3, installments_total: null, starts_on: month(-6, 1), is_active: true, category: { id: 'c7', ...catById.c7 }, account: { id: 'a1', name: accById.a1.name } },
  { id: 'b3', kind: 'income', name: 'Freela de design', amount_cents: 80000, due_day: 30, frequency: 'once', category_id: 'c1', account_id: 'a1', remind_days_before: 3, installments_total: null, starts_on: month(0, 1), is_active: true, category: { id: 'c1', ...catById.c1 }, account: { id: 'a1', name: accById.a1.name } },
];

// Aluguel e internet pagos nos meses anteriores; aluguel também neste mês
export const billPayments = [
  ...[-6, -5, -4, -3, -2, -1, 0].map((m) => ({ bill_id: 'b1', reference_month: month(m, 1), transaction_id: null, paid_at: month(m, 1) + 'T12:00:00Z', transaction: { occurred_on: month(m, 1), account: { name: accById.a1.name } } })),
  ...[-6, -5, -4, -3, -2, -1].map((m) => ({ bill_id: 'b2', reference_month: month(m, 1), transaction_id: null, paid_at: month(m, 28) + 'T12:00:00Z', transaction: { occurred_on: month(m, 28), account: { name: accById.a1.name } } })),
];

export const profile = {
  user_id: user.id,
  full_name: 'Fabio Martins',
  nickname: 'Fabio',
  phone: '(82) 90000-0000',
  birth_date: null,
  occupation: 'Farmacêutico',
  monthly_income_cents: 620000,
  financial_goal: 'Reserva de emergência de R$ 20.000',
  avatar_path: null,
  theme: 'dark',
  updated_at: now.toISOString(),
};
