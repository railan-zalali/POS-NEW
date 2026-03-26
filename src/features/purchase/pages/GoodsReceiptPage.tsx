import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { goodsReceiptRepository } from '@/lib/db/goodsReceiptRepository';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
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
import { Plus, Eye, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { GRFormDialog } from '../components/GRFormDialog';
import { sameEntityId, toEntityIdString } from '@/lib/entityId';

export default function GoodsReceiptPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');

  const receipts = useLiveQuery(() => goodsReceiptRepository.getAll()) || [];
  const pos = useLiveQuery(() => purchaseOrderRepository.getAll()) || [];

  const filteredReceipts = receipts.filter((gr) => {
    const po = pos.find((p) => sameEntityId(p.id, gr.po_id));
    const searchLower = search.toLowerCase();
    return (
      gr.gr_number.toLowerCase().includes(searchLower) ||
      po?.po_number.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return (
          <Badge variant="default" className="bg-green-500">
            Lengkap
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="text-orange-500 border-orange-500">
            Parsial
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Penerimaan Barang</h1>
          <p className="text-muted-foreground text-sm">Catat barang masuk dari Supplier.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Terima Barang
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor GR atau PO..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card text-[13px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Penerimaan</TableHead>
              <TableHead>No. PO</TableHead>
              <TableHead>Tanggal Terima</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada data penerimaan barang.
                </TableCell>
              </TableRow>
            ) : (
              filteredReceipts.map((gr) => {
                const po = pos.find((p) => sameEntityId(p.id, gr.po_id));
                return (
                  <TableRow key={toEntityIdString(gr.id)}>
                    <TableCell className="font-medium">{gr.gr_number}</TableCell>
                    <TableCell>{po?.po_number || 'Tanpa PO'}</TableCell>
                    <TableCell>
                      {format(new Date(gr.received_date), 'dd MMM yyyy HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell>{gr.received_by}</TableCell>
                    <TableCell>{getStatusBadge(gr.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Lihat Detail">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <GRFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
