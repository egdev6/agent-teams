import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Bot, FolderOpen, Plus, Settings, Trash2 } from 'lucide-react';

const TARGET_LABELS: Record<string, string> = {
  claude_code: 'Claude',
  codex: 'Codex',
  github_copilot: 'Copilot',
};

import { Badge } from '@/components/ui/badge';
import type { Agent } from '../../../models';

type TeamAgentsCardProps = {
  agents: Agent[];
  createAgentEnabled: boolean;
  createAgentReason?: string;
  onCreateAgent: () => void;
  onEditAgent: (agentId: string) => void;
};

export const TeamAgentsCard: React.FC<TeamAgentsCardProps> = ({
  agents,
  createAgentEnabled,
  createAgentReason,
  onCreateAgent,
  onEditAgent,
}) => {
  const disabledTooltip = (reason?: string) => reason || undefined;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>Team Agents</CardTitle>
            <CardDescription>Agents associated with the active team.</CardDescription>
          </div>
          <Button
            size='sm'
            onClick={onCreateAgent}
            disabled={!createAgentEnabled}
            title={disabledTooltip(createAgentReason)}
          >
            <Plus className='mr-2 h-4 w-4' />
            Create Agent
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <FolderOpen className='mb-4 h-12 w-12 text-muted-foreground' />
            <h3 className='mb-2 text-lg font-semibold'>No agents in this team</h3>
            <p className='mb-4 text-sm text-muted-foreground'>
              Create the first agent to get started.
            </p>
            <Button
              onClick={onCreateAgent}
              disabled={!createAgentEnabled}
              title={disabledTooltip(createAgentReason)}
            >
              <Plus className='mr-2 h-4 w-4' />
              Create Agent
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            {agents.map((agent) => (
              <div key={agent.id} className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-primary/10 p-2'>
                    <Bot className='h-6 w-6 text-primary' />
                  </div>
                  <div>
                    <CardTitle>{agent.name}</CardTitle>
                    <div className='mt-1 flex items-center gap-1'>
                      <CardDescription>{agent.role}</CardDescription>
                      {agent.targets?.map((t) => (
                        <Badge key={t} variant='outline' className='px-1 py-0 text-xs'>
                          {TARGET_LABELS[t] ?? t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button size='sm' variant='outline' onClick={() => onEditAgent(agent.id)}>
                    <Settings className='mr-2 h-4 w-4' />
                    Configure
                  </Button>
                  <Button size='sm' variant='secondary'>
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
