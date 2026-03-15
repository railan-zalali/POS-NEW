import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transactionRepository } from '@/lib/db/transactionRepository';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const transactions = useLiveQuery(() => transactionRepository.getAll()) || [];

  // Filter transactions based on date range
  const filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.transaction_date);
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    return isWithinInterval(txDate, { start, end });
  });

  // Calculate summary
  const summary = filteredTransactions.reduce(
    (acc, tx) => ({
      totalSales: acc.totalSales + tx.total_amount,
      totalTransactions: acc.totalTransactions + 1,
      totalCash: acc.totalCash + (tx.payment_method === 'cash' ? tx.total_amount : 0),
      totalTransfer: acc.totalTransfer + (tx.payment_method === 'transfer' ? tx.total_amount : 0),
      totalCredit: acc.totalCredit + (tx.payment_method === 'credit' ? tx.total_amount : 0),
    }),
    { totalSales: 0, totalTransactions: 0, totalCash: 0, totalTransfer: 0, totalCredit: 0 },
  );

  // Prepare chart data (Group by date)
  const chartData = filteredTransactions.reduce((acc: any[], tx) => {
    const dateStr = format(tx.transaction_date, 'dd/MM');
    const existing = acc.find((item) => item.date === dateStr);
    if (existing) {
      existing.total += tx.total_amount;
    } else {
      acc.push({ date: dateStr, total: tx.total_amount });
    }
    return acc;
  }, []);

  const handleRangeChange = (value: string) => {
    setDateRange(value);
    const today = new Date();
    if (value === 'today') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (value === 'week') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (value === 'month') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const handleExport = () => {
    const ws = utils.json_to_sheet(
      filteredTransactions.map((tx) => ({
        'No. Invoice': tx.invoice_number,
        Tanggal: format(tx.transaction_date, 'dd/MM/yyyy HH:mm'),
        'Metode Bayar': tx.payment_method,
        Total: tx.total_amount,
        Status: tx.status,
      })),
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Laporan Penjualan');
    writeFile(wb, `Laporan_Penjualan_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Laporan Penjualan</h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[150px]">
            <label className="text-sm font-medium">Periode</label>
            <Select value={dateRange} onValueChange={handleRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                <SelectItem value="month">30 Hari Terakhir</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dari Tanggal</label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-9"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateRange('custom');
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sampai Tanggal</label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-9"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateRange('custom');
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {summary.totalSales.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">{summary.totalTransactions} transaksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tunai (Cash)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {summary.totalCash.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {summary.totalTransfer.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kredit (Hutang)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              Rp {summary.totalCredit.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Grafik Penjualan</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Tooltip
                  formatter={(value: any) => [
                    `Rp ${Number(value).toLocaleString('id-ID')}`,
                    'Total',
                  ]}
                  labelStyle={{ color: 'black' }}
                />
                <Bar dataKey="total" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Tanggal & Jam</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Tidak ada data transaksi pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.invoice_number}</TableCell>
                      <TableCell>
                        {format(tx.transaction_date, 'dd MMM yyyy HH:mm', { locale: id })}
                      </TableCell>
                      <TableCell className="capitalize">{tx.payment_method}</TableCell>
                      <TableCell className="text-right font-medium">
                        Rp {tx.total_amount.toLocaleString('id-ID')}
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
