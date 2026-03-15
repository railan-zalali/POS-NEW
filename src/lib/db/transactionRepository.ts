import { db } from './dexie';
import type { SalesTransaction, SalesTransactionItem } from './schema';
import { stockEngine } from '../fifo-fefo/stockEngine';

export const transactionRepository = {
  async getAll() {
    return await db.sales_transactions.toArray();
  },

  async getById(id: string) {
    return await db.sales_transactions.get(id);
  },

  async create(
    transaction: Omit<SalesTransaction, 'id'>,
    items: Omit<SalesTransactionItem, 'id' | 'transaction_id' | 'batch_ids' | 'cogs'>[],
  ) {
    return await db.transaction(
      'rw',
      db.sales_transactions,
      db.sales_transaction_items,
      db.product_stocks,
      db.stock_movements,
      async () => {
        // 1. Process Items (FIFO Allocation & Stock Deduction)
        const processedItems: Omit<SalesTransactionItem, 'id' | 'transaction_id'>[] = [];

        for (const item of items) {
          // Calculate allocation
          const allocation = await stockEngine.allocateStock(
            item.product_id,
            item.product_unit_id,
            item.quantity,
          );
          const itemCOGS = stockEngine.calculateCOGS(allocation);
          const batchIds = allocation.map((a) => a.batchId);

          // Deduct Stock
          for (const alloc of allocation) {
            const stock = await db.product_stocks.get(alloc.batchId);
            if (stock) {
              await db.product_stocks.update(alloc.batchId, {
                quantity: stock.quantity - alloc.quantity,
              });

              // Record Movement (Sale)
              await db.stock_movements.add({
                product_id: item.product_id,
                product_unit_id: item.product_unit_id,
                movement_type: 'sale',
                reference_id: '', // Will update later with transaction ID or use placeholder
                reference_type: 'transaction',
                batch_number: stock.batch_number,
                quantity_before: stock.quantity,
                quantity_change: -alloc.quantity,
                quantity_after: stock.quantity - alloc.quantity,
                expire_date: stock.expire_date,
                created_by: transaction.cashier_id,
                created_at: new Date(),
              });
            }
          }

          processedItems.push({
            ...item,
            batch_ids: batchIds,
            cogs: itemCOGS,
          });
        }

        // 2. Save Transaction
        const transactionId = await db.sales_transactions.add({
          ...transaction,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as SalesTransaction);

        // 3. Save Transaction Items
        const finalItems = processedItems.map(
          (item) =>
            ({
              ...item,
              transaction_id: transactionId,
              created_at: new Date(),
              updated_at: new Date(),
              sync_status: 'pending',
            }) as SalesTransactionItem,
        );

        await db.sales_transaction_items.bulkAdd(finalItems);

        return transactionId;
      },
    );
  },

  async updateStatus(id: string, status: SalesTransaction['status']) {
    return await db.sales_transactions.update(id, {
      status,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },
};
