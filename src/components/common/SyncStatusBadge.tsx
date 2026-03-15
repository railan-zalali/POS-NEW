import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      status: {
        synced: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200',
        pending: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        error: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200',
        offline: 'border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200',
        syncing: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200',
      },
    },
    defaultVariants: {
      status: 'offline',
    },
  },
);

export interface SyncStatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusBadgeVariants> {
  status: 'synced' | 'pending' | 'error' | 'offline' | 'syncing';
  label?: string;
}

export function SyncStatusBadge({ className, status, label, ...props }: SyncStatusBadgeProps) {
  const defaultLabels = {
    synced: 'Tersinkronisasi',
    pending: 'Menunggu Sync',
    error: 'Gagal Sync',
    offline: 'Offline',
    syncing: 'Sedang Sync...',
  };

  return (
    <div className={cn(statusBadgeVariants({ status }), className)} {...props}>
      <span
        className={cn('h-2 w-2 rounded-full', {
          'bg-green-500': status === 'synced',
          'bg-yellow-500': status === 'pending',
          'bg-red-500': status === 'error',
          'bg-gray-500': status === 'offline',
          'bg-blue-500': status === 'syncing',
        })}
      />
      {status === 'syncing' && <Loader2 className="h-3 w-3 animate-spin" />}
      <span>{label || defaultLabels[status]}</span>
    </div>
  );
}
