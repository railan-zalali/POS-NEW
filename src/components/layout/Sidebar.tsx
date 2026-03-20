import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Archive,
  ClipboardList,
  XCircle,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { SyncStatusIndicator } from './SyncStatusIndicator';

export function Sidebar() {
  const { logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/pos', icon: ShoppingCart, label: 'Kasir (POS)' },
    {
      to: '/app/products',
      icon: Package,
      label: 'Produk',
      subItems: [
        { to: '/app/products', label: 'Daftar Produk' },
        { to: '/app/products/batch', label: 'Input Massal' },
        { to: '/app/products/categories', label: 'Kategori' },
      ],
    },
    {
      to: '/app/purchase',
      icon: ClipboardList,
      label: 'Pembelian',
      subItems: [
        { to: '/app/purchase', label: 'Purchase Order' },
        { to: '/app/purchase/receipts', label: 'Penerimaan Barang' },
        { to: '/app/purchase/returns', label: 'Retur Pembelian' },
      ],
    },
    { to: '/app/stock', icon: Archive, label: 'Stok' },
    { to: '/app/stock/adjustment', icon: Archive, label: 'Penyesuaian Stok' },
    { to: '/app/customers', icon: Users, label: 'Pelanggan' },
    { to: '/app/customers/payments', icon: DollarSign, label: 'Bayar Piutang' },
    { to: '/app/suppliers', icon: Truck, label: 'Supplier' },
    {
      to: '/app/reports',
      icon: BarChart3,
      label: 'Laporan',
      subItems: [
        { to: '/app/reports', label: 'Penjualan' },
        { to: '/app/reports/profit-loss', label: 'Laba Rugi' },
        { to: '/app/reports/purchase', label: 'Pembelian' },
        { to: '/app/reports/products-customers', label: 'Produk & Pelanggan' },
        { to: '/app/reports/receivable', label: 'Piutang (Credit)' },
      ],
    },
    { to: '/app/reports/void', icon: XCircle, label: 'Pembatalan' },
    { to: '/app/expenses', icon: Receipt, label: 'Pengeluaran' },
    { to: '/app/settings', icon: Settings, label: 'Pengaturan' },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r bg-card md:flex h-screen sticky top-0">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <Package className="h-6 w-6" />
          <span>Tani Makmur</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/');

            return (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                      isActive
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                        : 'text-muted-foreground',
                    )
                  }
                  end={item.to === '/app'}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
                {item.subItems && isActive && (
                  <div className="ml-9 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.to}
                        to={subItem.to}
                        className={({ isActive }) =>
                          cn(
                            'block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                            isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
                          )
                        }
                        end
                      >
                        {subItem.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
      <div className="border-t p-4 space-y-4">
        <div className="px-3">
          <SyncStatusIndicator />
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
