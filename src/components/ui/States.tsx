import type { ReactNode } from 'react';
import { Card } from './Card';

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <Card className="p-5 text-sm text-muted" role="status">
      {label}
    </Card>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <Card className="border-expense/30 bg-expense-soft p-5 text-sm font-semibold text-expense" role="alert">
      {errorMessage(error)}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Card className="p-5 text-sm text-muted">{children}</Card>;
}

/** Mensagem legível para erros do Supabase e de rede. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message);
    if (message.includes('violates foreign key constraint') && message.includes('categor')) {
      return 'Esta categoria está em uso por transações e não pode ser excluída.';
    }
    if (message.includes('bill_payments')) return 'Esta conta já está marcada como paga neste mês.';
    if (message.includes('duplicate key')) return 'Já existe um item com esse nome.';
    if (message.includes('Failed to fetch')) return 'Sem conexão. Verifique a internet e tente novamente.';
    return message;
  }
  return 'Algo deu errado. Tente novamente.';
}
