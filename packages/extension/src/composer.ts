import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import { type ContextPackContext, ContextPackProcessor } from './contextPackProcessor';
import type { Logger } from './logger';
import { type MergeConflict, MergeEngine } from './mergeEngine';
import type {
  AgentOverride,
  AgentSpec,
  ComposedAgentSpec,
  CompositionOptions,
  PlaceholderContext,
  ProjectProfile,
  TeamProfile,
} from './types';

/**
 * Agent Composer - v2.0 Teams System
 *
 * Composes final agent specs by merging:
 * 1. Agent specs (from workspace .agent-teams/agents/)
 * 2. Project profile (placeholder values, overrides)
 * 3. Team profile (optional, overrides)
 */
export class AgentComposer {
  private logger: Logger;
  private contextPackProcessor: ContextPackProcessor;
  private mergeEngine: MergeEngine;

  constructor(logger: Logger) {
    this.logger = logger;
    this.contextPackProcessor = new ContextPackProcessor(logger);
    this.mergeEngine = new MergeEngine(logger);
  }

  /**
   * Compose agent from project profile (+ optional team profile)
   */
  async compose(
    agentId: string,
    projectProfile: ProjectProfile,
    options: CompositionOptions = {},
  ): Promise<ComposedAgentSpec> {
    return this.composeWithTeam(agentId, projectProfile, undefined, options);
  }

  /**
   * Compose agent from project profile + team profile
   * This is the main composition method with full override support
   */
  async composeWithTeam(
    agentId: string,
    projectProfile: ProjectProfile,
    teamProfile?: TeamProfile,
    options: CompositionOptions = {},
  ): Promise<ComposedAgentSpec> {
    this.logger.info(
      `Composing agent ${agentId}${teamProfile ? ` with team ${teamProfile.id}` : ''}`,
    );

    // 1. Load agent spec from workspace
    const agentSpec = await this.loadWorkspaceAgent(agentId, options.workspacePath);
    this.logger.debug(`Agent ${agentId} loaded`);

    // 2. Build placeholder context
    const placeholderContext = this.buildPlaceholderContext(projectProfile);

    // 3. Resolve placeholders
    const resolved = this.resolvePlaceholders(
      agentSpec,
      placeholderContext,
      options.strict || false,
    );
    this.logger.debug(`Placeholders resolved for ${agentId}`);

    // 4. Merge context packs (with dynamic processing)
    const withContext = await this.mergeContextPacks(resolved, projectProfile);

    // 5. Apply advanced merge with conflict resolution
    const mergeResult = this.mergeEngine.mergeAgentMetadata(
      withContext._metadata,
      projectProfile.overrides?.[agentId] as AgentOverride,
      teamProfile?.overrides?.[agentId] as AgentOverride,
      {
        strategy: options.mergeStrategy || 'team-priority',
        arrayMergeStrategy: 'union',
        onConflict: (conflict: MergeConflict) => {
          this.logger.debug(
            `Merge conflict at ${conflict.path}: resolved to ${JSON.stringify(conflict.resolved)}`,
          );
        },
      },
    );

    // 6. Create composed spec with merged metadata
    const composed: ComposedAgentSpec = {
      ...withContext,
      _metadata: mergeResult.value,
      _composition_metadata: {
        profile_id: projectProfile.project.id,
        team_id: teamProfile?.id,
        composed_at: new Date().toISOString(),
        placeholders_resolved: this.extractPlaceholders(JSON.stringify(agentSpec)),
        overrides_applied: mergeResult.applied,
      },
    };

    // 7. Log composition summary
    if (mergeResult.conflicts.length > 0) {
      this.logger.info(
        `Applied ${mergeResult.applied.length} overrides with ${mergeResult.conflicts.length} conflicts resolved`,
      );
    }

    // 8. Validate if requested
    if (options.validate !== false) {
      await this.validate(composed);
    }

    this.logger.info(`Successfully composed ${agentId}`);
    return composed;
  }

