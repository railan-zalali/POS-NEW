import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transactionRepository } from '@/lib/db/transactionRepository';
import { productRepository } from '@/lib/db/productRepository';
import { db } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, Users, AlertTriangle, Clock } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    expiringCount: 0,
  });

  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  // Fetch data
  const transactions = useLiveQuery(() => transactionRepository.getAll()) || [];
  const products = useLiveQuery(() => productRepository.getAll()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const stocks = useLiveQuery(() => db.product_stocks.toArray()) || [];

  useEffect(() => {
    if (transactions.length === 0 && products.length === 0) return;

    const today = new Date();

    // 1. Calculate Today's Stats
    const todayTxs = transactions.filter((tx) => isSameDay(new Date(tx.transaction_date), today));

    const todaySales = todayTxs.reduce((sum, tx) => sum + tx.total_amount, 0);

    // 2. Calculate Sales Trend (Last 7 Days)
    const trendData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const daySales = transactions
        .filter((tx) => isSameDay(new Date(tx.transaction_date), d))
        .reduce((sum, tx) => sum + tx.total_amount, 0);

      trendData.push({
        date: format(d, 'dd/MM'),
        total: daySales,
      });
    }

    // Only update if data changed (simple check)
    setSalesTrend((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(trendData)) return trendData;
      return prev;
    });

    // 3. Stock Alerts
    // Aggregate stocks
    const aggregatedStock: Record<string, number> = {};
    stocks.forEach((s) => {
      aggregatedStock[s.product_id] = (aggregatedStock[s.product_id] || 0) + s.quantity;
    });

    // Check low stock (threshold 10 for simplicity, ideally from product settings)
    const lowStock = products.filter((p) => (aggregatedStock[p.id!] || 0) < 10).length;

    // 4. Recent Transactions
    const recent = [...transactions]
      .sort((a, b) => b.transaction_date.getTime() - a.transaction_date.getTime())
      .slice(0, 5);

    setRecentTransactions((prev) => {
      // Basic check to avoid update loops if data is same (by ID list)
      const prevIds = prev.map((t) => t.id).join(',');
      const newIds = recent.map((t) => t.id).join(',');
      if (prevIds !== newIds) return recent;
      return prev;
    });

    setStats((prev) => {
      const newStats = {
        todaySales,
        todayTransactions: todayTxs.length,
        totalProducts: products.length,
        totalCustomers: customers.length,
        lowStockCount: lowStock,
        expiringCount: 0, // Placeholder
      };
      if (JSON.stringify(prev) !== JSON.stringify(newStats)) return newStats;
      return prev;
    });
  }, [transactions, products, customers, stocks]);

  // Custom tooltip to avoid recreating function on every render
  const CustomTooltip = ({ active, payload, label }: any) => {
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
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate('/pos')}>Buka Kasir</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {stats.todaySales.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayTransactions} transaksi berhasil
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{stats.lowStockCount} stok menipis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pelanggan Terdaftar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">+2 bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Kritis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Perlu restock segera</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Trend Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Tren Penjualan (7 Hari)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend}>
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rp ${value.toLocaleString()}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Transaksi Terakhir</CardTitle>
            <CardDescription>5 transaksi penjualan terbaru.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">Belum ada transaksi.</p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{tx.invoice_number}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {format(tx.transaction_date, 'dd MMM HH:mm', { locale: id })}
                      </div>
                    </div>
                    <div className="ml-auto font-medium">
                      +Rp {tx.total_amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
