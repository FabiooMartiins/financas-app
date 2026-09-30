import { PageHeader } from '@/components/ui/PageHeader';
import { Placeholder } from '@/components/ui/Placeholder';

// RF-17 a RF-21, RN-03, RN-04
export function BillsPage() {
  return (
    <>
      <PageHeader title="Contas do mês" />
      <Placeholder requirements="seletor de mês, resumo pago/a pagar, vencidas, a vencer, pagas" />
    </>
  );
}
