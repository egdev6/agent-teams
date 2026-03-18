import { vscode } from '@lib/vscode';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgentItem, AgentManagerHostMessage, DashboardStats } from '../../models';

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

export const useAgentManagerLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);

  useEffect(() => {
    const onMessage = (event: MessageEvent<AgentManagerHostMessage>) => {
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
            description: agent.description,
            intents: agent.intents,
          },
        ]),
      ),
    [stats.agents],
  );

  const teamIdsByAgent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const team of stats.teams) {
      if (!team.agentIds) continue;
      for (const agentId of team.agentIds) {
        const existing = map.get(agentId);
        if (existing) {
          existing.push(team.id);
        } else {
          map.set(agentId, [team.id]);
        }
      }
    }
    return map;
  }, [stats.teams]);

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
            teamIds: teamIdsByAgent.get(agent.id) ?? agent.teamIds ?? [],
            description: localDetails?.description ?? agent.description,
            intents: localDetails?.intents ?? agent.intents,
          } satisfies AgentItem;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [agentsById, teamIdsByAgent, stats.globalCatalog.agents],
  );

  return {
    navigate,
    agents,
  };
};
