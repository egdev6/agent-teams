/**
 * agent-roles unit tests
 * Covers: ROLE_BASE_WORKFLOWS, WORKER_AUTONOMOUS_BASE_WORKFLOW,
 *         deriveEngramMode, resolveWorkflow (with WorkflowOptions)
 */

import { describe, expect, it } from 'vitest';
import {
  deriveEngramMode,
  ROLE_BASE_WORKFLOWS,
  resolveWorkflow,
  WORKER_AUTONOMOUS_BASE_WORKFLOW,
} from './agent-roles';

// ─── ROLE_BASE_WORKFLOWS ─────────────────────────────────────────────────────

describe('ROLE_BASE_WORKFLOWS', () => {
  it('defines entries for all three canonical roles', () => {
    expect(ROLE_BASE_WORKFLOWS).toHaveProperty('worker');
    expect(ROLE_BASE_WORKFLOWS).toHaveProperty('orchestrator');
    expect(ROLE_BASE_WORKFLOWS).toHaveProperty('router');
  });

  it.each([
    'worker',
    'orchestrator',
    'router',
  ] as const)('%s workflow is a non-empty array of non-blank strings', (role) => {
    const steps = ROLE_BASE_WORKFLOWS[role];
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(typeof step).toBe('string');
      expect(step.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─── deriveEngramMode ─────────────────────────────────────────────────────────

describe('deriveEngramMode', () => {
  it('router is always autonomous', () => {
    expect(deriveEngramMode('router')).toBe('autonomous');
    expect(deriveEngramMode('router', [])).toBe('autonomous');
    expect(deriveEngramMode('router', ['some-agent'])).toBe('autonomous');
  });

  it('orchestrator is always autonomous', () => {
    expect(deriveEngramMode('orchestrator')).toBe('autonomous');
    expect(deriveEngramMode('orchestrator', ['some-agent'])).toBe('autonomous');
  });

  it('worker without receivesFrom is autonomous', () => {
    expect(deriveEngramMode('worker')).toBe('autonomous');
    expect(deriveEngramMode('worker', [])).toBe('autonomous');
  });

  it('worker with receivesFrom is default', () => {
    expect(deriveEngramMode('worker', ['orchestrator'])).toBe('default');
    expect(deriveEngramMode('worker', ['router', 'orchestrator'])).toBe('default');
  });
});

// ─── resolveWorkflow — base behaviour ────────────────────────────────────────

describe('resolveWorkflow', () => {
  describe('agent-defined workflow takes precedence', () => {
    it('returns the agent workflow when it has at least one step', () => {
      const custom = ['Step A', 'Step B', 'Step C'];
      expect(resolveWorkflow('worker', custom)).toBe(custom);
    });

    it('returns the agent workflow even when the role is orchestrator', () => {
      const custom = ['Custom plan'];
      expect(resolveWorkflow('orchestrator', custom)).toBe(custom);
    });
  });

  describe('falls back to role base workflow', () => {
    it('worker without receivesFrom uses autonomous workflow', () => {
      expect(resolveWorkflow('worker', undefined)).toEqual(WORKER_AUTONOMOUS_BASE_WORKFLOW);
      expect(resolveWorkflow('worker', [])).toEqual(WORKER_AUTONOMOUS_BASE_WORKFLOW);
    });

    it('worker with receivesFrom uses standard worker workflow', () => {
      expect(resolveWorkflow('worker', undefined, { receivesFrom: ['orchestrator'] })).toEqual(
        ROLE_BASE_WORKFLOWS.worker,
      );
    });

    it('returns the orchestrator base when agent workflow is undefined', () => {
      expect(resolveWorkflow('orchestrator', undefined)).toEqual(ROLE_BASE_WORKFLOWS.orchestrator);
      expect(resolveWorkflow('orchestrator', [])).toEqual(ROLE_BASE_WORKFLOWS.orchestrator);
    });

    it('returns the router base when agent workflow is undefined', () => {
      expect(resolveWorkflow('router', undefined)).toEqual(ROLE_BASE_WORKFLOWS.router);
    });
  });

  describe('unknown role fallback', () => {
    it('falls back to the autonomous worker workflow for an unrecognised role without receivesFrom', () => {
      expect(resolveWorkflow('unknown-role' as any, undefined)).toEqual(
        WORKER_AUTONOMOUS_BASE_WORKFLOW,
      );
    });
  });
});

// ─── resolveWorkflow — target-aware tool names ────────────────────────────────

describe('resolveWorkflow — target: github_copilot', () => {
  it('orchestrator delegation step uses Copilot handoff tool', () => {
    const steps = resolveWorkflow('orchestrator', undefined, { target: 'github_copilot' });
    const allText = steps.join('\n');
    expect(allText).toContain('egdev6.agent-teams/agent-teams-handoff');
    expect(allText).toContain('egdev6.agent-teams/agent-teams-dispatch-parallel');
    expect(allText).not.toContain('dispatch_task` MCP tool');
  });

  it('router single-domain step uses Copilot handoff tool', () => {
    const steps = resolveWorkflow('router', undefined, { target: 'github_copilot' });
    const allText = steps.join('\n');
    expect(allText).toContain('egdev6.agent-teams/agent-teams-handoff');
    expect(allText).not.toContain('dispatch_task` MCP tool');
  });

  it('autonomous worker complete-subtask step uses Copilot tool', () => {
    const steps = resolveWorkflow('worker', undefined, { target: 'github_copilot' });
    const allText = steps.join('\n');
    expect(allText).toContain('egdev6.agent-teams/agent-teams-complete-subtask');
    expect(allText).not.toContain('complete_subtask` MCP tool');
  });
});

describe('resolveWorkflow — target: claude_code', () => {
  it('orchestrator delegation step uses dispatch_task MCP tool', () => {
    const steps = resolveWorkflow('orchestrator', undefined, { target: 'claude_code' });
    const allText = steps.join('\n');
    expect(allText).toContain('dispatch_task` MCP tool');
    expect(allText).not.toContain('egdev6.agent-teams/agent-teams-handoff');
    expect(allText).not.toContain('egdev6.agent-teams/agent-teams-dispatch-parallel');
  });

  it('router single-domain step uses dispatch_task MCP tool', () => {
    const steps = resolveWorkflow('router', undefined, { target: 'claude_code' });
    const allText = steps.join('\n');
    expect(allText).toContain('dispatch_task` MCP tool');
    expect(allText).not.toContain('egdev6.agent-teams/agent-teams-handoff');
  });

  it('autonomous worker complete-subtask step uses MCP tool', () => {
    const steps = resolveWorkflow('worker', undefined, { target: 'claude_code' });
    const allText = steps.join('\n');
    expect(allText).toContain('complete_subtask` MCP tool');
    expect(allText).not.toContain('egdev6.agent-teams/agent-teams-complete-subtask');
  });
});

// ─── resolveWorkflow — delegate injection ─────────────────────────────────────

describe('resolveWorkflow — delegatesTo injection', () => {
  it('orchestrator with delegatesTo lists agents in step 5', () => {
    const steps = resolveWorkflow('orchestrator', undefined, {
      delegatesTo: ['frontend-dev', 'backend-dev'],
    });
    const assignStep = steps[4];
    expect(assignStep).toContain('frontend-dev');
    expect(assignStep).toContain('backend-dev');
    expect(assignStep).not.toContain('most suitable');
  });

  it('orchestrator without delegatesTo uses generic step 5', () => {
    const steps = resolveWorkflow('orchestrator', undefined);
    const assignStep = steps[4];
    expect(assignStep).toContain('most suitable');
  });

  it('delegation step also references delegates in claude_code target', () => {
    const steps = resolveWorkflow('orchestrator', undefined, {
      delegatesTo: ['qa-agent'],
      target: 'claude_code',
    });
    const assignStep = steps[4];
    expect(assignStep).toContain('qa-agent');
    const delegateStep = steps[5];
    expect(delegateStep).toContain('dispatch_task');
  });
});

// ─── resolveWorkflow — scope injection ────────────────────────────────────────

describe('resolveWorkflow — scopeTopics injection', () => {
  it('worker with scopeTopics injects topics into step 3', () => {
    const steps = resolveWorkflow('worker', undefined, {
      scopeTopics: ['frontend', 'CSS'],
    });
    const scopeStep = steps[2];
    expect(scopeStep).toContain('frontend');
    expect(scopeStep).toContain('CSS');
    expect(scopeStep).toContain('scope');
  });

  it('autonomous worker with scopeTopics injects topics into step 3', () => {
    const steps = resolveWorkflow('worker', undefined, {
      scopeTopics: ['backend', 'API design'],
    });
    const scopeStep = steps[2];
    expect(scopeStep).toContain('backend');
    expect(scopeStep).toContain('API design');
  });

  it('scope step includes escalation target when escalatesTo is set', () => {
    const steps = resolveWorkflow('worker', undefined, {
      scopeTopics: ['testing'],
      escalatesTo: ['orchestrator-main'],
    });
    const scopeStep = steps[2];
    expect(scopeStep).toContain('orchestrator-main');
  });

  it('worker without scopeTopics uses generic scope step', () => {
    const steps = resolveWorkflow('worker', undefined);
    const scopeStep = steps[2];
    expect(scopeStep).toContain('Understand the task scope');
    expect(scopeStep).not.toContain('topics:');
  });
});

// ─── resolveWorkflow — output step injection ──────────────────────────────────

describe('resolveWorkflow — output step injection', () => {
  it('worker with output.template injects format step before mem_save', () => {
    const steps = resolveWorkflow('worker', undefined, {
      output: { template: 'planning' },
    });
    const allText = steps.join('\n');
    expect(allText).toContain('planning');
    expect(allText).toContain('Format');
    // format step should come before mem_save step
    const formatIdx = steps.findIndex((s) => s.includes('Format'));
    const memSaveIdx = steps.findIndex((s) => s.includes('mem_save'));
    expect(formatIdx).toBeGreaterThan(-1);
    expect(formatIdx).toBeLessThan(memSaveIdx);
  });

  it('autonomous worker with output.template also gets format step', () => {
    const steps = resolveWorkflow('worker', undefined, {
      output: { template: 'diff' },
    });
    const allText = steps.join('\n');
    expect(allText).toContain('diff');
    expect(allText).toContain('Format');
  });

  it('worker without output does not inject format step', () => {
    const steps = resolveWorkflow('worker', undefined);
    const allText = steps.join('\n');
    expect(allText).not.toContain('Format and return');
  });

  it('custom template with format_instructions uses the instructions text', () => {
    const steps = resolveWorkflow('worker', undefined, {
      output: { template: 'custom', format_instructions: 'Write YAML to disk at path/to/file.' },
    });
    const formatStep = steps.find((s) => s.includes('Format'));
    expect(formatStep).toContain('Write YAML to disk');
  });
});
