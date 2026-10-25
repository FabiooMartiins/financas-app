import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { AccountLogo } from '@/features/accounts/components/AccountLogo';
import { formatCents } from '@/lib/money';
import { InvoiceBadge, describeInvoiceDue, invoiceAmount, invoiceTitle } from '../components/InvoiceParts';
import { useCards, type CardWithInvoices } from '../hooks/useCards';
import { SectionTabs } from '@/components/layout/SectionTabs';

// RF-27: todos os cartões em um lugar — fatura atual, faturas a pagar e limite de cada um
export function CardsPage() {
  const { data, isPending, error } = useCards();

  const toPayTotal =
    data?.flatMap((c) => c.invoices ?? []).filter((i) => i.status === 'closed' || i.status === 'overdue').reduce((s, i) => s + i.remaining, 0) ?? 0;
  const openTotal =
    data?.flatMap((c) => c.invoices ?? []).filter((i) => i.status === 'open').reduce((s, i) => s + Math.max(i.total - i.paid, 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Cartões"
        action={
          <Link to="/contas/nova?tipo=credit_card" className={buttonClasses('primary', 'h-11 px-4 text-sm')}>
            Novo cartão
          </Link>
        }
      />
      <SectionTabs section="dinheiro" />

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-sm text-muted">Faturas a pagar</p>
            <p className={`font-display text-lg font-semibold ${toPayTotal > 0 ? 'text-expense' : ''}`}>{formatCents(toPayTotal)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Faturas abertas</p>
            <p className="font-display text-lg font-semibold">{formatCents(openTotal)}</p>
          </Card>
        </div>
      )}

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} />}
      {data?.length === 0 && (
        <EmptyState>
          Nenhum cartão cadastrado. Cadastre o cartão com o dia de fechamento e de vencimento para acompanhar as faturas, o limite e as parcelas.{' '}
          <Link to="/contas/nova?tipo=credit_card" className="font-semibold text-brand underline">
            Cadastrar cartão
          </Link>
        </EmptyState>
      )}

      {data?.map((entry) => (
        <CardSummary key={entry.card.id} entry={entry} />
      ))}

      {data && data.length > 0 && (
        <p className="text-sm text-muted">
          Compras no cartão entram como despesa na data da compra. Pagar a fatura é uma transferência da sua conta para o cartão e não conta como
          despesa de novo.
        </p>
      )}
    </>
  );
}

function CardSummary({ entry }: { entry: CardWithInvoices }) {
  const { card, invoices } = entry;
  const debt = Math.max(-card.current_balance_cents, 0);
  const limit = card.credit_limit_cents;
  const available = limit !== null ? limit - debt : null;
  const usedShare = limit ? Math.min(debt / limit, 1) : 0;

  const open = invoices?.find((i) => i.status === 'open');
  const toPay = invoices?.filter((i) => i.status === 'closed' || i.status === 'overdue') ?? [];
  const nextFuture = invoices?.find((i) => i.status === 'future' && i.total > 0);

  return (
    <Card className="flex flex-col gap-4 p-4">
      <Link to={`/cartoes/${card.id}`} className="-m-1 flex items-center gap-3 rounded-xl p-1 hover:bg-ground">
        <AccountLogo account={card} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{card.name}</p>
          <p className="truncate text-sm text-muted">
            {card.closing_day && card.due_day ? `Fecha dia ${card.closing_day} · vence dia ${card.due_day}` : 'Fechamento e vencimento não configurados'}
          </p>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      {limit !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 rounded-full bg-ground" role="meter" aria-label={`Limite usado do ${card.name}`} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={debt}>
            <div className={`h-2 rounded-full ${usedShare > 0.8 ? 'bg-expense' : 'bg-brand'}`} style={{ width: `${usedShare * 100}%` }} />
          </div>
          <p className="flex justify-between gap-2 text-sm text-muted">
            <span>Usado {formatCents(debt)}</span>
            <span>
              Disponível <strong className="text-ink">{formatCents(available!)}</strong>
            </span>
          </p>
        </div>
      )}

      {!invoices ? (
        <Link to={`/contas/${card.id}`} className={buttonClasses('secondary', 'h-11 text-sm')}>
          Configurar fechamento e vencimento
        </Link>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {[...toPay, ...(open ? [open] : []), ...(nextFuture ? [nextFuture] : [])].map((invoice) => (
            <li key={invoice.key}>
              <Link to={`/cartoes/${card.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-ground">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{invoiceTitle(invoice)}</p>
                  <p className="truncate text-sm text-muted">{describeInvoiceDue(invoice)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="font-display font-semibold">{formatCents(invoiceAmount(invoice))}</p>
                  <InvoiceBadge status={invoice.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
