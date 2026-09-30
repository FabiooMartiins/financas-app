import { NavLink } from 'react-router';
import { navItems } from './navItems';

/** Barra inferior — celular e tablet pequeno (< lg). */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface lg:hidden"
    >
      <ul className="mx-auto flex h-19 max-w-xl items-center justify-around px-2">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-w-15 flex-col items-center gap-1 py-2 text-[11px] ${
                  isActive ? 'font-bold text-brand' : 'font-semibold text-muted'
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
  );
}
