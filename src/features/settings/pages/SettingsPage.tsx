import { useState } from 'react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { useProfile, useSaveProfile } from '@/features/profile/hooks/useProfile';
import { savedTheme, setTheme, themeLabels, type ThemeChoice } from '@/lib/theme';

// Aba própria de configurações: perfil, tema, categorias, importação, senha e sair
export function SettingsPage() {
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const save = useSaveProfile();
  const [theme, setThemeChoice] = useState<ThemeChoice>(savedTheme());
  const name = profile?.full_name || profile?.nickname || 'Seu perfil';

  function changeTheme(next: ThemeChoice) {
    setThemeChoice(next);
    setTheme(next); // vale na hora; o perfil guarda para os outros aparelhos (RF-34)
    save.mutate({ theme: next });
  }

  return (
    <>
      <PageHeader title="Ajustes" />

      <Link to="/perfil" className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:bg-ground">
        <ProfileAvatar size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{name}</p>
          <p className="truncate text-sm text-muted">{session?.user.email}</p>
        </div>
        <Chevron />
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-muted">Tema</h2>
        <SegmentedControl
          label="Tema do app"
          value={theme}
          onChange={changeTheme}
          options={(['dark', 'light', 'system'] as const).map((value) => ({ value, label: themeLabels[value] }))}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-muted">Organização</h2>
        <Card className="divide-y divide-line">
          <MenuLink to="/categorias" label="Categorias" hint="Nomes e cores das classificações" />
          <MenuLink to="/importar" label="Importar extrato" hint="Arquivo OFX ou CSV da conta ou do cartão" />
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-muted">Conta</h2>
        <Card className="divide-y divide-line">
          <MenuLink to="/perfil" label="Meu perfil" hint="Foto e dados pessoais" />
          <MenuLink to="/alterar-senha" label="Alterar senha" hint={session?.user.email ?? ''} />
        </Card>
        <button type="button" onClick={signOut} className="h-11 self-start rounded-xl px-1 text-sm font-semibold text-expense underline">
          Sair
        </button>
      </section>
    </>
  );
}

function MenuLink({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <Link to={to} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-ground">
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className="truncate text-sm text-muted">{hint}</p>
      </div>
      <Chevron />
    </Link>
  );
}

function Chevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
