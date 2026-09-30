import { NavLink } from 'react-router';
import { navItems } from './navItems';

/** Menu lateral — PC (>= lg). */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-line bg-surface p-6 lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand font-display text-sm font-bold text-white">
          R$
        </div>
        <span className="font-display text-lg font-semibold">Finanças</span>
      </div>
      <nav aria-label="Navegação principal">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                    isActive ? 'bg-ground font-bold text-brand' : 'font-semibold text-muted hover:bg-ground'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
