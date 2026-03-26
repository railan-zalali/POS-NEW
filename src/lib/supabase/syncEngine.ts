import { Table } from 'dexie';
import { db } from '../db/dexie';
import { isSupabaseConfigured, supabase } from './client';
import { retryWithBackoff, type RetryOptions } from '../retry';
import type { AppSetting, BaseEntity, SyncStatus } from '../db/schema';
import { getDeleteInstructionValue, isDeleteInstructionSetting } from './deleteOutbox';

export type SyncableTable = keyof typeof db & string;

type SyncRecord = BaseEntity & Record<string, unknown>;

type TableRecord = Record<string, Table<SyncRecord, unknown>>;

const SYNC_TABLES: SyncableTable[] = [
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
];

const DATE_FIELDS = new Set([
  'created_at',
  'updated_at',
  'synced_at',
  'transaction_date',
  'due_date',
  'order_date',
  'received_date',
  'payment_date',
  'return_date',
  'date',
  'expire_date',
  'last_login',
]);

const CHECKPOINT_PREFIX = 'last_sync_';
const ERROR_LOG_PREFIX = 'error_';
const DELETE_PRIORITY_TABLES: Partial<Record<SyncableTable, number>> = {
  product_units: 0,
  product_stocks: 0,
  purchase_order_items: 0,
  products: 1,
  purchase_orders: 1,
};

const getTable = (tableName: SyncableTable) => (db as unknown as TableRecord)[tableName];

const getPrimaryKey = (table: Table<SyncRecord, unknown>, record: SyncRecord) => {
  const keyPath = table.schema.primKey.keyPath;
  if (typeof keyPath === 'string') {
    return record[keyPath];
  }
  return record.id;
};

const getPrimaryKeyField = (table: Table<SyncRecord, unknown>) => {
  const keyPath = table.schema.primKey.keyPath;
  return typeof keyPath === 'string' ? keyPath : 'id';
};

const getRecordIdentifier = (table: Table<SyncRecord, unknown>, record: SyncRecord) => {
  const keyField = getPrimaryKeyField(table);
  return record[keyField];
};

const serializeRecord = (record: SyncRecord) => {
  const nextRecord: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value instanceof Date) {
      nextRecord[key] = value.toISOString();
      continue;
    }

    if (Array.isArray(value)) {
      nextRecord[key] = value.map((item) => {
        if (item instanceof Date) return item.toISOString();
        if (item && typeof item === 'object') {
          return serializeRecord(item as SyncRecord);
        }
        return item;
      });
      continue;
    }

    if (value && typeof value === 'object' && !(value instanceof Blob)) {
      nextRecord[key] = serializeRecord(value as SyncRecord);
      continue;
    }

    nextRecord[key] = value;
  }

  return nextRecord;
};

const normalizeRecord = (record: Record<string, unknown>) => {
  const nextRecord: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && DATE_FIELDS.has(key) && value) {
      nextRecord[key] = new Date(value);
      continue;
    }

    if (Array.isArray(value)) {
      nextRecord[key] = value.map((item) =>
        item && typeof item === 'object' ? normalizeRecord(item as Record<string, unknown>) : item,
      );
      continue;
    }

    if (value && typeof value === 'object' && !(value instanceof Blob)) {
      nextRecord[key] = normalizeRecord(value as Record<string, unknown>);
      continue;
    }

    nextRecord[key] = value;
  }

  return nextRecord;
};

const isCheckpointSetting = (record: SyncRecord) =>
  typeof record.key === 'string' && record.key.startsWith(CHECKPOINT_PREFIX);

const isErrorLogSetting = (record: SyncRecord) =>
  typeof record.key === 'string' && record.key.startsWith(ERROR_LOG_PREFIX);

const isSyncableAppSettingRecord = (record: SyncRecord) =>
  !isCheckpointSetting(record) && !isErrorLogSetting(record);

const getCheckpointKey = (tableName: SyncableTable) => `${CHECKPOINT_PREFIX}${tableName}`;

const getLastSyncCheckpoint = async (tableName: SyncableTable) => {
  const checkpoint = (await db.app_settings.get(getCheckpointKey(tableName))) as
    | AppSetting
    | undefined;
  return checkpoint?.value ? new Date(String(checkpoint.value)) : new Date(0);
};

const setLastSyncCheckpoint = async (tableName: SyncableTable, value: string) => {
  await db.app_settings.put({
    key: getCheckpointKey(tableName),
    value,
    description: `Checkpoint sinkronisasi untuk ${tableName}`,
    updated_at: new Date(),
  } as AppSetting);
};

