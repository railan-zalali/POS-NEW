import { db } from '../db/dexie';
import { supabase } from './client';

// This is a simplified sync engine.
// Ideally we would use dexie-cloud-addon or a more robust queue system.

export const syncEngine = {
  async syncProducts() {
    // 1. Upload local changes (where sync_status = 'pending')
    const pendingProducts = await db.products.where('sync_status').equals('pending').toArray();

    if (pendingProducts.length > 0) {
      const { error } = await supabase.from('products').upsert(
        pendingProducts.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          // ... map other fields to Supabase schema
          updated_at: new Date().toISOString(),
        })),
      );

      if (!error) {
        // Mark as synced locally
        await db.products.bulkUpdate(
          pendingProducts.map((p) => ({
            key: p.id!,
            changes: { sync_status: 'synced', synced_at: new Date() },
          })),
        );
      }
    }

    // 2. Download remote changes
    // Simplified: fetch all and upsert local
    // Ideally use 'last_synced_at' to fetch only changes
  },

  async syncTransactions() {
    // Similar logic for transactions
    // Transactions are usually append-only from POS to Cloud
  },

  async startAutoSync(intervalMs = 60000) {
    // Basic polling
    setInterval(() => {
      this.syncProducts();
      this.syncTransactions();
    }, intervalMs);
  },
};
