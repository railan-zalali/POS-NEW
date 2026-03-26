import { db } from './dexie';
import type { Customer } from './schema';
import { coerceEntityId } from '@/lib/entityId';
import { queueDeleteInstruction } from '@/lib/supabase/deleteOutbox';

export const customerRepository = {
  async getAll() {
    return await db.customers.toArray();
  },

  async getPaginated(offset: number = 0, limit: number = 50) {
    return await db.customers.orderBy('name').offset(offset).limit(limit).toArray();
  },

  async getTotalCount() {
    return await db.customers.count();
  },

  async getById(id: string | number) {
    return await db.customers.get(coerceEntityId(id));
  },

  async create(customer: Omit<Customer, 'id'>) {
    return await db.customers.add({
      ...customer,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as Customer);
  },

  async update(id: string | number, updates: Partial<Customer>) {
    return await db.customers.update(coerceEntityId(id), {
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

    return await db.transaction('rw', [db.customers, db.app_settings], async () => {
      await queueDeleteInstruction('customers', resolvedId);
      return await db.customers.delete(resolvedId);
    });
  },

  async getByPhone(phone: string) {
    return await db.customers.where('phone').equals(phone).first();
  },
};
