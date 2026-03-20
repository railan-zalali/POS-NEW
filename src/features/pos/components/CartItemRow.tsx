import { useState } from 'react';
import { usePOSStore } from '../store/posStore';
import { type CartItem } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem, updateItemDiscount } = usePOSStore();
  const [discountValue, setDiscountValue] = useState(item.discount_amount.toString());

  const handleQtyChange = (delta: number) => {
    updateQuantity(item.id, item.quantity + delta);
  };

  const handleDiscountApply = () => {
    const val = parseInt(discountValue) || 0;
    updateItemDiscount(item.id, val);
  };

  return (
    <div className="flex flex-col border-b py-3 last:border-0">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" title={item.product_name}>
            {item.product_name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
              {item.unit_name}
            </span>
            <span className="text-xs text-muted-foreground">
              @ Rp {item.unit_price.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium text-sm">Rp {item.subtotal.toLocaleString('id-ID')}</p>
          {item.discount_amount > 0 && (
            <p className="text-xs text-destructive">
              -Rp {item.discount_amount.toLocaleString('id-ID')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1 bg-muted/30 rounded-md p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleQtyChange(-1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            className="h-6 w-12 text-center p-0 border-0 bg-transparent text-xs focus-visible:ring-0"
            value={item.quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) updateQuantity(item.id, val);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleQtyChange(1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
              >
                <Tag className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3">
              <div className="space-y-2">
                <Label className="text-xs">Potongan Harga (Rp)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8" onClick={handleDiscountApply}>
                    Set
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
