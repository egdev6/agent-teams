import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { cn } from '@lib/utils';
import { Bot, Plus, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CatalogEntitySummary } from '../../models';
import { RoleTabEmptyState } from './RoleTabEmptyState';

type TeamMemberRole = 'router' | 'orchestrator' | 'worker';

type TeamMembersRoleCardProps = {
  availableAgents: CatalogEntitySummary[];
  selectedAgents: string[];
  onToggleAgent: (agentId: string) => void;
  onCreateAgent: () => void;
  createAgentButtonVariant?: React.ComponentProps<typeof Button>['variant'];
  createAgentButtonSize?: React.ComponentProps<typeof Button>['size'];
};

const ROLE_TABS: Array<{ value: TeamMemberRole; label: string }> = [
  { value: 'router', label: 'Router' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'worker', label: 'Worker' },
];

export const TeamMembersRoleCard: React.FC<TeamMembersRoleCardProps> = ({
  availableAgents,
  selectedAgents,
  onToggleAgent,
  onCreateAgent,
  createAgentButtonVariant = 'vscode',
  createAgentButtonSize = 'sm',
}) => {
  const agentsByRole = useMemo(
    () =>
      ROLE_TABS.reduce(
        (acc, tab) => {
          acc[tab.value] = availableAgents.filter((agent) => agent.role === tab.value);
          return acc;
        },
        {
          router: [],
          orchestrator: [],
          worker: [],
        } as Record<TeamMemberRole, CatalogEntitySummary[]>,
      ),
    [availableAgents],
  );

  const defaultRole = useMemo<TeamMemberRole>(
    () => ROLE_TABS.find((tab) => agentsByRole[tab.value].length > 0)?.value ?? 'worker',
    [agentsByRole],
  );

  const [activeRole, setActiveRole] = useState<TeamMemberRole>(defaultRole);

  useEffect(() => {
    setActiveRole(defaultRole);
  }, [defaultRole]);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between gap-2'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <UserPlus className='h-4 w-4 text-primary' />
            Team Members
          </CardTitle>
          <Button
            size={createAgentButtonSize}
            variant={createAgentButtonVariant}
            onClick={onCreateAgent}
          >
            <Plus className='mr-2 h-4 w-4' />
            Create Agent
          </Button>
        </div>
        <CardDescription>Select agents to include in this team</CardDescription>
      </CardHeader>
      <CardContent>
        {availableAgents.length > 0 ? (
          <Tabs
            value={activeRole}
            onValueChange={(value) => setActiveRole(value as TeamMemberRole)}
          >
            <TabsList className='h-auto flex-wrap justify-start'>
              {ROLE_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} ({agentsByRole[tab.value].length})
                </TabsTrigger>
              ))}
            </TabsList>

            {ROLE_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {agentsByRole[tab.value].length > 0 ? (
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {agentsByRole[tab.value].map((agent) => {
                      const active = selectedAgents.includes(agent.id);
                      return (
                        <button
                          key={agent.id}
                          type='button'
                          onClick={() => onToggleAgent(agent.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]',
                            active
                              ? 'border-[rgba(255,0,54,0.55)] bg-[rgba(255,0,54,0.06)]'
                              : 'border-[rgba(255,255,255,0.07)] bg-transparent',
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
                  <RoleTabEmptyState roleLabel={tab.label} contextLabel='the catalog' />
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <p className='text-sm text-muted-foreground'>No agents available in catalog yet.</p>
        )}
      </CardContent>
    </Card>
  );
};
