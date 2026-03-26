// Error codes for categorizing errors
export enum ErrorCode {
  // Validation Errors (1000-1099)
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',

  // Database Errors (2000-2099)
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  DB_ITEM_NOT_FOUND = 'DB_ITEM_NOT_FOUND',

  // Sync Errors (3000-3099)
  SYNC_CLOUD_DISABLED = 'SYNC_CLOUD_DISABLED',
  SYNC_CONNECTION_FAILED = 'SYNC_CONNECTION_FAILED',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_PUSH_FAILED = 'SYNC_PUSH_FAILED',
  SYNC_PULL_FAILED = 'SYNC_PULL_FAILED',

  // Business Logic Errors (4000-4099)
  BUSINESS_INVALID_STATUS = 'BUSINESS_INVALID_STATUS',
  BUSINESS_INSUFFICIENT_STOCK = 'BUSINESS_INSUFFICIENT_STOCK',
  BUSINESS_CREDIT_LIMIT_EXCEEDED = 'BUSINESS_CREDIT_LIMIT_EXCEEDED',
  BUSINESS_CUSTOMER_NOT_FOUND = 'BUSINESS_CUSTOMER_NOT_FOUND',
  BUSINESS_INVALID_OPERATION = 'BUSINESS_INVALID_OPERATION',

  // Network Errors (5000-5099)
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',

  // Unknown Error (9999)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly userMessage: string;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>,
    recoverable: boolean = false,
    userMessage?: string,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context || {};
    this.recoverable = recoverable;
    this.userMessage = userMessage || AppError.getDefaultUserMessage(code, message);
  }

  static getDefaultUserMessage(code: ErrorCode, message: string): string {
    switch (code) {
      case ErrorCode.VALIDATION_REQUIRED_FIELD:
        return 'Mohon lengkapi semua field yang wajib diisi.';

      case ErrorCode.VALIDATION_INVALID_FORMAT:
        return 'Format yang Anda masukkan tidak valid.';

      case ErrorCode.VALIDATION_OUT_OF_RANGE:
        return 'Nilai yang Anda masukkan berada di luar jangkauan yang diizinkan.';

      case ErrorCode.DB_CONNECTION_FAILED:
        return 'Gagal terhubung ke database. Silakan coba lagi.';

      case ErrorCode.DB_ITEM_NOT_FOUND:
        return 'Data yang dicari tidak ditemukan.';

      case ErrorCode.SYNC_CLOUD_DISABLED:
        return 'Sinkronisasi cloud dinonaktifkan. Data hanya disimpan lokal.';

      case ErrorCode.SYNC_CONNECTION_FAILED:
        return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';

      case ErrorCode.BUSINESS_INSUFFICIENT_STOCK:
        return 'Stok tidak mencukupi untuk transaksi ini.';

      case ErrorCode.BUSINESS_CREDIT_LIMIT_EXCEEDED:
        return 'Limit kredit pelanggan tidak mencukupi.';

      case ErrorCode.BUSINESS_CUSTOMER_NOT_FOUND:
        return 'Pelanggan tidak ditemukan di database.';

      case ErrorCode.NETWORK_OFFLINE:
        return 'Anda sedang offline. Silakan cek koneksi internet Anda.';

      default:
        return message;
    }
  }
}

const getErrorMessage = (error: Error | unknown): string =>
  error instanceof Error ? error.message : String(error);

const SENSITIVE_CONTEXT_KEYS = ['pin', 'password', 'token', 'secret', 'authorization', 'auth'];

const sanitizeContext = (context?: Record<string, unknown>): Record<string, unknown> => {
  if (!context) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    const isSensitive = SENSITIVE_CONTEXT_KEYS.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey),
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        item && typeof item === 'object' ? sanitizeContext(item as Record<string, unknown>) : item,
      );
      continue;
    }

    if (value && typeof value === 'object' && !(value instanceof Blob)) {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
};

// Error logging service
class ErrorLogger {
  static async log(error: AppError): Promise<void> {
    try {
      const { db } = await import('./db/dexie');

      const logEntry = {
        id: crypto.randomUUID(),
        error_code: error.code,
        error_message: error.message,
        user_message: error.userMessage,
        context: sanitizeContext(error.context),
        stack: error.stack || '',
        recoverable: error.recoverable,
        created_at: new Date().toISOString(),
        app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      };

      // Use app_settings table for error logging if available
      if (db.app_settings) {
        await db.app_settings.add({
          key: `error_${logEntry.id}`,
          value: logEntry,
          description: `Error: ${error.code}`,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        });
      }
    } catch (logError) {
      // If logging fails, at least log to console for development
      console.error('Failed to log error:', logError);
    }
  }

  static async getRecentLogs(limit: number = 50): Promise<AppError[]> {
    try {
      const { db } = await import('./db/dexie');

      if (!db.app_settings) {
        return [];
      }

      const logs = (await db.app_settings.toArray()).filter((s) => s.key?.startsWith('error_'));

      // Parse and sort by timestamp (most recent first)
      const parsedLogs = logs
        .sort((a, b) => {
          const dateA = new Date(a.created_at ?? 0).getTime();
          const dateB = new Date(b.created_at ?? 0).getTime();
          return dateB - dateA;
        })
        .map((s) => {
          try {
            const value = s.value as {
              error_code?: string;
              user_message?: string;
              created_at?: string;
            };
            return new AppError(
              (value.error_code as ErrorCode) || ErrorCode.UNKNOWN_ERROR,
              'Error from logs',
              undefined,
              true,
              value.user_message || 'Unknown error',
            );
          } catch {
            // If parsing fails, create a generic error
            return new AppError(ErrorCode.UNKNOWN_ERROR, s.key || 'unknown', undefined, false);
          }
        })
        .slice(0, limit);

      return parsedLogs;
    } catch {
      return [];
    }
  }

