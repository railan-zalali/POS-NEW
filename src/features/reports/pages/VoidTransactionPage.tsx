import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transactionRepository } from '@/lib/db/transactionRepository';
import { db } from '@/lib/db/dexie';
import { useAuthStore } from '@/store/authStore';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { SalesTransaction, SalesTransactionItem } from '@/lib/db/schema';

export default function VoidTransactionPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<SalesTransaction | null>(null);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const transactions = useLiveQuery(() => transactionRepository.getAll()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const completedTransactions = transactions.filter(
    (tx) => tx.status === 'completed' || tx.status === 'partial_paid',
  );

  const filteredTransactions = completedTransactions.filter(
    (tx) =>
      tx.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      tx.total_amount.toString().includes(search),
  );

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'Umum';
    return customers.find((c) => c.id === customerId)?.name || 'Unknown';
  };

  const handleViewTransaction = (tx: SalesTransaction) => {
    setSelectedTransaction(tx);
    setVoidReason('');
  };

  const handleVoidClick = (tx: SalesTransaction) => {
    setSelectedTransaction(tx);
    setVoidReason('');
    setIsVoidDialogOpen(true);
  };

  const restoreLegacyAllocation = async (item: SalesTransactionItem) => {
    if (item.batch_allocations?.length) {
      return item.batch_allocations;
    }

    if (!item.batch_ids?.length) {
      throw new Error('Data batch transaksi lama tidak lengkap untuk di-void.');
    }

    if (item.batch_ids.length > 1) {
      throw new Error(
        'Transaksi lama dengan multi-batch tidak bisa di-void otomatis. Gunakan penyesuaian stok manual.',
      );
    }

    const unit = await db.product_units.get(item.product_unit_id);
    if (!unit) {
      throw new Error('Satuan produk transaksi tidak ditemukan.');
    }

    return [
      {
        batch_id: item.batch_ids[0],
        quantity: item.quantity * unit.conversion_factor,
        purchase_price: item.cogs / Math.max(item.quantity * unit.conversion_factor, 1),
      },
    ];
  };

  const handleVoidTransaction = async () => {
    if (!selectedTransaction) return;

    if (!voidReason.trim()) {
      toast({
        title: 'Gagal',
        description: 'Alasan pembatalan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    if (selectedTransaction.status === 'cancelled') {
      toast({
        title: 'Gagal',
        description: 'Transaksi ini sudah dibatalkan sebelumnya.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await db.transaction(
        'rw',
        [
          db.sales_transactions,
          db.sales_transaction_items,
          db.product_stocks,
          db.stock_movements,
          db.customers,
        ],
        async () => {
          const items = await db.sales_transaction_items
            .where('transaction_id')
            .equals(selectedTransaction.id!)
            .toArray();

          for (const item of items) {
            const allocations = await restoreLegacyAllocation(item);

            for (const allocation of allocations) {
              const stock = await db.product_stocks.get(allocation.batch_id);
              if (!stock) {
                throw new Error(`Batch stok ${allocation.batch_id} tidak ditemukan.`);
              }

              const newQty = stock.quantity + allocation.quantity;
              await db.product_stocks.update(stock.id!, {
                quantity: newQty,
                updated_at: new Date(),
                sync_status: 'pending',
              });

              await db.stock_movements.add({
                product_id: item.product_id,
                product_unit_id: item.product_unit_id,
                movement_type: 'return',
                reference_id: selectedTransaction.id!,
                reference_type: 'transaction',
                batch_number: stock.batch_number,
                quantity_before: stock.quantity,
                quantity_change: allocation.quantity,
                quantity_after: newQty,
                expire_date: stock.expire_date,
                created_by: user?.id || 'system',
                created_at: new Date(),
                updated_at: new Date(),
                sync_status: 'pending',
              });
            }
          }

          await db.sales_transactions.update(selectedTransaction.id!, {
            status: 'cancelled',
            notes: `${selectedTransaction.notes || ''}\n\n[VOID] Pembatalan Transaksi: ${voidReason}\nDibatalkan oleh: ${user?.full_name || 'System'}\nTanggal: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
            updated_at: new Date(),
            sync_status: 'pending',
          });

          if (selectedTransaction.customer_id && selectedTransaction.payment_method === 'credit') {
            const customer = await db.customers.get(selectedTransaction.customer_id);
            if (customer) {
              await db.customers.update(selectedTransaction.customer_id, {
                outstanding_credit: Math.max(
                  0,
                  customer.outstanding_credit - selectedTransaction.total_amount,
                ),
                updated_at: new Date(),
                sync_status: 'pending',
              });
            }
          }
        },
      );

      toast({
        title: 'Berhasil',
        description: `Transaksi ${selectedTransaction.invoice_number} berhasil dibatalkan`,
      });

      setIsVoidDialogOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      toast({
        title: 'Gagal',
        description:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat membatalkan transaksi',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Pembatalan Transaksi</h1>
          <p className="text-muted-foreground">
            Batalkan transaksi yang sudah dilakukan dan kembalikan stok
          </p>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Cari Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nomor invoice..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {search
                        ? 'Transaksi tidak ditemukan'
                        : 'Tidak ada transaksi untuk dibatalkan'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono font-bold">{tx.invoice_number}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(tx.transaction_date, 'dd MMM yyyy HH:mm', { locale: id })}
                      </TableCell>
                      <TableCell>{getCustomerName(tx.customer_id)}</TableCell>
                      <TableCell className="text-right font-bold">
                        Rp {tx.total_amount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.payment_method === 'cash'
                              ? 'bg-green-100 text-green-700'
                              : tx.payment_method === 'transfer'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {tx.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewTransaction(tx)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVoidClick(tx)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Batalkan
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Pembatalan
            </DialogTitle>
            <DialogDescription>
              Pembatalan akan mengembalikan stok barang dan mencatat transaksi sebagai dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                <div className="font-bold">{selectedTransaction.invoice_number}</div>
                <div className="text-sm text-muted-foreground">
                  {getCustomerName(selectedTransaction.customer_id)}
                </div>
                <div className="text-2xl font-bold text-primary">
                  Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Sistem hanya mendukung pembatalan penuh pada fase ini agar rollback stok tetap
                  akurat per batch.
                </div>

                <div className="space-y-2">
                  <Label>Alasan Pembatalan</Label>
                  <Textarea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Contoh: Barang cacat, double transaction, dll..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoidDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleVoidTransaction}>
              Konfirmasi Pembatalan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
