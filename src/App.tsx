import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { syncEngine } from '@/lib/supabase/syncEngine';
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
import SalesReportPage from '@/features/reports/pages/SalesReportPage';
import ProfitLossPage from '@/features/reports/pages/ProfitLossPage';
import PurchaseReportPage from '@/features/reports/pages/PurchaseReportPage';
import ProductCustomerReportPage from '@/features/reports/pages/ProductCustomerReportPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import AccountsReceivablePage from '@/features/reports/pages/AccountsReceivablePage';
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
            element: <POSPage />,
          },
          {
            path: 'products',
            children: [
              {
                index: true,
                element: <ProductPage />,
              },
              {
                path: 'batch',
                element: <ProductBatchPage />,
              },
              {
                path: 'categories',
                element: <CategoryPage />,
              },
            ],
          },
          {
            path: 'purchase',
            children: [
              {
                index: true,
                element: <POListPage />,
              },
              {
                path: 'receipts',
                element: <GoodsReceiptPage />,
              },
            ],
          },
          {
            path: 'stock',
            children: [
              {
                index: true,
                element: <StockReportPage />,
              },
            ],
          },
          {
            path: 'customers',
            element: <CustomerPage />,
          },
          {
            path: 'suppliers',
            element: <SupplierPage />,
          },
          {
            path: 'reports',
            children: [
              {
                index: true,
                element: <SalesReportPage />,
              },
              {
                path: 'profit-loss',
                element: <ProfitLossPage />,
              },
              {
                path: 'purchase',
                element: <PurchaseReportPage />,
              },
              {
                path: 'products-customers',
                element: <ProductCustomerReportPage />,
              },
              {
                path: 'receivable',
                element: <AccountsReceivablePage />,
              },
            ],
          },
          {
            path: 'settings',
            element: <SettingsPage />,
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
  useEffect(() => {
    const interval = syncEngine.startAutoSync();
    return () => clearInterval(interval);
  }, []);

  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
