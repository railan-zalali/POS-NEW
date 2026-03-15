import { db } from '../db/dexie';
import { supabase } from './client';
import type { BaseEntity, SyncStatus } from '../db/schema';
import { Table } from 'dexie';

type TableRecord = Record<string, Table<BaseEntity>>;

type SyncableTable = keyof typeof db & string;

const SYNC_TABLES: SyncableTable[] = [
  'products',
  'product_units',
  'categories',
  'suppliers',
  'customers',
  'sales_transactions',
  'sales_transaction_items',
  'purchase_orders',
  'purchase_order_items',
  'goods_receipts',
  'goods_receipt_items',
  'stock_movements',
];

export const syncEngine = {
  /**
   * Sync a specific table bi-directionally
   */
  async syncTable(tableName: SyncableTable) {
    // Skip if using placeholder URL
    if (
      import.meta.env.VITE_SUPABASE_URL?.includes('your-project') ||
      !import.meta.env.VITE_SUPABASE_URL
    ) {
      return;
    }

    try {
      // Get the last synced item from the local database to determine the pull start point
      const lastSyncedItem = (await (db as unknown as TableRecord)[tableName]
        .orderBy('updated_at')
        .reverse()
        .filter((item: BaseEntity) => item.sync_status === 'synced')
        .first()) as BaseEntity | undefined;

      // 1. PUSH: Local -> Remote (pending changes)
      const pendingChanges = await (db as unknown as TableRecord)[tableName]
        .where('sync_status')
        .equals('pending')
        .toArray();

      if (pendingChanges.length > 0) {
        // Upload to Supabase
        const { error: pushError } = await supabase.from(tableName).upsert(
          pendingChanges.map((item: BaseEntity) => ({
            ...item,
            sync_status: 'synced',
            synced_at: new Date().toISOString(),
          })),
        );

        if (!pushError) {
          // Mark as synced locally
          await (db as unknown as TableRecord)[tableName].bulkUpdate(
            pendingChanges.map((item: BaseEntity) => ({
              key: item.id!,
              changes: { sync_status: 'synced', synced_at: new Date() },
            })),
          );
        } else {
          console.error(`Error pushing ${tableName}:`, pushError);
        }
      }

      // 2. PULL: Remote -> Local (recent updates)
      // Pull changes from Supabase that are newer than our last synced item
      const { data: remoteChanges, error: pullError } = await supabase
        .from(tableName)
        .select('*')
        .gt('updated_at', lastSyncedItem?.updated_at?.toISOString() || new Date(0).toISOString()); // Use epoch if no last synced item

      if (pullError) throw pullError;

      if (remoteChanges && remoteChanges.length > 0) {
        // Upsert remote data into local DB
        // Note: We use bulkPut to overwrite local data with remote data (Last Write Wins)
        await (db as unknown as TableRecord)[tableName].bulkPut(
          remoteChanges.map((item: BaseEntity) => ({
            ...item,
            // Convert ISO strings back to Date objects if needed by schema
            updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
            created_at: item.created_at ? new Date(item.created_at) : undefined,
            synced_at: new Date(),
            sync_status: 'synced' as SyncStatus,
          })),
        );

        // Update last sync checkpoint
        const latestRemoteUpdate = remoteChanges.reduce((prev, current) =>
          new Date(prev.updated_at as string) > new Date(current.updated_at as string)
            ? prev
            : current,
        ).updated_at;

        await db.app_settings.put({
          key: `last_sync_${tableName}`,
          value: latestRemoteUpdate,
        });
      }
    } catch (err) {
      console.error(`Unexpected sync error on table ${tableName}:`, err);
    }
  },

  async syncAll() {
    for (const table of SYNC_TABLES) {
      await this.syncTable(table);
    }
  },

  startAutoSync(intervalMs = 60000) {
    // Initial sync
    this.syncAll();

    // Polling interval
    return setInterval(() => {
      this.syncAll();
    }, intervalMs);
  },
};
