import { vscode } from '@lib/vscode';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '../../types';

export type AgentItem = {
  id: string;
  name: string;
  role?: 'worker' | 'router' | 'orchestrator';
  scope?: 'team' | 'global';
  teamId?: string | null;
};

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

export const useAgentManagerLogic = () => {
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

  const agentsById = useMemo(
    () =>
      new Map(
        stats.agents.map((agent) => [
          agent.id,
          {
            role: agent.role,
            scope: agent.scope,
            teamId: agent.teamId,
          },
        ]),
      ),
    [stats.agents],
  );

  const agents: AgentItem[] = useMemo(
    () =>
      stats.globalCatalog.agents
        .map((agent) => {
          const localDetails = agentsById.get(agent.id);
          return {
            id: agent.id,
            name: agent.name,
            role: localDetails?.role ?? agent.role,
            scope: localDetails?.scope,
            teamId: localDetails?.teamId,
          } satisfies AgentItem;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [agentsById, stats.globalCatalog.agents],
  );

  return {
    navigate,
    agents,
  };
};
