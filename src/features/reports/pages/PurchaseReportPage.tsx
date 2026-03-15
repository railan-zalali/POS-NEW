import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { supplierRepository } from '@/lib/db/supplierRepository';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export default function PurchaseReportPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const purchaseOrders = useLiveQuery(() => purchaseOrderRepository.getAll()) || [];
  const suppliers = useLiveQuery(() => supplierRepository.getAll()) || [];

  // Filter POs based on date range
  const filteredPOs = purchaseOrders.filter((po) => {
    const poDate = new Date(po.order_date);
    return isWithinInterval(poDate, {
      start: new Date(startDate),
      end: new Date(endDate),
    });
  });

  // Calculate summary by Supplier
  const supplierSummary = filteredPOs.reduce((acc: any[], po) => {
    const supplierName = suppliers.find((s) => s.id === po.supplier_id)?.name || 'Unknown';
    const existing = acc.find((item) => item.name === supplierName);
    if (existing) {
      existing.total += po.total_amount;
      existing.count += 1;
    } else {
      acc.push({ name: supplierName, total: po.total_amount, count: 1 });
    }
    return acc;
  }, []);

  const totalPurchase = filteredPOs.reduce((sum, po) => sum + po.total_amount, 0);

  const handleExport = () => {
    const ws = utils.json_to_sheet(
      filteredPOs.map((po) => ({
        'No. PO': po.po_number,
        Tanggal: format(po.order_date, 'dd/MM/yyyy'),
        Supplier: suppliers.find((s) => s.id === po.supplier_id)?.name,
        Total: po.total_amount,
        Status: po.status,
      })),
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Laporan Pembelian');
    writeFile(wb, `Laporan_Pembelian_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Laporan Pembelian</h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Dari Tanggal</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sampai Tanggal</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Pembelian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              Rp {totalPurchase.toLocaleString('id-ID')}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{filteredPOs.length} Transaksi PO</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pembelian per Supplier</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierSummary} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `Rp ${Number(value).toLocaleString('id-ID')}`,
                    'Total',
                  ]}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="total" fill="#52B788" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Pembelian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. PO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tidak ada data pembelian pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{format(po.order_date, 'dd MMM yyyy', { locale: id })}</TableCell>
                      <TableCell>{suppliers.find((s) => s.id === po.supplier_id)?.name}</TableCell>
                      <TableCell className="capitalize">{po.status}</TableCell>
                      <TableCell className="text-right font-medium">
                        Rp {po.total_amount.toLocaleString('id-ID')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
