import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { AccountFormPage } from '@/features/accounts/pages/AccountFormPage';
import { AccountsPage } from '@/features/accounts/pages/AccountsPage';
import { ConnectBankPage } from '@/features/accounts/pages/ConnectBankPage';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { BillFormPage } from '@/features/bills/pages/BillFormPage';
import { BillsPage } from '@/features/bills/pages/BillsPage';
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { TransactionFormPage } from '@/features/transactions/pages/TransactionFormPage';
import { TransactionsPage } from '@/features/transactions/pages/TransactionsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transacoes', element: <TransactionsPage /> },
      { path: 'transacoes/nova', element: <TransactionFormPage /> },
      { path: 'transacoes/:id', element: <TransactionFormPage /> },
      { path: 'vencimentos', element: <BillsPage /> },
      { path: 'vencimentos/nova', element: <BillFormPage /> },
      { path: 'vencimentos/:id', element: <BillFormPage /> },
      // Recharts só é baixado quando abre Relatórios
      { path: 'relatorios', lazy: async () => ({ Component: (await import('@/features/reports/pages/ReportsPage')).ReportsPage }) },
      { path: 'contas', element: <AccountsPage /> },
      { path: 'contas/nova', element: <AccountFormPage /> },
      { path: 'contas/:id', element: <AccountFormPage /> },
      { path: 'categorias', element: <CategoriesPage /> },
      { path: 'conectar-banco', element: <ConnectBankPage /> },
      { path: 'alterar-senha', element: <ChangePasswordPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
