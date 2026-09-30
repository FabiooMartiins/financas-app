import { PageHeader } from '@/components/ui/PageHeader';
import { Placeholder } from '@/components/ui/Placeholder';

// RF-11, RF-13, RF-17 (repetir todo mês), RF-21 (parcelado)
// No PC, considere abrir como modal sobre a lista de transações.
export function NewTransactionPage() {
  return (
    <>
      <PageHeader title="Nova transação" />
      <Placeholder requirements="tipo, valor, descrição, categoria, conta, data" />
    </>
  );
}
