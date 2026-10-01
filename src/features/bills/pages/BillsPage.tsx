import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { InvoiceSummaryItem } from '@/features/cards/components/InvoiceParts';
import { useCards } from '@/features/cards/hooks/useCards';
import { monthRange, startOfMonth } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { BillOccurrenceItem } from '../components/BillOccurrenceItem';
import { useBillOccurrences } from '../hooks/useBills';
import type { BillOccurrence } from '../schedule';

type Tab = 'pagar' | 'receber';

// RF-17 a RF-21, RN-03, RN-04 + recebimentos previstos
export function BillsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('aba') === 'receber' ? 'receber' : 'pagar';
  const isIncome = tab === 'receber';
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { data: all, isPending, error } = useBillOccurrences(month);
  const cards = useCards();
  const { start, end } = monthRange(month);

  const data = all?.filter((o) => o.bill.kind === (isIncome ? 'income' : 'expense'));
  // Faturas de cartão que vencem neste mês (RN-02)
  const invoices = isIncome
    ? []
    : (cards.data?.flatMap((c) => c.invoices ?? []).filter((i) => i.dueDate >= start && i.dueDate <= end && i.total > 0) ?? []);
  const invoicesDone = invoices.reduce((s, i) => s + i.paid, 0);
  const invoicesOpen = invoices.reduce((s, i) => s + i.remaining, 0);

  const overdue = data?.filter((o) => o.status === 'overdue') ?? [];
  const open = data?.filter((o) => o.status === 'due-soon' || o.status === 'upcoming') ?? [];
  const done = data?.filter((o) => o.status === 'paid') ?? [];
  const sum = (list: BillOccurrence[]) => list.reduce((s, o) => s + o.bill.amount_cents, 0);

  return (
    <>
      <PageHeader
        title="Contas do mês"
        action={
          <Link to={isIncome ? '/vencimentos/nova?tipo=receber' : '/vencimentos/nova'} className={buttonClasses('primary', 'h-11 px-4 text-sm')}>
            {isIncome ? 'Novo recebimento' : 'Nova conta'}
          </Link>
        }
      />
      <SegmentedControl
        label="Tipo"
        value={tab}
        onChange={(value) => setParams(value === 'receber' ? { aba: 'receber' } : {}, { replace: true })}
        options={[
          { value: 'pagar', label: 'A pagar' },
          { value: 'receber', label: 'A receber' },
        ]}
      />
      <MonthSwitcher month={month} onChange={setMonth} />

      {data && (data.length > 0 || invoices.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-sm text-muted">{isIncome ? 'Recebido' : 'Pago'}</p>
            <p className="font-display text-lg font-semibold text-income">{formatCents(sum(done) + invoicesDone)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">{isIncome ? 'A receber' : 'A pagar'}</p>
            <p className={`font-display text-lg font-semibold ${isIncome ? 'text-income' : 'text-expense'}`}>
              {formatCents(sum(overdue) + sum(open) + invoicesOpen)}
            </p>
          </Card>
        </div>
      )}

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} />}
      {data?.length === 0 && invoices.length === 0 && (
        <EmptyState>
          {isIncome
            ? 'Nenhum recebimento previsto neste mês. Cadastre salário, freelas, vendas e reembolsos para saber quanto e em qual conta vai entrar.'
            : 'Nenhuma conta neste mês. Cadastre aluguel, luz, internet, assinaturas e parcelas para acompanhar os vencimentos.'}
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
      <Section title={isIncome ? 'Atrasados' : 'Vencidas'} items={overdue} />
      <Section title={isIncome ? 'A receber' : 'A vencer'} items={open} />
      <Section title={isIncome ? 'Recebidos' : 'Pagas'} items={done} />
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
