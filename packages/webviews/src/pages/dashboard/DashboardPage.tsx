/**
 * Dashboard Page
 * Main landing page showing stats and quick actions
 */
import { AgentsListCard } from './components/AgentsListCard';
import { ConfigureProjectCard } from './components/ConfigureProjectCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { StatsGrid } from './components/StatsGrid';
import { SyncErrorDialog } from './components/SyncErrorDialog';
import { TeamAgentsCard } from './components/TeamAgentsCard';
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
  } = useDashboardLogic();

  const handleEditProfile = () => navigate('/profile-editor');
  const handleCreateTeam = () => navigate('/create-team');
  const handleOpenGlobalCatalogBindings = () => navigate('/global-catalog-bindings');
  const handleCreateAgent = () => navigate('/create-agent');
  const handleEditAgent = (agentId: string) => navigate(`/edit-agent/${agentId}`);

  return (
    <div className="space-y-6 animate-fade-in">
      <StatsGrid stats={stats} hasActiveTeam={hasActiveTeam} />

      {!profileConfigured && <ConfigureProjectCard onEditProfile={handleEditProfile} />}

      {profileConfigured && !hasActiveTeam && (
        <AgentsListCard
          hasActiveTeam={hasActiveTeam}
          activeTeamId={stats.activeTeamId}
          createTeamEnabled={actionState.manageTeams.enabled}
          createTeamReason={actionState.manageTeams.reason}
          selectTeamEnabled={actionState.globalCatalogBindings.enabled}
          selectTeamReason={actionState.globalCatalogBindings.reason}
          onCreateTeam={handleCreateTeam}
          onSelectExisting={handleOpenGlobalCatalogBindings}
        />
      )}

      {profileConfigured && hasActiveTeam && (
        <TeamAgentsCard
          agents={visibleAgents}
          createAgentEnabled={actionState.createAgent.enabled}
          createAgentReason={actionState.createAgent.reason}
          onCreateAgent={handleCreateAgent}
          onEditAgent={handleEditAgent}
        />
      )}

      <QuickActionsCard
        onEditProfile={handleEditProfile}
        manageTeams={actionState.manageTeams}
        globalCatalogBindings={actionState.globalCatalogBindings}
        contextPacks={actionState.contextPacks}
        syncAgents={actionState.syncAgents}
      />

      <SyncErrorDialog syncError={syncError} onClose={() => setSyncError(null)} />
    </div>
  );
};

export default DashboardPage;
