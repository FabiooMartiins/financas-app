import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { TransactionsPage } from '@/features/transactions/pages/TransactionsPage';
import { NewTransactionPage } from '@/features/transactions/pages/NewTransactionPage';
import { BillsPage } from '@/features/bills/pages/BillsPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { AccountsPage } from '@/features/accounts/pages/AccountsPage';

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
      { path: 'transacoes/nova', element: <NewTransactionPage /> },
      { path: 'vencimentos', element: <BillsPage /> },
      { path: 'relatorios', element: <ReportsPage /> },
      { path: 'contas', element: <AccountsPage /> },
    ],
  },
]);
