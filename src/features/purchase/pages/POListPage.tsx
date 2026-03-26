import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, Eye, FileText, Plus, Search, Send, Trash2 } from 'lucide-react';
import { db } from '@/lib/db/dexie';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { productRepository } from '@/lib/db/productRepository';
import { supplierRepository } from '@/lib/db/supplierRepository';
import { sameEntityId, toEntityIdString } from '@/lib/entityId';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/db/schema';
import { POFormDialog } from '../components/POFormDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default function PurchaseOrderPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<PurchaseOrderItem[]>([]);
  const { hasPermission } = useAuthStore();
  const { toast } = useToast();

  const purchaseOrders = useLiveQuery(() => purchaseOrderRepository.getAll()) || [];
  const products = useLiveQuery(() => productRepository.getAll()) || [];
  const productUnits = useLiveQuery(() => db.product_units.toArray()) || [];
  const suppliers = useLiveQuery(() => supplierRepository.getAll()) || [];

  const selectedSupplier = selectedPO
    ? suppliers.find((supplier) => sameEntityId(supplier.id, selectedPO.supplier_id)) || null
    : null;

  const filteredPOs = purchaseOrders.filter((purchaseOrder) => {
    const supplier = suppliers.find((item) => sameEntityId(item.id, purchaseOrder.supplier_id));
    const searchLower = search.toLowerCase();
    return (
      purchaseOrder.po_number.toLowerCase().includes(searchLower) ||
      supplier?.name.toLowerCase().includes(searchLower)
    );
  });

  const canCreatePO = hasPermission('purchase:create') || hasPermission('purchase:edit');
  const canSendPO = hasPermission('purchase:approve') || hasPermission('purchase:edit');

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return (
          <Badge variant="default" className="bg-blue-500">
            Dikirim
          </Badge>
        );
      case 'partial_received':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            Parsial
          </Badge>
        );
      case 'received':
        return (
          <Badge variant="default" className="bg-green-500">
            Diterima
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const loadPurchaseOrderDetails = async (purchaseOrder: PurchaseOrder) => {
    const items = await purchaseOrderRepository.getItemsByPoId(purchaseOrder.id!);
    setSelectedPO(purchaseOrder);
    setSelectedItems(items);
    setIsDetailOpen(true);
  };

  const handleDelete = async (purchaseOrder: PurchaseOrder) => {
    if (purchaseOrder.status !== 'draft' && purchaseOrder.status !== 'cancelled') {
      toast({
        title: 'PO tidak bisa dihapus',
        description: 'Hanya PO draft atau dibatalkan yang boleh dihapus.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus PO ini?')) {
      return;
    }

    try {
      await purchaseOrderRepository.delete(purchaseOrder.id!);
      toast({ title: 'Berhasil', description: 'Purchase Order telah dihapus.' });

      if (selectedPO && sameEntityId(selectedPO.id, purchaseOrder.id)) {
        setIsDetailOpen(false);
        setSelectedPO(null);
        setSelectedItems([]);
      }
    } catch {
      toast({ title: 'Gagal', description: 'Gagal menghapus PO.', variant: 'destructive' });
    }
  };

  const handleSendPurchaseOrder = async (purchaseOrder: PurchaseOrder) => {
    setIsSending(true);
    try {
      const updatedCount = await purchaseOrderRepository.updateStatus(purchaseOrder.id!, 'sent');
      if (!updatedCount) {
        throw new Error('Purchase Order tidak ditemukan');
      }

      const updatedPO = { ...purchaseOrder, status: 'sent' as const };
      if (selectedPO && sameEntityId(selectedPO.id, purchaseOrder.id)) {
        setSelectedPO(updatedPO);
      }

      toast({
        title: 'PO siap diterima',
        description: `${purchaseOrder.po_number} telah dikirim dan sekarang tersedia di penerimaan barang.`,
      });
    } catch {
      toast({
        title: 'Gagal',
        description: 'Status PO tidak berhasil diperbarui.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handlePrintPurchaseOrder = async (purchaseOrder: PurchaseOrder) => {
    const supplier =
      suppliers.find((item) => sameEntityId(item.id, purchaseOrder.supplier_id)) || null;
    const items = await purchaseOrderRepository.getItemsByPoId(purchaseOrder.id!);

    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) {
      toast({
        title: 'Popup diblokir',
        description: 'Izinkan popup browser untuk mencetak Purchase Order.',
        variant: 'destructive',
      });
      return;
    }

    const rows = items
      .map((item, index) => {
        const productName =
          products.find((product) => sameEntityId(product.id, item.product_id))?.name ||
          String(item.product_id);
        const unitName =
          productUnits.find((unit) => sameEntityId(unit.id, item.product_unit_id))?.unit_name ||
          String(item.product_unit_id);

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(productName)}</td>
            <td>${escapeHtml(unitName)}</td>
            <td style="text-align:right;">${item.quantity_ordered}</td>
            <td style="text-align:right;">Rp ${item.unit_price.toLocaleString('id-ID')}</td>
            <td style="text-align:right;">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
          </tr>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(purchaseOrder.po_number)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { margin-bottom: 4px; }
            .meta { margin-bottom: 20px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; }
            th { background: #f8fafc; text-align: left; }
            .total { margin-top: 16px; text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Purchase Order ${escapeHtml(purchaseOrder.po_number)}</h1>
          <div class="meta">
            <div>Supplier: ${escapeHtml(supplier?.name || 'Unknown')}</div>
            <div>Tanggal: ${format(new Date(purchaseOrder.order_date), 'dd MMMM yyyy', { locale: id })}</div>
            <div>Status: ${escapeHtml(purchaseOrder.status)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Produk</th>
                <th>Satuan</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Harga</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">Total: Rp ${purchaseOrder.total_amount.toLocaleString('id-ID')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const renderSupplierName = (supplierId: string, fallback = 'Unknown') =>
    suppliers.find((supplier) => sameEntityId(supplier.id, supplierId))?.name || fallback;

  const renderProductName = (productId: string) =>
    products.find((product) => sameEntityId(product.id, productId))?.name || String(productId);

  const renderUnitName = (unitId: string) =>
    productUnits.find((unit) => sameEntityId(unit.id, unitId))?.unit_name || String(unitId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Kelola pesanan barang ke supplier.</p>
        </div>
        {canCreatePO && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            PO Baru
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor PO atau supplier..."
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. PO</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPOs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Tidak ada Purchase Order ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredPOs.map((purchaseOrder) => (
                <TableRow key={toEntityIdString(purchaseOrder.id)}>
                  <TableCell className="font-medium">{purchaseOrder.po_number}</TableCell>
                  <TableCell>
                    {format(new Date(purchaseOrder.order_date), 'dd MMM yyyy', { locale: id })}
                  </TableCell>
                  <TableCell>{renderSupplierName(purchaseOrder.supplier_id)}</TableCell>
                  <TableCell>Rp {purchaseOrder.total_amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell>{getStatusBadge(purchaseOrder.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canSendPO && purchaseOrder.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendPurchaseOrder(purchaseOrder)}
                          disabled={isSending}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Kirim
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Lihat Detail"
                        onClick={() => loadPurchaseOrderDetails(purchaseOrder)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Cetak PO"
                        onClick={() => handlePrintPurchaseOrder(purchaseOrder)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {(purchaseOrder.status === 'draft' ||
                        purchaseOrder.status === 'cancelled') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          title="Hapus PO"
                          onClick={() => handleDelete(purchaseOrder)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <POFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Purchase Order</DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-6 py-2">
              <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">No. PO</p>
                  <p className="font-semibold">{selectedPO.po_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <div>{getStatusBadge(selectedPO.status)}</div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</p>
                  <p className="font-semibold">{selectedSupplier?.name || 'Unknown'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tanggal</p>
                  <p className="font-semibold">
                    {format(new Date(selectedPO.order_date), 'dd MMMM yyyy', { locale: id })}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Diterima</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Item Purchase Order belum tersedia.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedItems.map((item) => (
                        <TableRow key={toEntityIdString(item.id)}>
                          <TableCell>{renderProductName(item.product_id)}</TableCell>
                          <TableCell>{renderUnitName(item.product_unit_id)}</TableCell>
                          <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity_received || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {item.unit_price.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {selectedPO.notes && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Catatan</p>
                  <p className="mt-2 text-sm">{selectedPO.notes}</p>
                </div>
              )}

              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Purchase Order
                  </p>
                  <p className="text-2xl font-bold">
                    Rp {selectedPO.total_amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedPO && canSendPO && selectedPO.status === 'draft' && (
              <Button
                variant="outline"
                onClick={() => handleSendPurchaseOrder(selectedPO)}
                disabled={isSending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Kirim ke Penerimaan
              </Button>
            )}
            {selectedPO && (
              <Button variant="outline" onClick={() => handlePrintPurchaseOrder(selectedPO)}>
                <FileText className="mr-2 h-4 w-4" />
                Cetak
              </Button>
            )}
            <Button onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
