import { useDashboardLogic } from '../dashboard/useDashboardLogic';

export const useGlobalCatalogBindingsLogic = () => {
  const {
    stats,
    profileConfigured,
    selectedGlobalTeamId,
    setSelectedGlobalTeamId,
    selectedGlobalAgentIds,
    setSelectedGlobalAgentIds,
    selectedGlobalSkillIds,
    setSelectedGlobalSkillIds,
    saveGlobalBindings,
  } = useDashboardLogic();

  return {
    stats,
    profileConfigured,
    selectedGlobalTeamId,
    setSelectedGlobalTeamId,
    selectedGlobalAgentIds,
    setSelectedGlobalAgentIds,
    selectedGlobalSkillIds,
    setSelectedGlobalSkillIds,
    saveGlobalBindings,
  };
};
