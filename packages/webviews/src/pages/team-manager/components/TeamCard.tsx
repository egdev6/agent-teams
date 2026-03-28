import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { CheckCircle, CircleDot, CloudOff, ShieldHalf } from 'lucide-react';
import type { TeamItem } from '@/models';

type TeamCardProps = {
  team: TeamItem;
  isActive: boolean;
  onConfigure: (teamId: string) => void;
  onActivate?: (teamId: string) => void;
};

export const TeamCard: React.FC<TeamCardProps> = ({ team, isActive, onConfigure, onActivate }) => {
  return (
    <Card
      className={`border ${isActive ? 'border-primary bg-primary/10' : 'border-muted'} hover:border-primary cursor-pointer transition-colors`}
      onClick={() => onConfigure(team.id)}
    >
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3'>
            <div className='rounded-lg bg-primary/10 p-2'>
              <ShieldHalf className='h-6 w-6 text-primary' />
            </div>
            <div className='flex flex-col gap-2 items-start justify-start'>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription className='w-full line-clamp-2'>{team.description}</CardDescription>
            </div>
          </div>
          <div className='flex gap-2'>
            {team.localOnly && (
              <Badge variant='warning' className='flex items-center gap-1'>
                <CloudOff className='h-3 w-3' />
                Local only
              </Badge>
            )}
            {team.unsynced && (
              <Badge variant='warning' className='flex items-center gap-1'>
                <CircleDot className='h-3 w-3' />
                Not synced
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex items-center justify-between'>
          <div className='flex gap-4 text-sm text-muted-foreground'>
            <span>
              {team.enabledAgentsCount !== undefined
                ? `${team.enabledAgentsCount} selected agents`
                : 'Selected agents not specified'}
            </span>
            {team.enablesAllAgents && (
              <>
                <span>•</span>
                <span>All agents enabled</span>
              </>
            )}
          </div>
          <div className='flex gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='cursor-pointer'
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onActivate?.(team.id);
              }}
              disabled={isActive}
            >
              <CheckCircle className='mr-2 h-4 w-4' />
              Activate Team
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
