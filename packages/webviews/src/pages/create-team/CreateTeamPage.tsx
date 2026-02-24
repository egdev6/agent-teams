import { CreateTeamActions } from './components/CreateTeamActions';
import { CreateTeamHeader } from './components/CreateTeamHeader';
import { TeamBasicsCard } from './components/TeamBasicsCard';
import { TeamMembersCard } from './components/TeamMembersCard';
import { TeamSummaryCard } from './components/TeamSummaryCard';
import { useCreateTeamLogic } from './useCreateTeamLogic';

const CreateTeamPage: React.FC = () => {
  const model = useCreateTeamLogic();
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <CreateTeamHeader onBack={() => model.navigate(-1)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TeamBasicsCard model={model} />
          <TeamMembersCard
            availableAgents={model.availableAgents}
            selectedAgents={model.selectedAgents}
            onToggleAgent={model.toggleAgent}
            onCreateAgent={() => model.navigate('/create-agent')}
          />
        </div>

        <div className="space-y-4">
          <TeamSummaryCard
            name={model.name}
            description={model.description}
            selectedAgents={model.selectedAgents}
            availableAgents={model.availableAgents}
          />
          <CreateTeamActions
            createError={model.createError}
            canCreate={model.canCreate}
            onCreate={model.handleCreate}
            onDiscard={() => model.navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateTeamPage;
