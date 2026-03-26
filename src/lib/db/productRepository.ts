import { db } from './dexie';
import type { Product, ProductUnit, ProductStock } from './schema';
import { coerceEntityId } from '@/lib/entityId';
import { queueDeleteInstruction } from '@/lib/supabase/deleteOutbox';

export const productRepository = {
  async getAll() {
    return await db.products.toArray();
  },

  async getPaginated(
    offset: number = 0,
    limit: number = 50,
    filters?: {
      search?: string;
      categoryId?: string;
      isActive?: boolean | null;
    },
  ) {
    const allProducts = await db.products.orderBy('name').toArray();
    const searchLower = filters?.search?.toLowerCase();

    return allProducts
      .filter((product) =>
        searchLower
          ? product.name.toLowerCase().includes(searchLower) ||
            product.code.toLowerCase().includes(searchLower)
          : true,
      )
      .filter((product) =>
        filters?.categoryId ? product.category_id === filters.categoryId : true,
      )
      .filter((product) =>
        filters?.isActive !== undefined && filters?.isActive !== null
          ? product.is_active === filters.isActive
          : true,
      )
      .slice(offset, offset + limit);
  },

  async getTotalCount(filters?: {
    search?: string;
    categoryId?: string;
    isActive?: boolean | null;
  }) {
    const allProducts = await db.products.toArray();
    const searchLower = filters?.search?.toLowerCase();

    return allProducts
      .filter((product) =>
        searchLower
          ? product.name.toLowerCase().includes(searchLower) ||
            product.code.toLowerCase().includes(searchLower)
          : true,
      )
      .filter((product) =>
        filters?.categoryId ? product.category_id === filters.categoryId : true,
      )
      .filter((product) =>
        filters?.isActive !== undefined && filters?.isActive !== null
          ? product.is_active === filters.isActive
          : true,
      ).length;
  },

  async getById(id: string | number) {
    return await db.products.get(coerceEntityId(id));
  },

  async create(product: Omit<Product, 'id'>) {
    return await db.products.add({
      ...product,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as Product);
  },

  async createWithUnits(
    productData: Omit<Product, 'id'>,
    unitsData: Omit<ProductUnit, 'id' | 'product_id'>[],
    initialStockData?: {
      unitIndex: number;
      quantity: number;
      purchasePrice: number;
      batch_number?: string;
      expire_date?: Date;
    }[],
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
            sync_status: 'pending',
          } as ProductUnit);
          unitIds.push(unitId);
        }

        // 3. Create Initial Stock (if any)
        if (initialStockData && initialStockData.length > 0) {
          for (const stock of initialStockData) {
            if (stock.quantity > 0) {
              const unitId = unitIds[stock.unitIndex];
              const unit = unitsData[stock.unitIndex];

              // Add to product_stocks (Normalize to base unit)
              await db.product_stocks.add({
                product_id: productId,
                unit_id: unitId,
                batch_number: stock.batch_number,
                expire_date: stock.expire_date,
                quantity: stock.quantity * unit.conversion_factor,
                purchase_price: stock.purchasePrice / unit.conversion_factor,
                received_date: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
                sync_status: 'pending',
              } as ProductStock);
            }
          }
        }

        return productId;
      },
    );
  },

  async update(id: string | number, updates: Partial<Product>) {
    return await db.products.update(coerceEntityId(id), {
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async delete(id: string | number) {
    return await db.transaction(
      'rw',
      [db.products, db.product_units, db.product_stocks, db.app_settings],
      async () => {
        const resolvedId = coerceEntityId(id);
        if (resolvedId == null) {
          return;
        }

        const relatedUnits = await db.product_units
          .where('product_id')
          .equals(String(resolvedId))
          .toArray();
        const relatedStocks = await db.product_stocks
          .where('product_id')
          .equals(String(resolvedId))
          .toArray();

        for (const unit of relatedUnits) {
          if (unit.id != null) {
            await queueDeleteInstruction('product_units', unit.id);
          }
        }

        for (const stock of relatedStocks) {
          if (stock.id != null) {
            await queueDeleteInstruction('product_stocks', stock.id);
          }
        }

        await queueDeleteInstruction('products', resolvedId);

        if (relatedUnits.length > 0) {
          await db.product_units.bulkDelete(
            relatedUnits
              .map((unit) => unit.id)
              .filter((unitId): unitId is string => unitId != null),
          );
        }

        if (relatedStocks.length > 0) {
          await db.product_stocks.bulkDelete(
            relatedStocks
              .map((stock) => stock.id)
              .filter((stockId): stockId is string => stockId != null),
          );
        }

        await db.products.delete(resolvedId);
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
