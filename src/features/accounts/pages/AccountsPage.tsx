import { PageHeader } from '@/components/ui/PageHeader';
import { Placeholder } from '@/components/ui/Placeholder';
import { useAuth } from '@/features/auth/hooks/useAuth';

// RF-04 a RF-10
export function AccountsPage() {
  const { signOut } = useAuth();
  return (
    <>
      <PageHeader title="Contas" />
      <Placeholder requirements="saldo consolidado, contas Open Finance, contas manuais" />
      <button onClick={signOut} className="self-start text-sm font-semibold text-muted underline">
        Sair
      </button>
    </>
  );
}
