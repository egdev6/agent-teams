import { cn } from '@lib/utils';
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  CloudOff,
  Eye,
  EyeClosed,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent } from '@/components/ui';

type PendingChanges = {
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
  total: number;
  items: Array<{ id: string; action: 'create' | 'update' | 'delete' }>;
};

type HookStatus =
  | 'idle'
  | 'checking'
  | 'needs_sync'
  | 'up_to_date'
  | 'syncing'
  | 'error'
  | 'validation_error';

type SyncStatusCardProps = {
  status: HookStatus;
  syncTime?: string;
  pendingChanges?: PendingChanges;
  syncEnabled: boolean;
  syncReason?: string;
  syncing?: boolean;
  syncError?: string;
  onSync: () => void;
};

const STATUS_CONFIG = {
  idle: {
    border: 'border rounded-lg border-status-warning',
    bg: 'bg-status-warning/10',
    iconColor: 'text-amber-500',
    Icon: CloudOff,
    title: 'Never synced',
    badgeVariant: 'secondary' as const,
  },
  checking: {
    border: 'border rounded-lg border-blue-500/30',
    bg: 'bg-blue-500/5',
    iconColor: 'text-blue-500',
    Icon: Loader2,
    title: 'Checking for changes',
    badgeVariant: 'secondary' as const,
  },
  needs_sync: {
    border: 'border rounded-lg border-status-warning',
    bg: 'bg-status-warning/10',
    iconColor: 'text-amber-500',
    Icon: ArrowDownUp,
    title: 'Sync needed',
    badgeVariant: 'warning' as const,
  },
  up_to_date: {
    border: 'border rounded-lg border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    iconColor: 'text-emerald-500',
    Icon: CheckCircle2,
    title: 'Up to date',
    badgeVariant: 'success' as const,
  },
  syncing: {
    border: 'border rounded-lg border-blue-500/30',
    bg: 'bg-blue-500/5',
    iconColor: 'text-blue-500',
    Icon: Loader2,
    title: 'Checking for changes',
    badgeVariant: 'secondary' as const,
  },
  error: {
    border: 'border rounded-lg border-destructive/40',
    bg: 'bg-destructive/5',
    iconColor: 'text-destructive',
    Icon: AlertTriangle,
    title: 'Sync failed',
    badgeVariant: 'destructive' as const,
  },
  validation_error: {
    border: 'border rounded-lg border-destructive/40',
    bg: 'bg-destructive/5',
    iconColor: 'text-destructive',
    Icon: AlertTriangle,
    title: 'Validation error',
    badgeVariant: 'destructive' as const,
  },
} as const;

function resolveStatus(status: HookStatus) {
  return STATUS_CONFIG[status];
}

/**
 * Format ISO timestamp or relative time string to human-readable relative time
 */
function formatRelativeTime(timeString?: string, nowMs = Date.now()): string {
  if (!timeString || timeString === 'Never') return 'Never';

  // Check if it's an ISO timestamp
  const timestamp = new Date(timeString);
  if (!Number.isNaN(timestamp.getTime())) {
    const diffMs = nowMs - timestamp.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHr === 1) return '1 hour ago';
    if (diffHr < 24) return `${diffHr} hours ago`;
    if (diffDay === 1) return '1 day ago';
    return `${diffDay} days ago`;
  }

  // Fallback: return as-is (might be "9h ago" from backend)
  return timeString;
}

