import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '@/lib/db/productRepository';
import { categoryRepository } from '@/lib/db/categoryRepository';
import { db } from '@/lib/db/dexie';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/lib/db/schema';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, Plus, Minus, AlertTriangle, History } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type AdjustmentType = 'add' | 'reduce' | 'set';

export default function StockAdjustmentPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [adjustmentForm, setAdjustmentForm] = useState({
    adjustment_type: 'add' as AdjustmentType,
    quantity: 0,
    reason: '',
  });

  const products = useLiveQuery(() => productRepository.getAll()) || [];
  const categories = useLiveQuery(() => categoryRepository.getAll()) || [];
  const stocks = useLiveQuery(() => db.product_stocks.toArray()) || [];
  const productUnits = useLiveQuery(() => db.product_units.toArray()) || [];
  const stockMovements = useLiveQuery(() => db.stock_movements.toArray()) || [];

  const filteredProducts = products.filter(
    (p) =>
      p.is_active &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())),
  );

  const getCurrentStock = (productId: string) => {
    const productStocks = stocks.filter((s) => s.product_id === productId);
    const total = productStocks.reduce((sum, s) => sum + s.quantity, 0);
    const baseUnit = productUnits.find((u) => u.product_id === productId && u.is_base_unit);
    return {
      total,
      unit: baseUnit?.unit_name || 'Unit',
    };
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '-';
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentForm({
      adjustment_type: 'add',
      quantity: 0,
      reason: '',
    });
    setIsDialogOpen(true);
  };

  const getNewStock = () => {
    if (!selectedProduct) return 0;
    const current = getCurrentStock(selectedProduct.id!).total;
    switch (adjustmentForm.adjustment_type) {
      case 'add':
        return current + adjustmentForm.quantity;
      case 'reduce':
        return current - adjustmentForm.quantity;
      case 'set':
        return adjustmentForm.quantity;
      default:
        return current;
    }
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedProduct) return;

    if (adjustmentForm.quantity <= 0 && adjustmentForm.adjustment_type !== 'set') {
      toast({
        title: 'Gagal',
        description: 'Jumlah harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    if (!adjustmentForm.reason.trim()) {
      toast({
        title: 'Gagal',
        description: 'Alasan penyesuaian wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    const currentStock = getCurrentStock(selectedProduct.id!).total;
    const newStock = getNewStock();

    if (newStock < 0) {
      toast({
        title: 'Gagal',
        description: 'Stok tidak bisa menjadi negatif',
        variant: 'destructive',
      });
      return;
    }

    try {
      const adjustmentId = crypto.randomUUID();

      await db.transaction('rw', [db.product_stocks, db.stock_movements], async () => {
        const existingStock = await db.product_stocks
          .where('product_id')
          .equals(selectedProduct.id!)
          .first();

        const baseUnit = productUnits.find(
          (u) => u.product_id === selectedProduct.id! && u.is_base_unit,
        );

        if (existingStock) {
          await db.product_stocks.update(existingStock.id!, {
            quantity: newStock,
            updated_at: new Date(),
            sync_status: 'pending',
          });
        } else {
          await db.product_stocks.add({
            product_id: selectedProduct.id!,
            unit_id: baseUnit?.id || '',
            quantity: newStock,
            purchase_price: baseUnit?.purchase_price || 0,
            received_date: new Date(),
            sync_status: 'pending',
          });
        }

        await db.stock_movements.add({
          product_id: selectedProduct.id!,
          product_unit_id: baseUnit?.id || '',
          movement_type: 'adjustment',
          reference_id: adjustmentId,
          reference_type: 'adjustment',
          quantity_before: currentStock,
          quantity_change: newStock - currentStock,
          quantity_after: newStock,
          created_by: user?.id || 'system',
          created_at: new Date(),
          sync_status: 'pending',
        });
      });

      toast({
        title: 'Berhasil',
        description: `Stok ${selectedProduct.name} berhasil disesuaikan`,
      });

      setIsDialogOpen(false);
      setSelectedProduct(null);
      setAdjustmentForm({ adjustment_type: 'add', quantity: 0, reason: '' });
    } catch (error) {
      toast({
        title: 'Gagal',
        description:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan penyesuaian',
        variant: 'destructive',
      });
    }
  };

  const recentAdjustments = stockMovements
    .filter((m) => m.movement_type === 'adjustment')
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 20);

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || '-';
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Penyesuaian Stok</h1>
          <p className="text-muted-foreground">Kelola penyesuaian stok barang manual</p>
        </div>
        <Button
          onClick={() => setShowHistory(!showHistory)}
          variant={showHistory ? 'default' : 'outline'}
        >
          <History className="mr-2 h-4 w-4" />
          {showHistory ? 'Penyesuaian Baru' : 'Riwayat Penyesuaian'}
        </Button>
      </div>

      {!showHistory ? (
        <>
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Pilih Produk untuk Disesuaikan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Stok Saat Ini</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {search ? 'Produk tidak ditemukan' : 'Tidak ada produk'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const stockInfo = getCurrentStock(product.id!);
                        const isLowStock = stockInfo.total < 10;

                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-mono text-sm">{product.code}</TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-xs font-medium">
                                {getCategoryName(product.category_id)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isLowStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                <span className={`font-bold ${isLowStock ? 'text-amber-600' : ''}`}>
                                  {stockInfo.total} {stockInfo.unit}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectProduct(product)}
                              >
                                <Package className="mr-2 h-4 w-4" />
                                Sesuaikan
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Penyesuaian Stok</DialogTitle>
              </DialogHeader>
              {selectedProduct && (
                <div className="space-y-6 py-4">
                  <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                    <div className="font-bold text-lg">{selectedProduct.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Kode: {selectedProduct.code}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Stok Saat Ini:</span>
                      <span className="font-bold text-lg">
                        {getCurrentStock(selectedProduct.id!).total}{' '}
                        {getCurrentStock(selectedProduct.id!).unit}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipe Penyesuaian</Label>
                      <Select
                        value={adjustmentForm.adjustment_type}
                        onValueChange={(v) =>
                          setAdjustmentForm({
                            ...adjustmentForm,
                            adjustment_type: v as AdjustmentType,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4 text-green-500" />
                              Tambah Stok
                            </div>
                          </SelectItem>
                          <SelectItem value="reduce">
                            <div className="flex items-center gap-2">
                              <Minus className="h-4 w-4 text-red-500" />
                              Kurangi Stok
                            </div>
                          </SelectItem>
                          <SelectItem value="set">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-500" />
                              Set Stok Baru
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {adjustmentForm.adjustment_type === 'set'
                          ? 'Jumlah Stok Baru'
                          : 'Jumlah Penyesuaian'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={adjustmentForm.quantity}
                        onChange={(e) =>
                          setAdjustmentForm({
                            ...adjustmentForm,
                            quantity: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Masukkan jumlah"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Stok Baru:</span>
                        <span className="text-xl font-bold text-primary">
                          {getNewStock()} {getCurrentStock(selectedProduct.id!).unit}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Alasan Penyesuaian</Label>
                      <Textarea
                        value={adjustmentForm.reason}
                        onChange={(e) =>
                          setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
                        }
                        placeholder="Contoh: Koreksi stok, barang rusak, dll..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSubmitAdjustment}>Simpan Penyesuaian</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Riwayat Penyesuaian Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Sebelum</TableHead>
                    <TableHead className="text-right">Perubahan</TableHead>
                    <TableHead className="text-right">Sesudah</TableHead>
                    <TableHead>Batch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAdjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Belum ada riwayat penyesuaian stok
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentAdjustments.map((adj) => (
                      <TableRow key={adj.id}>
                        <TableCell className="whitespace-nowrap">
                          {adj.created_at
                            ? format(new Date(adj.created_at), 'dd MMM yyyy HH:mm', {
                                locale: id,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getProductName(adj.product_id)}
                        </TableCell>
                        <TableCell className="text-right">{adj.quantity_before}</TableCell>
                        <TableCell
                          className={`text-right font-bold ${
                            adj.quantity_change > 0
                              ? 'text-green-600'
                              : adj.quantity_change < 0
                                ? 'text-red-600'
                                : ''
                          }`}
                        >
                          {adj.quantity_change > 0 ? '+' : ''}
                          {adj.quantity_change}
                        </TableCell>
                        <TableCell className="text-right font-bold">{adj.quantity_after}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {adj.batch_number || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