const getSyncablePendingChanges = async (tableName: SyncableTable): Promise<SyncRecord[]> => {
  const table = getTable(tableName);
  const pendingChanges = await table.where('sync_status').equals('pending').toArray();

  if (tableName !== 'app_settings') {
    return pendingChanges;
  }

  return pendingChanges.filter(isSyncableAppSettingRecord);
};

const getSyncableConflictChanges = async (tableName: SyncableTable): Promise<SyncRecord[]> => {
  const table = getTable(tableName);
  const conflictChanges = await table.where('sync_status').equals('conflict').toArray();

  if (tableName !== 'app_settings') {
    return conflictChanges;
  }

  return conflictChanges.filter(isSyncableAppSettingRecord);
};

export const getPendingSyncCount = async () => {
  let count = 0;

  for (const tableName of SYNC_TABLES) {
    const pendingChanges = await getSyncablePendingChanges(tableName);
    count += pendingChanges.length;
  }

  return count;
};

export const getConflictSyncCount = async () => {
  let count = 0;

  for (const tableName of SYNC_TABLES) {
    const conflictChanges = await getSyncableConflictChanges(tableName);
    count += conflictChanges.length;
  }

  return count;
};

export type ConflictResolutionStrategy = 'accept_remote' | 'keep_local';

export const getConflictRecords = async (tableName: SyncableTable) => {
  return await getSyncableConflictChanges(tableName);
};

const getRemoteRowsByIdentifiers = async (
  tableName: SyncableTable,
  identifiers: Array<string | number>,
) => {
  if (identifiers.length === 0) {
    return [] as Record<string, unknown>[];
  }

  const table = getTable(tableName);
  const keyField = getPrimaryKeyField(table);
  const normalizedIdentifiers = identifiers.map((identifier) => String(identifier));

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .in(keyField, normalizedIdentifiers);

  if (error) {
    throw error;
  }

  return (data ?? []) as Record<string, unknown>[];
};

const getRemoteRowByIdentifier = async (tableName: SyncableTable, identifier: string | number) => {
  const rows = await getRemoteRowsByIdentifiers(tableName, [identifier]);
  return rows[0] ?? null;
};

const partitionConflicts = async (tableName: SyncableTable, records: SyncRecord[]) => {
  const table = getTable(tableName);
  const keyField = getPrimaryKeyField(table);
  const identifiers = records
    .map((record) => getRecordIdentifier(table, record))
    .filter(
      (identifier): identifier is string | number =>
        identifier !== null && identifier !== undefined,
    );

  const remoteRows = await getRemoteRowsByIdentifiers(tableName, identifiers);
  const remoteMap = new Map(remoteRows.map((row) => [String(row[keyField]), row]));

  const pushable: SyncRecord[] = [];
  const conflicts: SyncRecord[] = [];

  for (const record of records) {
    const identifier = getRecordIdentifier(table, record);
    if (identifier === null || identifier === undefined) {
      pushable.push(record);
      continue;
    }

    const remoteRow = remoteMap.get(String(identifier));
    if (!remoteRow) {
      pushable.push(record);
      continue;
    }

    const localUpdated = new Date(String(record.updated_at || record.created_at || 0)).getTime();
    const remoteUpdated = new Date(
      String(remoteRow.updated_at || remoteRow.created_at || 0),
    ).getTime();

    if (remoteUpdated > localUpdated) {
      conflicts.push(record);
      continue;
    }

    pushable.push(record);
  }

  return { pushable, conflicts };
};

const markRecordsAsConflict = async (tableName: SyncableTable, records: SyncRecord[]) => {
  if (records.length === 0) {
    return;
  }

  const table = getTable(tableName);

  await table.bulkUpdate(
    records
      .map((record) => {
        const identifier = getRecordIdentifier(table, record);
        if (identifier === null || identifier === undefined) {
          return null;
        }

        return {
          key: identifier,
          changes: {
            sync_status: 'conflict' as SyncStatus,
          },
        };
      })
      .filter(
        (item): item is { key: string | number; changes: { sync_status: SyncStatus } } =>
          item !== null,
      ),
  );
};

