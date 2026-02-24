import * as fs from 'node:fs';
import * as path from 'node:path';
import { SCHEMA_PATHS } from '@agent-teams/core';
import Ajv from 'ajv';
import * as YAML from 'yaml';
import { AgentComposer } from './composer';
import { Logger } from './logger';
import { MergeEngine } from './mergeEngine';
import { ProfileLoader } from './profileLoader';
import type { ComposedAgentSpec, TeamProfile } from './types';

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

  /**
   * Load a team profile from .agent-team/teams/{teamId}.yml
   */
  async loadTeam(projectRoot: string, teamId: string): Promise<TeamProfile> {
    const teamPath = path.join(projectRoot, '.agent-team', 'teams', `${teamId}.yml`);

    if (!fs.existsSync(teamPath)) {
      throw new Error(`Team profile not found: ${teamPath}`);
    }

    // Load YAML
    const content = fs.readFileSync(teamPath, 'utf-8');
    let team: TeamProfile;

    try {
      team = YAML.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse team profile: ${error}`);
    }

    // Validate against schema
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
   * Synchronize team to .github/agents/
   * Generates final agent specs from team configuration
   * Returns detailed information about changes for dry-run preview
   */
  async syncTeam(
    projectRoot: string,
    teamId: string,
    options: {
      dryRun?: boolean;
      outputDir?: string;
      showDiff?: boolean;
    } = {},
  ): Promise<SyncResult> {
    const dryRun = options.dryRun || false;
    const showDiff = options.showDiff !== false; // Default true
    const outputDir = options.outputDir || path.join(projectRoot, '.github', 'agents');

    this.logger.info(`Syncing team: ${teamId}${dryRun ? ' (DRY RUN)' : ''}`);

    // Load project profile and team
    const profile = await this.profileLoader.load(projectRoot);
    const team = await this.loadTeam(projectRoot, teamId);

    // Compose all agents
    const { composedAgents, changes } = await this.composeTeamAgents(
      team,
      profile,
      outputDir,
      dryRun,
      showDiff,
      projectRoot,
    );

    // Calculate summary
    const summary = {
      total: changes.length,
      created: changes.filter((c) => c.action === 'create').length,
      updated: changes.filter((c) => c.action === 'update').length,
      skipped: changes.filter((c) => c.action === 'skip').length,
    };

    // Write composed agents to output directory (unless dry run)
    if (!dryRun) {
      await this.writeComposedAgents(outputDir, composedAgents, changes);
      this.logger.info(
        `Team synced: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`,
      );
    } else {
      this.logger.info(
        `DRY RUN: Would generate ${summary.created} new, update ${summary.updated}, skip ${summary.skipped}`,
      );
    }

    return {
      agents: composedAgents,
      changes,
      summary,
    };
  }

  /**
   * Compose all agents for a team
   */
  private async composeTeamAgents(
    team: TeamProfile,
    profile: any,
    outputDir: string,
    dryRun: boolean,
    showDiff: boolean,
    workspacePath?: string,
  ): Promise<{ composedAgents: ComposedAgentSpec[]; changes: SyncResult['changes'] }> {
    const composedAgents: ComposedAgentSpec[] = [];
    const changes: SyncResult['changes'] = [];

    const enabledAgents =
      team.agents?.enable && team.agents.enable !== 'all' ? (team.agents.enable as string[]) : [];

    for (const agentId of enabledAgents) {
      if (team.agents?.disable?.includes(agentId)) {
        this.logger.info(`Skipping disabled agent: ${agentId}`);
        continue;
      }
      await this.composeAndTrackAgent(
        agentId,
        team,
        profile,
        outputDir,
        dryRun,
        showDiff,
        composedAgents,
        changes,
        workspacePath,
      );
    }

    return { composedAgents, changes };
  }

  /**
   * Compose a single agent and track changes
   */
  private async composeAndTrackAgent(
    agentId: string,
    team: TeamProfile,
    profile: any,
    outputDir: string,
    dryRun: boolean,
    showDiff: boolean,
    composedAgents: ComposedAgentSpec[],
    changes: SyncResult['changes'],
    workspacePath?: string,
  ): Promise<void> {
    // Check if agent is disabled
    if (team.agents?.disable?.includes(agentId)) {
      this.logger.info(`Skipping disabled agent: ${agentId}`);
      return;
    }

    // Check if agent is explicitly enabled (if enable list exists and not "all")
    if (
      team.agents?.enable &&
      team.agents.enable !== 'all' &&
      !team.agents.enable.includes(agentId)
    ) {
      return;
    }

    this.logger.info(`Composing agent: ${agentId}`);

    try {
      const composed = await this.composer.composeWithTeam(agentId, profile, team, {
        mergeStrategy: 'team-priority',
        dryRun: dryRun,
        workspacePath,
      });

      composedAgents.push(composed);

      const changeInfo = this.trackAgentChange(composed, outputDir, showDiff);
      changes.push(changeInfo);
    } catch (error) {
      this.logger.error(`Failed to compose agent ${agentId}: ${error}`);
      throw error;
    }
  }

  /**
   * Track changes for a composed agent
   */
  private trackAgentChange(
    composed: ComposedAgentSpec,
    outputDir: string,
    showDiff: boolean,
  ): SyncResult['changes'][0] {
    const filename = `${composed._metadata.id}.agent.md`;
    const filepath = path.join(outputDir, filename);
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
      agentId: composed._metadata.id,
      action,
      diff,
      filepath,
    };
  }

  /**
   * Write composed agents to output directory
   */
  private async writeComposedAgents(
    outputDir: string,
    agents: ComposedAgentSpec[],
    changes: SyncResult['changes'],
  ): Promise<void> {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write each agent (skip those with no changes)
    for (const agent of agents) {
      const change = changes.find((c) => c.agentId === agent._metadata.id);

      // Skip if no changes
      if (change?.action === 'skip') {
        this.logger.debug(`Skipping ${agent._metadata.id} (no changes)`);
        continue;
      }

      const filename = `${agent._metadata.id}.agent.md`;
      const filepath = path.join(outputDir, filename);

      // Prepare agent for writing (remove metadata, format)
      const cleanAgent = this.prepareForWriting(agent);

      // Generate markdown content
      const content = this.generateAgentMarkdown(cleanAgent);
      fs.writeFileSync(filepath, content, 'utf-8');

      this.logger.info(`${change?.action === 'create' ? 'Created' : 'Updated'}: ${filename}`);
    }
  }

  /**
   * Parse existing agent file to extract metadata
   */
  private parseAgentFile(content: string): any {
    // Extract YAML frontmatter
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

    // Add DO NOT EDIT banner
    lines.push('<!-- DO NOT EDIT: Generated from agent spec via Agent Team v2.0 -->');
    lines.push('');

    // Add YAML frontmatter
    lines.push('---');
    lines.push(YAML.stringify(agent).trim());
    lines.push('---');
    lines.push('');

    // Add instructions if present
    if (agent.instructions) {
      lines.push(agent.instructions);
    }

    return lines.join('\n');
  }

  /**
   * List available teams in a project
   */
  async listTeams(projectRoot: string): Promise<string[]> {
    const teamsDir = path.join(projectRoot, '.agent-teams', 'teams');

    if (!fs.existsSync(teamsDir)) {
      return [];
    }

    const files = fs.readdirSync(teamsDir);
    return files.filter((f) => f.endsWith('.yml')).map((f) => path.basename(f, '.yml'));
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

    // Check if team already exists
    if (fs.existsSync(teamPath)) {
      throw new Error(`Team already exists: ${teamId}`);
    }

    // Create teams directory
    if (!fs.existsSync(teamsDir)) {
      fs.mkdirSync(teamsDir, { recursive: true });
    }

    // Create team profile
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

    // Write team profile
    const content = YAML.stringify(team);
    fs.writeFileSync(teamPath, content, 'utf-8');

    this.logger.info(`Team created: ${teamId}`);
  }
}
