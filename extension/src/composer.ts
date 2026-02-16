import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import {
  ProjectProfile,
  KitManifest,
  KitAgentSpec,
  ComposedAgentSpec,
  PlaceholderContext,
  CompositionOptions,
  AgentSpec,
  AgentOverride,
  TeamProfile
} from './types';
import { Logger } from './logger';
import { ContextPackProcessor, ContextPackContext } from './contextPackProcessor';
import { MergeEngine, MergeConflict } from './mergeEngine';

/**
 * Agent Composer - v2.0 Kits & Teams System
 * 
 * Composes final agent specs by merging:
 * 1. Kit agent specs (with placeholders)
 * 2. Project profile (placeholder values, overrides)
 * 3. Team profile (optional, kit selections + overrides)
 */
export class AgentComposer {
  private logger: Logger;
  private kitsPath: string;
  private contextPackProcessor: ContextPackProcessor;
  private mergeEngine: MergeEngine;

  constructor(logger: Logger, kitsPath?: string) {
    this.logger = logger;
    this.kitsPath = kitsPath || path.join(__dirname, '..', '..', 'kits');
    this.contextPackProcessor = new ContextPackProcessor(logger);
    this.mergeEngine = new MergeEngine(logger);
  }

  /**
   * Compose agent from kit + project profile (+ optional team profile)
   */
  async compose(
    kitId: string,
    agentId: string,
    projectProfile: ProjectProfile,
    options: CompositionOptions = {}
  ): Promise<ComposedAgentSpec> {
    return this.composeWithTeam(kitId, agentId, projectProfile, undefined, options);
  }

  /**
   * Compose agent from kit + project profile + team profile
   * This is the main composition method with full override support
   */
  async composeWithTeam(
    kitId: string,
    agentId: string,
    projectProfile: ProjectProfile,
    teamProfile?: TeamProfile,
    options: CompositionOptions = {}
  ): Promise<ComposedAgentSpec> {
    this.logger.info(`Composing agent ${agentId} from kit ${kitId}${teamProfile ? ` with team ${teamProfile.id}` : ''}`);

    // 1. Load kit manifest
    const kitManifest = await this.loadKitManifest(kitId);
    this.logger.debug(`Kit ${kitId} loaded:`, kitManifest);

    // 2. Validate kit requirements
    await this.validateKitRequirements(kitManifest, projectProfile);

    // 3. Load kit agent spec
    const kitAgent = await this.loadKitAgent(kitId, agentId);
    this.logger.debug(`Kit agent ${agentId} loaded`);

    // 4. Build placeholder context
    const placeholderContext = this.buildPlaceholderContext(
      projectProfile,
      kitManifest
    );

    // 5. Resolve placeholders
    const resolved = this.resolvePlaceholders(
      kitAgent,
      placeholderContext,
      options.strict || false
    );
    this.logger.debug(`Placeholders resolved for ${agentId}`);

    // 6. Merge context packs (with dynamic processing)
    const withContext = await this.mergeContextPacks(
      resolved,
      projectProfile,
      kitId,
      kitManifest
    );

    // 7. Apply kit defaults (before overrides, as base layer)
    const withDefaults = this.applyKitDefaults(withContext, kitManifest);

    // 8. Apply advanced merge with conflict resolution
    const mergeResult = this.mergeEngine.mergeAgentMetadata(
      withDefaults._metadata,
      projectProfile.overrides?.[agentId] as AgentOverride,
      teamProfile?.overrides?.[agentId] as AgentOverride,
      {
        strategy: options.mergeStrategy || 'team-priority',
        arrayMergeStrategy: 'union',  // For arrays like skills, intents
        onConflict: (conflict: MergeConflict) => {
          this.logger.debug(`Merge conflict at ${conflict.path}: resolved to ${JSON.stringify(conflict.resolved)}`);
        }
      }
    );

    // 9. Create composed spec with merged metadata
    const composed: ComposedAgentSpec = {
      ...withDefaults,
      _metadata: mergeResult.value,
      _composition_metadata: {
        kit_id: kitId,
        kit_version: kitManifest.version,
        profile_id: projectProfile.project.id,
        team_id: teamProfile?.id,
        composed_at: new Date().toISOString(),
        placeholders_resolved: this.extractPlaceholders(JSON.stringify(kitAgent)),
        overrides_applied: mergeResult.applied
      }
    };

    // 10. Log composition summary
    if (mergeResult.conflicts.length > 0) {
      this.logger.info(`Applied ${mergeResult.applied.length} overrides with ${mergeResult.conflicts.length} conflicts resolved`);
    }

    // 11. Validate if requested
    if (options.validate !== false) {
      await this.validate(composed);
    }

    this.logger.info(`Successfully composed ${agentId} from ${kitId}`);
    return composed;
  }

