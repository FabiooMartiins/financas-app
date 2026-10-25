import { Link, useLocation } from 'react-router';
import { isActive, navItems, type NavItem } from './navItems';

/** Barra inferior — celular e tablet pequeno (< lg): 4 áreas e o botão central de nova transação. */
export function BottomNav() {
  const { pathname } = useLocation();
  const [home, transactions, accounts, settings] = navItems;

  return (
    <nav
      aria-label="Navegação principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface lg:hidden"
    >
      <ul className="mx-auto grid h-17 max-w-xl grid-cols-5 items-center px-1">
        <Tab item={home} active={isActive(home, pathname)} />
        <Tab item={transactions} active={isActive(transactions, pathname)} />
        <li className="flex justify-center">
          <Link
            to="/transacoes/nova"
            aria-label="Nova transação"
            className="-mt-7 flex size-15 items-center justify-center rounded-full border-4 border-ground bg-brand text-on-brand shadow-lg"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </li>
        <Tab item={accounts} active={isActive(accounts, pathname)} />
        <Tab item={settings} active={isActive(settings, pathname)} />
      </ul>
    </nav>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li className="min-w-0">
      <Link
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-11 flex-col items-center gap-1 py-2 text-[11px] leading-tight ${active ? 'font-bold text-brand' : 'font-semibold text-muted'}`}
      >
        {item.icon}
        {item.label}
      </Link>
    </li>
  );
}
