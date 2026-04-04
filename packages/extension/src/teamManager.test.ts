/**
 * TeamManager unit tests — opencode sync target
 *
 * Tests are organized following the TDD RED→GREEN cycle for:
 * - Phase 2: resolveTargetPaths + collectOpencodeFrontmatter + generateAgentMarkdown
 * - Phase 3: DashboardStats fields (mocked separately)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { setSchemaBasePath } from '@agent-teams/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TeamManager } from './teamManager';
import type { ComposedAgentSpec } from './types';

// Point schema resolution at the source schemas directory for tests
beforeAll(() => {
  const schemasDir = path.join(__dirname, '../../core/schemas');
  setSchemaBasePath(schemasDir);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agent-teams-opencode-test-'));
}

function removeTmpDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeMinimalAgent(overrides: Partial<ComposedAgentSpec> = {}): ComposedAgentSpec {
  return {
    id: 'my-agent',
    name: 'My Agent',
    role: 'worker',
    description: 'A test agent for opencode target',
    ...overrides,
  };
}

/** Access private TeamManager methods for white-box testing */
type TM = any;

function makeManager(): TM {
  return new TeamManager() as TM;
}

// ─── Phase 2.1 + 2.2: resolveTargetPaths ─────────────────────────────────────

describe('TeamManager — resolveTargetPaths (opencode)', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) removeTmpDir(tmpDir);
  });

  it('resolves agentsDir to .opencode/agents relative to projectRoot', () => {
    tmpDir = makeTmpDir();
    const manager = makeManager();
    const result = manager.resolveTargetPaths(tmpDir, 'opencode');
    expect(result.agentsDir).toBe(path.join(tmpDir, '.opencode', 'agents'));
  });

  it('resolves agentExtension to .md', () => {
    tmpDir = makeTmpDir();
    const manager = makeManager();
    const result = manager.resolveTargetPaths(tmpDir, 'opencode');
    expect(result.agentExtension).toBe('.md');
  });

  it('sets contextFile to null (opencode has no root context file)', () => {
    tmpDir = makeTmpDir();
    const manager = makeManager();
    const result = manager.resolveTargetPaths(tmpDir, 'opencode');
    expect(result.contextFile).toBeNull();
  });

  it('does NOT set skipAgents (agents ARE written for opencode)', () => {
    tmpDir = makeTmpDir();
    const manager = makeManager();
    const result = manager.resolveTargetPaths(tmpDir, 'opencode');
    expect(result.skipAgents).toBeFalsy();
  });
});

// ─── Phase 2.3 + 2.4: collectOpencodeFrontmatter ─────────────────────────────

describe('TeamManager — collectOpencodeFrontmatter: role→mode mapping', () => {
  it('worker without receives_from maps to mode: all (user-selectable)', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ role: 'worker' });
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('mode: all');
  });

  it('worker with receives_from entries maps to mode: subagent (orchestrated)', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({
      role: 'worker',
      handoffs: { receives_from: ['orchestrator-agent'] },
    } as any);
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('mode: subagent');
  });

  it('orchestrator role maps to mode: primary', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ role: 'orchestrator' });
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('mode: primary');
  });

  it('router role maps to mode: all', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ role: 'router' });
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('mode: all');
  });

  it('emits --- delimiters and description', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent();
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines[0]).toBe('---');
    expect(lines[lines.length - 2]).toBe('---');
    expect(lines.join('\n')).toContain('description: A test agent for opencode target');
  });
});

describe('TeamManager — collectOpencodeFrontmatter: permission mapping', () => {
  it('can_edit_files: true → permission.edit: allow', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ permissions: { can_edit_files: true } } as any);
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('edit: allow');
  });

  it('can_edit_files: false → permission.edit: deny', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ permissions: { can_edit_files: false } } as any);
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('edit: deny');
  });

  it('can_edit_files: unset → permission.edit: ask', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent();
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('edit: ask');
  });

  it('can_run_commands: true → permission.bash: allow', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ permissions: { can_run_commands: true } } as any);
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('bash: allow');
  });

  it('can_run_commands: false → permission.bash: deny', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ permissions: { can_run_commands: false } } as any);
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('bash: deny');
  });

  it('can_run_commands: unset → permission.bash: ask', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent();
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('bash: ask');
  });

  it('emits opencode_model when set on agent', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ opencode_model: 'claude-sonnet-4-5' } as any);
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).toContain('model: claude-sonnet-4-5');
  });

  it('does NOT emit model line when opencode_model is unset', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent();
    const lines: string[] = manager.collectOpencodeFrontmatter(agent);
    expect(lines.join('\n')).not.toContain('model:');
  });
});

// ─── Phase 2.5: generateAgentMarkdown uses opencode branch ───────────────────

describe('TeamManager — generateAgentMarkdown (opencode target)', () => {
  it('produces a markdown file with mode: all for standalone worker', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ role: 'worker' });
    const md: string = manager.generateAgentMarkdown(agent, 'opencode');
    expect(md).toContain('mode: all');
    expect(md).toContain('description: A test agent for opencode target');
    // Should not contain claude-specific fields
    expect(md).not.toContain('maxTurns:');
    expect(md).not.toContain('permissionMode:');
  });

  it('produces a markdown file with mode: subagent for orchestrated worker', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({
      role: 'worker',
      handoffs: { receives_from: ['some-orchestrator'] },
    } as any);
    const md: string = manager.generateAgentMarkdown(agent, 'opencode');
    expect(md).toContain('mode: subagent');
  });

  it('generates agent body after frontmatter', () => {
    const manager = makeManager();
    const agent = makeMinimalAgent({ role: 'orchestrator' });
    const md: string = manager.generateAgentMarkdown(agent, 'opencode');
    // Body should contain the name
    expect(md).toContain('My Agent');
    expect(md).toContain('mode: primary');
  });
});
