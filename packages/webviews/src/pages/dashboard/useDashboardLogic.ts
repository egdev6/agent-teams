import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext';
import type { DashboardHostMessage, MessageType } from '../../models';

export const useDashboardLogic = () => {
  const navigate = useNavigate();
  const { stats, optimisticActiveTeamId } = useDashboard();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [importingOrphans, setImportingOrphans] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const postMessage = useCallback((message: MessageType) => {
    vscode.postMessage(message);
  }, []);

  // Listen for non-stats messages (sync results, orphans, etc.)
  useEffect(() => {
    const handleMessage = (event: MessageEvent<DashboardHostMessage>) => {
      const message = event.data;

      // Stats are handled by DashboardContext, only handle other message types here
      if (message.type === 'syncResult' && !message.success) {
        setSyncError(message.error || 'Unknown error during sync');
        setSyncing(false);
      } else if (message.type === 'syncResult' && message.success) {
        setSyncing(false);
      } else if (message.type === 'preserveOrphansResult') {
        setImportingOrphans(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const profileConfigured = stats.hasProfile && stats.profileStatus === 'Active';
  const effectiveActiveTeamId = optimisticActiveTeamId ?? stats.activeTeamId;
  const hasActiveTeam = Boolean(effectiveActiveTeamId);
  const isEmptyProject = !stats.hasProfile && stats.totalAgents === 0 && stats.totalTeams === 0;

  // Debug log when effective active team changes
  useEffect(() => {
    console.log('[Dashboard] Active team state:', {
      optimistic: optimisticActiveTeamId,
      backend: stats.activeTeamId,
      effective: effectiveActiveTeamId,
    });
  }, [optimisticActiveTeamId, stats.activeTeamId, effectiveActiveTeamId]);
  const engramInstalled = stats.engramInstalled;
  const engramConfigured = stats.engramConfigured;
  const visibleAgents = useMemo(() => {
    if (!hasActiveTeam) return [];
    return stats.agents;
  }, [hasActiveTeam, stats.agents]);

  const actionState = {
    manageTeams: {
      enabled: !stats.gatingReasons.manageTeams,
      reason: stats.gatingReasons.manageTeams,
      onClick: () => navigate('/team-manager'),
    },
    contextPacks: {
      enabled: true,
      reason: undefined,
      onClick: () => navigate('/context-packs'),
    },
    createAgent: {
      enabled: !stats.gatingReasons.createAgent,
      reason: stats.gatingReasons.createAgent,
      onClick: () => navigate('/create-agent'),
    },
    browseSkills: {
      enabled: !stats.gatingReasons.browseSkills,
      reason: stats.gatingReasons.browseSkills,
      onClick: () => navigate('/skills-browser'),
    },
    manageAgents: {
      enabled: !stats.gatingReasons.manageAgents,
      reason: stats.gatingReasons.manageAgents,
      onClick: () => navigate('/agents'),
    },
    manageSkills: {
      enabled: !stats.gatingReasons.browseSkills,
      reason: stats.gatingReasons.browseSkills,
      onClick: () => navigate('/skills-browser'),
    },
    syncAgents: {
      enabled: !stats.gatingReasons.syncAgents,
      reason: stats.gatingReasons.syncAgents,
      onClick: () => {
        setSyncing(true);
        postMessage({ type: 'syncAgents' });
      },
    },
    importExport: {
      enabled: true,
      reason: undefined,
      onClick: () => navigate('/import-export'),
    },
  };

  return {
    navigate,
    stats,
    syncError,
    setSyncError,
    profileConfigured,
    hasActiveTeam,
    isEmptyProject,
    engramInstalled,
    visibleAgents,
    actionState,
    postMessage,
    engramConfigured,
    syncing,
    setupEngram: () => postMessage({ type: 'setupEngram' }),
    configureProjectWithAI: () => postMessage({ type: 'openProjectConfiguratorChat' }),
    designAgentWithAI: () => postMessage({ type: 'openAgentDesignerChat' }),
    openConsultant: () => postMessage({ type: 'openConsultantChat' }),
    importingOrphans,
    preserveOrphans: () => {
      setImportingOrphans(true);
      postMessage({ type: 'preserveOrphans' });
    },
    activeTeamId: effectiveActiveTeamId,
    isOptimistic: optimisticActiveTeamId !== null,
  };
};
