import { AgentManagerCard } from '@components/shared/AgentManagerCard';
import { RoleTabEmptyState } from '@components/shared/RoleTabEmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Bot, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { AgentManagerEmptyState } from './components/AgentManagerEmptyState';
import { useAgentManagerLogic } from './useAgentManagerLogic';

const AgentManagerPage: React.FC = () => {
  const model = useAgentManagerLogic();
  const [activeRole, setActiveRole] = useState<'router' | 'orchestrator' | 'worker'>('router');
  const roleTabs: Array<{ value: 'router' | 'orchestrator' | 'worker'; label: string }> = [
    { value: 'router', label: 'Router' },
    { value: 'orchestrator', label: 'Orchestrator' },
    { value: 'worker', label: 'Worker' },
  ];
  const agentsByRole = useMemo(
    () =>
      roleTabs.reduce(
        (acc, tab) => {
          acc[tab.value] = model.agents.filter((agent) => agent.role === tab.value);
          return acc;
        },
        {
          router: [],
          orchestrator: [],
          worker: [],
        } as Record<'router' | 'orchestrator' | 'worker', typeof model.agents>,
      ),
    [model.agents, roleTabs.reduce],
  );

  return (
    <div className='space-y-6 animate-fade-in'>
      <PageTitle
        title='Agent Manager'
        description='Manage your agents and update their configuration.'
        button={{
          label: 'Create Agent',
          onClick: () => model.navigate('/create-agent'),
          icon: Plus,
        }}
      />

      {model.agents.length > 0 ? (
        <Tabs
          value={activeRole}
          onValueChange={(value) => setActiveRole(value as typeof activeRole)}
        >
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
                      onConfigure={(agentId) => model.navigate(`/edit-agent/${agentId}`)}
                    />
                  ))}
                </div>
              ) : (
                <RoleTabEmptyState roleLabel={tab.label} contextLabel='the catalog' />
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <AgentManagerEmptyState icon={Bot} onCreateAgent={() => model.navigate('/create-agent')} />
      )}
    </div>
  );
};

export default AgentManagerPage;
