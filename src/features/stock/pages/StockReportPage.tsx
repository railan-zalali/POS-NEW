import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Search, Download, AlertTriangle } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { db } from '@/lib/db/dexie';

export default function StockReportPage() {
  const [search, setSearch] = useState('');
  const [stockData, setStockData] = useState<any[]>([]);

  const products = useLiveQuery(() => productRepository.getAll()) || [];
  const categories = useLiveQuery(() => categoryRepository.getAll()) || [];

  useEffect(() => {
    const fetchStock = async () => {
      // Aggregate stock from product_stocks table
      const stocks = await db.product_stocks.toArray();
      const productUnits = await db.product_units.toArray();

      const aggregated: Record<string, number> = {};

      stocks.forEach((stock) => {
        // We want to show stock in BASE UNIT
        const unit = productUnits.find((u) => u.id === stock.unit_id);
        const product = products.find((p) => p.id === stock.product_id);

        if (unit && product) {
          const key = product.id!;
          // Simple sum for now, ideally convert to base unit if multiple units exist for same product
          // Assuming product_stocks stores quantity in the specific unit_id
          // To aggregate total stock, we need to normalize to base unit.

          const conversion = unit.conversion_factor || 1;
          const normalizedQty = stock.quantity * conversion;

          if (!aggregated[key]) aggregated[key] = 0;
          aggregated[key] += normalizedQty;
        }
      });

      const reportData = products.map((p) => {
        const totalStock = aggregated[p.id!] || 0;
        // Find base unit name
        const baseUnit = productUnits.find((u) => u.product_id === p.id && u.is_base_unit);

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          category: categories.find((c) => c.id === p.category_id)?.name || '-',
          stock: totalStock,
          unit: baseUnit?.unit_name || 'Unit',
          // status: totalStock <= (p.min_stock || 0) ? 'critical' : 'normal' // min_stock logic to be added to schema if not present
          status: totalStock < 10 ? 'critical' : totalStock < 50 ? 'warning' : 'normal',
        };
      });

      setStockData(reportData);
    };

    if (products.length > 0) {
      fetchStock();
    }
  }, [products, categories]);

  const filteredStock = stockData.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()),
  );

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
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Laporan Stok</h1>
          <p className="text-muted-foreground">Monitoring ketersediaan barang real-time</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Stok Saat Ini</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari produk..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Kode</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Total Stok (Base)</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Data stok tidak ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="font-bold">{item.stock}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        {item.status === 'critical' ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Kritis
                          </Badge>
                        ) : item.status === 'warning' ? (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          >
                            Menipis
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Aman
                          </Badge>
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
