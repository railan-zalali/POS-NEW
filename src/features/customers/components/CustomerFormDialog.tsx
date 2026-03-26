import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
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
import { customerRepository } from '@/lib/db/customerRepository';
import type { Customer } from '@/lib/db/schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const customerSchema = z.object({
  code: z.string().min(1, 'Kode pelanggan wajib diisi'),
  name: z.string().min(1, 'Nama pelanggan wajib diisi'),
  nik: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  regency: z.string().optional(),
  province: z.string().optional(),
  credit_limit: z.coerce.number().min(0).optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  customer?: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CustomerFormDialog({
  customer,
  open,
  onOpenChange,
  onSuccess,
}: CustomerFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as unknown as Resolver<CustomerFormValues>,
    defaultValues: {
      code: '',
      name: '',
      nik: '',
      phone: '',
      email: '',
      address: '',
      village: '',
      district: '',
      regency: '',
      province: '',
      credit_limit: 0,
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        code: customer.code,
        name: customer.name,
        nik: customer.nik || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        village: customer.village || '',
        district: customer.district || '',
        regency: customer.regency || '',
        province: customer.province || '',
        credit_limit: customer.credit_limit || 0,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        nik: '',
        phone: '',
        email: '',
        address: '',
        village: '',
        district: '',
        regency: '',
        province: '',
        credit_limit: 0,
      });
    }
  }, [customer, form, open]);

  const onSubmit = async (data: CustomerFormValues) => {
    setIsLoading(true);
    try {
      const customerData = {
        ...data,
        credit_limit: data.credit_limit || 0,
        is_active: true,
        outstanding_credit: customer?.outstanding_credit || 0,
        loyalty_points: customer?.loyalty_points || 0,
      };

      if (customer?.id) {
        await customerRepository.update(customer.id, customerData);
        toast({ title: 'Berhasil', description: 'Pelanggan berhasil diperbarui' });
      } else {
        await customerRepository.create(customerData);
        toast({ title: 'Berhasil', description: 'Pelanggan berhasil ditambahkan' });
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan pelanggan',
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
          <DialogTitle>{customer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Pelanggan</Label>
              <Input id="code" {...form.register('code')} placeholder="Ex: CUST-001" />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nik">NIK (Opsional)</Label>
              <Input id="nik" {...form.register('nik')} placeholder="Nomor Induk Kependudukan" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" {...form.register('name')} placeholder="Nama Pelanggan" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon / HP</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat Lengkap</Label>
            <Textarea id="address" {...form.register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="village">Desa / Kelurahan</Label>
              <Input id="village" {...form.register('village')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">Kecamatan</Label>
              <Input id="district" {...form.register('district')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regency">Kabupaten / Kota</Label>
              <Input id="regency" {...form.register('regency')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Provinsi</Label>
              <Input id="province" {...form.register('province')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_limit">Limit Kredit (Rp)</Label>
            <Input id="credit_limit" type="number" min="0" {...form.register('credit_limit')} />
            <p className="text-xs text-muted-foreground">
              Maksimal nominal hutang yang diperbolehkan untuk pelanggan ini.
            </p>
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
