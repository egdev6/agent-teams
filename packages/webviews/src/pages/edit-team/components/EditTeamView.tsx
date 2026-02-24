import { Button } from '@components/ui/button';
import type { useEditTeamLogic } from '../useEditTeamLogic';
import { EditTeamActions } from './EditTeamActions';
import { EditTeamBasicsCard } from './EditTeamBasicsCard';
import { EditTeamHeader } from './EditTeamHeader';
import { EditTeamMembersCard } from './EditTeamMembersCard';
import { EditTeamSummaryCard } from './EditTeamSummaryCard';

type EditTeamViewProps = {
  model: ReturnType<typeof useEditTeamLogic>;
};

export const EditTeamView: React.FC<EditTeamViewProps> = ({ model }) => {
  if (model.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => model.navigate(-1)}>
          Back
        </Button>
        <p className="text-sm text-muted-foreground">Loading team...</p>
      </div>
    );
  }

  if (model.loadError) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => model.navigate(-1)}>
          Back
        </Button>
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {model.loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <EditTeamHeader onBack={() => model.navigate(-1)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <EditTeamBasicsCard model={model} />
          <EditTeamMembersCard
            availableAgents={model.availableAgents}
            selectedAgents={model.selectedAgents}
            onToggleAgent={model.toggleAgent}
            onCreateAgent={() => model.navigate('/create-agent')}
          />
        </div>

        <div className="space-y-4">
          <EditTeamSummaryCard
            name={model.name}
            description={model.description}
            selectedAgents={model.selectedAgents}
            availableAgents={model.availableAgents}
          />
          <EditTeamActions
            saveError={model.saveError}
            canSave={model.isValid}
            isSaving={model.isSaving}
            isActiveTeam={model.isActiveTeam}
            onSave={model.handleSave}
            onCancel={() => model.navigate(-1)}
            onDelete={model.handleDelete}
            onSetActiveTeam={model.handleSetActiveTeam}
          />
        </div>
      </div>
    </div>
  );
};
