import { Card } from '@/components/ui/Card';
import { Placeholder } from '@/components/ui/Placeholder';
import { formatMonthYear } from '@/lib/dates';

// RF-22: saldo total, receitas/despesas do mês, próximos vencimentos
export function DashboardPage() {
  return (
    <>
      <div>
        <p className="text-sm text-muted capitalize">{formatMonthYear(new Date())}</p>
        <h1 className="font-display text-2xl font-semibold">Olá!</h1>
      </div>

      {/* Celular: empilhado. PC: saldo à esquerda, receitas/despesas à direita. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl bg-brand p-5 text-white lg:col-span-1">
          <p className="text-sm font-semibold opacity-90">Saldo total</p>
          <p className="font-display text-3xl font-semibold">—</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Card className="p-4">
            <p className="text-sm text-muted">Receitas do mês</p>
            <p className="font-display text-lg font-semibold text-income">—</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Despesas do mês</p>
            <p className="font-display text-lg font-semibold text-expense">—</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Placeholder requirements="Próximos vencimentos (RF-19)" />
        <Placeholder requirements="Últimas transações (RF-11)" />
      </div>
    </>
  );
}
