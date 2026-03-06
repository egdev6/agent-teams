import * as fs from 'node:fs';
import * as path from 'node:path';
import { SCHEMA_PATHS } from '@agent-teams/core';
import Ajv from 'ajv';
import * as YAML from 'yaml';
import { AgentComposer } from './composer';
import { Logger } from './logger';
import { MergeEngine } from './mergeEngine';
import { ProfileLoader } from './profileLoader';
import type { ComposedAgentSpec, ProjectProfile, SyncTarget, TeamProfile } from './types';

interface TargetPaths {
  target: SyncTarget;
  agentsDir: string;
  skillsDir: string;
  contextDir: string;
  contextFile: string;
  agentExtension: '.agent.md' | '.md';
}

/**
 * Sync result with change preview
 */
export interface SyncResult {
  agents: ComposedAgentSpec[];
  changes: Array<{
    agentId: string;
    action: 'create' | 'update' | 'skip';
    diff?: string;
    filepath: string;
  }>;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
  };
  targets: SyncTarget[];
}

export class TeamManager {
  private ajv: Ajv;
  private composer: AgentComposer;
  private profileLoader: ProfileLoader;
  private logger: Logger;
  private mergeEngine: MergeEngine;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.logger = new Logger();
    this.composer = new AgentComposer(this.logger);
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

