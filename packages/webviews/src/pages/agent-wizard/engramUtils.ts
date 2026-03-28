import type { AgentMcpServerForm } from '@/models';

const ENGRAM_MCP: AgentMcpServerForm = { id: 'engram', command: 'engram', args: 'mcp', env: '' };

const isAutoInjectedEngramEntry = (s: AgentMcpServerForm) =>
  s.id === 'engram' && s.command === 'engram' && s.args === 'mcp';

export const addEngramMcpServer = (prev: AgentMcpServerForm[]): AgentMcpServerForm[] => {
  if (prev.some((s) => s.id === 'engram')) return prev;
  return [...prev, ENGRAM_MCP];
};

export const removeEngramMcpServer = (prev: AgentMcpServerForm[]): AgentMcpServerForm[] =>
  prev.filter((s) => !isAutoInjectedEngramEntry(s));

export const detectEngramEnabled = (agent: { mcpServers?: Array<{ id: string }> }): boolean =>
  (agent.mcpServers ?? []).some((s) => s.id === 'engram');
