import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '@/lib/db/productRepository';
import { categoryRepository } from '@/lib/db/categoryRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Download,
  AlertTriangle,
  Package,
  BarChart3,
  TrendingDown,
  Layers,
  Filter,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { db } from '@/lib/db/dexie';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StockReportPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  interface StockReportItem {
    id: string | undefined;
    code: string;
    name: string;
    category_id: string;
    category: string;
    stock: number;
    value: number;
    unit: string;
    status: 'critical' | 'warning' | 'normal';
  }

  const [stockData, setStockData] = useState<StockReportItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  const liveProducts = useLiveQuery(() => productRepository.getAll());
  const products = useMemo(() => liveProducts || [], [liveProducts]);
  const liveCategories = useLiveQuery(() => categoryRepository.getAll());
  const categories = useMemo(() => liveCategories || [], [liveCategories]);

  useEffect(() => {
    const fetchStock = async () => {
      const stocks = await db.product_stocks.toArray();
      const productUnits = await db.product_units.toArray();

      const aggregated: Record<string, { qty: number; value: number }> = {};

      stocks.forEach((stock) => {
        const unit = productUnits.find((u) => u.id === stock.unit_id);
        const product = products.find((p) => p.id === stock.product_id);

        if (unit && product) {
          const key = product.id!;
          const conversion = unit.conversion_factor || 1;
          const normalizedQty = stock.quantity * conversion;
          const itemValue = stock.quantity * (stock.purchase_price || 0);

          if (!aggregated[key]) aggregated[key] = { qty: 0, value: 0 };
          aggregated[key].qty += normalizedQty;
          aggregated[key].value += itemValue;
        }
      });

      let totalVal = 0;
      const reportData = products.map((p) => {
        const productStock = aggregated[p.id!] || { qty: 0, value: 0 };
        const baseUnit = productUnits.find((u) => u.product_id === p.id && u.is_base_unit);

        totalVal += productStock.value;

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          category_id: p.category_id,
          category: categories.find((c) => c.id === p.category_id)?.name || '-',
          stock: productStock.qty,
          value: productStock.value,
          unit: baseUnit?.unit_name || 'Unit',
          status: (productStock.qty < 10
            ? 'critical'
            : productStock.qty < 50
              ? 'warning'
              : 'normal') as 'critical' | 'warning' | 'normal',
        };
      });

      setStockData(reportData);
      setTotalValue(totalVal);
    };

    if (products.length > 0) {
      fetchStock();
    }
  }, [products, categories]);

  const filteredStock = stockData.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExport = () => {
    const ws = utils.json_to_sheet(
      filteredStock.map((item) => ({
        Kode: item.code,
        'Nama Produk': item.name,
        Kategori: item.category,
        Stok: item.stock,
        Satuan: item.unit,
        Status: item.status,
      })),
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Laporan Stok');
    writeFile(wb, 'Laporan_Stok.xlsx');
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1">
            Laporan Stok
          </h1>
          <p className="text-slate-500 text-sm">Monitoring ketersediaan dan nilai aset barang.</p>
        </div>
        <Button
          onClick={handleExport}
          className="rounded-full shadow-lg shadow-primary/10"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      {/* Summary Header */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100/80">
              Total Nilai Aset
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {totalValue.toLocaleString('id-ID')}</div>
            <p className="text-xs text-emerald-100/70 mt-1">Investasi barang saat ini</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Jenis Barang</CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stockData.length}</div>
            <p className="text-xs text-slate-500 mt-1">Produk terdaftar</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Stok Kritis</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">
              {stockData.filter((s) => s.status === 'critical').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Perlu restock segera</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Inventori Real-time
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Cari kode/nama..."
                className="pl-8 bg-white border-none shadow-sm focus:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-white border-none shadow-sm">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id!}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[120px] text-xs uppercase font-bold tracking-wider">
                    Kode
                  </TableHead>
                  <TableHead className="text-xs uppercase font-bold tracking-wider">
                    Nama Produk
                  </TableHead>
                  <TableHead className="text-xs uppercase font-bold tracking-wider">
                    Kategori
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold tracking-wider">
                    Total Stok
                  </TableHead>
                  <TableHead className="text-xs uppercase font-bold tracking-wider">
                    Satuan
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold tracking-wider">
                    Nilai Aset
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold tracking-wider">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                      Data stok tidak ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStock.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <TableCell className="font-mono text-xs font-bold text-slate-500">
                        {item.code}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">{item.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900">
                        {item.stock}
                      </TableCell>
                      <TableCell className="text-slate-400 font-medium text-xs">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        Rp {item.value.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status === 'critical' ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 gap-1 animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> Kritis
                          </div>
                        ) : item.status === 'warning' ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                            Menipis
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            Aman
                          </div>
                        )}
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
