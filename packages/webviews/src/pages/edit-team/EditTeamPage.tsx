import { PageTitle } from '@/components/shared/PageTitle';
import { EditTeamActions } from './components/EditTeamActions';
import { EditTeamBasicsCard } from './components/EditTeamBasicsCard';
import { EditTeamMembersCard } from './components/EditTeamMembersCard';
import { EditTeamSummaryCard } from './components/EditTeamSummaryCard';
import { useEditTeamLogic } from './useEditTeamLogic';

const EditTeamPage: React.FC = () => {
  const model = useEditTeamLogic();
  return (
    <div className='mx-auto max-w-4xl space-y-6 animate-fade-in'>
      <PageTitle
        title='Edit Team'
        description='Modify the settings and configurations of your team.'
      />

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <EditTeamBasicsCard model={model} />
          <EditTeamMembersCard
            availableAgents={model.availableAgents}
            selectedAgents={model.selectedAgents}
            onToggleAgent={model.toggleAgent}
            onCreateAgent={() => model.navigate('/create-agent')}
          />
        </div>

        <div>
          <div className='sticky top-18 flex flex-col gap-4'>
            <EditTeamSummaryCard
              name={model.name}
              description={model.description}
              selectedAgents={model.selectedAgents}
              availableAgents={model.availableAgents}
            />
            <EditTeamActions
              saveError={model.saveError}
              canSave={model.isValid}
              isActiveTeam={model.isActiveTeam}
              onSave={model.handleSave}
              onCancel={() => model.navigate(-1)}
              onDelete={model.handleDelete}
              onSetActiveTeam={model.handleSetActiveTeam}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTeamPage;
