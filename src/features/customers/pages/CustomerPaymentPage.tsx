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
import { Search, Users, DollarSign, CreditCard, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Customer, CustomerPayment } from '@/lib/db/schema';

export default function CustomerPaymentPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash' as 'cash' | 'transfer',
    reference_number: '',
    notes: '',
  });

  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const customerPayments = useLiveQuery(() => db.customer_payments.toArray()) || [];

  const customersWithDebt = customers.filter((c) => c.is_active && c.outstanding_credit > 0);

  const filteredCustomers = customersWithDebt.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search),
  );

  const getLastPaymentDate = (customerId: string) => {
    const payments = customerPayments.filter((p) => p.customer_id === customerId);
    if (payments.length === 0) return null;
    return payments.sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
    )[0];
  };

  const handleOpenPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentForm({
      amount: customer.outstanding_credit,
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    });
    setIsPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedCustomer) return;

    if (paymentForm.amount <= 0) {
      toast({
        title: 'Gagal',
        description: 'Jumlah pembayaran harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    if (paymentForm.amount > selectedCustomer.outstanding_credit) {
      toast({
        title: 'Gagal',
        description: 'Jumlah pembayaran tidak boleh melebihi piutang',
        variant: 'destructive',
      });
      return;
    }

    try {
      const paymentNumber = `PAY-${format(new Date(), 'yyyyMMdd')}-${Math.floor(
        Math.random() * 10000,
      )
        .toString()
        .padStart(4, '0')}`;

      await db.transaction('rw', [db.customer_payments, db.customers], async () => {
        await db.customer_payments.add({
          payment_number: paymentNumber,
          customer_id: selectedCustomer.id!,
          payment_date: new Date(),
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number || undefined,
          notes: paymentForm.notes || undefined,
          created_by: user?.id || 'system',
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as CustomerPayment);

        const newOutstanding = selectedCustomer.outstanding_credit - paymentForm.amount;
        await db.customers.update(selectedCustomer.id!, {
          outstanding_credit: Math.max(0, newOutstanding),
          updated_at: new Date(),
          sync_status: 'pending',
        });
      });

      toast({
        title: 'Berhasil',
        description: `Pembayaran piutang ${selectedCustomer.name} sebesar Rp ${paymentForm.amount.toLocaleString('id-ID')} telah dicatat`,
      });

      setIsPaymentDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      toast({
        title: 'Gagal',
        description:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan pembayaran',
        variant: 'destructive',
      });
    }
  };

  const recentPayments = customerPayments
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    .slice(0, 20);

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || '-';
  };

  const totalReceivable = customersWithDebt.reduce((sum, c) => sum + c.outstanding_credit, 0);

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Pembayaran Piutang</h1>
          <p className="text-muted-foreground">Kelola pelunasan piutang pelanggan</p>
        </div>
        <Button
          onClick={() => setShowHistory(!showHistory)}
          variant={showHistory ? 'default' : 'outline'}
        >
          {showHistory ? 'Daftar Piutang' : 'Riwayat Pembayaran'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100/80">
              Total Piutang Berjalan
            </CardTitle>
            <CreditCard className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {totalReceivable.toLocaleString('id-ID')}</div>
            <p className="text-xs text-blue-100/70 mt-1">
              {customersWithDebt.length} pelanggan memiliki piutang
            </p>
          </CardContent>
        </Card>
      </div>

      {!showHistory ? (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Pelanggan dengan Piutang
            </CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pelanggan..."
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
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Limit Kredit</TableHead>
                    <TableHead className="text-right">Piutang</TableHead>
                    <TableHead>Pembayaran Terakhir</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {search
                          ? 'Pelanggan tidak ditemukan'
                          : 'Tidak ada pelanggan dengan piutang'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const lastPayment = getLastPaymentDate(customer.id!);
                      const isOverLimit = customer.outstanding_credit > customer.credit_limit;

                      return (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="font-mono text-sm">{customer.code}</TableCell>
                          <TableCell>Rp {customer.credit_limit.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold ${isOverLimit ? 'text-red-600' : ''}`}>
                              Rp {customer.outstanding_credit.toLocaleString('id-ID')}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {lastPayment
                              ? format(new Date(lastPayment.payment_date), 'dd MMM yyyy', {
                                  locale: id,
                                })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayment(customer)}
                              disabled={customer.outstanding_credit <= 0}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Bayar
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
      ) : (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Riwayat Pembayaran Piutang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pembayaran</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Referensi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Belum ada riwayat pembayaran piutang
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm font-bold">
                          {payment.payment_number}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: id })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getCustomerName(payment.customer_id)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.payment_method === 'cash'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {payment.payment_method}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          Rp {payment.amount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.reference_number || '-'}
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

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Pembayaran Piutang</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-xl bg-slate-50 space-y-2">
                <div className="font-bold text-lg">{selectedCustomer.name}</div>
                <div className="text-sm text-muted-foreground">
                  Kode: {selectedCustomer.code} | Telepon: {selectedCustomer.phone || '-'}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">Piutang Saat Ini:</span>
                  <span className="text-xl font-bold text-blue-600">
                    Rp {selectedCustomer.outstanding_credit.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Jumlah Pembayaran</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: parseInt(e.target.value) || 0,
                      })
                    }
                    max={selectedCustomer.outstanding_credit}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(v) =>
                      setPaymentForm({ ...paymentForm, payment_method: v as 'cash' | 'transfer' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>No. Referensi (Opsional)</Label>
                  <Input
                    value={paymentForm.reference_number}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, reference_number: e.target.value })
                    }
                    placeholder="Contoh: Bukti transfer bank"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Tambahkan catatan jika diperlukan..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitPayment}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Konfirmasi Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
