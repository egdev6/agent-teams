import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import type { Logger } from './logger';

type CatalogEntityType = 'agents' | 'teams' | 'kits' | 'skills';
type CatalogSource = 'workspace' | 'import';

export interface CatalogEntry {
  id: string;
  source: CatalogSource;
  updatedAt: string;
  data: unknown;
}

export interface CatalogData {
  version: number;
  updatedAt: string;
  agents: Record<string, CatalogEntry>;
  teams: Record<string, CatalogEntry>;
  kits: Record<string, CatalogEntry>;
  skills: Record<string, CatalogEntry>;
}

interface ExportPayload {
  exportedAt: string;
  version: number;
  catalog: CatalogData;
}

export class CatalogManager {
  private readonly context: vscode.ExtensionContext;
  private readonly logger: Logger;
  private readonly catalogFilePath: string;

  constructor(context: vscode.ExtensionContext, logger: Logger) {
    this.context = context;
    this.logger = logger;
    this.catalogFilePath = path.join(this.context.globalStorageUri.fsPath, 'catalog.json');
  }

  async exportCatalog(): Promise<void> {
    const catalog = this.loadCatalog();
    const target = await vscode.window.showSaveDialog({
      title: 'Export Agent Teams Catalog',
      defaultUri: vscode.Uri.file(path.join(process.cwd(), 'agent-teams-catalog.json')),
      filters: {
        'JSON Files': ['json'],
      },
      saveLabel: 'Export Catalog',
    });

    if (!target) {
      return;
    }

    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      catalog,
    };

