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
   *
   * NOTE: We pull all batches for the PRODUCT regardless of unit,
   * because we track quantity in BASE UNITS internally in the stock engine.
   */
  async getAvailableBatches(productId: string): Promise<ProductStock[]> {
    const stocks = await db.product_stocks.where('product_id').equals(productId).toArray();

    return stocks
      .filter((stock) => stock.quantity > 0)
      .sort((a, b) => {
        // 1. Priority: Expiration Date (FEFO)
        if (a.expire_date && b.expire_date) {
          const timeA = new Date(a.expire_date).getTime();
          const timeB = new Date(b.expire_date).getTime();
          return timeA - timeB;
        }
        if (a.expire_date && !b.expire_date) return -1;
        if (!a.expire_date && b.expire_date) return 1;

        // 2. Priority: Received Date (FIFO)
        const timeA = new Date(a.received_date).getTime();
        const timeB = new Date(b.received_date).getTime();
        return timeA - timeB;
      });
  },

  /**
   * Helper to get conversion factor and base unit info
   */
  async getUnitInfo(unitId: string) {
    const unit = await db.product_units.get(unitId);
    if (!unit) throw new Error(`Unit ${unitId} not found`);
    return unit;
  },

  /**
   * Calculate which batches to consume for a requested quantity.
   * Does NOT modify the database, just returns the plan.
   */
  async allocateStock(
    productId: string,
    unitId: string,
    qtyOrdered: number,
  ): Promise<StockAllocation[]> {
    const unit = await this.getUnitInfo(unitId);
    const qtyInBaseUnit = qtyOrdered * unit.conversion_factor;

    const batches = await this.getAvailableBatches(productId);
    const allocation: StockAllocation[] = [];
    let qtyRemaining = qtyInBaseUnit;

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
      const neededInOriginalUnit = qtyRemaining / unit.conversion_factor;
      throw new Error(`Stok tidak mencukupi. Kurang ${neededInOriginalUnit} ${unit.unit_name}.`);
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
   * Get total available stock for a product in base units.
   */
  async getTotalStock(productId: string): Promise<number> {
    const batches = await db.product_stocks.where('product_id').equals(productId).toArray();
    return batches.reduce((sum, batch) => sum + batch.quantity, 0);
  },

  /**
   * Get total available stock in a specific unit.
   */
  async getTotalStockFormatted(productId: string, unitId: string): Promise<number> {
    const unit = await this.getUnitInfo(unitId);
    const totalBase = await this.getTotalStock(productId);
    return totalBase / unit.conversion_factor;
  },
};
