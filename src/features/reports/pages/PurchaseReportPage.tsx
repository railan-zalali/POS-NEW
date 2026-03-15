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

  interface SupplierSummaryItem {
    name: string;
    total: number;
    count: number;
  }

  // Calculate summary by Supplier
  const supplierSummary = filteredPOs.reduce((acc: SupplierSummaryItem[], po) => {
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
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1">
            Laporan Pembelian
          </h1>
          <p className="text-slate-500 text-sm">
            Analisis pengadaan stok dan pengeluaran ke supplier.
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="rounded-full shadow-lg shadow-emerald-500/10"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-wrap gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Periode Awal
            </label>
            <Input
              type="date"
              className="bg-white border-none shadow-sm h-10 w-44"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Periode Akhir
            </label>
            <Input
              type="date"
              className="bg-white border-none shadow-sm h-10 w-44"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100/80">
              Total Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {totalPurchase.toLocaleString('id-ID')}</div>
            <p className="text-xs text-emerald-100/70 mt-1">
              {filteredPOs.length} Transaksi PO Disetujui
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white md:col-span-2 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b py-3 px-6">
            <CardTitle className="text-sm font-bold text-slate-600">
              Alokasi Pembelian per Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierSummary} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    `Rp ${Number(value || 0).toLocaleString('id-ID')}`,
                    'Total',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                />
                <Bar dataKey="total" fill="#10b981" radius={[0, 10, 10, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-xl font-bold">Detail Transaksi Pengadaan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                  No. PO
                </TableHead>
                <TableHead className="text-xs font-black uppercase text-slate-400">
                  Tanggal
                </TableHead>
                <TableHead className="text-xs font-black uppercase text-slate-400">
                  Supplier
                </TableHead>
                <TableHead className="text-center text-xs font-black uppercase text-slate-400">
                  Status
                </TableHead>
                <TableHead className="text-right px-6 py-4 text-xs font-black uppercase text-slate-400">
                  Total Nominal
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                    Tidak ada data pembelian pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                      {po.po_number}
                    </TableCell>
                    <TableCell className="font-medium text-slate-600">
                      {format(po.order_date, 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      {suppliers.find((s) => s.id === po.supplier_id)?.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          po.status === 'received'
                            ? 'bg-emerald-100 text-emerald-700'
                            : po.status === 'partial_received'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {po.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-6 py-4 font-black text-slate-900">
                      Rp {po.total_amount.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
