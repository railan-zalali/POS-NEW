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
} from 'lucide-react';

export function Sidebar() {
  const { logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pos', icon: ShoppingCart, label: 'Kasir (POS)' },
    {
      to: '/products',
      icon: Package,
      label: 'Produk',
      subItems: [
        { to: '/products', label: 'Daftar Produk' },
        { to: '/products/batch', label: 'Input Massal' },
        { to: '/products/categories', label: 'Kategori' },
      ],
    },
    {
      to: '/purchase',
      icon: ClipboardList,
      label: 'Pembelian',
      subItems: [
        { to: '/purchase', label: 'Riwayat PO' },
        { to: '/purchase/create', label: 'Buat PO Baru' },
      ],
    },
    { to: '/stock', icon: Archive, label: 'Stok' },
    { to: '/customers', icon: Users, label: 'Pelanggan' },
    { to: '/suppliers', icon: Truck, label: 'Supplier' },
    {
      to: '/reports',
      icon: BarChart3,
      label: 'Laporan',
      subItems: [
        { to: '/reports', label: 'Penjualan' },
        { to: '/reports/profit-loss', label: 'Laba Rugi' },
        { to: '/reports/purchase', label: 'Pembelian' },
        { to: '/reports/products-customers', label: 'Produk & Pelanggan' },
      ],
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Pengaturan',
      subItems: [
        { to: '/settings', label: 'Aplikasi' },
        { to: '/settings/users', label: 'Pengguna' },
      ],
    },
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
                  end={item.to === '/'}
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
      <div className="border-t p-4">
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
