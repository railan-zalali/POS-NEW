import { db } from './dexie';
import type { Customer } from './schema';

export const customerRepository = {
  async getAll() {
    return await db.customers.toArray();
  },

  async getById(id: string) {
    return await db.customers.get(id);
  },

  async create(customer: Omit<Customer, 'id'>) {
    return await db.customers.add({
      ...customer,
      created_at: new Date(),
      updated_at: new Date(),
    } as Customer);
  },

  async update(id: string, updates: Partial<Customer>) {
    return await db.customers.update(id, {
      ...updates,
      updated_at: new Date(),
    });
  },

  async delete(id: string) {
    return await db.customers.delete(id);
  },

  async getByPhone(phone: string) {
    return await db.customers.where('phone').equals(phone).first();
  },
};