  /**
   * Load kit manifest
   */
  private async loadKitManifest(kitId: string): Promise<KitManifest> {
    const manifestPath = path.join(this.kitsPath, kitId, 'kit.yml');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Kit manifest not found: ${manifestPath}`);
    }

    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = YAML.parse(content) as KitManifest;

    // Validate required fields
    if (!manifest.id || !manifest.name || !manifest.version || !manifest.provides?.agents) {
      throw new Error(`Invalid kit manifest: ${kitId}`);
    }

    return manifest;
  }

  /**
   * Load kit agent spec
   */
  private async loadKitAgent(kitId: string, agentId: string): Promise<KitAgentSpec> {
    const agentPath = path.join(this.kitsPath, kitId, 'agents', `${agentId}.yml`);
    
    if (!fs.existsSync(agentPath)) {
      throw new Error(`Kit agent not found: ${agentPath}`);
    }

    const content = fs.readFileSync(agentPath, 'utf-8');
    const spec = YAML.parse(content) as KitAgentSpec;

    // Add kit metadata
    spec._metadata.kit_id = kitId;

    return spec;
  }

  /**
   * Validate kit requirements against project
   */
  private async validateKitRequirements(
    kit: KitManifest,
    profile: ProjectProfile
  ): Promise<void> {
    if (!kit.requires) return;

    // Validate technologies
    if (kit.requires.technologies) {
      const projectTechs = profile.technologies || {};
      const missingTechs = kit.requires.technologies.filter(
        tech => !projectTechs[tech]
      );

      if (missingTechs.length > 0) {
        this.logger.warn(
          `Kit ${kit.id} requires technologies: ${missingTechs.join(', ')}`
        );
      }
    }

    // Validate core version (future)
    if (kit.requires.min_core_version) {
      this.logger.debug(`Kit requires core >= ${kit.requires.min_core_version}`);
    }
  }

  /**
   * Build placeholder resolution context
   */
  private buildPlaceholderContext(
    profile: ProjectProfile,
    kit: KitManifest
  ): PlaceholderContext {
    return {
      paths: profile.paths,
      commands: profile.commands,
      project: {
        id: profile.project.id,
        name: profile.project.name,
        version: profile.project.version,
        ...(profile.project.description && { description: profile.project.description })
      },
      kit: {
        id: kit.id,
        name: kit.name,
        version: kit.version
      }
    };
  }

  /**
   * Resolve {{placeholders}} in spec
   */
  private resolvePlaceholders(
    spec: KitAgentSpec,
    context: PlaceholderContext,
    strict: boolean
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
   * Merge context packs (kit:* + project:*) with dynamic processing
   */
  private async mergeContextPacks(
    spec: AgentSpec,
    profile: ProjectProfile,
    kitId: string,
    kit: KitManifest
  ): Promise<AgentSpec> {
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
        type: profile.project.type || 'unknown'
      },
      technologies: profile.technologies || {},
      paths: profile.paths,
      commands: profile.commands,
      env: process.env as Record<string, string>,
      kit: {
        id: kitId,
        version: kit.version
      }
    };

    for (const pack of spec._metadata.context.packs) {
      try {
        // Process dynamic pack with variables, conditionals, includes
        await this.contextPackProcessor.process(pack, packContext, {
          projectRoot: this.getProjectRoot(),
          kitsPath: path.join(this.kitsPath, kitId),
          cache: true
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
          packs: resolvedPacks
        }
      }
    };
  }

  /**
   * Get project root (helper for context pack processor)
   */
  private getProjectRoot(): string {
    // In real usage, this would come from workspace
    // For now, return current directory
    return process.cwd();
  }

  /**
   * Apply project overrides
   */
  private applyOverrides(
    spec: AgentSpec,
    profile: ProjectProfile,
    agentId: string
  ): AgentSpec {
    if (!profile.overrides) return spec;

    // Global overrides
    const globalOverrides: any = {};
    if (profile.overrides.max_chars_per_file !== undefined) {
      globalOverrides.max_chars_per_file = profile.overrides.max_chars_per_file;
    }
    if (profile.overrides.output_mode !== undefined) {
      globalOverrides.output_mode = profile.overrides.output_mode;
    }

    // Agent-specific overrides
    const agentOverrides = profile.overrides[agentId] || {};

    // Merge overrides
    const result = { ...spec };

    if (Object.keys(globalOverrides).length > 0 || Object.keys(agentOverrides).length > 0) {
      result._metadata = this.deepMerge(
        result._metadata,
        {
          context: {
            max_chars_per_file: globalOverrides.max_chars_per_file || agentOverrides.max_chars_per_file
          },
          output: {
            mode_default: globalOverrides.output_mode || agentOverrides.output_mode
          },
          delegation: agentOverrides.delegation,
          ...agentOverrides
        }
      );
    }

    return result;
  }

  /**
   * Apply kit defaults
   */
  private applyKitDefaults(spec: AgentSpec, kit: KitManifest): AgentSpec {
    if (!kit.defaults) return spec;

    const result = { ...spec };

    // Apply defaults only if not already set
    if (!result._metadata.output?.mode_default && kit.defaults.output_mode) {
      if (!result._metadata.output) {
        result._metadata.output = { mode_default: kit.defaults.output_mode };
      } else {
        result._metadata.output.mode_default = kit.defaults.output_mode;
      }
    }

    if (!result._metadata.context?.max_files && kit.defaults.max_files) {
      result._metadata.context = result._metadata.context || {};
      result._metadata.context.max_files = kit.defaults.max_files;
    }

    if (!result._metadata.context?.max_chars_per_file && kit.defaults.max_chars_per_file) {
      result._metadata.context = result._metadata.context || {};
      result._metadata.context.max_chars_per_file = kit.defaults.max_chars_per_file;
    }

    return result;
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

  /**
   * Get kits path
   */
  getKitsPath(): string {
    return this.kitsPath;
  }

  /**
   * Set kits path
   */
  setKitsPath(path: string): void {
    this.kitsPath = path;
  }
}
