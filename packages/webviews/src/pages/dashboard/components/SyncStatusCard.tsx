import { cn } from '@lib/utils';
import { AlertTriangle, ArrowDownUp, CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@/components/ui';

type PendingChanges = {
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
  total: number;
  items: Array<{ id: string; action: 'create' | 'update' | 'delete' }>;
};

type SyncStatusCardProps = {
  syncStatus: 'SUCCESS' | 'WARNING' | 'NOT_SYNCED' | 'ERROR';
  syncTime: string;
  syncNeeded: boolean;
  pendingChanges?: PendingChanges;
  syncEnabled: boolean;
  syncReason?: string;
  onSync: () => void;
};

const STATUS_CONFIG = {
  NEEDS_SYNC: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    iconColor: 'text-amber-500',
    Icon: ArrowDownUp,
    title: 'Sync needed',
    badgeVariant: 'warning' as const,
  },
  SUCCESS: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    iconColor: 'text-emerald-500',
    Icon: CheckCircle2,
    title: 'Up to date',
    badgeVariant: 'success' as const,
  },
  NOT_SYNCED: {
    border: 'border-muted-foreground/20',
    bg: '',
    iconColor: 'text-muted-foreground',
    Icon: CloudOff,
    title: 'Never synced',
    badgeVariant: 'secondary' as const,
  },
  ERROR: {
    border: 'border-destructive/40',
    bg: 'bg-destructive/5',
    iconColor: 'text-destructive',
    Icon: AlertTriangle,
    title: 'Sync failed',
    badgeVariant: 'destructive' as const,
  },
  WARNING: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    iconColor: 'text-amber-500',
    Icon: AlertTriangle,
    title: 'Sync status unknown',
    badgeVariant: 'warning' as const,
  },
} as const;

function resolveStatus(syncStatus: SyncStatusCardProps['syncStatus'], syncNeeded: boolean) {
  if (syncNeeded) return STATUS_CONFIG.NEEDS_SYNC;
  return STATUS_CONFIG[syncStatus];
}

function buildDescription(
  syncStatus: SyncStatusCardProps['syncStatus'],
  syncTime: string,
  syncNeeded: boolean,
  pendingChanges?: PendingChanges,
): string {
  if (syncNeeded && pendingChanges) {
    const parts: string[] = [];
    if (pendingChanges.created > 0) {
      parts.push(`${pendingChanges.created} new`);
    }
    if (pendingChanges.updated > 0) {
      parts.push(`${pendingChanges.updated} updated`);
    }
    if (pendingChanges.deleted > 0) {
      parts.push(`${pendingChanges.deleted} deleted`);
    }
    return `${parts.join(', ')} — changes pending sync`;
  }

  if (syncNeeded) {
    return 'Changes detected that need to be synced';
  }

  if (syncStatus === 'NOT_SYNCED') {
    return 'Agent files have never been synced to target directories';
  }

  if (syncStatus === 'ERROR') {
    return 'Last sync encountered an error';
  }

  if (syncStatus === 'SUCCESS') {
    return `Last synced ${syncTime}`;
  }

  return 'Unable to determine sync status';
}

export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  syncStatus,
  syncTime,
  syncNeeded,
  pendingChanges,
  syncEnabled,
  syncReason,
  onSync,
}) => {
  const config = resolveStatus(syncStatus, syncNeeded);
  const { Icon, iconColor, title, border, bg, badgeVariant } = config;
  const description = buildDescription(syncStatus, syncTime, syncNeeded, pendingChanges);

  const showButton = syncNeeded || syncStatus === 'NOT_SYNCED' || syncStatus === 'ERROR';
  const buttonLabel = syncStatus === 'ERROR' ? 'Retry Sync' : 'Sync Now';

  return (
    <Card className={cn('transition-colors', border, bg)}>
      <CardContent className='flex items-start gap-4 py-4'>
        <Icon className={cn('h-6 w-6 shrink-0 mt-0.5', iconColor)} />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>{title}</span>
            {syncNeeded && pendingChanges && (
              <Badge variant={badgeVariant} className='text-[10px] px-1.5 py-0'>
                {pendingChanges.total - pendingChanges.skipped} pending
              </Badge>
            )}
            {syncStatus === 'SUCCESS' && !syncNeeded && (
              <Badge variant={badgeVariant} className='text-[10px] px-1.5 py-0'>
                {syncTime}
              </Badge>
            )}
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>{description}</p>
          {syncNeeded && pendingChanges && pendingChanges.items.length > 0 && (
            <ul className='mt-1.5 space-y-0.5'>
              {pendingChanges.items.map((item) => (
                <li
                  key={item.id}
                  className='text-[11px] text-muted-foreground flex items-center gap-1.5'
                >
                  <span
                    className={cn(
                      'inline-block w-1.5 h-1.5 rounded-full shrink-0',
                      item.action === 'create'
                        ? 'bg-emerald-500'
                        : item.action === 'delete'
                          ? 'bg-red-500'
                          : 'bg-amber-500',
                    )}
                  />
                  <span className='truncate'>{item.id}</span>
                  <span className='text-muted-foreground/60'>
                    (
                    {item.action === 'create'
                      ? 'new'
                      : item.action === 'delete'
                        ? 'deleted'
                        : 'modified'}
                    )
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {showButton && (
          <div title={syncReason}>
            <Button size='sm' variant='warning' disabled={!syncEnabled} onClick={onSync}>
              <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
              {buttonLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