export const resolveConflict = async (
  tableName: SyncableTable,
  recordId: string | number,
  resolution: ConflictResolutionStrategy,
): Promise<SyncResult> => {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const table = getTable(tableName);
    const localRecord = await table.get(recordId as never);

    if (!localRecord) {
      return { success: true };
    }

    const primaryKey = getPrimaryKey(table, localRecord as SyncRecord);

    if (resolution === 'accept_remote') {
      const remoteRow = await getRemoteRowByIdentifier(tableName, recordId);

      if (!remoteRow) {
        await table.delete(primaryKey as never);
        return { success: true };
      }

      await table.put({
        ...normalizeRecord(remoteRow),
        sync_status: 'synced' as SyncStatus,
        synced_at: new Date(),
      } as SyncRecord);
      return { success: true };
    }

    const payload = {
      ...serializeRecord(localRecord as SyncRecord),
      sync_status: 'synced' as SyncStatus,
      synced_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(tableName).upsert(payload);
    if (error) {
      throw error;
    }

    await table.update(primaryKey as never, {
      sync_status: 'synced',
      synced_at: new Date(),
    });

    return { success: true };
  } catch (error) {
    const result: SyncResult = {
      success: false,
      error,
      table: tableName,
      type: 'unexpected',
    };

    if (syncErrorHandler) {
      syncErrorHandler(result);
    }

    return result;
  }
};

const processDeleteInstruction = async (instruction: SyncRecord) => {
  const value = getDeleteInstructionValue(instruction.value);
  if (!value) {
    throw new Error('Delete instruction tidak valid.');
  }

  const { error } = await supabase
    .from(value.tableName)
    .delete()
    .eq(value.primaryKeyField, value.recordId);
  if (error) {
    throw error;
  }

  if (typeof instruction.key === 'string') {
    await db.app_settings.delete(instruction.key);
  }
};

const getDeleteInstructionSortValue = (record: SyncRecord) => {
  const value = getDeleteInstructionValue(record.value);
  const priority = value ? (DELETE_PRIORITY_TABLES[value.tableName] ?? 10) : 10;
  const createdAt = value?.created_at ? new Date(value.created_at).getTime() : 0;
  return (
    `${priority}`.padStart(2, '0') +
    `:${createdAt.toString().padStart(13, '0')}:${String(record.key ?? '')}`
  );
};

const getSettingKey = (record: SyncRecord) =>
  typeof record.key === 'string' ? record.key : undefined;

export type SyncResult =
  | { success: true }
  | { success: false; error: unknown; table: SyncableTable; type: 'push' | 'pull' | 'unexpected' };

type SyncErrorHandler = (result: SyncResult) => void;

let syncErrorHandler: SyncErrorHandler | null = null;
let syncAllPromise: Promise<SyncResult[]> | null = null;
let autoSyncIntervalId: ReturnType<typeof setInterval> | null = null;