  static async clearOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const { db } = await import('./db/dexie');

      if (!db.app_settings) {
        return 0;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const oldLogs = (await db.app_settings.toArray()).filter((s) => {
        const createdAt = s.created_at ? new Date(s.created_at) : null;
        return s.key?.startsWith('error_') && createdAt !== null && createdAt < cutoffDate;
      });

      let deletedCount = 0;
      for (const log of oldLogs) {
        await db.app_settings.delete(log.key);
        deletedCount++;
      }

      return deletedCount;
    } catch {
      return 0;
    }
  }
}

// Helper functions for creating specific errors
export const createValidationError = (field: string, message: string): AppError => {
  return new AppError(
    ErrorCode.VALIDATION_REQUIRED_FIELD,
    `Validasi gagal: ${field}. ${message}`,
    { field },
    true,
    'Mohon lengkapi field ini: ' + field,
  );
};

export const createDatabaseError = (
  operation: string,
  originalError: Error | unknown,
): AppError => {
  return new AppError(
    ErrorCode.DB_TRANSACTION_FAILED,
    `Gagal ${operation}: ${getErrorMessage(originalError)}`,
    {
      operation,
      originalError: originalError instanceof Error ? originalError.stack : String(originalError),
    },
    false,
    'Terjadi kesalahan pada database. Silakan coba lagi.',
  );
};

export const createSyncError = (
  operation: 'push' | 'pull',
  tableName: string,
  originalError: Error | unknown,
): AppError => {
  return new AppError(
    operation === 'push' ? ErrorCode.SYNC_PUSH_FAILED : ErrorCode.SYNC_PULL_FAILED,
    `Sinkronisasi gagal: ${operation} ${tableName}: ${getErrorMessage(originalError)}`,
    {
      operation,
      tableName,
      originalError: originalError instanceof Error ? originalError.stack : String(originalError),
    },
    true, // Sync errors are recoverable with retry
    `Gagal menyinkronkan data ${tableName}. Data tetap tersimpan di lokal.`,
  );
};

export const createBusinessError = (
  operation: string,
  message: string,
  originalError?: Error | unknown,
  recoverable: boolean = false,
): AppError => {
  const code = recoverable ? ErrorCode.BUSINESS_INVALID_OPERATION : ErrorCode.UNKNOWN_ERROR;
  return new AppError(
    code,
    message,
    originalError
      ? {
          operation,
          originalError:
            originalError instanceof Error ? originalError.stack : String(originalError),
        }
      : undefined,
    recoverable,
    message,
  );
};

export const createNetworkError = (operation: string, originalError: Error | unknown): AppError => {
  return new AppError(
    ErrorCode.NETWORK_OFFLINE,
    `Gagal ${operation}: ${getErrorMessage(originalError)}`,
    {
      operation,
      originalError: originalError instanceof Error ? originalError.stack : String(originalError),
    },
    true, // Network errors are recoverable when connection returns
    'Anda sedang offline. Silakan coba lagi ketika koneksi kembali.',
  );
};

export const createUnknownError = (message: string): AppError => {
  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    message,
    undefined,
    false,
    'Terjadi kesalahan yang tidak diduga. Silakan coba lagi.',
  );
};

// Main error handler function
export const handleError = (
  error: unknown,
  context?: Record<string, unknown>,
  showToast?: (message: string, variant?: 'destructive' | 'default') => void,
): AppError => {
  // Convert error to AppError
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    // Try to identify the error type based on message or context
    const message = error.message.toLowerCase();

    if (
      message.includes('validation') ||
      message.includes('wajib') ||
      message.includes('required')
    ) {
      appError = new AppError(ErrorCode.VALIDATION_REQUIRED_FIELD, error.message);
    } else if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      appError = new AppError(ErrorCode.NETWORK_OFFLINE, error.message);
    } else if (
      message.includes('database') ||
      message.includes('db') ||
      message.includes('query')
    ) {
      appError = new AppError(ErrorCode.DB_CONNECTION_FAILED, error.message);
    } else if (message.includes('sync') || message.includes('supabase')) {
      appError = new AppError(ErrorCode.SYNC_CONNECTION_FAILED, error.message);
    } else {
      appError = createUnknownError(error.message);
    }
  } else {
    appError = createUnknownError(String(error));
  }

  // Add context if provided
  if (context) {
    appError = new AppError(
      appError.code,
      error instanceof Error ? error.message : appError.message,
      context,
      appError.recoverable,
      appError.userMessage,
    );
  }

  // Log the error
  ErrorLogger.log(appError);

  // Show toast notification if showToast function is provided
  if (showToast) {
    try {
      showToast(appError.userMessage, appError.recoverable ? 'default' : 'destructive');
    } catch (toastError) {
      // If toast fails, at least log the error
      console.error('Failed to show toast:', toastError);
    }
  }

  return appError;
};
