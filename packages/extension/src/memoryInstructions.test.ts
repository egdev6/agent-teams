/**
 * memoryInstructions unit tests
 * Covers: buildMemorySection — role × target × engramMode combinations
 */

import { describe, expect, it } from 'vitest';
import { buildMemorySection } from './memoryInstructions';

// ─── Shared assertions ────────────────────────────────────────────────────────

function expectCommonStructure(result: string) {
  expect(result.startsWith('## Memory')).toBe(true);
  expect(result).toContain('mem_session_end');
  expect(result).toContain('engram');
}

// ─── worker (standard) ───────────────────────────────────────────────────────

describe('buildMemorySection — worker / standard', () => {
  it('contains the domain:patterns recall key', () => {
    const result = buildMemorySection('worker', 'frontend', 'github_copilot');
    expectCommonStructure(result);
    expect(result).toContain('frontend:patterns');
  });

  it('includes recall and remember instructions', () => {
    const result = buildMemorySection('worker', 'backend', 'github_copilot');
    expect(result).toContain('engram_recall');
    expect(result).toContain('engram_remember');
    expect(result).toContain('backend:patterns');
  });

  it('interpolates domain into the remember key', () => {
    const result = buildMemorySection('worker', 'testing', 'claude_code');
    expect(result).toContain('testing:patterns');
  });

  it('standard worker does not mention parallel dispatch', () => {
    // worker with receivesFrom = dispatched mode (no parallel dispatch autonomy)
    const result = buildMemorySection('worker', 'frontend', 'github_copilot', ['orchestrator']);
    expect(result).not.toContain('[Parallel:{taskId}]');
  });
});

// ─── worker (autonomous) ─────────────────────────────────────────────────────

describe('buildMemorySection — worker / autonomous', () => {
  it('mentions Handoff and Parallel recall keys', () => {
    // worker without receivesFrom → autonomous mode
    const result = buildMemorySection('worker', 'devops', 'github_copilot');
    expectCommonStructure(result);
    expect(result).toContain('[Handoff:{taskId}]');
    expect(result).toContain('[Parallel:{taskId}]');
  });

  it('uses #agent-teams-complete-subtask for non-claude targets', () => {
    const result = buildMemorySection('worker', 'devops', 'github_copilot');
    expect(result).toContain('#agent-teams-complete-subtask');
    expect(result).not.toContain('complete_subtask` MCP tool');
  });

  it('uses the complete_subtask MCP tool for claude_code target', () => {
    const result = buildMemorySection('worker', 'devops', 'claude_code');
    expect(result).toContain('complete_subtask` MCP tool');
    expect(result).not.toContain('#agent-teams-complete-subtask');
  });

  it('interpolates domain into the domain:patterns key', () => {
    const result = buildMemorySection('worker', 'infra', 'github_copilot');
    expect(result).toContain('infra:patterns');
  });
});

// ─── orchestrator ─────────────────────────────────────────────────────────────

describe('buildMemorySection — orchestrator', () => {
  it('recalls orchestration:{domain} key', () => {
    const result = buildMemorySection('orchestrator', 'fullstack', 'github_copilot');
    expectCommonStructure(result);
    expect(result).toContain('orchestration:{domain}');
  });

  it('mentions Handoff and Parallel recall conditions', () => {
    const result = buildMemorySection('orchestrator', 'fullstack', 'github_copilot');
    expect(result).toContain('[Handoff:{taskId}]');
    expect(result).toContain('[Parallel:{taskId}]');
  });

  it('uses #agent-teams-complete-subtask for non-claude targets', () => {
    const result = buildMemorySection('orchestrator', 'fullstack', 'github_copilot');
    expect(result).toContain('#agent-teams-complete-subtask');
    expect(result).not.toContain('complete_subtask` MCP tool');
  });

  it('uses complete_subtask MCP tool for claude_code', () => {
    const result = buildMemorySection('orchestrator', 'fullstack', 'claude_code');
    expect(result).toContain('complete_subtask` MCP tool');
    expect(result).not.toContain('#agent-teams-complete-subtask');
  });

  it('claude_code mentions dispatch_task MCP for sub-task delegation', () => {
    const result = buildMemorySection('orchestrator', 'fullstack', 'claude_code');
    expect(result).toContain('dispatch_task');
  });
});

// ─── router ───────────────────────────────────────────────────────────────────

describe('buildMemorySection — router', () => {
  it('recalls routing:patterns key', () => {
    const result = buildMemorySection('router', 'global', 'github_copilot');
    expectCommonStructure(result);
    expect(result).toContain('routing:patterns');
  });

  it('non-claude lists agent-teams-handoff and agent-teams-dispatch-parallel tools', () => {
    const result = buildMemorySection('router', 'global', 'github_copilot');
    expect(result).toContain('agent-teams-handoff');
    expect(result).toContain('agent-teams-dispatch-parallel');
  });

  it('non-claude explains single-handoff and parallel-dispatch protocols', () => {
    const result = buildMemorySection('router', 'global', 'github_copilot');
    expect(result).toContain('Single handoff');
    expect(result).toContain('Parallel dispatch');
  });

  it('claude_code mentions dispatch_task MCP protocol', () => {
    const result = buildMemorySection('router', 'global', 'claude_code');
    expect(result).toContain('dispatch_task');
  });

  it('claude_code mentions handoff:{taskId} engram key', () => {
    const result = buildMemorySection('router', 'global', 'claude_code');
    expect(result).toContain('handoff:{taskId}');
  });
});

// ─── aggregator ───────────────────────────────────────────────────────────────

describe('buildMemorySection — aggregator', () => {
  it('recalls subtask result keys', () => {
    const result = buildMemorySection('aggregator', 'backend', 'github_copilot');
    expectCommonStructure(result);
    expect(result).toContain('task:{taskId}:subtask:*:result');
  });

  it('requires conflict detection step', () => {
    const result = buildMemorySection('aggregator', 'backend', 'github_copilot');
    expect(result).toContain('Conflict detection');
  });

  it('persists result to task:{taskId}:result', () => {
    const result = buildMemorySection('aggregator', 'backend', 'github_copilot');
    expect(result).toContain('task:{taskId}:result');
  });

  it('claude_code appends a Claude coordination note', () => {
    const result = buildMemorySection('aggregator', 'backend', 'claude_code');
    expect(result).toContain('Claude coordination note');
  });

  it('non-claude does not append a Claude coordination note', () => {
    const result = buildMemorySection('aggregator', 'backend', 'github_copilot');
    expect(result).not.toContain('Claude coordination note');
  });
});

// ─── unknown role falls back to worker ───────────────────────────────────────

describe('buildMemorySection — unknown role', () => {
  it('treats unknown role as a standard worker', () => {
    const result = buildMemorySection('unknown-role', 'misc', 'github_copilot');
    expectCommonStructure(result);
    expect(result).toContain('misc:patterns');
  });
});
