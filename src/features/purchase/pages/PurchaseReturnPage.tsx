import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { useAuthStore } from '@/store/authStore';
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
import { Search, Plus, RotateCcw, Package, Truck, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { PurchaseReturn, ReturnReason } from '@/lib/db/schema';
import { sameEntityId, toEntityIdString } from '@/lib/entityId';

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: 'defective', label: 'Barang Cacat' },
  { value: 'wrong_item', label: 'Barang Salah' },
  { value: 'expired', label: 'Barang Kadaluarsa' },
  { value: 'damaged', label: 'Barang Rusak' },
  { value: 'excess_order', label: 'Pesanan Berlebih' },
  { value: 'customer_return', label: 'Retur Pelanggan' },
  { value: 'other', label: 'Lainnya' },
];

export default function PurchaseReturnPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: '',
    return_date: format(new Date(), 'yyyy-MM-dd'),
    reason: 'defective' as ReturnReason,
    notes: '',
  });

  const returns = useLiveQuery(() => db.purchase_returns.toArray()) || [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

  const filteredReturns = returns.filter(
    (r) =>
      r.return_number.toLowerCase().includes(search.toLowerCase()) ||
      suppliers
        .find((s) => sameEntityId(s.id, r.supplier_id))
        ?.name.toLowerCase()
        .includes(search.toLowerCase()),
  );

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => sameEntityId(s.id, supplierId))?.name || '-';
  };

  const handleOpenDialog = () => {
    setFormData({
      supplier_id: '',
      return_date: format(new Date(), 'yyyy-MM-dd'),
      reason: 'defective',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.supplier_id) {
      toast({
        title: 'Gagal',
        description: 'Supplier wajib dipilih',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.notes.trim()) {
      toast({
        title: 'Gagal',
        description: 'Alasan retur wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      const returnNumber = `RET-${format(new Date(), 'yyyyMMdd')}-${Math.floor(
        Math.random() * 10000,
      )
        .toString()
        .padStart(4, '0')}`;

      await db.purchase_returns.add({
        return_number: returnNumber,
        supplier_id: formData.supplier_id,
        return_date: new Date(formData.return_date),
        total_amount: 0,
        reason: formData.reason,
        notes: formData.notes,
        status: 'submitted',
        created_by: user?.id || 'system',
        created_at: new Date(),
        updated_at: new Date(),
        sync_status: 'pending',
      } as PurchaseReturn);

      toast({
        title: 'Berhasil',
        description: `Retur ${returnNumber} berhasil dibuat`,
      });

      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Gagal',
        description:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan retur',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: PurchaseReturn['status']) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            Draft
          </span>
        );
      case 'submitted':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            Submitted
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            Rejected
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const getReasonLabel = (reason: ReturnReason) => {
    return RETURN_REASONS.find((r) => r.value === reason)?.label || reason;
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Retur Pembelian</h1>
          <p className="text-muted-foreground">Kelola retur barang ke supplier</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant={showHistory ? 'default' : 'outline'}
          >
            {showHistory ? 'Buat Retur Baru' : 'Riwayat Retur'}
          </Button>
          {!showHistory && (
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" /> Retur Baru
            </Button>
          )}
        </div>
      </div>

      {!showHistory ? (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Form Retur Pembelian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tanggal Retur</Label>
                <Input
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers
                      .filter((s) => s.is_active)
                      .map((supplier) => (
                        <SelectItem
                          key={toEntityIdString(supplier.id)}
                          value={toEntityIdString(supplier.id)}
                        >
                          {supplier.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alasan Retur</Label>
              <Select
                value={formData.reason}
                onValueChange={(v) => setFormData({ ...formData, reason: v as ReturnReason })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catatan / Keterangan</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Jelaskan detail barang yang akan diretur..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Ajukan Retur
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Riwayat Retur Pembelian
            </CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari retur..."
                className="pl-10"
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
                    <TableHead>No. Retur</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Belum ada data retur
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturns.map((ret) => (
                      <TableRow key={toEntityIdString(ret.id)}>
                        <TableCell className="font-mono font-bold">{ret.return_number}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(ret.return_date), 'dd MMM yyyy', { locale: id })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            {getSupplierName(ret.supplier_id)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium">
                            {getReasonLabel(ret.reason)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(ret.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
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
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Retur</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Retur purchase akan dicatat dan memerlukan persetujuan sebelum diproses.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Ajukan Retur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