function buildDescription(
  status: HookStatus,
  syncTime: string,
  pendingChanges?: PendingChanges,
  syncError?: string,
): string {
  // Validation error
  if (status === 'validation_error') {
    return 'Fix the validation error below before syncing';
  }

  // Needs sync with pending changes details
  if (status === 'needs_sync' && pendingChanges) {
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

  // Needs sync without details
  if (status === 'needs_sync') {
    return 'Changes detected that need to be synced';
  }

  // Checking/syncing
  if (status === 'checking' || status === 'syncing') {
    return 'Verifying current sync status...';
  }

  // Never synced
  if (status === 'idle') {
    return 'Agent files have never been synced to target directories';
  }

  // Error
  if (status === 'error') {
    return syncError || 'Last sync encountered an error';
  }

  // Up to date
  if (status === 'up_to_date') {
    return `Last synced ${syncTime}`;
  }

  return 'Unable to determine sync status';
}

export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  status,
  syncTime = 'Never',
  pendingChanges,
  syncEnabled,
  syncReason,
  syncing,
  syncError,
  onSync,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!syncTime || syncTime === 'Never') return;
    if (Number.isNaN(new Date(syncTime).getTime())) return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [syncTime]);

  // Extract agent ID from validation error message and determine status
  const extractAgentFromError = (error: string | undefined): string | null => {
    if (!error) return null;
    const match = error.match(/Failed to compose agent "([^"]+)"/);
    return match ? match[1] : null;
  };

  const failedAgentId = extractAgentFromError(syncError);
  const isValidationError = !!(syncError && failedAgentId);

  // Override status to validation_error if we have a validation error
  const effectiveStatus: HookStatus = isValidationError ? 'validation_error' : status;

  const config = resolveStatus(effectiveStatus);
  const { Icon, iconColor, title, border, bg, badgeVariant } = config;
  const formattedSyncTime = useMemo(() => formatRelativeTime(syncTime, nowMs), [syncTime, nowMs]);
  const description = buildDescription(
    effectiveStatus,
    formattedSyncTime,
    pendingChanges,
    syncError,
  );
  const [showDetails, setShowDetails] = useState(false);

  const showButton = status === 'needs_sync' || status === 'idle' || status === 'error';
  const buttonLabel = !pendingChanges
    ? 'Loading...'
    : status === 'error'
      ? 'Retry Sync'
      : 'Sync Now';

  return (
    <Card className={cn('transition-colors', border, bg)}>
      <CardContent className='flex items-start gap-4 px-4 py-3'>
        <Icon
          className={cn(
            `h-6 w-6 shrink-0 mt-0.5${title === 'Checking for changes' ? ' animate-spin' : ''}`,
            iconColor,
          )}
        />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>{title}</span>
            {status === 'needs_sync' && pendingChanges && !isValidationError && (
              <Badge variant={badgeVariant} className='text-[10px] px-1.5 py-0'>
                {pendingChanges.total - pendingChanges.skipped} pending
              </Badge>
            )}
            {isValidationError && (
              <Badge variant={badgeVariant} className='text-[10px] px-1.5 py-0'>
                1 agent
              </Badge>
            )}
            {status === 'up_to_date' && (
              <Badge variant={badgeVariant} className='text-[10px] px-1.5 py-0'>
                {formattedSyncTime}
              </Badge>
            )}
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>{description}</p>

          {/* Validation error display - similar to pending changes list */}
          {isValidationError && (
            <div className='mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2'>
              <div className='flex items-start gap-2'>
                <AlertTriangle className='h-4 w-4 text-destructive shrink-0 mt-0.5' />
                <div className='flex-1 min-w-0'>
                  <div className='text-xs font-medium text-destructive mb-1'>
                    Agent validation failed
                  </div>
                  <div className='flex items-center gap-1.5 text-[11px]'>
                    <span className='inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-destructive' />
                    <span className='font-mono text-destructive'>{failedAgentId}</span>
                  </div>
                  <div className='text-[11px] text-muted-foreground mt-1.5 pl-3'>
                    {syncError?.replace(/^Failed to compose agent "[^"]+": /, '')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pending changes list */}
          {status === 'needs_sync' &&
            pendingChanges &&
            pendingChanges.items.length > 0 &&
            showDetails &&
            !isValidationError && (
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
        <div className='flex items-center gap-2'>
          {status === 'needs_sync' &&
            pendingChanges &&
            pendingChanges.items.length > 0 &&
            !isValidationError && (
              <Button size='sm' variant='warning' onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? <EyeClosed /> : <Eye />}
              </Button>
            )}
          {showButton && !isValidationError && (
            <div title={syncReason}>
              <Button
                size='sm'
                variant='warning'
                disabled={!syncEnabled || syncing || !pendingChanges}
                onClick={onSync}
              >
                {syncing || !pendingChanges ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <RefreshCcw className='mr-2 h-4 w-4' />
                )}

                {syncing ? 'Syncing...' : buttonLabel}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
