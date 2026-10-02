import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { formatDayHeader, monthRange, startOfMonth } from '@/lib/dates';
import type { TransactionRow, TransactionType } from '../api';
import { TransactionItem } from '../components/TransactionItem';
import { useTransactions } from '../hooks/useTransactions';

// RF-11 a RF-15: lista do mês com busca e filtros, agrupada por dia
export function TransactionsPage() {
  // ?mes=aaaa-mm abre direto num mês (ex.: depois de importar um extrato antigo)
  const [params] = useSearchParams();
  const [month, setMonth] = useState(() => {
    const match = /^(\d{4})-(\d{2})$/.exec(params.get('mes') ?? '');
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : startOfMonth(new Date());
  });
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput.trim(), 350);
  const [type, setType] = useState<TransactionType | ''>('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { start, end } = monthRange(month);
  const query = useTransactions({
    start,
    end,
    search: search || undefined,
    type: type || undefined,
    accountId: accountId || undefined,
    categoryId: categoryId || undefined,
  });

  const rows = query.data?.pages.flat() ?? [];
  const activeFilters = [type, accountId, categoryId].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Transações"
        action={
          <div className="flex gap-2">
            <Link to="/transacoes/importar" className={buttonClasses('secondary', 'h-11 px-4 text-sm')}>
              Importar extrato
            </Link>
            <Link to="/transacoes/nova" className={buttonClasses('primary', 'hidden h-11 px-4 text-sm lg:inline-flex')}>
              Nova transação
            </Link>
          </div>
        }
      />

      <MonthSwitcher month={month} onChange={setMonth} />

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Buscar pela descrição</span>
          <input
            type="search"
            placeholder="Buscar pela descrição"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-13 w-full rounded-xl border border-line-strong bg-surface px-4"
          />
        </label>
        <Button variant="secondary" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)} className="px-4">
          Filtros{activeFilters > 0 && ` (${activeFilters})`}
        </Button>
      </div>

      {showFilters && (
        <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value as TransactionType | '')}>
            <option value="">Todos</option>
            <option value="expense">Despesas</option>
            <option value="income">Receitas</option>
            <option value="transfer">Transferências</option>
          </Select>
          <Select label="Conta" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Todas</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </Select>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              className="h-11 sm:col-span-3"
              onClick={() => {
                setType('');
                setAccountId('');
                setCategoryId('');
              }}
            >
              Limpar filtros
            </Button>
          )}
        </Card>
      )}

      {query.isPending && <LoadingState />}
      {query.error && <ErrorState error={query.error} />}
      {query.isSuccess && rows.length === 0 && (
        <EmptyState>
          {search || activeFilters ? 'Nenhuma transação encontrada com esses filtros.' : 'Nenhuma transação neste mês.'}
        </EmptyState>
      )}

      {groupByDay(rows).map(([day, items]) => (
        <section key={day} className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">{formatDayHeader(day)}</h2>
          <Card className="divide-y divide-line">
            {items.map((t) => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </Card>
        </section>
      ))}

      {query.hasNextPage && (
        <Button variant="secondary" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
          {query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}

      {/* Botão flutuante só no celular */}
      <Link
        to="/transacoes/nova"
        aria-label="Nova transação"
        className="fixed right-5 bottom-[calc(96px+env(safe-area-inset-bottom))] flex size-15 items-center justify-center rounded-full bg-brand text-white shadow-lg lg:hidden"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </>
  );
}

function groupByDay(rows: TransactionRow[]): [string, TransactionRow[]][] {
  const groups = new Map<string, TransactionRow[]>();
  for (const row of rows) {
    const list = groups.get(row.occurred_on) ?? [];
    list.push(row);
    groups.set(row.occurred_on, list);
  }
  return [...groups.entries()];
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
