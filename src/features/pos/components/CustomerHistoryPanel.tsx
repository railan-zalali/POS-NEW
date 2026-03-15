import { useEffect, useState } from 'react';
import { db } from '@/lib/db/dexie';
import { usePOSStore } from '../store/posStore';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { History, Plus } from 'lucide-react';
import type { SalesTransaction, SalesTransactionItem } from '@/lib/db/schema';

export function CustomerHistoryPanel() {
  const { customer, addItem } = usePOSStore();
  const [transactions, setTransactions] = useState<
    (SalesTransaction & {
      items: (SalesTransactionItem & { productName: string; unitName: string })[];
    })[]
  >([]);

  // This effect fetches history when customer changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (!customer?.id) {
        setTransactions([]);
        return;
      }

      // Fetch last 10 transactions
      const txs = await db.sales_transactions
        .where('customer_id')
        .equals(customer.id!)
        .reverse()
        .limit(10)
        .toArray();

      // Fetch items for each tx
      const detailedTxs = await Promise.all(
        txs.map(async (tx) => {
          const items = await db.sales_transaction_items
            .where('transaction_id')
            .equals(tx.id!)
            .toArray();

          // Enrich items with names
          const enrichedItems = await Promise.all(
            items.map(async (item) => {
              const product = await db.products.get(item.product_id);
              const unit = await db.product_units.get(item.product_unit_id);
              return {
                ...item,
                productName: product?.name || 'Unknown Product',
                unitName: unit?.unit_name || 'Unknown Unit',
              };
            }),
          );

          return { ...tx, items: enrichedItems };
        }),
      );

      setTransactions(detailedTxs);
    };

    fetchHistory();
  }, [customer]);

  const handleReorder = async (item: SalesTransactionItem) => {
    const product = await db.products.get(item.product_id);
    const unit = await db.product_units.get(item.product_unit_id);

    if (product && unit) {
      addItem(product, unit, 1);
    }
  };

  if (!customer) return null;

  return (
    <div className="border-t">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="history" className="border-0">
          <AccordionTrigger className="px-4 py-2 hover:bg-muted/50 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="h-4 w-4" />
              Histori Pembelian
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {transactions.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                Belum ada riwayat transaksi.
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-lg border bg-card text-card-foreground shadow-sm"
                  >
                    <div className="p-3 border-b bg-muted/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">
                          {format(tx.transaction_date, 'dd MMM yyyy', { locale: id })}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          Rp {tx.total_amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {tx.invoice_number}
                      </div>
                    </div>
                    <div className="p-2 space-y-2">
                      {tx.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <div className="flex-1">
                            <span className="font-medium">{item.productName}</span>
                            <div className="text-muted-foreground">
                              {item.quantity} {item.unitName}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleReorder(item)}
                            title="Beli lagi"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
