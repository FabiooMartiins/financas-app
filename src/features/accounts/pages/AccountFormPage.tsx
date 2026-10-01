import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { centsToInput, parseToCents } from '@/lib/money';
import { accountTypeLabels, type Account, type AccountType } from '../api';
import { useAccounts, useDeleteAccount, useSaveAccount } from '../hooks/useAccounts';

// RF-04: cadastro e edição de contas manuais
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
  const save = useSaveAccount();
  const remove = useDeleteAccount();

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking');
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
  const [dueDay, setDueDay] = useState(String(account?.due_day ?? ''));
  const [formError, setFormError] = useState<string | null>(null);

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
          // Campos de cartão ficam vazios nos outros tipos
          credit_limit_cents: isCard ? limitCents : null,
          closing_day: isCard ? Number(closingDay) : null,
          due_day: isCard ? Number(dueDay) : null,
        },
      },
      { onSuccess: () => navigate('/contas') },
    );
  }

  return (
    <>
      <PageHeader title={account ? 'Editar conta' : 'Nova conta'} backTo="/contas" />
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <Input label="Nome" required maxLength={60} placeholder="Ex.: Nubank, Itaú, Carteira" value={name} onChange={(e) => setName(e.target.value)} />
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
            label={isCard ? 'Valor já gasto e ainda não pago (R$)' : 'Saldo inicial (R$)'}
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
            : 'O saldo atual é este valor somado às transações lançadas. Use "-" na frente para saldo negativo.'}
        </p>

        {isCard && (
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display font-semibold">Fatura</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Dia do fechamento"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                required
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
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
            </div>
            <p className="-mt-2 text-sm text-muted">
              Estão no app do banco ou na fatura. Compras a partir do dia do fechamento entram na fatura seguinte.
            </p>
            <Input label="Limite (R$, opcional)" inputMode="decimal" placeholder="0,00" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
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

        {account && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm text-muted">Excluir a conta apaga também todas as transações dela. Para manter o histórico, prefira desativar.</p>
            {remove.error && <ErrorState error={remove.error} />}
            <ConfirmButton
              confirmLabel="Excluir com transações"
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(account.id, { onSuccess: () => navigate('/contas') })}
            >
              Excluir conta
            </ConfirmButton>
          </div>
        )}
      </form>
    </>
  );
}

function isCardType(type: AccountType) {
  return type === 'credit_card';
}
