import { cn } from '@lib/utils';
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  CloudOff,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@/components/ui';

type PendingChanges = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
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
    badgeVariant: 'outline' as const,
    badgeClass: 'border-amber-500/50 text-amber-500',
  },
  SUCCESS: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    iconColor: 'text-emerald-500',
    Icon: CheckCircle2,
    title: 'Up to date',
    badgeVariant: 'outline' as const,
    badgeClass: 'border-emerald-500/50 text-emerald-500',
  },
  NOT_SYNCED: {
    border: 'border-muted-foreground/20',
    bg: '',
    iconColor: 'text-muted-foreground',
    Icon: CloudOff,
    title: 'Never synced',
    badgeVariant: 'secondary' as const,
    badgeClass: '',
  },
  ERROR: {
    border: 'border-destructive/40',
    bg: 'bg-destructive/5',
    iconColor: 'text-destructive',
    Icon: AlertTriangle,
    title: 'Sync failed',
    badgeVariant: 'destructive' as const,
    badgeClass: '',
  },
  WARNING: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    iconColor: 'text-amber-500',
    Icon: AlertTriangle,
    title: 'Sync status unknown',
    badgeVariant: 'outline' as const,
    badgeClass: 'border-amber-500/50 text-amber-500',
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
  const { Icon, iconColor, title, border, bg, badgeVariant, badgeClass } = config;
  const description = buildDescription(syncStatus, syncTime, syncNeeded, pendingChanges);

  const showButton = syncNeeded || syncStatus === 'NOT_SYNCED' || syncStatus === 'ERROR';
  const buttonLabel = syncStatus === 'ERROR' ? 'Retry Sync' : 'Sync Now';

  return (
    <Card className={cn('transition-colors', border, bg)}>
      <CardContent className='flex items-center gap-4 py-4'>
        <Icon className={cn('h-6 w-6 shrink-0', iconColor)} />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>{title}</span>
            {syncNeeded && pendingChanges && (
              <Badge variant={badgeVariant} className={cn('text-[10px] px-1.5 py-0', badgeClass)}>
                {pendingChanges.total - pendingChanges.skipped} pending
              </Badge>
            )}
            {syncStatus === 'SUCCESS' && !syncNeeded && (
              <Badge variant={badgeVariant} className={cn('text-[10px] px-1.5 py-0', badgeClass)}>
                {syncTime}
              </Badge>
            )}
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>{description}</p>
        </div>
        {showButton && (
          <div title={syncReason}>
            <Button
              size='sm'
              variant={syncNeeded ? 'default' : 'outline'}
              disabled={!syncEnabled}
              onClick={onSync}
              className={cn(syncNeeded && 'animate-pulse')}
            >
              <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
              {buttonLabel}
            </Button>
          </div>
        )}
        {!showButton && syncStatus === 'SUCCESS' && (
          <div title={syncReason}>
            <Button size='sm' variant='ghost' disabled={!syncEnabled} onClick={onSync}>
              <Loader2 className='mr-1.5 h-3.5 w-3.5' />
              Re-sync
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
