import { db } from './dexie';
import type { ProductStock } from './schema';

export const stockRepository = {
  async getByProduct(productId: string) {
    return await db.product_stocks.where('product_id').equals(productId).toArray();
  },

  async addStock(stock: Omit<ProductStock, 'id'>) {
    return await db.product_stocks.add({
      ...stock,
      created_at: new Date(),
      updated_at: new Date(),
    } as ProductStock);
  },

  async updateQuantity(id: string, quantity: number) {
    return await db.product_stocks.update(id, {
      quantity,
      updated_at: new Date(),
    });
  },
};
