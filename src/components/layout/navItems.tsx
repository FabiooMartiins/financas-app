import type { ReactNode } from 'react';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Caminhos que deixam este item ativo (as abas de dentro de cada área) */
  match: string[];
}

const svg = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const icons = {
  home: svg(<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />),
  list: svg(<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />),
  wallet: svg(<><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>),
  settings: svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  ),
  calendar: svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  chart: svg(<path d="M5 20V11M11 20V5M17 20v-6M3 20h18" />),
  card: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9.5h18M7 15h4" /></>),
  growth: svg(<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />),
  history: svg(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>),
};

/**
 * Celular: quatro áreas + o botão central de nova transação (RF-11).
 * Cada área tem abas no topo (SectionTabs) para as telas de dentro dela.
 */
export const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: icons.home, match: ['/'] },
  { to: '/transacoes', label: 'Transações', icon: icons.list, match: ['/transacoes', '/historico', '/vencimentos', '/relatorios', '/importar'] },
  { to: '/contas', label: 'Contas', icon: icons.wallet, match: ['/contas', '/cartoes', '/investimentos'] },
  { to: '/configuracoes', label: 'Ajustes', icon: icons.settings, match: ['/configuracoes', '/perfil', '/categorias', '/alterar-senha'] },
];

/** PC: menu lateral com todas as telas, agrupadas como no celular. */
export const sidebarGroups: { title?: string; items: NavItem[] }[] = [
  { items: [navItems[0]] },
  {
    title: 'Movimentações',
    items: [
      { to: '/transacoes', label: 'Lançamentos', icon: icons.list, match: ['/transacoes'] },
      { to: '/historico', label: 'Por conta', icon: icons.history, match: ['/historico'] },
      { to: '/vencimentos', label: 'Contas do mês', icon: icons.calendar, match: ['/vencimentos'] },
      { to: '/relatorios', label: 'Relatórios', icon: icons.chart, match: ['/relatorios'] },
    ],
  },
  {
    title: 'Dinheiro',
    items: [
      { to: '/contas', label: 'Contas', icon: icons.wallet, match: ['/contas'] },
      { to: '/cartoes', label: 'Cartões', icon: icons.card, match: ['/cartoes'] },
      { to: '/investimentos', label: 'Investimentos', icon: icons.growth, match: ['/investimentos'] },
    ],
  },
  { items: [navItems[3]] },
];

/** Ativo quando o caminho atual é um dos caminhos do item (ou uma tela dentro dele). */
export function isActive(item: NavItem, pathname: string): boolean {
  return item.match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)));
}
