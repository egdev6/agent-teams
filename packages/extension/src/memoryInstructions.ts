import type { SyncTarget } from './types';

type AgentRole = 'worker' | 'orchestrator' | 'router';

/**
 * Build the ## Memory section for a synced agent markdown file.
 * Instructions are role-aware: each role has specific recall/remember triggers.
 */
export function buildMemorySection(
  role: AgentRole | string,
  domain: string,
  _target: SyncTarget,
): string {
  const lines: string[] = ['## Memory', ''];

  switch (role) {
    case 'orchestrator':
      lines.push(
        'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
        '',
        '**Recall — at session start:**',
        '- Load team state, pending delegations, and coordination patterns from previous sessions',
        '- Retrieve outcomes of past orchestration decisions',
        '',
        '**Remember — after coordination actions:**',
        '- Record team assignments, completion outcomes, and escalation decisions',
        '- Store effective coordination patterns for future reuse',
        '- Trigger: task delegated, team composition changed, escalation resolved',
      );
      break;

    case 'router':
      lines.push(
        'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
        '',
        '**Recall — before routing decisions:**',
        '- Load routing patterns and past outcomes',
        '- Retrieve agent capability mapping and recent availability',
        '',
        '**Remember — after routing decisions:**',
        '- Record routing decisions and their outcomes',
        '- Update patterns when routing leads to unexpected results',
        `- Trigger: task routed, routing override made, new agent capability discovered`,
      );
      break;

    default: // worker
      lines.push(
        'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
        '',
        `**Recall — before starting work:**`,
        `- Load past solutions and patterns for \`${domain}\` tasks`,
        '- Retrieve relevant architectural decisions from previous sessions',
        `- Query \`engram_recall\` with domain keywords + current task type`,
        '',
        '**Remember — after completing significant work:**',
        '- Store solutions applicable to similar future tasks',
        '- Record architectural decisions and their rationale',
        '- Trigger: task completed, important decision made, pattern identified',
      );
      break;
  }

  lines.push('');
  return lines.join('\n');
}
