import { useState, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type { Account } from '@/features/accounts/api';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { isConfiguredCard } from '@/features/cards/hooks/useCards';
import type { Category } from '@/features/categories/api';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { formatDate, formatDayMonth, formatMonthYear, parseISODate, toISODate } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { refreshAll } from '@/lib/queryClient';
import { findExistingExternalIds, fixImported, insertImported, listAccountTransactions, listCategoryHistory } from '../api';
import { alignCardInstallments } from '../cardInstallments';
import {
  csvEntries,
  decodeFile,
  detectCsvMapping,
  looksLikeOfx,
  parseCsv,
  parseOfx,
  type CsvMapping,
  type Statement,
  type StatementEntry,
} from '../parsers';
import { buildReview, importExternalIds, type ReviewRow, type RowType } from '../review';

interface ImportResult {
  inserted: number;
  /** Marcados, mas já existiam no app (mesmo identificador) */
  skipped: number;
  /** Parcelas já importadas que foram movidas para o mês certo */
  fixed: number;
  firstDate: string;
}

type Loaded =
  | { kind: 'ofx'; name: string; statement: Statement }
  | { kind: 'csv'; name: string; rows: string[][]; mapping: CsvMapping | null };

// Importação de extrato OFX/CSV: lê o arquivo no aparelho, mostra a revisão e grava só o que for marcado
export function ImportPage() {
  const [params] = useSearchParams();
  const { data: accounts, isPending, error } = useAccounts();
  const { data: categories } = useCategories();
  const [chosenAccountId, setAccountId] = useState(params.get('conta') ?? '');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  const active = accounts.filter((a) => a.is_active);
  const account = active.find((a) => a.id === chosenAccountId) ?? active[0];

  if (!account) {
    return (
      <>
        <PageHeader title="Importar extrato" backTo="/transacoes" />
        <EmptyState>
          Cadastre primeiro a conta ou o cartão do extrato.{' '}
          <Link to="/contas/nova" className="font-semibold text-brand underline">
            Cadastrar conta
          </Link>
        </EmptyState>
      </>
    );
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setFileError(null);
    setDone(null);
    try {
      const text = decodeFile(await file.arrayBuffer());
      if (looksLikeOfx(text)) {
        const statement = parseOfx(text);
        if (statement.entries.length === 0) throw new Error('Nenhum lançamento encontrado no arquivo OFX.');
        setLoaded({ kind: 'ofx', name: file.name, statement });
      } else {
        const rows = parseCsv(text);
        if (rows.length < 2) throw new Error('Arquivo vazio ou em formato não reconhecido. Use OFX ou CSV.');
        setLoaded({ kind: 'csv', name: file.name, rows, mapping: detectCsvMapping(rows, account.type === 'credit_card') });
      }
    } catch (e) {
      setLoaded(null);
      setFileError(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    }
  }

  const rawEntries: StatementEntry[] =
    loaded?.kind === 'ofx' ? loaded.statement.entries : loaded?.kind === 'csv' && loaded.mapping ? csvEntries(loaded.rows, loaded.mapping) : [];
  // Cartão: parcelas que o banco manda na data da compra original vão para a fatura do arquivo
  const entries = isConfiguredCard(account) ? alignCardInstallments(rawEntries, account) : rawEntries;

  return (
    <>
      <PageHeader title="Importar extrato" backTo="/transacoes" />

      <Card className="flex flex-col gap-4 p-4">
        <Select
          label="Conta ou cartão do extrato"
          value={account.id}
          onChange={(e) => {
            setAccountId(e.target.value);
            setDone(null);
          }}
        >
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <div className="flex flex-col gap-2">
          <label className={buttonClasses('secondary', 'cursor-pointer')}>
            <input type="file" accept=".ofx,.csv,.txt,text/csv,application/x-ofx" className="sr-only" onChange={handleFile} />
            {loaded ? 'Trocar arquivo' : 'Escolher arquivo OFX ou CSV'}
          </label>
          {loaded && <p className="truncate text-sm text-muted">Arquivo: {loaded.name}</p>}
          {fileError && <p className="text-sm font-semibold text-expense">{fileError}</p>}
          {!loaded && (
            <p className="text-sm text-muted">
              No app ou site do banco, exporte o extrato (ou a fatura do cartão) em <strong>OFX</strong>, que é o mais confiável, ou em CSV. Nada é
              gravado antes da sua revisão, e importar o mesmo arquivo de novo não duplica lançamentos.
            </p>
          )}
        </div>
      </Card>

      {loaded?.kind === 'ofx' && loaded.statement.isCreditCard !== (account.type === 'credit_card') && (
        <p role="alert" className="rounded-2xl bg-warn-soft p-4 text-sm font-semibold text-warn">
          {loaded.statement.isCreditCard
            ? 'Este arquivo parece ser de cartão de crédito, mas a conta escolhida não é um cartão.'
            : 'Este arquivo parece ser de conta corrente, mas a conta escolhida é um cartão.'}
        </p>
      )}

      {loaded?.kind === 'csv' && (
        <CsvMappingCard rows={loaded.rows} mapping={loaded.mapping} onChange={(mapping) => setLoaded({ ...loaded, mapping })} />
      )}

      {done !== null && (
        <Card className="flex flex-col gap-3 p-5">
          <p className="font-display font-semibold">
            {done.inserted} {done.inserted === 1 ? 'transação importada' : 'transações importadas'}.
          </p>
          {done.skipped > 0 && (
            <p className="text-sm text-muted">
              {done.skipped} {done.skipped === 1 ? 'já estava' : 'já estavam'} no app e {done.skipped === 1 ? 'foi ignorada' : 'foram ignoradas'}.
            </p>
          )}
          {done.fixed > 0 && (
            <p className="text-sm text-muted">
              {done.fixed} {done.fixed === 1 ? 'parcela importada antes foi movida' : 'parcelas importadas antes foram movidas'} para o mês certo.
            </p>
          )}
          {(done.inserted > 0 || done.fixed > 0) && (
            <div className="flex flex-wrap gap-2">
              <Link to={`/transacoes?mes=${done.firstDate.slice(0, 7)}`} className={buttonClasses('primary', 'h-11 px-4 text-sm')}>
                Ver em {formatMonthYear(parseISODate(done.firstDate)).toLowerCase()}
              </Link>
              {account.type === 'credit_card' && (
                <Link to={`/cartoes/${account.id}`} className={buttonClasses('secondary', 'h-11 px-4 text-sm')}>
                  Ver faturas do cartão
                </Link>
              )}
            </div>
          )}
        </Card>
      )}

      {loaded && entries.length > 0 && done === null && categories && (
        <Review
          key={`${account.id}|${loaded.name}|${entries.length}|${loaded.kind === 'csv' ? JSON.stringify(loaded.mapping) : ''}`}
          account={account}
          accounts={active}
          categories={categories}
          entries={entries}
          bankBalance={loaded.kind === 'ofx' ? loaded.statement.balance : null}
          onDone={(result) => {
            setLoaded(null);
            setDone(result);
          }}
        />
      )}
      {loaded?.kind === 'csv' && loaded.mapping && entries.length === 0 && (
        <EmptyState>Nenhum lançamento reconhecido com essas colunas. Confira a coluna de data e de valor.</EmptyState>
      )}
    </>
  );
}

function CsvMappingCard({ rows, mapping, onChange }: { rows: string[][]; mapping: CsvMapping | null; onChange: (m: CsvMapping) => void }) {
  const current: CsvMapping = mapping ?? { headerRow: 0, date: 0, description: 1, amount: 2, credit: null, debit: null, id: null, invert: false };
  const headers = rows[current.headerRow].map((h, i) => h || `Coluna ${i + 1}`);
  const separate = current.amount === null;
  const column = (value: number | null, set: (v: number | null) => void, label: string, optional = false) => (
    <Select label={label} value={value ?? ''} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}>
      {optional && <option value="">Nenhuma</option>}
      {headers.map((h, i) => (
        <option key={i} value={i}>
          {h}
        </option>
      ))}
    </Select>
  );

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-display font-semibold">Colunas do CSV</h2>
        <p className="text-sm text-muted">
          {mapping ? 'Reconhecemos as colunas abaixo. Confira se estão certas.' : 'Não reconhecemos as colunas automaticamente. Escolha abaixo.'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {column(current.date, (v) => onChange({ ...current, date: v ?? 0 }), 'Data')}
        {column(current.description, (v) => onChange({ ...current, description: v ?? 0 }), 'Descrição')}
        <Select
          label="Valores"
          value={separate ? 'separate' : 'single'}
          onChange={(e) =>
            onChange(
              e.target.value === 'separate'
                ? { ...current, amount: null, credit: current.credit ?? 0, debit: current.debit ?? 0 }
                : { ...current, amount: current.amount ?? 0, credit: null, debit: null },
            )
          }
        >
          <option value="single">Uma coluna (com sinal)</option>
          <option value="separate">Colunas de entrada e saída</option>
        </Select>
        {separate ? (
          <>
            {column(current.credit, (v) => onChange({ ...current, credit: v }), 'Entradas')}
            {column(current.debit, (v) => onChange({ ...current, debit: v }), 'Saídas')}
          </>
        ) : (
          column(current.amount, (v) => onChange({ ...current, amount: v }), 'Valor')
        )}
        {column(current.id, (v) => onChange({ ...current, id: v }), 'Identificador (opcional)', true)}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="size-5 shrink-0 accent-brand" checked={current.invert} onChange={(e) => onChange({ ...current, invert: e.target.checked })} />
        Valores positivos são gastos (comum em CSV de fatura de cartão)
      </label>
    </Card>
  );
}

function Review({
  account,
  accounts,
  categories,
  entries,
  bankBalance,
  onDone,
}: {
  account: Account;
  accounts: Account[];
  categories: Category[];
  entries: StatementEntry[];
  bankBalance: Statement['balance'];
  onDone: (result: ImportResult) => void;
}) {
  // Inclui a data original do banco: parcelas já gravadas podem estar no mês da compra
  const dates = entries.flatMap((e) => (e.bankDate ? [e.date, e.bankDate] : [e.date])).sort();
  const [first, last] = [dates[0], dates[dates.length - 1]];
  const base = useQuery({
    queryKey: ['import-review', account.id, first, last, entries.length],
    queryFn: async () => {
      const [existing, imported, history] = await Promise.all([
        // ±5 dias para achar lançamentos manuais com data um pouco diferente
        listAccountTransactions(account.id, shiftDays(first, -5), shiftDays(last, 5)),
        // Confere em todas as datas: o mesmo ID pode já ter sido gravado em outro mês
        findExistingExternalIds(importExternalIds(entries, account.id)),
        listCategoryHistory(),
      ]);
      return { existing, imported, history };
    },
    staleTime: 0,
    gcTime: 0,
  });

  if (base.isPending) return <LoadingState label="Comparando com o que já está no app…" />;
  if (base.error) return <ErrorState error={base.error} />;
  return (
    <ReviewList
      initialRows={buildReview({ entries, account, accounts, categories, ...base.data })}
      account={account}
      accounts={accounts}
      categories={categories}
      bankBalance={bankBalance}
      onDone={onDone}
    />
  );
}

function ReviewList({
  initialRows,
  account,
  accounts,
  categories,
  bankBalance,
  onDone,
}: {
  initialRows: ReviewRow[];
  account: Account;
  accounts: Account[];
  categories: Category[];
  bankBalance: Statement['balance'];
  onDone: (result: ImportResult) => void;
}) {
  const [rows, setRows] = useState(initialRows);
  // Cartão com vários cartões (físico, virtual, adicional): em qual deles foram as compras do arquivo
  const [cardName, setCardName] = useState('');
  const update = (key: string, change: Partial<ReviewRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const visible = rows.filter((r) => r.status !== 'imported');
  const alreadyImported = rows.length - visible.length;
  const duplicates = visible.filter((r) => r.status === 'duplicate').length;
  const selected = visible.filter((r) => r.selected);
  const missingAccount = selected.some((r) => r.type === 'transfer' && !r.otherAccountId);
  const otherAccounts = accounts.filter((a) => a.id !== account.id);
  const fixes = rows.flatMap((r) => (r.fix ? [r.fix] : []));
  const nothingToDo = selected.length === 0 && fixes.length === 0;

  const save = useMutation({
    mutationFn: async () => {
      await fixImported(fixes);
      if (selected.length === 0) return 0;
      return insertImported(
        selected.map((r) => {
          const out = r.entry.amountCents < 0;
          const transfer = r.type === 'transfer';
          return {
            type: r.type,
            amount_cents: Math.abs(r.entry.amountCents),
            description: r.entry.description,
            occurred_on: r.entry.date,
            // Transferência: sai da conta de origem e entra na de destino (RN-01)
            account_id: transfer && !out ? r.otherAccountId : account.id,
            transfer_account_id: transfer ? (out ? r.otherAccountId : account.id) : null,
            category_id: transfer ? null : r.categoryId || null,
            card_name: account.type === 'credit_card' && !transfer && cardName ? cardName : null,
            external_id: r.externalId,
          };
        }),
      );
    },
    onSuccess: async (inserted) => {
      await refreshAll();
      onDone({
        inserted,
        skipped: selected.length - inserted,
        fixed: fixes.length,
        firstDate: [...selected.map((r) => r.entry.date), ...fixes.map((f) => f.occurred_on)].sort()[0],
      });
    },
  });

  // Conferência com o saldo que o banco informou no OFX (conta corrente)
  const selectedNet = selected.reduce((s, r) => s + r.entry.amountCents, 0);
  const appBalanceAfter = account.current_balance_cents + selectedNet;
  const showBalance = bankBalance && account.type !== 'credit_card';

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-display font-semibold">Revisar lançamentos</h2>
        <p className="text-sm text-muted">
          {visible.length - duplicates} {visible.length - duplicates === 1 ? 'novo' : 'novos'}
          {duplicates > 0 && ` · ${duplicates} possivelmente já lançados (desmarcados)`}
          {alreadyImported > 0 && ` · ${alreadyImported} já importados antes (ignorados)`}
        </p>
        {fixes.length > 0 && (
          <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">
            {fixes.length} {fixes.length === 1 ? 'parcela importada antes está' : 'parcelas importadas antes estão'} no mês da compra original e{' '}
            {fixes.length === 1 ? 'será movida' : 'serão movidas'} para a fatura certa.
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        fixes.length === 0 && <EmptyState>Tudo deste arquivo já foi importado. O extrato está em dia.</EmptyState>
      ) : (
        <>
          {account.card_names.length > 0 && (
            <Select label="Compras feitas com qual cartão?" value={cardName} onChange={(e) => setCardName(e.target.value)}>
              <option value="">Não informar</option>
              {account.card_names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="h-11 flex-1 text-sm" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, selected: r.status !== 'imported' })))}>
              Marcar todos
            </Button>
            <Button variant="secondary" className="h-11 flex-1 text-sm" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, selected: false })))}>
              Desmarcar todos
            </Button>
          </div>

          <Card className="divide-y divide-line">
            {visible.map((r) => (
              <ReviewItem key={r.key} row={r} categories={categories} otherAccounts={otherAccounts} onChange={(change) => update(r.key, change)} />
            ))}
          </Card>
        </>
      )}

      {showBalance && (
        <Card className="flex flex-col gap-1 p-4 text-sm">
          <p>
            Saldo no banco em {formatDate(bankBalance.date)}: <strong>{formatCents(bankBalance.cents)}</strong>
          </p>
          <p>
            Saldo no app depois de importar: <strong>{formatCents(appBalanceAfter)}</strong>
          </p>
          {appBalanceAfter !== bankBalance.cents && (
            <p className="text-muted">
              Diferença de {formatCents(Math.abs(appBalanceAfter - bankBalance.cents))}: confira lançamentos marcados como duplicados, transações com data
              futura ou o saldo inicial da conta.
            </p>
          )}
        </Card>
      )}

      {save.error && <ErrorState error={save.error} />}
      {missingAccount && <p className="text-sm font-semibold text-expense">Escolha a outra conta nas transferências marcadas.</p>}
      {(visible.length > 0 || fixes.length > 0) && (
        <Button disabled={nothingToDo || missingAccount || save.isPending} onClick={() => save.mutate()}>
          {save.isPending
            ? 'Importando…'
            : nothingToDo
              ? 'Nada marcado para importar'
              : selected.length === 0
                ? `Corrigir ${fixes.length} ${fixes.length === 1 ? 'parcela' : 'parcelas'}`
                : `Importar ${selected.length} ${selected.length === 1 ? 'transação' : 'transações'}`}
        </Button>
      )}
    </section>
  );
}

