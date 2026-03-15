import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transactionRepository } from '@/lib/db/transactionRepository';
import { productRepository } from '@/lib/db/productRepository';
import { db } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { format, subDays, isSameDay, addDays, isBefore } from 'date-fns';
import { id } from 'date-fns/locale';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { SalesTransaction, Product, ProductStock } from '@/lib/db/schema';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    totalInventoryValue: 0,
    todayTransactions: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    expiringCount: 0,
  });

  const [salesTrend, setSalesTrend] = useState<{ date: string; total: number }[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<SalesTransaction[]>([]);

  // Fetch data
  const liveTransactions = useLiveQuery(() => transactionRepository.getAll());
  const transactions = useMemo(() => liveTransactions || [], [liveTransactions]);

  const liveProducts = useLiveQuery(() => productRepository.getAll());
  const products = useMemo(() => liveProducts || [], [liveProducts]);

  const liveCustomers = useLiveQuery(() => db.customers.toArray());
  const customers = useMemo(() => liveCustomers || [], [liveCustomers]);

  const liveStocks = useLiveQuery(() => db.product_stocks.toArray());
  const stocks = useMemo(() => liveStocks || [], [liveStocks]);

  useEffect(() => {
    if (transactions.length === 0 && products.length === 0 && stocks.length === 0) return;

    const today = new Date();

    // 1. Calculate Today's Stats
    const todayTxs = transactions.filter((tx) => isSameDay(new Date(tx.transaction_date), today));
    const todaySales = todayTxs.reduce((sum, tx) => sum + tx.total_amount, 0);

    // Calculate Today's Profit (from COGS)
    // Note: We need to pull COGS from sales_transaction_items for these transactions
    const calculateTodayProfit = async () => {
      let todayProfit = 0;
      for (const tx of todayTxs) {
        const items = await db.sales_transaction_items
          .where('transaction_id')
          .equals(tx.id!)
          .toArray();
        const txCOGS = items.reduce((sum, item) => sum + (item.cogs || 0), 0);
        todayProfit += tx.total_amount - txCOGS;
      }

      // 5. Total Inventory Value & Expiring Count
      let totalInvValue = 0;
      let expiringCount = 0;
      const thirtyDaysFromNow = addDays(today, 30);

      stocks.forEach((s: ProductStock) => {
        totalInvValue += s.quantity * (s.purchase_price || 0);
        if (s.expire_date && isBefore(new Date(s.expire_date), thirtyDaysFromNow)) {
          expiringCount++;
        }
      });

      // 3. Stock Alerts (Low Stock < 10)
      const aggregatedStock: Record<string, number> = {};
      stocks.forEach((s: ProductStock) => {
        aggregatedStock[s.product_id] = (aggregatedStock[s.product_id] || 0) + s.quantity;
      });
      const lowStock = products.filter((p: Product) => (aggregatedStock[p.id!] || 0) < 10).length;

      setStats({
        todaySales,
        todayProfit,
        totalInventoryValue: totalInvValue,
        todayTransactions: todayTxs.length,
        totalProducts: products.length,
        totalCustomers: customers.length,
        lowStockCount: lowStock,
        expiringCount,
      });
    };

    calculateTodayProfit();

    // 2. Calculate Sales Trend (Last 7 Days)
    interface SalesTrendItem {
      date: string;
      total: number;
    }
    const trendData: SalesTrendItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const daySales = transactions
        .filter((tx: SalesTransaction) => isSameDay(new Date(tx.transaction_date), d))
        .reduce((sum: number, tx: SalesTransaction) => sum + tx.total_amount, 0);

      trendData.push({
        date: format(d, 'dd/MM'),
        total: daySales,
      });
    }

    setSalesTrend(trendData);

    // 4. Recent Transactions
    const recent = [...transactions]
      .sort((a, b) => b.transaction_date.getTime() - a.transaction_date.getTime())
      .slice(0, 5);
    setRecentTransactions(recent);
  }, [transactions, products, customers, stocks]);

  // Custom tooltip to avoid recreating function on every render
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { value: number; name: string }[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-2 shadow-md text-xs">
          <p className="font-semibold">{label}</p>
          <p className="text-primary">
            Total: Rp {Number(payload[0].value).toLocaleString('id-ID')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1">
            Ringkasan Bisnis
          </h1>
          <p className="text-slate-500">Monitor performa Toko Tani Makmur Anda hari ini.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Status Sistem
            </p>
            <div className="flex items-center justify-end gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-semibold text-emerald-600">Online</span>
            </div>
          </div>
          <Button
            onClick={() => navigate('/pos')}
            className="rounded-full px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            Buka Kasir
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <div className="absolute top-0 right-0 -m-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100/80">
              Penjualan Hari Ini
            </CardTitle>
            <div className="rounded-full bg-white/20 p-2">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {stats.todaySales.toLocaleString('id-ID')}</div>
            <div className="mt-1 flex items-center text-xs text-emerald-100/70">
              <span className="font-bold mr-1">{stats.todayTransactions}</span> transaksi berhasil
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div className="absolute top-0 right-0 -m-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100/80">
              Profit Kotor Hari Ini
            </CardTitle>
            <div className="rounded-full bg-white/20 p-2">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {stats.todayProfit.toLocaleString('id-ID')}</div>
            <p className="mt-1 text-xs text-blue-100/70">
              Margin sekitar{' '}
              {stats.todaySales > 0 ? ((stats.todayProfit / stats.todaySales) * 100).toFixed(1) : 0}
              %
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-xl bg-white group hover:shadow-2xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Nilai Inventori</CardTitle>
            <div className="rounded-full bg-emerald-50 p-2 group-hover:bg-emerald-100 transition-colors">
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              Rp {stats.totalInventoryValue.toLocaleString('id-ID')}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {stats.totalProducts} jenis produk terdaftar
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-xl bg-white group hover:shadow-2xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Peringatan Stok</CardTitle>
            <div className="rounded-full bg-rose-50 p-2 group-hover:bg-rose-100 transition-colors">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}
            >
              {stats.lowStockCount}{' '}
              <span className="text-sm font-medium text-slate-400">Kritis</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {stats.expiringCount} produk hampir kadaluwarsa
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Trend Chart */}
        <Card className="col-span-4 border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tren Penjualan Mingguan</CardTitle>
                <CardDescription>Visualisasi pendapatan 7 hari terakhir</CardDescription>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Live Data
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      `Rp ${value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : (value / 1000).toFixed(0) + 'k'}`
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="col-span-3 border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-lg">Transaksi Terbaru</CardTitle>
            <CardDescription>5 aktivitas penjualan terakhir di kasir.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                  <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-slate-500">Belum ada transaksi hari ini.</p>
                </div>
              ) : (
                recentTransactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center group ${idx !== recentTransactions.length - 1 ? 'border-b pb-4' : ''}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors mr-3">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {tx.invoice_number}
                      </p>
                      <div className="flex items-center text-xs text-slate-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {format(tx.transaction_date, 'dd MMM HH:mm', { locale: id })}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-black text-slate-900">
                        Rp {tx.total_amount.toLocaleString('id-ID')}
                      </p>
                      <p
                        className={`text-[10px] uppercase font-bold ${tx.payment_method === 'cash' ? 'text-emerald-500' : 'text-blue-500'}`}
                      >
                        {tx.payment_method}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {recentTransactions.length > 0 && (
              <Button
                variant="ghost"
                className="w-full mt-6 text-xs text-slate-500 hover:text-primary"
                onClick={() => navigate('/reports/sales')}
              >
                Lihat Semua Laporan
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
