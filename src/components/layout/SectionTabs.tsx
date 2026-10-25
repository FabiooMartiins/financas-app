import { Link, useLocation } from 'react-router';

const sections = {
  movimentos: [
    { to: '/transacoes', label: 'Lançamentos' },
    { to: '/historico', label: 'Por conta' },
    { to: '/vencimentos', label: 'Contas do mês' },
    { to: '/relatorios', label: 'Relatórios' },
  ],
  dinheiro: [
    { to: '/contas', label: 'Contas' },
    { to: '/cartoes', label: 'Cartões' },
    { to: '/investimentos', label: 'Investimentos' },
  ],
} as const;

/**
 * Abas no topo de cada área da barra inferior (Transações e Contas). No PC o menu lateral
 * já mostra todas as telas, então as abas ficam só no celular.
 */
export function SectionTabs({ section }: { section: keyof typeof sections }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Telas desta área" className="-mx-5 overflow-x-auto px-5 lg:hidden">
      <ul className="flex w-max gap-2">
        {sections[section].map((tab) => {
          const active = pathname === tab.to;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap ${
                  active ? 'bg-ink text-ground' : 'border border-line-strong bg-surface text-muted'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
