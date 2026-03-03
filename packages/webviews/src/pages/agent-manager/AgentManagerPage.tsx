import { Bot, Plus } from 'lucide-react';
import { PageTitle } from '@/components/shared/PageTitle';
import { AgentManagerCard } from './components/AgentManagerCard';
import { AgentManagerEmptyState } from './components/AgentManagerEmptyState';
import { useAgentManagerLogic } from './useAgentManagerLogic';

const AgentManagerPage: React.FC = () => {
  const model = useAgentManagerLogic();

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
        <div className='grid gap-4'>
          {model.agents.map((agent) => (
            <AgentManagerCard
              key={agent.id}
              agent={agent}
              onConfigure={(agentId) => model.navigate(`/edit-agent/${agentId}`)}
            />
          ))}
        </div>
      ) : (
        <AgentManagerEmptyState icon={Bot} onCreateAgent={() => model.navigate('/create-agent')} />
      )}
    </div>
  );
};

export default AgentManagerPage;
