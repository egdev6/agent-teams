import * as fs from 'node:fs';
import * as path from 'node:path';
import { SCHEMA_PATHS } from '@agent-teams/core';
import Ajv from 'ajv';
import * as YAML from 'yaml';
import type { ProjectProfile } from './types';

export class ProfileLoader {
  private ajv: Ajv;
  private profileCache: Map<string, ProjectProfile> = new Map();

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  private resolveProfilePath(projectRoot: string): string {
    const preferred = path.join(projectRoot, '.agent-teams', 'project.profile.yml');
    if (fs.existsSync(preferred)) {
      return preferred;
    }
    return path.join(projectRoot, '.agent-team', 'project.profile.yml');
  }

  /**
   * Load and validate a project profile from .agent-teams/project.profile.yml
   * Falls back to .agent-team/project.profile.yml for backward compatibility.
   */
  async load(projectRoot: string): Promise<ProjectProfile> {
    const profilePath = this.resolveProfilePath(projectRoot);

    // Check cache
    const cachedProfile = this.profileCache.get(profilePath);
    if (cachedProfile) {
      return cachedProfile;
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
    const schemaPath = SCHEMA_PATHS.projectProfile;

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Project profile schema not found: ${schemaPath}`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const validate = this.ajv.compile(schema);
    const valid = validate(profile);

    if (!valid) {
      const errors = validate.errors
        ?.map((err) => `  - ${err.instancePath} ${err.message}`)
        .join('\n');
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
        description: profile.project.description || '',
      },
      paths: profile.paths,
      commands: profile.commands,
      technologies: profile.technologies || {},
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
  static async init(
    projectRoot: string,
    options: {
      id: string;
      name: string;
      type: string;
      technologies?: Record<string, boolean>;
    },
  ): Promise<void> {
    const profileDir = path.join(projectRoot, '.agent-teams');
    const profilePath = path.join(profileDir, 'project.profile.yml');

    // Check if profile already exists
    if (fs.existsSync(profilePath)) {
      throw new Error('Project profile already exists');
    }

    // Create .agent-teams directory
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Create default profile
    const profile: ProjectProfile = {
      project: {
        id: options.id,
        name: options.name,
        version: '1.0.0',
        type: options.type,
      },
      technologies: options.technologies || {},
      paths: {
        root: '.',
        src: './src',
        tests_root: './tests',
      },
      commands: {
        build: 'npm run build',
        test: 'npm test',
        dev: 'npm run dev',
      },
      context_packs: ['architecture'],
      sync_targets: ['claude_code', 'codex', 'github_copilot'],
      overrides: {},
    };

    // Write profile
    const content = YAML.stringify(profile);
    fs.writeFileSync(profilePath, content, 'utf-8');
  }

  /**
   * Find files recursively with depth limit
   */
  private static findFiles(projectRoot: string, fileName: string, maxDepth: number = 3): string[] {
    const results: string[] = [];

    const searchDir = (dir: string, depth: number) => {
      if (depth > maxDepth) return;

      try {
        const entries = fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true });

        for (const entry of entries) {
          const relativePath = path.join(dir, entry.name).replace(/\\/g, '/');

          if (entry.isFile() && entry.name === fileName) {
            results.push(relativePath);
          } else if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules' &&
            entry.name !== 'dist' &&
            entry.name !== 'build' &&
            entry.name !== 'target'
          ) {
            searchDir(relativePath, depth + 1);
          }
        }
      } catch (_error) {
        // Ignore permission errors
      }
    };

    searchDir('.', 0);
    return results;
  }

  /**
   * Detect technologies from package.json dependencies
   */
  private static detectNodeTechnologies(
    allDeps: Record<string, any>,
    packageJson: any,
    technologies: Record<string, boolean>,
  ): void {
    // JavaScript/TypeScript
    if (allDeps.typescript) technologies.typescript = true;
    if (!technologies.typescript) technologies.javascript = true;

    // Technology mappings: tech name -> dependency names to check
    const techMappings: Record<string, string[]> = {
      react: ['react', 'react-dom'],
      vue: ['vue'],
      angular: ['@angular/core'],
      svelte: ['svelte'],
      next: ['next'],
      nuxt: ['nuxt'],
      express: ['express'],
      fastify: ['fastify'],
      nestjs: ['@nestjs/core'],
      vite: ['vite'],
      webpack: ['webpack'],
      vitest: ['vitest'],
      jest: ['jest'],
      playwright: ['playwright', '@playwright/test'],
      cypress: ['cypress'],
      tailwindcss: ['tailwindcss'],
      'styled-components': ['styled-components'],
      sass: ['sass'],
      prisma: ['prisma', '@prisma/client'],
      drizzle: ['drizzle', 'drizzle-orm'],
      sqlite: ['sqlite', 'sqlite3', 'better-sqlite3'],
      tauri: ['@tauri-apps/api', '@tauri-apps/cli'],
    };

    // Apply mappings
    for (const [tech, deps] of Object.entries(techMappings)) {
      if (deps.some((dep) => allDeps[dep])) {
        technologies[tech] = true;
      }
    }

    // Runtime
    if (allDeps['@types/node'] || packageJson.engines?.node) technologies.node = true;
  }

  /**
   * Extract commands from package.json scripts
   */
  private static extractCommands(packageJson: any, commands: Record<string, string>): void {
    if (!packageJson.scripts) return;

    if (packageJson.scripts.build && !commands.build) commands.build = 'npm run build';
    if (packageJson.scripts.test && !commands.test) commands.test = 'npm test';
    if (packageJson.scripts.dev && !commands.dev) commands.dev = 'npm run dev';
    if (packageJson.scripts.start && !commands.start) commands.start = 'npm start';
  }

  /**
   * Process package.json files
   */
  private static processPackageFiles(
    projectRoot: string,
    packageJsonFiles: string[],
    technologies: Record<string, boolean>,
    commands: Record<string, string>,
  ): void {
    for (const pkgPath of packageJsonFiles) {
      try {
        const packageJsonPath = path.join(projectRoot, pkgPath);
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        // Extract commands from scripts (only from root package.json)
        if (pkgPath === 'package.json') {
          ProfileLoader.extractCommands(packageJson, commands);
        }

        // Detect technologies from dependencies (from all package.json files)
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (allDeps) {
          ProfileLoader.detectNodeTechnologies(allDeps, packageJson, technologies);
        }
      } catch (_error) {
        // Ignore JSON parse errors
      }
    }
  }

  /**
   * Detect frameworks from Cargo.toml content
   */
  private static detectRustFrameworks(
    cargoContent: string,
    technologies: Record<string, boolean>,
  ): void {
    if (cargoContent.includes('axum')) technologies.axum = true;
    if (cargoContent.includes('actix-web')) technologies.actix = true;
    if (cargoContent.includes('rocket')) technologies.rocket = true;
    if (cargoContent.includes('tauri')) technologies.tauri = true;
  }

  /**
   * Detect Rust-related technologies
   */
  private static detectRust(
    projectRoot: string,
    cargoFiles: string[],
    technologies: Record<string, boolean>,
    commands: Record<string, string>,
  ): void {
    if (cargoFiles.length === 0) return;

    technologies.rust = true;

    for (const cargoPath of cargoFiles) {
      try {
        const cargoContent = fs.readFileSync(path.join(projectRoot, cargoPath), 'utf-8');
        ProfileLoader.detectRustFrameworks(cargoContent, technologies);
      } catch (_error) {
        // Ignore errors
      }
    }

    // Add Rust commands if not already set
    if (!commands.build) commands.build = 'cargo build';
    if (!commands.test) commands.test = 'cargo test';
    if (!commands.dev) commands.dev = 'cargo run';
  }

  /**
   * Detect Go-related technologies
   */
  private static detectGo(
    goModFiles: string[],
    technologies: Record<string, boolean>,
    commands: Record<string, string>,
  ): void {
    if (goModFiles.length > 0) {
      technologies.go = true;
      if (!commands.build) commands.build = 'go build';
      if (!commands.test) commands.test = 'go test ./...';
      if (!commands.dev) commands.dev = 'go run .';
    }
  }

  /**
   * Detect Python frameworks from pyproject.toml content
   */
  private static detectPythonFrameworks(
    pyprojectContent: string,
    technologies: Record<string, boolean>,
    commands: Record<string, string>,
  ): void {
    if (pyprojectContent.includes('django')) technologies.django = true;
    if (pyprojectContent.includes('fastapi')) technologies.fastapi = true;
    if (pyprojectContent.includes('flask')) technologies.flask = true;
    if (pyprojectContent.includes('pytest') && !commands.test) {
      commands.test = 'pytest';
    }
  }

  /**
   * Detect Python-related technologies
   */
  private static detectPython(
    projectRoot: string,
    pythonFiles: string[],
    technologies: Record<string, boolean>,
    commands: Record<string, string>,
  ): void {
    if (pythonFiles.length > 0) {
      technologies.python = true;

      for (const pyFile of pythonFiles.filter((f) => f.endsWith('pyproject.toml'))) {
        try {
          const pyprojectContent = fs.readFileSync(path.join(projectRoot, pyFile), 'utf-8');
          ProfileLoader.detectPythonFrameworks(pyprojectContent, technologies, commands);
        } catch (_error) {
          // Ignore errors
        }
      }
    }
  }

  /**
   * Detect project type from technologies
   */
  private static detectProjectType(
    technologies: Record<string, boolean>,
    hasWorkspaces: boolean,
    exists: (path: string) => boolean,
  ): string {
    if (hasWorkspaces || (exists('apps') && exists('packages'))) {
      return 'monorepo';
    } else if (
      technologies.react ||
      technologies.vue ||
      technologies.angular ||
      technologies.svelte
    ) {
      return 'frontend';
    } else if (
      technologies.express ||
      technologies.fastify ||
      technologies.nestjs ||
      technologies.axum ||
      technologies.actix ||
      technologies.go
    ) {
      return 'backend';
    } else if (technologies.tauri) {
      return 'fullstack';
    }
    return 'unknown';
  }

  /**
   * Detect test root path
   */
  private static detectTestRoot(
    exists: (path: string) => boolean,
    paths: Record<string, string>,
  ): void {
    if (exists('tests')) paths.tests_root = './tests';
    else if (exists('__tests__')) paths.tests_root = './__tests__';
    else if (exists('test')) paths.tests_root = './test';
  }

  /**
   * Detect monorepo app paths
   */
  private static detectMonorepoPaths(
    exists: (path: string) => boolean,
    paths: Record<string, string>,
  ): void {
    if (exists('apps/web')) paths.web = './apps/web';
    if (exists('apps/desktop')) paths.desktop = './apps/desktop';
    if (exists('apps/mobile')) paths.mobile = './apps/mobile';
    if (exists('apps/api')) paths.api = './apps/api';
  }

  /**
   * Detect backend and database paths
   */
  private static detectBackendPaths(
    exists: (path: string) => boolean,
    paths: Record<string, string>,
  ): void {
    if (exists('backend')) paths.backend = './backend';
    if (exists('server')) paths.server = './server';
    if (exists('api')) paths.api = './api';
    if (exists('prisma')) paths.prisma = './prisma';
    if (exists('db')) paths.db = './db';
  }

  /**
   * Detect common paths in project
   */
  private static detectPaths(exists: (path: string) => boolean): Record<string, string> {
    const paths: Record<string, string> = {
      root: '.',
      src: './src',
      tests_root: './tests',
    };

    // Detect common path patterns
    if (exists('src')) paths.src = './src';
    if (exists('apps')) paths.apps = './apps';
    if (exists('packages')) paths.packages = './packages';

    ProfileLoader.detectTestRoot(exists, paths);
    ProfileLoader.detectMonorepoPaths(exists, paths);
    ProfileLoader.detectBackendPaths(exists, paths);

    // Rust/Tauri specific
    if (exists('src-tauri')) paths.tauri = './src-tauri';

    return paths;
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
    const commands: Record<string, string> = {};
    const exists = (relativePath: string) => fs.existsSync(path.join(projectRoot, relativePath));

    // Detect package.json files
    const packageJsonFiles = ProfileLoader.findFiles(projectRoot, 'package.json');
    ProfileLoader.processPackageFiles(projectRoot, packageJsonFiles, technologies, commands);

    // Detect Rust
    const cargoFiles = ProfileLoader.findFiles(projectRoot, 'Cargo.toml');
    ProfileLoader.detectRust(projectRoot, cargoFiles, technologies, commands);

    // Detect Tauri
    const tauriConfigs = ProfileLoader.findFiles(projectRoot, 'tauri.conf.json');
    if (tauriConfigs.length > 0) {
      technologies.tauri = true;
      if (!commands.dev) commands.dev = 'npm run tauri dev';
      if (!commands.build) commands.build = 'npm run tauri build';
    }

    // Detect Go
    const goModFiles = ProfileLoader.findFiles(projectRoot, 'go.mod');
    ProfileLoader.detectGo(goModFiles, technologies, commands);

    // Detect Python
    const pythonFiles = [
      ...ProfileLoader.findFiles(projectRoot, 'requirements.txt'),
      ...ProfileLoader.findFiles(projectRoot, 'pyproject.toml'),
      ...ProfileLoader.findFiles(projectRoot, 'setup.py'),
    ];
    ProfileLoader.detectPython(projectRoot, pythonFiles, technologies, commands);

    // Detect monorepo structure
    const hasWorkspaces =
      exists('pnpm-workspace.yaml') ||
      exists('lerna.json') ||
      exists('nx.json') ||
      packageJsonFiles.some((pkgPath) => {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, pkgPath), 'utf-8'));
          return pkg.workspaces !== undefined;
        } catch {
          return false;
        }
      });

    const projectType = ProfileLoader.detectProjectType(technologies, hasWorkspaces, exists);
    const paths = ProfileLoader.detectPaths(exists);

    return { technologies, paths, commands, type: projectType };
  }
}
