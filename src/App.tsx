import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequirePermission } from '@/components/common/PermissionGuard';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { syncEngine } from '@/lib/supabase/syncEngine';
import { useAuthStore } from '@/store/authStore';
import LandingPage from '@/features/landing/pages/LandingPage';
import LoginPage from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import CategoryPage from '@/features/categories/pages/CategoryPage';
import SupplierPage from '@/features/suppliers/pages/SupplierPage';
import CustomerPage from '@/features/customers/pages/CustomerPage';
import ProductPage from '@/features/products/pages/ProductPage';
import ProductBatchPage from '@/features/products/pages/ProductBatchPage';
import POSPage from '@/features/pos/pages/POSPage';
import POListPage from '@/features/purchase/pages/POListPage';
import GoodsReceiptPage from '@/features/purchase/pages/GoodsReceiptPage';
import StockReportPage from '@/features/stock/pages/StockReportPage';
import StockAdjustmentPage from '@/features/stock/pages/StockAdjustmentPage';
import SalesReportPage from '@/features/reports/pages/SalesReportPage';
import ProfitLossPage from '@/features/reports/pages/ProfitLossPage';
import PurchaseReportPage from '@/features/reports/pages/PurchaseReportPage';
import ProductCustomerReportPage from '@/features/reports/pages/ProductCustomerReportPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import AccountsReceivablePage from '@/features/reports/pages/AccountsReceivablePage';
import VoidTransactionPage from '@/features/reports/pages/VoidTransactionPage';
import ExpensePage from '@/features/expenses/pages/ExpensePage';
import CustomerPaymentPage from '@/features/customers/pages/CustomerPaymentPage';
import PurchaseReturnPage from '@/features/purchase/pages/PurchaseReturnPage';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        path: '',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'pos',
            element: (
              <RequirePermission permission="pos:read" redirectTo="/app">
                <POSPage />
              </RequirePermission>
            ),
          },
          {
            path: 'products',
            children: [
              {
                index: true,
                element: (
                  <RequirePermission permission="product:read" redirectTo="/app">
                    <ProductPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'batch',
                element: (
                  <RequirePermission permission="product:read" redirectTo="/app">
                    <ProductBatchPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'categories',
                element: (
                  <RequirePermission permission="product:read" redirectTo="/app">
                    <CategoryPage />
                  </RequirePermission>
                ),
              },
            ],
          },
          {
            path: 'purchase',
            children: [
              {
                index: true,
                element: (
                  <RequirePermission permission="purchase:read" redirectTo="/app">
                    <POListPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'receipts',
                element: (
                  <RequirePermission permission="purchase:read" redirectTo="/app">
                    <GoodsReceiptPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'returns',
                element: (
                  <RequirePermission permission="purchase:read" redirectTo="/app">
                    <PurchaseReturnPage />
                  </RequirePermission>
                ),
              },
            ],
          },
          {
            path: 'stock',
            children: [
              {
                index: true,
                element: (
                  <RequirePermission permission="stock:read" redirectTo="/app">
                    <StockReportPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'adjustment',
                element: (
                  <RequirePermission permission="stock:adjust" redirectTo="/app">
                    <StockAdjustmentPage />
                  </RequirePermission>
                ),
              },
            ],
          },
          {
            path: 'customers',
            element: (
              <RequirePermission permission="customer:read" redirectTo="/app">
                <CustomerPage />
              </RequirePermission>
            ),
          },
          {
            path: 'suppliers',
            element: (
              <RequirePermission permission="supplier:read" redirectTo="/app">
                <SupplierPage />
              </RequirePermission>
            ),
          },
          {
            path: 'reports',
            children: [
              {
                index: true,
                element: (
                  <RequirePermission permission="report:view" redirectTo="/app">
                    <SalesReportPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'profit-loss',
                element: (
                  <RequirePermission permission="report:view" redirectTo="/app">
                    <ProfitLossPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'purchase',
                element: (
                  <RequirePermission permission="report:view" redirectTo="/app">
                    <PurchaseReportPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'products-customers',
                element: (
                  <RequirePermission permission="report:view" redirectTo="/app">
                    <ProductCustomerReportPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'receivable',
                element: (
                  <RequirePermission permission="report:view" redirectTo="/app">
                    <AccountsReceivablePage />
                  </RequirePermission>
                ),
              },
              {
                path: 'void',
                element: (
                  <RequirePermission permission="pos:void" redirectTo="/app">
                    <VoidTransactionPage />
                  </RequirePermission>
                ),
              },
            ],
          },
          {
            path: 'settings',
            element: (
              <RequirePermission permission="settings:read" redirectTo="/app">
                <SettingsPage />
              </RequirePermission>
            ),
          },
          {
            path: 'expenses',
            element: (
              <RequirePermission permission="report:view" redirectTo="/app">
                <ExpensePage />
              </RequirePermission>
            ),
          },
          {
            path: 'customers/payments',
            element: (
              <RequirePermission permission="customer:edit" redirectTo="/app">
                <CustomerPaymentPage />
              </RequirePermission>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    void checkAuth();
    const interval = isSupabaseConfigured ? syncEngine.startAutoSync() : null;

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkAuth]);

  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
