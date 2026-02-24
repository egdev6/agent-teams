import { vscode } from '@lib/vscode';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '../../types';

export type TeamItem = {
  id: string;
  name: string;
  description?: string;
  enabledAgentsCount?: number;
  enablesAllAgents?: boolean;
};

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
  warnings: [],
  gatingReasons: {},
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

type HostMessage = { type: 'updateStats'; stats: DashboardStats };

export const useTeamManagerLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === 'updateStats') {
        setStats(message.stats);
      }
    };

    window.addEventListener('message', onMessage);
    vscode.postMessage({ type: 'refresh' });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const teamsById = new Map(
    stats.teams.map((team) => [
      team.id,
      {
        description: team.description,
        enabledAgentsCount: team.enabledAgentsCount,
        enablesAllAgents: team.enablesAllAgents,
      },
    ]),
  );

  const teams: TeamItem[] = stats.globalCatalog.teams.map((team) => {
    const localDetails = teamsById.get(team.id);
    return {
      id: team.id,
      name: team.name,
      description: localDetails?.description,
      enabledAgentsCount: localDetails?.enabledAgentsCount,
      enablesAllAgents: localDetails?.enablesAllAgents,
    };
  });

  return {
    navigate,
    teams,
    activeTeamId: stats.activeTeamId,
  };
};
