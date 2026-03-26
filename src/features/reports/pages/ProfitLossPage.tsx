import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transactionRepository } from '@/lib/db/transactionRepository';
import { db } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Calculator,
  Percent,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    expenses: 0, // Placeholder for future feature
    netProfit: 0,
    margin: 0,
  });

  const liveTransactions = useLiveQuery(() => transactionRepository.getAll());
  const transactions = useMemo(() => liveTransactions || [], [liveTransactions]);
  const liveExpenses = useLiveQuery(() => db.expenses.toArray());
  const expenses = useMemo(() => liveExpenses || [], [liveExpenses]);

  useEffect(() => {
    const calculatePL = async () => {
      let revenue = 0;
      let cogs = 0;
      let totalExpenses = 0;

      // Filter transactions
      const filteredTxs = transactions.filter((tx) => {
        const txDate = new Date(tx.transaction_date);
        return (
          isWithinInterval(txDate, {
            start: new Date(startDate),
            end: new Date(endDate),
          }) && tx.status === 'completed'
        );
      });

      // Calculate Revenue & COGS
      for (const tx of filteredTxs) {
        revenue += tx.total_amount;

        // Fetch items to get COGS
        const items = await db.sales_transaction_items
          .where('transaction_id')
          .equals(tx.id!)
          .toArray();

        const txCOGS = items.reduce((sum, item) => sum + (item.cogs || 0), 0);
        cogs += txCOGS;
      }

      totalExpenses = expenses
        .filter((expense) =>
          isWithinInterval(new Date(expense.date), {
            start: new Date(startDate),
            end: new Date(endDate),
          }),
        )
        .reduce((sum, expense) => sum + expense.amount, 0);

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - totalExpenses;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      setReportData({
        revenue,
        cogs,
        grossProfit,
        expenses: totalExpenses,
        netProfit,
        margin,
      });
    };

    void calculatePL();
  }, [expenses, transactions, startDate, endDate]);

  const chartData = [
    { name: 'HPP (COGS)', value: reportData.cogs },
    { name: 'Laba Bersih', value: reportData.netProfit },
  ];
  const COLORS = ['#D62828', '#2D6A4F'];

  const handleExport = () => {
    const ws = utils.json_to_sheet([
      { Item: 'Pendapatan (Revenue)', Nilai: reportData.revenue },
      { Item: 'Harga Pokok Penjualan (COGS)', Nilai: reportData.cogs },
      { Item: 'Laba Kotor (Gross Profit)', Nilai: reportData.grossProfit },
      { Item: 'Beban Operasional', Nilai: reportData.expenses },
      { Item: 'Laba Bersih (Net Profit)', Nilai: reportData.netProfit },
      { Item: 'Margin', Nilai: `${reportData.margin.toFixed(2)}%` },
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Laba Rugi');
    writeFile(wb, `Laporan_Laba_Rugi_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1">
            Laporan Laba Rugi
          </h1>
          <p className="text-slate-500 text-sm">
            Analisis profitabilitas dan efisiensi operasional.
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="rounded-full shadow-lg shadow-primary/10"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      {/* Date Filter Card */}
      <Card className="border-none shadow-md overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 flex flex-wrap gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dari Tanggal
            </label>
            <Input
              type="date"
              className="bg-slate-50 border-none shadow-none focus:ring-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sampai Tanggal
            </label>
            <Input
              type="date"
              className="bg-slate-50 border-none shadow-none focus:ring-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
            <Percent className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">
              Margin: {reportData.margin.toFixed(2)}%
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Financial Statement Style Card */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pernyataan Laba Rugi</CardTitle>
              <CardDescription>Detail pendapatan dan biaya periode ini.</CardDescription>
            </div>
            <Calculator className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Revenue Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                    Pendapatan
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Berdasarkan Faktur Terjual
                  </span>
                </div>
                <div className="flex justify-between items-center py-4 px-6 bg-slate-50 rounded-xl group hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-white shadow-sm text-emerald-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-700">Total Penjualan Kotor</span>
                  </div>
                  <span className="text-2xl font-black text-slate-900">
                    Rp {reportData.revenue.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* COGS Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                    Beban Langsung
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Metode FIFO/FEFO</span>
                </div>
                <div className="flex justify-between items-center py-4 px-6 bg-slate-50 rounded-xl group hover:bg-rose-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-white shadow-sm text-rose-600">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-700">HPP (COGS)</span>
                  </div>
                  <span className="text-2xl font-black text-rose-600">
                    (Rp {reportData.cogs.toLocaleString('id-ID')})
                  </span>
                </div>
              </div>

              {/* Final Totals */}
              <div className="pt-8 border-t border-dashed border-slate-200">
                <div className="flex justify-between items-center py-6 px-10 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl shadow-xl shadow-emerald-200">
                  <div className="text-white">
                    <p className="text-sm font-medium opacity-80 uppercase tracking-widest">
                      Laba Bersih (Net Profit)
                    </p>
                    <p className="text-xs opacity-60">Setelah dikurangi beban operasional</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-white">
                      Rp {reportData.netProfit.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Side */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" /> Komposisi Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-6 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1500}
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border-none shadow-2xl rounded-lg p-3 text-xs">
                            <p className="font-bold text-slate-900 mb-1">{payload[0].name}</p>
                            <p className="font-black text-primary">
                              Rp {Number(payload[0].value).toLocaleString('id-ID')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
            <CardHeader>
              <CardTitle className="text-white/80 text-sm font-bold uppercase tracking-widest">
                Analisis Margin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-8 flex flex-col items-center">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full rotate-[-90deg]">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    fill="transparent"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    fill="transparent"
                    stroke="white"
                    strokeWidth="8"
                    strokeDasharray={364.42}
                    strokeDashoffset={364.42 * (1 - reportData.margin / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black">{reportData.margin.toFixed(0)}%</span>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-blue-100/70 text-center px-4">
                Setiap Rp 1,000 penjualan menghasilkan laba kotor sebesar Rp{' '}
                {(reportData.margin * 10).toFixed(0)}.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
