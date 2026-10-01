import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { today } from '@/lib/dates';
import { centsToInput, parseToCents } from '@/lib/money';
import type { Bill, BillFrequency, BillKind } from '../api';
import { useBillList, useDeleteBill, useSaveBill } from '../hooks/useBills';

// RF-17 (recorrente), RF-20 (lembrete), RF-21 (parcelada) e recebimentos previstos
export function BillFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data: bills, isPending } = useBillList();

  if (id && isPending) return <LoadingState />;
  const bill = id ? bills?.find((b) => b.id === id) : undefined;
  if (id && !bill) return <ErrorState error={{ message: 'Conta não encontrada.' }} />;

  const kind: BillKind = bill?.kind ?? (params.get('tipo') === 'receber' ? 'income' : 'expense');
  return <BillForm key={id ?? `nova-${kind}`} bill={bill} kind={kind} />;
}

function BillForm({ bill, kind }: { bill?: Bill; kind: BillKind }) {
  const navigate = useNavigate();
  const save = useSaveBill();
  const remove = useDeleteBill();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const isIncome = kind === 'income';
  const backTo = isIncome ? '/vencimentos?aba=receber' : '/vencimentos';

  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill ? centsToInput(bill.amount_cents) : '');
  const [frequency, setFrequency] = useState<BillFrequency>(bill?.frequency ?? (isIncome ? 'once' : 'monthly'));
  // "Uma vez" usa a data completa; mensal/anual usam dia + mês de início
  const [date, setDate] = useState(bill ? `${bill.starts_on.slice(0, 8)}${String(bill.due_day).padStart(2, '0')}` : today());
  const [dueDay, setDueDay] = useState(String(bill?.due_day ?? Number(today().slice(8))));
  const [startMonth, setStartMonth] = useState((bill?.starts_on ?? today()).slice(0, 7));
  const [hasInstallments, setHasInstallments] = useState(bill?.installments_total != null);
  const [installments, setInstallments] = useState(String(bill?.installments_total ?? 12));
  const [categoryId, setCategoryId] = useState(bill?.category_id ?? '');
  const [chosenAccount, setAccountId] = useState(bill?.account_id ?? '');
  const [remind, setRemind] = useState(String(bill?.remind_days_before ?? 3));
  const [isActive, setIsActive] = useState(bill?.is_active ?? true);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Recebimento cai numa conta de verdade (não em cartão)
  const accountOptions = accounts?.filter((a) => (a.is_active || a.id === chosenAccount) && (!isIncome || a.type !== 'credit_card')) ?? [];
  const accountId = isIncome ? chosenAccount || accountOptions[0]?.id || '' : chosenAccount;
  const once = frequency === 'once';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cents = parseToCents(amount);
    if (!cents || cents <= 0) {
      setAmountError('Informe um valor maior que zero.');
      return;
    }
    setAmountError(null);
    save.mutate(
      {
        id: bill?.id,
        input: {
          kind,
          name: name.trim(),
          amount_cents: cents,
          due_day: once ? Number(date.slice(8)) : Number(dueDay),
          frequency,
          installments_total: frequency === 'monthly' && hasInstallments ? Number(installments) : null,
          starts_on: once ? `${date.slice(0, 8)}01` : `${startMonth}-01`,
          category_id: categoryId || null,
          account_id: accountId || null,
          remind_days_before: Number(remind),
          is_active: isActive,
        },
      },
      { onSuccess: () => navigate(backTo) },
    );
  }

  const title = bill ? (isIncome ? 'Editar recebimento' : 'Editar conta') : isIncome ? 'Novo recebimento' : 'Nova conta do mês';

  return (
    <>
      <PageHeader title={title} backTo={backTo} />
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <Input
          label={isIncome ? 'De onde vem' : 'Nome'}
          required
          maxLength={60}
          placeholder={isIncome ? 'Ex.: Salário, Freela site, Reembolso' : 'Ex.: Aluguel, Internet, Netflix'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={hasInstallments && frequency === 'monthly' ? 'Valor da parcela (R$)' : 'Valor (R$)'}
          required
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={amountError ?? undefined}
        />

        <SegmentedControl
          label="Frequência"
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: 'once', label: 'Uma vez' },
            { value: 'monthly', label: 'Todo mês' },
            { value: 'yearly', label: 'Todo ano' },
          ]}
        />

        {once ? (
          <Input
            label={isIncome ? 'Data prevista' : 'Data do vencimento'}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isIncome ? 'Dia do recebimento' : 'Dia do vencimento'}
              required
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
            <Input
              label={frequency === 'yearly' ? 'Mês (primeiro ano)' : 'A partir de'}
              type="month"
              required
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </div>
        )}

        {frequency === 'monthly' && (
          <div className="flex flex-col gap-3">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input type="checkbox" className="size-5 accent-brand" checked={hasInstallments} onChange={(e) => setHasInstallments(e.target.checked)} />
              {isIncome ? 'Tem número de parcelas (ex.: venda parcelada)' : 'É parcelada (tem número de parcelas)'}
            </label>
            {hasInstallments && (
              <Input
                label="Número de parcelas"
                type="number"
                inputMode="numeric"
                min={2}
                max={120}
                required
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            )}
          </div>
        )}

        {isIncome ? (
          <Select label="Conta onde vai receber" required value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        ) : (
          <Select label="Conta usada para pagar (sugestão)" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Escolher na hora</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        )}

        <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categories
            ?.filter((c) => c.kind === kind)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
        </Select>

        <Select label="Avisar com antecedência" value={remind} onChange={(e) => setRemind(e.target.value)}>
          {[0, 1, 2, 3, 5, 7, 10, 15].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? 'No dia' : `${d} ${d === 1 ? 'dia' : 'dias'} antes`}
            </option>
          ))}
        </Select>

        {bill && !once && (
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" className="size-5 accent-brand" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {isIncome ? 'Ativo (desmarque quando parar de receber)' : 'Ativa (desmarque quando encerrar, ex.: cancelou a assinatura)'}
          </label>
        )}

        {isIncome && (
          <p className="text-sm text-muted">
            Não entra no saldo até você marcar como recebido. Aí vira uma receita na conta escolhida.
          </p>
        )}

        {save.error && <ErrorState error={save.error} />}
        <Button type="submit" disabled={save.isPending || (isIncome && !accountId)}>
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>

        {bill && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm text-muted">
              Excluir remove o cadastro e o histórico de {isIncome ? 'recebimentos' : 'pagamentos'}. As transações já lançadas continuam.
            </p>
            {remove.error && <ErrorState error={remove.error} />}
            <ConfirmButton
              confirmLabel="Confirmar exclusão"
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(bill.id, { onSuccess: () => navigate(backTo) })}
            >
              Excluir
            </ConfirmButton>
          </div>
        )}
      </form>
    </>
  );
}
