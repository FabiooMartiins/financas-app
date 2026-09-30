import { PageHeader } from '@/components/ui/PageHeader';
import { Placeholder } from '@/components/ui/Placeholder';

// RF-23, RF-24, RF-26 — gráficos com Recharts
export function ReportsPage() {
  return (
    <>
      <PageHeader title="Relatórios" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Placeholder requirements="despesas por categoria (RF-23)" />
        <Placeholder requirements="receitas x despesas, 6 meses (RF-24)" />
      </div>
    </>
  );
}