    fs.writeFileSync(target.fsPath, JSON.stringify(payload, null, 2), 'utf8');
    this.logger.info(`Catalog exported to ${target.fsPath}`);
    void vscode.window.showInformationMessage('Catalog exported successfully.');
  }

  async importCatalog(): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
      title: 'Import Agent Teams Catalog',
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json'],
      },
      openLabel: 'Import Catalog',
    });

    if (!selected || selected.length === 0) {
      return;
    }

    const raw = fs.readFileSync(selected[0].fsPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const incoming = this.normalizeImportedCatalog(parsed);

    const existing = this.loadCatalog();
    const merged = this.mergeCatalog(existing, incoming, 'import');
    this.saveCatalog(merged);

    const summary = this.getCounts(merged);
    this.logger.info(`Catalog imported from ${selected[0].fsPath}`);
    void vscode.window.showInformationMessage(
      `Catalog imported. Agents: ${summary.agents}, Teams: ${summary.teams}, Kits: ${summary.kits}, Skills: ${summary.skills}.`,
    );
  }

  async captureWorkspaceToCatalog(workspaceRoot: string): Promise<void> {
    const existing = this.loadCatalog();
    const workspaceCatalog = this.collectFromWorkspace(workspaceRoot);
    const merged = this.mergeCatalog(existing, workspaceCatalog, 'workspace');
    this.saveCatalog(merged);

    const summary = this.getCounts(workspaceCatalog);
    void vscode.window.showInformationMessage(
      `Workspace captured to catalog. Added/updated: Agents ${summary.agents}, Teams ${summary.teams}, Kits ${summary.kits}, Skills ${summary.skills}.`,
    );
  }

  getCatalogSnapshot(): CatalogData {
    return this.loadCatalog();
  }

  private collectFromWorkspace(workspaceRoot: string): Partial<CatalogData> {
    const agents: Record<string, CatalogEntry> = {};
    const teams: Record<string, CatalogEntry> = {};
    const kits: Record<string, CatalogEntry> = {};
    const skills: Record<string, CatalogEntry> = {};

    const now = new Date().toISOString();

    const specsDir = path.join(workspaceRoot, 'specs');
    for (const file of this.findFiles(specsDir, ['.yml', '.yaml', '.json'])) {
      const parsed = this.parseStructuredFile(file);
      if (!parsed || typeof parsed !== 'object') continue;
      const maybeId = this.getNestedString(parsed, ['_metadata', 'id']);
      const id = maybeId || path.basename(file, path.extname(file));
      agents[id] = { id, source: 'workspace', updatedAt: now, data: parsed };
    }

    const teamDirs = [
      path.join(workspaceRoot, '.agent-team', 'teams'),
      path.join(workspaceRoot, '.agent-teams', 'teams'),
    ];
    for (const dir of teamDirs) {
      for (const file of this.findFiles(dir, ['.yml', '.yaml', '.json'])) {
        const parsed = this.parseStructuredFile(file);
        if (!parsed || typeof parsed !== 'object') continue;
        const id = this.getNestedString(parsed, ['id']) || path.basename(file, path.extname(file));
        teams[id] = { id, source: 'workspace', updatedAt: now, data: parsed };
      }
    }

    const kitsDir = path.join(workspaceRoot, 'kits');
    if (fs.existsSync(kitsDir)) {
      const kitFolders = fs
        .readdirSync(kitsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory());
      for (const folder of kitFolders) {
        const manifestPath = path.join(kitsDir, folder.name, 'kit.yml');
        if (!fs.existsSync(manifestPath)) continue;
        const parsed = this.parseStructuredFile(manifestPath);
        if (!parsed || typeof parsed !== 'object') continue;
        const id = this.getNestedString(parsed, ['id']) || folder.name;
        kits[id] = { id, source: 'workspace', updatedAt: now, data: parsed };
      }
    }

    const skillsRegistryPath = path.join(workspaceRoot, 'skills.registry.yml');
    if (fs.existsSync(skillsRegistryPath)) {
      const parsed = this.parseStructuredFile(skillsRegistryPath);
      if (parsed && typeof parsed === 'object') {
        const registrySkills = this.getNestedObject(parsed, ['skills']);
        for (const [skillId, definition] of Object.entries(registrySkills)) {
          skills[skillId] = { id: skillId, source: 'workspace', updatedAt: now, data: definition };
        }
      }
    }

    const githubSkillsDir = path.join(workspaceRoot, '.github', 'skills');
    if (fs.existsSync(githubSkillsDir)) {
      const entries = fs
        .readdirSync(githubSkillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory());
      for (const entry of entries) {
        const skillFile = path.join(githubSkillsDir, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillFile)) continue;
        const content = fs.readFileSync(skillFile, 'utf8');
        skills[entry.name] = {
          id: entry.name,
          source: 'workspace',
          updatedAt: now,
          data: { markdown: content, path: skillFile },
        };
      }
    }

    return { agents, teams, kits, skills };
  }

  private normalizeImportedCatalog(input: unknown): Partial<CatalogData> {
    if (!input || typeof input !== 'object') {
      return {};
    }

    const record = input as Record<string, unknown>;
    const root =
      record.catalog && typeof record.catalog === 'object'
        ? (record.catalog as Record<string, unknown>)
        : record;

    return {
      agents: this.normalizeEntityMap(root.agents),
      teams: this.normalizeEntityMap(root.teams),
      kits: this.normalizeEntityMap(root.kits),
      skills: this.normalizeEntityMap(root.skills),
    };
  }

  private normalizeEntityMap(value: unknown): Record<string, CatalogEntry> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const out: Record<string, CatalogEntry> = {};
    for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const asEntry = entry as Partial<CatalogEntry>;
      out[id] = {
        id,
        source: asEntry.source === 'import' ? 'import' : 'workspace',
        updatedAt:
          typeof asEntry.updatedAt === 'string' ? asEntry.updatedAt : new Date().toISOString(),
        data: 'data' in asEntry ? asEntry.data : entry,
      };
    }
    return out;
  }

  private mergeCatalog(
    base: CatalogData,
    incoming: Partial<CatalogData>,
    source: CatalogSource,
  ): CatalogData {
    const merged = this.createEmptyCatalog();
    merged.agents = { ...base.agents, ...this.withSource(incoming.agents, source) };
    merged.teams = { ...base.teams, ...this.withSource(incoming.teams, source) };
    merged.kits = { ...base.kits, ...this.withSource(incoming.kits, source) };
    merged.skills = { ...base.skills, ...this.withSource(incoming.skills, source) };
    merged.updatedAt = new Date().toISOString();
    return merged;
  }

  private withSource(
    map: Record<string, CatalogEntry> | undefined,
    source: CatalogSource,
  ): Record<string, CatalogEntry> {
    if (!map) return {};
    const now = new Date().toISOString();
    return Object.fromEntries(
      Object.entries(map).map(([id, value]) => [
        id,
        {
          ...value,
          source,
          updatedAt: now,
        },
      ]),
    );
  }

  private getCounts(catalog: Partial<CatalogData>): Record<CatalogEntityType, number> {
    return {
      agents: Object.keys(catalog.agents || {}).length,
      teams: Object.keys(catalog.teams || {}).length,
      kits: Object.keys(catalog.kits || {}).length,
      skills: Object.keys(catalog.skills || {}).length,
    };
  }

  private loadCatalog(): CatalogData {
    if (!fs.existsSync(this.catalogFilePath)) {
      return this.createEmptyCatalog();
    }

    try {
      const raw = fs.readFileSync(this.catalogFilePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      const normalized = this.normalizeImportedCatalog(parsed);
      return this.mergeCatalog(this.createEmptyCatalog(), normalized, 'import');
    } catch (error) {
      this.logger.error('Failed to load catalog; using empty catalog', error);
      return this.createEmptyCatalog();
    }
  }

  private saveCatalog(catalog: CatalogData): void {
    fs.mkdirSync(path.dirname(this.catalogFilePath), { recursive: true });
    fs.writeFileSync(this.catalogFilePath, JSON.stringify(catalog, null, 2), 'utf8');
  }

  private createEmptyCatalog(): CatalogData {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      agents: {},
      teams: {},
      kits: {},
      skills: {},
    };
  }

  private parseStructuredFile(filePath: string): unknown {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (filePath.endsWith('.json')) {
        return JSON.parse(raw);
      }
      return YAML.parse(raw);
    } catch (error) {
      this.logger.warn(`Skipping invalid file: ${filePath} (${String(error)})`);
      return null;
    }
  }

  private findFiles(baseDir: string, extensions: string[]): string[] {
    if (!fs.existsSync(baseDir)) {
      return [];
    }
    const out: string[] = [];
    const stack = [baseDir];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (extensions.includes(path.extname(entry.name).toLowerCase())) {
          out.push(fullPath);
        }
      }
    }

    return out;
  }

  private getNestedString(input: unknown, pathSegments: string[]): string | null {
    const value = this.getNestedValue(input, pathSegments);
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private getNestedObject(input: unknown, pathSegments: string[]): Record<string, unknown> {
    const value = this.getNestedValue(input, pathSegments);
    if (!value || typeof value !== 'object') {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private getNestedValue(input: unknown, pathSegments: string[]): unknown {
    let current: unknown = input;
    for (const segment of pathSegments) {
      if (!current || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }
}
