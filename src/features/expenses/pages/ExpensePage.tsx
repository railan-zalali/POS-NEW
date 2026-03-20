import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { expenseRepository } from '@/lib/db/expenseRepository';
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
import { Plus, Search, Trash2, Edit, Receipt, TrendingDown, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Expense, ExpenseCategory } from '@/lib/db/schema';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'operational', label: 'Operasional' },
  { value: 'electricity', label: 'Listrik' },
  { value: 'water', label: 'Air' },
  { value: 'internet', label: 'Internet' },
  { value: 'rent', label: 'Sewa' },
  { value: 'salary', label: 'Gaji' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'maintenance', label: 'Perawatan' },
  { value: 'supplies', label: 'Perlengkapan' },
  { value: 'transportation', label: 'Transportasi' },
  { value: 'tax', label: 'Pajak' },
  { value: 'insurance', label: 'Asuransi' },
  { value: 'other', label: 'Lainnya' },
];

export default function ExpensePage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'operational' as ExpenseCategory,
    description: '',
    amount: 0,
    payment_method: 'cash' as 'cash' | 'transfer' | 'credit',
    receipt_number: '',
    notes: '',
  });

  const expenses = useLiveQuery(() => expenseRepository.getAll(), []) || [];

  const filteredExpenses = expenses.filter((exp) => {
    const matchSearch =
      exp.description.toLowerCase().includes(search.toLowerCase()) ||
      exp.receipt_number?.toLowerCase().includes(search.toLowerCase());

    const expDate = new Date(exp.date);
    const matchDate = expDate >= new Date(startDate) && expDate <= new Date(endDate + 'T23:59:59');

    return matchSearch && matchDate;
  });

  const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        date: format(new Date(expense.date), 'yyyy-MM-dd'),
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        payment_method: expense.payment_method,
        receipt_number: expense.receipt_number || '',
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: 'operational',
        description: '',
        amount: 0,
        payment_method: 'cash',
        receipt_number: '',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast({
        title: 'Gagal',
        description: 'Deskripsi wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: 'Gagal',
        description: 'Jumlah harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      const expenseData = {
        date: new Date(formData.date),
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number || undefined,
        notes: formData.notes || undefined,
        created_by: user?.id || 'system',
      };

      if (editingExpense) {
        await expenseRepository.update(editingExpense.id!, expenseData);
        toast({ title: 'Berhasil', description: 'Pengeluaran berhasil diperbarui.' });
      } else {
        await expenseRepository.create(expenseData);
        toast({ title: 'Berhasil', description: 'Pengeluaran berhasil ditambahkan.' });
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) {
      try {
        await expenseRepository.delete(id);
        toast({ title: 'Berhasil', description: 'Pengeluaran berhasil dihapus.' });
      } catch (error) {
        toast({
          title: 'Gagal',
          description: 'Terjadi kesalahan saat menghapus.',
          variant: 'destructive',
        });
      }
    }
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Pengeluaran</h1>
          <p className="text-muted-foreground">Kelola semua pengeluaran toko</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Pengeluaran
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-rose-100/80">
              Total Pengeluaran
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {totalExpense.toLocaleString('id-ID')}</div>
            <p className="text-xs text-rose-100/70 mt-1">{filteredExpenses.length} transaksi</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Riwayat Pengeluaran
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pengeluaran..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>No. Bukti</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Tidak ada data pengeluaran
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(exp.date), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium">
                          {getCategoryLabel(exp.category)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {exp.receipt_number || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        Rp {exp.amount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            exp.payment_method === 'cash'
                              ? 'bg-green-100 text-green-700'
                              : exp.payment_method === 'transfer'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {exp.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(exp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(exp.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v as ExpenseCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Contoh: Pembelian ATK untuk kantor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah (Rp)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Metode Bayar</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      payment_method: v as 'cash' | 'transfer' | 'credit',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>No. Bukti (Opsional)</Label>
              <Input
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                placeholder="Contoh: KWITANSI-001"
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Tambahkan catatan jika diperlukan..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
