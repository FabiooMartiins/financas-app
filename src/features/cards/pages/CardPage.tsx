import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate, formatDayMonth, parseISODate, toISODate } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { InvoiceBadge, PayInvoiceForm, describeInvoiceDue, invoiceAmount, invoiceTitle } from '../components/InvoiceParts';
import { useCards } from '../hooks/useCards';
import type { Invoice } from '../invoices';

// Cartão de crédito: limite, fatura atual, faturas a pagar, próximas e histórico (RN-02)
export function CardPage() {
  const { id } = useParams();
  const { data, isPending, error } = useCards(id);
  const entry = data?.[0];

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!entry) return <ErrorState error={{ message: 'Cartão não encontrado.' }} />;

  const { card, invoices } = entry;
  const editLink = (
    <Link to={`/contas/${card.id}`} className={buttonClasses('secondary', 'h-11 px-4 text-sm')}>
      Editar
    </Link>
  );

  if (!invoices) {
    return (
      <>
        <PageHeader title={card.name} backTo="/contas" action={editLink} />
        <EmptyState>
          Informe o dia de fechamento e o dia de vencimento do cartão para acompanhar as faturas.{' '}
          <Link to={`/contas/${card.id}`} className="font-semibold text-brand underline">
            Configurar cartão
          </Link>
        </EmptyState>
      </>
    );
  }

  const debt = Math.max(-card.current_balance_cents, 0);
  const limit = card.credit_limit_cents;
  const available = limit !== null ? limit - debt : null;
  const usedShare = limit ? Math.min(debt / limit, 1) : 0;

  const open = invoices.find((i) => i.status === 'open');
  const toPay = invoices.filter((i) => i.status === 'closed' || i.status === 'overdue');
  const future = invoices.filter((i) => i.status === 'future' && i.total !== 0);
  const paid = invoices.filter((i) => i.status === 'paid' && i.total > 0).reverse();

  return (
    <>
      <PageHeader title={card.name} backTo="/contas" action={editLink} />

      <div className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold opacity-80">{available !== null ? 'Limite disponível' : 'Total em aberto'}</p>
            <p className="font-display text-3xl font-semibold">{formatCents(available ?? debt)}</p>
          </div>
          <p className="text-right text-sm opacity-80">
            Fecha dia {card.closing_day}
            <br />
            Vence dia {card.due_day}
          </p>
        </div>
        {limit !== null && (
          <>
            <div
              className="h-2 rounded-full bg-white/20"
              role="meter"
              aria-label="Limite usado"
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-valuenow={debt}
            >
              <div className="h-2 rounded-full bg-white" style={{ width: `${usedShare * 100}%` }} />
            </div>
            <p className="text-sm opacity-80">
              Usado {formatCents(debt)} de {formatCents(limit)} (inclui parcelas futuras)
            </p>
          </>
        )}
      </div>

      {toPay.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">A pagar</h2>
          {toPay.map((i) => (
            <InvoiceCard key={i.key} invoice={i} defaultOpen={false} />
          ))}
        </section>
      )}

      {open && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">Fatura atual</h2>
          <InvoiceCard invoice={open} defaultOpen />
        </section>
      )}

      {future.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">Próximas faturas (parcelas já lançadas)</h2>
          {future.map((i) => (
            <InvoiceCard key={i.key} invoice={i} defaultOpen={false} />
          ))}
        </section>
      )}

      {paid.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">Pagas</h2>
          {paid.slice(0, 12).map((i) => (
            <InvoiceCard key={i.key} invoice={i} defaultOpen={false} />
          ))}
        </section>
      )}

      <p className="text-sm text-muted">
        Compras feitas a partir do dia {card.closing_day} entram na fatura seguinte. Para lançar uma compra, use “Nova transação” escolhendo este cartão em
        “Pago com”.
      </p>
    </>
  );
}

function InvoiceCard({ invoice, defaultOpen }: { invoice: Invoice; defaultOpen: boolean }) {
  const [paying, setPaying] = useState(false);
  const canPay = invoice.remaining > 0 && invoice.status !== 'future';

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold">{invoiceTitle(invoice)}</p>
          <p className="text-sm text-muted">{describeInvoiceDue(invoice)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="font-display text-lg font-semibold">{formatCents(invoiceAmount(invoice))}</p>
          <InvoiceBadge status={invoice.status} />
        </div>
      </div>

      {invoice.paid > 0 && invoice.remaining > 0 && (
        <p className="text-sm text-muted">
          Total {formatCents(invoice.total)} · pago {formatCents(invoice.paid)} · falta <strong className="text-ink">{formatCents(invoice.remaining)}</strong>
        </p>
      )}
      {invoice.status === 'open' && invoice.paid > 0 && (
        <p className="text-sm text-muted">Pagamento antecipado abatido: {formatCents(invoice.paid)}</p>
      )}

      <details open={defaultOpen && invoice.items.length > 0} className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-muted">
          {invoice.items.length} {invoice.items.length === 1 ? 'lançamento' : 'lançamentos'} · de {formatDate(invoice.startDate)} a{' '}
          {formatDayMonth(previousDay(invoice.closingDate))}
        </summary>
        {invoice.items.length > 0 ? (
          <ul className="divide-y divide-line">
            {invoice.items.map((item, index) => (
              <li key={item.id ?? `inicial-${index}`}>
                <ItemRow item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-muted">Nenhuma compra nesta fatura.</p>
        )}
      </details>

      {canPay &&
        (paying ? (
          <PayInvoiceForm invoice={invoice} onDone={() => setPaying(false)} />
        ) : (
          <Button variant={invoice.status === 'overdue' ? 'primary' : 'secondary'} className="h-11 text-sm" onClick={() => setPaying(true)}>
            {invoice.status === 'open' ? 'Antecipar pagamento' : 'Pagar fatura'}
          </Button>
        ))}
    </Card>
  );
}

function ItemRow({ item }: { item: Invoice['items'][number] }) {
  const content = (
    <>
      <span className="w-12 shrink-0 text-muted">{formatDayMonth(item.occurred_on)}</span>
      <span className="min-w-0 flex-1 truncate">
        {item.description}
        {item.category && <span className="text-muted"> · {item.category.name}</span>}
      </span>
      <span className={`shrink-0 font-semibold ${item.amount_cents < 0 ? 'text-income' : ''}`}>
        {item.amount_cents < 0 ? `− ${formatCents(-item.amount_cents)}` : formatCents(item.amount_cents)}
      </span>
    </>
  );
  return item.id ? (
    <Link to={`/transacoes/${item.id}`} className="flex min-h-11 items-center gap-2 py-2 hover:bg-ground">
      {content}
    </Link>
  ) : (
    <div className="flex min-h-11 items-center gap-2 py-2">{content}</div>
  );
}

function previousDay(isoDate: string): string {
  const date = parseISODate(isoDate);
  date.setDate(date.getDate() - 1);
  return toISODate(date);
}
