import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Bot, Pencil } from 'lucide-react';
import type { AgentItem } from '../useAgentManagerLogic';

type AgentManagerCardProps = {
  agent: AgentItem;
  onConfigure: (agentId: string) => void;
};

export const AgentManagerCard: React.FC<AgentManagerCardProps> = ({ agent, onConfigure }) => {
  return (
    <Card
      className='border border-muted hover:border-primary cursor-pointer transition-colors'
      onClick={() => onConfigure(agent.id)}
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
          <div className='flex gap-2'>
            {agent.scope === 'global' && <Badge variant='outline'>Global</Badge>}
            <Badge variant='secondary'>{agent.id}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex items-center justify-between'>
          <div className='text-sm text-muted-foreground'>
            {agent.teamId ? `Assigned team: ${agent.teamId}` : 'No team assignment'}
          </div>
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
              onConfigure(agent.id);
            }}
          >
            <Pencil className='mr-2 h-4 w-4' />
            Edit Agent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
