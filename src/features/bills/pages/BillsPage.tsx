import { useState } from 'react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { InvoiceSummaryItem } from '@/features/cards/components/InvoiceParts';
import { useCards } from '@/features/cards/hooks/useCards';
import { monthRange, startOfMonth } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { BillOccurrenceItem } from '../components/BillOccurrenceItem';
import { useBillOccurrences } from '../hooks/useBills';
import type { BillOccurrence } from '../schedule';

// RF-17 a RF-21, RN-03, RN-04
export function BillsPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { data, isPending, error } = useBillOccurrences(month);
  const cards = useCards();
  const { start, end } = monthRange(month);
  // Faturas de cartão que vencem neste mês (RN-02)
  const invoices =
    cards.data?.flatMap((c) => c.invoices ?? []).filter((i) => i.dueDate >= start && i.dueDate <= end && i.total > 0) ?? [];
  const invoicesPaid = invoices.reduce((s, i) => s + i.paid, 0);
  const invoicesOpen = invoices.reduce((s, i) => s + i.remaining, 0);

  const overdue = data?.filter((o) => o.status === 'overdue') ?? [];
  const open = data?.filter((o) => o.status === 'due-soon' || o.status === 'upcoming') ?? [];
  const paid = data?.filter((o) => o.status === 'paid') ?? [];
  const sum = (list: BillOccurrence[]) => list.reduce((s, o) => s + o.bill.amount_cents, 0);

  return (
    <>
      <PageHeader
        title="Contas do mês"
        action={
          <Link to="/vencimentos/nova" className={buttonClasses('primary', 'h-11 px-4 text-sm')}>
            Nova conta
          </Link>
        }
      />
      <MonthSwitcher month={month} onChange={setMonth} />

      {data && (data.length > 0 || invoices.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-sm text-muted">Pago</p>
            <p className="font-display text-lg font-semibold text-income">{formatCents(sum(paid) + invoicesPaid)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">A pagar</p>
            <p className="font-display text-lg font-semibold text-expense">{formatCents(sum(overdue) + sum(open) + invoicesOpen)}</p>
          </Card>
        </div>
      )}

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} />}
      {data?.length === 0 && invoices.length === 0 && (
        <EmptyState>
          Nenhuma conta neste mês. Cadastre aluguel, luz, internet, assinaturas e parcelas para acompanhar os vencimentos.
        </EmptyState>
      )}

      {invoices.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">Faturas de cartão ({invoices.length})</h2>
          <Card className="divide-y divide-line">
            {invoices.map((i) => (
              <InvoiceSummaryItem key={i.cardId + i.key} invoice={i} />
            ))}
          </Card>
        </section>
      )}
      <Section title="Vencidas" items={overdue} />
      <Section title="A vencer" items={open} />
      <Section title="Pagas" items={paid} />
    </>
  );
}

function Section({ title, items }: { title: string; items: BillOccurrence[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-muted">
        {title} ({items.length})
      </h2>
      <Card className="divide-y divide-line">
        {items.map((o) => (
          <BillOccurrenceItem key={o.bill.id} occurrence={o} />
        ))}
      </Card>
    </section>
  );
}
