import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentScope, AgentSkillRef } from '@agent-teams/core';
import {
  DEFAULT_AGENTS_MD_BUDGET,
  deriveEngramMode,
  normalizeProfileSyncTarget,
  resolveOutputStructure,
  resolveWorkflow,
  SCHEMA_PATHS,
} from '@agent-teams/core';
import Ajv from 'ajv';
import * as YAML from 'yaml';
import { AgentComposer } from './composer';
import type { ContextPackContext } from './contextPackProcessor';
import { ContextPackProcessor } from './contextPackProcessor';
import { Logger } from './logger';
import { MergeEngine } from './mergeEngine';
import { ProfileLoader } from './profileLoader';
import type { ComposedAgentSpec, ProjectProfile, SyncTarget, TeamProfile } from './types';

/**
 * Maps legacy tool names to their current Copilot slugs.
 * Covers both old compound paths (search/codebase, edit/editFiles) and old
 * short aliases, plus agent-teams extension tools that moved to the
 * egdev6.agent-teams/ prefix.
 */
const VSCODE_TOOL_ALIASES: Record<string, string> = {
  // Legacy compound names → new short names
  'search/codebase': 'search',
  'edit/editFiles': 'edit',
  // Even older single-word aliases
  codebase: 'search',
  editFiles: 'edit',
  // Extension tools — old unprefixed names → new egdev6.agent-teams/ names
  'agent-teams-handoff': 'egdev6.agent-teams/agent-teams-handoff',
  'agent-teams-dispatch-parallel': 'egdev6.agent-teams/agent-teams-dispatch-parallel',
  'agent-teams-complete-subtask': 'egdev6.agent-teams/agent-teams-complete-subtask',
  'agent-teams-suggest-community-skills': 'egdev6.agent-teams/agent-teams-suggest-community-skills',
  'agent-teams-read-workspace-file': 'egdev6.agent-teams/agent-teams-read-workspace-file',
};

function normalizeCopilotToolName(name: string): string {
  return VSCODE_TOOL_ALIASES[name] ?? name;
}

interface TargetPaths {
  target: SyncTarget;
  agentsDir: string;
  skillsDir: string;
  contextDir: string;
  contextFile: string | null;
  agentExtension: '.agent.md' | '.md';
  skipAgents?: boolean;
}

/**
 * Sync result with change preview
 */
export interface SyncResult {
  agents: ComposedAgentSpec[];
  changes: Array<{
    agentId: string;
    action: 'create' | 'update' | 'skip' | 'delete';
    diff?: string;
    filepath: string;
  }>;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    deleted: number;
  };
  targets: SyncTarget[];
}

