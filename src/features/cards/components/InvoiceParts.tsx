import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/States';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useCreateTransaction } from '@/features/transactions/hooks/useTransactions';
import { daysBetween, formatDayMonth, formatMonthYear, parseISODate, today } from '@/lib/dates';
import { centsToInput, formatCents, parseToCents } from '@/lib/money';
import { invoiceStatusLabels, type Invoice, type InvoiceStatus } from '../invoices';

const badgeColors: Record<InvoiceStatus, string> = {
  future: 'bg-ground text-muted',
  open: 'bg-[#E6EEF8] text-[#2F5F96]',
  closed: 'bg-[#FFF4DC] text-[#8A5A00]',
  overdue: 'bg-expense-soft text-expense',
  paid: 'bg-brand/10 text-brand',
};

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeColors[status]}`}>{invoiceStatusLabels[status]}</span>;
}

/** "Fatura de outubro de 2026" — nomeada pelo mês do vencimento, como nos bancos. */
export function invoiceTitle(invoice: Invoice) {
  const label = formatMonthYear(parseISODate(invoice.dueDate));
  return `Fatura de ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

/** Valor que importa em cada situação: aberta/futura = total até agora; fechada = quanto falta. */
export function invoiceAmount(invoice: Invoice) {
  return invoice.status === 'open' || invoice.status === 'future' || invoice.status === 'paid' ? Math.max(invoice.total, 0) : invoice.remaining;
}

export function describeInvoiceDue(invoice: Invoice): string {
  if (invoice.status === 'paid') return `Paga · venceu ${formatDayMonth(invoice.dueDate)}`;
  const days = daysBetween(today(), invoice.dueDate);
  if (days < 0) return `Venceu há ${-days} ${days === -1 ? 'dia' : 'dias'}`;
  if (days === 0) return 'Vence hoje';
  if (invoice.status === 'open') return `Fecha ${formatDayMonth(invoice.closingDate)} · vence ${formatDayMonth(invoice.dueDate)}`;
  return `Vence ${formatDayMonth(invoice.dueDate)}${days <= 7 ? ` (em ${days} ${days === 1 ? 'dia' : 'dias'})` : ''}`;
}

/** Linha compacta (Contas do mês e Início) que leva para a tela do cartão. */
export function InvoiceSummaryItem({ invoice }: { invoice: Invoice }) {
  return (
    <Link to={`/cartoes/${invoice.cardId}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">Fatura {invoice.cardName}</p>
        <p className="truncate text-sm text-muted">{describeInvoiceDue(invoice)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="font-display font-semibold">{formatCents(invoiceAmount(invoice))}</p>
        <InvoiceBadge status={invoice.status} />
      </div>
    </Link>
  );
}

/** Pagamento da fatura = transferência da conta escolhida para o cartão (RN-02). */
export function PayInvoiceForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const { data: accounts } = useAccounts();
  const create = useCreateTransaction();
  const sources = accounts?.filter((a) => a.is_active && a.type !== 'credit_card') ?? [];
  const [chosen, setChosen] = useState('');
  const accountId = chosen || sources[0]?.id || '';
  const [amount, setAmount] = useState(centsToInput(invoice.remaining || Math.max(invoice.total, 0)));
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string | null>(null);

  if (accounts && sources.length === 0) {
    return (
      <p className="text-sm text-muted">
        Cadastre a conta de onde sai o pagamento em{' '}
        <Link to="/contas/nova" className="font-semibold text-brand underline">
          Contas
        </Link>
        .
      </p>
    );
  }

  function pay() {
    const cents = parseToCents(amount);
    if (!cents || cents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setError(null);
    create.mutate(
      {
        input: {
          type: 'transfer',
          amount_cents: cents,
          description: `Pagamento ${invoiceTitle(invoice).toLowerCase()} — ${invoice.cardName}`,
          occurred_on: date,
          account_id: accountId,
          transfer_account_id: invoice.cardId,
          category_id: null,
        },
        installments: 1,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Pagar com" value={accountId} onChange={(e) => setChosen(e.target.value)}>
          {sources.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Input label="Valor (R$)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={error ?? undefined} />
        <Input label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <p className="text-sm text-muted">Pode pagar só uma parte: o restante continua em aberto. O pagamento não conta como despesa.</p>
      {create.error && <ErrorState error={create.error} />}
      <div className="flex gap-2">
        <Button variant="secondary" className="h-11 flex-1 text-sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button className="h-11 flex-1 text-sm" disabled={!accountId || create.isPending} onClick={pay}>
          {create.isPending ? 'Salvando…' : 'Confirmar pagamento'}
        </Button>
      </div>
    </div>
  );
}