const syncTableInternal = async (tableName: SyncableTable): Promise<SyncResult> => {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  const table = getTable(tableName);

  try {
    const lastSyncedAt = await getLastSyncCheckpoint(tableName);
    const syncablePendingChanges = await getSyncablePendingChanges(tableName);

    if (tableName === 'app_settings') {
      const deleteInstructions = syncablePendingChanges
        .filter((item): item is SyncRecord => isDeleteInstructionSetting(getSettingKey(item)))
        .sort((left, right) =>
          getDeleteInstructionSortValue(left).localeCompare(getDeleteInstructionSortValue(right)),
        );

      for (const instruction of deleteInstructions) {
        const deleteResult = await retryWithBackoff(
          async () => {
            await processDeleteInstruction(instruction);
            return { success: true };
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            onRetry: (attempt, error) => {
              console.log(`Retry delete instruction for ${tableName}, attempt ${attempt}:`, error);
            },
          },
        );

        if (!deleteResult.success) {
          const result: SyncResult = {
            success: false,
            error:
              deleteResult.error ??
              new Error(`Failed to process delete instruction for ${tableName}`),
            table: tableName,
            type: 'push',
          };
          if (syncErrorHandler) syncErrorHandler(result);
          return result;
        }
      }
    }

    const pendingChanges =
      tableName === 'app_settings'
        ? syncablePendingChanges.filter((item) => !isDeleteInstructionSetting(getSettingKey(item)))
        : syncablePendingChanges;

    if (pendingChanges.length > 0) {
      const conflictPartition =
        tableName === 'app_settings'
          ? { pushable: pendingChanges, conflicts: [] as SyncRecord[] }
          : await partitionConflicts(tableName, pendingChanges);
      const pushableChanges = conflictPartition.pushable;
      const conflicts = conflictPartition.conflicts;

      if (conflicts.length > 0) {
        await markRecordsAsConflict(tableName, conflicts);
      }

      if (pushableChanges.length > 0) {
        const payload = pushableChanges.map((item) => ({
          ...serializeRecord(item),
          sync_status: 'synced' as SyncStatus,
          synced_at: new Date().toISOString(),
        }));

        const retryOptions: RetryOptions = {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            console.log(`Retry push for ${tableName}, attempt ${attempt}:`, error);
          },
        };

        const pushResult = await retryWithBackoff(async () => {
          const { error: pushError } = await supabase.from(tableName).upsert(payload);
          if (pushError) throw pushError;
          return { success: true };
        }, retryOptions);

        if (!pushResult.success) {
          const result: SyncResult = {
            success: false,
            error: pushResult.error ?? new Error(`Failed to push ${tableName}`),
            table: tableName,
            type: 'push',
          };
          if (syncErrorHandler) syncErrorHandler(result);
          return result;
        }

        await table.bulkUpdate(
          pushableChanges.map((item) => ({
            key: getPrimaryKey(table, item),
            changes: {
              sync_status: 'synced',
              synced_at: new Date(),
            },
          })),
        );
      }
    }

    let query = supabase.from(tableName).select('*').gt('updated_at', lastSyncedAt.toISOString());

    if (tableName === 'app_settings') {
      query = query
        .not('key', 'like', `${CHECKPOINT_PREFIX}%`)
        .not('key', 'like', `${ERROR_LOG_PREFIX}%`);
    }

    const retryOptions: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      onRetry: (attempt, error) => {
        console.log(`Retry pull for ${tableName}, attempt ${attempt}:`, error);
      },
    };

    const pullResult = await retryWithBackoff(async () => {
      const { data: remoteChanges, error: pullError } = await query;
      if (pullError) throw pullError;
      return remoteChanges;
    }, retryOptions);

    if (!pullResult.success) {
      const result: SyncResult = {
        success: false,
        error: pullResult.error ?? new Error(`Failed to pull ${tableName}`),
        table: tableName,
        type: 'pull',
      };
      if (syncErrorHandler) syncErrorHandler(result);
      return result;
    }

    const remoteChanges = pullResult.data;

    const normalizedRemoteChanges =
      tableName === 'app_settings'
        ? (remoteChanges ?? []).filter(
            (item) =>
              !isDeleteInstructionSetting(typeof item.key === 'string' ? item.key : undefined),
          )
        : (remoteChanges ?? []);

    if (normalizedRemoteChanges.length > 0) {
      await table.bulkPut(
        normalizedRemoteChanges.map((item) => ({
          ...normalizeRecord(item),
          sync_status: 'synced' as SyncStatus,
          synced_at: new Date(),
        })) as SyncRecord[],
      );

      const latestRemoteUpdate = normalizedRemoteChanges.reduce((latest, current) => {
        const latestDate = new Date(String(latest.updated_at || 0));
        const currentDate = new Date(String(current.updated_at || 0));
        return currentDate > latestDate ? current : latest;
      });

      if (latestRemoteUpdate.updated_at) {
        await setLastSyncCheckpoint(tableName, String(latestRemoteUpdate.updated_at));
      }
    }

    return { success: true };
  } catch (err) {
    const result: SyncResult = { success: false, error: err, table: tableName, type: 'unexpected' };
    if (syncErrorHandler) syncErrorHandler(result);
    return result;
  }
};

const syncAllInternal = async () => {
  const results: SyncResult[] = [];

  for (const table of SYNC_TABLES) {
    const result = await syncTableInternal(table);
    results.push(result);
  }

  return results;
};

export const syncEngine = {
  setErrorHandler(handler: SyncErrorHandler | null) {
    syncErrorHandler = handler;
  },

  syncTable: syncTableInternal,

  async syncAll() {
    if (syncAllPromise) {
      return syncAllPromise;
    }

    syncAllPromise = syncAllInternal();

    try {
      return await syncAllPromise;
    } finally {
      syncAllPromise = null;
    }
  },

  startAutoSync(intervalMs = 60000) {
    if (!isSupabaseConfigured) {
      return null;
    }

    if (autoSyncIntervalId) {
      clearInterval(autoSyncIntervalId);
    }

    void syncEngine.syncAll();
    autoSyncIntervalId = setInterval(() => {
      void syncEngine.syncAll();
    }, intervalMs);

    return autoSyncIntervalId;
  },
};

export { SYNC_TABLES };