export class TeamManager {
  private ajv: Ajv;
  private composer: AgentComposer;
  private contextPackProcessor: ContextPackProcessor;
  private profileLoader: ProfileLoader;
  private logger: Logger;
  private mergeEngine: MergeEngine;
  private _currentProjectRoot: string = '';
  private _bundledSkillsDir: string | null = null;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.logger = new Logger();
    this.composer = new AgentComposer(this.logger);
    this.contextPackProcessor = new ContextPackProcessor(this.logger);
    this.profileLoader = new ProfileLoader();
    this.mergeEngine = new MergeEngine(this.logger);
  }

  private resolveTeamFilePath(projectRoot: string, teamId: string): string {
    const preferredYml = path.join(projectRoot, '.agent-teams', 'teams', `${teamId}.yml`);
    if (fs.existsSync(preferredYml)) {
      return preferredYml;
    }
    const preferredYaml = path.join(projectRoot, '.agent-teams', 'teams', `${teamId}.yaml`);
    if (fs.existsSync(preferredYaml)) {
      return preferredYaml;
    }
    const legacyYml = path.join(projectRoot, '.agent-team', 'teams', `${teamId}.yml`);
    if (fs.existsSync(legacyYml)) {
      return legacyYml;
    }
    return path.join(projectRoot, '.agent-team', 'teams', `${teamId}.yaml`);
  }

  private resolveContextPacksDir(projectRoot: string): string {
    const preferred = path.join(projectRoot, '.agent-teams', 'context-packs');
    if (fs.existsSync(preferred)) {
      return preferred;
    }
    return path.join(projectRoot, '.agent-team', 'context-packs');
  }

  private resolveSkillsSourceDir(projectRoot: string): string | null {
    const dir = path.join(projectRoot, '.agent-teams', 'skills');
    return fs.existsSync(dir) ? dir : null;
  }

  /**
   * Copy bundled skills referenced by team agents into the workspace's
   * `.agent-teams/skills/` directory, so they are available to the LLM
   * at runtime in any environment (without needing the extension).
   * Only copies skills that are not already present in the workspace.
   */
  private _copyBundledSkillsToWorkspace(
    projectRoot: string,
    agents: ComposedAgentSpec[],
    bundledSkillsDir: string,
  ): void {
    const skillIds = new Set<string>();
    for (const agent of agents) {
      for (const skill of agent.skills ?? []) {
        skillIds.add((skill as AgentSkillRef).id);
      }
    }
    if (skillIds.size === 0) return;

    const workspaceSkillsDir = path.join(projectRoot, '.agent-teams', 'skills');

    for (const skillId of skillIds) {
      const bundledSkillDir = path.join(bundledSkillsDir, skillId);
      if (!fs.existsSync(bundledSkillDir)) continue;

      const workspaceSkillDir = path.join(workspaceSkillsDir, skillId);
      const skillMdDest = path.join(workspaceSkillDir, 'SKILL.md');
      if (fs.existsSync(skillMdDest)) continue;

      fs.mkdirSync(workspaceSkillDir, { recursive: true });

      const files = fs.readdirSync(bundledSkillDir);
      for (const file of files) {
        fs.copyFileSync(path.join(bundledSkillDir, file), path.join(workspaceSkillDir, file));
      }
      this.logger.info(`Copied bundled skill to workspace: ${skillId}`);
    }
  }

  /**
   * Copy all bundled skills referenced by any agent in `.agent-teams/agents/`
   * into the workspace's `.agent-teams/skills/` directory.
   * Mirrors the skill-copy step performed during full team sync, so that
   * project-configurator and similar agents can materialise skill files without
   * requiring the user to run a full sync.
   */
  copyBundledSkillsForWorkspace(projectRoot: string, bundledSkillsDir: string): void {
    const agentsDir = this.resolveAgentsSpecsDir(projectRoot);
    if (!fs.existsSync(agentsDir)) return;

    const agentFiles = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

    const stubs: Array<{ skills?: Array<{ id: string }> }> = agentFiles.flatMap((f) => {
      try {
        const parsed = YAML.parse(fs.readFileSync(path.join(agentsDir, f), 'utf-8'));
        return parsed ? [parsed] : [];
      } catch {
        return [];
      }
    });

    this._copyBundledSkillsToWorkspace(projectRoot, stubs as any, bundledSkillsDir);
  }

  private resolveAgentsSpecsDir(projectRoot: string): string {
    const preferred = path.join(projectRoot, '.agent-teams', 'agents');
    if (fs.existsSync(preferred)) {
      return preferred;
    }
    return path.join(projectRoot, '.agent-team', 'agents');
  }

  private listWorkspaceAgentIds(projectRoot: string): string[] {
    const agentsDir = this.resolveAgentsSpecsDir(projectRoot);
    if (!fs.existsSync(agentsDir)) {
      return [];
    }

    const ids = fs
      .readdirSync(agentsDir)
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      .map((file) => path.basename(file, path.extname(file)));
    return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
  }

  private listContextPackFiles(projectRoot: string): string[] {
    const packsDir = this.resolveContextPacksDir(projectRoot);
    if (!fs.existsSync(packsDir)) {
      return [];
    }
    return fs
      .readdirSync(packsDir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(packsDir, file))
      .sort((a, b) => a.localeCompare(b));
  }

  private resolveSyncTargets(
    profile: ProjectProfile,
    explicitTargets?: SyncTarget[],
  ): SyncTarget[] {
    const allowed = new Set<SyncTarget>([
      'github_copilot',
      'claude_code',
      'codex',
      'gemini',
      'openai',
      'opencode',
    ]);
    if (explicitTargets && explicitTargets.length > 0) {
      return [...new Set(explicitTargets.filter((target) => allowed.has(target)))];
    }
    if (Array.isArray(profile.sync_targets) && profile.sync_targets.length > 0) {
      const normalized = profile.sync_targets
        .map((t) => normalizeProfileSyncTarget(t))
        .filter((t): t is SyncTarget => t !== null);
      if (normalized.length > 0) return [...new Set(normalized)];
    }
    return ['github_copilot', 'claude_code'];
  }

  private resolveTargetPaths(
    projectRoot: string,
    target: SyncTarget,
    outputDir?: string,
  ): TargetPaths {
    if (target === 'github_copilot') {
      const githubDir = path.join(projectRoot, '.github');
      return {
        target,
        agentsDir: outputDir || path.join(githubDir, 'agents'),
        skillsDir: path.join(githubDir, 'skills'),
        contextDir: path.join(githubDir, 'context'),
        contextFile: path.join(githubDir, 'copilot-instructions.md'),
        agentExtension: '.agent.md',
      };
    }

    if (target === 'claude_code') {
      const claudeDir = path.join(projectRoot, '.claude');
      return {
        target,
        agentsDir: path.join(claudeDir, 'agents'),
        skillsDir: path.join(claudeDir, 'skills'),
        contextDir: path.join(claudeDir, 'context'),
        contextFile: path.join(projectRoot, 'CLAUDE.md'),
        agentExtension: '.md',
      };
    }

    if (target === 'gemini') {
      // gemini reads GEMINI.md from project root — no folder structure needed
      return {
        target,
        agentsDir: '',
        skillsDir: '',
        contextDir: '',
        contextFile: path.join(projectRoot, 'GEMINI.md'),
        agentExtension: '.md',
        skipAgents: true,
      };
    }

    if (target === 'openai') {
      // OpenAI Agents SDK reads AGENTS.md from project root — no folder structure needed
      return {
        target,
        agentsDir: '',
        skillsDir: '',
        contextDir: '',
        contextFile: path.join(projectRoot, 'AGENTS.md'),
        agentExtension: '.md',
        skipAgents: true,
      };
    }

    if (target === 'opencode') {
      const opencodeDir = path.join(projectRoot, '.opencode');
      return {
        target,
        agentsDir: path.join(opencodeDir, 'agents'),
        skillsDir: '',
        contextDir: '',
        contextFile: null,
        agentExtension: '.md',
      };
    }

    // codex reads AGENTS.md from project root — no folder structure needed
    return {
      target,
      agentsDir: '',
      skillsDir: '',
      contextDir: '',
      contextFile: path.join(projectRoot, 'AGENTS.md'),
      agentExtension: '.md',
      skipAgents: true,
    };
  }

  private buildTargetContextContent(
    target: SyncTarget,
    team: TeamProfile,
    agents: ComposedAgentSpec[],
    contextPackFiles: string[],
  ): string {
    const packLinks = contextPackFiles
      .map((file) => path.basename(file))
      .map((file) => `- [${path.basename(file, '.md')}](./context/${file})`);
    const agentEntries = agents
      .map((agent) => `- \`${agent.id}\` (${agent.name})`)
      .sort((a, b) => a.localeCompare(b));

    const lines: string[] = [];
    lines.push('# Agent Teams Context');
    lines.push('');
    lines.push(`This file was generated for target \`${target}\` using team \`${team.id}\`.`);
    lines.push('');
    lines.push('## Base Structure');
    lines.push('- `./agents`');
    lines.push('- `./skills`');
    lines.push('- `./context`');
    lines.push('');
    lines.push('## Skill Loading Guard');
    lines.push('');
    lines.push('## Context Packs');
    lines.push(...(packLinks.length > 0 ? packLinks : ['- No context packs selected.']));
    lines.push('');
    lines.push('## Agents');
    lines.push(...(agentEntries.length > 0 ? agentEntries : ['- None']));
    return lines.join('\n');
  }

  /**
   * Regenerate only the root context file (e.g. copilot-instructions.md / AGENTS.md)
   * for all configured sync targets. Called after saving the project profile so that
   * the guard section and context-pack links are always up to date even before a full
   * team sync has been run.
   */
  async syncContextFileOnly(projectRoot: string): Promise<void> {
    this._currentProjectRoot = projectRoot;
    const profile = await this.profileLoader.load(projectRoot);
    const targets = this.resolveSyncTargets(profile);
    const contextPackFiles = this.selectContextPackFiles(
      profile,
      this.listContextPackFiles(projectRoot),
    );

    // Build a minimal stub team just to satisfy buildTargetContextContent signature
    const stubTeam: TeamProfile = {
      id: profile.project?.id ?? 'workspace',
      name: profile.project?.name ?? 'Workspace',
      agents: { enable: [] },
      overrides: {},
    };

    for (const target of targets) {
      const targetPaths = this.resolveTargetPaths(projectRoot, target);
      if (targetPaths.contextFile === null) continue;

      const content = await this.buildContextFileContent(
        target,
        stubTeam,
        [],
        contextPackFiles,
        profile,
        projectRoot,
      );

      const dir = path.dirname(targetPaths.contextFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPaths.contextFile, content, 'utf-8');
      this.logger.info(`Context file updated: ${targetPaths.contextFile}`);
    }
  }

  private async buildContextPackSections(
    projectRoot: string,
    profile: ProjectProfile,
    contextPackFiles: string[],
  ): Promise<string[]> {
    const context: ContextPackContext = {
      project: profile.project as Record<string, any>,
      technologies: profile.technologies,
      paths: profile.paths,
      commands: profile.commands,
    };
    const budget = profile.agents_md_budget ?? DEFAULT_AGENTS_MD_BUDGET;
    const results = await Promise.all(
      contextPackFiles.map((packFile) =>
        this.contextPackProcessor.processWithMeta(packFile, context, { projectRoot }),
      ),
    );

    const essential: typeof results = [];
    const standard: typeof results = [];
    const reference: typeof results = [];

    for (const result of results) {
      if (result.meta.priority === 'essential') {
        essential.push(result);
      } else if (result.meta.priority === 'reference') {
        reference.push(result);
      } else {
        standard.push(result);
      }
    }

    // Greedily inline standard packs until char budget exhausted
    const inlinedStandard: typeof results = [];
    const overflowStandard: typeof results = [];
    let usedChars = 0;
    for (const result of standard) {
      const len = result.content.trim().length;
      if (usedChars + len <= budget) {
        inlinedStandard.push(result);
        usedChars += len;
      } else {
        overflowStandard.push(result);
      }
    }

    const inlineSections = [
      ...essential.map((r) => r.content.trim()),
      ...inlinedStandard.map((r) => r.content.trim()),
    ];
    const referenced = [...overflowStandard, ...reference];
    const referencedLines = referenced.map(
      (r) => `- **${r.meta.name}**${r.meta.description ? `: ${r.meta.description}` : ''}`,
    );

    const parts: string[] = [];
    if (inlineSections.length > 0) {
      parts.push(inlineSections.join('\n\n---\n\n'));
    }
    if (referencedLines.length > 0) {
      parts.push(`## Referenced Context Packs\n\n${referencedLines.join('\n')}`);
    }
    return parts;
  }

  private buildClaudeRootProtocol(team: TeamProfile, agents: ComposedAgentSpec[]): string {
    const agentLines = agents
      .map((agent) => ({
        id: agent.id,
        line: `- \`${agent.id}\` (${agent.role}) → \`./.claude/agents/${agent.id}.md\``,
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => entry.line);

    const lines = [
      '# Agent Teams Protocol (Claude Code)',
      '',
      `Generated from team \`${team.id}\`. Claude agent files are synced to \`./.claude/agents/\`.`,
      '',
      '## Delegation via Engram',
      '',
      '- Write durable task context to Engram before delegating. Agents must reconstruct state from Engram, not from shared chat history.',
      '- Single handoff: write `handoff:{taskId}` for the top-level assessment when handing a task to one orchestrator.',
      '- Sub-task dispatch: write `task:{taskId}:subtask:{agentId}` and then call the `dispatch_task` MCP tool with `{ agentId, taskId, description }`.',
      '- Sub-task completion: after persisting `task:{taskId}:subtask:{agentId}:result`, call the `complete_subtask` MCP tool with `{ taskId, agentId, summary }`.',
      '- Final aggregation: the aggregator recalls all `task:{taskId}:subtask:*:result` entries and writes the unified outcome to `task:{taskId}:result`.',
      '',
      '## Available Claude Agents',
      '',
      ...(agentLines.length > 0 ? agentLines : ['- None']),
    ];

    return `${lines.join('\n')}\n`;
  }

  private shouldIncludeClaudeRootProtocol(target: SyncTarget, profile: ProjectProfile): boolean {
    if (target === 'claude_code') {
      return true;
    }

    if (target !== 'codex') {
      return false;
    }

    return this.resolveSyncTargets(profile).includes('claude_code');
  }

  private async buildRootAgentsMd(
    projectRoot: string,
    profile: ProjectProfile,
    contextPackFiles: string[],
    target: SyncTarget,
    team?: TeamProfile,
    agents: ComposedAgentSpec[] = [],
  ): Promise<string> {
    const parts = await this.buildContextPackSections(projectRoot, profile, contextPackFiles);
    if (team && this.shouldIncludeClaudeRootProtocol(target, profile)) {
      parts.unshift(this.buildClaudeRootProtocol(team, agents).trim());
    }
    return parts.length > 0 ? `${parts.join('\n\n---\n\n')}\n` : '';
  }

  private selectContextPackFiles(profile: ProjectProfile, allPackFiles: string[]): string[] {
    const selected = Array.isArray(profile.context_packs)
      ? new Set(profile.context_packs.map((name) => `${name}.md`))
      : null;
    if (!selected || selected.size === 0) {
      return allPackFiles;
    }
    return allPackFiles.filter((file) => selected.has(path.basename(file)));
  }

  /**
   * Load a team profile from .agent-teams/teams/{teamId}.yml
   * Falls back to .agent-team/teams for backward compatibility.
   */
  async loadTeam(projectRoot: string, teamId: string): Promise<TeamProfile> {
    const teamPath = this.resolveTeamFilePath(projectRoot, teamId);

    if (!fs.existsSync(teamPath)) {
      throw new Error(`Team profile not found: ${teamPath}`);
    }

    const content = fs.readFileSync(teamPath, 'utf-8');
    let team: TeamProfile;

    try {
      team = YAML.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse team profile: ${error}`);
    }

    await this.validateTeam(team);

    return team;
  }

  /**
   * Validate team profile against JSON schema
   */
  private async validateTeam(team: TeamProfile): Promise<void> {
    const schemaPath = SCHEMA_PATHS.team;

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Team schema not found: ${schemaPath}`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const validate = this.ajv.compile(schema);
    const valid = validate(team);

    if (!valid) {
      const errors = validate.errors
        ?.map((err) => `  - ${err.instancePath} ${err.message}`)
        .join('\n');
      throw new Error(`Team profile validation failed:\n${errors}`);
    }
  }

  /**
   * Synchronize a team to all configured sync targets.
   */
  async syncTeam(
    projectRoot: string,
    teamId: string,
    options: {
      dryRun?: boolean;
      outputDir?: string;
      showDiff?: boolean;
      targets?: SyncTarget[];
      bundledSkillsDir?: string;
      /** Agent IDs managed by the extension (bundled agents). Excluded from orphan detection. */
      managedAgentIds?: Set<string>;
    } = {},
  ): Promise<SyncResult> {
    const dryRun = options.dryRun || false;
    const showDiff = options.showDiff !== false;
    this._currentProjectRoot = projectRoot;

    this.logger.info(`Syncing team: ${teamId}${dryRun ? ' (DRY RUN)' : ''}`);

    const profile = await this.profileLoader.load(projectRoot);
    const team = await this.loadTeam(projectRoot, teamId);
    const targets = this.resolveSyncTargets(profile, options.targets);
    const contextPackFiles = this.selectContextPackFiles(
      profile,
      this.listContextPackFiles(projectRoot),
    );

    const composedAgents = await this.composeTeamAgents(team, profile, projectRoot);

    if (options.bundledSkillsDir) {
      this._copyBundledSkillsToWorkspace(projectRoot, composedAgents, options.bundledSkillsDir);
    }

    const skillsSourceDir = this.resolveSkillsSourceDir(projectRoot);
    const skillEntries = skillsSourceDir
      ? this.listRelativeFiles(skillsSourceDir).filter((f) => path.basename(f) !== 'metadata.yml')
      : [];
    const allChanges: SyncResult['changes'] = [];

    for (const target of targets) {
      const targetChanges = await this.syncTargetChanges(
        projectRoot,
        target,
        team,
        composedAgents,
        contextPackFiles,
        skillsSourceDir,
        skillEntries,
        options.outputDir,
        dryRun,
        showDiff,
        profile,
        options.managedAgentIds,
      );
      allChanges.push(...targetChanges);
    }

    const summary = {
      total: allChanges.length,
      created: allChanges.filter((c) => c.action === 'create').length,
      updated: allChanges.filter((c) => c.action === 'update').length,
      skipped: allChanges.filter((c) => c.action === 'skip').length,
      deleted: allChanges.filter((c) => c.action === 'delete').length,
    };

    this.logSyncSummary(summary, dryRun);

    return {
      agents: composedAgents,
      changes: allChanges,
      summary,
      targets,
    };
  }

  private async syncTargetChanges(
    projectRoot: string,
    target: SyncTarget,
    team: TeamProfile,
    composedAgents: ComposedAgentSpec[],
    contextPackFiles: string[],
    skillsSourceDir: string | null,
    skillEntries: string[],
    outputDir: string | undefined,
    dryRun: boolean,
    showDiff: boolean,
    profile: ProjectProfile,
    managedAgentIds?: Set<string>,
  ): Promise<SyncResult['changes']> {
    const targetPaths = this.resolveTargetPaths(projectRoot, target, outputDir);
    const targetChanges: SyncResult['changes'] = [];

    const agentChanges = this.trackAgentChangesForTarget(
      composedAgents,
      targetPaths,
      showDiff,
      managedAgentIds,
    );
    const contextPackChanges = this.trackContextPackChangesForTarget(
      contextPackFiles,
      targetPaths,
      showDiff,
    );
    const skillsChanges = this.trackDirectoryCopyChangesForTarget(
      skillsSourceDir,
      skillEntries,
      targetPaths.skillsDir,
      showDiff,
    );

    targetChanges.push(...agentChanges, ...contextPackChanges, ...skillsChanges);

    const contextResult = await this.syncTargetContextFile(
      target,
      team,
      composedAgents,
      contextPackFiles,
      targetPaths,
      showDiff,
      profile,
      projectRoot,
    );
    if (contextResult) targetChanges.push(contextResult.change);

    if (!dryRun) {
      this.ensureTargetDirectories(targetPaths);
      this.writeAgentsForTarget(composedAgents, targetPaths, agentChanges);
      this.writeContextPacksForTarget(contextPackFiles, targetPaths, contextPackChanges);
      this.writeDirectoryCopyForTarget(
        skillsSourceDir,
        skillEntries,
        targetPaths.skillsDir,
        skillsChanges,
      );
      if (contextResult) {
        this.writeContextFileForTarget(targetPaths, contextResult.content, contextResult.change);
      }
      this.syncMcpServers(composedAgents, projectRoot, target);
    }

    return targetChanges;
  }

  private syncMcpServers(
    agents: ComposedAgentSpec[],
    projectRoot: string,
    target: SyncTarget,
  ): void {
    const seen = this.collectMcpServers(agents);
    if (seen.size === 0) return;

    if (target === 'github_copilot') {
      this.syncCopilotMcpServers(seen, projectRoot);
    } else if (target === 'claude_code') {
      this.syncClaudeMcpServers(seen, projectRoot);
    }
  }

  private collectMcpServers(
    agents: ComposedAgentSpec[],
  ): Map<string, { command: string; args?: string[]; env?: Record<string, string> }> {
    const seen = new Map<
      string,
      { command: string; args?: string[]; env?: Record<string, string> }
    >();
    for (const agent of agents) {
      for (const server of agent.mcpServers ?? []) {
        if (!seen.has(server.id)) {
          seen.set(server.id, { command: server.command, args: server.args, env: server.env });
        }
      }
    }
    return seen;
  }

  private syncCopilotMcpServers(
    seen: Map<string, { command: string; args?: string[]; env?: Record<string, string> }>,
    projectRoot: string,
  ): void {
    const mcpJsonPath = path.join(projectRoot, '.vscode', 'mcp.json');
    const vscodeDirPath = path.join(projectRoot, '.vscode');
    if (!fs.existsSync(vscodeDirPath)) {
      fs.mkdirSync(vscodeDirPath, { recursive: true });
    }
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(mcpJsonPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8')) as Record<string, unknown>;
      } catch {
        existing = {};
      }
    }
    const { servers, modified } = this.buildCopilotServers(seen, existing.servers ?? ({} as any));
    if (modified) {
      existing.servers = servers;
      fs.writeFileSync(mcpJsonPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
    }
  }

  private buildCopilotServers(
    seen: Map<string, { command: string; args?: string[]; env?: Record<string, string> }>,
    currentServers: Record<string, unknown>,
  ): { servers: Record<string, unknown>; modified: boolean } {
    const servers = { ...currentServers };
    let modified = false;
    for (const [id, entry] of seen) {
      if (!servers[id]) {
        const serverEntry: Record<string, unknown> = { command: entry.command };
        if (entry.args?.length) serverEntry.args = entry.args;
        if (entry.env && Object.keys(entry.env).length > 0) serverEntry.env = entry.env;
        servers[id] = serverEntry;
        modified = true;
      }
    }
    return { servers, modified };
  }

  private syncClaudeMcpServers(
    seen: Map<string, { command: string; args?: string[]; env?: Record<string, string> }>,
    projectRoot: string,
  ): void {
    const mcpJsonPath = path.join(projectRoot, '.mcp.json');
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(mcpJsonPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8')) as Record<string, unknown>;
      } catch {
        existing = {};
      }
    }
    const mcpServers = (existing.mcpServers ?? {}) as Record<string, unknown>;
    let modified = false;
    for (const [id, entry] of seen) {
      if (!mcpServers[id]) {
        const serverEntry: Record<string, unknown> = { command: entry.command };
        if (entry.args?.length) serverEntry.args = entry.args;
        if (entry.env && Object.keys(entry.env).length > 0) serverEntry.env = entry.env;
        mcpServers[id] = serverEntry;
        modified = true;
      }
    }
    if (modified) {
      existing.mcpServers = mcpServers;
      fs.writeFileSync(mcpJsonPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
    }
  }

  private async buildContextFileContent(
    target: SyncTarget,
    team: TeamProfile,
    agents: ComposedAgentSpec[],
    contextPackFiles: string[],
    profile: ProjectProfile,
    projectRoot: string,
  ): Promise<string> {
    if (
      target === 'claude_code' ||
      target === 'codex' ||
      target === 'gemini' ||
      target === 'openai'
    ) {
      return this.buildRootAgentsMd(projectRoot, profile, contextPackFiles, target, team, agents);
    }
    return this.buildTargetContextContent(target, team, agents, contextPackFiles);
  }

  private async syncTargetContextFile(
    target: SyncTarget,
    team: TeamProfile,
    composedAgents: ComposedAgentSpec[],
    contextPackFiles: string[],
    targetPaths: TargetPaths,
    showDiff: boolean,
    profile: ProjectProfile,
    projectRoot: string,
  ): Promise<{ change: SyncResult['changes'][0]; content: string } | null> {
    if (targetPaths.contextFile === null) {
      return null;
    }

    const content = await this.buildContextFileContent(
      target,
      team,
      composedAgents,
      contextPackFiles,
      profile,
      projectRoot,
    );
    const change = this.trackTextFileChange(
      `${target}/context-file`,
      targetPaths.contextFile,
      content,
      showDiff,
    );
    return { change, content };
  }

  private logSyncSummary(
    summary: { total: number; created: number; updated: number; skipped: number; deleted: number },
    dryRun: boolean,
  ): void {
    if (!dryRun) {
      this.logger.info(
        `Team synced: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.deleted} deleted`,
      );
    } else {
      this.logger.info(
        `DRY RUN: Would create ${summary.created}, update ${summary.updated}, skip ${summary.skipped}, delete ${summary.deleted}`,
      );
    }
  }

  /**
   * Compose all agents for a team
   */
  private async composeTeamAgents(
    team: TeamProfile,
    profile: ProjectProfile,
    workspacePath: string,
  ): Promise<ComposedAgentSpec[]> {
    const composedAgents: ComposedAgentSpec[] = [];
    const disabledAgents = new Set(team.agents?.disable || []);

    const enabledAgents =
      !team.agents?.enable || team.agents.enable === 'all'
        ? this.listWorkspaceAgentIds(workspacePath)
        : [...new Set(team.agents.enable)];

    for (const agentId of enabledAgents) {
      if (disabledAgents.has(agentId)) {
        this.logger.info(`Skipping disabled agent: ${agentId}`);
        continue;
      }

      this.logger.info(`Composing agent: ${agentId}`);
      try {
        const composed = await this.composer.composeWithTeam(agentId, profile, team, {
          mergeStrategy: 'team-priority',
          workspacePath,
        });
        composedAgents.push(composed);
      } catch (error) {
        this.logger.error(`Failed to compose agent ${agentId}: ${error}`);
        throw error;
      }
    }

    return composedAgents;
  }

  private trackAgentChangesForTarget(
    agents: ComposedAgentSpec[],
    targetPaths: TargetPaths,
    showDiff: boolean,
    managedAgentIds?: Set<string>,
  ): SyncResult['changes'] {
    if (targetPaths.skipAgents) return [];
    const filtered = agents.filter(
      (a) =>
        !Array.isArray(a.targets) || !a.targets.length || a.targets.includes(targetPaths.target),
    );
    const activeChanges = filtered.map((agent) =>
      this.trackAgentChange(agent, targetPaths, showDiff),
    );

    // Detect orphaned agent files: exist on disk but no longer belong to this target
    const orphanChanges: SyncResult['changes'] = [];
    if (fs.existsSync(targetPaths.agentsDir)) {
      const activeIds = new Set(filtered.map((a) => a.id));
      for (const entry of fs.readdirSync(targetPaths.agentsDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith(targetPaths.agentExtension)) continue;
        const agentId = entry.name.slice(0, -targetPaths.agentExtension.length);
        // Skip files managed by the extension (bundled agents) — they are not team agents
        if (managedAgentIds?.has(agentId)) continue;
        if (!activeIds.has(agentId)) {
          orphanChanges.push({
            agentId: `${targetPaths.target}/${agentId}`,
            action: 'delete',
            filepath: path.join(targetPaths.agentsDir, entry.name),
          });
        }
      }
    }

    return [...activeChanges, ...orphanChanges];
  }

  private trackAgentChange(
    composed: ComposedAgentSpec,
    targetPaths: TargetPaths,
    showDiff: boolean,
  ): SyncResult['changes'][0] {
    const filename = `${composed.id}${targetPaths.agentExtension}`;
    const filepath = path.join(targetPaths.agentsDir, filename);
    const exists = fs.existsSync(filepath);

    let action: 'create' | 'update' | 'skip' = exists ? 'update' : 'create';
    let diff: string | undefined;

    if (exists) {
      const existingContent = fs.readFileSync(filepath, 'utf-8');
      const newContent = this.generateAgentMarkdown(
        this.prepareForWriting(composed),
        targetPaths.target,
      );
      if (existingContent === newContent) {
        action = 'skip';
      } else if (showDiff) {
        diff = this.mergeEngine.formatDiff(
          this.mergeEngine.createDiff(existingContent, newContent),
        );
      }
    }

    return {
      agentId: `${targetPaths.target}/${composed.id}`,
      action,
      diff,
      filepath,
    };
  }

  private trackContextPackChangesForTarget(
    contextPackFiles: string[],
    targetPaths: TargetPaths,
    showDiff: boolean,
  ): SyncResult['changes'] {
    return contextPackFiles.map((sourcePath) => {
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(targetPaths.contextDir, fileName);
      const content = fs.readFileSync(sourcePath, 'utf-8');
      return this.trackTextFileChange(
        `${targetPaths.target}/context-pack:${path.basename(fileName, '.md')}`,
        targetPath,
        content,
        showDiff,
      );
    });
  }

  private listRelativeFiles(baseDir: string): string[] {
    const out: string[] = [];
    const visit = (currentDir: string) => {
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          visit(fullPath);
          continue;
        }
        if (entry.isFile()) {
          out.push(path.relative(baseDir, fullPath));
        }
      }
    };
    visit(baseDir);
    return out.sort((a, b) => a.localeCompare(b));
  }

  private trackDirectoryCopyChangesForTarget(
    sourceDir: string | null,
    entries: string[],
    targetDir: string,
    showDiff: boolean,
  ): SyncResult['changes'] {
    if (!sourceDir) {
      return [];
    }
    return entries.map((relativePath) => {
      const sourcePath = path.join(sourceDir, relativePath);
      const targetPath = path.join(targetDir, relativePath);
      const nextContent = fs.readFileSync(sourcePath);
      return this.trackBinaryFileChange(
        `skills:${relativePath}`,
        targetPath,
        nextContent,
        showDiff,
      );
    });
  }

  private trackBinaryFileChange(
    id: string,
    filepath: string,
    nextContent: Buffer,
    showDiff: boolean,
  ): SyncResult['changes'][0] {
    if (!fs.existsSync(filepath)) {
      return { agentId: id, action: 'create', filepath };
    }

    const currentContent = fs.readFileSync(filepath);
    if (Buffer.compare(currentContent, nextContent) === 0) {
      return { agentId: id, action: 'skip', filepath };
    }

    return {
      agentId: id,
      action: 'update',
      filepath,
      diff: showDiff ? 'Binary content changed' : undefined,
    };
  }

  private trackTextFileChange(
    id: string,
    filepath: string,
    nextContent: string,
    showDiff: boolean,
  ): SyncResult['changes'][0] {
    if (!fs.existsSync(filepath)) {
      return { agentId: id, action: 'create', filepath };
    }

    const currentContent = fs.readFileSync(filepath, 'utf-8');
    if (currentContent === nextContent) {
      return { agentId: id, action: 'skip', filepath };
    }

    return {
      agentId: id,
      action: 'update',
      filepath,
      diff: showDiff ? 'Content changed' : undefined,
    };
  }

  private ensureTargetDirectories(targetPaths: TargetPaths): void {
    if (!targetPaths.skipAgents) {
      fs.mkdirSync(targetPaths.agentsDir, { recursive: true });
    }
    if (targetPaths.contextDir) {
      fs.mkdirSync(targetPaths.contextDir, { recursive: true });
    }
    if (targetPaths.skillsDir) {
      fs.mkdirSync(targetPaths.skillsDir, { recursive: true });
    }
  }

  /**
   * Validate that delegates_to references resolve to agents targeting this platform.
   */
  private validateDelegateReferences(
    agent: ComposedAgentSpec,
    agentIdsForTarget: Set<string>,
    target: SyncTarget,
  ): void {
    if (target !== 'github_copilot') return;
    const delegates = agent.handoffs?.delegates_to;
    if (!delegates?.length) return;
    for (const delegateId of delegates) {
      if (!agentIdsForTarget.has(delegateId)) {
        this.logger.warn(
          `Agent '${agent.id}' delegates to '${delegateId}' but no agent with that ID ` +
            `targets '${target}'. The sub-agent tool will not resolve.`,
        );
      }
    }
  }

  private writeAgentsForTarget(
    agents: ComposedAgentSpec[],
    targetPaths: TargetPaths,
    changes: SyncResult['changes'],
  ): void {
    if (targetPaths.skipAgents) return;

    // Build set of agent IDs targeting this platform for delegate validation
    const agentIdsForTarget = new Set(
      agents
        .filter(
          (a) =>
            !Array.isArray(a.targets) ||
            !a.targets.length ||
            a.targets.includes(targetPaths.target),
        )
        .map((a) => a.id),
    );

    for (const agent of agents) {
      // Skip agents not targeting this platform
      if (
        Array.isArray(agent.targets) &&
        agent.targets.length &&
        !agent.targets.includes(targetPaths.target)
      ) {
        continue;
      }

      // Validate delegates_to references exist for this target
      this.validateDelegateReferences(agent, agentIdsForTarget, targetPaths.target);
      const filename = `${agent.id}${targetPaths.agentExtension}`;
      const filepath = path.join(targetPaths.agentsDir, filename);
      const change = changes.find((c) => c.filepath === filepath);
      if (change?.action === 'skip') {
        continue;
      }

      const cleanAgent = this.prepareForWriting(agent);
      const content = this.generateAgentMarkdown(cleanAgent, targetPaths.target);
      fs.writeFileSync(filepath, content, 'utf-8');
      this.logger.info(`${change?.action === 'create' ? 'Created' : 'Updated'}: ${filepath}`);
    }

    // Delete orphaned agent files
    for (const change of changes) {
      if (change.action === 'delete') {
        fs.unlinkSync(change.filepath);
        this.logger.info(`Deleted: ${change.filepath}`);
      }
    }
  }

  private writeContextPacksForTarget(
    contextPackFiles: string[],
    targetPaths: TargetPaths,
    changes: SyncResult['changes'],
  ): void {
    for (const sourcePath of contextPackFiles) {
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(targetPaths.contextDir, fileName);
      const change = changes.find((c) => c.filepath === targetPath);
      if (change?.action === 'skip') {
        continue;
      }
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  private writeDirectoryCopyForTarget(
    sourceDir: string | null,
    entries: string[],
    targetDir: string,
    changes: SyncResult['changes'],
  ): void {
    if (!sourceDir) {
      return;
    }
    for (const relativePath of entries) {
      const sourcePath = path.join(sourceDir, relativePath);
      const targetPath = path.join(targetDir, relativePath);
      const change = changes.find((c) => c.filepath === targetPath);
      if (change?.action === 'skip') {
        continue;
      }
      const targetParent = path.dirname(targetPath);
      if (!fs.existsSync(targetParent)) {
        fs.mkdirSync(targetParent, { recursive: true });
      }
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  private writeContextFileForTarget(
    targetPaths: TargetPaths,
    content: string,
    change: SyncResult['changes'][0],
  ): void {
    if (change.action === 'skip' || targetPaths.contextFile === null) {
      return;
    }
    const indexDir = path.dirname(targetPaths.contextFile);
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }
    fs.writeFileSync(targetPaths.contextFile, content, 'utf-8');
  }

  /**
   * Parse existing agent file to extract metadata
   */

  /**
   * Prepare agent spec for writing (remove internal metadata)
   */
  private prepareForWriting(agent: ComposedAgentSpec): ComposedAgentSpec {
    const { _composition_metadata: _dropped, ...clean } = agent;
    return clean as ComposedAgentSpec;
  }

  private collectCopilotFrontmatterTools(agent: ComposedAgentSpec): string[] {
    const tools: string[] = [];

    // Standard workflow tools per role (needed to execute lean body steps)
    tools.push('read', 'search');
    if (agent.role === 'worker') tools.push('edit');
    if (agent.role === 'orchestrator') tools.push('todo');

    if (this.agentUsesEngram(agent)) {
      // Engram MCP tools — always present when agent uses Engram
      tools.push('engram/*');
      // Routers and orchestrators originate task delegation — need both dispatch tools
      if (agent.role === 'router' || agent.role === 'orchestrator') {
        tools.push('egdev6.agent-teams/agent-teams-handoff');
        tools.push('egdev6.agent-teams/agent-teams-dispatch-parallel');
      }
      // Workers that receive dispatched tasks need complete-subtask to signal fan-in
      if (agent.role === 'worker' && (agent.handoffs?.receives_from ?? []).length > 0) {
        tools.push('egdev6.agent-teams/agent-teams-complete-subtask');
      }
    }

    // Explicit tools from spec (wizard) — may add execute, MCP tools, etc.
    tools.push(...(agent.tools ?? []).map((t) => normalizeCopilotToolName(t.name)));

    // Deduplicate preserving order (first occurrence wins)
    return [...new Set(tools)];
  }

  private mdFrontmatter(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    if (target === 'github_copilot') {
      // VS Code agent files only support: name, description, tools, model
      const lines = ['---', `name: ${agent.name}`, `description: ${agent.description}`];

      const frontmatterTools = this.collectCopilotFrontmatterTools(agent);
      if (frontmatterTools.length > 0) {
        lines.push(`tools: [${frontmatterTools.join(', ')}]`);
      }

      if (
        agent.role === 'worker' &&
        deriveEngramMode('worker', agent.handoffs?.receives_from) !== 'autonomous'
      ) {
        lines.push('user-invocable: false');
      }

      lines.push('---', '');
      return lines;
    }
    // Claude Code and other targets: use the dedicated Claude mapper
    return this.collectClaudeFrontmatter(agent);
  }

  /**
   * Build Claude Code-compatible frontmatter lines.
   * Only emits fields that are explicitly defined — no implicit defaults.
   * name = agent.id (slug), not the display name.
   */
  private collectClaudeFrontmatter(agent: ComposedAgentSpec): string[] {
    const lines = ['---', `name: ${agent.id}`, `description: ${agent.description}`];

    if (agent.claude_model && agent.claude_model !== 'inherit')
      lines.push(`model: ${agent.claude_model}`);
    if (agent.claude_max_turns && agent.claude_max_turns >= 1)
      lines.push(`maxTurns: ${agent.claude_max_turns}`);
    if (agent.claude_effort) lines.push(`effort: ${agent.claude_effort}`);
    if (agent.claude_permission_mode) lines.push(`permissionMode: ${agent.claude_permission_mode}`);
    if (agent.claude_background === true) lines.push('background: true');

    const tools = this.collectExplicitClaudeTools(agent);
    if (tools.length > 0) lines.push(`tools: ${tools.join(', ')}`);

    const disallowed = agent.claude_disallowed_tools ?? [];
    if (disallowed.length > 0) lines.push(`disallowedTools: ${disallowed.join(', ')}`);

    const skillIds = (agent.skills ?? []).map((s) => (s as AgentSkillRef).id).filter(Boolean);
    if (skillIds.length > 0) {
      lines.push('skills:');
      for (const id of skillIds) lines.push(`  - ${id}`);
    }

    const claudeMcpServers = agent.claude_mcp_servers ?? [];
    if (claudeMcpServers.length > 0) {
      // Claude Code expects mcpServers as an object map keyed by server name, not a list.
      lines.push('mcpServers:');
      for (const srv of claudeMcpServers) {
        lines.push(`  ${srv.name}:`);
        if (srv.type) lines.push(`    type: ${srv.type}`);
        if (srv.command) lines.push(`    command: ${srv.command}`);
        if (srv.args?.length) lines.push(`    args: [${srv.args.join(', ')}]`);
        if (srv.env && Object.keys(srv.env).length > 0) {
          lines.push('    env:');
          for (const [k, v] of Object.entries(srv.env)) {
            lines.push(`      ${k}: ${v}`);
          }
        }
      }
    }

    lines.push('---', '');
    return lines;
  }

  /**
   * Build opencode-compatible frontmatter lines.
   * role → mode: worker→subagent, orchestrator→primary, router→all
   * permissions: can_edit_files→edit, can_run_commands→bash; true→allow, false→deny, unset→ask
   */
  private collectOpencodeFrontmatter(agent: ComposedAgentSpec): string[] {
    // Derive opencode mode from role + topology:
    //   orchestrator → primary (manages a session directly)
    //   router       → all (reachable both ways)
    //   worker with receives_from entries → subagent (invoked by other agents, not user-selectable)
    //   worker without receives_from      → all (user can select it directly or @ it)
    let mode: string;
    if (agent.role === 'orchestrator') {
      mode = 'primary';
    } else if (agent.role === 'router') {
      mode = 'all';
    } else {
      const receivesFrom = (agent as any).handoffs?.receives_from ?? [];
      mode = receivesFrom.length > 0 ? 'subagent' : 'all';
    }

    const perms = (agent as any).permissions ?? {};
    const editPerm =
      perms.can_edit_files === true ? 'allow' : perms.can_edit_files === false ? 'deny' : 'ask';
    const bashPerm =
      perms.can_run_commands === true ? 'allow' : perms.can_run_commands === false ? 'deny' : 'ask';

    const lines: string[] = [
      '---',
      `description: ${agent.description}`,
      `mode: ${mode}`,
      'permissions:',
      `  edit: ${editPerm}`,
      `  bash: ${bashPerm}`,
    ];

    if ((agent as any).opencode_model) {
      lines.push(`model: ${(agent as any).opencode_model}`);
    }

    lines.push('---', '');
    return lines;
  }

  /** VS Code tool name → one or more Claude Code built-in tool names. */
  private static readonly VSCODE_TO_CLAUDE_TOOL_MAP: Record<string, string[]> = {
    read: ['Read'],
    edit: ['Edit'],
    search: ['Grep', 'Glob'],
    execute: ['Bash'],
    browser: ['WebFetch'],
    web: ['WebSearch'],
    agent: ['Agent'],
    todo: ['TodoWrite'],
  };

  /**
   * Returns Claude Code tool names derived from the agent's VS Code tool list.
   * Skips MCP tools (engram/*, egdev6.*), Copilot-only tools (complete-subtask, vscode),
   * and any unmapped names — those are extension-specific and have no Claude equivalent.
   * Returns an empty array when no translatable tools are present, which causes
   * collectClaudeFrontmatter to omit the `tools:` line entirely (inherit all).
   */
  private collectExplicitClaudeTools(agent: ComposedAgentSpec): string[] {
    const result: string[] = [];
    for (const t of agent.tools ?? []) {
      const name = t.name;
      // Skip MCP tools and Copilot-only / extension tools
      if (
        name.startsWith('engram/') ||
        name.startsWith('egdev6.') ||
        name === 'complete-subtask' ||
        name === 'vscode'
      )
        continue;
      const mapped = TeamManager.VSCODE_TO_CLAUDE_TOOL_MAP[name];
      if (mapped) {
        for (const m of mapped) {
          if (!result.includes(m)) result.push(m);
        }
      }
      // Unknown / unmapped names are dropped — do not pass through raw
    }
    return result;
  }

  private mdHeader(agent: ComposedAgentSpec, target: SyncTarget = 'claude_code'): string[] {
    // description already in frontmatter for both copilot and claude targets
    const lines: string[] =
      target === 'github_copilot' || target === 'claude_code'
        ? [`# ${agent.name}`, '']
        : [`# ${agent.name}`, '', agent.description, ''];
    let roleLine = `**Role:** ${agent.role}`;
    if (agent.domain) {
      roleLine += ` | **Domain:** ${agent.domain}`;
      if (agent.subdomain) roleLine += ` / ${agent.subdomain}`;
    }
    lines.push(roleLine, '');
    if (agent.expertise?.length) {
      lines.push(
        '## Expertise & Intents',
        '',
        `**Specialises in:** ${agent.expertise.join(', ')}`,
        '',
      );
    }
    if (agent.intents?.length) {
      lines.push(`**Handles intents:** ${agent.intents.join(', ')}`, '');
    }
    return lines;
  }

  /** Format a single path-glob entry as a markdown list item. */
  private mdGlobLine(g: string | { pattern: string; priority?: string }): string {
    if (typeof g === 'string') return `- \`${g}\``;
    return `- \`${g.pattern}\`${g.priority ? ` *(${g.priority})*` : ''}`;
  }

  private mdScope(agent: ComposedAgentSpec): string[] {
    // Router has no path-based scope; skip entirely
    if (agent.role === 'router') return [];

    const scope: AgentScope = agent.scope ?? {};
    // Orchestrators only use topics — path_globs/excludes are not applicable to coordination agents
    const showGlobs = agent.role !== 'orchestrator';

    const hasContent =
      scope.topics?.length ||
      (showGlobs && scope.path_globs?.length) ||
      (showGlobs && scope.excludes?.length);
    if (!hasContent) return [];

    const lines = ['## Scope', ''];
    if (scope.topics?.length) {
      lines.push('**Manages:**', ...scope.topics.map((t) => `- ${t}`), '');
    }
    if (showGlobs && scope.path_globs?.length) {
      lines.push('**Primary paths:**', ...scope.path_globs.map((g) => this.mdGlobLine(g)), '');
    }
    if (showGlobs && scope.excludes?.length) {
      lines.push('**Out of scope:**', ...scope.excludes.map((e) => `- ${e}`), '');
    }
    return lines;
  }

  private mdWorkflowAndTools(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    const lines = ['## Workflow', ''];
    const steps = resolveWorkflow(agent.role, agent.workflow, {
      receivesFrom: agent.handoffs?.receives_from,
      delegatesTo: agent.handoffs?.delegates_to,
      scopeTopics: agent.scope?.topics,
      escalatesTo: agent.handoffs?.escalates_to,
      output: agent.output,
      target,
    });
    for (const [i, step] of steps.entries()) {
      lines.push(`${i + 1}. ${step}`);
    }
    lines.push('');
    if (agent.skills?.length) {
      lines.push('## Skills', '', '| Skill | When to invoke |', '|-------|----------------|');
      for (const skill of agent.skills as AgentSkillRef[]) {
        lines.push(`| ${skill.id} | ${skill.when ?? '—'} |`);
      }
      lines.push('');
    }
    // MCP servers are configured via workspace settings (e.g. .vscode/mcp.json),
    // not declared inside the agent file. Only emit this section for claude_code,
    // where it serves as reference documentation.
    if (agent.mcpServers?.length && target === 'claude_code') {
      lines.push('## MCP Servers', '', '| Server | Command |', '|--------|---------|');
      for (const server of agent.mcpServers) {
        const cmd = [server.command, ...(server.args ?? [])].join(' ');
        lines.push(`| ${server.id} | ${cmd} |`);
      }
      lines.push('');
    }
    return lines;
  }

  private mdPermissionsAndConstraints(agent: ComposedAgentSpec): string[] {
    // Routers have no constraints — keep the markdown lean
    if (agent.role === 'router') return [];

    const hasConstraints =
      agent.constraints?.always?.length ||
      agent.constraints?.never?.length ||
      agent.constraints?.escalate?.length;

    const lines: string[] = [];

    if (hasConstraints) {
      lines.push('## Constraints', '');
      if (agent.constraints?.always?.length) {
        lines.push('**Always:**', ...agent.constraints.always.map((r) => `- ${r}`), '');
      }
      if (agent.constraints?.never?.length) {
        lines.push('**Never:**', ...agent.constraints.never.map((r) => `- ${r}`), '');
      }
      if (agent.constraints?.escalate?.length) {
        lines.push('**Escalate when:**', ...agent.constraints.escalate.map((r) => `- ${r}`), '');
      }
    }

    return lines;
  }

  /**
   * Build Copilot-specific delegate sub-agent instructions for the Handoffs section.
   */
  private mdCopilotDelegateInstructions(delegates: string[]): string[] {
    const lines = [
      '> **Sub-agent delegation — required:** You MUST invoke the sub-agents listed below as tool calls.',
      '> Do **not** respond with text analysis or a plan. Your role is to orchestrate: decompose the task, then immediately call the appropriate sub-agent tool(s) with full context.',
      '',
      '**Delegates to (sub-agents):**',
      '',
    ];
    for (const delegate of delegates) {
      lines.push(
        `- \`${delegate}\` — **call as a tool** (mandatory). Pass the complete sub-task description and all relevant context.` +
          ' The sub-agent runs with an isolated context window — provide everything it needs in the invocation.',
      );
    }
    lines.push('');
    return lines;
  }

  private mdRouterDispatchInstructions(delegates: string[]): string[] {
    const delegateList = delegates.map((d) => `\`${d}\``).join(', ');
    const exampleDelegate = delegates[0] ?? 'orchestrator';
    return [
      '> **Routing — required:** Analyse the task and dispatch it. Do NOT respond with just a plan.',
      `> Your available orchestrators are: ${delegateList}`,
      '',
      '**Decision — choose ONE of these actions:**',
      '',
      '- **Single domain** → use `agent-teams-handoff` tool',
      '- **Multiple domains that can work in parallel** → use `agent-teams-dispatch-parallel` tool',
      '',
      '**When using `agent-teams-handoff` (single domain):**',
      '1. Generate task ID: `task-{unix-timestamp}` (e.g. `task-1741788000`)',
      '2. Call `engram_remember` key `handoff:{taskId}` → full Markdown assessment of the task',
      `3. Call \`agent-teams-handoff\` with \`{ "targetAgentId": "${exampleDelegate}", "taskId": "task-1741788000", "assessment": "<one-line summary>" }\``,
      '4. All 3 parameters are REQUIRED — never call this tool with an empty object',
      '',
      '**When using `agent-teams-dispatch-parallel` (parallel work):**',
      '1. Generate task ID: `task-{unix-timestamp}` (e.g. `task-1741788000`)',
      '2. For each orchestrator: call `engram_remember` key `task:{taskId}:subtask:{agentId}` → Markdown sub-assessment',
      `3. Call \`agent-teams-dispatch-parallel\` with \`{ "taskId": "task-1741788000", "assessment": "<one-line summary>", "subtasks": [{ "agentId": "${exampleDelegate}", "description": "..." }] }\``,
      '4. All parameters are REQUIRED — `assessment` (string) and `subtasks` (array, min 2 items) must always be provided',
      '',
    ];
  }

  private mdHandoffsAndOutput(
    agent: ComposedAgentSpec,
    target: SyncTarget = 'claude_code',
  ): string[] {
    return [...this.mdHandoffs(agent, target), ...this.mdOutput(agent)];
  }

  private mdDelegatesTo(
    agent: ComposedAgentSpec,
    target: SyncTarget,
    delegates: string[],
  ): string[] {
    if (target === 'github_copilot' && this.agentUsesEngram(agent)) {
      return agent.role === 'router'
        ? this.mdRouterDispatchInstructions(delegates)
        : this.mdCopilotDelegateInstructions(delegates);
    }

    const lines = [`**Delegates to:** ${delegates.join(', ')}`, ''];
    if (target === 'claude_code' && this.agentUsesEngram(agent)) {
      lines.push(
        'Delegate through Engram + MCP: write `task:{taskId}:subtask:{agentId}` first, then call `dispatch_task`.',
        '',
      );
    }
    return lines;
  }

  private mdHandoffs(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    const h = agent.handoffs;
    const hasContent =
      h?.receives_from?.length || h?.delegates_to?.length || h?.escalates_to?.length;
    // Omit the entire section when there is nothing to say
    if (!hasContent) return [];

    const lines = ['## Handoffs', ''];
    if (h?.receives_from?.length) {
      lines.push(`**Receives tasks from:** ${h.receives_from.join(', ')}`, '');
    }
    if (h?.delegates_to?.length) {
      lines.push(...this.mdDelegatesTo(agent, target, h.delegates_to));
    }
    if (h?.escalates_to?.length) {
      lines.push(`**Escalates to:** ${h.escalates_to.join(', ')}`, '');
    }
    return lines;
  }

  private mdOutput(agent: ComposedAgentSpec): string[] {
    const lines: string[] = [];
    const out = agent.output ?? {};
    const outTemplate = out.template ?? 'diff';
    const outParts = [`**Template:** \`${outTemplate}\``];
    if (out.mode) outParts.push(`**Mode:** ${out.mode}`);
    if (out.max_items) outParts.push(`**Max items:** ${out.max_items}`);
    lines.push('## Output', '', outParts.join(' | '), '');
    // Router output is about routing decisions — the verbose structure template adds no value
    if (agent.role !== 'router') {
      const structure = resolveOutputStructure({
        template: outTemplate,
        format_instructions: out.format_instructions,
      });
      if (structure) lines.push(structure, '');
    }
    if (out.format_instructions) {
      lines.push(`**Format instructions:** ${out.format_instructions}`, '');
    }
    if (out.never_include?.length) {
      lines.push(`**Never include:** ${out.never_include.join(', ')}`, '');
    }
    return lines;
  }

  private isEngramConfigured(): boolean {
    if (!this._currentProjectRoot) return false;
    const mcpJsonPath = path.join(this._currentProjectRoot, '.vscode', 'mcp.json');
    try {
      const content = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      return !!content?.servers?.engram;
    } catch {
      return false;
    }
  }

  /**
   * Returns true when Engram should be enabled for the given agent.
   * An agent uses Engram when the workspace has Engram globally configured
   * *or* when the agent spec explicitly declares the `engram` MCP server in
   * its `mcpServers` list (enabling self-contained agents + bootstrap sync).
   */
  private agentUsesEngram(agent: ComposedAgentSpec): boolean {
    if (this.isEngramConfigured()) return true;
    return agent.mcpServers?.some((s) => s.id === 'engram') ?? false;
  }

  /**
   * Resolve the SKILL.md content for a skill ID.
   * Order: workspace .agent-teams/skills/ → bundled-skills shipped with the extension.
   */
  private resolveSkillContent(skillId: string): string | null {
    // 1. Workspace-local skill
    if (this._currentProjectRoot) {
      const workspacePath = path.join(
        this._currentProjectRoot,
        '.agent-teams',
        'skills',
        skillId,
        'SKILL.md',
      );
      if (fs.existsSync(workspacePath)) {
        return fs.readFileSync(workspacePath, 'utf-8');
      }
    }
    // 2. Bundled skill shipped with the extension
    if (this._bundledSkillsDir) {
      const bundledPath = path.join(this._bundledSkillsDir, skillId, 'SKILL.md');
      if (fs.existsSync(bundledPath)) {
        return fs.readFileSync(bundledPath, 'utf-8');
      }
    }
    return null;
  }

  /**
   * Inline SKILL.md content for each skill declared on the agent.
   * Only emitted when a bundled-skills dir is configured — keeps generated
   * markdown clean in pure-YAML / CLI workflows where skills aren't available.
   */
  private mdInlinedSkills(agent: ComposedAgentSpec): string[] {
    if (!agent.skills?.length) return [];
    const sections: string[] = [];
    for (const skill of agent.skills as AgentSkillRef[]) {
      const content = this.resolveSkillContent(skill.id);
      if (content) {
        sections.push('---', `<!-- skill: ${skill.id} -->`, content.trim(), '');
      }
    }
    return sections;
  }

  /**
   * Generate LLM-readable markdown file content for agent
   */
  private generateAgentMarkdown(
    agent: ComposedAgentSpec,
    target: SyncTarget = 'claude_code',
  ): string {
    if (target === 'opencode') {
      return [
        ...this.collectOpencodeFrontmatter(agent),
        ...this.mdHeader(agent, target),
        ...this.generateLeanBody(agent, 'claude_code'),
        ...this.mdInlinedSkills(agent),
      ].join('\n');
    }
    if (target === 'claude_code') {
      return [
        ...this.mdFrontmatter(agent, target),
        ...this.generateLeanBody(agent, 'claude_code'),
        ...this.mdInlinedSkills(agent),
      ].join('\n');
    }
    if (target === 'github_copilot') {
      return [
        ...this.mdFrontmatter(agent, target),
        ...this.generateLeanBody(agent, 'github_copilot'),
        ...this.mdInlinedSkills(agent),
      ].join('\n');
    }
    return [
      ...this.mdFrontmatter(agent, target),
      ...this.mdHeader(agent, target),
      ...this.mdScope(agent),
      ...this.mdWorkflowAndTools(agent, target),
      ...this.mdPermissionsAndConstraints(agent),
      ...this.mdHandoffsAndOutput(agent, target),
      ...this.mdContextPacks(agent, target),
      ...this.mdInlinedSkills(agent),
    ].join('\n');
  }

  /** Map output template id → lean bullet list for Claude Code body. */
  private static readonly CLAUDE_OUTPUT_BULLETS: Record<string, string[]> = {
    diff: ['Status', 'Changes made', 'Rationale', 'Verification'],
    planning: ['Status', 'Plan summary', 'Steps', 'Dependencies', 'Risks'],
    analysis: ['Status', 'Summary', 'Findings', 'Evidence', 'Risks'],
    'code-review': ['Status', 'Critical issues', 'Warnings', 'Suggestions'],
    'routing-decision': ['Chosen agent', 'Rationale', 'Context passed'],
    'step-by-step': ['Status', 'Steps executed', 'Results', 'Next action'],
    summary: ['Status', 'Summary', 'Key points', 'Next action'],
    'structured-qa': ['Question', 'Answer', 'Evidence'],
    custom: ['Status', 'Result'],
  };

  /**
   * Generate a lean body shared between claude_code and github_copilot targets.
   * Pattern: persona line → Role → Constraints → Approach → [Delegates to] → Output Format
   * No metadata tables, no scope section, no MCP server tables.
   */
  private generateLeanBody(
    agent: ComposedAgentSpec,
    target: 'claude_code' | 'github_copilot',
  ): string[] {
    const lines: string[] = [];
    const usesEngram = this.agentUsesEngram(agent);
    const isClaude = target === 'claude_code';

    // Persona line
    lines.push(`You are the ${agent.name.toLowerCase()} agent.`, '');

    // ## Role
    lines.push('## Role', '');
    if (agent.expertise?.length) {
      for (const e of agent.expertise) lines.push(`- ${e}`);
    } else if (agent.scope?.topics?.length) {
      for (const t of agent.scope.topics) lines.push(`- ${t}`);
    } else {
      lines.push(`- ${agent.role} agent`);
    }
    lines.push('');

    // ## Constraints (only if defined)
    const c = agent.constraints;
    const scopeExcludes = agent.scope?.excludes ?? [];
    const hasConstraints =
      c?.always?.length || c?.never?.length || c?.escalate?.length || scopeExcludes.length;
    if (hasConstraints) {
      lines.push('## Constraints', '');
      for (const r of c?.always ?? []) lines.push(`- ${r}`);
      for (const r of c?.never ?? []) lines.push(`- Do not ${r}`);
      for (const r of c?.escalate ?? []) lines.push(`- Escalate when: ${r}`);
      if (scopeExcludes.length) lines.push(`- Do not modify: ${scopeExcludes.join(', ')}`);
      lines.push('');
    }

    // ## Approach
    lines.push('## Approach', '');
    const workflowSteps = resolveWorkflow(agent.role, agent.workflow, {
      receivesFrom: agent.handoffs?.receives_from,
      delegatesTo: agent.handoffs?.delegates_to,
      scopeTopics: agent.scope?.topics,
      escalatesTo: agent.handoffs?.escalates_to,
      output: agent.output,
      target,
    });

    // Condense Engram steps: wrap session start/end as first/last step
    if (usesEngram) {
      let workSteps = workflowSteps.filter(
        (s) =>
          typeof s === 'string' &&
          !s.includes('mem_session_start') &&
          !s.includes('mem_session_end') &&
          !s.includes('mem_context') &&
          !s.includes('mem_save') &&
          !s.includes('mem_suggest_topic_key') &&
          !s.includes('mem_search'),
      );

      // For orchestrators with delegates: inject a dispatch step after the "Assign" step.
      // The original delegation step was filtered (it contained mem_save), so we recover
      // the dispatch tool references as a standalone step.
      const delegates = agent.handoffs?.delegates_to ?? [];
      if (agent.role === 'orchestrator' && delegates.length > 0) {
        const singleTool = isClaude
          ? '`dispatch_task` MCP tool'
          : '`egdev6.agent-teams/agent-teams-handoff`';
        const parallelTool = isClaude
          ? '`dispatch_task` (once per sub-task)'
          : '`egdev6.agent-teams/agent-teams-dispatch-parallel`';
        const dispatchStep = `For each delegation: use ${singleTool} (single agent) or ${parallelTool} (parallel) — do NOT respond until all invocations complete.`;
        const assignIdx = workSteps.findIndex(
          (s) => s.startsWith('Assign each sub-task') || s.startsWith('Identify the most suitable'),
        );
        if (assignIdx >= 0) {
          workSteps = [
            ...workSteps.slice(0, assignIdx + 1),
            dispatchStep,
            ...workSteps.slice(assignIdx + 1),
          ];
        }
      }

      lines.push(
        '1. Start Engram session: call `mem_session_start`, then `mem_context` to load recent context.',
      );
      for (const [i, step] of workSteps.entries()) {
        lines.push(`${i + 2}. ${step}`);
      }
      lines.push(
        `${workSteps.length + 2}. Save to Engram: call \`mem_save\` with key from \`mem_suggest_topic_key\`, then \`mem_session_end\`.`,
      );
    } else {
      for (const [i, step] of workflowSteps.entries()) {
        lines.push(`${i + 1}. ${step}`);
      }
    }

    // Inline path scope hint for workers
    if (agent.role === 'worker' && agent.scope?.path_globs?.length) {
      const firstGlob = agent.scope.path_globs[0];
      const pattern = typeof firstGlob === 'string' ? firstGlob : firstGlob.pattern;
      lines.push('', `Work within \`${pattern}\` and direct imports.`);
    }
    lines.push('');

    // ## Delegates to (orchestrator / router)
    const delegates = agent.handoffs?.delegates_to ?? [];
    if (delegates.length > 0) {
      const heading = agent.role === 'router' ? '## Available Agents' : '## Delegates to';
      lines.push(heading, '');
      for (const d of delegates) lines.push(`- \`${d}\``);
      if (usesEngram) {
        if (isClaude) {
          lines.push(
            '',
            'To dispatch: save context via `mem_save` (`task:{taskId}:subtask:{agentId}`), then call `dispatch_task`.',
            'Workers will call `complete_subtask` when done — wait for all to complete before aggregating.',
          );
        } else {
          lines.push(
            '',
            'To dispatch (single): save context via `mem_save` (key `task:{taskId}:subtask:{agentId}`), then call `egdev6.agent-teams/agent-teams-handoff`.',
            'To dispatch (parallel): save context per subtask, then call `egdev6.agent-teams/agent-teams-dispatch-parallel`.',
            'Workers will call `egdev6.agent-teams/agent-teams-complete-subtask` when done — wait for all to complete before aggregating.',
          );
        }
      }
      lines.push('');
    }

    // ## Output Format
    const templateId = agent.output?.template ?? 'diff';
    const formatInstructions = agent.output?.format_instructions?.trim();
    lines.push('## Output Format', '');
    if (templateId === 'custom' && formatInstructions) {
      lines.push(formatInstructions);
    } else {
      const bullets =
        TeamManager.CLAUDE_OUTPUT_BULLETS[templateId] ?? TeamManager.CLAUDE_OUTPUT_BULLETS.diff;
      for (const b of bullets) lines.push(`- ${b}`);
    }
    const neverInclude = agent.output?.never_include ?? [];
    if (neverInclude.length) lines.push(`- Never include: ${neverInclude.join(', ')}`);
    lines.push('');

    return lines;
  }

  private mdContextPacks(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    if (!agent.context_packs?.length) {
      return [];
    }
    const contextDir =
      target === 'github_copilot'
        ? '.github/context'
        : target === 'claude_code'
          ? '.claude/context'
          : '.agent-teams/context-packs';
    const rows = agent.context_packs.map((p) => `| \`${p}\` | \`${contextDir}/${p}.md\` |`);
    return [
      '## Context Packs',
      '',
      'Read these files using your file-reading tools when the task requires that domain knowledge:',
      '',
      '| Pack | Path |',
      '|------|------|',
      ...rows,
      '',
    ];
  }

  /**
   * List available teams in a project
   */
  async listTeams(projectRoot: string): Promise<string[]> {
    const teamsDirs = [
      path.join(projectRoot, '.agent-teams', 'teams'),
      path.join(projectRoot, '.agent-team', 'teams'),
    ];
    const teamIds = new Set<string>();

    for (const teamsDir of teamsDirs) {
      if (!fs.existsSync(teamsDir)) {
        continue;
      }

      const files = fs.readdirSync(teamsDir);
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          teamIds.add(path.basename(file, path.extname(file)));
        }
      }
    }

    return [...teamIds].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Create a new team profile
   */
  async createTeam(
    projectRoot: string,
    teamId: string,
    options: {
      name: string;
      description?: string;
      enabledAgents?: string[];
      tags?: string[];
    },
  ): Promise<void> {
    const teamsDir = path.join(projectRoot, '.agent-teams', 'teams');
    const teamPath = path.join(teamsDir, `${teamId}.yml`);

    if (fs.existsSync(teamPath)) {
      throw new Error(`Team already exists: ${teamId}`);
    }

    if (!fs.existsSync(teamsDir)) {
      fs.mkdirSync(teamsDir, { recursive: true });
    }

    const team: TeamProfile = {
      id: teamId,
      name: options.name,
      description: options.description,
      agents: {
        enable:
          options.enabledAgents && options.enabledAgents.length > 0 ? options.enabledAgents : 'all',
        disable: [],
      },
      overrides: {},
    };

    if (options.tags && options.tags.length > 0) {
      (team as TeamProfile & { tags?: string[] }).tags = options.tags;
    }

    const content = YAML.stringify(team);
    fs.writeFileSync(teamPath, content, 'utf-8');

    this.logger.info(`Team created: ${teamId}`);
  }
}
