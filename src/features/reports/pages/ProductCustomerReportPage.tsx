import { useState, useEffect } from 'react';
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
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  const transactions = useLiveQuery(() => transactionRepository.getAll()) || [];

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
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Laporan Produk & Pelanggan</h1>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produk Terlaris</TabsTrigger>
          <TabsTrigger value="customers">Pelanggan Top</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>10 Produk Terlaris (Revenue)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={150} fontSize={12} />
                    <Tooltip
                      formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                    />
                    <Bar dataKey="revenue" fill="#2D6A4F" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead className="text-right">Terjual (Qty)</TableHead>
                      <TableHead className="text-right">Total Pendapatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.qty}</TableCell>
                        <TableCell className="text-right">
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

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>10 Pelanggan Loyal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Pelanggan</TableHead>
                      <TableHead className="text-right">Jumlah Transaksi</TableHead>
                      <TableHead className="text-right">Total Belanja</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right">{c.txCount}</TableCell>
                        <TableCell className="text-right">
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
