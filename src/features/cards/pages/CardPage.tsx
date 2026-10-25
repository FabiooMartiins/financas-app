import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate, formatDayMonth, formatMonthShort, formatMonthYear, parseISODate, toISODate } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { InvoiceBadge, PayInvoiceForm, describeInvoiceDue, invoiceAmount, invoiceTitle } from '../components/InvoiceParts';
import { isConfiguredCard, useCards, type CardWithInvoices } from '../hooks/useCards';
import { ongoingInstallments, parseInstallment } from '../installments';
import { describeCycle, type Invoice } from '../invoices';

// Cartão de crédito: limite, fatura mês a mês com os lançamentos, parcelas futuras (RN-02, RF-21)
export function CardPage() {
  const { id } = useParams();
  // useCards(id) também encontra cartão inativo; useCards() lista os ativos para trocar de cartão
  const { data, isPending, error } = useCards(id);
  const allCards = useCards();
  const current = data?.[0];

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!current) return <ErrorState error={{ message: 'Cartão não encontrado.' }} />;

  return <CardView key={current.card.id} entry={current} others={allCards.data ?? []} />;
}

function CardView({ entry, others }: { entry: CardWithInvoices; others: CardWithInvoices[] }) {
  const { card, invoices } = entry;
  const [params, setParams] = useSearchParams();

  const editLink = (
    <Link to={`/contas/${card.id}`} className={buttonClasses('secondary', 'h-11 px-4 text-sm')}>
      Editar
    </Link>
  );
  const switcher = others.length > 1 && (
    <nav aria-label="Cartões" className="flex flex-wrap gap-2">
      {others.map(({ card: c }) => (
        <Link
          key={c.id}
          to={`/cartoes/${c.id}`}
          aria-current={c.id === card.id ? 'page' : undefined}
          className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
            c.id === card.id ? 'border-brand bg-brand text-on-brand' : 'border-line-strong bg-surface text-ink'
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );

  if (!invoices || !isConfiguredCard(card)) {
    return (
      <>
        <PageHeader title={card.name} backTo="/cartoes" action={editLink} />
        {switcher}
        <EmptyState>
          Informe o dia de fechamento e o dia de vencimento do cartão para acompanhar as faturas.{' '}
          <Link to={`/contas/${card.id}`} className="font-semibold text-brand underline">
            Configurar cartão
          </Link>
        </EmptyState>
      </>
    );
  }

  const cycle = describeCycle(card);
  const debt = Math.max(-card.current_balance_cents, 0);
  const limit = card.credit_limit_cents;
  const available = limit !== null ? limit - debt : null;
  const usedShare = limit ? Math.min(debt / limit, 1) : 0;

  // Fatura escolhida: ?fatura=aaaa-mm, senão a aberta (ou a última)
  const openIndex = invoices.findIndex((i) => i.status === 'open');
  const requested = invoices.findIndex((i) => i.key === params.get('fatura'));
  const index = requested >= 0 ? requested : openIndex >= 0 ? openIndex : invoices.length - 1;
  const invoice = invoices[index];
  const select = (key: string) => setParams({ fatura: key }, { replace: true });

  const toPay = invoices.filter((i) => i.status === 'closed' || i.status === 'overdue');
  const ahead = invoices.slice(Math.max(openIndex, 0)).filter((i) => i.status === 'open' || i.status === 'future');
  const aheadWithValues = ahead.filter((i) => i.total > 0);
  const maxAhead = Math.max(...aheadWithValues.map((i) => i.total), 1);
  const installments = ongoingInstallments(invoices);

  return (
    <>
      <PageHeader title={card.name} backTo="/cartoes" action={editLink} />
      {switcher}

      {/* Limite */}
      <div className="flex flex-col gap-3 rounded-2xl bg-hero p-5 text-on-hero">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold opacity-80">{available !== null ? 'Limite disponível' : 'Total em aberto'}</p>
            <p className="font-display text-3xl font-semibold break-words">{formatCents(available ?? debt)}</p>
          </div>
          <p className="shrink-0 text-right text-sm opacity-80">
            {cycle.closing}
            <br />
            {cycle.due}
          </p>
        </div>
        {limit !== null ? (
          <>
            <div className="h-2 rounded-full bg-on-hero/20" role="meter" aria-label="Limite usado" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={debt}>
              <div className="h-2 rounded-full bg-on-hero" style={{ width: `${usedShare * 100}%` }} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="min-w-0">
                <dt className="opacity-80">Limite total</dt>
                <dd className="font-display font-semibold break-words">{formatCents(limit)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="opacity-80">Usado (com parcelas futuras)</dt>
                <dd className="font-display font-semibold break-words">{formatCents(debt)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <Link to={`/contas/${card.id}`} className="flex min-h-11 items-center text-sm font-semibold underline">
            Informar o limite do cartão
          </Link>
        )}
      </div>

      {/* Lembrete de fatura fechada quando está olhando outro mês */}
      {toPay
        .filter((i) => i.key !== invoice.key)
        .map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => select(i.key)}
            className={`flex min-h-11 items-center justify-between gap-3 rounded-2xl p-4 text-left text-sm font-semibold ${
              i.status === 'overdue' ? 'bg-expense-soft text-expense' : 'bg-warn-soft text-warn'
            }`}
          >
            <span className="min-w-0">
              {invoiceTitle(i)} {i.status === 'overdue' ? 'vencida' : 'fechada'}: falta {formatCents(i.remaining)}
            </span>
            <span className="shrink-0 underline">Ver</span>
          </button>
        ))}

      {/* Fatura do mês, com navegação */}
      <InvoiceMonth
        key={invoice.key}
        invoice={invoice}
        onPrevious={index > 0 ? () => select(invoices[index - 1].key) : undefined}
        onNext={index < invoices.length - 1 ? () => select(invoices[index + 1].key) : undefined}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Quanto já está comprometido em cada mês */}
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="font-display font-semibold">Faturas dos próximos meses</h2>
          {aheadWithValues.length === 0 ? (
            <EmptyState>Nenhuma compra lançada para os próximos meses.</EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {aheadWithValues.map((i) => {
                const due = parseISODate(i.dueDate);
                const selected = i.key === invoice.key;
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => {
                      select(i.key);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    aria-current={selected ? 'true' : undefined}
                    className={`flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-ground ${selected ? 'bg-ground' : ''}`}
                  >
                    <span className="w-16 shrink-0 font-semibold capitalize">
                      {formatMonthShort(due)}/{String(due.getFullYear()).slice(2)}
                    </span>
                    <span className="h-2 min-w-0 flex-1 rounded-full bg-ground" aria-hidden="true">
                      <span className="block h-2 rounded-full bg-expense" style={{ width: `${(i.total / maxAhead) * 100}%` }} />
                    </span>
                    <span className="w-24 shrink-0 text-right font-display font-semibold">{formatCents(i.total)}</span>
                  </button>
                );
              })}
            </Card>
          )}
        </section>

        {/* Compras parceladas em andamento */}
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="font-display font-semibold">Compras parceladas</h2>
          {installments.length === 0 ? (
            <EmptyState>Nenhuma compra parcelada em andamento.</EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {installments.map((p) => (
                <div key={p.key} className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.description}</p>
                    <p className="text-sm text-muted">
                      Próxima: parcela {p.billed + 1} de {p.count} · última em{' '}
                      {formatMonthYear(parseISODate(p.lastInvoice.dueDate)).toLowerCase()}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display font-semibold">{formatCents(p.remainingCents)}</p>
                    <p className="text-xs text-muted">de {formatCents(p.totalCents)}</p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>

      <p className="text-sm text-muted">
        <Link to={`/transacoes/importar?conta=${card.id}`} className="font-semibold text-brand underline">
          Importar fatura (OFX ou CSV)
        </Link>
        {' · '}
        {card.closing_day === 31 ?'Compras feitas no último dia do mês' : `Compras feitas a partir do dia ${card.closing_day}`} entram na fatura seguinte. Vencimento em fim de semana ou feriado nacional passa para o próximo dia útil. Para lançar uma compra, use “Nova transação” escolhendo este cartão em
        “Pago com”.
      </p>
    </>
  );
}

function InvoiceMonth({ invoice, onPrevious, onNext }: { invoice: Invoice; onPrevious?: () => void; onNext?: () => void }) {
  const [paying, setPaying] = useState(false);
  const canPay = invoice.remaining > 0 && invoice.status !== 'future';
  const arrow = 'flex size-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-ground disabled:opacity-30';

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-1 border-b border-line p-2">
        <button type="button" className={arrow} onClick={onPrevious} disabled={!onPrevious} aria-label="Fatura anterior">
          <Chevron d="M15 18l-6-6 6-6" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center" aria-live="polite">
          <h2 className="font-display font-semibold">{invoiceTitle(invoice)}</h2>
          <InvoiceBadge status={invoice.status} />
        </div>
        <button type="button" className={arrow} onClick={onNext} disabled={!onNext} aria-label="Próxima fatura">
          <Chevron d="M9 18l6-6-6-6" />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">{invoice.status === 'closed' || invoice.status === 'overdue' ? 'Falta pagar' : 'Total'}</p>
            <p className="font-display text-2xl font-semibold break-words">{formatCents(invoiceAmount(invoice))}</p>
          </div>
          <p className="shrink-0 text-right text-sm text-muted">{describeInvoiceDue(invoice)}</p>
        </div>
        <p className="text-sm text-muted">
          Compras de {formatDate(invoice.startDate)} a {formatDate(previousDay(invoice.closingDate))}
        </p>
        {invoice.paid > 0 && invoice.remaining > 0 && (
          <p className="text-sm text-muted">
            Total {formatCents(invoice.total)} · pago {formatCents(invoice.paid)} · falta <strong className="text-ink">{formatCents(invoice.remaining)}</strong>
          </p>
        )}
        {invoice.status === 'open' && invoice.paid > 0 && <p className="text-sm text-muted">Pagamento antecipado abatido: {formatCents(invoice.paid)}</p>}

        {canPay &&
          (paying ? (
            <PayInvoiceForm invoice={invoice} onDone={() => setPaying(false)} />
          ) : (
            <Button variant={invoice.status === 'overdue' ? 'primary' : 'secondary'} className="h-11 text-sm" onClick={() => setPaying(true)}>
              {invoice.status === 'open' ? 'Antecipar pagamento' : 'Pagar fatura'}
            </Button>
          ))}
      </div>

      {invoice.items.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {invoice.items.map((item, index) => (
            <li key={item.id ?? `inicial-${index}`}>
              <ItemRow item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-line p-4 text-sm text-muted">Nenhuma compra nesta fatura.</p>
      )}
    </Card>
  );
}

function ItemRow({ item }: { item: Invoice['items'][number] }) {
  const installment = parseInstallment(item.description);
  const details = [
    formatDayMonth(item.occurred_on),
    item.category?.name,
    installment && `Parcela ${installment.number} de ${installment.total}`,
  ].filter(Boolean);
  const content = (
    <>
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: item.category?.color ?? '#9AA39E' }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{installment?.base ?? item.description}</span>
        <span className="block truncate text-sm text-muted">{details.join(' · ')}</span>
      </span>
      <span className={`shrink-0 font-display font-semibold ${item.amount_cents < 0 ? 'text-income' : ''}`}>
        {item.amount_cents < 0 ? `− ${formatCents(-item.amount_cents)}` : formatCents(item.amount_cents)}
      </span>
    </>
  );
  const className = 'flex min-h-14 items-center gap-3 px-4 py-2';
  return item.id ? (
    <Link to={`/transacoes/${item.id}`} className={`${className} hover:bg-ground`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function previousDay(isoDate: string): string {
  const date = parseISODate(isoDate);
  date.setDate(date.getDate() - 1);
  return toISODate(date);
}
