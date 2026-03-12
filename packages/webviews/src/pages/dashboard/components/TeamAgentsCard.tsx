import { AgentManagerCard } from '@components/shared/AgentManagerCard';
import { RoleTabEmptyState } from '@components/shared/RoleTabEmptyState';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { FolderOpen, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Agent, AgentItem } from '../../../models';

type TeamAgentsCardProps = {
  agents: Agent[];
  activeTeamId?: string | null;
  createAgentEnabled: boolean;
  createAgentReason?: string;
  onCreateAgent: () => void;
  onEditAgent: (agentId: string) => void;
};

export const TeamAgentsCard: React.FC<TeamAgentsCardProps> = ({
  agents,
  activeTeamId,
  createAgentEnabled,
  createAgentReason,
  onCreateAgent,
  onEditAgent,
}) => {
  const [activeRole, setActiveRole] = useState<Agent['role']>('router');
  const disabledTooltip = (reason?: string) => reason || undefined;

  const agentItems: AgentItem[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    scope: agent.scope,
    description: agent.description,
    intents: agent.intents,
    teamIds: agent.teamId ? [agent.teamId] : activeTeamId ? [activeTeamId] : [],
  }));
  const roleTabs: Array<{ value: Agent['role']; label: string }> = [
    { value: 'router', label: 'Router' },
    { value: 'orchestrator', label: 'Orchestrator' },
    { value: 'worker', label: 'Worker' },
  ];
  const agentsByRole = useMemo(
    () =>
      roleTabs.reduce(
        (acc, tab) => {
          acc[tab.value] = agentItems.filter((agent) => agent.role === tab.value);
          return acc;
        },
        {
          router: [] as AgentItem[],
          orchestrator: [] as AgentItem[],
          worker: [] as AgentItem[],
        },
      ),
    [agentItems, roleTabs.reduce],
  );

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
        {agentItems.length === 0 ? (
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
          <Tabs value={activeRole} onValueChange={(value) => setActiveRole(value as Agent['role'])}>
            <TabsList className='h-auto flex-wrap justify-start'>
              {roleTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} ({agentsByRole[tab.value].length})
                </TabsTrigger>
              ))}
            </TabsList>
            {roleTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {agentsByRole[tab.value].length > 0 ? (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {agentsByRole[tab.value].map((agent) => (
                      <AgentManagerCard
                        key={agent.id}
                        agent={agent}
                        onConfigure={(agentId) => onEditAgent(agentId)}
                      />
                    ))}
                  </div>
                ) : (
                  <RoleTabEmptyState roleLabel={tab.label} contextLabel='this team' />
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
