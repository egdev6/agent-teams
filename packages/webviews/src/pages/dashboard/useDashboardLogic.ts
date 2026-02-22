import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats, MessageType } from '../../types';

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  totalAgents: '—',
  specCount: '—',
  validSpecs: '—',
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  warnings: ['No se pudo cargar el estado inicial del dashboard.'],
  gatingReasons: {
    manageTeams: 'Requiere Profile Config',
    createAgent: 'Requiere Profile Config',
    browseKits: 'Requiere Profile Config',
    browseSkills: 'Requiere Profile Config',
    syncAgents: 'Requiere Profile Config',
  },
  agents: [],
  globalCatalog: {
    teams: [],
    agents: [],
    skills: [],
    kits: [],
  },
  bindings: {
    teamId: null,
    agentIds: [],
    skillIds: [],
    kitIds: [],
  },
};

type HostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | { type: 'syncResult'; success: boolean; error?: string }
  | { type: 'syncAgents' };

declare global {
  interface Window {
    __INITIAL_STATE__?: DashboardStats;
  }
}

export const useDashboardLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedGlobalTeamId, setSelectedGlobalTeamId] = useState<string>('');
  const [selectedGlobalAgentIds, setSelectedGlobalAgentIds] = useState<string[]>([]);
  const [selectedGlobalSkillIds, setSelectedGlobalSkillIds] = useState<string[]>([]);
  const [selectedGlobalKitIds, setSelectedGlobalKitIds] = useState<string[]>([]);

  const postMessage = useCallback((message: MessageType) => {
    vscode.postMessage(message);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<HostMessage>) => {
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

  useEffect(() => {
    setSelectedGlobalTeamId(stats.bindings.teamId ?? '');
    setSelectedGlobalAgentIds(stats.bindings.agentIds);
    setSelectedGlobalSkillIds(stats.bindings.skillIds);
    setSelectedGlobalKitIds(stats.bindings.kitIds);
  }, [stats.bindings]);

  const profileConfigured = stats.hasProfile && stats.profileStatus === 'Active';
  const hasActiveTeam = Boolean(stats.activeTeamId);
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
    createAgent: {
      enabled: !stats.gatingReasons.createAgent,
      reason: stats.gatingReasons.createAgent,
      onClick: () => navigate('/create-agent'),
    },
    browseKits: {
      enabled: !stats.gatingReasons.browseKits,
      reason: stats.gatingReasons.browseKits,
      onClick: () => navigate('/kit-browser'),
    },
    browseSkills: {
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

  const saveGlobalBindings = () =>
    postMessage({
      type: 'saveGlobalBindings',
      teamId: selectedGlobalTeamId || null,
      agentIds: selectedGlobalAgentIds,
      skillIds: selectedGlobalSkillIds,
      kitIds: selectedGlobalKitIds,
    });

  return {
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
  };
};
