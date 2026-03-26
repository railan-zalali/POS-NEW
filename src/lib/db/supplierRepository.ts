import { db } from './dexie';
import type { Supplier } from './schema';
import { coerceEntityId } from '@/lib/entityId';
import { queueDeleteInstruction } from '@/lib/supabase/deleteOutbox';

export const supplierRepository = {
  async getAll() {
    return await db.suppliers.toArray();
  },

  async getPaginated(offset: number = 0, limit: number = 50) {
    return await db.suppliers.orderBy('name').offset(offset).limit(limit).toArray();
  },

  async getTotalCount() {
    return await db.suppliers.count();
  },

  async getById(id: string | number) {
    return await db.suppliers.get(coerceEntityId(id));
  },

  async create(supplier: Omit<Supplier, 'id'>) {
    return await db.suppliers.add({
      ...supplier,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as Supplier);
  },

  async update(id: string | number, updates: Partial<Supplier>) {
    return await db.suppliers.update(coerceEntityId(id), {
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async delete(id: string | number) {
    const resolvedId = coerceEntityId(id);
    if (resolvedId == null) {
      return;
    }

    return await db.transaction('rw', [db.suppliers, db.app_settings], async () => {
      await queueDeleteInstruction('suppliers', resolvedId);
      return await db.suppliers.delete(resolvedId);
    });
  },
};
