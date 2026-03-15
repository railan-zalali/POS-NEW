import { db } from '../db/dexie';
import type { ProductStock } from '../db/schema';

export interface StockAllocation {
  batchId: string;
  quantity: number;
  purchasePrice: number;
}

export const stockEngine = {
  /**
   * Get available batches sorted by FEFO (First Expired First Out) or FIFO (First In First Out).
   *
   * Logic:
   * 1. If batch has expire_date, use FEFO (sort by expire_date ASC).
   * 2. If no expire_date, use FIFO (sort by received_date ASC).
   * 3. Filter out batches with 0 quantity.
   */
  async getAvailableBatches(productId: string, unitId: string): Promise<ProductStock[]> {
    const stocks = await db.product_stocks
      .where('[product_id+unit_id]')
      .equals([productId, unitId])
      .toArray();

    return stocks
      .filter((stock) => stock.quantity > 0)
      .sort((a, b) => {
        // 1. Priority: Expiration Date (FEFO)
        if (a.expire_date && b.expire_date) {
          return a.expire_date.getTime() - b.expire_date.getTime();
        }
        // If one has expire date and other doesn't, the one with expire date comes first?
        // Usually items with expiration are prioritized over non-expiring ones if mixed (rare case).
        if (a.expire_date && !b.expire_date) return -1;
        if (!a.expire_date && b.expire_date) return 1;

        // 2. Priority: Received Date (FIFO)
        return a.received_date.getTime() - b.received_date.getTime();
      });
  },

  /**
   * Calculate which batches to consume for a requested quantity.
   * Does NOT modify the database, just returns the plan.
   */
  async allocateStock(
    productId: string,
    unitId: string,
    qtyRequired: number,
  ): Promise<StockAllocation[]> {
    const batches = await this.getAvailableBatches(productId, unitId);
    const allocation: StockAllocation[] = [];
    let qtyRemaining = qtyRequired;

    for (const batch of batches) {
      if (qtyRemaining <= 0) break;

      const takeQty = Math.min(qtyRemaining, batch.quantity);

      allocation.push({
        batchId: batch.id!,
        quantity: takeQty,
        purchasePrice: batch.purchase_price,
      });

      qtyRemaining -= takeQty;
    }

    if (qtyRemaining > 0) {
      throw new Error(`Stok tidak mencukupi. Kurang ${qtyRemaining} item.`);
    }

    return allocation;
  },

  /**
   * Calculate Cost of Goods Sold (COGS) based on allocation.
   * Returns weighted average cost per unit if needed, or total cost.
   */
  calculateCOGS(allocation: StockAllocation[]): number {
    return allocation.reduce((total, item) => total + item.quantity * item.purchasePrice, 0);
  },

  /**
   * Get total available stock for a product unit.
   */
  async getTotalStock(productId: string, unitId: string): Promise<number> {
    const batches = await db.product_stocks
      .where('[product_id+unit_id]')
      .equals([productId, unitId])
      .toArray();

    return batches.reduce((sum, batch) => sum + batch.quantity, 0);
  },
};
