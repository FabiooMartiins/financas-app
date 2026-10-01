import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

/**
 * Uma transação mexe em saldos, contas do mês, início e relatórios ao mesmo
 * tempo; depois de qualquer gravação recarregamos tudo o que está em tela.
 */
export function refreshAll() {
  return queryClient.invalidateQueries();
}
