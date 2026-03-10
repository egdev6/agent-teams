import * as fs from 'node:fs';
import type { IncomingHttpHeaders } from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import type { CatalogSkillEntry, SkillUseDefinition } from '@agent-teams/core';
import { SCHEMA_PATHS } from '@agent-teams/core';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as YAML from 'yaml';
import type { CatalogManager } from './catalogManager';
import type { Logger } from './logger';

export type { CatalogSkillEntry };

type HttpResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
  url: string;
};

function looksBinaryContent(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let suspicious = 0;
  for (const byte of sample) {
    const isTabOrNewline = byte === 9 || byte === 10 || byte === 13;
    const isPrintableAscii = byte >= 32 && byte <= 126;
    if (!isTabOrNewline && !isPrintableAscii) {
      suspicious++;
    }
  }
  return suspicious / sample.length > 0.3;
}

function decodeResponseBody(response: HttpResponse): string {
  const encodingHeader = Array.isArray(response.headers['content-encoding'])
    ? response.headers['content-encoding'][0]
    : response.headers['content-encoding'];
  const encoding = typeof encodingHeader === 'string' ? encodingHeader.toLowerCase() : '';

  let body = response.body;
  if (encoding.includes('gzip')) {
    body = gunzipSync(body);
  } else if (encoding.includes('deflate')) {
    body = inflateSync(body);
  } else if (encoding.includes('br')) {
    body = brotliDecompressSync(body);
  }

  // ZIP file signature ("PK\x03\x04") means we did not get a plain markdown file.
  if (
    body.length >= 4 &&
    body[0] === 0x50 &&
    body[1] === 0x4b &&
    body[2] === 0x03 &&
    body[3] === 0x04
  ) {
    throw new Error(`Expected markdown but received ZIP payload from ${response.url}`);
  }

  if (looksBinaryContent(body)) {
    throw new Error(`Expected markdown but received binary content from ${response.url}`);
  }

  return body.toString('utf8');
}

function httpsGet(url: string, timeoutMs = 15000, redirectsLeft = 3): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'text/markdown,text/plain,application/json,*/*',
        },
      },
      (res) => {
        // Follow redirects (skills.lc /download may redirect to GitHub raw)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          const redirectedUrl = new URL(res.headers.location, url).toString();
          httpsGet(redirectedUrl, timeoutMs, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode ?? 'unknown'}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 200,
            headers: res.headers,
            body: Buffer.concat(chunks),
            url,
          }),
        );
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}

async function httpsGetText(url: string, timeoutMs = 15000, redirectsLeft = 3): Promise<string> {
  const response = await httpsGet(url, timeoutMs, redirectsLeft);
  return decodeResponseBody(response);
}

