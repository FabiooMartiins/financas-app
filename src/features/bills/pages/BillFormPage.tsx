import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
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
import type { Bill, BillFrequency } from '../api';
import { useBillList, useDeleteBill, useSaveBill } from '../hooks/useBills';

// RF-17 (recorrente), RF-20 (lembrete), RF-21 (parcelada)
export function BillFormPage() {
  const { id } = useParams();
  const { data: bills, isPending } = useBillList();

  if (id && isPending) return <LoadingState />;
  const bill = id ? bills?.find((b) => b.id === id) : undefined;
  if (id && !bill) return <ErrorState error={{ message: 'Conta não encontrada.' }} />;

  return <BillForm key={id ?? 'nova'} bill={bill} />;
}

function BillForm({ bill }: { bill?: Bill }) {
  const navigate = useNavigate();
  const save = useSaveBill();
  const remove = useDeleteBill();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill ? centsToInput(bill.amount_cents) : '');
  const [dueDay, setDueDay] = useState(String(bill?.due_day ?? Number(today().slice(8))));
  const [frequency, setFrequency] = useState<BillFrequency>(bill?.frequency ?? 'monthly');
  const [hasInstallments, setHasInstallments] = useState(bill?.installments_total != null);
  const [installments, setInstallments] = useState(String(bill?.installments_total ?? 12));
  const [startMonth, setStartMonth] = useState((bill?.starts_on ?? today()).slice(0, 7));
  const [categoryId, setCategoryId] = useState(bill?.category_id ?? '');
  const [accountId, setAccountId] = useState(bill?.account_id ?? '');
  const [remind, setRemind] = useState(String(bill?.remind_days_before ?? 3));
  const [isActive, setIsActive] = useState(bill?.is_active ?? true);
  const [amountError, setAmountError] = useState<string | null>(null);

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
          name: name.trim(),
          amount_cents: cents,
          due_day: Number(dueDay),
          frequency,
          installments_total: frequency === 'monthly' && hasInstallments ? Number(installments) : null,
          starts_on: `${startMonth}-01`,
          category_id: categoryId || null,
          account_id: accountId || null,
          remind_days_before: Number(remind),
          is_active: isActive,
        },
      },
      { onSuccess: () => navigate('/vencimentos') },
    );
  }

  return (
    <>
      <PageHeader title={bill ? 'Editar conta' : 'Nova conta do mês'} backTo="/vencimentos" />
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <Input label="Nome" required maxLength={60} placeholder="Ex.: Aluguel, Internet, Netflix" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={hasInstallments && frequency === 'monthly' ? 'Valor da parcela (R$)' : 'Valor (R$)'}
            required
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={amountError ?? undefined}
          />
          <Input label="Dia do vencimento" required type="number" inputMode="numeric" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>

        <SegmentedControl
          label="Frequência"
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: 'monthly', label: 'Todo mês' },
            { value: 'yearly', label: 'Todo ano' },
          ]}
        />

        <Input
          label={frequency === 'yearly' ? 'Mês do vencimento (primeiro ano)' : 'Primeiro mês'}
          type="month"
          required
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />

        {frequency === 'monthly' && (
          <div className="flex flex-col gap-3">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input type="checkbox" className="size-5 accent-brand" checked={hasInstallments} onChange={(e) => setHasInstallments(e.target.checked)} />
              É parcelada (tem número de parcelas)
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

        <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categories
            ?.filter((c) => c.kind === 'expense')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
        </Select>
        <Select label="Conta usada para pagar (sugestão)" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Escolher na hora</option>
          {accounts
            ?.filter((a) => a.is_active || a.id === accountId)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </Select>
        <Select label="Avisar com antecedência" value={remind} onChange={(e) => setRemind(e.target.value)}>
          {[0, 1, 2, 3, 5, 7, 10, 15].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? 'No dia do vencimento' : `${d} ${d === 1 ? 'dia' : 'dias'} antes`}
            </option>
          ))}
        </Select>

        {bill && (
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" className="size-5 accent-brand" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Ativa (desmarque quando encerrar, ex.: cancelou a assinatura)
          </label>
        )}

        {save.error && <ErrorState error={save.error} />}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>

        {bill && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm text-muted">Excluir remove a conta e o histórico de pagamentos. As transações já lançadas continuam.</p>
            {remove.error && <ErrorState error={remove.error} />}
            <ConfirmButton
              confirmLabel="Confirmar exclusão"
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(bill.id, { onSuccess: () => navigate('/vencimentos') })}
            >
              Excluir conta
            </ConfirmButton>
          </div>
        )}
      </form>
    </>
  );
}
