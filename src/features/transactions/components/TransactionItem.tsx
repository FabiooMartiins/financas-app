import { Link } from 'react-router';
import { formatCents, formatSignedCents } from '@/lib/money';
import type { TransactionRow } from '../api';

/** Uma linha da lista de transações. Transferências aparecem neutras (RN-01). */
export function TransactionItem({ transaction: t, showDate }: { transaction: TransactionRow; showDate?: string }) {
  const isTransfer = t.type === 'transfer';
  // RN-10: rendimento e ajuste aparecem identificados (não entram em receitas/despesas)
  const natureLabel = t.nature === 'yield' ? 'Rendimento' : t.nature === 'adjustment' ? 'Ajuste de saldo' : null;
  const subtitle = isTransfer
    ? `${t.account?.name ?? '?'} → ${t.transfer_account?.name ?? '?'}`
    : [natureLabel ?? t.category?.name ?? 'Sem categoria', t.account?.name].filter(Boolean).join(' · ');

  return (
    <Link to={`/transacoes/${t.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: isTransfer ? '#5B6660' : (t.category?.color ?? '#9AA39E') }}
        aria-hidden="true"
      >
        {isTransfer ? '⇄' : (t.category?.name ?? t.description).charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{t.description}</p>
        <p className="truncate text-sm text-muted">
          {showDate && `${showDate} · `}
          {subtitle}
          {t.source === 'bank' && ' · Banco'}
        </p>
      </div>
      <p
        className={`shrink-0 font-display font-semibold ${
          t.type === 'income' ? 'text-income' : t.type === 'expense' ? 'text-expense' : 'text-muted'
        }`}
      >
        {isTransfer ? formatCents(t.amount_cents) : formatSignedCents(t.amount_cents, t.type as 'income' | 'expense')}
      </p>
    </Link>
  );
}
