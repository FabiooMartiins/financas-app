import { Outlet } from 'react-router';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

/**
 * Celular: conteúdo em coluna + barra inferior fixa.
 * PC (lg+): menu lateral + conteúdo centralizado com largura máxima.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="pt-safe flex-1 pb-28 lg:pb-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
