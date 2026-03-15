import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { productRepository } from '@/lib/db/productRepository';
import { supplierRepository } from '@/lib/db/supplierRepository';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

const poItemSchema = z.object({
  product_id: z.string().min(1, 'Pilih produk'),
  product_unit_id: z.string().min(1, 'Pilih satuan'),
  quantity_ordered: z.number().min(1, 'Minimal 1'),
  unit_price: z.number().min(0, 'Minimal 0'),
  subtotal: z.number(),
});

const poSchema = z.object({
  supplier_id: z.string().min(1, 'Pilih supplier'),
  order_date: z.string(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Minimal 1 item'),
});

type POFormValues = z.infer<typeof poSchema>;

interface POFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function POFormDialog({ open, onOpenChange }: POFormDialogProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const products = useLiveQuery(() => productRepository.getAll()) || [];
  const suppliers = useLiveQuery(() => supplierRepository.getAll()) || [];
  const liveUnits = useLiveQuery(() => db.product_units.toArray());
  const allUnits = useMemo(() => liveUnits || [], [liveUnits]);

  const form = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplier_id: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      items: [
        { product_id: '', product_unit_id: '', quantity_ordered: 1, unit_price: 0, subtotal: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items.')) {
        const parts = name.split('.');
        const index = parseInt(parts[1]);
        const field = parts[2];

        if (field === 'product_id') {
          const productId = value.items?.[index]?.product_id;
          if (productId) {
            const productUnits = allUnits.filter((u) => u.product_id === productId);
            const baseUnit = productUnits.find((u) => u.is_base_unit) || productUnits[0];
            if (baseUnit) {
              const currentQty = form.getValues(`items.${index}.quantity_ordered`) || 1;
              form.setValue(`items.${index}.product_unit_id`, baseUnit.id!);
              form.setValue(`items.${index}.unit_price`, baseUnit.purchase_price);
              form.setValue(`items.${index}.subtotal`, baseUnit.purchase_price * currentQty);
            }
          }
        } else if (field === 'quantity_ordered' || field === 'unit_price') {
          const qty = form.getValues(`items.${index}.quantity_ordered`) || 0;
          const price = form.getValues(`items.${index}.unit_price`) || 0;
          form.setValue(`items.${index}.subtotal`, qty * price);
        } else if (field === 'product_unit_id') {
          const unitId = value.items?.[index]?.product_unit_id;
          const unit = allUnits.find((u) => u.id === unitId);
          if (unit) {
            const currentQty = form.getValues(`items.${index}.quantity_ordered`) || 1;
            form.setValue(`items.${index}.unit_price`, unit.purchase_price);
            form.setValue(`items.${index}.subtotal`, unit.purchase_price * currentQty);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, allUnits]);

  const onSubmit = async (values: POFormValues) => {
    setIsSubmitting(true);
    try {
      const totalAmount = values.items.reduce((sum, item) => sum + item.subtotal, 0);
      const po_number = `PO-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;

      await purchaseOrderRepository.create(
        {
          po_number,
          supplier_id: values.supplier_id,
          ordered_by: user?.id || 'unknown',
          order_date: new Date(values.order_date),
          status: 'draft',
          total_amount: totalAmount,
          notes: values.notes,
        },
        values.items,
      );

      toast({ title: 'Berhasil', description: 'Purchase Order berhasil dibuat.' });
      onOpenChange(false);
      form.reset();
    } catch (_error) {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat membuat PO.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Purchase Order Baru</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id!}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="order_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Order</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Item Pesanan</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      product_id: '',
                      product_unit_id: '',
                      quantity_ordered: 1,
                      unit_price: 0,
                      subtotal: 0,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden text-[13px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground font-medium">
                    <tr>
                      <th className="p-3 text-left w-[35%]">Produk</th>
                      <th className="p-3 text-left w-[20%]">Satuan</th>
                      <th className="p-3 text-left w-[15%]">Jumlah</th>
                      <th className="p-3 text-left w-[15%]">Harga Satuan</th>
                      <th className="p-3 text-left w-[15%]">Subtotal</th>
                      <th className="p-3 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fields.map((field, index) => (
                      <tr key={field.id}>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.product_id`}
                            render={({ field: subField }) => (
                              <Select
                                onValueChange={subField.onChange}
                                defaultValue={subField.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="border-0 shadow-none focus:ring-0">
                                    <SelectValue placeholder="Pilih Produk" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id!}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.product_unit_id`}
                            render={({ field: subField }) => (
                              <Select onValueChange={subField.onChange} value={subField.value}>
                                <FormControl>
                                  <SelectTrigger
                                    className="border-0 shadow-none focus:ring-0"
                                    disabled={!form.watch(`items.${index}.product_id`)}
                                  >
                                    <SelectValue placeholder="Satuan" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {allUnits
                                    .filter(
                                      (u) =>
                                        u.product_id === form.watch(`items.${index}.product_id`),
                                    )
                                    .map((u) => (
                                      <SelectItem key={u.id} value={u.id!}>
                                        {u.unit_name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity_ordered`}
                            render={({ field: subField }) => (
                              <Input
                                type="number"
                                className="border-0 shadow-none focus:ring-0"
                                {...subField}
                                onChange={(e) => subField.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unit_price`}
                            render={({ field: subField }) => (
                              <Input
                                type="number"
                                className="border-0 shadow-none focus:ring-0"
                                {...subField}
                                onChange={(e) => subField.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </td>
                        <td className="p-2 font-medium">
                          Rp {form.watch(`items.${index}.subtotal`)?.toLocaleString() || 0}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan (Opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Tambahkan catatan jika perlu" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end text-xl font-bold gap-4 border-t pt-4">
              <span className="text-muted-foreground font-medium text-base">Total:</span>
              <span>
                Rp{' '}
                {watchItems.reduce((sum, item) => sum + (item.subtotal || 0), 0).toLocaleString()}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan PO
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
