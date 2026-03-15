import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transactionRepository } from '@/lib/db/transactionRepository';
import { db } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProductCustomerReportPage() {
  interface ProductStat {
    name: string;
    qty: number;
    revenue: number;
  }
  interface CustomerStat {
    name: string;
    txCount: number;
    totalSpent: number;
  }

  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerStat[]>([]);

  const liveTransactions = useLiveQuery(() => transactionRepository.getAll());
  const transactions = useMemo(() => liveTransactions || [], [liveTransactions]);

  useEffect(() => {
    const calculateStats = async () => {
      // 1. Top Products
      const productStats: Record<string, { name: string; qty: number; revenue: number }> = {};

      const allTxItems = await db.sales_transaction_items.toArray();
      const allProducts = await db.products.toArray();

      for (const item of allTxItems) {
        if (!productStats[item.product_id]) {
          const product = allProducts.find((p) => p.id === item.product_id);
          productStats[item.product_id] = {
            name: product?.name || 'Unknown',
            qty: 0,
            revenue: 0,
          };
        }
        productStats[item.product_id].qty += item.quantity;
        productStats[item.product_id].revenue += item.subtotal;
      }

      const sortedProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setTopProducts(sortedProducts);

      // 2. Top Customers
      const customerStats: Record<string, { name: string; txCount: number; totalSpent: number }> =
        {};
      const allCustomers = await db.customers.toArray();

      for (const tx of transactions) {
        if (!tx.customer_id) continue;

        if (!customerStats[tx.customer_id]) {
          const customer = allCustomers.find((c) => c.id === tx.customer_id);
          customerStats[tx.customer_id] = {
            name: customer?.name || 'Unknown',
            txCount: 0,
            totalSpent: 0,
          };
        }
        customerStats[tx.customer_id].txCount += 1;
        customerStats[tx.customer_id].totalSpent += tx.total_amount;
      }

      const sortedCustomers = Object.values(customerStats)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      setTopCustomers(sortedCustomers);
    };

    if (transactions.length > 0) {
      calculateStats();
    }
  }, [transactions]);

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Analisis Produk & Pelanggan
        </h1>
        <p className="text-slate-500">Identifikasi item terlaris dan pelanggan paling loyal.</p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border rounded-xl h-auto flex gap-1 w-fit">
          <TabsTrigger
            value="products"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2 px-6"
          >
            Produk Terlaris
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2 px-6"
          >
            Pelanggan Top
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-xl font-bold">
                10 Produk Dengan Pendapatan Tertinggi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[350px] mb-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      fontSize={11}
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: unknown) =>
                        `Rp ${Number(value || 0).toLocaleString('id-ID')}`
                      }
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="revenue" fill="#065f46" radius={[0, 10, 10, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                        Peringkat & Nama Produk
                      </TableHead>
                      <TableHead className="text-right text-xs font-black uppercase text-slate-400">
                        Total Terjual
                      </TableHead>
                      <TableHead className="text-right px-6 py-4 text-xs font-black uppercase text-slate-400">
                        Total Omzet
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-600">
                          {p.qty.toLocaleString('id-ID')} unit
                        </TableCell>
                        <TableCell className="text-right px-6 py-4 font-black text-emerald-700">
                          Rp {p.revenue.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-xl font-bold">
                10 Pelanggan Dengan Belanja Terbanyak
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                        Nama Pelanggan
                      </TableHead>
                      <TableHead className="text-center text-xs font-black uppercase text-slate-400">
                        Frekuensi Belanja
                      </TableHead>
                      <TableHead className="text-right px-6 py-4 text-xs font-black uppercase text-slate-400">
                        Total Nilai Belanja
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">
                              {c.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-600">
                          {c.txCount} Transaksi
                        </TableCell>
                        <TableCell className="text-right px-6 py-4 font-black text-slate-900">
                          Rp {c.totalSpent.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
