import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import CategoryPage from '@/features/categories/pages/CategoryPage';
import SupplierPage from '@/features/suppliers/pages/SupplierPage';
import CustomerPage from '@/features/customers/pages/CustomerPage';
import ProductPage from '@/features/products/pages/ProductPage';
import ProductBatchPage from '@/features/products/pages/ProductBatchPage';
import POSPage from '@/features/pos/pages/POSPage';
import CreatePOPage from '@/features/purchase/pages/CreatePOPage';
import POListPage from '@/features/purchase/pages/POListPage';
import GoodsReceiptPage from '@/features/purchase/pages/GoodsReceiptPage';
import StockReportPage from '@/features/stock/pages/StockReportPage';
import SalesReportPage from '@/features/reports/pages/SalesReportPage';
import ProfitLossPage from '@/features/reports/pages/ProfitLossPage';
import PurchaseReportPage from '@/features/reports/pages/PurchaseReportPage';
import ProductCustomerReportPage from '@/features/reports/pages/ProductCustomerReportPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import UsersPage from '@/features/users/pages/UsersPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import { Toaster } from '@/components/ui/toaster';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        path: '/',
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
                path: 'create',
                element: <CreatePOPage />,
              },
              {
                path: ':poId',
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
            ],
          },
          {
            path: 'settings',
            children: [
              {
                index: true,
                element: <SettingsPage />,
              },
              {
                path: 'users',
                element: <UsersPage />,
              },
            ],
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
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
