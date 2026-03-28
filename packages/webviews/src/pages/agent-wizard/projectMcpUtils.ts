import type { AgentMcpServerForm } from '@/models';
import type { ProjectMcpServer } from '@/models/dashboard';

/** Convert a detected project MCP server to the form shape used by the wizard. */
const toFormEntry = (server: ProjectMcpServer): AgentMcpServerForm => ({
  id: server.id,
  command: server.command,
  args: (server.args ?? []).join('\n'),
  env: server.env ? JSON.stringify(server.env, null, 2) : '',
});

/** Add a project MCP server to the servers array if not already present (by id). */
export const addProjectMcpServer = (
  prev: AgentMcpServerForm[],
  server: ProjectMcpServer,
): AgentMcpServerForm[] => {
  if (prev.some((s) => s.id === server.id)) return prev;
  return [...prev, toFormEntry(server)];
};

/** Remove a project MCP server from the servers array by id. */
export const removeProjectMcpServer = (
  prev: AgentMcpServerForm[],
  id: string,
): AgentMcpServerForm[] => prev.filter((s) => s.id !== id);

/** Returns the set of project MCP server ids that are currently enabled in the mcpServers array. */
export const detectEnabledProjectMcpIds = (
  mcpServers: AgentMcpServerForm[],
  projectMcpServers: ProjectMcpServer[],
): Set<string> => {
  const projectIds = new Set(projectMcpServers.map((s) => s.id));
  return new Set(mcpServers.filter((s) => projectIds.has(s.id)).map((s) => s.id));
};
