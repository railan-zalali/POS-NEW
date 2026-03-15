import { format } from 'date-fns';
import type { CartItem } from '@/features/pos/store/posStore';

// Interface for props if needed
interface ReceiptProps {
  transaction: {
    invoice_number: string;
    transaction_date: Date;
    customer?: { name: string } | null;
    cashier: { name: string };
    items: CartItem[];
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    paid_amount: number;
    change_amount: number;
    payment_method: string;
  };
}

export const ReceiptTemplate = ({ transaction }: ReceiptProps) => {
  return (
    <div className="p-4 w-[58mm] font-mono text-[10px] leading-tight">
      <div className="text-center mb-2">
        <h1 className="font-bold text-sm">Toko Tani Makmur</h1>
        <p>Jl. Raya Pertanian No. 123</p>
        <p>Telp: 0812-3456-7890</p>
      </div>

      <div className="border-b border-dashed border-black mb-2 pb-1">
        <div className="flex justify-between">
          <span>{transaction.invoice_number}</span>
          <span>{format(new Date(transaction.transaction_date), 'dd/MM/yy HH:mm')}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir: {transaction.cashier.name}</span>
        </div>
        {transaction.customer && (
          <div className="flex justify-between">
            <span>Plg: {transaction.customer.name}</span>
          </div>
        )}
      </div>

      <div className="border-b border-dashed border-black mb-2 pb-1">
        {transaction.items.map((item, index) => (
          <div key={index} className="mb-1">
            <div>{item.product_name}</div>
            <div className="flex justify-between">
              <span>
                {item.quantity} x {item.unit_price.toLocaleString()}
              </span>
              <span>{item.subtotal.toLocaleString()}</span>
            </div>
            {item.discount_amount > 0 && (
              <div className="flex justify-between italic">
                <span>Disc</span>
                <span>-{item.discount_amount.toLocaleString()}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-black mb-2 pb-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{transaction.subtotal.toLocaleString()}</span>
        </div>
        {transaction.discount_amount > 0 && (
          <div className="flex justify-between">
            <span>Diskon Total</span>
            <span>-{transaction.discount_amount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xs my-1">
          <span>TOTAL</span>
          <span>{transaction.total_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar ({transaction.payment_method})</span>
          <span>{transaction.paid_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Kembali</span>
          <span>{transaction.change_amount.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mt-4">
        <p>Terima Kasih</p>
        <p>Selamat Belanja Kembali</p>
      </div>
    </div>
  );
};
