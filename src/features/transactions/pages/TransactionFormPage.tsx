import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { createBill, payBill } from '@/features/bills/api';
import { dueDate as invoiceDueDate, invoiceMonthFor } from '@/features/cards/invoices';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { formatDate, parseISODate, startOfMonth, today } from '@/lib/dates';
import { centsToInput, formatCents, parseToCents } from '@/lib/money';
import { refreshAll } from '@/lib/queryClient';
import type { TransactionInput, TransactionRow, TransactionType } from '../api';
import { useCreateTransaction, useDeleteTransaction, useTransaction, useUpdateTransaction } from '../hooks/useTransactions';

type Repeat = 'once' | 'installments' | 'monthly';

// RF-11 (lançar), RF-12 (editar/excluir), RF-13 (transferência),
// RF-17 (repetir todo mês), RF-21 (parcelado), RN-05 (importadas)
export function TransactionFormPage() {
  const { id } = useParams();
  const existing = useTransaction(id);

  if (id && existing.isPending) return <LoadingState />;
  if (id && existing.error) return <ErrorState error={existing.error} />;
  return <TransactionForm key={id ?? 'nova'} transaction={existing.data} />;
}

function TransactionForm({ transaction }: { transaction?: TransactionRow }) {
  const navigate = useNavigate();
  const { data: accounts, isPending: loadingAccounts } = useAccounts();
  const { data: categories } = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const createRecurring = useMutation({
    // "Todo mês": cria a conta mensal (a pagar ou a receber) e já marca este mês como pago/recebido
    mutationFn: async (input: TransactionInput) => {
      const billId = await createBill({
        kind: input.type === 'income' ? 'income' : 'expense',
        name: input.description,
        amount_cents: input.amount_cents,
        due_day: parseISODate(input.occurred_on).getDate(),
        frequency: 'monthly',
        category_id: input.category_id,
        account_id: input.account_id,
        remind_days_before: 3,
        installments_total: null,
        starts_on: input.occurred_on.slice(0, 8) + '01',
        is_active: true,
      });
      await payBill(billId, startOfMonth(parseISODate(input.occurred_on)), input.account_id, input.occurred_on);
    },
    onSuccess: refreshAll,
  });

  const isEdit = !!transaction;
  const fromBank = transaction?.source === 'bank';
  const active = accounts?.filter((a) => a.is_active || a.id === transaction?.account_id || a.id === transaction?.transfer_account_id) ?? [];

  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amount_cents) : '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [date, setDate] = useState(transaction?.occurred_on ?? today());
  const [chosenAccount, setAccountId] = useState(transaction?.account_id ?? '');
  const [chosenTarget, setTargetId] = useState(transaction?.transfer_account_id ?? '');
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '');
  const [repeat, setRepeat] = useState<Repeat>('once');
  const [installments, setInstallments] = useState('2');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const accountId = chosenAccount || active[0]?.id || '';
  const targetId = chosenTarget || active.find((a) => a.id !== accountId)?.id || '';
  const kindCategories = categories?.filter((c) => c.kind === type) ?? [];
  const cents = parseToCents(amount);
  const nInstallments = Number(installments);

  const saving = create.isPending || update.isPending || createRecurring.isPending;
  const saveError = create.error ?? update.error ?? createRecurring.error;

  if (loadingAccounts) return <LoadingState />;
  if (!isEdit && active.length === 0) {
    return (
      <>
        <PageHeader title="Nova transação" backTo="/transacoes" />
        <EmptyState>
          Antes de lançar transações, cadastre pelo menos uma conta.{' '}
          <Link to="/contas/nova" className="font-semibold text-brand underline">
            Cadastrar conta
          </Link>
        </EmptyState>
      </>
    );
  }

  function changeType(next: TransactionType) {
    setType(next);
    setCategoryId('');
    if (next === 'transfer' || (next === 'income' && repeat === 'installments')) setRepeat('once');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (fromBank) {
      // RN-05: só categoria e descrição
      update.mutate(
        { id: transaction!.id, input: { description: description.trim(), category_id: categoryId || null } },
        { onSuccess: () => navigate('/transacoes') },
      );
      return;
    }

    if (!cents || cents <= 0) {
      setAmountError('Informe um valor maior que zero.');
      return;
    }
    setAmountError(null);
    if (type === 'transfer' && (!targetId || targetId === accountId)) {
      setFormError('Para transferir, escolha duas contas diferentes. Se só tem uma, cadastre a outra em Contas.');
      return;
    }
    setFormError(null);

    const input: TransactionInput = {
      type,
      amount_cents: cents,
      description: description.trim() || (type === 'transfer' ? 'Transferência' : ''),
      occurred_on: date,
      account_id: accountId,
      transfer_account_id: type === 'transfer' ? targetId : null,
      category_id: type === 'transfer' ? null : categoryId || null, // RN-01: transferência não tem categoria
    };

    const done = { onSuccess: () => navigate('/transacoes') };
    if (isEdit) update.mutate({ id: transaction!.id, input }, done);
    else if (repeat === 'monthly') createRecurring.mutate(input, done);
    else create.mutate({ input, installments: repeat === 'installments' ? nInstallments : 1 }, done);
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Editar transação' : 'Nova transação'} backTo="/transacoes" />
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        {fromBank && (
          <p className="rounded-xl bg-ground p-3 text-sm text-muted">
            Importada do banco: só a descrição e a categoria podem ser alteradas.
          </p>
        )}

        <SegmentedControl
          label="Tipo de transação"
          value={type}
          onChange={changeType}
          disabled={fromBank}
          options={[
            { value: 'expense', label: 'Despesa' },
            { value: 'income', label: 'Receita' },
            { value: 'transfer', label: 'Transferência' },
          ]}
        />

        <Input
          label={repeat === 'installments' ? 'Valor total da compra (R$)' : 'Valor (R$)'}
          required
          inputMode="decimal"
          placeholder="0,00"
          disabled={fromBank}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={amountError ?? undefined}
          autoFocus={!isEdit}
        />
        <Input
          label="Descrição"
          required={type !== 'transfer'}
          maxLength={120}
          placeholder={type === 'transfer' ? 'Ex.: Pagamento da fatura' : 'Ex.: Mercado, Salário'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input label="Data" type="date" required disabled={fromBank} value={date} onChange={(e) => setDate(e.target.value)} />

        {type === 'transfer' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <AccountSelect label="De" value={accountId} onChange={setAccountId} accounts={active} disabled={fromBank} />
            <AccountSelect
              label="Para"
              value={targetId}
              onChange={setTargetId}
              accounts={active.filter((a) => a.id !== accountId)}
              disabled={fromBank}
            />
          </div>
        ) : (
          <>
            <AccountSelect
              label={type === 'income' ? 'Recebido em' : 'Pago com'}
              value={accountId}
              onChange={setAccountId}
              accounts={active}
              disabled={fromBank}
            />
            <CardInvoiceHint account={active.find((a) => a.id === accountId)} date={date} type={type} />
            <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {kindCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </Select>
          </>
        )}

        {type === 'transfer' && (
          <p className="-mt-2 text-sm text-muted">
            Transferências entre suas contas não contam como receita nem despesa. Para pagar a fatura do cartão, transfira da conta corrente para o
            cartão.
          </p>
        )}

        {!isEdit && type !== 'transfer' && (
          <div className="flex flex-col gap-3">
            <SegmentedControl
              label="Repetição"
              value={repeat}
              onChange={setRepeat}
              options={[
                { value: 'once', label: 'Única' },
                ...(type === 'expense' ? [{ value: 'installments' as const, label: 'Parcelada' }] : []),
                { value: 'monthly', label: 'Todo mês' },
              ]}
            />
            {repeat === 'installments' && (
              <>
                <Input
                  label="Número de parcelas"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={48}
                  required
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
                {cents && nInstallments >= 2 ? (
                  <p className="-mt-2 text-sm text-muted">
                    {nInstallments}× de {formatCents(Math.floor(cents / nInstallments))}, uma por mês a partir da data acima.
                  </p>
                ) : null}
              </>
            )}
            {repeat === 'monthly' && (
              <p className="text-sm text-muted">
                {type === 'income'
                  ? `Cria um recebimento mensal todo dia ${parseISODate(date).getDate()} nesta conta e marca este mês como recebido. Os próximos aparecem em Contas do mês, aba A receber.`
                  : `Cria uma conta mensal com vencimento todo dia ${parseISODate(date).getDate()} e marca este mês como pago. Os próximos meses aparecem em Contas do mês.`}
              </p>
            )}
          </div>
        )}

        {formError && <ErrorState error={{ message: formError }} />}
        {saveError && <ErrorState error={saveError} />}
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>

        {isEdit && !fromBank && (
          <div className="mt-4 border-t border-line pt-4">
            {remove.error && <ErrorState error={remove.error} />}
            <ConfirmButton
              className="w-full"
              confirmLabel="Confirmar exclusão"
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(transaction!.id, { onSuccess: () => navigate('/transacoes') })}
            >
              Excluir transação
            </ConfirmButton>
          </div>
        )}
      </form>
    </>
  );
}

function AccountSelect({
  label,
  value,
  onChange,
  accounts,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  accounts: { id: string; name: string }[];
  disabled?: boolean;
}) {
  return (
    <Select label={label} value={value} required disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </Select>
  );
}

/** Compra no cartão: mostra em qual fatura cai (RN-02). */
function CardInvoiceHint({
  account,
  date,
  type,
}: {
  account?: { type: string; closing_day: number | null; due_day: number | null };
  date: string;
  type: TransactionType;
}) {
  if (type !== 'expense' || !date || account?.type !== 'credit_card' || !account.closing_day || !account.due_day) return null;
  const card = { closing_day: account.closing_day, due_day: account.due_day };
  const { year, month } = invoiceMonthFor(card, date);
  return <p className="-mt-2 text-sm text-muted">Entra na fatura que vence em {formatDate(invoiceDueDate(card, year, month))}.</p>;
}
