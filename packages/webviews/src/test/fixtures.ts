import type { DashboardStats } from '../models/dashboard';

/** Estado base vacío: sin perfil, sin teams, sin agentes */
export const NO_PROFILE_STATS: DashboardStats = {
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
  gatingReasons: {
    manageTeams: 'Requires Profile Config',
    createAgent: 'Requires Profile Config',
    browseSkills: 'Requires Profile Config',
    manageAgents: 'Requires Profile Config',
    manageSkills: 'Requires Profile Config',
    syncAgents: 'Requires Profile Config',
  },
  agents: [],
  globalCatalog: { teams: [], agents: [], skills: [] },
  bindings: { teamId: null, agentIds: [], skillIds: [] },
};

/** Estado con perfil configurado pero sin teams */
export const PROFILE_NO_TEAMS_STATS: DashboardStats = {
  ...NO_PROFILE_STATS,
  hasProfile: true,
  profileStatus: 'Active',
  engramInstalled: true,
  engramConfigured: true,
  syncStatus: 'NOT_SYNCED',
  teamContext: 'no_teams',
  gatingReasons: {},
  projectMcpServers: [
    { id: 'my-mcp-tool', command: 'npx', args: ['-y', 'my-mcp-tool'] },
    {
      id: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    },
  ],
};

/** Estado con perfil + team activo pero sin agentes */
export const PROFILE_WITH_TEAM_NO_AGENTS_STATS: DashboardStats = {
  ...PROFILE_NO_TEAMS_STATS,
  totalTeams: 1,
  teamsCount: 1,
  teams: [{ id: 'my-team', name: 'My Team' }],
  activeTeamId: 'my-team',
  teamContext: 'active_team',
  bindings: { teamId: 'my-team', agentIds: [], skillIds: [] },
};

/** Estado completo: perfil + team + agentes — activa ConsultantCard */
export const FULL_SETUP_STATS: DashboardStats = {
  ...PROFILE_WITH_TEAM_NO_AGENTS_STATS,
  totalAgents: 2,
  agentYamlCount: 2,
  validAgentYamlCount: 2,
  syncStatus: 'SUCCESS',
  syncTime: '2026-03-22T10:00:00Z',
  agents: [
    {
      id: 'backend-worker',
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks',
      unsynced: false,
    } as any,
    {
      id: 'frontend-worker',
      name: 'Frontend Worker',
      role: 'worker',
      description: 'Handles frontend React tasks',
      unsynced: false,
    } as any,
  ],
  bindings: { teamId: 'my-team', agentIds: ['backend-worker', 'frontend-worker'], skillIds: [] },
};

/** Estado con agente no sincronizado (unsynced badge) */
export const UNSYNCED_AGENT_STATS: DashboardStats = {
  ...FULL_SETUP_STATS,
  syncStatus: 'WARNING',
  syncNeeded: true,
  agents: [
    {
      id: 'backend-worker',
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks',
      unsynced: true,
    } as any,
    {
      id: 'frontend-worker',
      name: 'Frontend Worker',
      role: 'worker',
      description: 'Handles frontend React tasks',
      unsynced: false,
    } as any,
  ],
  globalCatalog: {
    teams: [],
    agents: [
      {
        id: 'backend-worker',
        name: 'Backend Worker',
        role: 'worker',
        description: 'Handles backend API tasks',
      },
      {
        id: 'frontend-worker',
        name: 'Frontend Worker',
        role: 'worker',
        description: 'Handles frontend React tasks',
      },
    ],
    skills: [],
  },
};

/** Estado con agentes de los tres roles (router, orchestrator, worker) */
export const MULTI_ROLE_AGENTS_STATS: DashboardStats = {
  ...FULL_SETUP_STATS,
  totalAgents: 3,
  agentYamlCount: 3,
  validAgentYamlCount: 3,
  agents: [
    {
      id: 'main-router',
      name: 'Main Router',
      role: 'router',
      description: 'Routes requests',
      unsynced: false,
    } as any,
    {
      id: 'feature-orchestrator',
      name: 'Feature Orchestrator',
      role: 'orchestrator',
      description: 'Orchestrates features',
      unsynced: false,
    } as any,
    {
      id: 'backend-worker',
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend tasks',
      unsynced: false,
    } as any,
  ],
  globalCatalog: {
    teams: [],
    agents: [
      { id: 'main-router', name: 'Main Router', role: 'router', description: 'Routes requests' },
      {
        id: 'feature-orchestrator',
        name: 'Feature Orchestrator',
        role: 'orchestrator',
        description: 'Orchestrates features',
      },
      {
        id: 'backend-worker',
        name: 'Backend Worker',
        role: 'worker',
        description: 'Handles backend tasks',
      },
    ],
    skills: [],
  },
  bindings: {
    teamId: 'my-team',
    agentIds: ['main-router', 'feature-orchestrator', 'backend-worker'],
    skillIds: [],
  },
};

/** Estado con huérfanos detectados (un agente válido para importar) */
export const ORPHAN_STATS: DashboardStats = {
  ...FULL_SETUP_STATS,
  validOrphanAgents: [{ id: 'orphan-agent', name: 'Orphan Agent', errors: [] }],
  validOrphanTeams: [],
  invalidOrphanAgents: [],
  invalidOrphanTeams: [],
};

/** Estado con dos equipos, sin equipo activo */
export const TWO_TEAMS_NO_ACTIVE_STATS: DashboardStats = {
  ...FULL_SETUP_STATS,
  totalTeams: 2,
  teamsCount: 2,
  activeTeamId: null,
  teams: [
    { id: 'team-alpha', name: 'Team Alpha' },
    { id: 'team-beta', name: 'Team Beta' },
  ],
  globalCatalog: {
    teams: [
      { id: 'team-alpha', name: 'Team Alpha' },
      { id: 'team-beta', name: 'Team Beta' },
    ],
    agents: [],
    skills: [],
  },
  bindings: { teamId: null, agentIds: [], skillIds: [] },
};

/** Estado con equipo no sincronizado y equipo local (badges de estado) */
export const UNSYNCED_TEAM_STATS: DashboardStats = {
  ...FULL_SETUP_STATS,
  totalTeams: 2,
  teamsCount: 2,
  teams: [
    { id: 'my-team', name: 'My Team', unsynced: true },
    { id: 'local-team', name: 'Local Team', unsynced: false },
  ],
  globalCatalog: {
    teams: [
      { id: 'my-team', name: 'My Team' },
      { id: 'local-team', name: 'Local Team', localOnly: true },
    ],
    agents: [],
    skills: [],
  },
};
