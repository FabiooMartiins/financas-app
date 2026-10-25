import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/States';
import { centsToInput, formatCents, parseToCents } from '@/lib/money';
import { accountGroup, type Account, type AdjustMode } from '../api';
import { useAdjustBalance } from '../hooks/useAccounts';

/** RF-30: ajustar o saldo atual informando o saldo real (do app do banco). */
export function AdjustBalanceForm({ account, onDone }: { account: Account; onDone?: () => void }) {
  const adjust = useAdjustBalance();
  const isInvestment = accountGroup(account.type) === 'investment';
  const [real, setReal] = useState(centsToInput(account.current_balance_cents));
  const [mode, setMode] = useState<AdjustMode>('transaction');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const negative = real.trim().startsWith('-');
  const parsed = parseToCents(real);
  const realCents = parsed === null ? null : negative ? -parsed : parsed;
  const diff = realCents === null ? 0 : realCents - account.current_balance_cents;

  function submit() {
    if (realCents === null) {
      setError('Valor inválido. Use o formato 1.234,56.');
      return;
    }
    setError(null);
    adjust.mutate(
      { account, realCents, mode },
      {
        onSuccess: () => {
          setDone(true);
          onDone?.();
        },
      },
    );
  }

  if (account.fromBank) {
    return <p className="text-sm text-muted">O saldo desta conta vem do banco e é atualizado na sincronização.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted">Saldo no app</span>
        <span className="font-semibold">{formatCents(account.current_balance_cents)}</span>
      </div>
      <Input
        label={isInvestment ? 'Saldo de hoje no banco (R$)' : 'Saldo real no banco (R$)'}
        inputMode="decimal"
        value={real}
        onChange={(e) => {
          setReal(e.target.value);
          setDone(false);
        }}
        error={error ?? undefined}
      />
      {diff !== 0 && (
        <p className="text-sm">
          Diferença:{' '}
          <strong className={diff > 0 ? 'text-income' : 'text-expense'}>
            {diff > 0 ? '+' : '−'} {formatCents(Math.abs(diff))}
          </strong>
        </p>
      )}

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">Como registrar a diferença</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="radio" name={`modo-${account.id}`} className="size-5 accent-brand" checked={mode === 'transaction'} onChange={() => setMode('transaction')} />
          {isInvestment ? 'Lançar como rendimento (entra no lucro)' : 'Lançar como transação “Ajuste de saldo”'}
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="radio" name={`modo-${account.id}`} className="size-5 accent-brand" checked={mode === 'silent'} onChange={() => setMode('silent')} />
          Só corrigir o saldo, sem transação
        </label>
      </fieldset>
      <p className="-mt-1 text-sm text-muted">Ajustes e rendimentos não contam como receita nem despesa nos relatórios.</p>

      {adjust.error && <ErrorState error={adjust.error} />}
      {done && diff === 0 && <p className="text-sm font-semibold text-income" role="status">Saldo ajustado.</p>}
      <Button variant="secondary" className="h-11 text-sm" disabled={adjust.isPending || diff === 0} onClick={submit}>
        {adjust.isPending ? 'Ajustando…' : 'Ajustar saldo'}
      </Button>
    </div>
  );
}
