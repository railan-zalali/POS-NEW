import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  syncEngine,
  getConflictSyncCount,
  getPendingSyncCount,
  type SyncResult,
} from '@/lib/supabase/syncEngine';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncStatusIndicator() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<{
    error: unknown;
    table: string;
    type: string;
  } | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Set up error handler
  const handleManualSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    // Clear previous error and reset retry attempts
    setLastError(null);
    setRetryAttempts(0);
    setIsSyncing(true);

    try {
      const results = await syncEngine.syncAll();

      // Check for any sync failures
      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        const failedTables = failures.map((f) => f.table).join(', ');
        toast({
          title: 'Sinkronisasi Sebagian Gagal',
          description: `${failures.length} tabel gagal disinkronkan: ${failedTables}`,
          variant: 'destructive',
          action: (
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-red-500/30 px-2 py-1 text-[10px] font-bold uppercase text-red-100 hover:bg-red-500/20"
              onClick={() => {
                setRetryAttempts((prev) => prev + 1);
                void handleManualSync();
              }}
            >
              Retry
            </button>
          ),
        });
      } else {
        toast({
          title: 'Sinkronisasi Berhasil',
          description: 'Semua data telah disinkronkan ke cloud',
        });
        setRetryAttempts(0); // Reset retry attempts on success
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, toast]);

  useEffect(() => {
    const handleError = (result: SyncResult) => {
      if (!result.success) {
        setLastError({
          error: result.error,
          table: result.table,
          type: result.type,
        });

        // Show user-friendly error messages based on error type
        let errorMessage = '';
        const tableDisplayName = result.table.replace(/_/g, ' ').toUpperCase();

        if (result.type === 'push') {
          errorMessage = `Gagal menyinkronkan data ${tableDisplayName} ke server`;
        } else if (result.type === 'pull') {
          errorMessage = `Gagal mengambil data ${tableDisplayName} dari server`;
        } else {
          errorMessage = `Terjadi kesalahan sinkronisasi pada ${tableDisplayName}`;
        }

        toast({
          title: 'Sinkronisasi Gagal',
          description: errorMessage,
          variant: 'destructive',
          action: (
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-red-500/30 px-2 py-1 text-[10px] font-bold uppercase text-red-100 hover:bg-red-500/20"
              onClick={() => handleManualSync()}
            >
              Coba Lagi
            </button>
          ),
        });

        // Auto-clear error after 10 seconds
        setTimeout(() => {
          setLastError(null);
        }, 10000);
      }
    };

    syncEngine.setErrorHandler(handleError);
    return () => syncEngine.setErrorHandler(null);
  }, [handleManualSync, toast]);

  // Count total pending items across major tables with debouncing
  const pendingCount = useLiveQuery(() => getPendingSyncCount(), []) || 0;
  const conflictCount = useLiveQuery(() => getConflictSyncCount(), []) || 0;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getSyncStatusText = () => {
    if (lastError) {
      const tableDisplayName = lastError.table.replace(/_/g, ' ').toUpperCase();
      return retryAttempts > 0
        ? `Retry ${retryAttempts}/3: ${lastError.type}`
        : `Gagal: ${lastError.type} (${tableDisplayName})`;
    }

    if (isSyncing) {
      return retryAttempts > 0 ? `Syncing... (Retry ${retryAttempts})` : 'Syncing...';
    }

    if (!isOnline) {
      return 'Offline';
    }

    if (conflictCount > 0) {
      return `${conflictCount} Konflik`;
    }

    if (pendingCount > 0) {
      return `${pendingCount} Pending`;
    }

    return 'Synced';
  };

  const getSyncIcon = () => {
    if (lastError) {
      return retryAttempts > 0 ? (
        <RefreshCw className="h-3 w-3 text-amber-500 animate-spin" />
      ) : (
        <AlertCircle className="h-3 w-3 text-red-500" />
      );
    }

    if (isSyncing) {
      return <RefreshCw className="h-3 w-3 animate-spin" />;
    }

    if (!isOnline) {
      return <CloudOff className="h-3 w-3" />;
    }

    if (conflictCount > 0) {
      return <AlertCircle className="h-3 w-3 text-amber-500" />;
    }

    if (pendingCount > 0) {
      return <RefreshCw className="h-3 w-3" />;
    }

    return <Cloud className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all duration-300 shadow-sm',
              lastError
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : isSyncing
                  ? 'bg-blue-50 text-blue-600 animate-pulse'
                  : !isOnline
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : conflictCount > 0
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : pendingCount > 0
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
            )}
          >
            {getSyncIcon()}

            <span>{getSyncStatusText()}</span>

            {isOnline && !isSyncing && (
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  lastError
                    ? 'bg-red-500'
                    : conflictCount > 0
                      ? 'bg-amber-500'
                      : pendingCount > 0
                        ? 'bg-amber-500'
                        : 'bg-emerald-500',
                )}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-slate-900 text-white border-none text-[10px] p-2 max-w-[300px]"
        >
          {lastError ? (
            <div className="space-y-2">
              <div className="font-bold text-red-400">Sinkronisasi Gagal</div>
              <div className="text-sm">Tabel: {lastError.table}</div>
              <div className="text-sm">Tipe: {lastError.type}</div>
              <div className="text-xs text-slate-300 mt-1">
                {lastError.error instanceof Error ? lastError.error.message : 'Unknown error'}
              </div>
            </div>
          ) : !isOnline ? (
            'Koneksi internet terputus'
          ) : isSyncing ? (
            'Sedang menyinkronkan data ke cloud...'
          ) : pendingCount > 0 ? (
            `Ada ${pendingCount} data yang belum tersinkron`
          ) : (
            'Semua data tersinkron sempurna'
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
