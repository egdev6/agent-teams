import { vscode } from '@lib/vscode';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats, TeamItem, TeamManagerHostMessage } from '../../models';

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  engramInstalled: false,
  engramConfigured: false,
  totalAgents: 0,
  totalTeams: 0,
  agentYamlCount: 0,
  validAgentYamlCount: 0,
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  syncNeeded: false,
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

export const useTeamManagerLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);

  useEffect(() => {
    const onMessage = (event: MessageEvent<TeamManagerHostMessage>) => {
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
        unsynced: team.unsynced,
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
      localOnly: team.localOnly,
      unsynced: localDetails?.unsynced,
    };
  });

  return {
    navigate,
    teams,
    activeTeamId: stats.activeTeamId,
    activateTeam: (teamId: string) => {
      vscode.postMessage({ type: 'setActiveTeam', teamId });
    },
  };
};
