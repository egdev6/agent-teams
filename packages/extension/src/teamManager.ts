import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentScope, AgentSkillRef, AgentTool } from '@agent-teams/core';
import {
  DEFAULT_AGENTS_MD_BUDGET,
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
import { buildMemorySection } from './memoryInstructions';
import { MergeEngine } from './mergeEngine';
import { ProfileLoader } from './profileLoader';
import type { ComposedAgentSpec, ProjectProfile, SyncTarget, TeamProfile } from './types';

/**
 * Maps legacy VS Code built-in tool names to their current slugs.
 * Extend this map as VS Code renames tools in future releases.
 */
const VSCODE_TOOL_ALIASES: Record<string, string> = {
  codebase: 'search/codebase',
  editFiles: 'edit/editFiles',
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

  private normalizeProfileSyncTarget(raw: string): SyncTarget | null {
    if (raw === 'github_copilot') return 'copilot';
    if (raw === 'claude_code') return 'claude';
    if (raw === 'codex') return 'codex';
    return null;
  }

  private resolveSyncTargets(
    profile: ProjectProfile,
    explicitTargets?: SyncTarget[],
  ): SyncTarget[] {
    const allowed = new Set<SyncTarget>(['copilot', 'claude', 'codex']);
    if (explicitTargets && explicitTargets.length > 0) {
      return [...new Set(explicitTargets.filter((target) => allowed.has(target)))];
    }
    if (Array.isArray(profile.sync_targets) && profile.sync_targets.length > 0) {
      const normalized = profile.sync_targets
        .map((t) => this.normalizeProfileSyncTarget(t))
        .filter((t): t is SyncTarget => t !== null);
      if (normalized.length > 0) return [...new Set(normalized)];
    }
    return ['copilot', 'claude'];
  }

  private resolveTargetPaths(
    projectRoot: string,
    target: SyncTarget,
    outputDir?: string,
  ): TargetPaths {
    if (target === 'copilot') {
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

    if (target === 'claude') {
      const claudeDir = path.join(projectRoot, '.claude');
      return {
        target,
        agentsDir: path.join(claudeDir, 'agents'),
        skillsDir: path.join(claudeDir, 'skills'),
        contextDir: path.join(claudeDir, 'context'),
        contextFile: path.join(projectRoot, 'AGENTS.md'),
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
    lines.push('## Context Packs');
    lines.push(...(packLinks.length > 0 ? packLinks : ['- No context packs selected.']));
    lines.push('');
    lines.push('## Agents');
    lines.push(...(agentEntries.length > 0 ? agentEntries : ['- None']));
    return lines.join('\n');
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
    if (target === 'claude') {
      return true;
    }

    if (target !== 'codex') {
      return false;
    }

    return this.resolveSyncTargets(profile).includes('claude');
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
    const skillsSourceDir = this.resolveSkillsSourceDir(projectRoot);
    const skillEntries = skillsSourceDir
      ? this.listRelativeFiles(skillsSourceDir).filter((f) => path.basename(f) !== 'metadata.yml')
      : [];

    const composedAgents = await this.composeTeamAgents(team, profile, projectRoot);
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
  ): Promise<SyncResult['changes']> {
    const targetPaths = this.resolveTargetPaths(projectRoot, target, outputDir);
    const targetChanges: SyncResult['changes'] = [];

    const agentChanges = this.trackAgentChangesForTarget(composedAgents, targetPaths, showDiff);
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
    // Collect all mcpServers across agents, deduped by id (first occurrence wins)
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
    if (seen.size === 0) return;

    if (target === 'copilot') {
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
      const servers = (existing.servers ?? {}) as Record<string, unknown>;
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
      if (modified) {
        existing.servers = servers;
        fs.writeFileSync(mcpJsonPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
      }
    } else if (target === 'claude') {
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
  }

  private async buildContextFileContent(
    target: SyncTarget,
    team: TeamProfile,
    agents: ComposedAgentSpec[],
    contextPackFiles: string[],
    profile: ProjectProfile,
    projectRoot: string,
  ): Promise<string> {
    if (target === 'claude' || target === 'codex') {
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
  ): SyncResult['changes'] {
    if (targetPaths.skipAgents) return [];
    const filtered = agents.filter(
      (a) => !a.targets?.length || a.targets.includes(targetPaths.target),
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
    if (target !== 'copilot') return;
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
        .filter((a) => !a.targets?.length || a.targets.includes(targetPaths.target))
        .map((a) => a.id),
    );

    for (const agent of agents) {
      // Skip agents not targeting this platform
      if (agent.targets?.length && !agent.targets.includes(targetPaths.target)) {
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
    if (this.isEngramConfigured()) {
      tools.push(...(agent.handoffs?.delegates_to ?? []));
      // Routers get the handoff + parallel-dispatch tools when Engram is available
      if (agent.role === 'router') {
        tools.push('agent-teams-handoff');
        tools.push('agent-teams-dispatch-parallel');
      }
      // Orchestrators get the complete-subtask tool to report fan-in
      if (agent.role === 'orchestrator') {
        tools.push('agent-teams-complete-subtask');
      }
      // Autonomous workers get the complete-subtask tool to signal parallel dispatch completion
      if (agent.role === 'worker' && agent.engram?.mode === 'autonomous') {
        tools.push('agent-teams-complete-subtask');
      }
    }
    tools.push(...(agent.tools ?? []).map((t) => normalizeCopilotToolName(t.name)));
    // Deduplicate preserving order (first occurrence wins)
    return [...new Set(tools)];
  }

  private mdFrontmatter(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    if (target === 'copilot') {
      // VS Code agent files only support: name, description, tools, model
      const lines = ['---', `name: ${agent.name}`, `description: ${agent.description}`];

      const frontmatterTools = this.collectCopilotFrontmatterTools(agent);
      if (frontmatterTools.length > 0) {
        lines.push('tools:');
        for (const tool of frontmatterTools) {
          lines.push(`  - ${tool}`);
        }
      }

      lines.push('---', '');
      return lines;
    }
    // Claude Code uses `description` for sub-agent routing
    const lines = [
      '---',
      `id: ${agent.id}`,
      `name: ${agent.name}`,
      `description: ${agent.description}`,
      `role: ${agent.role}`,
    ];
    if (agent.domain) lines.push(`domain: ${agent.domain}`);
    if (agent.subdomain) lines.push(`subdomain: ${agent.subdomain}`);
    if (agent.version) lines.push(`version: ${agent.version}`);
    lines.push('---', '');
    return lines;
  }

  private mdHeader(agent: ComposedAgentSpec, target: SyncTarget = 'claude'): string[] {
    // description already in frontmatter for both copilot and claude targets
    const lines: string[] =
      target === 'copilot' || target === 'claude'
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

  private mdClaudeWorkflowAndTools(agent: ComposedAgentSpec): string[] {
    if (!this.isEngramConfigured()) return [];

    if (agent.role === 'router') {
      return [
        '## Claude Delegation',
        '',
        'Use the portable Engram + MCP protocol instead of Copilot LM tools:',
        '',
        '1. Generate `task-{unix-timestamp}`.',
        '2. For each target orchestrator, write the full context to Engram using `task:{taskId}:subtask:{agentId}`.',
        '3. Call `dispatch_task` with `{ agentId, taskId, description }` once per orchestrator.',
        '4. Do not assume any Claude agent shares your current chat context.',
        '',
      ];
    }

    if (agent.role === 'orchestrator') {
      return [
        '## Claude Delegation',
        '',
        'When delegating to another Claude agent:',
        '',
        '1. Write the complete sub-task to Engram with `engram_remember` key `task:{taskId}:subtask:{agentId}`.',
        '2. Call the `dispatch_task` MCP tool with `{ agentId, taskId, description }`.',
        '3. When you finish a parallel subtask, persist `task:{taskId}:subtask:{agentId}:result` and then call `complete_subtask`.',
        '',
      ];
    }

    if (agent.role === 'worker' && agent.engram?.mode === 'autonomous') {
      return [
        '## Task Context (Autonomous)',
        '',
        'This worker operates in autonomous mode — it can be dispatched directly without a router or orchestrator.',
        '',
        '**At session start, recall your task context:**',
        '- If chat contains `[Handoff:{taskId}]`: call `engram_recall` with key `handoff:{taskId}`',
        '- If chat contains `[Parallel:{taskId}]`: call `engram_recall` with key `task:{taskId}:subtask:{agentId}` (your agentId is in the prompt prefix)',
        '',
        '**After completing a parallel subtask:**',
        '1. Persist your result: `engram_remember` key `task:{taskId}:subtask:{agentId}:result`',
        '2. Call the `complete_subtask` MCP tool with `{ taskId, agentId }` to notify the aggregator',
        '',
      ];
    }

    return [];
  }

  private mdWorkflowAndTools(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    const lines = ['## Workflow', ''];
    const steps = resolveWorkflow(agent.role, agent.workflow);
    for (const [i, step] of steps.entries()) {
      lines.push(`${i + 1}. ${step}`);
    }
    lines.push('');
    if (agent.tools?.length) {
      lines.push('## Tools', '', '| Tool | When to use |', '|------|-------------|');
      for (const tool of agent.tools as AgentTool[]) {
        lines.push(`| ${tool.name} | ${tool.when ?? '—'} |`);
      }
      lines.push('');
    }
    if (agent.skills?.length) {
      lines.push('## Skills', '', '| Skill | When to invoke |', '|-------|----------------|');
      for (const skill of agent.skills as AgentSkillRef[]) {
        lines.push(`| ${skill.id} | ${skill.when ?? '—'} |`);
      }
      lines.push('');
    }
    if (agent.mcpServers?.length) {
      lines.push('## MCP Servers', '', '| Server | Command |', '|--------|---------|');
      for (const server of agent.mcpServers) {
        const cmd = [server.command, ...(server.args ?? [])].join(' ');
        lines.push(`| ${server.id} | ${cmd} |`);
      }
      lines.push('');
    }
    if (target === 'claude') {
      lines.push(...this.mdClaudeWorkflowAndTools(agent));
    }
    return lines;
  }

  private mdPermissionsAndConstraints(agent: ComposedAgentSpec): string[] {
    // Routers have no permissions or constraints — keep the markdown lean
    if (agent.role === 'router') return [];

    const p = agent.permissions ?? {};
    const hasAnyPermission = Object.values(p).some(Boolean);
    const hasConstraints =
      agent.constraints?.always?.length ||
      agent.constraints?.never?.length ||
      agent.constraints?.escalate?.length;

    const lines: string[] = [];

    if (agent.role === 'orchestrator') {
      // Orchestrators only need a one-liner — they delegate, not execute
      if (p.can_delegate) {
        lines.push('## Permissions', '', '**Can delegate:** yes', '');
      }
    } else if (hasAnyPermission) {
      // Worker (or unknown) — emit full table when at least one permission is set
      const yn = (v?: boolean) => (v ? 'yes' : 'no');
      lines.push(
        '## Permissions',
        '',
        '| Permission | Allowed |',
        '|-----------|---------|',
        `| Create files | ${yn(p.can_create_files)} |`,
        `| Edit files | ${yn(p.can_edit_files)} |`,
        `| Delete files | ${yn(p.can_delete_files)} |`,
        `| Run commands | ${yn(p.can_run_commands)} |`,
        `| Delegate to agents | ${yn(p.can_delegate)} |`,
        `| Modify public API | ${yn(p.can_modify_public_api)} |`,
        `| Touch global config | ${yn(p.can_touch_global_config)} |`,
        '',
      );
    }

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
    return [
      '> **Routing — required:** Analyse the task and dispatch it. Do NOT respond with just a plan.',
      `> Your available orchestrators are: ${delegateList}`,
      '',
      '**Decision — choose ONE of these actions:**',
      '',
      `- **Single domain** → call the orchestrator tool directly (e.g. \`${delegates[0] ?? 'orchestrator'}\`) with the full task description`,
      '- **Multiple domains that can work in parallel** → call `agent-teams-dispatch-parallel` tool (do NOT call the orchestrators directly)',
      '',
      '**When using `agent-teams-dispatch-parallel` (parallel work):**',
      '1. Generate task ID: `task-{unix-timestamp}` (e.g. `task-1741788000`)',
      '2. For each orchestrator: call `engram_remember` key `task:{taskId}:subtask:{agentId}` → Markdown sub-assessment',
      '3. Call `agent-teams-dispatch-parallel` with `{ taskId, assessment: "<one-line summary>", subtasks: [{ agentId, description }, ...] }`',
      '4. The tool opens a supervised chat per orchestrator — do NOT call them as direct tools',
      '',
    ];
  }

  private mdHandoffsAndOutput(agent: ComposedAgentSpec, target: SyncTarget = 'claude'): string[] {
    return [...this.mdHandoffs(agent, target), ...this.mdOutput(agent)];
  }

  private mdDelegatesTo(
    agent: ComposedAgentSpec,
    target: SyncTarget,
    delegates: string[],
  ): string[] {
    if (target === 'copilot' && this.isEngramConfigured()) {
      return agent.role === 'router'
        ? this.mdRouterDispatchInstructions(delegates)
        : this.mdCopilotDelegateInstructions(delegates);
    }

    const lines = [`**Delegates to:** ${delegates.join(', ')}`, ''];
    if (target === 'claude' && this.isEngramConfigured()) {
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
    if (out.extends) outParts.push(`**Extends:** ${out.extends}`);
    lines.push('## Output', '', outParts.join(' | '), '');
    // Router output is about routing decisions — the verbose structure template adds no value
    if (agent.role !== 'router') {
      const structure = resolveOutputStructure({ template: outTemplate, ...out });
      if (structure) lines.push(structure, '');
    }
    if (out.sections?.length) {
      lines.push(`**Sections:** ${out.sections.join(', ')}`, '');
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

  private mdMemory(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    if (!this.isEngramConfigured()) return [];
    const domain = agent.domain ?? agent.name;
    return [buildMemorySection(agent.role, domain, target, agent.engram?.mode)];
  }

  /**
   * Generate LLM-readable markdown file content for agent
   */
  private generateAgentMarkdown(agent: ComposedAgentSpec, target: SyncTarget = 'claude'): string {
    return [
      ...this.mdFrontmatter(agent, target),
      ...this.mdHeader(agent, target),
      ...this.mdScope(agent),
      ...this.mdWorkflowAndTools(agent, target),
      ...this.mdPermissionsAndConstraints(agent),
      ...this.mdHandoffsAndOutput(agent, target),
      ...this.mdContextPacks(agent, target),
      ...this.mdContextStrategy(agent),
      ...this.mdMemory(agent, target),
    ].join('\n');
  }

  private mdContextStrategy(agent: ComposedAgentSpec): string[] {
    const cs = agent.context_strategy;
    if (!cs || (!cs.max_files && !cs.max_chars_per_file && !cs.retrieval_mode)) {
      return [];
    }
    const parts: string[] = [];
    if (cs.retrieval_mode) parts.push(`**Retrieval mode:** ${cs.retrieval_mode}`);
    if (cs.max_files) parts.push(`**Max files:** ${cs.max_files}`);
    if (cs.max_chars_per_file) parts.push(`**Max chars/file:** ${cs.max_chars_per_file}`);
    return ['## Context Strategy', '', parts.join(' | '), ''];
  }

  private mdContextPacks(agent: ComposedAgentSpec, target: SyncTarget): string[] {
    if (!agent.context_packs?.length) {
      return [];
    }
    const contextDir =
      target === 'copilot'
        ? '.github/context'
        : target === 'claude'
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
