import { GlobalCatalogBindingsCard } from '../../dashboard/components/GlobalCatalogBindingsCard';
import type { useGlobalCatalogBindingsLogic } from '../useGlobalCatalogBindingsLogic';

type GlobalCatalogBindingsViewProps = {
  model: ReturnType<typeof useGlobalCatalogBindingsLogic>;
};

export const GlobalCatalogBindingsView: React.FC<GlobalCatalogBindingsViewProps> = ({ model }) => {
  if (!model.profileConfigured) {
    return (
      <div className="rounded-md border p-4">
        <p className="text-sm text-muted-foreground">
          First configure the project profile to manage global catalog bindings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <GlobalCatalogBindingsCard
        catalog={model.stats.globalCatalog}
        selectedTeamId={model.selectedGlobalTeamId}
        selectedAgentIds={model.selectedGlobalAgentIds}
        selectedSkillIds={model.selectedGlobalSkillIds}
        onSelectTeamId={model.setSelectedGlobalTeamId}
        onSelectAgentIds={model.setSelectedGlobalAgentIds}
        onSelectSkillIds={model.setSelectedGlobalSkillIds}
        onSaveBindings={model.saveGlobalBindings}
      />
    </div>
  );
};
