import { db } from './dexie';
import type { BatchAllocation, SalesTransaction, SalesTransactionItem } from './schema';
import { stockEngine } from '../fifo-fefo/stockEngine';
import { coerceEntityId } from '@/lib/entityId';

type TransactionItemInput = Omit<
  SalesTransactionItem,
  'id' | 'transaction_id' | 'batch_ids' | 'batch_allocations' | 'cogs'
>;

type TransactionSnapshot = {
  transaction: SalesTransaction;
  items: SalesTransactionItem[];
  stockBefore: Record<string, number>;
  timestamp: number;
};

export const transactionRepository = {
  async getAll() {
    return await db.sales_transactions.toArray();
  },

  async getPaginated(offset: number = 0, limit: number = 50) {
    return await db.sales_transactions
      .orderBy('transaction_date')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  },

  async getTotalCount() {
    return await db.sales_transactions.count();
  },

  async getById(id: string) {
    return await db.sales_transactions.get(coerceEntityId(id));
  },

  async create(transaction: Omit<SalesTransaction, 'id'>, items: TransactionItemInput[]) {
    return await db.transaction(
      'rw',
      [
        db.sales_transactions,
        db.sales_transaction_items,
        db.product_stocks,
        db.product_units,
        db.stock_movements,
        db.customers,
      ],
      async () => {
        // Take snapshot of current state before transaction
        const stockSnapshot = new Map<string, number>();
        const affectedProductIds = [...new Set(items.map((i) => i.product_id))];

        for (const productId of affectedProductIds) {
          const productStocksTable = db.product_stocks as typeof db.product_stocks & {
            where?: (indexName: string) => {
              equals: (value: string) => { toArray: () => Promise<Array<{ quantity: number }>> };
            };
            toArray?: () => Promise<Array<{ product_id: string; quantity: number }>>;
          };

          const stocks = productStocksTable.where
            ? await productStocksTable.where('product_id').equals(productId).toArray()
            : productStocksTable.toArray
              ? (await productStocksTable.toArray()).filter(
                  (stock) => stock.product_id === productId,
                )
              : [];
          const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
          stockSnapshot.set(productId, totalStock);
        }

        if (transaction.payment_method === 'credit') {
          if (!transaction.customer_id) {
            throw new Error('Pelanggan wajib dipilih untuk transaksi kredit.');
          }

          const customer = await db.customers.get(transaction.customer_id);
          if (!customer) {
            throw new Error('Pelanggan kredit tidak ditemukan.');
          }

          if (customer.outstanding_credit + transaction.total_amount > customer.credit_limit) {
            throw new Error('Limit kredit pelanggan tidak mencukupi untuk transaksi ini.');
          }
        }

        const processedItems: (TransactionItemInput & {
          batch_ids: string[];
          batch_allocations: BatchAllocation[];
          cogs: number;
        })[] = [];
        const stockChanges: {
          batch_id: string;
          product_id: string;
          product_unit_id: string;
          batch_number?: string;
          expire_date?: Date;
          quantity_before: number;
          quantity_change: number;
          quantity_after: number;
        }[] = [];

        for (const item of items) {
          const allocation = await stockEngine.allocateStock(
            item.product_id,
            item.product_unit_id,
            item.quantity,
          );
          const itemCOGS = stockEngine.calculateCOGS(allocation);
          const batchAllocations = allocation.map((alloc) => ({
            batch_id: alloc.batchId,
            quantity: alloc.quantity,
            purchase_price: alloc.purchasePrice,
          }));
          const batchIds = batchAllocations.map((allocationItem) => allocationItem.batch_id);

          for (const alloc of allocation) {
            const stock = await db.product_stocks.get(alloc.batchId);
            if (stock) {
              stockChanges.push({
                batch_id: alloc.batchId,
                product_id: item.product_id,
                product_unit_id: item.product_unit_id,
                batch_number: stock.batch_number,
                quantity_before: stock.quantity,
                quantity_change: -alloc.quantity,
                quantity_after: stock.quantity - alloc.quantity,
                expire_date: stock.expire_date,
              });
            }
          }

          processedItems.push({
            ...item,
            batch_ids: batchIds,
            batch_allocations: batchAllocations,
            cogs: itemCOGS,
          });
        }

        const transactionId = await db.sales_transactions.add({
          ...transaction,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as SalesTransaction);

        // Store transaction snapshot for rollback
        if (db.transaction_snapshots?.add) {
          await db.transaction_snapshots.add({
            transaction_id: transactionId,
            snapshot: JSON.stringify({
              transaction: { ...transaction, id: transactionId },
              items: processedItems.map((i) => ({ ...i, transaction_id: transactionId })),
              stockBefore: Object.fromEntries(stockSnapshot.entries()),
              timestamp: Date.now(),
            } as TransactionSnapshot),
            timestamp: Date.now(),
            stockBefore: Object.fromEntries(stockSnapshot.entries()),
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'pending',
          });
        }

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

        for (const change of stockChanges) {
          await db.product_stocks.update(change.batch_id, {
            quantity: change.quantity_after,
            updated_at: new Date(),
            sync_status: 'pending',
          });

          await db.stock_movements.add({
            product_id: change.product_id,
            product_unit_id: change.product_unit_id,
            movement_type: 'sale',
            reference_id: transactionId,
            reference_type: 'transaction',
            batch_number: change.batch_number,
            quantity_before: change.quantity_before,
            quantity_change: change.quantity_change,
            quantity_after: change.quantity_after,
            expire_date: change.expire_date,
            created_by: transaction.cashier_id,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'pending',
          });
        }

        if (transaction.payment_method === 'credit' && transaction.customer_id) {
          const customer = await db.customers.get(transaction.customer_id);
          if (!customer) {
            throw new Error('Pelanggan kredit tidak ditemukan.');
          }

          await db.customers.update(transaction.customer_id, {
            outstanding_credit: customer.outstanding_credit + transaction.total_amount,
            updated_at: new Date(),
            sync_status: 'pending',
          });
        }

        return transactionId;
      },
    );
  },

  async updateStatus(id: string, status: SalesTransaction['status']) {
    return await db.sales_transactions.update(coerceEntityId(id), {
      status,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  // Rollback mechanism for voiding transactions
  async voidTransaction(transactionId: string, reason: string, userId: string) {
    const resolvedTransactionId = coerceEntityId(transactionId);
    if (resolvedTransactionId == null) {
      throw new Error('Transaksi tidak ditemukan.');
    }

    return await db.transaction(
      'rw',
      [
        db.sales_transactions,
        db.sales_transaction_items,
        db.product_stocks,
        db.stock_movements,
        db.customers,
        db.transaction_snapshots,
      ],
      async () => {
        // Check if transaction can be voided
        const transaction = await db.sales_transactions.get(resolvedTransactionId);
        if (!transaction) {
          throw new Error('Transaksi tidak ditemukan.');
        }

        if (transaction.status === 'cancelled') {
          throw new Error('Transaksi ini sudah dibatalkan sebelumnya.');
        }

        if (transaction.status !== 'completed' && transaction.status !== 'partial_paid') {
          throw new Error('Hanya transaksi completed atau partial_paid yang dapat dibatalkan.');
        }

        // Get transaction snapshot if available
        const snapshot = await db.transaction_snapshots
          .where('transaction_id')
          .equals(resolvedTransactionId)
          .first();

        const items = await db.sales_transaction_items
          .where('transaction_id')
          .equals(resolvedTransactionId)
          .toArray();

        // Restore stock for each item
        for (const item of items) {
          const allocations = await this.restoreBatchAllocations(item);

          for (const allocation of allocations) {
            const stock = await db.product_stocks.get(allocation.batch_id);
            if (!stock) {
              throw new Error(`Batch stok ${allocation.batch_id} tidak ditemukan.`);
            }

            const newQty = stock.quantity + allocation.quantity;
            await db.product_stocks.update(stock.id!, {
              quantity: newQty,
              updated_at: new Date(),
              sync_status: 'pending',
            });

            // Record stock movement for rollback
            await db.stock_movements.add({
              product_id: item.product_id,
              product_unit_id: item.product_unit_id,
              movement_type: 'return',
              reference_id: String(resolvedTransactionId),
              reference_type: 'transaction',
              batch_number: stock.batch_number,
              quantity_before: stock.quantity,
              quantity_change: allocation.quantity,
              quantity_after: newQty,
              expire_date: stock.expire_date,
              created_by: userId,
              created_at: new Date(),
              updated_at: new Date(),
              sync_status: 'pending',
            });
          }
        }

        // Update transaction status
        await db.sales_transactions.update(resolvedTransactionId, {
          status: 'cancelled',
          notes: `${transaction.notes || ''}\n\n[VOID] Pembatalan Transaksi: ${reason}\nDibatalkan oleh: ${userId}\nTanggal: ${new Date().toLocaleString('id-ID')}`,
          updated_at: new Date(),
          sync_status: 'pending',
        });

        // Restore customer credit if applicable
        if (transaction.customer_id && transaction.payment_method === 'credit') {
          const customer = await db.customers.get(transaction.customer_id);
          if (customer) {
            await db.customers.update(transaction.customer_id, {
              outstanding_credit: Math.max(
                0,
                customer.outstanding_credit - transaction.total_amount,
              ),
              updated_at: new Date(),
              sync_status: 'pending',
            });
          }
        }

        // Clean up snapshot
        if (snapshot) {
          await db.transaction_snapshots.delete(snapshot.id!);
        }

        return { success: true, message: 'Transaksi berhasil dibatalkan' };
      },
    );
  },

  // Helper method to restore batch allocations
  async restoreBatchAllocations(item: SalesTransactionItem) {
    if (item.batch_allocations?.length) {
      return item.batch_allocations;
    }

    if (!item.batch_ids?.length) {
      throw new Error('Data batch transaksi lama tidak lengkap untuk di-void.');
    }

    if (item.batch_ids.length > 1) {
      throw new Error(
        'Transaksi lama dengan multi-batch tidak bisa di-void otomatis. Gunakan penyesuaian stok manual.',
      );
    }

    const unit = await db.product_units.get(item.product_unit_id);
    if (!unit) {
      throw new Error('Satuan produk transaksi tidak ditemukan.');
    }

    return [
      {
        batch_id: item.batch_ids[0],
        quantity: item.quantity * unit.conversion_factor,
        purchase_price: item.cogs / Math.max(item.quantity * unit.conversion_factor, 1),
      },
    ];
  },

  // Get recent transactions that can be undone (within last 5 minutes)
  async getRecentUndoableTransactions() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const snapshots = await db.transaction_snapshots
      .where('timestamp')
      .above(fiveMinutesAgo)
      .toArray();

    return await Promise.all(
      snapshots.map(async (snapshot) => {
        const transaction = await db.sales_transactions.get(snapshot.transaction_id);
        return {
          snapshot: snapshot,
          transaction: transaction,
        };
      }),
    );
  },

  // Restore transaction from snapshot
  async restoreFromSnapshot(snapshotId: string) {
    const resolvedSnapshotId = coerceEntityId(snapshotId);

    return await db.transaction(
      'rw',
      [
        db.sales_transactions,
        db.sales_transaction_items,
        db.product_stocks,
        db.stock_movements,
        db.customers,
        db.transaction_snapshots,
      ],
      async () => {
        const snapshot = await db.transaction_snapshots.get(resolvedSnapshotId);
        if (!snapshot) {
          throw new Error('Snapshot tidak ditemukan.');
        }

        const snapshotData: TransactionSnapshot = JSON.parse(snapshot.snapshot as string);

        // Restore transaction status
        await db.sales_transactions.update(snapshotData.transaction.id!, {
          status: 'completed',
          notes: snapshotData.transaction.notes,
          updated_at: new Date(),
          sync_status: 'pending',
        });

        // Restore stock using captured batch allocations when available.
        if (snapshotData.items?.length) {
          for (const item of snapshotData.items) {
            const allocations = item.batch_allocations?.length
              ? item.batch_allocations
              : await this.restoreBatchAllocations(item);

            for (const allocation of allocations) {
              const stock = await db.product_stocks.get(allocation.batch_id);
              if (!stock) {
                throw new Error(`Batch stok ${allocation.batch_id} tidak ditemukan saat restore.`);
              }

              await db.product_stocks.update(stock.id!, {
                quantity: stock.quantity + allocation.quantity,
                updated_at: new Date(),
                sync_status: 'pending',
              });

              await db.stock_movements.add({
                product_id: item.product_id,
                product_unit_id: item.product_unit_id,
                movement_type: 'return',
                reference_id: String(snapshotData.transaction.id ?? resolvedSnapshotId),
                reference_type: 'transaction',
                batch_number: stock.batch_number,
                quantity_before: stock.quantity,
                quantity_change: allocation.quantity,
                quantity_after: stock.quantity + allocation.quantity,
                expire_date: stock.expire_date,
                created_by: snapshotData.transaction.cashier_id,
                created_at: new Date(),
                updated_at: new Date(),
                sync_status: 'pending',
              });
            }
          }
        } else {
          // Legacy fallback for older snapshots.
          const stockBeforeEntries = Object.entries(snapshotData.stockBefore ?? {});
          for (const [productId, quantity] of stockBeforeEntries) {
            const productStocks = await db.product_stocks
              .where('product_id')
              .equals(productId)
              .toArray();
            for (const stock of productStocks) {
              await db.product_stocks.update(stock.id!, {
                quantity: Number(quantity),
                updated_at: new Date(),
                sync_status: 'pending',
              });
            }
          }
        }

        // Delete snapshot after restore
        await db.transaction_snapshots.delete(resolvedSnapshotId);

        return { success: true, message: 'Transaksi berhasil dipulihkan' };
      },
    );
  },
};
