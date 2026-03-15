import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { syncEngine } from '@/lib/supabase/syncEngine';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table } from 'dexie';
import type { BaseEntity } from '@/lib/db/schema';

type TableRecord = Record<string, Table<BaseEntity>>;
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Count total pending items across major tables
  const pendingCount =
    useLiveQuery(async () => {
      const tables = [
        'products',
        'categories',
        'suppliers',
        'customers',
        'sales_transactions',
        'purchase_orders',
      ];
      let count = 0;
      for (const table of tables) {
        count += await (db as unknown as TableRecord)[table]
          .where('sync_status')
          .equals('pending')
          .count();
      }
      return count;
    }, []) || 0;

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

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncEngine.syncAll();
    } finally {
      setIsSyncing(false);
    }
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
              !isOnline
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isSyncing
                  ? 'bg-blue-50 text-blue-600 animate-pulse'
                  : pendingCount > 0
                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
            )}
          >
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : !isOnline ? (
              <CloudOff className="h-3 w-3" />
            ) : pendingCount > 0 ? (
              <RefreshCw className="h-3 w-3" />
            ) : (
              <Cloud className="h-3 w-3" />
            )}

            <span>
              {isSyncing
                ? 'Syncing...'
                : !isOnline
                  ? 'Offline'
                  : pendingCount > 0
                    ? `${pendingCount} Pending`
                    : 'Synced'}
            </span>

            {isOnline && !isSyncing && (
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-slate-900 text-white border-none text-[10px] p-2"
        >
          {!isOnline
            ? 'Koneksi internet terputus'
            : isSyncing
              ? 'Sedang menyinkronkan data ke cloud...'
              : pendingCount > 0
                ? `Ada ${pendingCount} data yang belum tersinkron`
                : 'Semua data tersinkron sempurna'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
