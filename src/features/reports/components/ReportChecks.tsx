import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import type { Account } from '@/features/accounts/api';
import { useUpdateTransaction } from '@/features/transactions/hooks/useTransactions';
import { formatDayMonth, toISODate } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import type { Movement } from '../api';
import type { ReportIssues } from '../checks';

/** Avisos do que provavelmente está inflando os totais do mês, com a correção à mão. */
export function ReportChecks({ issues, accounts, month }: { issues: ReportIssues; accounts: Account[]; month: Date }) {
  const { payments, duplicates, uncategorized } = issues;
  if (payments.length === 0 && duplicates.length === 0 && uncategorized.count === 0) return null;
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-display font-semibold">Conferência do mês</h2>
        <p className="text-sm text-muted">Itens que podem deixar os totais maiores ou nas categorias erradas.</p>
      </div>

      {payments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-expense">
            {payments.length === 1 ? 'Pagamento de fatura contado' : 'Pagamentos de fatura contados'} como{' '}
            {payments.every((m) => m.type === 'income') ? 'receita' : 'despesa'}
          </h3>
          <p className="text-sm text-muted">
            A compra no cartão já conta como despesa. O pagamento da fatura é uma transferência entre suas contas; como despesa, o gasto conta em
            dobro.
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {payments.map((m) => (
              <PaymentFix key={m.id} movement={m} accounts={accounts} accountName={nameOf(m.account_id)} />
            ))}
          </ul>
        </section>
      )}

      {duplicates.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-expense">Possivelmente lançados duas vezes</h3>
          <p className="text-sm text-muted">Lançamento feito à mão e o mesmo importado do extrato. Abra um deles e exclua.</p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {duplicates.map(({ manual, imported }) => (
              <li key={manual.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
                <p className="flex justify-between gap-3">
                  <span className="truncate font-semibold">{manual.description}</span>
                  <span className="shrink-0 font-display font-semibold">{formatCents(manual.amount_cents)}</span>
                </p>
                <p className="flex flex-wrap gap-x-4">
                  <Link to={`/transacoes/${manual.id}`} className="flex min-h-11 items-center font-semibold text-brand underline">
                    À mão · {formatDayMonth(manual.occurred_on)}
                  </Link>
                  <Link to={`/transacoes/${imported.id}`} className="flex min-h-11 items-center font-semibold text-brand underline">
                    Importado · {formatDayMonth(imported.occurred_on)}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {uncategorized.count > 0 && (
        <p className="text-sm">
          <strong>
            {uncategorized.count} {uncategorized.count === 1 ? 'despesa sem categoria' : 'despesas sem categoria'}
          </strong>{' '}
          ({formatCents(uncategorized.cents)}).{' '}
          <Link to={`/transacoes?mes=${toISODate(month).slice(0, 7)}`} className="font-semibold text-brand underline">
            Categorizar em Transações
          </Link>
        </p>
      )}
    </Card>
  );
}

function PaymentFix({ movement: m, accounts, accountName }: { movement: Movement; accounts: Account[]; accountName: string }) {
  const update = useUpdateTransaction();
  const onCard = m.type === 'income'; // receita no cartão = pagamento recebido
  // Conta: o pagamento foi PARA um cartão. Cartão: o pagamento veio DE uma conta
  const options = accounts.filter((a) => a.is_active && a.id !== m.account_id && (onCard ? a.type !== 'credit_card' : a.type === 'credit_card'));
  const [otherId, setOtherId] = useState(options[0]?.id ?? '');

  function fix() {
    update.mutate({
      id: m.id,
      input: onCard
        ? { type: 'transfer', account_id: otherId, transfer_account_id: m.account_id, category_id: null }
        : { type: 'transfer', transfer_account_id: otherId, category_id: null },
    });
  }

  return (
    <li className="flex flex-col gap-2 px-3 py-2 text-sm">
      <p className="flex justify-between gap-3">
        <Link to={`/transacoes/${m.id}`} className="min-w-0 truncate font-semibold underline">
          {m.description}
        </Link>
        <span className="shrink-0 font-display font-semibold">{formatCents(m.amount_cents)}</span>
      </p>
      <p className="text-muted">
        {formatDayMonth(m.occurred_on)} · {accountName}
      </p>
      {options.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <select
            aria-label={onCard ? 'Pago a partir da conta' : 'Cartão pago'}
            className="h-11 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-2 text-base"
            value={otherId}
            onChange={(e) => setOtherId(e.target.value)}
          >
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {onCard ? `Pago com ${a.name}` : `Pagamento do ${a.name}`}
              </option>
            ))}
          </select>
          <Button className="h-11 px-4 text-sm" disabled={!otherId || update.isPending} onClick={fix}>
            {update.isPending ? 'Salvando…' : 'Virar transferência'}
          </Button>
        </div>
      ) : (
        <p className="text-muted">Cadastre a {onCard ? 'conta de onde sai o pagamento' : 'conta do cartão'} para corrigir.</p>
      )}
      {update.error && <ErrorState error={update.error} />}
    </li>
  );
}
