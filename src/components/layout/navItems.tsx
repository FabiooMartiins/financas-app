import type { ReactNode } from 'react';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const svg = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

export const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: svg(<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />) },
  { to: '/transacoes', label: 'Transações', icon: svg(<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />) },
  { to: '/vencimentos', label: 'Vencimentos', icon: svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>) },
  { to: '/cartoes', label: 'Cartão', icon: svg(<><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 9.5h19M6.5 15h4" /></>) },
  { to: '/relatorios', label: 'Relatórios', icon: svg(<path d="M5 20V11M11 20V5M17 20v-6M3 20h18" />) },
  { to: '/contas', label: 'Contas', icon: svg(<><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>) },
];
