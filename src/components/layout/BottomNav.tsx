import { NavLink } from 'react-router';
import { navItems } from './navItems';

/** Barra inferior — celular e tablet pequeno (< lg). */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface lg:hidden"
    >
      <ul className="mx-auto flex h-19 max-w-xl items-center px-1">
        {navItems.map((item) => (
          <li key={item.to} className="min-w-0 flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-11 flex-col items-center gap-1 py-2 text-[10px] leading-tight ${
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
