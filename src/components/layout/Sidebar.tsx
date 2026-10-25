import { Link, useLocation } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { isActive, sidebarGroups } from './navItems';

/** Menu lateral — PC (>= lg). */
export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-surface p-6 lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand font-display text-sm font-bold text-on-brand">R$</div>
        <span className="font-display text-lg font-semibold">Finanças</span>
      </div>
      <Link to="/transacoes/nova" className={buttonClasses('primary', 'h-11 text-sm')}>
        Nova transação
      </Link>
      <nav aria-label="Navegação principal" className="flex flex-col gap-4">
        {sidebarGroups.map((group, index) => (
          <div key={group.title ?? index} className="flex flex-col gap-1">
            {group.title && <p className="px-3 text-xs font-bold tracking-wide text-muted uppercase">{group.title}</p>}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = isActive(item, pathname);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                        active ? 'bg-ground font-bold text-brand' : 'font-semibold text-muted hover:bg-ground'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
