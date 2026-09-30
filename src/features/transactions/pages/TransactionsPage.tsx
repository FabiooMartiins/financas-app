import { Link } from 'react-router';
import { PageHeader } from '@/components/ui/PageHeader';
import { Placeholder } from '@/components/ui/Placeholder';

// RF-11 a RF-15
export function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transações"
        action={
          <Link to="/transacoes/nova" className="hidden h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white lg:flex">
            Nova transação
          </Link>
        }
      />
      <Placeholder requirements="busca e filtros (RF-15), lista agrupada por dia (RF-11, RF-12)" />

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
