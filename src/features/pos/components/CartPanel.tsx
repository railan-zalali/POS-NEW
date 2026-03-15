import { ShoppingCart, RotateCcw, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOSStore } from '../store/posStore';
import { CustomerSelector } from './CustomerSelector';
import { DraftTransactionPanel } from './DraftTransactionPanel';
import { CustomerHistoryPanel } from './CustomerHistoryPanel';
import { CartItemRow } from './CartItemRow';
import type { User } from '@/lib/db/schema';

interface CartPanelProps {
  user: User | null;
  onPaymentOpen: () => void;
}

export function CartPanel({ user, onPaymentOpen }: CartPanelProps) {
  const { cart, getTotal, getChange, paid_amount, setPaidAmount, resetTransaction } = usePOSStore();

  const total = getTotal();
  const change = getChange();

  return (
    <div className="flex w-full flex-col rounded-lg border bg-background shadow-sm md:w-[400px]">
      {/* Customer & Info */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </span>
          <span className="text-sm font-medium">{user?.username}</span>
        </div>
        <CustomerSelector />
        <DraftTransactionPanel />
      </div>

      {/* Customer History Accordion */}
      <CustomerHistoryPanel />

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <ShoppingCart className="mb-2 h-12 w-12 opacity-20" />
            <p>Keranjang kosong</p>
          </div>
        ) : (
          <div className="space-y-1">
            {cart.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Totals & Payment */}
      <div className="border-t bg-muted/10 p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rp {total.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">Rp {total.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm font-bold">Rp</span>
            <Input
              id="amount-input"
              type="number"
              className="pl-10 text-right font-bold text-lg"
              placeholder="0"
              value={paid_amount || ''}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setPaidAmount(total)}
            >
              Uang Pas
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setPaidAmount(50000)}
            >
              50k
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setPaidAmount(100000)}
            >
              100k
            </Button>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Kembalian</span>
            <span className={change < 0 ? 'text-destructive' : 'text-green-600'}>
              Rp {change.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={resetTransaction}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset (F4)
          </Button>
          <Button onClick={onPaymentOpen}>
            <CreditCard className="mr-2 h-4 w-4" />
            Bayar (F5)
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-dashed">
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">F1</span>
            <span>Cari</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">F2</span>
            <span>Amt</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">F4</span>
            <span>Rest</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">F5</span>
            <span>Bayar</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">F6</span>
            <span>PLG</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">F7</span>
            <span>List</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">F8</span>
            <span>Draft</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/50 text-[10px]">
            <span className="font-bold">ESC</span>
            <span>Tutup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
