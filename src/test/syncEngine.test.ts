import { describe, expect, it, vi } from 'vitest';

const createStatusTable = (
  recordsByStatus: Record<string, Array<{ key?: string; sync_status?: string }>> = {},
) => ({
  where: vi.fn(() => ({
    equals: vi.fn((status: string) => ({
      toArray: vi.fn(async () => recordsByStatus[status] ?? []),
    })),
  })),
});

vi.mock('@/lib/db/dexie', () => {
  const tableNames = [
    'products',
    'product_units',
    'product_stocks',
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
    'expenses',
    'customer_payments',
    'purchase_returns',
    'purchase_return_items',
    'users',
    'roles',
    'app_settings',
  ] as const;

  const db = Object.fromEntries(
    tableNames.map((name) => [
      name,
      name === 'app_settings'
        ? createStatusTable({
            pending: [
              { key: 'store_info', sync_status: 'pending' },
              { key: 'delete::1', sync_status: 'pending' },
              { key: 'error_1', sync_status: 'pending' },
              { key: 'last_sync_products', sync_status: 'pending' },
            ],
          })
        : name === 'products'
          ? createStatusTable({
              conflict: [{ key: '1', sync_status: 'conflict' }],
            })
          : createStatusTable(),
    ]),
  );

  return { db };
});

describe('syncEngine', () => {
  it('counts only syncable pending app settings and delete outbox rows', async () => {
    const { getPendingSyncCount } = await import('@/lib/supabase/syncEngine');

    await expect(getPendingSyncCount()).resolves.toBe(2);
  });

  it('counts conflict rows separately', async () => {
    const { getConflictSyncCount } = await import('@/lib/supabase/syncEngine');

    await expect(getConflictSyncCount()).resolves.toBe(1);
  });
});
