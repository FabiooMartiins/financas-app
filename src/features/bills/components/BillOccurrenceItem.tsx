import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/States';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { formatDate, formatDayMonth, formatMonthYear, today } from '@/lib/dates';
import { centsToInput, formatCents, parseToCents } from '@/lib/money';
import { usePayBill, useSetAmountOverride, useUnpayBill } from '../hooks/useBills';
import { describeDue, type BillOccurrence, type BillStatus } from '../schedule';

const badge: Record<BillStatus, string> = {
  paid: 'bg-brand/10 text-brand',
  overdue: 'bg-expense-soft text-expense',
  'due-soon': 'bg-warn-soft text-warn',
  upcoming: 'bg-ground text-muted',
};

type Panel = 'none' | 'pay' | 'unpay' | 'amount';

/**
 * Uma conta (a pagar ou a receber) no mês. O círculo marca/desmarca (RF-18, RN-03) e tocar no valor
 * muda o valor só deste mês (contas variáveis, como luz e água).
 */
export function BillOccurrenceItem({ occurrence: o, showMonth }: { occurrence: BillOccurrence; showMonth?: boolean }) {
  const [panel, setPanel] = useState<Panel>('none');
  const unpay = useUnpayBill();
  const isIncome = o.bill.kind === 'income';
  const paid = o.status === 'paid';
  const action = isIncome ? (paid ? 'Desmarcar recebimento de' : 'Marcar como recebido:') : paid ? 'Desmarcar pagamento de' : 'Marcar como paga:';
  const toggle = (next: Panel) => setPanel((current) => (current === next ? 'none' : next));

  return (
    <div className="flex flex-col gap-2 py-2 pr-4 pl-1">
      <div className="flex items-center gap-1">
        {/* Círculo de marcar: vazio = em aberto, cheio = paga/recebido */}
        <button
          type="button"
          aria-label={`${action} ${o.bill.name}`}
          aria-pressed={paid}
          disabled={unpay.isPending}
          onClick={() => toggle(paid ? 'unpay' : 'pay')}
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-ground"
        >
          <span
            className={`flex size-6 items-center justify-center rounded-full border-2 ${
              paid ? 'border-brand bg-brand text-on-brand' : o.status === 'overdue' ? 'border-expense' : 'border-line-strong'
            }`}
            style={!paid && o.bill.category ? { borderColor: o.status === 'overdue' ? undefined : o.bill.category.color } : undefined}
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
          {paid ? (
            <p className={`font-display font-semibold ${isIncome ? 'text-income' : ''}`}>
              {isIncome && '+ '}
              {formatCents(o.amountCents)}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => toggle('amount')}
              aria-label={`Mudar o valor de ${o.bill.name} só neste mês`}
              className={`-my-1 rounded-lg px-1 py-1 font-display font-semibold underline decoration-dotted underline-offset-4 hover:bg-ground ${isIncome ? 'text-income' : ''}`}
            >
              {isIncome && '+ '}
              {formatCents(o.amountCents)}
            </button>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge[o.status]}`}>{describeDue(o)}</span>
        </div>
      </div>
      {o.customAmount && !paid && <p className="ml-12 text-xs text-muted">Valor só deste mês (padrão {formatCents(o.bill.amount_cents)})</p>}

      {unpay.error && <ErrorState error={unpay.error} />}
      {panel === 'unpay' && paid && (
        <div className="ml-12 flex flex-wrap items-center gap-x-4 text-sm">
          <span className="text-muted">Desmarcar apaga a transação gerada.</span>
          <button type="button" className="min-h-11 font-semibold text-muted" onClick={() => setPanel('none')}>
            Cancelar
          </button>
          <button
            type="button"
            className="min-h-11 font-semibold text-expense"
            disabled={unpay.isPending}
            onClick={() => unpay.mutate({ billId: o.bill.id, month: o.month }, { onSuccess: () => setPanel('none') })}
          >
            {unpay.isPending ? 'Desmarcando…' : 'Desmarcar'}
          </button>
        </div>
      )}
      {panel === 'pay' && !paid && (
        <div className="pl-3">
          <PayForm occurrence={o} onDone={() => setPanel('none')} />
        </div>
      )}
      {panel === 'amount' && !paid && (
        <div className="pl-3">
          <MonthAmountForm occurrence={o} onDone={() => setPanel('none')} />
        </div>
      )}
    </div>
  );
}

/** Valor só deste mês, sem mexer no valor padrão nem nos outros meses. */
function MonthAmountForm({ occurrence: o, onDone }: { occurrence: BillOccurrence; onDone: () => void }) {
  const save = useSetAmountOverride();
  const [amount, setAmount] = useState(centsToInput(o.amountCents));
  const [error, setError] = useState<string | null>(null);
  const monthLabel = formatMonthYear(o.month).toLowerCase();

  function submit() {
    const cents = parseToCents(amount);
    if (!cents || cents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setError(null);
    // Igual ao padrão: não precisa de valor próprio
    const value = cents === o.bill.amount_cents ? null : cents;
    save.mutate({ billId: o.bill.id, month: o.month, amountCents: value }, { onSuccess: onDone });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
      <MoneyInput label={`Valor de ${monthLabel} (R$)`} value={amount} onChange={setAmount} error={error ?? undefined} autoFocus />
      <p className="-mt-1 text-sm text-muted">Muda só este mês. Os meses anteriores e os próximos continuam com {formatCents(o.bill.amount_cents)}.</p>
      {save.error && <ErrorState error={save.error} />}
      <div className="flex gap-2">
        <Button variant="secondary" className="h-11 flex-1 text-sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button className="h-11 flex-1 text-sm" disabled={save.isPending} onClick={submit}>
          {save.isPending ? 'Salvando…' : 'Salvar valor'}
        </Button>
      </div>
      {o.customAmount && (
        <button
          type="button"
          className="min-h-11 self-start text-sm font-semibold text-muted underline"
          disabled={save.isPending}
          onClick={() => save.mutate({ billId: o.bill.id, month: o.month, amountCents: null }, { onSuccess: onDone })}
        >
          Voltar ao valor padrão ({formatCents(o.bill.amount_cents)})
        </button>
      )}
    </div>
  );
}

function PayForm({ occurrence: o, onDone }: { occurrence: BillOccurrence; onDone: () => void }) {
  const { data: accounts } = useAccounts();
  const pay = usePayBill();
  const setOverride = useSetAmountOverride();
  const isIncome = o.bill.kind === 'income';
  // Recebimento cai numa conta de verdade, não no cartão
  const usable = accounts?.filter((a) => a.is_active && (!isIncome || a.type !== 'credit_card')) ?? [];
  const [chosenAccountId, setAccountId] = useState('');
  const accountId = chosenAccountId || o.bill.account_id || usable[0]?.id || '';
  // Mês passado ou futuro: sugere a data de vencimento; mês atual: hoje
  const todayIso = today();
  const [paidOn, setPaidOn] = useState(todayIso.slice(0, 7) === o.dueDate.slice(0, 7) ? todayIso : o.dueDate);
  const [amount, setAmount] = useState(centsToInput(o.amountCents));
  const [error, setError] = useState<string | null>(null);
  const busy = pay.isPending || setOverride.isPending;

  if (accounts && usable.length === 0) {
    return (
      <p className="text-sm text-muted">
        Cadastre uma conta em <Link to="/contas/nova" className="font-semibold text-brand underline">Contas</Link> para registrar.
      </p>
    );
  }

  async function confirm() {
    const cents = parseToCents(amount);
    if (!cents || cents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setError(null);
    // Valor diferente: vira o valor deste mês antes de gerar a transação
    if (cents !== o.amountCents) {
      await setOverride.mutateAsync({ billId: o.bill.id, month: o.month, amountCents: cents === o.bill.amount_cents ? null : cents });
    }
    pay.mutate({ billId: o.bill.id, month: o.month, accountId, paidOn }, { onSuccess: onDone });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MoneyInput label="Valor (R$)" value={amount} onChange={setAmount} error={error ?? undefined} />
        <Select label={isIncome ? 'Recebido em' : 'Pago com'} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {usable.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Input label={isIncome ? 'Data do recebimento' : 'Data do pagamento'} type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
      </div>
      {(pay.error || setOverride.error) && <ErrorState error={pay.error ?? setOverride.error} />}
      <div className="flex gap-2">
        <Button variant="secondary" className="h-11 flex-1 text-sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button className="h-11 flex-1 text-sm" disabled={!accountId || !paidOn || busy} onClick={() => void confirm().catch(() => undefined)}>
          {busy ? 'Salvando…' : isIncome ? 'Confirmar recebimento' : 'Confirmar pagamento'}
        </Button>
      </div>
    </div>
  );
}
