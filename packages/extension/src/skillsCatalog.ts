import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import type { CatalogSkillEntry, SkillUseDefinition } from '@agent-teams/core';
import { SCHEMA_PATHS } from '@agent-teams/core';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as YAML from 'yaml';
import type { CatalogManager } from './catalogManager';
import type { Logger } from './logger';

export type { CatalogSkillEntry };

function httpsGetText(url: string, timeoutMs = 15000, redirectsLeft = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      // Follow redirects (skills.lc /download may redirect to GitHub raw)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        httpsGetText(res.headers.location, timeoutMs, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode ?? 'unknown'}`));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        body += chunk;
      });
      res.on('end', () => resolve(body));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}

export interface CatalogSkillWithStatus extends CatalogSkillEntry {
  materialized: boolean;
}

/**
 * SkillsCatalog: manages catalog skill entries and SKILL.md materialization.
 *
 * Storage layout:
 *   .agent-teams/skills/{id}.yml  — catalog entry (lazy, created when an agent uses the skill)
 *   .github/skills/{id}/SKILL.md  — downloaded skill content (source of truth for "installed")
 *
 * catalog.json (VS Code global storage) — metadata cache, same pattern as teams.
 */
export class SkillsCatalog {
  private readonly catalogManager: CatalogManager;
  private readonly logger: Logger;
  private ajv: Ajv;

  constructor(catalogManager: CatalogManager, logger: Logger) {
    this.catalogManager = catalogManager;
    this.logger = logger;
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * Returns all skills known to the catalog (from catalog.json global storage).
   * catalog.json is populated via upsertSkill() on install and via
   * CatalogManager.collectSkillsFromCatalogDir() on workspace capture.
   */
  getInstalledSkills(): CatalogSkillEntry[] {
    const snapshot = this.catalogManager.getCatalogSnapshot();
    return Object.values(snapshot.skills)
      .map((entry) => entry.data as CatalogSkillEntry)
      .filter((s) => s && typeof s.id === 'string');
  }

  /**
   * Returns all installed skills enriched with materialization status.
   */
  getInstalledSkillsWithStatus(workspaceRoot: string): CatalogSkillWithStatus[] {
    return this.getInstalledSkills().map((entry) => ({
      ...entry,
      materialized: this.isSkillMaterialized(entry.id, workspaceRoot),
    }));
  }

  /**
   * Whether the SKILL.md content exists locally in .github/skills/{id}/SKILL.md.
   * This is the source of truth for "skill installed in project".
   */
  isSkillMaterialized(id: string, workspaceRoot: string): boolean {
    const skillPath = path.join(workspaceRoot, '.github', 'skills', id, 'SKILL.md');
    return fs.existsSync(skillPath);
  }

  /**
   * Resolves a skill entry from the catalog by ID.
   */
  resolveSkill(id: string): CatalogSkillEntry | undefined {
    const snapshot = this.catalogManager.getCatalogSnapshot();
    const entry = snapshot.skills[id];
    if (!entry) return undefined;
    return entry.data as CatalogSkillEntry;
  }

  /**
   * Install a skill: downloads SKILL.md to .github/skills/{id}/SKILL.md
   * and registers the metadata in catalog.json.
   */
  async installSkill(entry: CatalogSkillEntry, workspaceRoot: string): Promise<void> {
    this.logger.info(`Installing skill: ${entry.id} from ${entry.source.type}:${entry.source.ref}`);

    let content: string | null = null;

    try {
      content = await this.fetchSkillContent(entry);
    } catch (error) {
      this.logger.warn(`Failed to fetch SKILL.md for ${entry.id}, using stub: ${String(error)}`);
    }

    const skillDir = path.join(workspaceRoot, '.github', 'skills', entry.id);
    fs.mkdirSync(skillDir, { recursive: true });

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillMdPath, content ?? this.buildStubSkillMd(entry), 'utf-8');

    this.catalogManager.upsertSkill(entry.id, entry, 'workspace');
    this.logger.info(`Skill ${entry.id} installed to ${skillMdPath}`);
  }

