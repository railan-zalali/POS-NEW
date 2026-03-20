import { useState, useRef } from 'react';
import { usePOSStore } from '../store/posStore';
import { useAuthStore } from '@/store/authStore';
import { transactionRepository } from '@/lib/db/transactionRepository';
import type { TransactionStatus, PaymentMethod, Customer } from '@/lib/db/schema';
import type { CartItem } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from 'react-to-print';
import { ReceiptTemplate } from './ReceiptTemplate';
import { Loader2, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDialog({ open, onOpenChange }: PaymentDialogProps) {
  const {
    cart,
    customer,
    payment_method,
    paid_amount,
    global_discount,
    notes,
    getTotal,
    getSubtotal,
    getTaxAmount,
    getChange,
    resetTransaction,
  } = usePOSStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  interface TransactionWithDetails {
    invoice_number: string;
    customer_id?: string;
    cashier_id: string;
    transaction_date: Date;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    change_amount: number;
    payment_method: PaymentMethod;
    status: TransactionStatus;
    notes?: string;
    customer?: Customer | null;
    cashier: { name: string };
    items: CartItem[];
  }

  const [lastTransaction, setLastTransaction] = useState<TransactionWithDetails | null>(null);

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef, // Changed from content to contentRef for newer versions
  });

  const total = getTotal();
  const change = getChange();

  const handleProcessPayment = async () => {
    if (paid_amount < total && payment_method === 'cash') {
      toast({
        title: 'Pembayaran Kurang',
        description: 'Jumlah pembayaran kurang dari total tagihan.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Prepare Transaction Data
      const transactionData = {
        invoice_number: `INV-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, '0')}`,
        customer_id: customer?.id,
        cashier_id: user?.id || 'unknown',
        transaction_date: new Date(),
        subtotal: getSubtotal(),
        discount_amount: global_discount,
        tax_amount: getTaxAmount(),
        total_amount: total,
        paid_amount: paid_amount,
        change_amount: change,
        payment_method: payment_method as PaymentMethod,
        status: 'completed' as TransactionStatus,
        notes: notes,
      };

      // 2. Prepare Items Data
      const transactionItems = cart.map((item) => ({
        product_id: item.product_id,
        product_unit_id: item.unit_id,
        batch_ids: [], // FIFO/FEFO logic to be added later
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: 0,
        discount_amount: item.discount_amount,
        subtotal: item.subtotal,
        cogs: 0, // COGS calculation to be added
      }));

      // 3. Save to DB
      await transactionRepository.create(transactionData, transactionItems);

      // 5. Success State
      setLastTransaction({
        ...transactionData,
        customer: customer,
        cashier: { name: user?.full_name || 'Kasir' },
        items: cart,
        subtotal: getSubtotal(),
        discount_amount: global_discount,
        tax_amount: getTaxAmount(),
        total_amount: total,
        paid_amount: paid_amount,
        change_amount: change,
      });

      setIsSuccess(true);
      toast({
        title: 'Transaksi Berhasil',
        description: 'Transaksi telah disimpan.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal',
        description:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses transaksi.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isSuccess) {
      resetTransaction();
      setIsSuccess(false);
      setLastTransaction(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_) => !isProcessing && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        {!isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
              <DialogDescription>Pastikan data transaksi sudah benar.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Tagihan</span>
                <span className="font-bold">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pembayaran ({payment_method})</span>
                <span>Rp {paid_amount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-destructive">
                  -Rp {global_discount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak</span>
                <span>Rp {getTaxAmount().toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Kembalian</span>
                <span className={change < 0 ? 'text-destructive' : 'text-green-600 font-bold'}>
                  Rp {change.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Batal
              </Button>
              <Button onClick={handleProcessPayment} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Proses Bayar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-center">Pembayaran Berhasil!</DialogTitle>
              <DialogDescription className="text-center">
                Transaksi telah berhasil disimpan.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center py-4">
              <div className="hidden">
                <div ref={componentRef}>
                  {lastTransaction && <ReceiptTemplate transaction={lastTransaction} />}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handlePrint && handlePrint()}
              >
                <Printer className="mr-2 h-4 w-4" />
                Cetak Struk
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Selesai / Transaksi Baru
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
