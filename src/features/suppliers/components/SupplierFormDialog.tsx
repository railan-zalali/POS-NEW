import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supplierRepository } from '@/lib/db/supplierRepository';
import type { Supplier } from '@/lib/db/schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const supplierSchema = z.object({
  code: z.string().min(1, 'Kode supplier wajib diisi'),
  name: z.string().min(1, 'Nama supplier wajib diisi'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  payment_terms: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormDialogProps {
  supplier?: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SupplierFormDialog({
  supplier,
  open,
  onOpenChange,
  onSuccess,
}: SupplierFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      bank_name: '',
      bank_account: '',
      payment_terms: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        code: supplier.code,
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        city: supplier.city || '',
        bank_name: supplier.bank_name || '',
        bank_account: supplier.bank_account || '',
        payment_terms: supplier.payment_terms || 0,
        notes: supplier.notes || '',
      });
    } else {
      form.reset({
        code: '',
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        bank_name: '',
        bank_account: '',
        payment_terms: 0,
        notes: '',
      });
    }
  }, [supplier, form, open]);

  const onSubmit = async (data: SupplierFormValues) => {
    setIsLoading(true);
    try {
      const supplierData = {
        ...data,
        is_active: true,
      };

      if (supplier?.id) {
        await supplierRepository.update(supplier.id, supplierData);
        toast({ title: 'Berhasil', description: 'Supplier berhasil diperbarui' });
      } else {
        await supplierRepository.create(supplierData);
        toast({ title: 'Berhasil', description: 'Supplier berhasil ditambahkan' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan supplier',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Supplier</Label>
              <Input id="code" {...form.register('code')} placeholder="Ex: SUP-001" />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Supplier</Label>
              <Input id="name" {...form.register('name')} placeholder="Ex: PT. Tani Jaya" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Kontak Person</Label>
              <Input id="contact_person" {...form.register('contact_person')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea id="address" {...form.register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="city">Kota</Label>
              <Input id="city" {...form.register('city')} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="payment_terms">Termin Pembayaran (Hari)</Label>
              <Input 
                id="payment_terms" 
                type="number" 
                min="0"
                {...form.register('payment_terms')} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank</Label>
              <Input id="bank_name" {...form.register('bank_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account">No. Rekening</Label>
              <Input id="bank_account" {...form.register('bank_account')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
