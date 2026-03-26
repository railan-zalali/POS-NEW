import { db } from './dexie';
import type { Category } from './schema';
import { coerceEntityId } from '@/lib/entityId';
import { queueDeleteInstruction } from '@/lib/supabase/deleteOutbox';

export const categoryRepository = {
  async getAll() {
    return await db.categories.toArray();
  },

  async getById(id: string | number) {
    return await db.categories.get(coerceEntityId(id));
  },

  async create(category: Omit<Category, 'id'>) {
    return await db.categories.add({
      ...category,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as Category);
  },

  async update(id: string | number, updates: Partial<Category>) {
    return await db.categories.update(coerceEntityId(id), {
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
    // Check if category is used by products
    const productCount = await db.products.where('category_id').equals(String(resolvedId)).count();
    if (productCount > 0) {
      throw new Error('Kategori tidak dapat dihapus karena masih digunakan oleh produk.');
    }

    return await db.transaction('rw', [db.categories, db.app_settings], async () => {
      await queueDeleteInstruction('categories', resolvedId);
      return await db.categories.delete(resolvedId);
    });
  },

  async getRoots() {
    // Dexie filter instead of where().equals(null) because null indexing behavior varies
    return await db.categories.filter((c) => !c.parent_id).toArray();
  },
};
