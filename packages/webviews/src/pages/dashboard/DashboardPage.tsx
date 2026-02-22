/**
 * Dashboard Page
 * Main landing page showing stats and quick actions
 */
import { AgentsListCard } from './components/AgentsListCard';
import { ConfigureProjectCard } from './components/ConfigureProjectCard';
import { GlobalCatalogBindingsCard } from './components/GlobalCatalogBindingsCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { StatsGrid } from './components/StatsGrid';
import { SyncErrorDialog } from './components/SyncErrorDialog';
import { TeamContextCard } from './components/TeamContextCard';
import { useDashboardLogic } from './useDashboardLogic';

const DashboardPage: React.FC = () => {
  const {
    navigate,
    stats,
    syncError,
    setSyncError,
    profileConfigured,
    hasActiveTeam,
    visibleAgents,
    actionState,
    selectedGlobalTeamId,
    setSelectedGlobalTeamId,
    selectedGlobalAgentIds,
    setSelectedGlobalAgentIds,
    selectedGlobalSkillIds,
    setSelectedGlobalSkillIds,
    selectedGlobalKitIds,
    setSelectedGlobalKitIds,
    postMessage,
    saveGlobalBindings,
  } = useDashboardLogic();

  const handleEditProfile = () => navigate('/profile-editor');
  const handleManageTeams = () => navigate('/team-manager');
  const handleCreateAgent = () => navigate('/create-agent');
  const handleEditAgent = (agentId: string) => navigate(`/edit-agent/${agentId}`);
  const handleSetActiveTeam = (teamId: string | null) =>
    postMessage({ type: 'setActiveTeam', teamId });

  return (
    <div className="space-y-6 animate-fade-in">
      {!profileConfigured && <ConfigureProjectCard onEditProfile={handleEditProfile} />}

      {profileConfigured && (
        <AgentsListCard
          hasActiveTeam={hasActiveTeam}
          activeTeamId={stats.activeTeamId}
          visibleAgents={visibleAgents}
          agents={stats.agents}
          manageTeamsEnabled={actionState.manageTeams.enabled}
          manageTeamsReason={actionState.manageTeams.reason}
          createAgentEnabled={actionState.createAgent.enabled}
          createAgentReason={actionState.createAgent.reason}
          onManageTeams={handleManageTeams}
          onCreateAgent={handleCreateAgent}
          onEditAgent={handleEditAgent}
        />
      )}

      {profileConfigured && (
        <TeamContextCard
          teams={stats.teams}
          activeTeamId={stats.activeTeamId}
          teamContext={stats.teamContext}
          onSetActiveTeam={handleSetActiveTeam}
          onManageTeams={handleManageTeams}
        />
      )}

      {profileConfigured && (
        <GlobalCatalogBindingsCard
          catalog={stats.globalCatalog}
          selectedTeamId={selectedGlobalTeamId}
          selectedAgentIds={selectedGlobalAgentIds}
          selectedSkillIds={selectedGlobalSkillIds}
          selectedKitIds={selectedGlobalKitIds}
          onSelectTeamId={setSelectedGlobalTeamId}
          onSelectAgentIds={setSelectedGlobalAgentIds}
          onSelectSkillIds={setSelectedGlobalSkillIds}
          onSelectKitIds={setSelectedGlobalKitIds}
          onSaveBindings={saveGlobalBindings}
        />
      )}

      <QuickActionsCard
        onEditProfile={handleEditProfile}
        manageTeams={actionState.manageTeams}
        createAgent={actionState.createAgent}
        browseKits={actionState.browseKits}
        browseSkills={actionState.browseSkills}
        syncAgents={actionState.syncAgents}
      />

      <StatsGrid stats={stats} hasActiveTeam={hasActiveTeam} />

      <SyncErrorDialog syncError={syncError} onClose={() => setSyncError(null)} />
    </div>
  );
};

export default DashboardPage;
