import { useQuery } from '@tanstack/react-query';
import { accountGroup } from '@/features/accounts/api';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { today } from '@/lib/dates';
import { listInvestmentMovements } from '../api';
import { summarizeInvestment, type InvestmentSummary } from '../returns';

/** Poupanças e caixinhas ativas com valor aplicado, lucro e rendimento do mês. */
export function useInvestments() {
  const accounts = useAccounts();
  const investments = accounts.data?.filter((a) => a.is_active && accountGroup(a.type) === 'investment') ?? [];
  const ids = investments.map((a) => a.id);

  const movements = useQuery({
    queryKey: ['investment-movements', ids],
    queryFn: () => listInvestmentMovements(ids),
    enabled: accounts.isSuccess,
  });

  let data: InvestmentSummary[] | undefined;
  if (accounts.data && movements.data) {
    const monthPrefix = today().slice(0, 7);
    data = investments.map((a) => summarizeInvestment(a, movements.data, monthPrefix));
  }

  return {
    data,
    isPending: accounts.isPending || (accounts.isSuccess && movements.isPending),
    error: accounts.error ?? movements.error,
  };
}
