import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { supplierRepository } from '@/lib/db/supplierRepository';
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
import { Plus, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { PurchaseOrder } from '@/lib/db/schema';

export default function POListPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const purchaseOrders = useLiveQuery(() => purchaseOrderRepository.getAll()) || [];
  const suppliers = useLiveQuery(() => supplierRepository.getAll()) || [];

  const getSupplierName = (id: string) => {
    return suppliers.find((s) => s.id === id)?.name || 'Unknown Supplier';
  };

  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.po_number.toLowerCase().includes(search.toLowerCase()) ||
      getSupplierName(po.supplier_id).toLowerCase().includes(search.toLowerCase()),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default'; // blue-ish usually
      case 'partial_received':
        return 'warning';
      case 'received':
        return 'success'; // green
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'sent':
        return 'Terkirim';
      case 'partial_received':
        return 'Diterima Sebagian';
      case 'received':
        return 'Diterima';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Purchase Order</h1>
          <p className="text-muted-foreground">Kelola pembelian barang ke supplier</p>
        </div>
        <Button onClick={() => navigate('/purchase/create')}>
          <Plus className="mr-2 h-4 w-4" /> Buat PO Baru
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Riwayat Pembelian</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari No. PO atau Supplier..."
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
                  <TableHead className="w-[180px]">No. PO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Belum ada data Purchase Order.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po: PurchaseOrder) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{format(po.order_date, 'dd MMM yyyy', { locale: id })}</TableCell>
                      <TableCell>{getSupplierName(po.supplier_id)}</TableCell>
                      <TableCell>Rp {po.total_amount.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(po.status) as any}>
                          {translateStatus(po.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/purchase/${po.id}`)}
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
