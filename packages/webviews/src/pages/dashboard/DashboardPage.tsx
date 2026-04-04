/**
 * Dashboard Page
 * Main landing page showing stats and quick actions
 */

import { useDashboard } from '@/contexts/DashboardContext';
import { AgentsListCard } from './components/AgentsListCard';
import { ConfigureProjectCard } from './components/ConfigureProjectCard';
import { EngramBanner } from './components/EngramBanner';
import { OrphanNotificationCard } from './components/OrphanNotificationCard';
import { QuickActionsDropdown } from './components/QuickActionsDropdown';
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
    visibleAgents,
    actionState,
    syncing,
    setupEngram,
    configureProjectWithAI,
    importingOrphans,
    preserveOrphans,
    openConsultant,
    activeTeamId,
    isOptimistic,
  } = useDashboardLogic();
  const { designAgentWithAI } = useDashboardLogic();

  // Get sync state and blocking state from global context (shared across all pages)
  const { syncState, startSync, isBlocking } = useDashboard();

  // Derive pendingAgentIds from context state
  // Map agents with unsynced flag based on context's pendingAgentIds
  const pendingAgentIds = syncState.pendingAgentIds;
  const agentsWithSyncStatus = visibleAgents.map((agent) => ({
    ...agent,
    unsynced: pendingAgentIds.has(agent.id),
  }));

  const isLoading = syncState.status === 'checking' || syncState.status === 'syncing';

  // Wrap the sync action to update context state
  const handleSync = () => {
    startSync(); // Set context to 'syncing' state immediately
    actionState.syncAgents.onClick(); // Trigger backend sync
  };

  const handleEditProfile = () => navigate('/profile-editor');
  const handleCreateTeam = () => navigate('/create-team');
  const handleManageTeams = () => navigate('/team-manager');
  const handleCreateAgent = () => navigate('/create-agent');
  const handleEditAgent = (agentId: string) => navigate(`/edit-agent/${agentId}`);
  return (
    <div
      className='w-full space-y-4 animate-fade-in m-auto'
      style={{ background: 'var(--grid-background)' }}
    >
      <div className='w-full flex items-center justify-between'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-xl font-bold'>Dasboard</h1>
          <p className='text-sm text-muted-foreground'>
            Overview of your teams, agents, and activity.
          </p>
        </div>
        <QuickActionsDropdown
          onEditProfile={handleEditProfile}
          manageTeams={actionState.manageTeams}
          contextPacks={actionState.contextPacks}
          manageAgents={actionState.manageAgents}
          manageSkills={actionState.manageSkills}
          importExport={actionState.importExport}
          disabled={isBlocking}
        />
      </div>
      <StatsGrid
        stats={stats}
        hasActiveTeam={hasActiveTeam}
        engramInstalled={engramInstalled}
        engramConfigured={engramConfigured}
        activeTeamId={activeTeamId}
        isOptimistic={isOptimistic}
      />
      {!engramInstalled ||
      !engramConfigured ||
      (stats.validOrphanAgents?.length ?? 0) + (stats.invalidOrphanAgents?.length ?? 0) > 0 ? (
        <div className='w-full flex items-center gap-4'>
          {(!engramInstalled || !engramConfigured) && (
            <div className='flex-1'>
              <EngramBanner
                engramInstalled={engramInstalled}
                engramConfigured={engramConfigured}
                onSetup={setupEngram}
              />
            </div>
          )}
          {stats &&
            (stats.validOrphanAgents?.length ?? 0) + (stats.invalidOrphanAgents?.length ?? 0) >
              0 && (
              <div className='flex-1'>
                <OrphanNotificationCard
                  validOrphanAgents={stats.validOrphanAgents}
                  validOrphanTeams={stats.validOrphanTeams}
                  invalidOrphanAgents={stats.invalidOrphanAgents}
                  invalidOrphanTeams={stats.invalidOrphanTeams}
                  importing={importingOrphans}
                  onImport={preserveOrphans}
                />
              </div>
            )}
        </div>
      ) : null}
      {profileConfigured && (
        <div className='w-full'>
          <SyncStatusCard
            status={syncState.status}
            syncTime={syncState.lastSyncTime || stats.syncTime}
            pendingChanges={syncState.pendingChanges}
            syncEnabled={actionState.syncAgents.enabled}
            syncReason={actionState.syncAgents.reason}
            syncing={syncing || isLoading}
            syncError={syncState.error || stats.syncError}
            onSync={handleSync}
          />
        </div>
      )}
      {!profileConfigured && (
        <ConfigureProjectCard
          onEditProfile={handleEditProfile}
          onOpenAISetup={configureProjectWithAI}
        />
      )}
      {profileConfigured && !hasActiveTeam && (
        <AgentsListCard
          hasActiveTeam={hasActiveTeam}
          activeTeamId={activeTeamId}
          createTeamEnabled={actionState.manageTeams.enabled}
          createTeamReason={actionState.manageTeams.reason}
          onCreateTeam={handleCreateTeam}
          onManageTeams={handleManageTeams}
        />
      )}
      {profileConfigured && hasActiveTeam && (
        <TeamAgentsCard
          agents={agentsWithSyncStatus}
          activeTeamId={activeTeamId}
          createAgentEnabled={actionState.createAgent.enabled}
          createAgentReason={actionState.createAgent.reason}
          onCreateAgent={handleCreateAgent}
          onEditAgent={handleEditAgent}
          onDesignWithAI={designAgentWithAI}
          openConsultant={openConsultant}
          disabled={isBlocking}
        />
      )}
      <SyncErrorDialog syncError={syncError} onClose={() => setSyncError(null)} />
    </div>
  );
};

export default DashboardPage;