  /**
   * Load agent spec from workspace
   */
  private async loadWorkspaceAgent(agentId: string, workspacePath?: string): Promise<AgentSpec> {
    const basePath = workspacePath || process.cwd();
    const preferredPath = path.join(basePath, '.agent-teams', 'agents', `${agentId}.yml`);
    const legacyPath = path.join(basePath, '.agent-team', 'agents', `${agentId}.yml`);
    const agentPath = fs.existsSync(preferredPath) ? preferredPath : legacyPath;

    if (!fs.existsSync(agentPath)) {
      throw new Error(`Agent spec not found: ${agentPath}`);
    }

    const content = fs.readFileSync(agentPath, 'utf-8');
    return YAML.parse(content) as AgentSpec;
  }

  /**
   * Build placeholder resolution context
   */
  private buildPlaceholderContext(profile: ProjectProfile): PlaceholderContext {
    return {
      paths: profile.paths,
      commands: profile.commands,
      project: {
        id: profile.project.id,
        name: profile.project.name,
        version: profile.project.version,
        ...(profile.project.description && { description: profile.project.description }),
      },
    };
  }

  /**
   * Resolve {{placeholders}} in spec
   */
  private resolvePlaceholders(
    spec: AgentSpec,
    context: PlaceholderContext,
    strict: boolean,
  ): AgentSpec {
    let specStr = JSON.stringify(spec);

    // Extract all placeholders
    const placeholders = this.extractPlaceholders(specStr);

    // Resolve each placeholder
    for (const placeholder of placeholders) {
      const match = placeholder.match(/\{\{(\w+)\.(\w+)\}\}/);
      if (!match) continue;

      const [fullMatch, category, key] = match;
      const value = (context as any)[category]?.[key];

      if (value === undefined) {
        if (strict) {
          throw new Error(`Missing placeholder: ${fullMatch}`);
        }
        this.logger.warn(`Placeholder not resolved: ${fullMatch}`);
      } else {
        specStr = specStr.replace(new RegExp(this.escapeRegex(fullMatch), 'g'), value);
      }
    }

    return JSON.parse(specStr) as AgentSpec;
  }

  /**
   * Extract all {{placeholders}} from string
   */
  private extractPlaceholders(str: string): string[] {
    const matches = str.match(/\{\{[\w.]+\}\}/g);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Escape string for regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Merge context packs with dynamic processing
   */
  private async mergeContextPacks(spec: AgentSpec, profile: ProjectProfile): Promise<AgentSpec> {
    if (!spec._metadata.context?.packs) {
      return spec;
    }

    const resolvedPacks: string[] = [];

    // Build context for dynamic processing
    const packContext: ContextPackContext = {
      project: {
        id: profile.project.id,
        name: profile.project.name,
        version: profile.project.version,
        type: profile.project.type || 'unknown',
      },
      technologies: profile.technologies || {},
      paths: profile.paths,
      commands: profile.commands,
      env: process.env as Record<string, string>,
    };

    for (const pack of spec._metadata.context.packs) {
      try {
        // Process dynamic pack with variables, conditionals, includes
        await this.contextPackProcessor.process(pack, packContext, {
          projectRoot: this.getProjectRoot(),
          cache: true,
        });

        // Keep original pack reference (processor validates it exists)
        resolvedPacks.push(pack);

        this.logger.info(`Processed dynamic context pack: ${pack}`);
      } catch (error) {
        this.logger.warn(`Failed to process context pack ${pack}: ${error}`);
        // Still include it, runtime might handle it
        resolvedPacks.push(pack);
      }
    }

    return {
      ...spec,
      _metadata: {
        ...spec._metadata,
        context: {
          ...spec._metadata.context,
          packs: resolvedPacks,
        },
      },
    };
  }
  /**
   * Get project root (helper for context pack processor)
   */
  private getProjectRoot(): string {
    return process.cwd();
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    for (const key in source) {
      if (source[key] === undefined) continue;

      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(output[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  /**
   * Validate composed spec (future: use AJV)
   */
  private async validate(spec: ComposedAgentSpec): Promise<void> {
    // Basic validation
    if (!spec._metadata.id) {
      throw new Error('Agent must have an ID');
    }
    if (!spec._metadata.role) {
      throw new Error('Agent must have a role');
    }
    if (!spec._metadata.intents || spec._metadata.intents.length === 0) {
      throw new Error('Agent must have at least one intent');
    }

    this.logger.debug(`Validation passed for ${spec._metadata.id}`);
  }
}
