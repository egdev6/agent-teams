import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import { ProjectProfile } from './types';

export class ProfileLoader {
  private ajv: Ajv;
  private profileCache: Map<string, ProjectProfile> = new Map();

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Load and validate a project profile from .agent-team/project.profile.yml
   */
  async load(projectRoot: string): Promise<ProjectProfile> {
    const profilePath = path.join(projectRoot, '.agent-team', 'project.profile.yml');

    // Check cache
    if (this.profileCache.has(profilePath)) {
      return this.profileCache.get(profilePath)!;
    }

    // Check if profile exists
    if (!fs.existsSync(profilePath)) {
      throw new Error(`Project profile not found: ${profilePath}`);
    }

    // Load YAML
    const content = fs.readFileSync(profilePath, 'utf-8');
    let profile: ProjectProfile;

    try {
      profile = YAML.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse project profile: ${error}`);
    }

    // Validate against schema
    await this.validate(profile);

    // Cache and return
    this.profileCache.set(profilePath, profile);
    return profile;
  }

  /**
   * Validate project profile against JSON schema
   */
  private async validate(profile: ProjectProfile): Promise<void> {
    const schemaPath = path.join(__dirname, '../../schemas/project.profile.schema.json');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Project profile schema not found: ${schemaPath}`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const validate = this.ajv.compile(schema);
    const valid = validate(profile);

    if (!valid) {
      const errors = validate.errors?.map(err => `  - ${err.instancePath} ${err.message}`).join('\n');
      throw new Error(`Project profile validation failed:\n${errors}`);
    }
  }

  /**
   * Get placeholder context from profile
   */
  getPlaceholderContext(profile: ProjectProfile): Record<string, any> {
    return {
      project: {
        id: profile.project.id,
        name: profile.project.name,
        version: profile.project.version,
        type: profile.project.type || 'unknown',
        description: profile.project.description || ''
      },
      paths: profile.paths,
      commands: profile.commands,
      technologies: profile.technologies || {}
    };
  }

  /**
   * Get context packs from profile
   */
  getContextPacks(profile: ProjectProfile): string[] {
    return profile.context_packs || [];
  }

  /**
   * Get project-level overrides
   */
  getOverrides(profile: ProjectProfile): Record<string, any> {
    return profile.overrides || {};
  }

  /**
   * Check if a technology is enabled in the profile
   */
  isTechnologyEnabled(profile: ProjectProfile, technology: string): boolean {
    const techs = profile.technologies || {};
    
    // Check if technology is explicitly listed
    if (technology in techs) {
      return techs[technology] === true;
    }

    // Check if it's a required technology (implicit enable)
    return false;
  }

  /**
   * Clear cache (useful for testing or when profile changes)
   */
  clearCache(): void {
    this.profileCache.clear();
  }

  /**
   * Initialize a new project profile
   */
  static async init(projectRoot: string, options: {
    id: string;
    name: string;
    type: string;
    technologies?: Record<string, boolean>;
  }): Promise<void> {
    const profileDir = path.join(projectRoot, '.agent-team');
    const profilePath = path.join(profileDir, 'project.profile.yml');

    // Check if profile already exists
    if (fs.existsSync(profilePath)) {
      throw new Error('Project profile already exists');
    }

    // Create .agent-team directory
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Create default profile
    const profile: ProjectProfile = {
      project: {
        id: options.id,
        name: options.name,
        version: '1.0.0',
        type: options.type
      },
      technologies: options.technologies || {},
      paths: {
        root: '.',
        src: './src',
        tests_root: './tests'
      },
      commands: {
        build: 'npm run build',
        test: 'npm test',
        dev: 'npm run dev'
      },
      context_packs: ['architecture'],
      overrides: {}
    };

    // Write profile
    const content = YAML.stringify(profile);
    fs.writeFileSync(profilePath, content, 'utf-8');
  }
}
