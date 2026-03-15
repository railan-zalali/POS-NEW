import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import type { Customer } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Download,
  ArrowUpRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { utils, writeFile } from 'xlsx';

export default function AccountsReceivablePage() {
  const [search, setSearch] = useState('');
  const liveCustomers = useLiveQuery(() => db.customers.toArray());
  const customers = useMemo(() => liveCustomers || [], [liveCustomers]);
  const liveTransactions = useLiveQuery(() =>
    db.sales_transactions.where('payment_method').equals('credit').toArray(),
  );
  const transactions = useMemo(() => liveTransactions || [], [liveTransactions]);

  interface CustomerReceivable extends Customer {
    latest_transaction_date: Date | null;
    transaction_count: number;
  }

  const [receivableData, setReceivableData] = useState<CustomerReceivable[]>([]);

  useEffect(() => {
    if (customers.length >= 0) {
      const data = customers
        .filter((c) => c.outstanding_credit > 0)
        .map((customer) => {
          const customerTransactions = transactions.filter((t) => t.customer_id === customer.id);
          const latestTx =
            customerTransactions.length > 0
              ? customerTransactions.sort(
                  (a, b) => b.transaction_date.getTime() - a.transaction_date.getTime(),
                )[0]
              : null;

          return {
            ...customer,
            latest_transaction_date: latestTx?.transaction_date || null,
            transaction_count: customerTransactions.length,
          };
        })
        .filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.code.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => b.outstanding_credit - a.outstanding_credit);

      setReceivableData(data);
    }
  }, [customers, transactions, search]);

  const totalReceivable = receivableData.reduce((sum, item) => sum + item.outstanding_credit, 0);

  const handleExport = () => {
    const ws = utils.json_to_sheet(
      receivableData.map((item) => ({
        Kode: item.code,
        Nama: item.name,
        Telepon: item.phone || '-',
        'Sisa Piutang': item.outstanding_credit,
        'Limit Kredit': item.credit_limit,
        'Transaksi Terakhir': item.latest_transaction_date
          ? format(item.latest_transaction_date, 'dd/MM/yyyy')
          : '-',
      })),
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Laporan Piutang');
    writeFile(wb, `Laporan_Piutang_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
            Laporan Piutang
          </h1>
          <p className="text-slate-500 text-sm">
            Monitoring saldo piutang dan limit kredit pelanggan.
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="rounded-full shadow-lg shadow-blue-500/10"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100/80">
              Total Piutang Berjalan
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {totalReceivable.toLocaleString('id-ID')}</div>
            <p className="text-xs text-blue-100/70 mt-1">Saldo yang belum tertagih</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Debitur Aktif</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{receivableData.length}</div>
            <p className="text-xs text-slate-500 mt-1">Pelanggan dengan saldo piutang</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Rata-rata Piutang</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              Rp{' '}
              {receivableData.length > 0
                ? (totalReceivable / receivableData.length).toLocaleString('id-ID')
                : '0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Per pelanggan</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-extrabold flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" /> Daftar Debitur
          </CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Cari pelanggan..."
              className="pl-8 bg-white border-none shadow-sm focus:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                  Pelanggan
                </TableHead>
                <TableHead className="text-right text-xs font-black uppercase text-slate-400 font-mono">
                  Limit Kredit
                </TableHead>
                <TableHead className="text-right text-xs font-black uppercase text-slate-400 font-mono">
                  Saldo Piutang
                </TableHead>
                <TableHead className="text-center text-xs font-black uppercase text-slate-400">
                  Pemanfaatan
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                  Update Terakhir
                </TableHead>
                <TableHead className="text-center text-xs font-black uppercase text-slate-400">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivableData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                    Tidak ada piutang outstanding saat ini.
                  </TableCell>
                </TableRow>
              ) : (
                receivableData.map((item) => {
                  const usagePercent = Math.min(
                    (item.outstanding_credit / item.credit_limit) * 100,
                    100,
                  );
                  const isOverLimit = item.outstanding_credit > item.credit_limit;

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                          {item.code} • {item.phone || 'No Phone'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-500">
                        Rp {item.credit_limit.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900">
                        <span className={isOverLimit ? 'text-rose-600' : ''}>
                          Rp {item.outstanding_credit.toLocaleString('id-ID')}
                        </span>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="flex flex-col gap-1 px-4">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <div className="text-[10px] font-black text-slate-400 text-right">
                            {Math.round(usagePercent)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-slate-300" />
                          {item.latest_transaction_date
                            ? format(item.latest_transaction_date, 'dd MMM yyyy', { locale: id })
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isOverLimit ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 gap-1 uppercase">
                            <AlertCircle className="h-3 w-3" /> Overlimit
                          </div>
                        ) : usagePercent > 80 ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 gap-1 uppercase">
                            <Clock className="h-3 w-3" /> Warning
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 gap-1 uppercase">
                            <CheckCircle2 className="h-3 w-3" /> Sehat
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
