import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { cn } from '@lib/utils';
import { Bot, Plus, UserPlus } from 'lucide-react';
import type { CatalogEntitySummary } from '../../../models';

type TeamMembersCardProps = {
  availableAgents: CatalogEntitySummary[];
  selectedAgents: string[];
  onToggleAgent: (agentId: string) => void;
  onCreateAgent: () => void;
};

export const TeamMembersCard: React.FC<TeamMembersCardProps> = ({
  availableAgents,
  selectedAgents,
  onToggleAgent,
  onCreateAgent,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between gap-2'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <UserPlus className='h-4 w-4 text-primary' />
            Team Members
          </CardTitle>
          <Button variant='vscode' onClick={onCreateAgent}>
            <Plus className='mr-2 h-4 w-4' />
            Create Agent
          </Button>
        </div>
        <CardDescription>Select agents to include in this team</CardDescription>
      </CardHeader>
      <CardContent>
        {availableAgents.length > 0 ? (
          <div className='grid gap-2 sm:grid-cols-2'>
            {availableAgents.map((agent) => {
              const active = selectedAgents.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type='button'
                  onClick={() => onToggleAgent(agent.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent',
                    active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
                  )}
                >
                  <Bot
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <div>
                    <p className='text-sm font-medium leading-none'>{agent.name}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {agent.role ? `${agent.role} · ` : ''}
                      {agent.id}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>No agents available in catalog yet.</p>
        )}
      </CardContent>
    </Card>
  );
};
