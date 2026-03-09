/**
 * Dashboard Page
 * Main landing page showing stats and quick actions
 */
import { PageTitle } from '@/components/shared/PageTitle';
import { AgentsListCard } from './components/AgentsListCard';
import { ConfigureProjectCard } from './components/ConfigureProjectCard';
import { EngramBanner } from './components/EngramBanner';
import { QuickActionsCard } from './components/QuickActionsCard';
import { StatsGrid } from './components/StatsGrid';
import { SyncErrorDialog } from './components/SyncErrorDialog';
import { SyncStatusCard } from './components/SyncStatusCard';
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
    engramInstalled,
    engramConfigured,
    syncNeeded,
    pendingChanges,
    visibleAgents,
    actionState,
    setupEngram,
  } = useDashboardLogic();

  const pendingChangesForCard = pendingChanges
    ? {
        deleted: 0,
        ...pendingChanges,
      }
    : undefined;

  const handleEditProfile = () => navigate('/profile-editor');
  const handleCreateTeam = () => navigate('/create-team');
  const handleManageTeams = () => navigate('/team-manager');
  const handleCreateAgent = () => navigate('/create-agent');
  const handleEditAgent = (agentId: string) => navigate(`/edit-agent/${agentId}`);

  return (
    <div className='w-full space-y-6 animate-fade-in m-auto'>
      <PageTitle title='Dasboard' description='Overview of your teams, agents, and activity.' />

      <StatsGrid
        stats={stats}
        hasActiveTeam={hasActiveTeam}
        engramInstalled={engramInstalled}
        engramConfigured={engramConfigured}
      />

      {profileConfigured && (
        <SyncStatusCard
          syncStatus={stats.syncStatus}
          syncTime={stats.syncTime}
          syncNeeded={syncNeeded}
          pendingChanges={pendingChangesForCard}
          syncEnabled={actionState.syncAgents.enabled}
          syncReason={actionState.syncAgents.reason}
          onSync={actionState.syncAgents.onClick}
        />
      )}

      {(!engramInstalled || !engramConfigured) && (
        <EngramBanner
          engramInstalled={engramInstalled}
          engramConfigured={engramConfigured}
          onSetup={setupEngram}
        />
      )}

      {!profileConfigured && <ConfigureProjectCard onEditProfile={handleEditProfile} />}

      {profileConfigured && !hasActiveTeam && (
        <AgentsListCard
          hasActiveTeam={hasActiveTeam}
          activeTeamId={stats.activeTeamId}
          createTeamEnabled={actionState.manageTeams.enabled}
          createTeamReason={actionState.manageTeams.reason}
          onCreateTeam={handleCreateTeam}
          onManageTeams={handleManageTeams}
        />
      )}

      {profileConfigured && hasActiveTeam && (
        <TeamAgentsCard
          agents={visibleAgents}
          activeTeamId={stats.activeTeamId}
          createAgentEnabled={actionState.createAgent.enabled}
          createAgentReason={actionState.createAgent.reason}
          onCreateAgent={handleCreateAgent}
          onEditAgent={handleEditAgent}
        />
      )}

      <QuickActionsCard
        onEditProfile={handleEditProfile}
        manageTeams={actionState.manageTeams}
        contextPacks={actionState.contextPacks}
        manageAgents={actionState.manageAgents}
        manageSkills={actionState.manageSkills}
        importExport={actionState.importExport}
      />

      <SyncErrorDialog syncError={syncError} onClose={() => setSyncError(null)} />
    </div>
  );
};

export default DashboardPage;
