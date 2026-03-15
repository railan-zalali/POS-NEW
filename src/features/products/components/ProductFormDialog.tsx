import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/common/ImageUpload/ImageUpload';
import { productRepository } from '@/lib/db/productRepository';
import { categoryRepository } from '@/lib/db/categoryRepository';
import type { Product } from '@/lib/db/schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const productSchema = z.object({
  code: z.string().min(1, 'Kode produk wajib diisi'),
  name: z.string().min(1, 'Nama produk wajib diisi'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Kategori wajib dipilih'),
  supplier_ids: z.array(z.string()).default([]),
  image: z.any().optional(), // Handle Blob or string
  is_active: z.boolean().default(true),
  units: z
    .array(
      z.object({
        unit_name: z.string().min(1, 'Nama satuan wajib diisi'),
        conversion_factor: z.coerce.number().min(1, 'Faktor konversi minimal 1'),
        is_base_unit: z.boolean().default(false),
        purchase_price: z.coerce.number().min(0),
        selling_price: z.coerce.number().min(0),
        barcode: z.string().optional(),
        initial_stock: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1, 'Minimal satu satuan produk wajib diisi'),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  product?: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: ProductFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const categories = useLiveQuery(() => categoryRepository.getAll()) || [];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      description: '',
      category_id: '',
      supplier_ids: [],
      is_active: true,
      units: [
        {
          unit_name: 'Pcs',
          conversion_factor: 1,
          is_base_unit: true,
          purchase_price: 0,
          selling_price: 0,
          barcode: '',
          initial_stock: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'units',
  });

  useEffect(() => {
    if (product) {
      form.reset({
        code: product.code,
        name: product.name,
        description: product.description || '',
        category_id: product.category_id,
        supplier_ids: product.supplier_ids || [],
        is_active: product.is_active,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        category_id: '',
        supplier_ids: [],
        is_active: true,
        units: [
          {
            unit_name: 'Pcs',
            conversion_factor: 1,
            is_base_unit: true,
            purchase_price: 0,
            selling_price: 0,
            barcode: '',
            initial_stock: 0,
          },
        ],
      });
    }
  }, [product, form, open]);

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const hasBaseUnit = data.units.some((u) => u.is_base_unit);
      if (!hasBaseUnit) {
        toast({
          title: 'Validasi Gagal',
          description: 'Harus ada satu satuan dasar (Konversi = 1)',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (product?.id) {
        await productRepository.update(product.id, {
          code: data.code,
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          supplier_ids: data.supplier_ids,
          is_active: data.is_active,
        });
        toast({ title: 'Berhasil', description: 'Produk berhasil diperbarui' });
      } else {
        const initialStocks = data.units
          .map((u, index) => ({
            unitIndex: index,
            quantity: u.initial_stock || 0,
            purchasePrice: u.purchase_price,
          }))
          .filter((s) => s.quantity > 0);

        await productRepository.createWithUnits(
          {
            code: data.code,
            name: data.name,
            description: data.description,
            category_id: data.category_id,
            supplier_ids: data.supplier_ids,
            is_active: data.is_active,
            image_url: undefined,
            sync_status: 'pending',
          },
          data.units.map((u) => ({
            unit_name: u.unit_name,
            conversion_factor: u.conversion_factor,
            is_base_unit: u.is_base_unit,
            purchase_price: u.purchase_price,
            selling_price: u.selling_price,
            barcode: u.barcode,
          })),
          initialStocks,
        );
        toast({ title: 'Berhasil', description: 'Produk berhasil ditambahkan' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan produk',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Foto Produk</Label>
                <ImageUpload
                  value={form.watch('image')}
                  onChange={(file) => form.setValue('image', file)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Produk</Label>
                <Input id="code" {...form.register('code')} placeholder="Auto-generated if empty" />
                {form.formState.errors.code && (
                  <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Produk</Label>
                <Input id="name" {...form.register('name')} placeholder="Ex: Pupuk Urea 50kg" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Kategori</Label>
                <Select
                  onValueChange={(value) => form.setValue('category_id', value)}
                  defaultValue={form.watch('category_id')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id || ''}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category_id && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.category_id.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" {...form.register('description')} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Satuan & Harga</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    unit_name: '',
                    conversion_factor: 1,
                    is_base_unit: false,
                    purchase_price: 0,
                    selling_price: 0,
                    barcode: '',
                    initial_stock: 0,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Tambah Satuan
              </Button>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Satuan</TableHead>
                    <TableHead className="w-[80px]">Faktor</TableHead>
                    <TableHead className="w-[50px]">Dasar</TableHead>
                    <TableHead className="w-[100px]">Harga Beli</TableHead>
                    <TableHead className="w-[100px]">Harga Jual</TableHead>
                    <TableHead className="w-[100px]">Stok Awal</TableHead>
                    <TableHead className="w-[100px]">Barcode</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input
                          {...form.register(`units.${index}.unit_name`)}
                          placeholder="Pcs"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          {...form.register(`units.${index}.conversion_factor`)}
                          className="h-8"
                          disabled={form.watch(`units.${index}.is_base_unit`)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={form.watch(`units.${index}.is_base_unit`)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                fields.forEach((_, i) => {
                                  if (i !== index) form.setValue(`units.${i}.is_base_unit`, false);
                                });
                                form.setValue(`units.${index}.is_base_unit`, true);
                                form.setValue(`units.${index}.conversion_factor`, 1);
                              }
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          {...form.register(`units.${index}.purchase_price`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          {...form.register(`units.${index}.selling_price`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          {...form.register(`units.${index}.initial_stock`)}
                          className="h-8"
                          disabled={!!product}
                        />
                      </TableCell>
                      <TableCell>
                        <Input {...form.register(`units.${index}.barcode`)} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {form.formState.errors.units && (
              <p className="text-sm text-destructive">{form.formState.errors.units.message}</p>
            )}
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
