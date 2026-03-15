import { db } from './dexie';
import type { Product, ProductUnit, ProductStock } from './schema';

export const productRepository = {
  async getAll() {
    return await db.products.toArray();
  },

  async getById(id: string) {
    return await db.products.get(id);
  },

  async create(product: Omit<Product, 'id'>) {
    return await db.products.add({
      ...product,
      created_at: new Date(),
      updated_at: new Date(),
    } as Product);
  },

  async createWithUnits(
    productData: Omit<Product, 'id'>,
    unitsData: Omit<ProductUnit, 'id' | 'product_id'>[],
    initialStockData?: { unitIndex: number; quantity: number; purchasePrice: number }[],
  ) {
    return await db.transaction(
      'rw',
      db.products,
      db.product_units,
      db.product_stocks,
      async () => {
        // Removed db.stock_movements from transaction args as it's not defined yet
        // 1. Create Product
        const productId = await db.products.add({
          ...productData,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as Product);

        // 2. Create Units
        const unitIds: string[] = [];
        for (const unit of unitsData) {
          const unitId = await db.product_units.add({
            ...unit,
            product_id: productId,
            created_at: new Date(),
            updated_at: new Date(),
          } as ProductUnit);
          unitIds.push(unitId);
        }

        // 3. Create Initial Stock (if any)
        if (initialStockData && initialStockData.length > 0) {
          for (const stock of initialStockData) {
            if (stock.quantity > 0) {
              const unitId = unitIds[stock.unitIndex];

              // Add to product_stocks
              await db.product_stocks.add({
                product_id: productId,
                unit_id: unitId,
                quantity: stock.quantity,
                purchase_price: stock.purchasePrice,
                received_date: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
              } as ProductStock);
            }
          }
        }

        return productId;
      },
    );
  },

  async update(id: string, updates: Partial<Product>) {
    return await db.products.update(id, {
      ...updates,
      updated_at: new Date(),
    });
  },

  async delete(id: string) {
    return await db.transaction(
      'rw',
      db.products,
      db.product_units,
      db.product_stocks,
      async () => {
        await db.product_units.where('product_id').equals(id).delete();
        await db.product_stocks.where('product_id').equals(id).delete();
        await db.products.delete(id);
      },
    );
  },

  async getByCategory(categoryId: string) {
    return await db.products.where('category_id').equals(categoryId).toArray();
  },

  async getUnitsByProductId(productId: string) {
    return await db.product_units.where('product_id').equals(productId).toArray();
  },
};
