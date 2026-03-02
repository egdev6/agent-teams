import { PageTitle } from '../../components/shared/PageTitle';
import { CreateTeamActions } from './components/CreateTeamActions';
import { TeamBasicsCard } from './components/TeamBasicsCard';
import { TeamMembersCard } from './components/TeamMembersCard';
import { TeamSummaryCard } from './components/TeamSummaryCard';
import { useCreateTeamLogic } from './useCreateTeamLogic';

const CreateTeamPage: React.FC = () => {
  const model = useCreateTeamLogic();
  return (
    <div className='w-full space-y-6 animate-fade-in'>
      <PageTitle
        title='Create New Team'
        description='Fill out the details below to create a new team.'
      />

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <TeamBasicsCard model={model} />
          <TeamMembersCard
            availableAgents={model.availableAgents}
            selectedAgents={model.selectedAgents}
            onToggleAgent={model.toggleAgent}
            onCreateAgent={() => model.navigate('/create-agent')}
          />
        </div>

        <div>
          <div className='sticky top-18 flex flex-col gap-4'>
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
    </div>
  );
};

export default CreateTeamPage;
