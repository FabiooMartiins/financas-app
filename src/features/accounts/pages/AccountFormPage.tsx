import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { dueDate, invoiceMonthFor } from '@/features/cards/invoices';
import { formatDate, today } from '@/lib/dates';
import { centsToInput, parseToCents } from '@/lib/money';
import { accountGroup, accountTypeLabels, type Account, type AccountType } from '../api';
import { AdjustBalanceForm } from '../components/AdjustBalanceForm';
import { LogoPicker } from '../components/LogoPicker';
import { useAccounts, useDeleteAccount, useSaveAccount } from '../hooks/useAccounts';

// RF-04: cadastro e edição de contas (bancárias, cartões e investimentos)
// RF-30 ajuste de saldo, RF-32 logo, RN-07 entrar ou não no saldo total
export function AccountFormPage() {
  const { id } = useParams();
  const { data: accounts, isPending } = useAccounts();

  if (id && isPending) return <LoadingState />;
  const account = id ? accounts?.find((a) => a.id === id) : undefined;
  if (id && !account) return <ErrorState error={{ message: 'Conta não encontrada.' }} />;

  return <AccountForm key={id ?? 'nova'} account={account} />;
}

function AccountForm({ account }: { account?: Account }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const save = useSaveAccount();
  const remove = useDeleteAccount();

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? initialType(params.get('tipo')));
  const group = accountGroup(type);
  const isCard = type === 'credit_card';
  // Cartão: o usuário informa a fatura em aberto (positivo) e guardamos como saldo negativo
  const [amount, setAmount] = useState(() => {
    if (!account) return '';
    const cents = isCardType(account.type) ? -account.balance_cents : account.balance_cents;
    return cents < 0 ? `-${centsToInput(-cents)}` : centsToInput(cents);
  });
  const [isActive, setIsActive] = useState(account?.is_active ?? true);
  const [limit, setLimit] = useState(account?.credit_limit_cents != null ? centsToInput(account.credit_limit_cents) : '');
  const [closingDay, setClosingDay] = useState(String(account?.closing_day ?? ''));
  const [dueMode, setDueMode] = useState<'day' | 'after'>(account?.due_days_after_closing ? 'after' : 'day');
  const [dueDay, setDueDay] = useState(String(account?.due_day ?? ''));
  const [dueAfter, setDueAfter] = useState(String(account?.due_days_after_closing ?? 7));
  const [includeInTotal, setIncludeInTotal] = useState(account?.include_in_total ?? true);
  const [yieldNote, setYieldNote] = useState(account?.yield_note ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  // Depois de salvar, volta para a lista do grupo (Cartões, Investimentos ou Contas)
  const listPath = group === 'card' ? '/cartoes' : group === 'investment' ? '/investimentos' : '/contas';

  // Prévia: vencimento da fatura em que cairia uma compra feita hoje
  const cycle = {
    closing_day: Number(closingDay),
    due_day: dueMode === 'day' ? Number(dueDay) : null,
    due_days_after_closing: dueMode === 'after' ? Number(dueAfter) : null,
  };
  const dueValue = cycle.due_day ?? cycle.due_days_after_closing ?? 0;
  const validCycle = cycle.closing_day >= 1 && dueValue >= 1 && dueValue <= (dueMode === 'day' ? 31 : 40);
  const purchaseToday = invoiceMonthFor(cycle, today());
  const nextDue = isCard && validCycle ? dueDate(cycle, purchaseToday.year, purchaseToday.month) : null;

  const fromBank = account?.fromBank ?? false;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const negative = amount.trim().startsWith('-');
    const cents = amount.trim() ? parseToCents(amount) : 0;
    if (cents === null) {
      setFormError('Valor inválido. Use o formato 1.234,56.');
      return;
    }
    const signed = negative ? -cents : cents;
    const limitCents = limit.trim() ? parseToCents(limit) : null;
    if (isCard && limit.trim() && limitCents === null) {
      setFormError('Limite inválido. Use o formato 1.234,56.');
      return;
    }
    save.mutate(
      {
        id: account?.id,
        input: {
          name: name.trim(),
          type,
          balance_cents: fromBank ? account!.balance_cents : isCard ? -signed : signed,
          is_active: isActive,
          include_in_total: group === 'bank' ? includeInTotal : false,
          yield_note: group === 'investment' && yieldNote.trim() ? yieldNote.trim() : null,
          // Campos de cartão ficam vazios nos outros tipos
          credit_limit_cents: isCard ? limitCents : null,
          closing_day: isCard ? Number(closingDay) : null,
          due_day: isCard && dueMode === 'day' ? Number(dueDay) : null,
          due_days_after_closing: isCard && dueMode === 'after' ? Number(dueAfter) : null,
        },
      },
      { onSuccess: () => navigate(listPath) },
    );
  }

  return (
    <>
      <PageHeader title={account ? 'Editar conta' : 'Nova conta'} backTo={account?.type === 'credit_card' ? `/cartoes/${account.id}` : listPath} />
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <Input label="Nome" required maxLength={60} placeholder="Ex.: Nubank, Itaú, Caixinha viagem" value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Tipo" value={type} disabled={fromBank} onChange={(e) => setType(e.target.value as AccountType)}>
          {Object.entries(accountTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {fromBank ? (
          <p className="text-sm text-muted">O saldo desta conta vem do banco (Open Finance) e é atualizado na sincronização.</p>
        ) : (
          <Input
            label={isCard ? 'Valor já gasto e ainda não pago (R$)' : group === 'investment' ? 'Valor guardado hoje (R$)' : 'Saldo inicial (R$)'}
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={formError ?? undefined}
          />
        )}
        <p className="-mt-2 text-sm text-muted">
          {isCard
            ? 'Quanto você deve hoje no cartão (fatura fechada não paga + compras da fatura atual). Esse valor entra na próxima fatura a vencer. Parcelas futuras, lance como compra parcelada. O pagamento da fatura é uma transferência para o cartão.'
            : group === 'investment'
              ? 'Conta como valor aplicado. Daqui em diante, o lucro é o que o saldo crescer além do que você guardar ou resgatar.'
              : 'O saldo atual é este valor somado às transações lançadas. Use "-" na frente para saldo negativo.'}
        </p>

        {isCard && (
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display font-semibold">Fatura</h2>
            <Select label="Fechamento" required value={closingDay} onChange={(e) => setClosingDay(e.target.value)}>
              <option value="" disabled>
                Escolha o dia
              </option>
              <option value="31">Último dia do mês</option>
              {Array.from({ length: 30 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Dia {i + 1}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Vencimento" value={dueMode} onChange={(e) => setDueMode(e.target.value as 'day' | 'after')}>
                <option value="day">Dia fixo do mês</option>
                <option value="after">Dias depois do fechamento</option>
              </Select>
              {dueMode === 'day' ? (
                <Input
                  label="Dia do vencimento"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  required
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                />
              ) : (
                <Input
                  label="Quantos dias depois"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={40}
                  required
                  value={dueAfter}
                  onChange={(e) => setDueAfter(e.target.value)}
                />
              )}
            </div>
            <p className="-mt-2 text-sm text-muted">
              Estão no app do banco ou na fatura. Compras a partir do dia do fechamento entram na fatura seguinte. Vencimento em fim de semana ou
              feriado nacional passa para o próximo dia útil.
              {nextDue && <strong className="block pt-1 text-ink">Próxima fatura vence em {formatDate(nextDue)}.</strong>}
            </p>
            <Input label="Limite (R$, opcional)" inputMode="decimal" placeholder="0,00" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
        )}

        {group === 'bank' && (
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" className="size-5 accent-brand" checked={includeInTotal} onChange={(e) => setIncludeInTotal(e.target.checked)} />
            Somar no saldo total
          </label>
        )}
        {group !== 'bank' && (
          <p className="-mt-2 text-sm text-muted">
            {group === 'card' ? 'Cartões' : 'Poupança e caixinhas'} não entram no saldo total: aparecem em{' '}
            {group === 'card' ? 'Cartões' : 'Investimentos'}, com {group === 'card' ? 'faturas e limite' : 'rendimento e lucro'}.
          </p>
        )}
        {group === 'investment' && (
          <Input
            label="Rendimento combinado (opcional)"
            maxLength={40}
            placeholder="Ex.: 100% do CDI"
            value={yieldNote}
            onChange={(e) => setYieldNote(e.target.value)}
          />
        )}

        {account && (
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" className="size-5 accent-brand" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Conta ativa (desmarque para esconder sem apagar o histórico)
          </label>
        )}

        {save.error && <ErrorState error={save.error} />}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>

      {/* Fora do <form>: Enter no campo de saldo não salva a conta inteira */}
      <div className="flex max-w-lg flex-col gap-4">
        {account && (
          <section className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            <h2 className="font-display font-semibold">Logo</h2>
            <LogoPicker account={account} />
          </section>
        )}

        {account && account.type !== 'credit_card' && (
          <section className="flex flex-col gap-3 border-t border-line pt-4">
            <h2 className="font-display font-semibold">Ajustar saldo atual</h2>
            <AdjustBalanceForm account={account} />
          </section>
        )}

        {account && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm text-muted">Excluir a conta apaga também todas as transações dela. Para manter o histórico, prefira desativar.</p>
            {remove.error && <ErrorState error={remove.error} />}
            <ConfirmButton
              confirmLabel="Excluir com transações"
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(account.id, { onSuccess: () => navigate(listPath) })}
            >
              Excluir conta
            </ConfirmButton>
          </div>
        )}
      </div>
    </>
  );
}

function initialType(value: string | null): AccountType {
  return value !== null && value in accountTypeLabels ? (value as AccountType) : 'checking';
}

function isCardType(type: AccountType) {
  return type === 'credit_card';
}