const smallSelect = 'h-11 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-2 text-base';

function ReviewItem({
  row,
  categories,
  otherAccounts,
  onChange,
}: {
  row: ReviewRow;
  categories: Category[];
  otherAccounts: Account[];
  onChange: (change: Partial<ReviewRow>) => void;
}) {
  const { entry } = row;
  const out = entry.amountCents < 0;
  const options = categories.filter((c) => c.kind === row.type);

  return (
    <div className={`flex gap-3 px-4 py-3 ${row.selected ? '' : 'opacity-60'}`}>
      <label className="-m-2 flex size-11 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="size-5 accent-brand"
          checked={row.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          aria-label={`Importar ${entry.description}`}
        />
      </label>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{entry.description}</p>
            <p className="text-sm text-muted">
              {formatDayMonth(entry.date)}
              {row.status === 'duplicate' && <span className="font-semibold text-warn"> · Possivelmente já lançado</span>}
            </p>
          </div>
          <p className={`shrink-0 font-display font-semibold ${out ? 'text-expense' : 'text-income'}`}>
            {out ? '−' : '+'} {formatCents(Math.abs(entry.amountCents))}
          </p>
        </div>
        {row.selected && (
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Tipo"
              className={smallSelect}
              value={row.type}
              onChange={(e) => onChange({ type: e.target.value as RowType, categoryId: '' })}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
              {otherAccounts.length > 0 && <option value="transfer">Transferência</option>}
            </select>
            {row.type === 'transfer' ? (
              <select
                aria-label={out ? 'Para a conta' : 'Da conta'}
                className={smallSelect}
                value={row.otherAccountId}
                onChange={(e) => onChange({ otherAccountId: e.target.value })}
              >
                <option value="">{out ? 'Para…' : 'De…'}</option>
                {otherAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {out ? 'Para ' : 'De '}
                    {a.name}
                  </option>
                ))}
              </select>
            ) : (
              <select aria-label="Categoria" className={smallSelect} value={row.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}>
                <option value="">Sem categoria</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function shiftDays(isoDate: string, days: number): string {
  const date = parseISODate(isoDate);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}
