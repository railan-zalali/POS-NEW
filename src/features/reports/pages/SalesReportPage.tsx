import { useState, useMemo } from 'react';
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
import {
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  CreditCard,
  Wallet,
  Banknote,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const transactions = useLiveQuery(() => transactionRepository.getAll()) || [];

  // Filter transactions based on date range
  const filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.transaction_date);
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    return isWithinInterval(txDate, { start, end });
  });

  // Paginate the filtered results
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

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
  const chartData = filteredTransactions.reduce((acc: { date: string; total: number }[], tx) => {
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
      <Card className="border-none shadow-md overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 flex flex-wrap gap-6 items-end">
          <div className="space-y-2 min-w-[200px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Periode Cepat
            </label>
            <Select value={dateRange} onValueChange={handleRangeChange}>
              <SelectTrigger className="bg-slate-50 border-none shadow-none focus:ring-1">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                <SelectItem value="month">30 Hari Terakhir</SelectItem>
                <SelectItem value="custom">Kustom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dari Tanggal
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                className="pl-9 bg-slate-50 border-none shadow-none focus:ring-1"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateRange('custom');
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sampai Tanggal
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                className="pl-9 bg-slate-50 border-none shadow-none focus:ring-1"
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              Rp {summary.totalSales.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {summary.totalTransactions} transaksi berhasil
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tunai (Cash)</CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              Rp {summary.totalCash.toLocaleString('id-ID')}
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{
                  width: `${summary.totalSales > 0 ? (summary.totalCash / summary.totalSales) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Transfer</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              Rp {summary.totalTransfer.toLocaleString('id-ID')}
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{
                  width: `${summary.totalSales > 0 ? (summary.totalTransfer / summary.totalSales) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Kredit (Hutang)</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              Rp {summary.totalCredit.toLocaleString('id-ID')}
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
              <div
                className="bg-orange-500 h-1.5 rounded-full"
                style={{
                  width: `${summary.totalSales > 0 ? (summary.totalCredit / summary.totalSales) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4 border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-lg">Grafik Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border-none shadow-2xl rounded-lg p-3 text-xs">
                            <p className="font-bold text-slate-900 mb-1">{label}</p>
                            <p className="text-slate-600">
                              Total:{' '}
                              <span className="font-bold text-primary">
                                Rp {Number(payload[0].value).toLocaleString('id-ID')}
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#0f172a"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Table */}
        <Card className="col-span-3 border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-lg">Riwayat Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider font-bold">
                      Invoice
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-bold">
                      Waktu
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wider font-bold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-slate-400">
                        Tidak ada transaksi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <TableCell>
                          <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                            {tx.invoice_number}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            {tx.payment_method}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs text-nowrap">
                          {format(tx.transaction_date, 'dd MMM, HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900">
                          Rp {tx.total_amount.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-slate-500">
                  Menampilkan {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}{' '}
                  dari {filteredTransactions.length} transaksi (Halaman {currentPage} dari{' '}
                  {totalPages})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Sebelumnya
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[32px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
