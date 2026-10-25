import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { savedTheme, setTheme } from '@/lib/theme';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

/**
 * Celular: conteúdo em coluna + barra inferior fixa.
 * PC (lg+): menu lateral + conteúdo centralizado com largura máxima.
 */
export function AppLayout() {
  useThemeFromProfile();
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="pt-safe min-w-0 flex-1 pb-28 lg:pb-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

/** RF-34: o tema escolhido no perfil vale em qualquer aparelho em que a pessoa entrar. */
function useThemeFromProfile() {
  const { data: profile } = useProfile();
  useEffect(() => {
    if (profile && profile.theme !== savedTheme()) setTheme(profile.theme);
  }, [profile]);
}
