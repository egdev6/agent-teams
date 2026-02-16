import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import { TeamProfile, ProjectProfile, ComposedAgentSpec } from './types';
import { AgentComposer } from './composer';
import { ProfileLoader } from './profileLoader';
import { Logger } from './logger';
import { MergeEngine } from './mergeEngine';

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
    const schemaPath = path.join(__dirname, '../../schemas/team.schema.json');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Team schema not found: ${schemaPath}`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const validate = this.ajv.compile(schema);
    const valid = validate(team);

    if (!valid) {
      const errors = validate.errors?.map(err => `  - ${err.instancePath} ${err.message}`).join('\n');
      throw new Error(`Team profile validation failed:\n${errors}`);
    }
  }

  /**
   * Synchronize team to .github/agents/
   * This composes all agents from selected kits and generates final specs
   * Returns detailed information about changes for dry-run preview
   */
  async syncTeam(
    projectRoot: string,
    teamId: string,
    options: {
      dryRun?: boolean;
      outputDir?: string;
      showDiff?: boolean;
    } = {}
  ): Promise<SyncResult> {
    const dryRun = options.dryRun || false;
    const showDiff = options.showDiff !== false;  // Default true
    const outputDir = options.outputDir || path.join(projectRoot, '.github', 'agents');

    this.logger.info(`Syncing team: ${teamId}${dryRun ? ' (DRY RUN)' : ''}`);

    // Load project profile and team
    const profile = await this.profileLoader.load(projectRoot);
    const team = await this.loadTeam(projectRoot, teamId);

    // Compose all agents
    const composedAgents: ComposedAgentSpec[] = [];
    const changes: SyncResult['changes'] = [];

    for (const kit of team.kits) {
      // Normalize kit ID (can be string or { id, version })
      const kitId = typeof kit === 'string' ? kit : kit.id;
      
      this.logger.info(`Processing kit: ${kitId}`);

      // Get list of agents from kit
      const kitAgents = await this.getKitAgents(kitId);

      for (const agentId of kitAgents) {
        // Check if agent is disabled
        if (team.agents?.disable?.includes(agentId)) {
          this.logger.info(`Skipping disabled agent: ${agentId}`);
          continue;
        }

        // Check if agent is explicitly enabled (if enable list exists and not "all")
        if (team.agents?.enable && team.agents.enable !== 'all' && !team.agents.enable.includes(agentId)) {
          continue;
        }

        this.logger.info(`Composing agent: ${agentId}`);

        try {
          // Compose agent with team profile support
          const composed = await this.composer.composeWithTeam(
            kitId, 
            agentId, 
            profile, 
            team,
            {
              mergeStrategy: 'team-priority',
              dryRun: dryRun
            }
          );

          composedAgents.push(composed);

          // Determine change type
          const filename = `${composed._metadata.id}.agent.md`;
          const filepath = path.join(outputDir, filename);
          const exists = fs.existsSync(filepath);

          let action: 'create' | 'update' | 'skip' = exists ? 'update' : 'create';
          let diff: string | undefined;

          // Calculate diff if updating and showDiff is enabled
          if (exists && showDiff) {
            const existingContent = fs.readFileSync(filepath, 'utf-8');
            const existingAgent = this.parseAgentFile(existingContent);
            const newAgent = this.prepareForWriting(composed);

            const diffs = this.mergeEngine.createDiff(existingAgent, newAgent);
            if (diffs.length > 0) {
              diff = this.mergeEngine.formatDiff(diffs);
            } else {
              action = 'skip';  // No changes
            }
          }

          changes.push({
            agentId: composed._metadata.id,
            action,
            diff,
            filepath
          });

        } catch (error) {
          this.logger.error(`Failed to compose agent ${agentId}: ${error}`);
          throw error;
        }
      }
    }

    // Calculate summary
    const summary = {
      total: changes.length,
      created: changes.filter(c => c.action === 'create').length,
      updated: changes.filter(c => c.action === 'update').length,
      skipped: changes.filter(c => c.action === 'skip').length
    };

    // Write composed agents to output directory (unless dry run)
    if (!dryRun) {
      await this.writeComposedAgents(outputDir, composedAgents, changes);
      this.logger.info(`Team synced: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`);
    } else {
      this.logger.info(`DRY RUN: Would generate ${summary.created} new, update ${summary.updated}, skip ${summary.skipped}`);
    }

    return {
      agents: composedAgents,
      changes,
      summary
    };
  }

  /**
   * Get list of agent IDs from a kit
   */
  private async getKitAgents(kitId: string): Promise<string[]> {
    const kitManifestPath = path.join(__dirname, '../../kits', kitId, 'kit.yml');

    if (!fs.existsSync(kitManifestPath)) {
      throw new Error(`Kit manifest not found: ${kitManifestPath}`);
    }

    const content = fs.readFileSync(kitManifestPath, 'utf-8');
    const manifest = YAML.parse(content);

    return manifest.provides?.agents || [];
  }

  /**
   * Write composed agents to output directory
   */
  private async writeComposedAgents(
    outputDir: string,
    agents: ComposedAgentSpec[],
    changes: SyncResult['changes']
  ): Promise<void> {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write each agent (skip those with no changes)
    for (const agent of agents) {
      const change = changes.find(c => c.agentId === agent._metadata.id);
      
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
    lines.push('<!-- DO NOT EDIT: Generated from kit spec via Agent Team v2.0 -->');
    lines.push('<!-- Edit source: kits/{kit-id}/agents/{agent-id}.yml -->');
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
    return files
      .filter(f => f.endsWith('.yml'))
      .map(f => path.basename(f, '.yml'));
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
      kits: string[];
    }
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
      kits: options.kits,
      agents: {
        enable: [],
        disable: []
      },
      overrides: {}
    };

    // Write team profile
    const content = YAML.stringify(team);
    fs.writeFileSync(teamPath, content, 'utf-8');

    this.logger.info(`Team created: ${teamId}`);
  }
}
