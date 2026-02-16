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

  /**
   * Auto-detect project technologies, paths, and commands
   */
  static async detectProjectConfig(projectRoot: string): Promise<{
    technologies: Record<string, boolean>;
    paths: Record<string, string>;
    commands: Record<string, string>;
    type: string;
  }> {
    const technologies: Record<string, boolean> = {};
    const paths: Record<string, string> = {
      root: '.',
      src: './src',
      tests_root: './tests'
    };
    const commands: Record<string, string> = {};
    let projectType = 'unknown';

    // Utility to check file existence
    const exists = (relativePath: string) => fs.existsSync(path.join(projectRoot, relativePath));

    // Utility to find files recursively with depth limit
    const findFiles = (fileName: string, maxDepth: number = 3): string[] => {
      const results: string[] = [];
      
      const searchDir = (dir: string, depth: number) => {
        if (depth > maxDepth) return;
        
        try {
          const entries = fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true });
          
          for (const entry of entries) {
            const relativePath = path.join(dir, entry.name).replace(/\\/g, '/');
            
            if (entry.isFile() && entry.name === fileName) {
              results.push(relativePath);
            } else if (entry.isDirectory() && !entry.name.startsWith('.') && 
                       entry.name !== 'node_modules' && entry.name !== 'dist' && 
                       entry.name !== 'build' && entry.name !== 'target') {
              searchDir(relativePath, depth + 1);
            }
          }
        } catch (error) {
          // Ignore permission errors
        }
      };
      
      searchDir('.', 0);
      return results;
    };

    // Detect package.json and extract info (search in subdirectories too)
    const packageJsonFiles = findFiles('package.json');
    
    for (const pkgPath of packageJsonFiles) {
      try {
        const packageJsonPath = path.join(projectRoot, pkgPath);
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Extract commands from scripts (only from root package.json)
        if (pkgPath === 'package.json' && packageJson.scripts) {
          if (packageJson.scripts.build && !commands.build) commands.build = 'npm run build';
          if (packageJson.scripts.test && !commands.test) commands.test = 'npm test';
          if (packageJson.scripts.dev && !commands.dev) commands.dev = 'npm run dev';
          if (packageJson.scripts.start && !commands.start) commands.start = 'npm start';
        }

        // Detect technologies from dependencies (from all package.json files)
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        if (allDeps) {
          // JavaScript/TypeScript
          if (allDeps.typescript) technologies.typescript = true;
          if (!technologies.typescript) technologies.javascript = true;

          // Frameworks
          if (allDeps.react || allDeps['react-dom']) technologies.react = true;
          if (allDeps.vue) technologies.vue = true;
          if (allDeps['@angular/core']) technologies.angular = true;
          if (allDeps.svelte) technologies.svelte = true;
          if (allDeps.next) technologies.next = true;
          if (allDeps.nuxt) technologies.nuxt = true;

          // Backend
          if (allDeps.express) technologies.express = true;
          if (allDeps.fastify) technologies.fastify = true;
          if (allDeps['@nestjs/core']) technologies.nestjs = true;

          // Build tools
          if (allDeps.vite) technologies.vite = true;
          if (allDeps.webpack) technologies.webpack = true;

          // Testing
          if (allDeps.vitest) technologies.vitest = true;
          if (allDeps.jest) technologies.jest = true;
          if (allDeps.playwright || allDeps['@playwright/test']) technologies.playwright = true;
          if (allDeps.cypress) technologies.cypress = true;

          // Styling
          if (allDeps.tailwindcss) technologies.tailwindcss = true;
          if (allDeps['styled-components']) technologies['styled-components'] = true;
          if (allDeps.sass) technologies.sass = true;

          // Database
          if (allDeps.prisma || allDeps['@prisma/client']) technologies.prisma = true;
          if (allDeps.drizzle || allDeps['drizzle-orm']) technologies.drizzle = true;
          if (allDeps.sqlite || allDeps.sqlite3 || allDeps['better-sqlite3']) technologies.sqlite = true;

          // Runtime
          if (allDeps['@types/node'] || packageJson.engines?.node) technologies.node = true;
          
          // Tauri
          if (allDeps['@tauri-apps/api'] || allDeps['@tauri-apps/cli']) technologies.tauri = true;
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }

    // Detect Rust (search in subdirectories too)
    const cargoFiles = findFiles('Cargo.toml');
    
    if (cargoFiles.length > 0) {
      technologies.rust = true;
      
      for (const cargoPath of cargoFiles) {
        try {
          const cargoContent = fs.readFileSync(path.join(projectRoot, cargoPath), 'utf-8');
          
          // Check for common Rust frameworks
          if (cargoContent.includes('axum')) technologies.axum = true;
          if (cargoContent.includes('actix-web')) technologies.actix = true;
          if (cargoContent.includes('rocket')) technologies.rocket = true;
          if (cargoContent.includes('tauri')) technologies.tauri = true;
        } catch (error) {
          // Ignore errors
        }
      }
      
      // Add Rust commands if not already set
      if (!commands.build) commands.build = 'cargo build';
      if (!commands.test) commands.test = 'cargo test';
      if (!commands.dev) commands.dev = 'cargo run';
    }

    // Detect Tauri specifically (search in subdirectories)
    const tauriConfigs = findFiles('tauri.conf.json');
    if (tauriConfigs.length > 0) {
      technologies.tauri = true;
      if (!commands.dev) commands.dev = 'npm run tauri dev';
      if (!commands.build) commands.build = 'npm run tauri build';
    }

    // Detect Go (search in subdirectories)
    const goModFiles = findFiles('go.mod');
    if (goModFiles.length > 0) {
      technologies.go = true;
      if (!commands.build) commands.build = 'go build';
      if (!commands.test) commands.test = 'go test ./...';
      if (!commands.dev) commands.dev = 'go run .';
    }

    // Detect Python (search in subdirectories)
    const pythonFiles = [...findFiles('requirements.txt'), ...findFiles('pyproject.toml'), ...findFiles('setup.py')];
    if (pythonFiles.length > 0) {
      technologies.python = true;
      
      for (const pyFile of pythonFiles.filter(f => f.endsWith('pyproject.toml'))) {
        try {
          const pyprojectContent = fs.readFileSync(path.join(projectRoot, pyFile), 'utf-8');
          if (pyprojectContent.includes('django')) technologies.django = true;
          if (pyprojectContent.includes('fastapi')) technologies.fastapi = true;
          if (pyprojectContent.includes('flask')) technologies.flask = true;
          if (pyprojectContent.includes('pytest') && !commands.test) {
            commands.test = 'pytest';
          }
        } catch (error) {
          // Ignore errors
        }
      }
    }

    // Detect monorepo structure
    const hasWorkspaces = exists('pnpm-workspace.yaml') || 
                         exists('lerna.json') || 
                         exists('nx.json') ||
                         packageJsonFiles.some(pkgPath => {
                           try {
                             const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, pkgPath), 'utf-8'));
                             return pkg.workspaces !== undefined;
                           } catch {
                             return false;
                           }
                         });

    if (hasWorkspaces || (exists('apps') && exists('packages'))) {
      projectType = 'monorepo';
    } else if (technologies.react || technologies.vue || technologies.angular || technologies.svelte) {
      projectType = 'frontend';
    } else if (technologies.express || technologies.fastify || technologies.nestjs || 
               technologies.axum || technologies.actix || technologies.go) {
      projectType = 'backend';
    } else if (technologies.tauri) {
      projectType = 'fullstack';
    }

    // Detect common path patterns
    if (exists('src')) paths.src = './src';
    if (exists('apps')) paths.apps = './apps';
    if (exists('packages')) paths.packages = './packages';
    if (exists('tests')) paths.tests_root = './tests';
    else if (exists('__tests__')) paths.tests_root = './__tests__';
    else if (exists('test')) paths.tests_root = './test';

    // Detect specific app paths in monorepo
    if (exists('apps/web')) paths.web = './apps/web';
    if (exists('apps/desktop')) paths.desktop = './apps/desktop';
    if (exists('apps/mobile')) paths.mobile = './apps/mobile';
    if (exists('apps/api')) paths.api = './apps/api';
    
    // Common backend paths
    if (exists('backend')) paths.backend = './backend';
    if (exists('server')) paths.server = './server';
    if (exists('api')) paths.api = './api';
    
    // Rust/Tauri specific
    if (exists('src-tauri')) paths.tauri = './src-tauri';

    // Database
    if (exists('prisma')) paths.prisma = './prisma';
    if (exists('db')) paths.db = './db';

    return { technologies, paths, commands, type: projectType };
  }
}
