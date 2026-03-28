import { Badge } from '@components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { cn } from '@lib/utils';
import { Bot, CircleDot, CloudOff } from 'lucide-react';
import type { AgentItem } from '@/models';

type AgentManagerCardProps = {
  agent: AgentItem;
  onConfigure?: (agentId: string) => void;
};

export const AgentManagerCard: React.FC<AgentManagerCardProps> = ({ agent, onConfigure }) => {
  return (
    <Card
      className={cn(
        'border border-muted transition-colors',
        onConfigure && 'hover:border-primary cursor-pointer',
      )}
      onClick={onConfigure ? () => onConfigure(agent.id) : undefined}
    >
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-primary/10 p-2'>
              <Bot className='h-6 w-6 text-primary' />
            </div>
            <div>
              <CardTitle>{agent.name}</CardTitle>
              <CardDescription>
                {agent.role ? `${agent.role} agent` : 'Role not defined'}
              </CardDescription>
            </div>
          </div>
          {agent.localOnly && (
            <Badge variant='warning' className='flex items-center gap-1 shrink-0'>
              <CloudOff className='h-3 w-3' />
              Local only
            </Badge>
          )}
          {agent.unsynced && (
            <Badge variant='warning' className='flex items-center gap-1 shrink-0'>
              <CircleDot className='h-3 w-3' />
              Not synced
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        {agent.description && (
          <p className='line-clamp-2 text-sm text-muted-foreground'>{agent.description}</p>
        )}
        <div className='flex flex-wrap items-center gap-2'>
          {agent.intents && agent.intents.length > 0
            ? agent.intents.map((intent) => (
                <Badge key={intent} variant='outline' className='text-xs'>
                  {intent}
                </Badge>
              ))
            : null}
        </div>
        <div className='flex flex-wrap gap-1'>
          {agent.teamIds && agent.teamIds.length > 0 ? (
            agent.teamIds.map((teamId) => (
              <Badge key={teamId} variant='default' className='text-xs'>
                {teamId}
              </Badge>
            ))
          ) : (
            <span className='text-sm text-muted-foreground'>No team assignment</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
