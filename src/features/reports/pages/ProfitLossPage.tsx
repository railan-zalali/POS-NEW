import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transactionRepository } from '@/lib/db/transactionRepository';
import { db } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

  const transactions = useLiveQuery(() => transactionRepository.getAll()) || [];

  useEffect(() => {
    const calculatePL = async () => {
      let revenue = 0;
      let cogs = 0;

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

      const grossProfit = revenue - cogs;
      const expenses = 0; // Hardcoded for now, need expense module
      const netProfit = grossProfit - expenses;
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      setReportData({ revenue, cogs, grossProfit, expenses, netProfit, margin });
    };

    if (transactions.length > 0) {
      calculatePL();
    }
  }, [transactions, startDate, endDate]);

  const chartData = [
    { name: 'HPP (COGS)', value: reportData.cogs },
    { name: 'Laba Kotor', value: reportData.grossProfit },
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
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Laporan Laba Rugi</h1>
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
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Keuangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Pendapatan
                  </span>
                  <span className="text-lg font-bold text-primary">
                    Rp {reportData.revenue.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" /> HPP (COGS)
                  </span>
                  <span className="text-lg font-bold text-destructive">
                    (Rp {reportData.cogs.toLocaleString('id-ID')})
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-2 bg-muted/20 p-2 rounded">
                  <span className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Laba Kotor
                  </span>
                  <span className="text-xl font-bold text-green-700">
                    Rp {reportData.grossProfit.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Margin Keuntungan</span>
                  <span className="text-lg font-bold">{reportData.margin.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Komposisi Pendapatan</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
