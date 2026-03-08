import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardHostMessage, DashboardStats, MessageType } from '../../models';

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  engramInstalled: false,
  engramConfigured: false,
  totalAgents: 0,
  agentYamlCount: 0,
  validAgentYamlCount: 0,
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  syncNeeded: false,
  warnings: ['Could not load the initial dashboard state.'],
  gatingReasons: {
    manageTeams: 'Requires Profile Config',
    createAgent: 'Requires Profile Config',
    browseSkills: 'Requires Profile Config',
    manageAgents: 'Requires Profile Config',
    manageSkills: 'Requires Profile Config',
    syncAgents: 'Requires Profile Config',
  },
  agents: [],
  globalCatalog: {
    teams: [],
    agents: [],
    skills: [],
  },
  bindings: {
    teamId: null,
    agentIds: [],
    skillIds: [],
  },
};

declare global {
  interface Window {
    __INITIAL_STATE__?: DashboardStats;
  }
}

export const useDashboardLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);
  const [syncError, setSyncError] = useState<string | null>(null);

  const postMessage = useCallback((message: MessageType) => {
    vscode.postMessage(message);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<DashboardHostMessage>) => {
      const message = event.data;
      if (message.type === 'updateStats') {
        setStats(message.stats);
      } else if (message.type === 'syncResult' && !message.success) {
        setSyncError(message.error || 'Unknown error during sync');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    postMessage({ type: 'refresh' });
  }, [postMessage]);

  const profileConfigured = stats.hasProfile && stats.profileStatus === 'Active';
  const hasActiveTeam = Boolean(stats.activeTeamId);
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
      onClick: () => postMessage({ type: 'syncAgents' }),
    },
  };

  return {
    navigate,
    stats,
    syncError,
    setSyncError,
    profileConfigured,
    hasActiveTeam,
    engramInstalled,
    syncNeeded: stats.syncNeeded,
    pendingChanges: stats.pendingChanges,
    visibleAgents,
    actionState,
    postMessage,
    engramConfigured,
    setupEngram: () => postMessage({ type: 'setupEngram' }),
  };
};
