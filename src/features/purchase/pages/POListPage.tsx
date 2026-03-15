import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { supplierRepository } from '@/lib/db/supplierRepository';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Eye, FileText, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { POFormDialog } from '../components/POFormDialog';
import { useToast } from '@/hooks/use-toast';

export default function PurchaseOrderPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const pos = useLiveQuery(() => purchaseOrderRepository.getAll()) || [];
  const suppliers = useLiveQuery(() => supplierRepository.getAll()) || [];

  const filteredPOs = pos.filter((po) => {
    const supplier = suppliers.find((s) => s.id === po.supplier_id);
    const searchLower = search.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(searchLower) ||
      supplier?.name.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
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
          <Badge variant="outline" className="text-orange-500 border-orange-500">
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

  const handleDelete = async (poId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus PO ini?')) {
      try {
        await purchaseOrderRepository.delete(poId);
        toast({ title: 'Berhasil', description: 'Purchase Order telah dihapus.' });
      } catch (_error) {
        toast({ title: 'Gagal', description: 'Gagal menghapus PO.', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchase Order</h1>
          <p className="text-muted-foreground text-sm">Kelola pesanan barang ke supplier.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          PO Baru
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor PO atau supplier..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card">
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
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Tidak ada Purchase Order ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredPOs.map((po) => {
                const supplier = suppliers.find((s) => s.id === po.supplier_id);
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>
                      {format(new Date(po.order_date), 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell>{supplier?.name || 'Unknown'}</TableCell>
                    <TableCell>Rp {po.total_amount.toLocaleString('id-ID')}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title="Lihat Detail">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Cetak PO">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(po.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <POFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