async function httpsGetJson(url: string, timeoutMs = 15000): Promise<Record<string, unknown>> {
  const text = await httpsGetText(url, timeoutMs);
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid JSON response from ${url}`);
  }
  return parsed as Record<string, unknown>;
}

export interface CatalogSkillWithStatus extends CatalogSkillEntry {
  materialized: boolean;
}

/**
 * SkillsCatalog: manages catalog skill entries and SKILL.md materialization.
 *
 * Storage layout:
 *   .agent-teams/skills/{name}/SKILL.md
 *   .agent-teams/skills/{name}/metadata.yml
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
   * Returns skills installed in this workspace (.agent-teams/skills/) enriched
   * with materialization status. Only workspace-local skills are included;
   * the global catalog snapshot is NOT merged in to avoid showing skills from
   * other projects as "Project Skills".
   */
  getInstalledSkillsWithStatus(workspaceRoot: string): CatalogSkillWithStatus[] {
    const fromWorkspace = this.readWorkspaceSkillMetadata(workspaceRoot);
    return fromWorkspace.map((entry) => ({
      ...entry,
      materialized: this.isSkillMaterialized(entry.id, workspaceRoot),
    }));
  }

  /**
   * Whether the SKILL.md content exists locally.
   */
  isSkillMaterialized(id: string, workspaceRoot: string): boolean {
    return this.resolveSkillMdPath(id, workspaceRoot) !== null;
  }

  removeSkillContent(id: string, workspaceRoot: string): void {
    const dirPath = this.resolveSkillDirPath(id, workspaceRoot);
    if (!dirPath || !fs.existsSync(dirPath)) {
      return;
    }
    fs.rmSync(dirPath, { recursive: true, force: true });
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
   * Install a skill: downloads SKILL.md to .agent-teams/skills/{name}/SKILL.md
   * and registers metadata in catalog.json.
   */
  async installSkill(entry: CatalogSkillEntry, workspaceRoot: string): Promise<void> {
    this.logger.info(`Installing skill: ${entry.id} from ${entry.source.type}:${entry.source.ref}`);

    let content: string | null = null;

    try {
      content = await this.fetchSkillContent(entry);
    } catch (error) {
      this.logger.warn(`Failed to fetch SKILL.md for ${entry.id}, using stub: ${String(error)}`);
    }

    const skillFolderName = this.getSkillFolderName(entry);
    const skillDir = path.join(workspaceRoot, '.agent-teams', 'skills', skillFolderName);
    fs.mkdirSync(skillDir, { recursive: true });

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillMdPath, content ?? this.buildStubSkillMd(entry), 'utf-8');

    this.catalogManager.upsertSkill(entry.id, entry, 'workspace');
    this.materializeSkillForAgent(entry.id, workspaceRoot);
    this.logger.info(`Skill ${entry.id} installed to ${skillMdPath}`);
  }

  /**
   * Materialize a catalog entry as metadata.yml in .agent-teams/skills/{name}/.
   */
  materializeSkillForAgent(id: string, workspaceRoot: string): void {
    const entry = this.resolveSkill(id);
    if (!entry) {
      this.logger.warn(`Cannot materialize skill ${id}: not found in catalog`);
      return;
    }

    const folder = this.getSkillFolderName(entry);
    const targetDir = path.join(workspaceRoot, '.agent-teams', 'skills', folder);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, 'metadata.yml');
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
      const skillPath = this.resolveSkillMdPath(use.id, workspaceRoot);
      if (!skillPath) {
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

  private async fetchSkillContent(entry: CatalogSkillEntry): Promise<string> {
    const url = this.resolveSkillUrl(entry);
    this.logger.debug(`Fetching SKILL.md from: ${url}`);

    if (entry.source.type !== 'skills-lc') {
      return httpsGetText(url);
    }

    try {
      return await httpsGetText(url);
    } catch (error) {
      this.logger.warn(
        `skills.lc download failed for ${entry.id}; trying GitHub source fallback: ${String(error)}`,
      );
    }

    const fallbackRef = await this.resolveGitRefFromSkillsLc(entry.source.ref);
    if (!fallbackRef) {
      throw new Error(`Could not resolve GitHub source for skills-lc ref "${entry.source.ref}"`);
    }

    const fallbackUrl = this.resolveSkillUrl({
      ...entry,
      source: { type: 'git', ref: fallbackRef },
    });
    this.logger.debug(`Fetching SKILL.md via fallback from: ${fallbackUrl}`);
    return httpsGetText(fallbackUrl);
  }

  private resolveSkillUrl(entry: CatalogSkillEntry): string {
    const { type, ref } = entry.source;
    if (type === 'skills-lc') {
      // ref is the skills.lc skillId slug
      return `https://skills.lc/api/skills/${encodeURIComponent(ref)}/download`;
    }
    const normalized = this.normalizeGitRef(ref);
    return `https://raw.githubusercontent.com/${normalized.owner}/${normalized.repo}/${normalized.branch}/${normalized.filePath}`;
  }

  private normalizeGitRef(ref: string): {
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
  } {
    const trimmed = ref.trim();
    const withoutProtocol = trimmed.replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
    const parts = withoutProtocol.split('/').filter((p) => p.length > 0);
    if (parts.length < 2) {
      throw new Error(`Invalid git source ref: "${ref}"`);
    }

    const owner = parts[0];
    const repo = parts[1];

    let branch = 'main';
    let pathParts: string[] = [];

    // Formats supported:
    // - owner/repo
    // - owner/repo/sub/path
    // - owner/repo/tree/<branch>/sub/path
    // - owner/repo/blob/<branch>/sub/path
    if (parts[2] === 'tree' || parts[2] === 'blob') {
      if (parts.length >= 4) {
        branch = parts[3];
        pathParts = parts.slice(4);
      }
    } else {
      pathParts = parts.slice(2);
    }

    const joined = pathParts.join('/');
    const filePath = joined
      ? joined.toLowerCase().endsWith('/skill.md') || joined.toLowerCase() === 'skill.md'
        ? joined
        : `${joined}/SKILL.md`
      : 'SKILL.md';

    return {
      owner,
      repo,
      branch,
      filePath,
    };
  }

  private async resolveGitRefFromSkillsLc(skillId: string): Promise<string | null> {
    try {
      const single = await httpsGetJson(
        `https://skills.lc/api/skills/${encodeURIComponent(skillId)}`,
      );
      const source =
        single && typeof single.source === 'string'
          ? single.source
          : single.data &&
              typeof single.data === 'object' &&
              typeof (single.data as Record<string, unknown>).source === 'string'
            ? ((single.data as Record<string, unknown>).source as string)
            : null;
      if (source?.trim()) return source.trim();
    } catch (_error) {
      // Fallback to list endpoint below.
    }

    try {
      const list = await httpsGetJson('https://skills.lc/api/skills?limit=500');
      const rawData =
        list && Array.isArray(list.data)
          ? (list.data as Array<Record<string, unknown>>)
          : ([] as Array<Record<string, unknown>>);
      const found = rawData.find((item) => {
        const id = typeof item.skillId === 'string' ? item.skillId : item.id;
        return id === skillId;
      });
      return found && typeof found.source === 'string' ? found.source : null;
    } catch (_error) {
      return null;
    }
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

  private resolveSkillMdPath(id: string, workspaceRoot: string): string | null {
    const dirPath = this.resolveSkillDirPath(id, workspaceRoot);
    if (!dirPath) {
      return null;
    }
    const candidate = path.join(dirPath, 'SKILL.md');
    return fs.existsSync(candidate) ? candidate : null;
  }

  private resolveSkillDirPath(id: string, workspaceRoot: string): string | null {
    const fromCatalog = this.resolveSkill(id);
    const fallbackFolder = fromCatalog
      ? this.getSkillFolderName(fromCatalog)
      : this.slugifyFolderName(this.extractPackageNameFromId(id));
    const fallbackPath = path.join(workspaceRoot, '.agent-teams', 'skills', fallbackFolder);
    if (fs.existsSync(fallbackPath)) {
      return fallbackPath;
    }

    const skillsDir = path.join(workspaceRoot, '.agent-teams', 'skills');
    if (!fs.existsSync(skillsDir)) {
      return null;
    }

    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const metadataPath = path.join(skillsDir, entry.name, 'metadata.yml');
      if (!fs.existsSync(metadataPath)) continue;
      try {
        const parsed = YAML.parse(fs.readFileSync(metadataPath, 'utf-8')) as
          | { id?: unknown }
          | undefined;
        if (typeof parsed?.id === 'string' && parsed.id.trim() === id) {
          return path.join(skillsDir, entry.name);
        }
      } catch (_error) {
        // Ignore malformed metadata files.
      }
    }

    return null;
  }

  private getSkillFolderName(entry: CatalogSkillEntry): string {
    const fromTitle = this.slugifyFolderName(entry.title);
    if (fromTitle) {
      return fromTitle;
    }

    const fromId = this.extractPackageNameFromId(entry.id);
    return this.slugifyFolderName(fromId) || this.slugifyFolderName(entry.id) || 'skill';
  }

  private extractPackageNameFromId(id: string): string {
    // Example: lobehub-lobehub-agents-skills-typescript-skill-md -> typescript
    const match = id.match(/-skills-(.+)-skill-md$/);
    if (match?.[1]) {
      return match[1];
    }
    return id;
  }

  private slugifyFolderName(input: string | undefined): string {
    if (!input) return '';
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private readWorkspaceSkillMetadata(workspaceRoot: string): CatalogSkillEntry[] {
    const skillsDir = path.join(workspaceRoot, '.agent-teams', 'skills');
    if (!fs.existsSync(skillsDir)) {
      return [];
    }

    const entries = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory());

    const results: CatalogSkillEntry[] = [];
    for (const entry of entries) {
      const metadataPath = path.join(skillsDir, entry.name, 'metadata.yml');
      if (!fs.existsSync(metadataPath)) {
        continue;
      }

      const parsed = this.parseSkillMetadata(metadataPath);
      if (parsed) {
        results.push(parsed);
      }
    }

    return results;
  }

  private parseSkillMetadata(metadataPath: string): CatalogSkillEntry | null {
    try {
      const raw = fs.readFileSync(metadataPath, 'utf-8');
      const parsed = YAML.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      const candidate = parsed as Partial<CatalogSkillEntry>;
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
      const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
      const sourceType = candidate.source?.type;
      const sourceRef = candidate.source?.ref;
      if (
        !id ||
        !title ||
        (sourceType !== 'skills-lc' && sourceType !== 'git') ||
        typeof sourceRef !== 'string' ||
        !sourceRef.trim()
      ) {
        return null;
      }

      return {
        id,
        title,
        description: typeof candidate.description === 'string' ? candidate.description : undefined,
        source: {
          type: sourceType,
          ref: sourceRef,
        },
        version: typeof candidate.version === 'string' ? candidate.version : '0.0.0',
        tags: Array.isArray(candidate.tags)
          ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
      };
    } catch (_error) {
      // Ignore malformed metadata files.
      return null;
    }
  }
}
