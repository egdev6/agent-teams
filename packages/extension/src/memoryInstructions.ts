import type { SyncTarget } from './types';

type AgentRole = 'worker' | 'orchestrator' | 'router' | 'aggregator';

/**
 * Build the ## Memory section for a synced agent markdown file.
 * Instructions are role-aware: each role has specific recall/remember triggers.
 */
export function buildMemorySection(
  role: AgentRole | string,
  domain: string,
  target: SyncTarget,
): string {
  const lines: string[] = ['## Memory', ''];
  const isClaude = target === 'claude';

  switch (role) {
    case 'orchestrator':
      if (isClaude) {
        lines.push(
          'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
          '',
          '**Recall — at session start (mandatory):**',
          '- Call `engram_recall` with key `orchestration:{domain}` to load past coordination patterns',
          '- If chat contains `[Handoff:{taskId}]`: call `engram_recall` with key `handoff:{taskId}` to load full task assessment',
          '- If chat contains `[Parallel:{taskId}]`: call `engram_recall` with key `task:{taskId}:subtask:{agentId}` (your agentId is in the prompt prefix)',
          '',
          '**Delegate via Engram + MCP (Claude Code):**',
          '- Before delegating, write the full sub-task context with `engram_remember` using key `task:{taskId}:subtask:{agentId}`',
          '- Then call the `dispatch_task` MCP tool with `{ agentId, taskId, description }`',
          '- The target Claude agent must reconstruct context from Engram; do not assume shared chat state',
          '',
          '**Remember — when work is complete (mandatory):**',
          '- Call `engram_remember` with key `orchestration:{domain}:{taskType}`, value = Markdown summary of: what was delegated, to whom, and the outcome',
          '- **Also persist the result** so downstream agents and the aggregator can read it:',
          '  - Simple handoff: key `task:{taskId}:result`, value = Markdown summary of the full outcome',
          '  - Parallel dispatch: key `task:{taskId}:subtask:{agentId}:result`, value = Markdown summary of your specific sub-outcome',
          '- Trigger: ALL of the following — task delegated AND results received AND response composed',
          '',
          '**Parallel dispatch — if your prompt contains `[Parallel:{taskId}]`:**',
          '- After persisting your result to Engram, call the `complete_subtask` MCP tool with the taskId and your agentId',
          '- This triggers the aggregator to open once all parallel subtasks complete',
        );
      } else {
        lines.push(
          'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
          '',
          '**Recall — at session start (mandatory):**',
          '- Call `engram_recall` with key `orchestration:{domain}` to load past coordination patterns',
          '- If chat contains `[Handoff:{taskId}]`: call `engram_recall` with key `handoff:{taskId}` to load full task assessment',
          '- If chat contains `[Parallel:{taskId}]`: call `engram_recall` with key `task:{taskId}:subtask:{agentId}` (your agentId is in the prompt prefix)',
          '',
          '**Remember — when work is complete (mandatory):**',
          '- Call `engram_remember` with key `orchestration:{domain}:{taskType}`, value = Markdown summary of: what was delegated, to whom, and the outcome',
          '- **Also persist the result** so downstream agents and the aggregator can read it:',
          '  - Simple handoff: key `task:{taskId}:result`, value = Markdown summary of the full outcome',
          '  - Parallel dispatch: key `task:{taskId}:subtask:{agentId}:result`, value = Markdown summary of your specific sub-outcome',
          '- Trigger: ALL of the following — task delegated AND results received AND response composed',
          '',
          '**Parallel dispatch — if your prompt contains `[Parallel:{taskId}]`:**',
          '- After persisting your result to Engram, call #agent-teams-complete-subtask with the taskId and your agentId',
          '- This triggers the aggregator to open once all parallel subtasks complete',
        );
      }
      break;

    case 'router':
      if (isClaude) {
        lines.push(
          'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
          '',
          '**Recall — before routing decisions (mandatory):**',
          '- Call `engram_recall` with key `routing:patterns` to load past routing decisions and outcomes',
          '',
          '**Remember — after routing decisions (mandatory):**',
          '- Call `engram_remember` with key `routing:patterns`, value = Markdown entry: `- [{date}] {intent} → {targetAgent}: {one-line outcome}`',
          '- Trigger: immediately after routing assessment is complete, before ending the response',
          '',
          '**Claude dispatch protocol (portable):**',
          '- Generate task ID: `task-{unix-timestamp}`',
          '- For each orchestrator, write a full sub-assessment with `engram_remember` using key `task:{taskId}:subtask:{agentId}`',
          '- Call the `dispatch_task` MCP tool once per orchestrator with `{ agentId, taskId, description }`',
          '- For a single-agent handoff, you may also write `handoff:{taskId}` for the top-level assessment before dispatching',
          '- Do NOT assume Claude agents share chat state; all durable context must be in Engram',
        );
      } else {
        lines.push(
          'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
          '',
          '**Recall — before routing decisions (mandatory):**',
          '- Call `engram_recall` with key `routing:patterns` to load past routing decisions and outcomes',
          '',
          '**Remember — after routing decisions (mandatory):**',
          '- Call `engram_remember` with key `routing:patterns`, value = Markdown entry: `- [{date}] {intent} → {targetAgent}: {one-line outcome}`',
          '- Trigger: immediately after routing assessment is complete, before ending the response',
          '',
          '**Dispatch tools — always available in your frontmatter:**',
          '- `agent-teams-handoff` — opens a new chat with a single orchestrator',
          '- `agent-teams-dispatch-parallel` — opens parallel chats with multiple orchestrators (fan-out)',
          '',
          '**Decision: which tool to use?**',
          '- Task involves ONE domain → call the orchestrator directly as a tool (e.g. call `frontend`), OR use `agent-teams-handoff`',
          '- Task involves MULTIPLE domains that can work simultaneously → use `agent-teams-dispatch-parallel` (do NOT call sub-agents directly)',
          '',
          '**Single handoff — `agent-teams-handoff`:**',
          '1. Generate task ID: `task-{unix-timestamp}` (e.g. `task-1741788000`)',
          '2. `engram_remember` key `handoff:{taskId}` → full Markdown assessment',
          '3. Call `agent-teams-handoff` with `{ targetAgentId, taskId, assessment: <one-line summary> }`',
          '',
          '**Parallel dispatch — `agent-teams-dispatch-parallel`:**',
          '1. Generate task ID: `task-{unix-timestamp}`',
          '2. For EACH orchestrator: `engram_remember` key `task:{taskId}:subtask:{agentId}` → full Markdown sub-assessment',
          '3. Call `agent-teams-dispatch-parallel` with `{ taskId, assessment: <one-line summary>, subtasks: [{ agentId, description }, ...] }`',
          '4. Do NOT call the orchestrators as direct sub-agent tools — the dispatch tool opens the chats automatically',
        );
      }
      break;

    case 'aggregator':
      lines.push(
        'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
        '',
        '**Recall — at session start (mandatory):**',
        '- Call `engram_recall` with key `task:{taskId}:subtask:*:result` for EACH subtask agentId to load the results',
        '  (The task ID and subtask agent IDs are listed in the `[Aggregate:{taskId}]` prefix of the chat message)',
        '',
        '**Conflict detection (mandatory):**',
        '- Cross-reference file paths across all subtask results and flag any file touched by more than one orchestrator',
        '- Report conflicts clearly before presenting the unified outcome',
        '',
        '**Remember — after aggregation (mandatory):**',
        '- Call `engram_remember` with key `task:{taskId}:result`, value = Markdown: unified outcome, list of conflicts, resolution decisions',
        '- Trigger: immediately after aggregation is complete, before ending the response',
      );
      if (isClaude) {
        lines.push(
          '',
          '**Claude coordination note:**',
          '- The aggregator is opened only after orchestrators report completion through the `complete_subtask` MCP tool.',
        );
      }
      break;

    default: // worker
      lines.push(
        'This agent uses Engram for persistent memory across sessions (MCP server: `engram`).',
        '',
        `**Recall — before starting work (mandatory):**`,
        `- Call \`engram_recall\` with key \`${domain}:patterns\` to load past solutions and conventions`,
        '',
        '**Remember — after completing work (mandatory):**',
        `- Call \`engram_remember\` with key \`${domain}:patterns\`, value = Markdown entry: \`- [{date}] {taskType}: {what was done, key decisions, file paths}\``,
        '- Trigger: immediately after the task is complete, before ending the response — do NOT skip this step',
      );
      break;
  }

  lines.push('');
  return lines.join('\n');
}
