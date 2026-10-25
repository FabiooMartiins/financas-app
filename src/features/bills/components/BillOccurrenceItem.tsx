import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/States';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { formatDate, formatDayMonth, today } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { usePayBill, useUnpayBill } from '../hooks/useBills';
import { describeDue, type BillOccurrence, type BillStatus } from '../schedule';

const badge: Record<BillStatus, string> = {
  paid: 'bg-brand/10 text-brand',
  overdue: 'bg-expense-soft text-expense',
  'due-soon': 'bg-warn-soft text-warn',
  upcoming: 'bg-ground text-muted',
};

/** Uma conta (a pagar ou a receber) no mês, com marcar/desmarcar (RF-18, RN-03). */
export function BillOccurrenceItem({ occurrence: o, showMonth }: { occurrence: BillOccurrence; showMonth?: boolean }) {
  const [paying, setPaying] = useState(false);
  const [confirmUnpay, setConfirmUnpay] = useState(false);
  const unpay = useUnpayBill();
  const isIncome = o.bill.kind === 'income';
  const paid = o.status === 'paid';
  const action = isIncome ? (paid ? 'Desmarcar recebimento de' : 'Marcar como recebido:') : paid ? 'Desmarcar pagamento de' : 'Marcar como paga:';

  return (
    <div className="flex flex-col gap-3 py-2 pr-4 pl-1">
      <div className="flex items-center gap-1">
        {/* Círculo de marcar (RF-18, RN-03): vazio = em aberto, cheio = paga/recebido */}
        <button
          type="button"
          aria-label={`${action} ${o.bill.name}`}
          aria-pressed={paid}
          disabled={unpay.isPending}
          onClick={() => (paid ? setConfirmUnpay((v) => !v) : setPaying((v) => !v))}
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-ground"
        >
          <span
            className={`flex size-6 items-center justify-center rounded-full border-2 ${
              paid ? 'border-brand bg-brand text-on-brand' : o.status === 'overdue' ? 'border-expense' : 'border-line-strong'
            }`}
          >
            {paid && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </span>
        </button>
        <Link to={`/vencimentos/${o.bill.id}`} className="ml-1 min-w-0 flex-1">
          <p className="truncate font-semibold">
            {o.bill.name}
            {o.installment && <span className="font-normal text-muted"> · {o.installment}</span>}
          </p>
          <p className="truncate text-sm text-muted">
            {showMonth ? formatDate(o.dueDate) : `Dia ${formatDayMonth(o.dueDate)}`}
            {o.payment?.transaction && ` · ${isIncome ? 'recebido' : 'paga'} em ${formatDayMonth(o.payment.transaction.occurred_on)}`}
            {o.payment?.transaction?.account && ` (${o.payment.transaction.account.name})`}
            {isIncome && !o.payment && o.bill.account && ` · em ${o.bill.account.name}`}
          </p>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className={`font-display font-semibold ${isIncome ? 'text-income' : ''}`}>
            {isIncome && '+ '}
            {formatCents(o.bill.amount_cents)}
          </p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge[o.status]}`}>{describeDue(o)}</span>
        </div>
      </div>

      {unpay.error && <ErrorState error={unpay.error} />}
      {paid && confirmUnpay && (
        <div className="ml-12 flex flex-wrap items-center gap-x-4 text-sm">
          <span className="text-muted">Desmarcar apaga a transação gerada.</span>
          <button type="button" className="min-h-11 font-semibold text-muted" onClick={() => setConfirmUnpay(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="min-h-11 font-semibold text-expense"
            disabled={unpay.isPending}
            onClick={() => unpay.mutate({ billId: o.bill.id, month: o.month }, { onSuccess: () => setConfirmUnpay(false) })}
          >
            {unpay.isPending ? 'Desmarcando…' : 'Desmarcar'}
          </button>
        </div>
      )}
      {!paid && paying && (
        <div className="pl-3">
          <PayForm occurrence={o} onDone={() => setPaying(false)} />
        </div>
      )}
    </div>
  );
}

function PayForm({ occurrence: o, onDone }: { occurrence: BillOccurrence; onDone: () => void }) {
  const { data: accounts } = useAccounts();
  const pay = usePayBill();
  const isIncome = o.bill.kind === 'income';
  // Recebimento cai numa conta de verdade, não no cartão
  const usable = accounts?.filter((a) => a.is_active && (!isIncome || a.type !== 'credit_card')) ?? [];
  const [chosenAccountId, setAccountId] = useState('');
  const accountId = chosenAccountId || o.bill.account_id || usable[0]?.id || '';
  // Mês passado ou futuro: sugere a data de vencimento; mês atual: hoje
  const todayIso = today();
  const [paidOn, setPaidOn] = useState(todayIso.slice(0, 7) === o.dueDate.slice(0, 7) ? todayIso : o.dueDate);

  if (accounts && usable.length === 0) {
    return (
      <p className="text-sm text-muted">
        Cadastre uma conta em <Link to="/contas/nova" className="font-semibold text-brand underline">Contas</Link> para registrar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label={isIncome ? 'Recebido em' : 'Pago com'} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {usable.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Input label={isIncome ? 'Data do recebimento' : 'Data do pagamento'} type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
      </div>
      {pay.error && <ErrorState error={pay.error} />}
      <div className="flex gap-2">
        <Button variant="secondary" className="h-11 flex-1 text-sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          className="h-11 flex-1 text-sm"
          disabled={!accountId || !paidOn || pay.isPending}
          onClick={() => pay.mutate({ billId: o.bill.id, month: o.month, accountId, paidOn }, { onSuccess: onDone })}
        >
          {pay.isPending ? 'Salvando…' : isIncome ? 'Confirmar recebimento' : 'Confirmar pagamento'}
        </Button>
      </div>
    </div>
  );
}
