// Rendimento e lucro dos investimentos (poupança e caixinhas) — RF-29, RN-09.
//
// Lucro = saldo atual − valor aplicado, onde
//   valor aplicado = saldo inicial do cadastro + aportes − resgates
//   aportes  = transferências que entram + receitas normais na conta
//   resgates = transferências que saem  + despesas normais na conta
// Rendimentos e ajustes de saldo (nature 'yield' / 'adjustment') não são aporte nem
// resgate: são justamente o que a aplicação rendeu (ou perdeu).
import type { Account } from '@/features/accounts/api';

export interface InvestmentMovement {
  type: 'income' | 'expense' | 'transfer';
  nature: 'normal' | 'adjustment' | 'yield';
  amount_cents: number;
  occurred_on: string;
  account_id: string;
  transfer_account_id: string | null;
}

export interface InvestmentSummary {
  account: Account;
  investedCents: number;
  profitCents: number;
  /** Rentabilidade acumulada (0.0294 = 2,94%); null quando não há valor aplicado */
  profitRate: number | null;
  /** Rendimentos e ajustes lançados no mês de `monthPrefix` */
  monthYieldCents: number;
}

export function summarizeInvestment(account: Account, movements: InvestmentMovement[], monthPrefix: string): InvestmentSummary {
  // Conta do banco: o saldo inicial é o saldo informado pelo banco, não um aporte conhecido
  let invested = account.fromBank ? 0 : account.balance_cents;
  let monthYield = 0;

  for (const m of movements) {
    const isOwn = m.account_id === account.id;
    const isTarget = m.transfer_account_id === account.id;
    if (!isOwn && !isTarget) continue;

    if (m.type === 'transfer') {
      if (isTarget) invested += m.amount_cents;
      else invested -= m.amount_cents;
      continue;
    }
    const signed = m.type === 'income' ? m.amount_cents : -m.amount_cents;
    if (m.nature === 'normal') invested += signed;
    else if (m.occurred_on.startsWith(monthPrefix)) monthYield += signed;
  }

  const profit = account.current_balance_cents - invested;
  return {
    account,
    investedCents: invested,
    profitCents: profit,
    profitRate: invested > 0 ? profit / invested : null,
    monthYieldCents: monthYield,
  };
}

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 0.0294 -> "+2,94%" */
export function formatRate(rate: number): string {
  return `${rate >= 0 ? '+' : '−'}${percent.format(Math.abs(rate))}`;
}
