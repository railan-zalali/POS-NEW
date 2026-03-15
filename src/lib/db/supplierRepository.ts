import { db } from './dexie';
import type { Supplier } from './schema';

export const supplierRepository = {
  async getAll() {
    return await db.suppliers.toArray();
  },

  async getById(id: string) {
    return await db.suppliers.get(id);
  },

  async create(supplier: Omit<Supplier, 'id'>) {
    return await db.suppliers.add({
      ...supplier,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as Supplier);
  },

  async update(id: string, updates: Partial<Supplier>) {
    return await db.suppliers.update(id, {
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async delete(id: string) {
    return await db.suppliers.delete(id);
  },
};