  private resolveSyncTargets(
    profile: ProjectProfile,
    explicitTargets?: SyncTarget[],
  ): SyncTarget[] {
    const allowed = new Set<SyncTarget>(['claude_code', 'codex', 'github_copilot']);
    if (explicitTargets && explicitTargets.length > 0) {
      return [...new Set(explicitTargets.filter((target) => allowed.has(target)))];
    }
    if (Array.isArray(profile.sync_targets) && profile.sync_targets.length > 0) {
      return [...new Set(profile.sync_targets.filter((target) => allowed.has(target)))];
    }
    return ['claude_code', 'codex', 'github_copilot'];
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
        contextFile: path.join(claudeDir, 'AGENTS.md'),
        agentExtension: '.md',
      };
    }

    const codexDir = path.join(projectRoot, '.codex');
    return {
      target,
      agentsDir: path.join(codexDir, 'agents'),
      skillsDir: path.join(codexDir, 'skills'),
      contextDir: path.join(codexDir, 'context'),
      contextFile: path.join(codexDir, 'AGENTS.md'),
      agentExtension: '.md',
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
      .map((agent) => `- \`${agent._metadata.id}\` (${agent.name})`)
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
    lines.push('');
    lines.push(`Generated at: \`${new Date().toISOString()}\``);
    return lines.join('\n');
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

    this.logger.info(`Syncing team: ${teamId}${dryRun ? ' (DRY RUN)' : ''}`);

    const profile = await this.profileLoader.load(projectRoot);
    const team = await this.loadTeam(projectRoot, teamId);
    const targets = this.resolveSyncTargets(profile, options.targets);
    const contextPackFiles = this.selectContextPackFiles(
      profile,
      this.listContextPackFiles(projectRoot),
    );
    const skillsSourceDir = this.resolveSkillsSourceDir(projectRoot);
    const skillEntries = skillsSourceDir ? this.listRelativeFiles(skillsSourceDir) : [];

    const composedAgents = await this.composeTeamAgents(team, profile, projectRoot);
    const allChanges: SyncResult['changes'] = [];

    for (const target of targets) {
      const targetPaths = this.resolveTargetPaths(projectRoot, target, options.outputDir);

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
      const contextContent = this.buildTargetContextContent(
        target,
        team,
        composedAgents,
        contextPackFiles,
      );
      const contextChange = this.trackTextFileChange(
        `${target}/context-file`,
        targetPaths.contextFile,
        contextContent,
        showDiff,
      );

      allChanges.push(...agentChanges, ...contextPackChanges, ...skillsChanges, contextChange);

      if (!dryRun) {
        this.writeAgentsForTarget(composedAgents, targetPaths, agentChanges);
        this.writeContextPacksForTarget(contextPackFiles, targetPaths, contextPackChanges);
        this.writeDirectoryCopyForTarget(
          skillsSourceDir,
          skillEntries,
          targetPaths.skillsDir,
          skillsChanges,
        );
        this.writeContextFileForTarget(targetPaths, contextContent, contextChange);
      }
    }

    const summary = {
      total: allChanges.length,
      created: allChanges.filter((c) => c.action === 'create').length,
      updated: allChanges.filter((c) => c.action === 'update').length,
      skipped: allChanges.filter((c) => c.action === 'skip').length,
    };

    if (!dryRun) {
      this.logger.info(
        `Team synced: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`,
      );
    } else {
      this.logger.info(
        `DRY RUN: Would create ${summary.created}, update ${summary.updated}, skip ${summary.skipped}`,
      );
    }

    return {
      agents: composedAgents,
      changes: allChanges,
      summary,
      targets,
    };
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
    const filtered = agents.filter(
      (a) => !a._metadata.targets?.length || a._metadata.targets.includes(targetPaths.target),
    );
    return filtered.map((agent) => this.trackAgentChange(agent, targetPaths, showDiff));
  }

  private trackAgentChange(
    composed: ComposedAgentSpec,
    targetPaths: TargetPaths,
    showDiff: boolean,
  ): SyncResult['changes'][0] {
    const filename = `${composed._metadata.id}${targetPaths.agentExtension}`;
    const filepath = path.join(targetPaths.agentsDir, filename);
    const exists = fs.existsSync(filepath);

    let action: 'create' | 'update' | 'skip' = exists ? 'update' : 'create';
    let diff: string | undefined;

    if (exists && showDiff) {
      const existingContent = fs.readFileSync(filepath, 'utf-8');
      const existingAgent = this.parseAgentFile(existingContent);
      const newAgent = this.prepareForWriting(composed);
      const diffs = this.mergeEngine.createDiff(existingAgent, newAgent);
      if (diffs.length > 0) {
        diff = this.mergeEngine.formatDiff(diffs);
      } else {
        action = 'skip';
      }
    }

    return {
      agentId: `${targetPaths.target}/${composed._metadata.id}`,
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

  private writeAgentsForTarget(
    agents: ComposedAgentSpec[],
    targetPaths: TargetPaths,
    changes: SyncResult['changes'],
  ): void {
    if (!fs.existsSync(targetPaths.agentsDir)) {
      fs.mkdirSync(targetPaths.agentsDir, { recursive: true });
    }

    for (const agent of agents) {
      // Skip agents not targeting this platform
      if (
        agent._metadata.targets?.length &&
        !agent._metadata.targets.includes(targetPaths.target)
      ) {
        continue;
      }
      const filename = `${agent._metadata.id}${targetPaths.agentExtension}`;
      const filepath = path.join(targetPaths.agentsDir, filename);
      const change = changes.find((c) => c.filepath === filepath);
      if (change?.action === 'skip') {
        continue;
      }

      const cleanAgent = this.prepareForWriting(agent);
      const content = this.generateAgentMarkdown(cleanAgent);
      fs.writeFileSync(filepath, content, 'utf-8');
      this.logger.info(`${change?.action === 'create' ? 'Created' : 'Updated'}: ${filepath}`);
    }
  }

  private writeContextPacksForTarget(
    contextPackFiles: string[],
    targetPaths: TargetPaths,
    changes: SyncResult['changes'],
  ): void {
    if (!fs.existsSync(targetPaths.contextDir)) {
      fs.mkdirSync(targetPaths.contextDir, { recursive: true });
    }

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
    if (change.action === 'skip') {
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
  private parseAgentFile(content: string): any {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      return {};
    }

    try {
      return YAML.parse(match[1]);
    } catch (error) {
      this.logger.warn(`Failed to parse agent file: ${error}`);
      return {};
    }
  }

  /**
   * Prepare agent spec for writing (remove internal metadata)
   */
  private prepareForWriting(agent: ComposedAgentSpec): any {
    const { _composition_metadata, ...clean } = agent;
    return clean;
  }

  /**
   * Generate markdown file content for agent
   */
  private generateAgentMarkdown(agent: any): string {
    const lines: string[] = [];

    lines.push('<!-- DO NOT EDIT: Generated from agent spec via Agent Team v2.0 -->');
    lines.push('');
    lines.push('---');
    lines.push(YAML.stringify(agent).trim());
    lines.push('---');
    lines.push('');

    if (agent.instructions) {
      lines.push(agent.instructions);
    }

    return lines.join('\n');
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
