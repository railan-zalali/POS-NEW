import { useEffect, useRef, useState } from 'react';
import { usePOSStore } from '../store/posStore';
import { useAuthStore } from '@/store/authStore';
import { transactionRepository } from '@/lib/db/transactionRepository';
import type { TransactionStatus, PaymentMethod, Customer } from '@/lib/db/schema';
import type { CartItem } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { addDays, format } from 'date-fns';

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
    payment_reference,
    due_date,
    global_discount,
    notes,
    getTotal,
    getSubtotal,
    getTaxAmount,
    getChange,
    resetTransaction,
    setPaidAmount,
    setPaymentReference,
    setDueDate,
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

  useEffect(() => {
    if (!open) return;

    if (payment_method === 'transfer') {
      setPaidAmount(total);
    }

    if (payment_method === 'credit') {
      setPaidAmount(0);
      if (!due_date) {
        setDueDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
      }
    }
  }, [due_date, open, payment_method, setDueDate, setPaidAmount, total]);

  const handleProcessPayment = async () => {
    if (paid_amount < total && payment_method === 'cash') {
      toast({
        title: 'Pembayaran Kurang',
        description: 'Jumlah pembayaran kurang dari total tagihan.',
        variant: 'destructive',
      });
      return;
    }

    if (payment_method === 'transfer' && !payment_reference.trim()) {
      toast({
        title: 'Referensi Wajib',
        description: 'Nomor referensi atau bukti transfer wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    if (payment_method === 'credit') {
      if (!customer?.id) {
        toast({
          title: 'Pelanggan Wajib',
          description: 'Pilih pelanggan terlebih dahulu untuk transaksi kredit.',
          variant: 'destructive',
        });
        return;
      }

      if (!due_date) {
        toast({
          title: 'Jatuh Tempo Wajib',
          description: 'Tanggal jatuh tempo wajib diisi untuk transaksi kredit.',
          variant: 'destructive',
        });
        return;
      }

      if (customer.outstanding_credit + total > customer.credit_limit) {
        toast({
          title: 'Limit Kredit Tidak Cukup',
          description: 'Transaksi melebihi limit kredit pelanggan.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsProcessing(true);
    try {
      const effectivePaidAmount =
        payment_method === 'transfer' ? total : payment_method === 'credit' ? 0 : paid_amount;
      const effectiveChange = payment_method === 'cash' ? change : 0;

      const transactionData = {
        invoice_number: `INV-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, '0')}`,
        customer_id: customer?.id,
        cashier_id: user?.id || 'unknown',
        transaction_date: new Date(),
        due_date: payment_method === 'credit' && due_date ? new Date(due_date) : undefined,
        subtotal: getSubtotal(),
        discount_amount: global_discount,
        tax_amount: getTaxAmount(),
        total_amount: total,
        paid_amount: effectivePaidAmount,
        change_amount: effectiveChange,
        payment_method: payment_method as PaymentMethod,
        payment_reference: payment_method === 'transfer' ? payment_reference.trim() : undefined,
        status: 'completed' as TransactionStatus,
        notes: notes,
      };

      const transactionItems = cart.map((item) => ({
        product_id: item.product_id,
        product_unit_id: item.unit_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: 0,
        discount_amount: item.discount_amount,
        subtotal: item.subtotal,
      }));

      await transactionRepository.create(transactionData, transactionItems);

      setLastTransaction({
        ...transactionData,
        customer: customer,
        cashier: { name: user?.full_name || 'Kasir' },
        items: cart,
        subtotal: getSubtotal(),
        discount_amount: global_discount,
        tax_amount: getTaxAmount(),
        total_amount: total,
        paid_amount: effectivePaidAmount,
        change_amount: effectiveChange,
      });

      setIsSuccess(true);
      toast({
        title: 'Transaksi Berhasil',
        description: 'Transaksi telah disimpan.',
      });
    } catch (error) {
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
                <span>
                  Rp{' '}
                  {(payment_method === 'transfer'
                    ? total
                    : payment_method === 'credit'
                      ? 0
                      : paid_amount
                  ).toLocaleString('id-ID')}
                </span>
              </div>
              {payment_method === 'transfer' && (
                <div className="space-y-2">
                  <Label htmlFor="payment-reference">Referensi Transfer</Label>
                  <Input
                    id="payment-reference"
                    value={payment_reference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Nomor referensi atau bukti transfer"
                  />
                </div>
              )}
              {payment_method === 'credit' && (
                <>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="font-medium">{customer?.name || 'Pelanggan belum dipilih'}</div>
                    <div className="mt-1 text-xs">
                      Piutang saat ini: Rp{' '}
                      {customer?.outstanding_credit.toLocaleString('id-ID') || 0}
                    </div>
                    <div className="text-xs">
                      Limit kredit: Rp {customer?.credit_limit.toLocaleString('id-ID') || 0}
                    </div>
                    <div className="text-xs">
                      Setelah transaksi: Rp{' '}
                      {customer
                        ? (customer.outstanding_credit + total).toLocaleString('id-ID')
                        : total.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit-due-date">Jatuh Tempo</Label>
                    <Input
                      id="credit-due-date"
                      type="date"
                      value={due_date || ''}
                      onChange={(e) => setDueDate(e.target.value || null)}
                    />
                  </div>
                </>
              )}
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
                <span
                  className={
                    payment_method === 'cash' && change < 0
                      ? 'text-destructive'
                      : 'text-green-600 font-bold'
                  }
                >
                  Rp {(payment_method === 'cash' ? change : 0).toLocaleString('id-ID')}
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
