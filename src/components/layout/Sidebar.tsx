import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { PermissionKey } from '@/lib/db/schema';
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

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  permission?: PermissionKey;
  subItems?: { to: string; label: string; permission?: PermissionKey }[];
}

export function Sidebar() {
  const { logout, hasPermission } = useAuthStore();
  const location = useLocation();

  const navItems: NavItem[] = [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/pos', icon: ShoppingCart, label: 'Kasir (POS)', permission: 'pos:read' },
    {
      to: '/app/products',
      icon: Package,
      label: 'Produk',
      permission: 'product:read',
      subItems: [
        { to: '/app/products', label: 'Daftar Produk', permission: 'product:read' },
        { to: '/app/products/batch', label: 'Input Massal', permission: 'product:read' },
        { to: '/app/products/categories', label: 'Kategori', permission: 'product:read' },
      ],
    },
    {
      to: '/app/purchase',
      icon: ClipboardList,
      label: 'Pembelian',
      permission: 'purchase:read',
      subItems: [
        { to: '/app/purchase', label: 'Purchase Order', permission: 'purchase:read' },
        { to: '/app/purchase/receipts', label: 'Penerimaan Barang', permission: 'purchase:read' },
        { to: '/app/purchase/returns', label: 'Retur Pembelian', permission: 'purchase:read' },
      ],
    },
    { to: '/app/stock', icon: Archive, label: 'Stok', permission: 'stock:read' },
    {
      to: '/app/stock/adjustment',
      icon: Archive,
      label: 'Penyesuaian Stok',
      permission: 'stock:adjust',
    },
    { to: '/app/customers', icon: Users, label: 'Pelanggan', permission: 'customer:read' },
    {
      to: '/app/customers/payments',
      icon: DollarSign,
      label: 'Bayar Piutang',
      permission: 'customer:edit',
    },
    { to: '/app/suppliers', icon: Truck, label: 'Supplier', permission: 'supplier:read' },
    {
      to: '/app/reports',
      icon: BarChart3,
      label: 'Laporan',
      permission: 'report:view',
      subItems: [
        { to: '/app/reports', label: 'Penjualan', permission: 'report:view' },
        { to: '/app/reports/profit-loss', label: 'Laba Rugi', permission: 'report:view' },
        { to: '/app/reports/purchase', label: 'Pembelian', permission: 'report:view' },
        {
          to: '/app/reports/products-customers',
          label: 'Produk & Pelanggan',
          permission: 'report:view',
        },
        { to: '/app/reports/receivable', label: 'Piutang (Credit)', permission: 'report:view' },
      ],
    },
    { to: '/app/reports/void', icon: XCircle, label: 'Pembatalan', permission: 'pos:void' },
    { to: '/app/expenses', icon: Receipt, label: 'Pengeluaran', permission: 'report:view' },
    { to: '/app/settings', icon: Settings, label: 'Pengaturan', permission: 'settings:read' },
  ];

  const visibleItems = navItems
    .filter((item) => !item.permission || hasPermission(item.permission))
    .map((item) => ({
      ...item,
      subItems: item.subItems?.filter(
        (subItem) => !subItem.permission || hasPermission(subItem.permission),
      ),
    }));

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className="hidden w-64 flex-col border-r bg-card md:flex h-screen sticky top-0"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <Package className="h-6 w-6" aria-hidden="true" />
          <span>Tani Makmur</span>
        </div>
      </div>
      <nav className="flex-1 overflow-auto py-4" aria-label="Navigation menu">
        <ul className="grid gap-1 px-2" role="list">
          {visibleItems.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            const Icon = item.icon;

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive: linkActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      linkActive
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                        : 'text-muted-foreground',
                    )
                  }
                  end={item.to === '/app'}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
                {item.subItems && isActive && (
                  <ul className="ml-6 mt-1 space-y-1" role="list">
                    {item.subItems.map((subItem) => (
                      <li key={subItem.to}>
                        <NavLink
                          to={subItem.to}
                          className={({ isActive: subActive }) =>
                            cn(
                              'block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                              subActive
                                ? 'text-primary font-semibold bg-primary/5'
                                : 'text-muted-foreground',
                            )
                          }
                          end
                          aria-current={location.pathname === subItem.to ? 'page' : undefined}
                        >
                          {subItem.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-4 space-y-4">
        <div className="px-3">
          <SyncStatusIndicator />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Logout from application"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
