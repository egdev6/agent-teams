/**
 * Dashboard Page
 * Main landing page showing stats and quick actions
 */

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
    syncNeeded,
    pendingChanges,
    visibleAgents,
    actionState,
    setupEngram,
    configureProjectWithAI,
    importingOrphans,
    preserveOrphans,
    openConsultant,
  } = useDashboardLogic();
  const { designAgentWithAI } = useDashboardLogic();
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
        />
      </div>
      <StatsGrid
        stats={stats}
        hasActiveTeam={hasActiveTeam}
        engramInstalled={engramInstalled}
        engramConfigured={engramConfigured}
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
            syncStatus={stats.syncStatus}
            syncTime={stats.syncTime}
            syncNeeded={syncNeeded}
            pendingChanges={pendingChangesForCard}
            syncEnabled={actionState.syncAgents.enabled}
            syncReason={actionState.syncAgents.reason}
            onSync={actionState.syncAgents.onClick}
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
          onDesignWithAI={designAgentWithAI}
          openConsultant={openConsultant}
        />
      )}
      <SyncErrorDialog syncError={syncError} onClose={() => setSyncError(null)} />
    </div>
  );
};

export default DashboardPage;
