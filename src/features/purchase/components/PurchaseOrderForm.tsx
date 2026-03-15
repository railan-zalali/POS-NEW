import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '@/lib/db/productRepository';
import { supplierRepository } from '@/lib/db/supplierRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { Product, ProductUnit } from '@/lib/db/schema';

interface POItem {
  product_id: string;
  product_name: string;
  supplier_id: string;
  unit_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface POItemRowProps {
  item: POItem;
  index: number;
  onUpdate: (index: number, updates: Partial<POItem>) => void;
  onRemove: (index: number) => void;
}

function POItemRow({ item, index, onUpdate, onRemove }: POItemRowProps) {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const suppliers = useLiveQuery(() => supplierRepository.getAll()) || [];

  useEffect(() => {
    // Fetch units for this product
    productRepository.getUnitsByProductId(item.product_id).then(setUnits);
  }, [item.product_id]);

  // If no unit selected, select base unit
  useEffect(() => {
    if (!item.unit_id && units.length > 0) {
      const base = units.find((u) => u.is_base_unit) || units[0];
      onUpdate(index, {
        unit_id: base.id!,
        unit_price: base.purchase_price,
        subtotal: base.purchase_price * item.quantity,
      });
    }
  }, [units, item.unit_id, item.quantity, index, onUpdate]);

  return (
    <div className="grid grid-cols-12 gap-2 items-center border-b py-2 text-sm">
      <div className="col-span-3 font-medium">{item.product_name}</div>
      <div className="col-span-2">
        <Select
          value={item.supplier_id}
          onValueChange={(val) => onUpdate(index, { supplier_id: val })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Pilih Supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id!}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Select
          value={item.unit_id}
          onValueChange={(val) => {
            const unit = units.find((u) => u.id === val);
            onUpdate(index, {
              unit_id: val,
              unit_price: unit?.purchase_price || 0,
              subtotal: (unit?.purchase_price || 0) * item.quantity,
            });
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Satuan" />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id!}>
                {u.unit_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-1">
        <Input
          type="number"
          className="h-8"
          value={item.quantity}
          onChange={(e) =>
            onUpdate(index, {
              quantity: Number(e.target.value),
              subtotal: item.unit_price * Number(e.target.value),
            })
          }
        />
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          className="h-8"
          value={item.unit_price}
          onChange={(e) =>
            onUpdate(index, {
              unit_price: Number(e.target.value),
              subtotal: Number(e.target.value) * item.quantity,
            })
          }
        />
      </div>
      <div className="col-span-1 flex items-center justify-between">
        <span>{item.subtotal.toLocaleString()}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface PurchaseOrderFormProps {
  selectedProducts: Product[];
  onSubmit: (items: POItem[]) => void;
}

export function PurchaseOrderForm({ selectedProducts, onSubmit }: PurchaseOrderFormProps) {
  const [items, setItems] = useState<POItem[]>([]);

  // Sync items with selected products
  useEffect(() => {
    // Add new items
    const newItems = selectedProducts
      .filter((p) => !items.find((i) => i.product_id === p.id))
      .map((p) => ({
        product_id: p.id!,
        product_name: p.name,
        supplier_id: p.supplier_ids?.[0] || '', // Default to first supplier
        unit_id: '',
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
      }));

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }

    // Remove unchecked items
    // (Optional: depending on UX preference, maybe we want to keep them until manually removed)
    // For now let's keep them manually managed in the list to avoid accidental data loss
  }, [selectedProducts]);

  const handleUpdate = (index: number, updates: Partial<POItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="grid grid-cols-12 gap-2 text-sm font-bold border-b pb-2 mb-2 text-muted-foreground">
          <div className="col-span-3">Produk</div>
          <div className="col-span-2">Supplier</div>
          <div className="col-span-2">Satuan</div>
          <div className="col-span-1">Qty</div>
          <div className="col-span-2">Harga Beli</div>
          <div className="col-span-1 text-right pr-8">Subtotal</div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Pilih produk dari panel kiri untuk membuat PO.
          </div>
        ) : (
          items.map((item, idx) => (
            <POItemRow
              key={item.product_id}
              index={idx}
              item={item}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t bg-muted/10">
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium">Total Estimasi</span>
          <span className="text-xl font-bold text-primary">
            Rp {items.reduce((sum, i) => sum + i.subtotal, 0).toLocaleString()}
          </span>
        </div>
        <Button className="w-full" onClick={() => onSubmit(items)} disabled={items.length === 0}>
          Buat Purchase Order
        </Button>
      </div>
    </div>
  );
}
