import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, CheckCircle2, PackageCheck } from 'lucide-react';
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
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { goodsReceiptRepository } from '@/lib/db/goodsReceiptRepository';
import { productRepository } from '@/lib/db/productRepository';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db/dexie';
import type { PurchaseOrderItem, Product, ProductUnit } from '@/lib/db/schema';
import { sameEntityId, toEntityIdString } from '@/lib/entityId';

const grItemSchema = z.object({
  po_item_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  unit_name: z.string(),
  qty_ordered: z.number(),
  qty_received_previously: z.number(),
  quantity_received: z.number().min(0),
  batch_number: z.string().optional(),
  expire_date: z.string().optional(),
  condition: z.enum(['good', 'damaged', 'rejected']),
});

const grSchema = z.object({
  po_id: z.string().min(1, 'Pilih Purchase Order'),
  notes: z.string().optional(),
  items: z.array(grItemSchema),
});

type GRFormValues = z.infer<typeof grSchema>;

interface GRFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GRFormDialog({ open, onOpenChange }: GRFormDialogProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string>('');

  const activePOs =
    useLiveQuery(() =>
      purchaseOrderRepository
        .getAll()
        .then((pos) => pos.filter((p) => p.status === 'sent' || p.status === 'partial_received')),
    ) || [];

  const form = useForm<GRFormValues>({
    resolver: zodResolver(grSchema),
    defaultValues: {
      po_id: '',
      notes: '',
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Load items when PO is selected
  useEffect(() => {
    if (selectedPoId) {
      const loadPoItems = async () => {
        const items: PurchaseOrderItem[] =
          await purchaseOrderRepository.getItemsByPoId(selectedPoId);
        const products: Product[] = await productRepository.getAll();
        const units: ProductUnit[] = await db.product_units.toArray();

        const grItems = items.map((item) => {
          const product = products.find((p) => sameEntityId(p.id, item.product_id));
          const unit = units.find((u) => sameEntityId(u.id, item.product_unit_id));
          return {
            po_item_id: toEntityIdString(item.id),
            product_id: toEntityIdString(item.product_id),
            product_name: product?.name || 'Unknown',
            unit_name: unit?.unit_name || 'Unknown',
            qty_ordered: item.quantity_ordered,
            qty_received_previously: item.quantity_received || 0,
            quantity_received: item.quantity_ordered - (item.quantity_received || 0),
            batch_number: '',
            expire_date: '',
            condition: 'good' as const,
          };
        });
        replace(grItems);
      };
      loadPoItems();
    } else {
      replace([]);
    }
  }, [selectedPoId, replace]);

  const onSubmit = async (values: GRFormValues) => {
    if (values.items.every((i) => i.quantity_received === 0)) {
      toast({
        title: 'Peringatan',
        description: 'Masukkan setidaknya satu item yang diterima.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const gr_number = `GR-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;

      const grItems = values.items
        .filter((item) => item.quantity_received > 0)
        .map((item) => ({
          po_item_id: item.po_item_id,
          product_id: item.product_id,
          quantity_received: item.quantity_received,
          batch_number: item.batch_number || null,
          expire_date: item.expire_date ? new Date(item.expire_date) : null,
          condition: item.condition,
          notes: '',
        }));

      await goodsReceiptRepository.create(
        {
          gr_number,
          po_id: values.po_id,
          received_by: user?.full_name || 'unknown',
          received_date: new Date(),
          status: grItems.length === values.items.length ? 'complete' : 'partial',
          notes: values.notes,
        },
        grItems,
      );

      toast({
        title: 'Berhasil',
        description: 'Penerimaan barang berhasil dicatat dan stok telah diperbarui.',
      });
      onOpenChange(false);
      form.reset();
      setSelectedPoId('');
    } catch (error) {
      toast({
        title: 'Gagal',
        description: error instanceof Error ? error.message : 'Gagal mencatat penerimaan barang.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terima Barang (Goods Receipt)</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="po_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilih Purchase Order</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSelectedPoId(val);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="-- Pilih PO yang belum lengkap --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activePOs.map((po) => (
                          <SelectItem key={toEntityIdString(po.id)} value={toEntityIdString(po.id)}>
                            {po.po_number} ({format(new Date(po.order_date), 'dd/MM/yy')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedPoId && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Item dalam PO
                </h3>

                <div className="border rounded-lg overflow-hidden text-[12px]">
                  <table className="w-full">
                    <thead className="bg-muted text-muted-foreground font-medium border-b">
                      <tr>
                        <th className="p-2 text-left w-[20%]">Produk</th>
                        <th className="p-2 text-center">Pesan</th>
                        <th className="p-2 text-center">Sisa</th>
                        <th className="p-2 text-left w-[12%]">Diterima</th>
                        <th className="p-2 text-left">No. Batch</th>
                        <th className="p-2 text-left">Expired</th>
                        <th className="p-2 text-left w-[12%]">Kondisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-background">
                      {fields.map((field, index) => (
                        <tr
                          key={field.id}
                          className={
                            form.watch(`items.${index}.quantity_received`) > 0 ? 'bg-primary/5' : ''
                          }
                        >
                          <td className="p-2">
                            <div className="font-medium">{field.product_name}</div>
                            <div className="text-xs text-muted-foreground">{field.unit_name}</div>
                          </td>
                          <td className="p-2 text-center">{field.qty_ordered}</td>
                          <td className="p-2 text-center font-bold text-orange-600">
                            {field.qty_ordered - field.qty_received_previously}
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity_received`}
                              render={({ field: subField }) => (
                                <Input
                                  type="number"
                                  className="h-8 shadow-none text-center"
                                  {...subField}
                                  onChange={(e) =>
                                    subField.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.batch_number`}
                              render={({ field: subField }) => (
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Batch #"
                                  {...subField}
                                />
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.expire_date`}
                              render={({ field: subField }) => (
                                <Input type="date" className="h-8 text-xs px-1" {...subField} />
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.condition`}
                              render={({ field: subField }) => (
                                <Select onValueChange={subField.onChange} value={subField.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-[11px] px-2 shadow-none">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="good">Bagus</SelectItem>
                                    <SelectItem value="damaged">Rusak</SelectItem>
                                    <SelectItem value="rejected">Ditolak</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Penerimaan</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Contoh: Barang diterima kurir JNE, kondisi box sedikit penyok"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedPoId}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Konfirmasi Penerimaan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
