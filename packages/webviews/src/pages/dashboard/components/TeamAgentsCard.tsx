import { AgentManagerCard } from '@components/shared/AgentManagerCard';
import { RoleTabEmptyState } from '@components/shared/RoleTabEmptyState';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { BrainCircuit, FolderOpen, Plus, ShieldHalf, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTeamManagerLogic } from '@/pages/team-manager/useTeamManagerLogic';
import type { Agent, AgentItem } from '../../../models';

type TeamAgentsCardProps = {
  agents: Agent[];
  activeTeamId?: string | null;
  createAgentEnabled: boolean;
  createAgentReason?: string;
  onCreateAgent: () => void;
  onEditAgent: (agentId: string) => void;
  onDesignWithAI: () => void;
  openConsultant: () => void;
};

export const TeamAgentsCard: React.FC<TeamAgentsCardProps> = ({
  agents,
  activeTeamId,
  createAgentEnabled,
  createAgentReason,
  onCreateAgent,
  onEditAgent,
  onDesignWithAI,
  openConsultant,
}) => {
  const [activeRole, setActiveRole] = useState<Agent['role']>('router');
  const disabledTooltip = (reason?: string) => reason || undefined;
  const model = useTeamManagerLogic();

  const agentItems: AgentItem[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    scope: agent.scope,
    description: agent.description,
    intents: agent.intents,
    teamIds: agent.teamId ? [agent.teamId] : activeTeamId ? [activeTeamId] : [],
    unsynced: agent.unsynced,
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
        <div className='flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4'>
          <div>
            <CardTitle>Team Agents</CardTitle>
            <CardDescription>Agents associated with the active team.</CardDescription>
          </div>
          <div className='flex justify-centerw-full md:w-auto gap-4'>
            <Button size='sm' variant='secondary' onClick={openConsultant}>
              <BrainCircuit className='mr-2 h-4 w-4' />
              Ask AI for team improvements
            </Button>
            <Button
              size='sm'
              variant='vscode'
              onClick={() => model.navigate(`/edit-team/${model.activeTeamId}`)}
            >
              <ShieldHalf className='mr-2 h-4 w-4' />
              Edit team
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {agentItems.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <FolderOpen className='mb-4 h-12 w-12 text-muted-foreground' />
            <h3 className='mb-2 text-lg text-center font-semibold'>No agents in this team</h3>
            <p className='mb-4 text-sm text-muted-foreground'>
              Create the first agent to get started.
            </p>
            <p className='mb-6 text-center text-xs text-muted-foreground'>
              💡 Recommended: let AI team creation based in your project and domains
            </p>
            <div className='flex items-center flex-col sm:flex-row gap-4'>
              <Button variant='vscode' onClick={onDesignWithAI}>
                <Wand2 className='mr-2 h-4 w-4' />
                Design with AI
              </Button>
              OR
              <Button
                variant='vscode'
                onClick={onCreateAgent}
                disabled={!createAgentEnabled}
                title={disabledTooltip(createAgentReason)}
              >
                <Plus className='mr-2 h-4 w-4' />
                Create manually
              </Button>
            </div>
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
