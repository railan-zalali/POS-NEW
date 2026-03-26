import { db } from '../db/dexie';
import type { SyncableTable } from './syncEngine';

export interface DeleteInstructionValue {
  tableName: SyncableTable;
  recordId: string | number;
  primaryKeyField: string;
  created_at: string;
}

const DELETE_INSTRUCTION_PREFIX = 'delete::';

export const isDeleteInstructionSetting = (key?: string) =>
  typeof key === 'string' && key.startsWith(DELETE_INSTRUCTION_PREFIX);

export const queueDeleteInstruction = async (
  tableName: SyncableTable,
  recordId: string | number,
  primaryKeyField: string = 'id',
) => {
  const key = `${DELETE_INSTRUCTION_PREFIX}${crypto.randomUUID()}`;

  await db.app_settings.put({
    key,
    value: {
      tableName,
      recordId,
      primaryKeyField,
      created_at: new Date().toISOString(),
    } satisfies DeleteInstructionValue,
    description: `Delete instruction for ${tableName}:${String(recordId)}`,
    created_at: new Date(),
    updated_at: new Date(),
    sync_status: 'pending',
  });

  return key;
};

export const getDeleteInstructionValue = (value: unknown): DeleteInstructionValue | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<DeleteInstructionValue>;
  if (
    typeof candidate.tableName !== 'string' ||
    (typeof candidate.recordId !== 'string' && typeof candidate.recordId !== 'number') ||
    typeof candidate.primaryKeyField !== 'string'
  ) {
    return null;
  }

  return candidate as DeleteInstructionValue;
};
