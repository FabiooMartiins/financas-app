import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

// RF-06 a RF-10: conexão Open Finance via agregador (Edge Function openfinance-sync).
// Depende da conta no agregador e das chaves configuradas como secrets no Supabase.
export function ConnectBankPage() {
  return (
    <>
      <PageHeader title="Conectar banco" backTo="/contas" />
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display font-semibold">Em preparação</h2>
        <p className="text-muted">
          A importação automática de contas e transações pelo Open Finance depende de um agregador autorizado (como Pluggy ou Belvo). Assim que ele for
          configurado, você poderá conectar seus bancos por aqui.
        </p>
        <p className="text-muted">
          Enquanto isso, cadastre suas contas manualmente em <strong>Contas</strong> e lance as transações pelo botão <strong>+</strong>.
        </p>
      </Card>
    </>
  );
}
