import { useState } from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { categoryRepository } from '@/lib/db/categoryRepository';
import { supplierRepository } from '@/lib/db/supplierRepository';
import { productRepository } from '@/lib/db/productRepository';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const batchProductSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1, 'Nama wajib'),
        code: z.string().min(1, 'Kode wajib'),
        category_id: z.string().min(1, 'Kategori wajib'),
        supplier_id: z.string().optional(), // Single supplier for simplicity in batch
        unit_name: z.string().min(1, 'Satuan wajib'),
        purchase_price: z.coerce.number().min(0),
        selling_price: z.coerce.number().min(0),
        initial_stock: z.coerce.number().min(0),
        min_stock: z.coerce.number().min(0),
      }),
    )
    .min(1, 'Minimal satu produk'),
});

type BatchProductFormValues = z.infer<typeof batchProductSchema>;

export default function ProductBatchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const categories = useLiveQuery(() => categoryRepository.getAll()) || [];
  const suppliers = useLiveQuery(() => supplierRepository.getAll()) || [];

  const form = useForm<BatchProductFormValues>({
    resolver: zodResolver(batchProductSchema) as unknown as Resolver<BatchProductFormValues>,
    defaultValues: {
      products: [
        {
          name: '',
          code: '',
          category_id: '',
          unit_name: 'Pcs',
          purchase_price: 0,
          selling_price: 0,
          initial_stock: 0,
          min_stock: 5,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  const onSubmit = async (data: BatchProductFormValues) => {
    setIsLoading(true);
    try {
      let successCount = 0;

      for (const item of data.products) {
        await productRepository.createWithUnits(
          {
            code: item.code,
            name: item.name,
            category_id: item.category_id,
            supplier_ids: item.supplier_id ? [item.supplier_id] : [],
            is_active: true,
            sync_status: 'pending',
          },
          [
            {
              unit_name: item.unit_name,
              conversion_factor: 1,
              is_base_unit: true,
              purchase_price: item.purchase_price,
              selling_price: item.selling_price,
            },
          ],
          item.initial_stock > 0
            ? [
                {
                  unitIndex: 0,
                  quantity: item.initial_stock,
                  purchasePrice: item.purchase_price,
                },
              ]
            : [],
        );
        successCount++;
      }

      toast({
        title: 'Batch Import Berhasil',
        description: `${successCount} produk berhasil ditambahkan.`,
      });

      navigate('/products');
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan data batch.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Input Produk Massal</h1>
          <p className="text-muted-foreground">Tambah banyak produk sekaligus dengan cepat</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/products')}>
            Batal
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan Semua
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Input Massal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Kode</TableHead>
                  <TableHead className="w-[200px]">Nama Produk</TableHead>
                  <TableHead className="w-[150px]">Kategori</TableHead>
                  <TableHead className="w-[150px]">Supplier</TableHead>
                  <TableHead className="w-[100px]">Satuan</TableHead>
                  <TableHead className="w-[120px]">Harga Beli</TableHead>
                  <TableHead className="w-[120px]">Harga Jual</TableHead>
                  <TableHead className="w-[100px]">Stok Awal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Input
                        {...form.register(`products.${index}.code`)}
                        placeholder="Kode"
                        className="h-8"
                      />
                      {form.formState.errors.products?.[index]?.code && (
                        <p className="text-xs text-destructive mt-1">
                          {form.formState.errors.products[index]?.code?.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        {...form.register(`products.${index}.name`)}
                        placeholder="Nama Produk"
                        className="h-8"
                      />
                      {form.formState.errors.products?.[index]?.name && (
                        <p className="text-xs text-destructive mt-1">
                          {form.formState.errors.products[index]?.name?.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) =>
                          form.setValue(`products.${index}.category_id`, value)
                        }
                        defaultValue={form.watch(`products.${index}.category_id`)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id || ''}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) =>
                          form.setValue(`products.${index}.supplier_id`, value)
                        }
                        defaultValue={form.watch(`products.${index}.supplier_id`)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id || ''}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input {...form.register(`products.${index}.unit_name`)} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        {...form.register(`products.${index}.purchase_price`)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        {...form.register(`products.${index}.selling_price`)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        {...form.register(`products.${index}.initial_stock`)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
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
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  name: '',
                  code: '',
                  category_id: '',
                  unit_name: 'Pcs',
                  purchase_price: 0,
                  selling_price: 0,
                  initial_stock: 0,
                  min_stock: 5,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Baris
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
