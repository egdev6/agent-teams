import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Settings, Users2 } from 'lucide-react';
import type { TeamItem } from '../useTeamManagerLogic';

type TeamCardProps = {
  team: TeamItem;
  isActive: boolean;
  onConfigure: (teamId: string) => void;
};

export const TeamCard: React.FC<TeamCardProps> = ({ team, isActive, onConfigure }) => {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-primary/10 p-2'>
              <Users2 className='h-6 w-6 text-primary' />
            </div>
            <div>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>{team.description}</CardDescription>
            </div>
          </div>
          <div className='flex gap-2'>
            {isActive && <Badge>Active</Badge>}
            <Badge variant='secondary'>{team.id}</Badge>
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
            <Button size='sm' variant='outline' onClick={() => onConfigure(team.id)}>
              <Settings className='mr-2 h-4 w-4' />
              Configure
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
