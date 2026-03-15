import { db } from './dexie';
import type { Category } from './schema';

export const categoryRepository = {
  async getAll() {
    return await db.categories.toArray();
  },

  async getById(id: string) {
    return await db.categories.get(id);
  },

  async create(category: Omit<Category, 'id'>) {
    return await db.categories.add({
      ...category,
      created_at: new Date(),
      updated_at: new Date(),
    } as Category);
  },

  async update(id: string, updates: Partial<Category>) {
    return await db.categories.update(id, {
      ...updates,
      updated_at: new Date(),
    });
  },

  async delete(id: string) {
    // Check if category is used by products
    const productCount = await db.products.where('category_id').equals(id).count();
    if (productCount > 0) {
      throw new Error('Kategori tidak dapat dihapus karena masih digunakan oleh produk.');
    }
    return await db.categories.delete(id);
  },

  async getRoots() {
    // Dexie filter instead of where().equals(null) because null indexing behavior varies
    return await db.categories.filter((c) => !c.parent_id).toArray();
  },
};