  /**
   * Materialize a catalog entry as a .yml file in .agent-teams/skills/.
   * Called lazily when an agent assigns a skill (save/create agent).
   */
  materializeSkillForAgent(id: string, workspaceRoot: string): void {
    const entry = this.resolveSkill(id);
    if (!entry) {
      this.logger.warn(`Cannot materialize skill ${id}: not found in catalog`);
      return;
    }

    const skillsDirs = [
      path.join(workspaceRoot, '.agent-teams', 'skills'),
      path.join(workspaceRoot, '.agent-team', 'skills'),
    ];

    // Check if already materialized in one of the dirs
    for (const dir of skillsDirs) {
      const target = path.join(dir, `${id}.yml`);
      if (fs.existsSync(target)) {
        return; // Already present
      }
    }

    // Write to preferred dir
    const preferredDir = path.join(workspaceRoot, '.agent-teams', 'skills');
    fs.mkdirSync(preferredDir, { recursive: true });
    const targetPath = path.join(preferredDir, `${id}.yml`);
    fs.writeFileSync(targetPath, YAML.stringify(entry), 'utf-8');
    this.logger.debug(`Materialized skill ${id} to ${targetPath}`);
  }

  /**
   * Returns SKILL.md content strings for skills with autoload !== false that are installed.
   * Used to inject skill context into agent prompts.
   */
  mountSkillsForAgent(uses: SkillUseDefinition[], workspaceRoot: string): string[] {
    const contents: string[] = [];
    for (const use of uses) {
      if (use.autoload === false) continue;
      const skillPath = path.join(workspaceRoot, '.github', 'skills', use.id, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        this.logger.warn(`Skill ${use.id} not installed, skipping context mount`);
        continue;
      }
      contents.push(fs.readFileSync(skillPath, 'utf-8'));
    }
    return contents;
  }

  /**
   * Validates a skill catalog entry YAML file against the schema.
   */
  validateEntry(data: unknown): { valid: boolean; errors: string[] } {
    const schemaPath = SCHEMA_PATHS.skillCatalogEntry;
    if (!fs.existsSync(schemaPath)) {
      return { valid: true, errors: [] };
    }
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const validate = this.ajv.compile(schema);
    const isValid = validate(data);
    if (!isValid) {
      const errors = (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
      return { valid: false, errors };
    }
    return { valid: true, errors: [] };
  }

  private fetchSkillContent(entry: CatalogSkillEntry): Promise<string> {
    const url = this.resolveSkillUrl(entry);
    this.logger.debug(`Fetching SKILL.md from: ${url}`);
    return httpsGetText(url);
  }

  private resolveSkillUrl(entry: CatalogSkillEntry): string {
    const { type, ref } = entry.source;
    if (type === 'skills-lc') {
      // ref is the skills.lc skillId slug
      return `https://skills.lc/api/skills/${encodeURIComponent(ref)}/download`;
    }
    // git: owner/repo[/subpath] -> GitHub raw SKILL.md
    const parts = ref.split('/');
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];
      const subPath = parts.slice(2).join('/');
      const filePath = subPath ? `${subPath}/SKILL.md` : 'SKILL.md';
      return `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
    }
    return `https://raw.githubusercontent.com/${ref}/main/SKILL.md`;
  }

  private buildStubSkillMd(entry: CatalogSkillEntry): string {
    return [
      `# ${entry.title}`,
      '',
      entry.description ? entry.description : `Skill: ${entry.id}`,
      '',
      `**Source:** ${entry.source.type}:${entry.source.ref}`,
      `**Version:** ${entry.version}`,
      entry.tags.length > 0 ? `**Tags:** ${entry.tags.join(', ')}` : '',
      '',
      '> ⚠️ This is a stub — the actual SKILL.md could not be fetched.',
      '> Run the install command again to retry the download.',
    ]
      .filter((line) => line !== null)
      .join('\n');
  }
}
