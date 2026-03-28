import { cn } from '@lib/utils';
import { AlertTriangle, CheckCircle2, Download, Eye, EyeClosed, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import type { OrphanEntry } from '../../../models';

type OrphanNotificationCardProps = {
  validOrphanAgents?: OrphanEntry[];
  validOrphanTeams?: OrphanEntry[];
  invalidOrphanAgents?: OrphanEntry[];
  invalidOrphanTeams?: OrphanEntry[];
  importing: boolean;
  onImport: () => void;
};

export const OrphanNotificationCard: React.FC<OrphanNotificationCardProps> = ({
  validOrphanAgents = [],
  validOrphanTeams = [],
  invalidOrphanAgents = [],
  invalidOrphanTeams = [],
  importing,
  onImport,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const validCount = validOrphanAgents.length + validOrphanTeams.length;
  const invalidCount = invalidOrphanAgents.length + invalidOrphanTeams.length;
  const totalCount = validCount + invalidCount;

  if (totalCount === 0) return null;

  const description = [
    validCount > 0 && `${validCount} can be imported`,
    invalidCount > 0 && `${invalidCount} have validation errors`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className={cn('transition-colors', 'border-amber-500/40', 'bg-amber-500/5')}>
      <CardContent className='flex items-start gap-4 py-4'>
        <AlertTriangle className='h-6 w-6 shrink-0 mt-0.5 text-amber-500' />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>Unregistered files detected</span>
            <Badge variant='warning' className='text-[10px] px-1.5 py-0'>
              {totalCount} found
            </Badge>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>{description}</p>
          {showDetails && (
            <>
              {(validOrphanAgents.length > 0 || validOrphanTeams.length > 0) && (
                <div className='mt-2'>
                  <span className='text-[11px] font-medium text-emerald-500'>Ready to import</span>
                  <ul className='mt-1 space-y-0.5'>
                    {validOrphanAgents.map((entry) => (
                      <OrphanItem key={`agent-${entry.id}`} entry={entry} kind='agent' valid />
                    ))}
                    {validOrphanTeams.map((entry) => (
                      <OrphanItem key={`team-${entry.id}`} entry={entry} kind='team' valid />
                    ))}
                  </ul>
                </div>
              )}

              {(invalidOrphanAgents.length > 0 || invalidOrphanTeams.length > 0) && (
                <div className='mt-2'>
                  <span className='text-[11px] font-medium text-destructive'>
                    Cannot import — validation errors
                  </span>
                  <ul className='mt-1 space-y-0.5'>
                    {invalidOrphanAgents.map((entry) => (
                      <OrphanItem key={`agent-${entry.id}`} entry={entry} kind='agent' />
                    ))}
                    {invalidOrphanTeams.map((entry) => (
                      <OrphanItem key={`team-${entry.id}`} entry={entry} kind='team' />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant='warning'
            disabled={importing}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeClosed /> : <Eye />}
          </Button>
          {validCount > 0 && (
            <Button size='sm' variant='warning' disabled={importing} onClick={onImport}>
              <Download className='mr-1.5 h-3.5 w-3.5' />
              {importing ? 'Importing…' : 'Import to catalog'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function OrphanItem({
  entry,
  kind,
  valid,
}: {
  entry: OrphanEntry;
  kind: 'agent' | 'team';
  valid?: boolean;
}) {
  return (
    <li className='text-[11px] text-muted-foreground flex items-center gap-1.5'>
      <span
        className={cn(
          'inline-block w-1.5 h-1.5 rounded-full shrink-0',
          valid ? 'bg-emerald-500' : 'bg-red-500',
        )}
      />
      <span className='truncate'>{entry.name || entry.id}</span>
      <span className='text-muted-foreground/60'>({kind})</span>
      {valid ? (
        <CheckCircle2 className='h-3 w-3 text-emerald-500 shrink-0' />
      ) : (
        <span className='flex items-center gap-1 text-destructive/80'>
          <XCircle className='h-3 w-3 shrink-0' />
          <span className='truncate'>{entry.errors.join(', ')}</span>
        </span>
      )}
    </li>
  );
}
